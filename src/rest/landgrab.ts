// 🏁 쉼터 놀이 「땅따먹기」 (📜 2026-11-22 선생님 컨펌 · 11/24 「진행」 · 설계 = claude/adoring-dijkstra-sup5zs docs/handoff/design/land-grab/DESIGN-v1.md · sim.py)
//   반 전체 4팀(붉은 · 푸른 · 금빛 · 초록) · 모이기(「참가」) → 준비 10초 → 30턴 × 5초(3초 고르기 + 2초 움직임) → 결과 20초
//   규칙: 안 고르면 지난 방향 · 벽 = 제자리 · 밟은 칸 = 우리 색(뺏기) · 다른 팀과 같은 칸으로 = 둘 다 제자리 · ⭐ 7 · 13 · 19 · 25턴 3개 = 둘레 3×3
//         마지막 5턴 점수 가림 · 동점 = ⭐ 많은 팀 → 그래도 같으면 공동
//   학생 = 방향만 rooms/{코드}/fv/lg{g}_{턴}/{uid} = 0 ~ 3 · 참가 = fv/lg{g}_j/{uid} (이미 열린 칸 · 규칙 바뀜 없음) · 계산 = 시계 맡은 기기(TV · 교사 폰)
//   계산 순서 = sim.py play() 그대로: ① 가려는 칸 ② 다른 팀과 겹친 칸 = 제자리 ③ 움직임 ④ 칸 색(다른 팀과 같은 칸에 있으면 안 칠함) ⑤ ⭐

/** ⚙ 값 한 곳 */
export const LG = { readyMs: 10000, pickMs: 3000, moveMs: 2000, turns: 30, endMs: 20000, starTurns: [7, 13, 19, 25], stars: 3, hideLast: 5, minPlayers: 2, gemWin: 30, gemJoin: 10, dayMax: 3 } as const;
/** 시간 (🧪 화면 시험만 globalThis.__LG_SPEED 로 줄임) */
const ms = (k: 'readyMs' | 'pickMs' | 'moveMs' | 'endMs') => LG[k] * (Number((globalThis as { __LG_SPEED?: number }).__LG_SPEED) || 1);
export const TEAMS = [{ n: '붉은', c: '#e5484d' }, { n: '푸른', c: '#3b82f6' }, { n: '금빛', c: '#f5b84a' }, { n: '초록', c: '#4cc38a' }] as const;
/** 위 · 아래 · 왼쪽 · 오른쪽 (sim.py D 순서) */
export const DIRS: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
export const sizeFor = (n: number) => (n >= 25 ? 13 : n >= 13 ? 11 : 9);

export interface Lg {
  kind: 'lg'; g: number; phase: 'join' | 'ready' | 'pick' | 'move' | 'end'; to: number; endAt?: number;
  turn: number; size: number; nTeam: number;
  /** 칸 색 = size² 글자 ('.' 빈칸 · '0' ~ '3' 팀) */ own: string;
  team: Record<string, number>; pos: Record<string, [number, number]>; last: Record<string, number>;
  stars: [number, number][]; starHit: number[];
  /** 내가 칠한 칸 (내 화면에만) */ mine: Record<string, number>;
  bumps?: number; alive: Record<string, true>; total: number;
  /** 결과: 팀 순위(0 ~ 3) · 우승 팀들 */ rank?: number[]; winTeams?: number[]; win?: string[];
  go?: number; drv?: { u: string; at: number }; frz?: number | null;
}

type Rnd = () => number;
const shuffle = <T,>(xs: T[], rnd: Rnd) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; };
const corners = (size: number): [number, number][] => [[1, 1], [size - 2, size - 2], [size - 2, 1], [1, size - 2]];
const idx = (size: number, x: number, y: number) => y * size + x;
export const ownAt = (f: Pick<Lg, 'own' | 'size'>, x: number, y: number) => { const c = f.own[idx(f.size, x, y)]; return c && c !== '.' ? Number(c) : -1; };
const setOwn = (a: string[], size: number, x: number, y: number, t: number) => { a[idx(size, x, y)] = String(t); };
export const scores = (f: Pick<Lg, 'own' | 'nTeam'>) => Array.from({ length: f.nTeam }, (_, t) => Array.from(f.own).filter((c) => c === String(t)).length);
export const rkJoin = (g: number) => `lg${g}_j`;
export const rkTurn = (g: number, t: number) => `lg${g}_${t}`;

