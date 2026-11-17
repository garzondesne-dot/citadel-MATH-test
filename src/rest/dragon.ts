// 🐉 쉼터 놀이 「용이 잠든 사이」 (📜 2026-11-17 #25 · hero-v2 docs/handoff/design/fun-dragonnap/README.md · 조작 = 두 단추 번갈아 연타(선생님 「두버튼 번갈아연타」))
//   용이 잘 때 👣 왼발 · 👣 오른발을 번갈아 누르면 한 칸씩 · 같은 단추 거듭 = 0칸 · 초당 최대 8칸 · 용이 눈 뜬 동안 아무 단추나 누르면 「앗 뜨거!」 10칸 뒤로 + 0.8초 멈춤
//   흐름 = 안내 10초 → 1판 45초 → 결과 10초 → 2판 45초(+ 속임수) → 결과 10초 → 결승 30초 → 시상 · 판마다 출발선에서 다시 · 시간이 다 되거나 절반이 들어오면 판 끝
//   판정 = 각 폰(잠 · 눈 뜸 시각표를 판 시작 때 함께 내려보냄 · 서버 시각) · 진행 = rooms/{코드}/dg/{g}/{판}/{uid} = { p 칸, h 걸린 수, f 들어온 시각 }
export const FIN = 60, STEP_MS = 125, BACK = 10, FREEZE = 800, GRACE = 300, WARN = 600, MIN = 2;
export const INTRO = 10000, RES = 10000, ROUND_MS = [45000, 45000, 30000] as const;
export type Phase = 'intro' | 'play' | 'res' | 'end';
export interface Drg {
  kind: 'drg'; g: number; round: number; phase: Phase; to: number; at: number;
  /** 이번 판 눈 뜸 [시작, 끝] (판 시작 기준 ms) · 속임수 = 예고만 나오고 안 뜸(시각) */
  eyes: [number, number][]; fakes: number[];
  total: number; alive: Record<string, 1>;
  /** 판마다 점수 · 걸린 수 (판이 끝날 때 쌓음) */
  pts?: Record<string, number>; hits?: Record<string, number>; done?: Record<string, number[]>;
  win?: string[]; clean?: string[]; endAt?: number; frz?: number | null; drv?: { u: string; at: number };
}
export type Prog = { p?: number; h?: number; f?: number };

