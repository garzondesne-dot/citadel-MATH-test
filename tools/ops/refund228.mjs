// 💎 b228 도감 용사 돌려받기 (📜 2026-11-19 선생님 「A 돌려줌」 · 4명 · 💎 240 확정 · 머리 hv2 039cf35)
//   대상 = 💎 로 산 도감 용사(8 발도르 · 10 셰라 · 11 리라) 중 그 도감을 다 모았고 아직 안 돌려받은(log refund_hero_N 없음) 학생
//   쓰는 것 (📜 2026-11-19 선생님 「선물 방식으로」 · 지갑 통째 쓰기 덮어쓰기 막음) = 🎁 gifts/{학생}/sorry_refund_hero_N = { g, at, fun, got: false }
//     → 학생 폰이 캠프에 들어올 때 「💎 용사 값 돌려받기 · 💎 +n」 한 줄과 함께 지갑에 넣음 · 낸 💎 = log buy_hero_N.g (없으면 60)
//   산 용사는 그대로 둠(buy 안 지움 · 다시 잠기지 않음) · 두 번 돌려도 안전(log refund_ 칸 · 선물 sorry_refund_ 칸이 있으면 건너뜀)
//   node tools/ops/refund228.mjs <서버 주소> <열쇠 헤더 파일> <카드 필요표.json>        → 미리 보기(아무것도 안 씀 · 반-번호만)
//   node tools/ops/refund228.mjs … --go                                                  → 실제로 씀 (정식 b228 배포 때 · 선생님 허락 뒤)
//   카드 필요표 = { "8": [카드 id…], "10": […], "11": […] } (src/model/heroUnlock.ts cardNeed 와 같은 표 · 시험이 만들어 줌)
import { readFileSync } from 'node:fs';
const [DB, HDR, NEED] = process.argv.slice(2), go = process.argv.includes('--go');
if (!DB || !HDR || !NEED) { console.log('쓰는 법: node tools/ops/refund228.mjs <서버 주소> <열쇠 헤더 파일> <카드 필요표.json> [--go]'); process.exit(2); }
if (/citadel-math-default-rtdb/.test(DB)) { console.log('⛔ 옛 정식 서버 — 멈춤'); process.exit(2); }
const H = Object.fromEntries(readFileSync(HDR, 'utf8').split('\n').filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const need = JSON.parse(readFileSync(NEED, 'utf8'));
const CARD_HEROES = [8, 10, 11], PRICE = 60, WHY = '💎 용사 값 돌려받기';
const get = async (p) => { const r = await fetch(`${DB}/${p}.json`, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${p}`); return r.json(); };
const patch = async (p, body) => { const r = await fetch(`${DB}/${p}.json`, { method: 'PATCH', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${r.status} ${p}`); };
const items = (x) => (Array.isArray(x) ? x.map((v, i) => [String(i), v]).filter(([, v]) => v != null) : Object.entries(x || {}));
/** 한 학생 계획 (시험용으로 내보냄) */
export function planOf(d, cards, gift = {}) {
  const log = d?.log || {}, own = cards || {}, out = [];
  const bought = new Set(items(d?.buy).map(([, b]) => b?.id).filter(Boolean));
  for (const id of CARD_HEROES) {
    const key = `hero_${id}`; if (!bought.has(key) || log[`refund_${key}`] || gift?.[`sorry_refund_${key}`]) continue;
    const nd = need[String(id)] || []; if (!nd.length || !nd.every((k) => own[k])) continue;
    out.push({ key, g: -Number(log[`buy_${key}`]?.g) || PRICE });
  }
  return out;
}
const [gem, cards, gifts] = await Promise.all([get('gem'), get('cards'), get('gifts')]);
const pidOf = (c, n) => `s${String(c).replace('-', '_')}_${n}`;
const plan = [];
for (const [c, byN] of items(gem)) for (const [n, d] of items(byN)) { if (!d) continue; const cc = (Object.fromEntries(items(cards?.[c]))[n]) || {}; const p = planOf(d, cc, gifts?.[pidOf(c, n)] || {}); if (p.length) plan.push({ c, n, d, p }); }
console.log(`대상 ${plan.length}명 · ${plan.reduce((a, x) => a + x.p.length, 0)}건 · 💎 ${plan.reduce((a, x) => a + x.p.reduce((b, y) => b + y.g, 0), 0)}`);
for (const x of plan) console.log(`  ${x.c}-${x.n} · ${x.p.map((y) => `${y.key} 💎 ${y.g}`).join(' · ')}`);
if (!go) { console.log('미리 보기만 했어요. 실제로 쓰려면 --go (정식 b228 배포 때 · 선생님 허락 뒤)'); process.exit(0); }
for (const x of plan) {
  const body = {};
  for (const y of x.p) body[`sorry_refund_${y.key}`] = { g: y.g, at: { '.sv': 'timestamp' }, fun: WHY, got: false };
  await patch(`gifts/${pidOf(x.c, x.n)}`, body);
}
console.log(`✅ 썼어요: ${plan.length}명`);
