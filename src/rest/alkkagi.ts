// 🥏 쉼터 놀이 「알까기 난장판」 (📜 2026-11-24 선생님 컨펌 · 설계 = claude/adoring-dijkstra-sup5zs docs/handoff/design/alkkagi/DESIGN-v1.md · sim.py)
//   머리가 정한 것: 쉼터 놀이 7번째 · 선생님이 엶(리모컨 ▶ 시작 = 모이기 → 폰 🙋 참가 → ▶ 출발 · 2명부터) · 중간 참가 됨
//   반 전체 한 판 · 150초 점수제(떨어뜨리기 +3 · 맞히기 +1 · 👑 1등 알 떨어뜨리기 +5) · 쏜 뒤 4초 쉼 · 떨어지면 3초 뒤 빈자리에 되살아남 + 무적 2초(서로 통과 · 쏘면 끝)
//   「1초 박자」: 시계 맡은 기기(TV · 교사 폰)가 1초마다 ① 지난 1초 움직임 계산 ② 그사이 들어온 발사 넣기 ③ 되살리기 · 왕관 → 판 상태(st)를 내려 줌
//     폰 · TV 는 그 st 에서 같은 식(simBeat)으로 1초를 그 자리에서 그림 → 통신은 1초에 한 번 · 1초 늦음은 쉬는 4초에 묻힘
//   학생 = 발사만 rooms/{코드}/fv/ak{g}/{uid} = { a 각도, p 세기 0 ~ 2, n 번호 } · 참가 = fv/ak{g}_j/{uid} (이미 열린 칸 · 규칙 바뀜 없음)
//   물리 = sim.py 그대로(마찰 감속 · 같은 무게 탄성 충돌 · 무적 = 통과) · 숫자 = sim.py 기본값

/** ⚙ 값 한 곳 */
export const AK = {
  readyMs: 5000, playSec: 150, endMs: 15000, beatMs: 1000, dt: 0.04, steps: 25,
  r: 0.7, fric: 9, pow: [7, 11, 15] as const, cool: 4, inv: 2, back: 3, credit: 3,
  knock: 3, hit: 1, crown: 5, minPlayers: 2, gem1: 30, gem23: 20, gemJoin: 10, dayMax: 3,
} as const;
/** 시간 (🧪 화면 시험만 globalThis.__AK_SPEED 로 줄임 · 박자 길이만 바뀜 = 판 안 1초는 그대로) */
const spd = () => Number((globalThis as { __AK_SPEED?: number }).__AK_SPEED) || 1;
/** 판 반지름 = max(5.5, 2 + 1.2√인원) (알 반지름 0.7) */
export const radiusFor = (n: number) => Math.max(5.5, 2 + 1.2 * Math.sqrt(Math.max(1, n)));

export interface Stone {
  x: number; y: number; vx: number; vy: number;
  /** 1 = 판 위 · 0 = 떨어짐(되살아나기 기다림) */ on: 0 | 1;
  /** 쉬는 시간 · 무적 · 되살아나기까지 (초) */ cd: number; inv: number; back: number;
  /** 마지막으로 건드린 알 · 그 시각(판 초) */ l: string; lt: number;
  /** 1 = 쏜 뒤 아직 아무도 안 맞힘 (맞히면 +1) */ f: 0 | 1;
  /** 마지막으로 넣은 발사 번호 */ n: number;
}
export type Shot = { a: number; p: number; n: number };
export type AkEv = { k: 'fall'; u: string; by: string; pts: number; t: number } | { k: 'hit'; u: string; t: number };

export interface Ak {
  kind: 'ak'; g: number; phase: 'join' | 'ready' | 'play' | 'end'; to: number; endAt?: number; go?: number;
  /** 판 반지름 · 박자 번호 · 박자 시작 시각 · 박자 길이(ms) · 판 시각(초) */ R: number; beat: number; t0: number; bm: number; gt: number;
  st: Record<string, Stone>; sc: Record<string, number>; kn: Record<string, number>; fall: Record<string, number>;
  crown?: string; ev?: AkEv[]; rank?: Record<string, number>; win?: string[]; total: number; alive?: Record<string, true>;
  drv?: { u: string; at: number }; frz?: number | null;
}

type Rnd = () => number;
export const rkJoin = (g: number) => `ak${g}_j`;
export const rkShot = (g: number) => `ak${g}`;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const ids = (st: Record<string, Stone>) => Object.keys(st).sort();