/** 판 일정 (씨앗 g · 판) — 1판 = 잠 2~5초 ↔ 눈 1.5~3초 · 2판 = + 속임수 2~3번 · 결승 = 잠 1.5~3.5 ↔ 눈 1.5~2.5 + 속임수 */
export function schedule(g: number, round: number): { eyes: [number, number][]; fakes: number[] } {
  let s = (g ^ (round * 2654435761)) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const len = ROUND_MS[round - 1] ?? 30000, fin = round === 3;
  const [sl0, sl1] = fin ? [1500, 3500] : [2000, 5000], [ey0, ey1] = fin ? [1500, 2500] : [1500, 3000];
  const eyes: [number, number][] = [], sleeps: [number, number][] = [];
  let t = 1500; // 시작 1.5초 = 잠
  while (t < len) { const sl = sl0 + rnd() * (sl1 - sl0); sleeps.push([t, Math.min(len, t + sl)]); t += sl; if (t >= len) break; const ey = ey0 + rnd() * (ey1 - ey0); eyes.push([Math.round(t), Math.round(Math.min(len, t + ey))]); t += ey; }
  const fakes: number[] = [];
  if (round >= 2) { const n = 2 + Math.floor(rnd() * 2), long = sleeps.filter(([a, b]) => b - a > 2600 && b < len); for (let k = 0; k < n && long.length; k++) { const [a, b] = long.splice(Math.floor(rnd() * long.length), 1)[0]!; fakes.push(Math.round(a + (b - a) / 2)); } fakes.sort((a, b) => a - b); }
  return { eyes, fakes };
}
/** 지금 용 = 💤 자는 중 · ⚠ 예고(눈 뜨기 · 속임수 0.6초 전) · 👁 눈 뜸 — t = 판 시작 기준 ms */
export function dragonAt(f: Pick<Drg, 'eyes' | 'fakes'>, t: number): { st: 'sleep' | 'warn' | 'eye'; eye: number } {
  for (let k = 0; k < f.eyes.length; k++) { const [a, b] = f.eyes[k]!; if (t >= a && t < b) return { st: 'eye', eye: k }; if (t >= a - WARN && t < a) return { st: 'warn', eye: -1 }; }
  for (const x of f.fakes) if (t >= x - WARN && t < x + 200) return { st: 'warn', eye: -1 };
  return { st: 'sleep', eye: -1 };
}
/** 폰 한 명의 상태 (이 기기만) */
export interface Me { p: number; h: number; f?: number; last: 'L' | 'R' | ''; lastAt: number; frzTo: number; hitEyes: number[] }
export const meStart = (): Me => ({ p: 0, h: 0, last: '', lastAt: -1e9, frzTo: 0, hitEyes: [] });
/** 단추 한 번 (t = 판 시작 기준 ms) → 새 상태 · 'go' 한 칸 · 'same' 같은 단추 · 'fast' 너무 빠름 · 'hit' 걸림 · 'frz' 멈춤 중 · 'fin' 들어옴 */
export function tap(f: Pick<Drg, 'eyes' | 'fakes'>, me: Me, side: 'L' | 'R', t: number): { me: Me; r: 'go' | 'same' | 'fast' | 'hit' | 'frz' | 'fin' } {
  if (me.f != null) return { me, r: 'fin' };
  if (t < me.frzTo) return { me, r: 'frz' };
  const d = dragonAt(f, t);
  if (d.st === 'eye' && t - f.eyes[d.eye]![0] >= GRACE && !me.hitEyes.includes(d.eye)) return { me: { ...me, p: Math.max(0, me.p - BACK), h: me.h + 1, frzTo: t + FREEZE, hitEyes: [...me.hitEyes, d.eye], last: '' }, r: 'hit' };
  if (d.st === 'eye') return { me, r: 'frz' }; // 눈 뜬 동안 = 못 감(봐준 0.3초 · 이미 맞은 눈)
  if (side === me.last) return { me, r: 'same' };
  if (t - me.lastAt < STEP_MS) return { me: { ...me, last: side }, r: 'fast' };
  const p = Math.min(FIN, me.p + 1);
  return { me: { ...me, p, last: side, lastAt: t, ...(p >= FIN ? { f: t } : {}) }, r: p >= FIN ? 'fin' : 'go' };
}
/** 판 점수: 들어온 순서대로 인원 − (순위 − 1) · 못 들어오면 ⌊칸 ÷ 60 × 인원 ÷ 2⌋ */
export function roundPts(prog: Record<string, Prog>, ids: string[]): Record<string, number> {
  const n = ids.length, fin = ids.filter((u) => prog[u]?.f != null).sort((a, b) => Number(prog[a]!.f) - Number(prog[b]!.f));
  const out: Record<string, number> = {};
  fin.forEach((u, k) => { const same = fin.findIndex((v) => prog[v]!.f === prog[u]!.f); out[u] = n - (same >= 0 ? same : k); });
  ids.filter((u) => prog[u]?.f == null).forEach((u) => { out[u] = Math.floor(((Number(prog[u]?.p) || 0) / FIN) * (n / 2)); });
  return out;
}
export const startDrg = (alive: string[], now: number): Drg => ({ kind: 'drg', g: now, round: 1, phase: 'intro', to: now + INTRO, at: now + INTRO, ...schedule(now, 1), total: alive.length, alive: Object.fromEntries(alive.map((u) => [u, 1])) as Record<string, 1>, pts: {}, hits: {}, done: {} });
/** 시계 한 번 (맡은 기기) — prog = 이번 판 진행 · next = 리모컨 ⏭ (지금 단계를 바로 끝냄) */
export function stepDrg(f: Drg, prog: Record<string, Prog>, now: number, next = false): Drg | null {
  const ids = Object.keys(f.alive || {});
  if (f.phase === 'intro') return now >= f.to || next ? { ...f, phase: 'play', at: now, to: now + (ROUND_MS[f.round - 1] ?? 30000) } : null;
  if (f.phase === 'play') {
    const finN = ids.filter((u) => prog[u]?.f != null).length;
    if (!(now >= f.to || next || (ids.length >= MIN && finN >= Math.ceil(ids.length / 2)))) return null;
    const rp = roundPts(prog, ids), pts = { ...(f.pts || {}) }, hits = { ...(f.hits || {}) };
    ids.forEach((u) => { pts[u] = (pts[u] || 0) + (rp[u] || 0); hits[u] = (hits[u] || 0) + (Number(prog[u]?.h) || 0); });
    const order = ids.filter((u) => prog[u]?.f != null).sort((a, b) => Number(prog[a]!.f) - Number(prog[b]!.f));
    return { ...f, phase: 'res', to: now + RES, pts, hits, done: { ...(f.done || {}), [f.round]: order.map((u) => ids.indexOf(u)) } };
  }
  if (f.phase === 'res') {
    if (!(now >= f.to || next)) return null;
    if (f.round >= ROUND_MS.length) {
      const tot = f.pts || {}, ranked = ids.slice().sort((a, b) => (tot[b] || 0) - (tot[a] || 0)), third = tot[ranked[Math.min(2, ranked.length - 1)]!] ?? 0;
      const top = ranked.filter((u) => (tot[u] || 0) >= third && (tot[u] || 0) > 0), clean = ids.filter((u) => !(f.hits || {})[u] && (tot[u] || 0) > 0);
      return { ...f, phase: 'end', win: [...new Set([...top, ...clean])], clean, endAt: now, to: now };
    }
    const r = f.round + 1;
    return { ...f, round: r, phase: 'play', at: now + 3000, to: now + 3000 + (ROUND_MS[r - 1] ?? 30000), ...schedule(f.g, r) };
  }
  return null;
}
/** 1 · 2 · 3등 (합산 · 동점 같은 등수) */
export function ranks(f: Drg): { u: string; pts: number; rank: number }[] {
  const tot = f.pts || {}, ids = Object.keys(f.alive || {}).sort((a, b) => (tot[b] || 0) - (tot[a] || 0));
  return ids.map((u) => ({ u, pts: tot[u] || 0, rank: ids.findIndex((v) => (tot[v] || 0) === (tot[u] || 0)) + 1 }));
}
