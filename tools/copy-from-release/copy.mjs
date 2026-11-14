#!/usr/bin/env node
// 🚀 출시 복사 도구 (📜 2026-11-15 선생님 「진행」 · 「정식 기준 · 합치기 없음」 · 계획 = plan.mjs · 시험 = tests/copyplan.test.ts · tools/e2e/copy.cjs)
//   정식 서버(citadel-math)는 **읽기만**(GET) · 정식에 쓰는 줄 = 0 (tests/copytool.test.ts 가 이 파일을 읽어 확인)
//   순서: ① 정식 맨 윗칸 목록(shallow) + 칸마다 읽기 → 정식 사본 파일 ② 베타 전체 백업 파일 ③ 베타 학생 칸 비우기
//         ④ 정식 칸 그대로 넣기 + 합치기(admins · prep) + 바꿔 넣기(pids · 친구 선물 → gifts · 선생님 답장 → mail) ⑤ 베타 다시 읽어 대조 → 1칸이라도 다르면 ❌(종료 코드 3)
//   백업 · 사본 파일 = 학생 이름 · 기록이 들어 있음 → --out 폴더(저장소 밖) · 리허설 뒤 지움
//
// 사용:
//   미리 보기:  FIREBASE_SA_JSON=… node tools/copy-from-release/copy.mjs --dry --out <폴더>
//   실제:       FIREBASE_SA_JSON=… COPY_EMAIL=… COPY_PW=… node tools/copy-from-release/copy.mjs --out <폴더>
//   대조만:     (위와 같이) … --check
//   시험:       node tools/copy-from-release/copy.mjs --src http://127.0.0.1:9000 --src-ns <ns> --emu --out <폴더>
//   파일에서:   --from-file <정식 백업.json> (정식 서버에 닿지 않음 · 06:18 백업 등)
//   --no-auth-import = 로그인 목록을 못 들여올 때 → 옮긴 계정에 reset(첫 로그인 때 새로 이음)
import { createSign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPlan, compare } from './plan.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const has = (k) => process.argv.includes(k);
const DRY = has('--dry'), EMU = has('--emu'), CHECK = has('--check'), AUTH_IMPORT = !has('--no-auth-import');
const SRC = arg('--src') || 'https://citadel-math-default-rtdb.asia-southeast1.firebasedatabase.app';
const SRC_NS = arg('--src-ns'), FROM_FILE = arg('--from-file');
const OUT = arg('--out');
const CFG = JSON.parse(readFileSync(new URL('../../public/server.json', import.meta.url), 'utf8')).firebase;
const DST = EMU ? (arg('--dst') || 'http://127.0.0.1:9000') : CFG.databaseURL;
const DST_NS = EMU ? (arg('--dst-ns') || 'demo-citadel-test-default-rtdb') : null;
if (/citadel-math-default-rtdb/.test(DST) || /citadel-math\b(?!-test)/.test(DST.replace('citadel-math-test', ''))) { console.error('⛔ 쓰는 곳이 정식 서버예요 — 멈춤'); process.exit(2); }

// ── 정식 읽기 열쇠 (서비스 계정 → OAuth 접근 토큰 · 읽기만 씀) ──
async function srcToken() {
  if (!process.env.FIREBASE_SA_JSON) return null; // 에뮬레이터 = 열쇠 없이
  const sa = JSON.parse(process.env.FIREBASE_SA_JSON), now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'RS256', typ: 'JWT' }), body = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${body}.${sig}` });
  const j = await r.json(); if (!j.access_token) throw new Error(`정식 읽기 열쇠 실패: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}
