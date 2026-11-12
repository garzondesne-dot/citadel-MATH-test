/* eslint-disable @typescript-eslint/no-explicit-any */
// 🏰 5분 타워 디펜스 (#142-2 · 정식 js/raid/td.js · td-maps.js 의 계산 부분 그대로 옮김)
//   지도 5개 · 자리 24칸(★ 명당 6) · 웨이브 5 · 생명 30 · 몬스터 종류 · 막기 · 계열 특기 · 기술 · 🛡 방패 · ✨ 응원 · calibrate(난이도 ≈ 이길 확률 70%)
//   v1.0 다른 점 (#142 확정안): 타워 힘 = 모두 같게(레벨 · 강화 · 스킬 · 속성 안 셈) → TOWER_P · 근접 / 원거리만 용사 모양대로(hero-data ranged)
//   판 안 업그레이드(⚔ ⚡ ✨)는 폰이 고르지 않음 → 받을 때마다 저절로(정식 auto) · 폰 = 자리 고르기 · 기술 단추만
export const W = 16, H = 9, SLOTS = 24, STARS = 6, RANGE = 2;
type Pt = [number, number];
export interface TdMap { id: string; name: string; desc: string; theme: { bg: [string, string]; path: string; edge: string; deco: string; deco2: string }; tile: string; paths: Pt[][]; _slots?: Slot[] }
export interface Slot { x: number; y: number; c: number; star: boolean; no: number }
export const MAPS: TdMap[] = [
  { id: 'forest', name: '🌲 초록 숲길', desc: '기본 S자 길 · 꺾인 곳 명당이 고르게', theme: { bg: ['#1f4a2a', '#2f6b3a'], path: '#b08a52', edge: '#6b4f2a', deco: '🌲', deco2: '🍄' }, tile: 'wind',
    paths: [[[0, 1.5], [12.43, 1.5], [12.43, 4.41], [3.26, 4.41], [3.26, 7.37], [15.2, 7.37]]] },
  { id: 'volcano', name: '🌋 용암 두 갈래', desc: '가운데서 길이 둘로 갈라졌다 다시 만남 · 나눠 지켜야 함', theme: { bg: ['#3a1410', '#5a2014'], path: '#3a2a26', edge: '#ff6a1a', deco: '🔥', deco2: '🪨' }, tile: 'fire',
    paths: [[[0, 4.5], [4, 4.5], [5.5, 1.6], [10.5, 1.6], [12, 4.5], [15.2, 4.5]], [[0, 4.5], [4, 4.5], [5.5, 7.4], [10.5, 7.4], [12, 4.5], [15.2, 4.5]]] },
  { id: 'ice', name: '❄ 얼음 소용돌이', desc: '나선을 따라 가운데 성으로 · 가운데 칸은 여러 바퀴를 때림', theme: { bg: ['#14304a', '#1f4a6b'], path: '#cfe8f7', edge: '#7fb8e0', deco: '❄', deco2: '🧊' }, tile: 'frost',
    paths: [[[0, 0.8], [15, 0.8], [15, 8.2], [1, 8.2], [1, 2.6], [13, 2.6], [13, 6.4], [3, 6.4], [3, 4.5], [8, 4.5]]] },
  { id: 'desert', name: '🏜 사막 지그재그', desc: '긴 직선이 위아래로 · 원거리가 유리', theme: { bg: ['#6b5320', '#8a6f2e'], path: '#e8cf8a', edge: '#a8843c', deco: '🌵', deco2: '🦴' }, tile: 'spark',
    paths: [[[0.8, 0], [0.8, 7.8], [4.6, 7.8], [4.6, 1.2], [8.4, 1.2], [8.4, 7.8], [12.2, 7.8], [12.2, 1.2], [15.2, 1.2]]] },
  { id: 'crypt', name: '🌙 묘지 두 입구', desc: '왼쪽 · 위쪽 두 입구 → 가운데 십자로에서 만남 · 입구 나눠 맡기', theme: { bg: ['#1c1530', '#2a2048'], path: '#6b6680', edge: '#a89cff', deco: '🪦', deco2: '🕯' }, tile: 'magic',
    paths: [[[0, 2], [6, 2], [8, 4.5], [8, 6], [15.2, 6]], [[11, 0], [11, 3], [8, 4.5], [8, 6], [15.2, 6]]] },
];
export const mapGet = (id: string) => MAPS.find((m) => m.id === id) ?? MAPS[0]!;
const segs = (m: TdMap) => m.paths.flatMap((p) => p.slice(1).map((b, i) => [p[i]!, b] as [Pt, Pt]));
function dSeg(px: number, py: number, [a, b]: [Pt, Pt]) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2)); return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy)); }
export const dPath = (m: TdMap, x: number, y: number) => Math.min(...segs(m).map((s) => dSeg(x, y, s)));
export function cover(m: TdMap, x: number, y: number, r = RANGE) { let n = 0; segs(m).forEach(([a, b]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(L / 0.1)); for (let i = 0; i <= k; i++) { const t = i / k; if (Math.hypot(x - (a[0] + t * (b[0] - a[0])), y - (a[1] + t * (b[1] - a[1]))) <= r) n++; } }); return n / 10; }
const HUD = [3.6, 12.4, 1.1];
const blocked = (x: number, y: number, ex: number, ey: number, st: Pt[]) => (x > HUD[0]! && x < HUD[1]! && y < HUD[2]!) || (Math.abs(x - ex) < 1.1 && y > ey - 1.6 && y < ey + 0.9)
  || st.some(([sx, sy]) => Math.abs(x - Math.max(0.5, Math.min(W - 0.5, sx))) < 1.0 && Math.abs(y - Math.max(0.5, Math.min(H - 0.5, sy))) < 1.15);