/** 빈자리 (다른 알과 3r 넘게 · 가장자리 2 안쪽) */
function spot(st: Record<string, Stone>, R: number, rnd: Rnd): [number, number] {
  let x = 0, y = 0;
  for (let k = 0; k < 100; k++) {
    const rr = Math.sqrt(rnd()) * Math.max(0.5, R - 2), t = rnd() * Math.PI * 2; x = rr * Math.cos(t); y = rr * Math.sin(t);
    if (Object.values(st).every((s) => !s.on || Math.hypot(x - s.x, y - s.y) > 3 * AK.r)) break;
  }
  return [r3(x), r3(y)];
}
const fresh = (x: number, y: number, inv = 0): Stone => ({ x, y, vx: 0, vy: 0, on: 1, cd: 0, inv, back: 0, l: '', lt: -9, f: 0, n: 0 });

/** 놀이 열기 = 모이기 (선생님이 「출발」 누를 때까지) */
export const startAk = (now: number): Ak => ({ kind: 'ak', g: now, phase: 'join', to: now + 3600e3, R: 5.5, beat: 0, t0: now, bm: AK.beatMs, gt: 0, st: {}, sc: {}, kn: {}, fall: {}, total: 0 });

/** 출발 = 참가한 학생 알을 빈자리에 */
export function deal(f: Ak, joined: string[], now: number, rnd: Rnd = Math.random): Ak {
  const R = radiusFor(joined.length), st: Record<string, Stone> = {};
  for (const u of [...joined].sort()) { const [x, y] = spot(st, R, rnd); st[u] = fresh(x, y); }
  return { ...f, phase: 'ready', to: now + AK.readyMs * spd(), R: r3(R), st, sc: Object.fromEntries(joined.map((u) => [u, 0])), kn: {}, fall: {}, total: joined.length, t0: now, beat: 0, gt: 0, bm: Math.round(AK.beatMs * spd()) };
}

/** 1초(박자 하나) 움직임 — 폰 · TV · 시계 기기가 모두 같은 식 · steps = 그릴 걸음 수(0 ~ 25) · 점수 · 사건은 결과로 */
export function simBeat(st0: Record<string, Stone>, R: number, gt0: number, crown: string | undefined, steps: number = AK.steps): { st: Record<string, Stone>; sc: Record<string, number>; kn: Record<string, number>; fall: Record<string, number>; ev: AkEv[] } {
  const st: Record<string, Stone> = {}; for (const u of ids(st0)) st[u] = { ...st0[u]! };
  const sc: Record<string, number> = {}, kn: Record<string, number> = {}, fall: Record<string, number> = {}, ev: AkEv[] = [];
  const add = (o: Record<string, number>, u: string, v: number) => { o[u] = (o[u] || 0) + v; };
  const U = ids(st), dt = AK.dt, D = 2 * AK.r;
  let t = gt0;
  for (let k = 0; k < steps; k++) {
    t += dt;
    for (const u of U) {
      const s = st[u]!;
      if (!s.on) { s.back -= dt; continue; }
      s.cd = Math.max(0, s.cd - dt); s.inv = Math.max(0, s.inv - dt);
      const v = Math.hypot(s.vx, s.vy);
      if (v > 0.05) {
        const nv = Math.max(0, v - AK.fric * dt); s.vx *= nv / v; s.vy *= nv / v; s.x += s.vx * dt; s.y += s.vy * dt;
        if (Math.hypot(s.x, s.y) > R) {
          s.on = 0; s.back = AK.back; s.vx = s.vy = 0; s.f = 0; add(fall, u, 1);
          const by = s.l && s.l !== u && t - s.lt <= AK.credit ? s.l : '';
          const pts = by ? (crown === u ? AK.crown : AK.knock) : 0;
          if (by) { add(sc, by, pts); add(kn, by, 1); }
          ev.push({ k: 'fall', u, by, pts, t: r3(t) }); s.l = '';
        }
      } else { s.vx = 0; s.vy = 0; s.f = 0; }
    }
    for (let i = 0; i < U.length; i++) {
      const a = st[U[i]!]!; if (!a.on) continue;
      for (let j = i + 1; j < U.length; j++) {
        const b = st[U[j]!]!; if (!b.on) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (!(d > 0 && d < D)) continue;
        if (a.inv > 0 || b.inv > 0) continue; // 무적 = 서로 통과
        const nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny;
          a.l = U[j]!; a.lt = t; b.l = U[i]!; b.lt = t;
          for (const [s, u] of [[a, U[i]!], [b, U[j]!]] as const) if (s.f) { s.f = 0; add(sc, u, AK.hit); ev.push({ k: 'hit', u, t: r3(t) }); } // 맞히기 = 쏜 알이 처음 부딪힐 때 +1
        }
        const ov = (D - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      }
    }
  }
  return { st, sc, kn, fall, ev };
}
/** 서버에 적을 꼴 (소수 셋째 자리) */
const pack = (st: Record<string, Stone>) => Object.fromEntries(ids(st).map((u) => { const s = st[u]!; return [u, { x: r3(s.x), y: r3(s.y), vx: r3(s.vx), vy: r3(s.vy), on: s.on, cd: r3(s.cd), inv: r3(s.inv), back: r3(s.back), l: s.l, lt: r3(s.lt), f: s.f, n: s.n }]; })) as Record<string, Stone>;
const sum = (a: Record<string, number>, b: Record<string, number>) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = (o[k] || 0) + v; return o; };
/** 👑 = 지금 1등(0점 위) · 같으면 지금 왕관 그대로 · 아니면 이름순 첫째 */
export function crownOf(sc: Record<string, number>, cur?: string): string | undefined {
  const mx = Math.max(0, ...Object.values(sc)); if (mx <= 0) return undefined;
  if (cur && sc[cur] === mx) return cur;
  return Object.keys(sc).sort().find((u) => sc[u] === mx);
}
/** 순위 (점수 → 떨어뜨린 수 → 공동) */
export function rankAk(f: Pick<Ak, 'sc' | 'kn' | 'st'>): { rank: Record<string, number>; order: string[] } {
  const key = (u: string) => (f.sc[u] || 0) * 1000 + (f.kn[u] || 0), order = Object.keys(f.st).sort((a, b) => key(b) - key(a) || a.localeCompare(b));
  const rank: Record<string, number> = {}; order.forEach((u, i) => { rank[u] = i > 0 && key(order[i - 1]!) === key(u) ? rank[order[i - 1]!]! : i + 1; });
  return { rank, order };
}