/** 놀이 열기 = 모이기 (선생님이 「출발」 누를 때까지) */
export const startLg = (now: number): Lg => ({ kind: 'lg', g: now, phase: 'join', to: now + 3600e3, turn: 0, size: 9, nTeam: 4, own: '', team: {}, pos: {}, last: {}, stars: [], starHit: [0, 0, 0, 0], mine: {}, alive: {}, total: 0 });

/** 출발: 참가한 학생을 순서대로 섞어 팀 배정(차이 최대 1) · 귀퉁이 · 한 명 적은 팀 = 자기 구역 2칸 미리 칠함 */
export function deal(f: Lg, joined: string[], now: number, rnd: Rnd = Math.random): Lg {
  const ids = shuffle(joined, rnd), n = ids.length, nTeam = n < 4 ? 2 : 4, size = sizeFor(n), cs = corners(size), own = Array(size * size).fill('.');
  const team: Record<string, number> = {}, pos: Record<string, [number, number]> = {}, last: Record<string, number> = {}, mine: Record<string, number> = {};
  ids.forEach((u, i) => {
    const t = i % nTeam, k = Math.floor(i / nTeam), [cx, cy] = cs[t]!;
    const p: [number, number] = [Math.min(size - 1, Math.max(0, cx + ((k % 3) - 1))), Math.min(size - 1, Math.max(0, cy + ((Math.floor(k / 3) % 3) - 1)))];
    team[u] = t; pos[u] = p; last[u] = Math.floor(rnd() * 4); mine[u] = 0; setOwn(own, size, p[0], p[1], t);
  });
  const cnt = Array.from({ length: nTeam }, (_, t) => ids.filter((u) => team[u] === t).length), mx = Math.max(...cnt);
  cnt.forEach((c, t) => { if (c < mx) { const [cx, cy] = cs[t]!; let left = 2; for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]] as [number, number][]) { if (!left) break; const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < size && y < size && own[idx(size, x, y)] === '.') { setOwn(own, size, x, y, t); left--; } } } });
  return { ...f, phase: 'ready', to: now + ms('readyMs'), turn: 0, size, nTeam, own: own.join(''), team, pos, last, mine, stars: [], starHit: Array(nTeam).fill(0), alive: Object.fromEntries(ids.map((u) => [u, true])) as Record<string, true>, total: n };
}

/** 늦게 온 학생 = 인원이 가장 적은 팀 귀퉁이 */
export function addLate(f: Lg, u: string): Lg {
  if (f.team[u] != null) return f;
  const cnt = Array.from({ length: f.nTeam }, (_, t) => Object.values(f.team).filter((x) => x === t).length), t = cnt.indexOf(Math.min(...cnt)), [x, y] = corners(f.size)[t]!;
  return { ...f, team: { ...f.team, [u]: t }, pos: { ...f.pos, [u]: [x, y] }, last: { ...f.last, [u]: 0 }, mine: { ...f.mine, [u]: 0 }, alive: { ...f.alive, [u]: true }, total: f.total + 1 };
}