export const end = (m: TdMap): Pt => { const p = m.paths[0]!; return p[p.length - 1]!; };
export const starts = (m: TdMap): Pt[] => m.paths.map((p) => p[0]!).filter((s, i, a) => a.findIndex((t) => t[0] === s[0] && t[1] === s[1]) === i);
export const pathLen = (p: Pt[]) => p.slice(1).reduce((a, b, i) => a + Math.hypot(b[0] - p[i]![0], b[1] - p[i]![1]), 0);
export function slots(m: TdMap): Slot[] {
  if (m._slots) return m._slots;
  const cand: Slot[] = [], [ex, ey] = end(m), st = starts(m);
  for (let x = 0.5; x <= W - 0.5; x += 0.5) for (let y = 0.5; y <= H - 0.5; y += 0.5) { const d = dPath(m, x, y); if (d >= 0.75 && d <= 1.25 && !blocked(x, y, ex, ey, st)) cand.push({ x, y, c: cover(m, x, y), star: false, no: 0 }); }
  cand.sort((a, b) => b.c - a.c || a.x - b.x || a.y - b.y);
  const out: Slot[] = [];
  for (const p of cand) { if (out.length >= SLOTS) break; if (out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= 1.0)) out.push(p); }
  out.sort((a, b) => b.c - a.c); out.forEach((p, i) => { p.star = i < STARS; });
  out.sort((a, b) => a.y - b.y || a.x - b.x); out.forEach((p, i) => { p.no = i + 1; });
  m._slots = out; return out;
}

