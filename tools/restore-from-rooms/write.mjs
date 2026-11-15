#!/usr/bin/env node
// ♻ 되살리기 쓰기 (📜 선생님 「되살리기 실행」 뒤에만) — preview.ts 가 만든 patch.json → 운영 서버 records 칸 상태만 고침
//   바꾸는 칸 = records/{반}/{번호}/{차시}/mons (- · n 인 칸만 o · f · x 로) · bossM · boss(형성평가를 방에서 했는데 줄에 없을 때) · miss(mons 에서 다시 계산)
//   안 건드림 = 💎 · EXP · conc · mis · 다른 칸 전부 · 학생 줄이 없으면 만들지 않음
//   순서: ① 바꿀 학생 줄 지금 값 백업(파일) ② 칸만 PATCH ③ 다시 읽어 patch 와 대조 → 1칸이라도 다르면 ❌(종료 3)
//   사용: node tools/restore-from-rooms/write.mjs --sa <베타 서비스 계정.json> --patch <patch.json> --out <백업 폴더> [--go]   (--go 없으면 미리 보기만 · 쓰기 0)
import { createSign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const GO = process.argv.includes('--go'), SA = arg('--sa'), PATCH = arg('--patch'), OUT = arg('--out');
const CFG = JSON.parse(readFileSync(new URL('../../public/server.json', import.meta.url), 'utf8')).firebase;
if (/citadel-math-default-rtdb/.test(CFG.databaseURL)) { console.error('⛔ 옛 정식 서버 — 멈춤'); process.exit(2); }
if (!SA || !PATCH || !OUT) { console.error('--sa · --patch · --out 이 필요해요'); process.exit(1); }
const sa = JSON.parse(readFileSync(SA, 'utf8'));
if (CFG.projectId && sa.project_id !== CFG.projectId) { console.error(`⛔ 열쇠 프로젝트(${sa.project_id}) ≠ 운영 서버(${CFG.projectId}) — 멈춤`); process.exit(2); }
async function token() {
  const now = Math.floor(Date.now() / 1000), b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = b64({ alg: 'RS256', typ: 'JWT' }), b = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const s = createSign('RSA-SHA256').update(`${h}.${b}`).sign(sa.private_key, 'base64url');
  const j = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${h}.${b}.${s}` })).json();
  if (!j.access_token) throw new Error('열쇠 토큰 실패'); return j.access_token;
}
const patches = JSON.parse(readFileSync(PATCH, 'utf8'));
const tok = await token(), url = (p) => `${CFG.databaseURL}/${p}.json?access_token=${tok}`;
const get = async (p) => (await fetch(url(p))).json();
const missOf = (mons) => Object.entries(mons).filter(([, v]) => v === 'x' || v === '-').map(([k]) => k);
console.log(`바꿀 학생 줄 ${patches.length} · 칸 ${patches.reduce((a, p) => a + p.cells.length, 0)}`);
const before = {}; for (const p of patches) before[p.path] = await get(p.path);
const gone = patches.filter((p) => !before[p.path]).length; if (gone) console.log(`⚠ 지금 없는 학생 줄 ${gone} → 건너뜀`);
if (!GO) { console.log('🔎 미리 보기 — 쓰기 0 (--go 로 실행)'); process.exit(0); }
mkdirSync(OUT, { recursive: true }); const stamp = new Date().toISOString().replace(/[:.]/g, '-'); const bf = join(OUT, `records-before-${stamp}.json`);
writeFileSync(bf, JSON.stringify(before)); console.log(`💾 백업 ${bf}`);
let n = 0;
for (const p of patches) {
  const cur = before[p.path]; if (!cur) continue;
  const mons = { ...(cur.mons || {}) }; for (const c of p.cells) if (c !== 'boss' && p.mons[c]) mons[c] = p.mons[c];
  const body = { mons, miss: missOf(mons), ...(p.bossM ? { bossM: p.bossM, boss: p.boss } : {}) };
  const r = await fetch(url(p.path), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { console.error(`❌ ${p.path} ${r.status}`); process.exit(3); } n++;
}
let bad = 0; for (const p of patches) { if (!before[p.path]) continue; const a = await get(p.path); for (const c of p.cells) { if (c === 'boss') { if (a.bossM !== p.bossM) bad++; } else if (a.mons?.[c] !== p.mons[c]) bad++; } const keep = Object.keys(before[p.path]).filter((k) => !['mons', 'miss', 'bossM', 'boss'].includes(k)); for (const k of keep) if (JSON.stringify(a[k]) !== JSON.stringify(before[p.path][k])) bad++; }
console.log(`✅ 쓴 학생 줄 ${n} · 대조 다름 ${bad}`); if (bad) process.exit(3);