/** 한 턴 계산 (sim.py play 순서) — dirs = 이번 턴 고른 방향 (안 고르면 지난 방향) */
export function moveTurn(f: Lg, dirs: Record<string, number | string>, rnd: Rnd = Math.random): Lg {
  const size = f.size, ids = Object.keys(f.team), own = Array.from(f.own), last = { ...f.last }, pos = { ...f.pos }, mine = { ...f.mine }, starHit = [...f.starHit];
  let stars = f.stars.map((s) => [s[0], s[1]] as [number, number]), bumps = f.bumps || 0;
  const turn = f.turn;
  if ((LG.starTurns as readonly number[]).includes(turn)) for (let k = 0; k < LG.stars; k++) stars.push([Math.floor(rnd() * size), Math.floor(rnd() * size)]);
  // ① 가려는 칸
  const want: Record<string, [number, number]> = {};
  for (const u of ids) {
    const v = dirs[u], d = v != null && [0, 1, 2, 3].includes(Number(v)) ? Number(v) : (last[u] ?? 0);
    last[u] = d; const [x, y] = pos[u]!, nx = x + DIRS[d]![0], ny = y + DIRS[d]![1];
    want[u] = nx >= 0 && ny >= 0 && nx < size && ny < size ? [nx, ny] : [x, y];
  }
  // ② 다른 팀과 같은 칸 = 둘 다 제자리 ③ 움직임
  for (const u of ids) {
    const w = want[u]!, rivals = ids.some((v) => v !== u && f.team[v] !== f.team[u] && want[v]![0] === w[0] && want[v]![1] === w[1]);
    const stay = w[0] === pos[u]![0] && w[1] === pos[u]![1];
    if (rivals) { if (!stay) bumps++; continue; }
    pos[u] = w;
  }
  // ④ 칸 색 ⑤ ⭐
  for (const u of ids) {
    const [x, y] = pos[u]!, t = f.team[u]!;
    if (ids.some((v) => v !== u && f.team[v] !== t && pos[v]![0] === x && pos[v]![1] === y)) continue;
    if (own[idx(size, x, y)] !== String(t)) mine[u] = (mine[u] || 0) + 1;
    setOwn(own, size, x, y, t);
    const si = stars.findIndex((s) => s[0] === x && s[1] === y);
    if (si >= 0) { stars.splice(si, 1); starHit[t] = (starHit[t] || 0) + 1; for (let a = x - 1; a <= x + 1; a++) for (let b = y - 1; b <= y + 1; b++) if (a >= 0 && b >= 0 && a < size && b < size) { if (own[idx(size, a, b)] !== String(t)) mine[u] = (mine[u] || 0) + 1; setOwn(own, size, a, b, t); } }
  }
  return { ...f, own: own.join(''), pos, last, mine, starHit, stars, bumps };
}

/** 순위 (칸 수 → ⭐ → 공동) */
export function ranking(f: Pick<Lg, 'own' | 'nTeam' | 'starHit'>): { rank: number[]; winTeams: number[] } {
  const sc = scores(f), key = (t: number) => sc[t]! * 100 + (f.starHit[t] || 0), order = Array.from({ length: f.nTeam }, (_, t) => t).sort((a, b) => key(b) - key(a));
  const rank: number[] = []; order.forEach((t, i) => { rank[t] = i > 0 && key(order[i - 1]!) === key(t) ? rank[order[i - 1]!]! : i + 1; });
  return { rank, winTeams: order.filter((t) => rank[t] === 1) };
}

/** 한 걸음 (시계 맡은 기기) — 바뀌면 새 상태 */
export function stepLg(f: Lg, joins: Record<string, unknown> | null, dirs: Record<string, number | string> | null, now: number, rnd: Rnd = Math.random): Lg | null {
  if (f.phase === 'end') return null;
  if (f.phase === 'join') { if (!f.go) return null; const ids = Object.keys(joins || {}); if (ids.length < LG.minPlayers) return null; return deal(f, ids, now, rnd); }
  // 늦게 온 학생 (참가를 누른 학생)
  let x = f; for (const u of Object.keys(joins || {})) if (x.team[u] == null) x = addLate(x, u);
  if (x.phase === 'ready') { if (now < x.to) return x !== f ? x : null; return { ...x, phase: 'pick', turn: 1, to: now + ms('pickMs') }; }
  if (x.phase === 'pick') { if (now < x.to) return x !== f ? x : null; return { ...moveTurn(x, dirs || {}, rnd), phase: 'move', to: now + ms('moveMs') }; }
  // move → 다음 턴 또는 끝
  if (now < x.to) return x !== f ? x : null;
  if (x.turn >= LG.turns) { const r = ranking(x); return { ...x, phase: 'end', endAt: now, to: now + ms('endMs'), rank: r.rank, winTeams: r.winTeams, win: Object.keys(x.team).filter((u) => r.winTeams.includes(x.team[u]!)) }; }
  return { ...x, phase: 'pick', turn: x.turn + 1, to: now + ms('pickMs') };
}
/** 마지막 5턴 = 점수 가림 */
export const hidden = (f: Pick<Lg, 'phase' | 'turn'>) => f.phase !== 'end' && f.turn > LG.turns - LG.hideLast;