/** 정식 읽기 = GET 만 (쓰기 함수 없음) */
async function src(path, tok, shallow = false) {
  const q = new URLSearchParams(); if (tok) q.set('access_token', tok); if (SRC_NS) q.set('ns', SRC_NS); if (shallow) q.set('shallow', 'true');
  const r = await fetch(`${SRC}/${path}.json?${q}`, { method: 'GET' });
  if (!r.ok) throw new Error(`정식 읽기 ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
/** 정식 전체 = 맨 윗칸 목록(shallow) → 칸마다 하나씩 (큰 한 번보다 덜 막힘) */
async function readOfficial() {
  if (FROM_FILE) return JSON.parse(readFileSync(FROM_FILE, 'utf8'));
  const tok = await srcToken(), top = (await src('', tok, true)) || {}, out = {};
  for (const k of Object.keys(top).sort()) out[k] = await src(k, tok);
  return out;
}

// ── 베타(시험 서버) 읽기 · 쓰기 (복사 도구 계정 = 규칙 맨 위 COPY_TOOL_UID · 에뮬레이터 = owner) ──
const SA_FILE = arg('--sa'); // 🚀 출시: 베타 프로젝트 서비스 계정(관리자) 열쇠 파일 — 쓰는 곳 = 베타만
async function saToken(file) {
  const sa = JSON.parse(readFileSync(file, 'utf8')), now = Math.floor(Date.now() / 1000);
  if (CFG.projectId && sa.project_id !== CFG.projectId) throw new Error(`열쇠 프로젝트(${sa.project_id})가 베타(${CFG.projectId})와 달라요 — 멈춤`);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'RS256', typ: 'JWT' }), body = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${body}.${sig}` });
  const j = await r.json(); if (!j.access_token) throw new Error('베타 열쇠 토큰 실패'); return j.access_token;
}
async function dstAuth() {
  if (EMU) return { h: { Authorization: 'Bearer owner' }, q: '' };
  if (SA_FILE) return { h: {}, q: `access_token=${await saToken(SA_FILE)}` };
  const e = process.env.COPY_EMAIL, p = process.env.COPY_PW; if (!e || !p) throw new Error('COPY_EMAIL · COPY_PW 가 없어요 (복사 도구 계정)');
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CFG.apiKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: p, returnSecureToken: true }) });
  const j = await r.json(); if (!j.idToken) throw new Error(`복사 도구 로그인 실패: ${j.error?.message}`);
  console.log(`복사 도구 uid = ${j.localId} (규칙 COPY_TOOL_UID 와 같아야 씀)`);
  return { h: {}, q: `auth=${j.idToken}` };
}
const dq = (A) => [A.q, DST_NS ? `ns=${DST_NS}` : ''].filter(Boolean).join('&');
async function dst(path, method, val, A) {
  const r = await fetch(`${DST}/${path}.json?${dq(A)}`, { method, headers: { 'content-type': 'application/json', ...A.h }, ...(val !== undefined ? { body: JSON.stringify(val) } : {}) });
  if (!r.ok) throw new Error(`시험 서버 ${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
const save = (name, v) => { if (!OUT) return null; mkdirSync(OUT, { recursive: true }); const f = join(OUT, name); writeFileSync(f, JSON.stringify(v)); return f; };

async function main() {
  if (!OUT && !DRY) throw new Error('--out <폴더> 가 없어요 (베타 백업 · 정식 사본을 저장소 밖에 남겨야 해요)');
  const off = await readOfficial();
  const plan = buildPlan(off, { authImport: AUTH_IMPORT });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`정식 ${FROM_FILE ? `파일 ${FROM_FILE}` : `${SRC}${SRC_NS ? `?ns=${SRC_NS}` : ''}`} → 베타 ${DST}${DST_NS ? `?ns=${DST_NS}` : ''} · 로그인 목록 ${AUTH_IMPORT ? '그대로 들여옴(uid 같음)' : '못 옮김 → reset'}`);
  console.log(`맨 윗칸 ${plan.areas.length}: ` + plan.areas.map((a) => `${a.area}${a.how === 'skip' ? '(뺌)' : a.how === 'merge' ? '(합침)' : ''}`).join(' · '));
  console.log(`비울 베타 칸 ${plan.clear.length} · 넣을 칸 ${plan.put.length} · 합치기 · 바꿔 넣기 ${Object.keys(plan.patch).length}건`);
  const A = DRY ? null : await dstAuth();
  if (DRY) { console.log('🔎 미리 보기 — 베타에 쓰지 않음'); return; }
  if (!CHECK) {
    const f1 = save(`official-${stamp}.json`, off), f2 = save(`beta-backup-${stamp}.json`, await dst('', 'GET', undefined, A));
    console.log(`💾 정식 사본 ${f1} · 베타 백업 ${f2}`);
    for (const p of plan.clear) await dst(p, 'DELETE', undefined, A);
    for (const { path, val } of plan.put) await dst(path, 'PUT', val, A);
    const keys = Object.keys(plan.patch); for (let i = 0; i < keys.length; i += 500) await dst('', 'PATCH', Object.fromEntries(keys.slice(i, i + 500).map((k) => [k, plan.patch[k]])), A);
    console.log('✅ 옮김');
  }
  const after = await dst('', 'GET', undefined, A), cmp = compare(off, after, { authImport: AUTH_IMPORT });
  const okN = cmp.students.filter((s) => s.ok).length;
  console.log(`📋 대조: 칸 ${cmp.areaRows.filter((r) => r.ok).length}/${cmp.areaRows.length} 같음 · 학생 ${okN}/${cmp.students.length} 같음`);
  save(`compare-${stamp}.json`, cmp);
  if (!cmp.ok) { console.error(`❌ 다름 ${cmp.bad.length} — 출시 멈춤\n  ` + cmp.bad.slice(0, 30).join('\n  ')); process.exit(3); }
  console.log('✅ 대조 0 차이');
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('❌', e.message); process.exit(1); });