/** 한 걸음 (시계 맡은 기기) — 박자 경계에서만 새 상태 · joins = 참가 칸 · shots = 발사 칸 */
export function stepAk(f: Ak, joins: Record<string, unknown> | null, shots: Record<string, Shot> | null, now: number, rnd: Rnd = Math.random): Ak | null {
  if (f.phase === 'end') return null;
  if (f.phase === 'join') { if (!f.go) return null; const J = Object.keys(joins || {}); if (J.length < AK.minPlayers) return null; return deal(f, J, now, rnd); }
  if (f.phase === 'ready') { if (now < f.to) return null; return { ...f, phase: 'play', t0: now, beat: 1, gt: 0, to: now + AK.playSec * f.bm }; }
  if (now < f.t0 + f.bm) return null;
  // ① 지난 1초
  const b = simBeat(f.st, f.R, f.gt, f.crown);
  const st = b.st, sc = sum(f.sc, b.sc), kn = sum(f.kn, b.kn), fall = sum(f.fall, b.fall), gt = r3(f.gt + AK.steps * AK.dt);
  const ev = [...(f.ev || []), ...b.ev.filter((e) => e.k === 'fall')].slice(-8);
  if (gt >= AK.playSec - 1e-6) {
    const r = rankAk({ sc, kn, st }); return { ...f, phase: 'end', endAt: now, to: now + AK.endMs * spd(), st: pack(st), sc, kn, fall, gt, ev, rank: r.rank, win: r.order.filter((u) => r.rank[u] === 1), crown: crownOf(sc, f.crown) };
  }
  // ② 늦게 온 학생 · 되살리기
  for (const u of Object.keys(joins || {}).sort()) if (!st[u]) { const [x, y] = spot(st, f.R, rnd); st[u] = fresh(x, y, AK.inv); sc[u] ??= 0; }
  for (const u of ids(st)) { const s = st[u]!; if (!s.on && s.back <= 1e-6) { const [x, y] = spot(st, f.R, rnd); st[u] = { ...fresh(x, y, AK.inv), cd: 0.5, n: s.n }; } }
  // ③ 발사 넣기 (쉬는 중 · 떨어짐 = 버림)
  for (const [u, sh] of Object.entries(shots || {})) {
    const s = st[u]; if (!s || !sh || !(Number(sh.n) > s.n)) continue;
    s.n = Number(sh.n);
    if (!s.on || s.cd > 1e-6) continue;
    const v = AK.pow[Math.max(0, Math.min(2, Math.round(Number(sh.p) || 0)))]!, a = Number(sh.a) || 0;
    s.vx = v * Math.cos(a); s.vy = v * Math.sin(a); s.cd = AK.cool; s.inv = 0; s.f = 1;
  }
  return { ...f, st: pack(st), sc, kn, fall, gt, ev, beat: f.beat + 1, t0: now, to: now + (AK.playSec - gt) * f.bm, crown: crownOf(sc, f.crown), total: Object.keys(st).length };
}

