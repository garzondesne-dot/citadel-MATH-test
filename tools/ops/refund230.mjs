// 💎 하루 한도(100)에 걸려 버려진 몫 돌려주기 초안 (📜 2026-11-19 선생님 「돌려줄 수 있는지」 · 머리 방 요청 · b230 하루 한도 없앰과 함께)
//   몫 표 = scratchpad 의 lost.py 결과 lost.json [{ c: '1-1', n: '5', day, sure, guess }] (운영 읽기만으로 만듦 · 저장소에 넣지 않음)
//   기본 = 미리 보기(아무것도 안 씀 · 반-번호 · 합만) · --go = 실제로 씀 (선생님이 이 방에 직접 허락한 뒤에만)
//   --what=sure (기본 · 확실한 몫만) | all (확실 + 추정)
//   --mode=gift (기본 · 추천) = gifts/{pid}/sorry_cap230 = { g, at, fun, got: false } → 학생이 캠프에 들어오면 「💎 한도 돌려받기 · 💎 +n」 한 줄과 함께 지갑에 들어감
//          wallet = gem/{반}/{번호} total += g · log/refund_cap230 = { g, at, why, gift: true } (바로 들어감 · 폰이 열려 있으면 폰의 지갑 통째 쓰기에 덮일 수 있음)
//   두 번 돌려도 안전: 같은 키(sorry_cap230 · refund_cap230)가 이미 있으면 건너뜀
//   node tools/ops/refund230.mjs <서버 주소> <열쇠 헤더 파일> <lost.json> [--what=sure|all] [--mode=gift|wallet] [--go]
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2), [DB, HDR, LOST] = args.filter((a) => !a.startsWith('--')), go = args.includes('--go');
const what = (args.find((a) => a.startsWith('--what=')) || '--what=sure').slice(7), mode = (args.find((a) => a.startsWith('--mode=')) || '--mode=gift').slice(7);
if (!DB || !HDR || !LOST || !['sure', 'all'].includes(what) || !['gift', 'wallet'].includes(mode)) { console.log('쓰는 법: node tools/ops/refund230.mjs <서버 주소> <열쇠 헤더 파일> <lost.json> [--what=sure|all] [--mode=gift|wallet] [--go]'); process.exit(2); }
if (/citadel-math-default-rtdb/.test(DB)) { console.log('⛔ 옛 정식 서버 — 멈춤'); process.exit(2); }
const H = Object.fromEntries(readFileSync(HDR, 'utf8').split('\n').filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const KEY = 'cap230', WHY = '💎 하루 한도 때문에 못 받은 💎 돌려줘요'; // 📮 우편함 줄 = 「{WHY} · 💎 n」 + 받기 (📜 11/19 선생님 「우편으로 돌려줘」)
const get = async (p) => { const r = await fetch(`${DB}/${p}.json`, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${p}`); return r.json(); };
const patch = async (p, body) => { const r = await fetch(`${DB}/${p}.json`, { method: 'PATCH', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${r.status} ${p}`); };
/** 학생마다 합 (시험용으로 내보냄) */
export function planOf(rows, w = 'sure') {
  const by = new Map();
  for (const r of rows) { const g = (Number(r.sure) || 0) + (w === 'all' ? Number(r.guess) || 0 : 0); if (g > 0) by.set(`${r.c}|${r.n}`, (by.get(`${r.c}|${r.n}`) || 0) + g); }
  return [...by].map(([k, g]) => { const [c, n] = k.split('|'); return { c, n, g }; });
}
const plan = planOf(JSON.parse(readFileSync(LOST, 'utf8')), what);
console.log(`몫 = ${what === 'all' ? '확실 + 추정' : '확실만'} · 넣는 곳 = ${mode === 'gift' ? '선물(캠프에서 받기)' : '지갑에 바로'} · 대상 ${plan.length}명 · 💎 ${plan.reduce((a, x) => a + x.g, 0)}`);
for (const x of plan) console.log(`  ${x.c}-${x.n} · 💎 ${x.g}${mode === 'gift' ? `   📮 「${WHY} · 💎 ${x.g}」 [받기]` : ''}`);
if (!go) { console.log('미리 보기만 했어요. 실제로 쓰려면 --go (선생님 허락 뒤)'); process.exit(0); }
let done = 0, skip = 0;
for (const x of plan) {
  const pid = `s${x.c.replace('-', '_')}_${x.n}`;
  if (mode === 'gift') {
    if (await get(`gifts/${pid}/sorry_${KEY}`)) { skip++; continue; }
    await patch(`gifts/${pid}`, { [`sorry_${KEY}`]: { g: x.g, at: { '.sv': 'timestamp' }, fun: WHY, got: false, hold: true } });
  } else {
    const d = await get(`gem/${x.c}/${x.n}`); if (d?.log?.[`refund_${KEY}`]) { skip++; continue; }
    await patch(`gem/${x.c}/${x.n}`, { total: (Number(d?.total) || 0) + x.g, [`log/refund_${KEY}`]: { g: x.g, at: { '.sv': 'timestamp' }, why: WHY, gift: true } });
  }
  done++;
}
console.log(`✅ 썼어요: ${done}명 · 이미 있어 건너뜀 ${skip}명`);
