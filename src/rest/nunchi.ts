// 🙊 눈치 게임 (#142 · 정식 js/raid/nunchi.js 의 판정 step 그대로): 1부터 차례로 · 0.4초 안에 둘 이상 = 「💥 동시!」 모두 탈락 · 혼자 남은 마지막 1명 = 「⌛ 마지막!」
//   준비 3초 · 8초 무반응 = ⏳ 긴장감 · 20초 무반응 = 남은 사람 탈락(한 번도 안 누른 사람 = 💤 관전) · 3명 이하 또는 3판 끝 = 남은 사람 모두 우승
//   누름 = rooms/{코드}/nun/{g}/{판}/{uid} = 시각 · 🙋 다시 참여 · 응원 = nunE/{g}/{uid} = { e, at }
export const READY = 3000, CLASH = 400, HINT = 8000, TIMEOUT = 20000, SHOW = 3500, ROUNDS = 3, WIN_AT = 3, MIN = 3;
export interface Nun { kind: 'nun'; g: number; round: number; phase: 'ready' | 'play' | 'show' | 'end'; to: number; alive: Record<string, 1>; n: number; said: Record<string, number>; out: Record<string, string>; done: Record<string, 1>; ev: { k: string; n: number; u: string[]; at: number }[]; lastAt: number; at: number; zz?: Record<string, number>; hist?: { round: number; surv: number; back: number }[]; win?: string[]; endAt?: number; drv?: { u: string; at: number }; frz?: number | null }
const keys = (o: object | null | undefined) => Object.keys(o || {});
const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : x && typeof x === 'object' ? Object.keys(x).sort((a, b) => Number(a) - Number(b)).map((k) => (x as Record<string, T>)[k] as T) : []);
export const startNun = (alive: string[], now: number): Nun => ({ kind: 'nun', g: now, round: 1, phase: 'ready', to: now + READY, alive: Object.fromEntries(alive.map((u) => [u, 1])) as Record<string, 1>, n: 1, said: {}, out: {}, done: {}, ev: [], lastAt: now + READY, at: now });
export function stepNun(f: Nun, presses: Record<string, number> | null, now: number, cheers: Record<string, { e: string; at: number }> | null): Nun | null {
  const x = JSON.parse(JSON.stringify(f)) as Nun; x.said = x.said || {}; x.out = x.out || {}; x.done = x.done || {}; x.zz = x.zz || {}; x.ev = arr(x.ev); x.hist = arr(x.hist); x.ev.forEach((e) => { e.u = arr(e.u); });
  const ev = (e: { k: string; n: number; u: string[] }) => { x.ev.push({ ...e, at: now }); x.ev = x.ev.slice(-6); };
  if (x.phase === 'ready') { if (now < x.to) return null; x.phase = 'play'; x.lastAt = now; return x; }
  if (x.phase === 'show') {
    if (now < x.to) return null;
    const surv = keys(x.alive).filter((u) => x.said[u]);
    if (surv.length <= WIN_AT || x.round >= ROUNDS) { x.phase = 'end'; x.win = surv; x.endAt = now; return x; }
    const back = keys(x.zz).filter((u) => { const c = (cheers || {})[u]; return c && c.e === '🙋' && Number(c.at) >= Number(x.zz![u]); }), zz = { ...x.zz }; back.forEach((u) => { delete zz[u]; });
    return { kind: 'nun', g: x.g, round: x.round + 1, phase: 'ready', to: now + READY, alive: Object.fromEntries([...surv, ...back].map((u) => [u, 1])) as Record<string, 1>, zz, n: 1, said: {}, out: {}, done: {}, ev: [], lastAt: now + READY, hist: [...x.hist, { round: x.round, surv: surv.length, back: back.length }], at: now };
  }
  if (x.phase !== 'play') return null;
  let changed = false;
  const left = () => keys(x.alive).filter((u) => !x.said[u] && !x.out[u]);
  const todo = Object.entries(presses || {}).filter(([u, t]) => x.alive[u] && !x.done[u] && !x.said[u] && !x.out[u] && Number(t) >= x.lastAt - 50).map(([u, t]) => [u, Number(t)] as [string, number]).sort((a, b) => a[1] - b[1]);
  while (todo.length) {
    const t0 = todo[0]![1]; if (now - t0 < CLASH + 150) break;
    const grp = todo.filter(([, t]) => t - t0 <= CLASH); todo.splice(0, grp.length);
    grp.forEach(([u]) => { x.done[u] = 1; });
    if (grp.length === 1) { x.said[grp[0]![0]] = x.n; ev({ k: 'say', n: x.n, u: [grp[0]![0]] }); x.n += 1; } else { grp.forEach(([u]) => { x.out[u] = 'clash'; }); ev({ k: 'clash', n: x.n, u: grp.map(([u]) => u) }); }
    x.lastAt = Math.max(x.lastAt, grp[grp.length - 1]![1]); changed = true;
  }
  const L = left();
  if (L.length === 1 && !todo.length) { x.out[L[0]!] = 'last'; ev({ k: 'last', n: x.n, u: L }); changed = true; }
  else if (L.length > 1 && !todo.length && now - x.lastAt > TIMEOUT) { L.forEach((u) => { x.out[u] = 'time'; }); ev({ k: 'time', n: x.n, u: L }); changed = true; }
  if (!left().length) { keys(x.alive).forEach((u) => { if (!x.done[u] && x.out[u] === 'time') { x.out[u] = 'zz'; x.zz![u] = now; } }); x.phase = 'show'; x.to = now + SHOW; changed = true; }
  return changed ? x : null;
}