/** 지금 보이는 판 (폰 · TV) = 박자 시작 상태에서 지난 시간만큼 */
export function viewAt(f: Pick<Ak, 'st' | 'R' | 'gt' | 'crown' | 't0' | 'bm' | 'phase'>, now: number) {
  if (f.phase !== 'play') return { st: f.st, ev: [] as AkEv[], k: 0 };
  const k = Math.max(0, Math.min(AK.steps, Math.floor(((now - f.t0) / f.bm) * AK.steps)));
  const b = simBeat(f.st, f.R, f.gt, f.crown, k); return { st: b.st, ev: b.ev, k };
}

/** 궤적 미리 보기 (내 폰 · 서버에 안 물음 · 지금 판 기준 예상): 내 알 혼자 미끄러짐 → 멈출 자리 / 판 밖 / 처음 부딪히는 알과 그 알이 밀려갈 방향 */
export function predict(st: Record<string, Stone>, R: number, me: string, a: number, p: number): { pts: [number, number][]; out: boolean; hit?: { u: string; x: number; y: number; dx: number; dy: number; out: boolean } } {
  const s = st[me]; if (!s) return { pts: [], out: false };
  let x = s.x, y = s.y, v: number = AK.pow[Math.max(0, Math.min(2, p))]!; const cx = Math.cos(a), cy = Math.sin(a), pts: [number, number][] = [[x, y]];
  const others = Object.entries(st).filter(([u, o]) => u !== me && o.on && o.inv <= 0);
  for (let k = 0; k < 400 && v > 0.05; k++) {
    v = Math.max(0, v - AK.fric * AK.dt); x += v * cx * AK.dt; y += v * cy * AK.dt;
    if (k % 2 === 0) pts.push([x, y]);
    if (Math.hypot(x, y) > R) { pts.push([x, y]); return { pts, out: true }; }
    const o = others.find(([, q]) => Math.hypot(q.x - x, q.y - y) < 2 * AK.r);
    if (o) {
      const [u, q] = o, d = Math.hypot(q.x - x, q.y - y) || 1, nx = (q.x - x) / d, ny = (q.y - y) / d, push = Math.max(0, v * (cx * nx + cy * ny));
      const dist = (push * push) / (2 * AK.fric), ex = q.x + nx * dist, ey = q.y + ny * dist;
      pts.push([x, y]); return { pts, out: false, hit: { u, x: q.x, y: q.y, dx: ex, dy: ey, out: Math.hypot(ex, ey) > R } };
    }
  }
  pts.push([x, y]); return { pts, out: false };
}
/** 당긴 길이(판 단위) → 세기 0 ~ 2 · 너무 짧으면 -1(안 쏨) */
export const powerOf = (len: number) => (len < 0.4 ? -1 : len < 1.4 ? 0 : len < 2.6 ? 1 : 2);

/** 🤖 가상 친구 · 봇 시험 = sim.py 봇 그대로: 가장 가까운 알(무적 아닌)을 겨눔 · 조준 오차(가우스 sk 라디안) · 거리로 세기 */
export function botShot(st: Record<string, Stone>, me: string, sk: number, rnd: Rnd = Math.random): { a: number; p: number } | null {
  const s = st[me]; if (!s || !s.on || s.cd > 1e-6) return null;
  const tg = Object.entries(st).filter(([u, o]) => u !== me && o.on && o.inv <= 0); if (!tg.length) return null;
  const [, o] = tg.reduce((m, c) => (Math.hypot(c[1].x - s.x, c[1].y - s.y) < Math.hypot(m[1].x - s.x, m[1].y - s.y) ? c : m)), d = Math.hypot(o.x - s.x, o.y - s.y);
  const g = Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd());
  return { a: Math.atan2(o.y - s.y, o.x - s.x) + g * sk, p: d < 2.5 ? 0 : d < 6 ? 1 : 2 };
}
