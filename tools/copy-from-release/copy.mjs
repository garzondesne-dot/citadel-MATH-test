#!/usr/bin/env node
// 🔁 정식 데이터 복사본 (#163 ② · DECISIONS 「🔁 v1.0 = 정식 데이터 복사본으로 시험」)
//   정식 서버(citadel-math)를 **읽기만**(GET) → 시험 서버에 **같은 경로 · 같은 꼴**로 씀 (이름 그대로)
//   정식에 쓰는 줄 = 0 (src() 는 GET 만 · 시험 tests/copytool.test.ts 가 이 파일을 읽어 확인)
//   로그인 계정(Firebase Auth)은 옮기지 못함 → 옮긴 accounts 에 reset: true (정식 「선생님 초기화」와 같은 뜻)
//     = 시험 서버에서 그 반 · 번호 · 4자리로 처음 들어오면 새 로그인을 만들고 그 학생 칸에 이어짐 (v1.0 school.ts enter)
//
// 사용 (머리 방 · 정식 읽기 열쇠가 있는 곳):
//   FIREBASE_SA_JSON='<정식 서비스 계정 JSON>' COPY_EMAIL=… COPY_PW=… node tools/copy-from-release/copy.mjs --dry   ← 몇 명 · 몇 건만
//   (위와 같이) node tools/copy-from-release/copy.mjs                                                         ← 실제로 씀
//   시험(에뮬레이터): node tools/copy-from-release/copy.mjs --src http://127.0.0.1:9000 --src-ns <ns> --emu
//   📄 학습지 칸 그림만 (2026-11-14 · 차시 팩 그림 칸): … copy.mjs --prep set-11 --prep-only   ← 정식 prep/set-11/img/* 를 시험 서버 같은 자리에 (쉼표로 여러 차시)
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const has = (k) => process.argv.includes(k);
const DRY = has('--dry'), EMU = has('--emu');
const SRC = arg('--src') || 'https://citadel-math-default-rtdb.asia-southeast1.firebasedatabase.app';
const SRC_NS = arg('--src-ns');
const CFG = JSON.parse(readFileSync(new URL('../../public/server.json', import.meta.url), 'utf8')).firebase;
const DST = EMU ? (arg('--dst') || 'http://127.0.0.1:9000') : CFG.databaseURL;
const DST_NS = EMU ? (arg('--dst-ns') || 'demo-citadel-test-default-rtdb') : null;
if (/citadel-math-default-rtdb/.test(DST) || /citadel-math\b(?!-test)/.test(DST.replace('citadel-math-test', ''))) { console.error('⛔ 쓰는 곳이 정식 서버예요 — 멈춤'); process.exit(2); }

// 옮기는 칸 (V1-DESIGN 7절 표) — 반 · 번호 아래 학생 기록 + 명단 + 그 밖
export const PATHS = ['accounts', 'roster', 'rosterMask', 'gem', 'xp', 'cards', 'records', 'bonus', 'tester', 'surveyDone', 'photo', 'fb', 'fbr', 'fgift', 'act', 'qsolve'];

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
async function src(path, tok) {
  const q = new URLSearchParams(); if (tok) q.set('access_token', tok); if (SRC_NS) q.set('ns', SRC_NS);
  const r = await fetch(`${SRC}/${path}.json?${q}`, { method: 'GET' });
  if (!r.ok) throw new Error(`정식 읽기 ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

// ── 시험 서버 쓰기 (복사 도구 계정 = 규칙에 고정된 uid 하나 · 에뮬레이터 = owner) ──
async function dstAuth() {
  if (EMU) return { h: { Authorization: 'Bearer owner' }, q: '' };
  const e = process.env.COPY_EMAIL, p = process.env.COPY_PW; if (!e || !p) throw new Error('COPY_EMAIL · COPY_PW 가 없어요 (복사 도구 계정)');
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CFG.apiKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: p, returnSecureToken: true }) });
  const j = await r.json(); if (!j.idToken) throw new Error(`복사 도구 로그인 실패: ${j.error?.message}`);
  console.log(`복사 도구 uid = ${j.localId} (규칙 copyUid 와 같아야 씀)`);
  return { h: {}, q: `auth=${j.idToken}` };
}
async function dst(path, val, A) {
  const q = [A.q, DST_NS ? `ns=${DST_NS}` : ''].filter(Boolean).join('&');
  const r = await fetch(`${DST}/${path}.json?${q}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...A.h }, body: JSON.stringify(val) });
  if (!r.ok) throw new Error(`시험 서버 쓰기 ${path}: ${r.status} ${await r.text()}`);
}

// 몇 명 · 몇 건 (반/번호 아래 · 그 아래 칸 수)
export function countOf(k, v) {
  if (!v || typeof v !== 'object') return { students: 0, items: 0 };
  let students = 0, items = 0;
  for (const c of Object.values(v)) { if (!c || typeof c !== 'object') { items++; continue; } for (const n of Object.values(c)) { students++; items += n && typeof n === 'object' ? Object.keys(n).length : 1; } }
  return { students, items };
}
/** 옮긴 계정 = 새 로그인을 기다림 (uid 는 정식 것 · 시험 서버 로그인과 다름) */
export function prepAccounts(acc) { const out = {}; for (const [c, ns] of Object.entries(acc || {})) { out[c] = {}; for (const [n, a] of Object.entries(ns || {})) out[c][n] = { ...(a || {}), reset: true, from: 'release' }; } return out; }

async function main() {
  const tok = await srcToken();
  const A = DRY ? null : await dstAuth();
  const rows = [];
  for (const id of (arg('--prep') || '').split(',').filter(Boolean)) { // 📄 학습지 칸 그림 (prep/{차시}/img · 학생 정보 없음)
    const v = await src(`prep/${id}/img`, tok), n = v && typeof v === 'object' ? Object.keys(v).length : 0;
    rows.push(`prep/${id}/img 칸 그림 ${n}장${n ? ` (${Object.keys(v).join(' · ')})` : ''}`);
    if (!DRY && v != null) await dst(`prep/${id}/img`, v, A);
  }
  for (const k of has('--prep-only') ? [] : PATHS) {
    const v = await src(k, tok);
    const c = countOf(k, v); rows.push(`${k.padEnd(11)} 학생 ${String(c.students).padStart(4)} · 칸 ${String(c.items).padStart(6)}`);
    if (!DRY && v != null) await dst(k, k === 'accounts' ? prepAccounts(v) : v, A);
  }
  console.log(`${DRY ? '🔎 미리 보기 (쓰지 않음)' : '✅ 옮김'} · 정식 ${SRC}${SRC_NS ? `?ns=${SRC_NS}` : ''} → 시험 ${DST}${DST_NS ? `?ns=${DST_NS}` : ''}`);
  rows.forEach((r) => console.log('  ' + r));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('❌', e.message); process.exit(1); });
