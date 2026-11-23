// 🥏 알까기 봇 점수 분포 (머리 11/24 「맞히기 +1 · 왕관 +5 는 설계 모의에 없었으니 봇 시험으로 한 번」)
//   실제 엔진(src/rest/alkkagi.ts stepAk · simBeat)을 1초 박자 그대로 돌림 · 봇 = sim.py 정책(쿨 끝나면 평균 0.8초 뒤 · 오차 0.25 × {0.5, 1, 1, 2} · 10% 안 누름)
//   npx vite-node tools/sim/alkkagi-dist.ts
import { AK, botShot, stepAk, startAk, type Ak, type Shot } from '../../src/rest/alkkagi';
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function game(n: number, seed: number) {
  const rnd = rng(seed), ids = Array.from({ length: n }, (_, i) => `u${String(i).padStart(2, '0')}`), act = new Set(ids.filter(() => rnd() > 0.1)), sk = Object.fromEntries(ids.map((u) => [u, 0.25 * [0.5, 1, 1, 2][Math.floor(rnd() * 4)]!]));
  let now = 0, f: Ak = { ...startAk(now), go: 1 }; const joins = Object.fromEntries(ids.map((u) => [u, 1])), shots: Record<string, Shot> = {}, seq: Record<string, number> = {}, wait: Record<string, number> = {};
  let crownKO = 0, ms = 0, beats = 0;
  for (let g = 0; g < 400 && f.phase !== 'end'; g++) {
    now += 1000;
    for (const u of act) { const s = f.st[u]; if (!s?.on || s.cd > 0) { wait[u] = 0; continue; } wait[u] = (wait[u] || 0) + 1; if (rnd() < 1 - Math.exp(-wait[u]! / 0.8)) { const b = botShot(f.st, u, sk[u]!, rnd); if (b) { seq[u] = (seq[u] || 0) + 1; shots[u] = { ...b, n: seq[u]! }; wait[u] = 0; } } }
    const t = performance.now(); const nx = stepAk(f, joins, shots, now, rnd); ms = Math.max(ms, performance.now() - t); beats++;
    if (nx) { crownKO += (nx.ev || []).filter((e) => e.k === 'fall' && e.pts === AK.crown && !(f.ev || []).includes(e)).length; f = nx; }
  }
  const sc = ids.map((u) => f.sc[u] || 0).sort((a, b) => b - a), A = [...act];
  return { top: sc[0]!, avg: sc.reduce((a, b) => a + b, 0) / n, zero: A.filter((u) => !(f.sc[u] || 0)).length / Math.max(1, A.length), kn: ids.reduce((a, u) => a + (f.kn[u] || 0), 0) / n, fl: ids.reduce((a, u) => a + (f.fall[u] || 0), 0) / n, hitShare: A.reduce((a, u) => a + (f.sc[u] || 0) - 3 * (f.kn[u] || 0), 0), all: A.reduce((a, u) => a + (f.sc[u] || 0), 0), crownKO, ms, bytes: JSON.stringify(f.st).length };
}
console.log('| 인원 | 판 반지름 | 1등 점수 | 평균 점수 | 0점 학생 | 점수 중 맞히기(+1) 몫 | 👑 떨어뜨림(판당) | 박자 계산 최대 ms | 판 상태 크기 | 떨어뜨린 수 | 떨어진 수 |'); console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const n of [4, 8, 12, 20, 28]) {
  const rs = Array.from({ length: 12 }, (_, i) => game(n, n * 100 + i)), m = (k: keyof (typeof rs)[0]) => rs.reduce((a, r) => a + (r[k] as number), 0) / rs.length;
  const hit = rs.reduce((a, r) => a + r.hitShare, 0) / Math.max(1, rs.reduce((a, r) => a + r.all, 0));
  console.log(`| ${n} | ${Math.max(5.5, 2 + 1.2 * Math.sqrt(n)).toFixed(1)} | ${m('top').toFixed(1)} | ${m('avg').toFixed(1)} | ${(m('zero') * 100).toFixed(0)}% | ${(hit * 100).toFixed(0)}% | ${m('crownKO').toFixed(1)} | ${Math.max(...rs.map((r) => r.ms)).toFixed(1)} | ${(m('bytes') / 1024).toFixed(1)}KB | ${m('kn').toFixed(1)} | ${m('fl').toFixed(1)} |`);
}