// ── 숫자 (정식 확정안 그대로) ──
export const PICK_MS = 40000, DT = 0.05, WAVE_AT = [0, 36, 72, 108, 144], LIMIT = 225, LIFE = 30, WALK = 26, DENSE = 1.7;
export const STARS_AT = [5, 14, 26, 43], TERRAIN = 1.2, RESO = 1.1, MELEE = { range: 1.6, dmg: 1.3 }, RANGED = { range: 3, dmg: 1 };
export const UP: Record<string, { atk?: number; rate?: number; tier?: number }> = { a: { atk: 0.25 }, b: { rate: 0.2 }, c: { tier: 1 } };
export const TYPES: Record<string, { hp: number; sp: number; leak: number; star: number; heavy?: boolean; fly?: boolean; boss?: boolean }> = { n: { hp: 0.21, sp: 1, leak: 1, star: 1 }, f: { hp: 0.13, sp: 1.6, leak: 1, star: 1 }, t: { hp: 0.82, sp: 0.55, leak: 2, star: 2, heavy: true }, v: { hp: 0.15, sp: 1.25, leak: 1, star: 1, fly: true }, m: { hp: 3, sp: 0.7, leak: 3, star: 5, boss: true, heavy: true }, b: { hp: 10, sp: 0.5, leak: 5, star: 10, boss: true, heavy: true } };
export const WAVES: (string | number)[][] = [['n', 30], ['n', 30, 'f', 10, 'v', 6], ['n', 26, 't', 8, 'v', 8], ['n', 20, 'f', 10, 't', 8, 'v', 8, 'm', 2], ['b', 1, 'n', 18, 'f', 8, 't', 8, 'v', 8]];
export const BLOCK = { r: 0.75, cap: 3 };
export const FAM: Record<string, Record<string, number[]>> = {
  cut: { dmg: [0.2, 0.3, 0.4, 0.5, 0.6] }, smash: { stun: [0.2, 0.35, 0.5, 0.7, 0.9] }, sweep: { splash: [0.5, 0.7, 0.9, 1.1, 1.3] },
  wind: { knock: [0.3, 0.5, 0.7, 0.9, 1.1] }, fire: { burn: [0.15, 0.2, 0.25, 0.3, 0.35] }, spark: { chain: [1, 2, 3, 4, 5] },
  frost: { slow: [0.15, 0.25, 0.35, 0.45, 0.55] }, star: { crit: [0.1, 0.15, 0.2, 0.25, 0.3] }, magic: { boss: [0.2, 0.3, 0.4, 0.5, 0.6] },
  math: { proof: [0.1, 0.13, 0.16, 0.2, 0.24] },
};
export const HP_K = 0.42;
export const FACTOR: Record<string, number> = { forest: 1.10, volcano: 1.12, ice: 1.09, desert: 1.12, crypt: 1.14 };
/** 🟰 v1.0 타워 힘 = 모두 같음 (#142 확정안 · 정식 「모르는 학생」 기본값 = 레벨 3 · 강화 0 · 🔥 불꽃(Ⅰ) · 공명 없음) */
export const TOWER_P = { lv: 3, enh: 0, fam: 'fire', tier: 0 };

