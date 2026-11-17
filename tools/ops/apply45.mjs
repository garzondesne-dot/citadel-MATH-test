#!/usr/bin/env node
// 🧾 운영 쓰기 3개 실행 (📜 선생님이 손발 방에서 직접 「허락」한 뒤에만 --go) — plan45.ts 가 만든 plan.json 그대로
//   규칙: 빈 칸에만 씀(이미 값이 있으면 건너뜀 · 덮어쓰지 않음) · 쓰기 전 지금 값 백업 · 쓴 뒤 다시 읽어 대조 · 되돌리기 목록 저장
//   되돌리기 = node tools/ops/apply45.mjs --sa <열쇠> --undo <out>/written.json --go (받지 않은 선물 · 새로 만든 기록 줄만 지움 · 이미 받은 선물은 목록으로 알림)
//   사용: node tools/ops/apply45.mjs --sa <운영 서비스 계정.json> --plan <plan.json> --out <백업 폴더> [--only ⓐ|ⓑ|ⓒ] [--go]
import { createSign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const EMU = process.argv.includes('--emu'), GO = process.argv.includes('--go'), SA = arg('--sa'), PLAN = arg('--plan'), OUT = arg('--out'), UNDO = arg('--undo'), ONLY = arg('--only');
const CFG = JSON.parse(readFileSync(new URL('../../public/server.json', import.meta.url), 'utf8')).firebase;
if (EMU) { CFG.databaseURL = 'http://127.0.0.1:9000'; CFG.projectId = null; } // 🧪 에뮬레이터 시험 (운영 아님)
if (/citadel-math-default-rtdb/.test(CFG.databaseURL)) { console.error('⛔ 옛 정식 서버 — 멈춤'); process.exit(2); }
if ((!SA && !EMU) || (!PLAN && !UNDO)) { console.error('--sa 와 --plan(또는 --undo) 이 필요해요'); process.exit(1); }
const sa = EMU ? {} : JSON.parse(readFileSync(SA, 'utf8'));
if (CFG.projectId && sa.project_id !== CFG.projectId) { console.error(`⛔ 열쇠 프로젝트 ≠ 운영 서버 — 멈춤`); process.exit(2); }
async function token() {
  const now = Math.floor(Date.now() / 1000), b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = b64({ alg: 'RS256', typ: 'JWT' }), b = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 });
  const s = createSign('RSA-SHA256').update(`${h}.${b}`).sign(sa.private_key, 'base64url');
  const j = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${h}.${b}.${s}` })).json();
  if (!j.access_token) throw new Error('열쇠 토큰 실패'); return j.access_token;
}
// 이 컨테이너는 node fetch 가 DB 주소를 못 찾음 → curl (프록시 경유) · 토큰 = 머리말 파일(명령 줄에 안 보이게)
const tok = EMU ? 'owner' : await token(), hdr = join(tmpdir(), `a45-${process.pid}.hdr`); writeFileSync(hdr, `Authorization: Bearer ${tok}\n`, { mode: 0o600 });
process.on('exit', () => { try { writeFileSync(hdr, ''); } catch { /* */ } });
const url = (p) => `${CFG.databaseURL}/${p}.json${EMU ? '?ns=demo-citadel-test-default-rtdb' : ''}`;
const curl = (args) => execFileSync('curl', ['-sS', '--fail-with-body', '-H', `@${hdr}`, ...args], { encoding: 'utf8' });
const get = async (p) => JSON.parse(curl([url(p)]) || 'null');
const put = async (p, v) => { curl(['-X', 'PUT', '-H', 'content-type: application/json', '--data-binary', JSON.stringify(v), url(p)]); };
// DB 는 빈 배열 · 빈 칸 · null 을 저장하지 않고 배열을 {0:…} 로 돌려줄 수 있음 → 그 차이는 같은 것으로
const norm = (v) => { if (Array.isArray(v)) v = Object.fromEntries(v.map((x, i) => [i, x])); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) { const x = norm(v[k]); if (x != null) o[k] = x; } return Object.keys(o).length ? o : null; } return v ?? null; };
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

if (UNDO) {
  const W = JSON.parse(readFileSync(UNDO, 'utf8')); let del = 0; const kept = [];
  for (const { path } of W) { const v = await get(path); if (v?.got) { kept.push(path); continue; } if (GO && v != null) { await put(path, null); del++; } }
  console.log(`${GO ? '지움' : '지울 것(미리 보기)'} ${GO ? del : W.length - kept.length} · 이미 받은 선물(못 지움 · 지갑에 들어감) ${kept.length}`); process.exit(0);
}
const plan = JSON.parse(readFileSync(PLAN, 'utf8')).filter((x) => !ONLY || x.g === ONLY);
const by = {}; for (const x of plan) by[x.g] = (by[x.g] || 0) + 1;
console.log(`쓸 칸 ${plan.length} · ${Object.entries(by).map(([g, n]) => `${g} ${n}`).join(' · ')} · ${GO ? '실행' : '미리 보기(쓰기 0)'}`);
const before = {}, skip = [];
for (const x of plan) { before[x.path] = await get(x.path); if (before[x.path] != null) skip.push(x.path); }
console.log(`이미 값이 있어 건너뜀 ${skip.length}`);
if (!GO) process.exit(0);
mkdirSync(OUT, { recursive: true }); writeFileSync(join(OUT, 'before.json'), JSON.stringify(before));
const written = [];
for (const x of plan) { if (skip.includes(x.path)) continue; await put(x.path, x.value); written.push({ g: x.g, path: x.path }); }
writeFileSync(join(OUT, 'written.json'), JSON.stringify(written));
let bad = 0; for (const w of written) { const v = await get(w.path), want = plan.find((x) => x.path === w.path).value; if (!same(v, want)) bad++; }
console.log(`썼음 ${written.length} · 대조 다름 ${bad} · 백업 before.json · 되돌리기 목록 written.json`);
process.exit(bad ? 3 : 0);