export const rng = (seed: unknown) => { let a = 0; for (const ch of String(seed)) a = Math.imul(a ^ ch.charCodeAt(0), 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
export function towerOf(map: TdMap | null, ranged: boolean, p = TOWER_P) {
  const K = ranged ? RANGED : MELEE;
  return { atk: 10 + 2 * p.lv, rate: 0.8 + 0.08 * Math.min(10, p.enh), range: K.range, dmgK: K.dmg, reso: false, fam: p.fam, tier: p.tier, terr: map && map.tile === p.fam ? TERRAIN : 1, ranged };
}
export const dps = (T: { atk: number; dmgK: number; rate: number }) => T.atk * T.dmgK * T.rate;
export interface TowerIn { uid: string; slot: number; ranged: boolean; teacher?: boolean }
export function create(opt: { map: TdMap; seed: unknown; towers: TowerIn[]; hp0?: number }): any {
  const map = opt.map, paths = map.paths, plen = paths.map((p) => pathLen(p)), avgLen = plen.reduce((a, b) => a + b, 0) / plen.length;
  const sl = slots(map), endP = end(map), sp = avgLen / WALK;
  const towers = opt.towers.map((t) => { const s = t.teacher ? { x: endP[0] - 0.9 * Math.sign(endP[0] - 8 || 1), y: endP[1] + (endP[1] > 4.5 ? -1 : 1) } : sl[(t.slot || 1) - 1] || sl[0]!;
    const T = towerOf(map, t.ranged); return Object.assign(T, { uid: t.uid, slot: t.slot, x: s.x, y: s.y, teacher: !!t.teacher, cover: cover(map, s.x, s.y, T.range), cd: 0, hits: 0, kills: 0, stars: 0, dmg: 0, blocks: 0, shotAt: -9, ups: [] as string[], upGot: 0, awake: false } as any); });
  const power = towers.reduce((a: number, T: any) => a + dps(T) * (1 + 0.15 * T.tier) * T.terr * Math.min(T.cover, avgLen) / sp, 0);
  const students = towers.filter((T: any) => !T.teacher).length, few = Math.max(0.45, Math.min(1, students / 12));
  const hp0 = opt.hp0 || Math.max(30, HP_K * power / Math.max(0.6, few * 1.4));
  const R = rng(opt.seed || 1), spawns: any[] = [];
  WAVES.forEach((w, wi) => { const list: string[] = []; for (let i = 0; i < w.length; i += 2) { const ty = w[i] as string, n = w[i + 1] as number; for (let k = 0; k < Math.max(ty === 'b' || ty === 'm' ? n : 1, Math.round(n * few * (ty === 'b' || ty === 'm' ? 1 : 1 + (DENSE - 1) * few))); k++) list.push(ty); }
    { const head = w[0] === 'b' ? list.shift() : null; list.sort(() => R() - 0.5); if (head) list.unshift(head); }
    { const G = 6, ng = Math.ceil(list.length / G), gap = 26 / Math.max(3, ng); list.forEach((ty, i) => { const gi = Math.floor(i / G); spawns.push({ at: WAVE_AT[wi]! + 1 + gi * gap + (i % G) * 0.3, ty, wave: wi + 1, path: gi % paths.length }); }); } });
  return { map, paths, plen, sp, hp0, towers, spawns, si: 0, mons: [] as any[], t: 0, life: LIFE, wave: 1, shield: 0, cheerUntil: 0, petriUntil: 0, nid: 0, fx: [] as any[], done: false, win: false, leaks: 0, R, log: [] };
}
export const posAt = (S: any, path: number, d: number): Pt => { const p: Pt[] = S.paths[path]; let r = d; for (let i = 1; i < p.length; i++) { const L = Math.hypot(p[i]![0] - p[i - 1]![0], p[i]![1] - p[i - 1]![1]); if (r <= L) { const k = r / (L || 1); return [p[i - 1]![0] + k * (p[i]![0] - p[i - 1]![0]), p[i - 1]![1] + k * (p[i]![1] - p[i - 1]![1])]; } r -= L; } return p[p.length - 1]!; };
export function upgrade(S: any, uid: string, k: string) { const T = S.towers.find((x: any) => x.uid === uid); if (!T || T.ups.length >= T.upGot || !UP[k]) return false; T.ups.push(k); if (k === 'a') T.atk *= 1 + UP.a!.atk!; if (k === 'b') T.rate *= 1 + UP.b!.rate!; if (k === 'c') T.tier = Math.min(4, T.tier + 1); if (T.ups.length === 4 && T.ups.slice(0, 3).every((x: string) => x === T.ups[0])) { T.awake = true; T.range += 1; } return true; }
export const pending = (T: any) => T.upGot - T.ups.length;
export function skill(S: any, uid: string) {
  const T = S.towers.find((x: any) => x.uid === uid); if (!T || T.used) return null; T.used = true;
  const big = T.tier >= 2, tru = T.tier >= 3 && T.reso;
  S.mons.forEach((m: any) => { if (!m.dead && Math.hypot(m.x - T.x, m.y - T.y) <= 2.2) hit(S, T, m, T.atk * (big ? 5 : 3), true); });
  if (tru) S.petriUntil = S.t + 3;
  S.fx.push({ k: tru ? 'true' : big ? 'ult' : 'skill', x: T.x, y: T.y, t: S.t, uid });
  return tru ? 'true' : big ? 'ult' : 'skill';
}
export const shieldOn = (S: any) => { if (S.shieldUsed) return false; S.shieldUsed = true; S.shield = 3; S.fx.push({ k: 'shield', t: S.t }); return true; };
export const cheer = (S: any) => { if ((S.cheered || {})[S.wave]) return false; (S.cheered = S.cheered || {})[S.wave] = true; S.cheerUntil = S.t + 5; S.fx.push({ k: 'cheer', t: S.t }); return true; };
function hit(S: any, T: any, m: any, dmg: number, noFx?: boolean) {
  if (m.dead) return;
  const F = FAM[T.fam] || {}, ti = Math.min(4, T.tier), tk = T.terr;
  if (F.dmg) dmg *= 1 + F.dmg[ti]! * tk;
  if (F.boss && TYPES[m.ty]!.boss) dmg *= 1 + F.boss[ti]! * tk;
  if (F.proof && !noFx) { T.stk = T.last === m ? Math.min(3, (T.stk || 0) + 1) : 0; T.last = m; dmg *= 1 + F.proof[ti]! * tk * T.stk; }
  if (F.crit && S.R() < F.crit[ti]! * tk) { dmg *= 2; if (!noFx) S.fx.push({ k: 'crit', x: m.x, y: m.y, t: S.t }); }
  m.hp -= dmg; T.dmg += dmg;
  if (!noFx) S.fx.push({ k: 'dmg', x: m.x, y: m.y, v: Math.max(1, Math.round(dmg)), t: S.t });
  if (F.slow) { m.slow = Math.max(m.slow || 0, F.slow[ti]! * tk); m.slowUntil = S.t + 1.5; }
  if (F.burn) { m.burn = Math.max(m.burn || 0, T.atk * F.burn[ti]! * tk); m.burnUntil = S.t + 2; m.burnBy = T; }
  if (F.stun && T.hits % 3 === 0) m.stunUntil = S.t + F.stun[ti]! * tk;
  if (F.knock && T.hits % 2 === 0) m.d = Math.max(0, m.d - F.knock[ti]! * tk * (TYPES[m.ty]!.boss ? 0.5 : 1));
  if (m.hp <= 0) { m.dead = true; T.kills++; T.stars += TYPES[m.ty]!.star; while (T.upGot < STARS_AT.length && T.stars >= STARS_AT[T.upGot]!) T.upGot++; }
}
export function step(S: any) {
  if (S.done) return S;
  S.t += DT;
  while (S.si < S.spawns.length && S.spawns[S.si].at <= S.t) { const s = S.spawns[S.si++], ty = TYPES[s.ty]!; const [x, y] = posAt(S, s.path, 0); S.mons.push({ id: ++S.nid, ty: s.ty, hp: S.hp0 * ty.hp, max: S.hp0 * ty.hp, d: 0, path: s.path, x, y, wave: s.wave }); S.wave = Math.max(S.wave, s.wave); }
  const petri = S.t < S.petriUntil;
  S.mons.forEach((m: any) => {
    if (m.dead) return;
    if (m.burnUntil > S.t && m.burn) { m.hp -= m.burn * DT; if (m.burnBy) m.burnBy.dmg += m.burn * DT; if (m.hp <= 0) { m.dead = true; const T = m.burnBy; if (T) { T.kills++; T.stars += TYPES[m.ty]!.star; while (T.upGot < STARS_AT.length && T.stars >= STARS_AT[T.upGot]!) T.upGot++; } return; } }
    if (petri || m.stunUntil > S.t) return;
    if (m.blockBy) { const B = m.blockBy; if (Math.hypot(m.x - B.x, m.y - B.y) <= BLOCK.r + 0.15) return; m.blockBy = null; }
    const v = S.sp * TYPES[m.ty]!.sp * (m.slowUntil > S.t ? 1 - (m.slow || 0) : 1);
    m.d += v * DT; const [x, y] = posAt(S, m.path, m.d); m.x = x; m.y = y;
    if (m.d >= S.plen[m.path]) { m.dead = true; m.leaked = true; if (S.shield > 0) { S.shield--; S.fx.push({ k: 'block', t: S.t }); } else { S.life -= TYPES[m.ty]!.leak; S.leaks++; } }
  });
  const held = new Map(); S.mons.forEach((m: any) => { if (!m.dead && m.blockBy) held.set(m.blockBy, (held.get(m.blockBy) || 0) + (TYPES[m.ty]!.heavy ? 2 : 1)); });
  S.mons.filter((m: any) => !m.dead && !m.blockBy && !TYPES[m.ty]!.fly).sort((a: any, b: any) => b.d - a.d).forEach((m: any) => {
    const w = TYPES[m.ty]!.heavy ? 2 : 1, T = S.towers.find((T: any) => !T.ranged && (held.get(T) || 0) + w <= BLOCK.cap && Math.hypot(m.x - T.x, m.y - T.y) <= BLOCK.r);
    if (T) { m.blockBy = T; held.set(T, (held.get(T) || 0) + w); T.blocks++; }
  });
  S.mons.forEach((m: any) => { if (m.dead && m.blockBy) m.blockBy = null; });
  const cheerK = S.t < S.cheerUntil ? 1.2 : 1;
  S.towers.forEach((T: any) => {
    T.cd -= DT * cheerK; if (T.cd > 0) return;
    let best: any = null; S.mons.forEach((m: any) => { if (!m.dead && (T.ranged || !TYPES[m.ty]!.fly) && Math.hypot(m.x - T.x, m.y - T.y) <= T.range && (!best || Number(best.blockBy === T) < Number(m.blockBy === T) || ((best.blockBy === T) === (m.blockBy === T) && m.d > best.d))) best = m; });
    if (!best) return;
    T.cd = 1 / T.rate; T.hits++; T.shotAt = S.t; T.tx = best.x;
    const F = FAM[T.fam] || {}, ti = Math.min(4, T.tier), dmg = T.atk * T.dmgK;
    hit(S, T, best, dmg);
    if (F.splash) S.mons.forEach((m: any) => { if (m !== best && !m.dead && (T.ranged || !TYPES[m.ty]!.fly) && Math.hypot(m.x - best.x, m.y - best.y) <= F.splash![ti]! * T.terr) hit(S, T, m, dmg * 0.5, true); });
    if (F.chain) { let from = best, left = Math.round(F.chain[ti]! * T.terr), d2 = dmg; const seen = new Set([best]); while (left-- > 0) { d2 *= 0.7; let nx: any = null; S.mons.forEach((m: any) => { if (!m.dead && !seen.has(m) && Math.hypot(m.x - from.x, m.y - from.y) <= 1.5 && (!nx || m.d > nx.d)) nx = m; }); if (!nx) break; seen.add(nx); hit(S, T, nx, d2, true); from = nx; } }
    S.fx.push({ k: 'shot', fam: T.fam, x0: T.x, y0: T.y, x1: best.x, y1: best.y, t: S.t, uid: T.uid, r: T.ranged ? 1 : 0 });
  });
  if (S.fx.length > 200) S.fx.splice(0, S.fx.length - 200);
  S.mons = S.mons.filter((m: any) => !m.dead || S.t - (m.deadAt || (m.deadAt = S.t)) < 0.6);
  const allOut = S.si >= S.spawns.length && S.mons.every((m: any) => m.dead);
  const leftHp = () => S.mons.reduce((a: number, m: any) => a + (m.dead ? 0 : Math.max(0, m.hp) / S.hp0), 0) + S.spawns.slice(S.si).reduce((a: number, s: any) => a + TYPES[s.ty]!.hp, 0);
  if (S.life <= 0) { S.left = leftHp(); S.done = true; S.win = false; S.life = 0; }
  else if (allOut) { S.done = true; S.win = true; }
  else if (S.t >= LIMIT) { S.left = leftHp(); S.mons.forEach((m: any) => { if (!m.dead) { m.dead = true; S.life -= TYPES[m.ty]!.leak; } }); S.done = true; S.win = S.life > 0; S.life = Math.max(0, S.life); }
  return S;
}
export function run(S: any, onTick?: (S: any) => void) { while (!S.done) { step(S); if (onTick) onTick(S); } return S; }
export const auto = (T: any, R: () => number) => (T.fam === 'fire' || T.fam === 'frost' || T.fam === 'spark' ? 'c' : R() < 0.5 ? 'a' : 'b');
export function score(opt: { map: TdMap; seed: unknown; towers: TowerIn[] }, hp0: number) { const S = create({ ...opt, hp0 }), R = rng('cal' + String(opt.seed || 1)); run(S, (S) => S.towers.forEach((T: any) => { while (pending(T) > 0) upgrade(S, T.uid, auto(T, R)); })); return S.win ? S.life : -(S.left || 0) - 0.01; }
export function calibrate(opt: { map: TdMap; seed: unknown; towers: TowerIn[] }, f?: number) { let lo = 5, hi = 5000; for (let i = 0; i < 14; i++) { const mid = Math.sqrt(lo * hi); if (score(opt, mid) > 0) lo = mid; else hi = mid; } return Math.round(lo * (f != null ? f : FACTOR[opt.map.id] || 1.2)); }
