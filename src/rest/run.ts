import { feat, type FeatId } from '../school/features.svelte';
import type { Room, Store } from '../model/types';
import { activeIds } from '../raid/raid';
import { roomPath, setRest } from '../raid/actions';
import { KIND, MIN, norm, oxPool, queue, round, step, type Fun, type Kind } from './fun';
import { startNun, stepNun, MIN as NUN_MIN, type Nun } from './nunchi';
import { MAPS, PICK_MS } from './td';
import { MIN as DRG_MIN, startDrg, stepDrg, type Drg, type Prog } from './dragon';
import { AJ, nextRound, startAj, stepAj, standingsAj, type Aj, type Ans } from './ajae';
import { isBeta } from '../school/school';
import { isLgBot, LG, rkJoin, rkTurn, startLg, stepLg, type Lg } from './landgrab';
import { AK, rkJoin as akJoinK, rkShot, startAk, stepAk, type Ak, type Shot } from './alkkagi';

// 🏕 쉼터 놀이 진행 (#142 · 정식 fun.js start · stop · drive · hold 를 Store 위로)
//   시계를 맡는 기기 = 교실 TV(먼저) 또는 교사 폰 · 4초(눈치 3초) 넘게 소식이 없으면 다른 기기가 이어받음 (fun.drv)
//   🔴 집중 = 놀이 시계 멈춤: 켜진 동안 fun.frz = 멈춘 시각 · 끄면 그만큼 to · lastAt 을 뒤로 (정식 #117 hold)
export type Game = Kind | 'nun' | 'td' | 'drg' | 'aj' | 'lg' | 'ak';
/** 🧩 놀이마다 스위치 (⚙ 우리 학교 기능) */
export const GAME_FEAT: Record<Game, FeatId> = { bal: 'rest-balance', rev: 'rest-flip', quiz: 'rest-ox', ox: 'rest-ox', nun: 'rest-nunchi', td: 'rest-defense', drg: 'rest-dragon', aj: 'rest-ajae', lg: 'rest-landgrab', ak: 'rest-alkkagi' };
export const gamesOn = () => GAMES.filter((g) => feat(GAME_FEAT[g.k]));
export const GAMES: { k: Game; ic: string; name: string }[] = [{ k: 'bal', ic: '⚖', name: '밸런스' }, { k: 'rev', ic: '🔄', name: '반대로' }, { k: 'quiz', ic: '⭕', name: 'OX' }, { k: 'nun', ic: '🙊', name: '눈치게임' }, { k: 'drg', ic: '🐉', name: '용이 잠든 사이' }, { k: 'td', ic: '🏰', name: '디펜스' }, { k: 'aj', ic: '😆', name: '아재 퀴즈' }, { k: 'lg', ic: '🏁', name: '땅따먹기' }, { k: 'ak', ic: '🥏', name: '알까기' }];
const P = (code: string, s: string) => `${roomPath(code)}/${s}`;
const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
export const studentsIn = (R: Room, now: number) => activeIds(R, now).filter((u) => !R.players?.[u]?.teacher);
export type AnyFun = (Omit<Fun, 'kind'> & { kind: Game }) | (Omit<Nun, 'kind'> & { kind: Game }) | (Omit<Drg, 'kind'> & { kind: Game }) | (Omit<Aj, 'kind'> & { kind: Game }) | (Omit<Lg, 'kind'> & { kind: Game }) | (Omit<Ak, 'kind'> & { kind: Game });
/** 🐞 11/25 정식 b243 수업 「땅따먹기 안 움직임 · 알까기 화면 안 뜸」: 진짜 서버(Firebase)는 빈 {} · [] 를 저장하지 않음 → 읽으면 칸이 없음(undefined)
 *  → stars.map · Object.keys(st) 에서 멈춤 (이 기기 시험은 빈 칸을 그대로 둬서 못 잡았음 · tests/funfb1125 = 서버 꼴 흉내) · 놀이마다 빈 칸을 채워서 돌려줌 */
const FUN_EMPTY: Partial<Record<string, Record<string, () => unknown>>> = {
  lg: { team: () => ({}), pos: () => ({}), last: () => ({}), stars: () => [], starHit: () => [0, 0, 0, 0], mine: () => ({}), alive: () => ({}) },
  ak: { st: () => ({}), sc: () => ({}), kn: () => ({}), fall: () => ({}) },
  aj: { alive: () => ({}), score: () => ({}), qs: () => [], chips: () => [] },
};
export function funFill<T>(f: T): T {
  const k = (f as { kind?: string } | null)?.kind, d = k ? FUN_EMPTY[k] : null; if (!f || !d) return f;
  let out = f as Record<string, unknown>; for (const [key, mk] of Object.entries(d)) if (out[key] == null) { if (out === (f as unknown)) out = { ...out }; out[key] = mk(); }
  const fx = out.fx as Record<string, unknown> | undefined; // 🏁 턴 연출 = 빈 목록이 빠짐 (fx.star.length 에서 멈춤 · 종합실 · 폰 「못 그렸어요」)
  if (k === 'lg' && fx && typeof fx === 'object' && (fx.bump == null || fx.steal == null || fx.star == null || fx.bu == null)) out = { ...out, fx: { bump: [], steal: [], star: [], bu: {}, ...fx } };
  return out as T;
}
export const funOf = (R: Room | null): AnyFun | null => funFill((R as unknown as { fun?: AnyFun })?.fun ?? null);
/** 쉼터 분 기본값 = 지난번 값 (정식 restMinDef · 1 ~ 20 · 처음 5) */
export const restMinDef = (S: Store) => { const m = Number(S.get<number>('school/teacher/restMin')); return m >= 1 && m <= 20 ? m : 5; };
export const saveRestMin = (S: Store, m: number) => S.set('school/teacher/restMin', Math.max(1, Math.min(20, Math.round(m))));

/** 😆 회차 저장 칸 · 🧪 테스트 반 · 테스트 방 = 저장 안 함(늘 1회부터) */
const ajNoSave = (S: Store, R: Room) => { const c = R.meta.cls as string | undefined; return !c || (R.meta as { profile?: string }).profile === 'test' || isBeta(S, c); };
const ajPath = (R: Room) => `school/funUsed/${ck(String(R.meta.cls))}/ajr`;
/** 이 반이 할 다음 회차 (1 ~ 8) */
export const ajRoundOf = (S: Store, R: Room) => (ajNoSave(S, R) ? 1 : Math.min(AJ.rounds, Math.max(1, Number(S.get(ajPath(R))) || 1)));
/** 이 반이 8회 다 했는지 (다음 = 1회로 돌아옴) */
export const ajAllDone = (S: Store, R: Room) => !ajNoSave(S, R) && Number(S.get(`${ajPath(R)}Done`)) > 0;
/** 놀이 시작 → 오류 글 또는 null */
export function startFun(S: Store, code: string, R: Room, kind: Game, opt: { which?: 'prev' | 'now'; no: number; me: string; round?: number }): string | null {
  const now = S.now(), alive = studentsIn(R, now);
  if (kind === 'td') { // 🏰 디펜스 (#142-2 · 정식 start): 교실 TV 가 계산 · 그림을 맡음 → TV 가 켜져 있어야 · 지도 = 반마다 차례대로
    if (!(now - Number((R as unknown as { tvAt?: number }).tvAt || 0) < 9000)) return '🏰 디펜스는 교실 TV 를 켜야 시작돼요 — TV 가 계산과 그림을 맡아요';
    if (!alive.length) return '입장한 학생이 없어요';
    const cls = R.meta.cls as string | undefined, idx = cls ? Number(S.get(`school/funUsed/${ck(cls)}/td`)) || 0 : 0;
    if (cls) S.set(`school/funUsed/${ck(cls)}/td`, idx + 1);
    S.set(P(code, 'fv'), null);
    S.set(P(code, 'fun'), { kind: 'td', g: now, map: MAPS[idx % MAPS.length]!.id, phase: 'pick', to: now + (Number((globalThis as { __TD_PICK?: number }).__TD_PICK) || PICK_MS), total: alive.length }); // __TD_PICK = 화면 시험만(정식 DS_TD.pick)
    return null;
  }
  if (kind === 'drg') { if (alive.length < DRG_MIN) return `🐉 용이 잠든 사이는 ${DRG_MIN}명 이상일 때 할 수 있어요 (친구를 기다려요)`; S.set(P(code, 'dg'), null); S.set(P(code, 'fun'), { ...startDrg(alive, now), drv: { u: opt.me, at: now } }); return null; } // 🐉 #25
  if (kind === 'lg') { // 🏁 땅따먹기 (📜 11/22 컨펌 · 11/24 진행): 모이기 = 학생 「참가」 → 선생님 「출발」(lgGo) · 2명부터
    S.set(P(code, 'fv'), null); S.set(P(code, 'fun'), { ...startLg(now), drv: { u: opt.me, at: now } });
    return null;
  }
  if (kind === 'ak') { // 🥏 알까기 난장판 (📜 11/24 컨펌 · 머리 「선생님이 엶」): 모이기 = 학생 「참가」 → 선생님 「출발」(lgGo 와 같은 fun/go) · 2명부터
    S.set(P(code, 'fv'), null); S.set(P(code, 'fun'), { ...startAk(now), drv: { u: opt.me, at: now } });
    return null;
  }
  if (kind === 'aj') { // 😆 아재 퀴즈 (📜 11/24 회차제): 1명부터 · 회차 = 리모컨이 고른 것 또는 그 반 다음 회차(school/funUsed/{반}/ajr)
    if (alive.length < AJ.min) return '입장한 학생이 없어요';
    const f = startAj(alive, now, opt.round || ajRoundOf(S, R));
    S.set(P(code, 'fv'), null); S.set(P(code, 'fun'), { ...f, drv: { u: opt.me, at: now } });
    return null;
  }
  if (kind === 'nun') { if (alive.length < NUN_MIN) return `🙊 눈치 게임은 ${NUN_MIN}명 이상일 때 할 수 있어요 (지금 ${alive.length}명)`; S.set(P(code, 'fv'), null); S.set(P(code, 'fun'), { ...startNun(alive, now), drv: { u: opt.me, at: now } }); return null; }
  const k = KIND[kind];
  if (kind !== 'quiz' && alive.length < MIN) return `${k.name}은 ${MIN}명 이상일 때 할 수 있어요 (지금 ${alive.length}명)`;
  if (kind === 'quiz' && alive.length < 1) return '입장한 학생이 없어요';
  const pool = kind === 'quiz' ? oxPool(opt.no, opt.which || 'now') : null;
  if (pool && !pool.length) return '이 차시까지는 수학 OX 문제가 없어요';
  const cls = R.meta.cls as string | undefined, used = cls ? S.get<Record<string, unknown>>(`school/funUsed/${ck(cls)}`) : null, stats = kind === 'quiz' ? null : S.get<Record<string, { n: number; m: number }>>('school/funStats');
  const { q, reset } = queue(used, undefined, Math.random, stats, pool, k.pre);
  if (cls && reset) (pool || q).forEach((i) => S.set(`school/funUsed/${ck(cls)}/${k.pre}${i}`, null));
  const f0 = { g: now, kind, which: opt.which || 'now', lesson: R.meta.lesson ?? null, total: alive.length, at0: now, queue: q, alive: Object.fromEntries(alive.map((u) => [u, true])) as Record<string, true>, outAt: {} };
  S.set(P(code, 'fv'), null);
  S.set(P(code, 'fun'), { ...f0, ...round(f0, 1, now), drv: { u: opt.me, at: now } });
  if (cls) S.set(`school/funUsed/${ck(cls)}/${k.pre}${q[0]}`, true);
  return null;
}
export const stopFun = (S: Store, code: string) => { S.set(P(code, 'fun'), null); ['fv', 'dg', 'tdp', 'tdt', 'tdl', 'tdm', 'tdu'].forEach((k) => S.set(P(code, k), null)); };
/** 학생: 고르기 · 다시 참여 · 누르기 · 응원 */
export const pick = (S: Store, code: string, rk: string, uid: string, v: string) => S.set(P(code, `fv/${rk}/${uid}`), v);
/** 🏁 폰 = 참가 · 방향(0 위 · 1 아래 · 2 왼 · 3 오른) · 리모컨 = 출발 */
export const lgJoin = (S: Store, code: string, g: number, uid: string) => S.set(P(code, `fv/${rkJoin(g)}/${uid}`), 1);
export const lgDir = (S: Store, code: string, g: number, turn: number, uid: string, d: number) => S.set(P(code, `fv/${rkTurn(g, turn)}/${uid}`), d);
export const lgGo = (S: Store, code: string) => S.set(P(code, 'fun/go'), S.now());
/** 🥏 폰 = 참가 · 발사(각도 · 세기 0 ~ 2 · 번호 = 내 알 n + 1) · 리모컨 출발 = lgGo */
export const akJoin = (S: Store, code: string, g: number, uid: string) => S.set(P(code, `fv/${akJoinK(g)}/${uid}`), 1);
export const akShoot = (S: Store, code: string, g: number, uid: string, sh: Shot) => S.set(P(code, `fv/${rkShot(g)}/${uid}`), sh);
/** 😆 폰 = 고른 글자 (맞힌 시각 = 이 폰 시계(서버 시각 맞춤)) · 틀리면 다시 씀 */
export const ajAnswer = (S: Store, code: string, rk: string, uid: string, a: string) => S.set(P(code, `fv/${rk}/${uid}`), { a, at: S.now() });
/** 🐉 폰 = 내 진행 (판정은 폰에서 · 칸 · 걸린 수 · 들어온 시각) · 리모컨 ⏭ = 지금 단계 바로 끝 */
export const drgProg = (S: Store, code: string, g: number, rd: number, uid: string, v: Prog) => S.set(P(code, `dg/${g}/${rd}/${uid}`), v);
export const drgNext = (S: Store, code: string) => S.set(P(code, 'fun/nx'), S.now());
export const nunPress = (S: Store, code: string, g: number, rd: number, uid: string) => S.set(P(code, `nun/${g}/${rd}/${uid}`), S.now());
export const nunCheer = (S: Store, code: string, g: number, uid: string, e: string) => S.set(P(code, `nunE/${g}/${uid}`), { e, at: S.now() });

/** 시계 한 번 (TV · 교사 폰이 0.15초마다 부름) — 맡은 기기만 씀 · true = 이 기기가 맡음 */
/** 📵 🔨 #14 (📜 11/24 선생님 「중간에 접속 끊기면 아웃 처리해 줘」 · DECISIONS a61d7d3): 🥏 🏁 😆 판에서 접속(📵 · 📶✕ 판정 그대로)이 OUT_MS 넘게 끊기면 그 판만 아웃
 *  = 알 · 칸 · 차례 · 답에서 빠짐 · 그때까지 점수 · 💎 그대로 · 다음 판은 다시 참가 · fun.off = 끊긴 첫 시각 · fun.out = 아웃 (폰 = 「연결이 끊겨 이번 판은 끝」) */
export const OUT_MS = 30_000;
const notOut = <T>(m: Record<string, T> | null | undefined, f: AnyFun): Record<string, T> | null => { const o = (f as { out?: Record<string, true> }).out; if (!m) return null; if (!o) return m; return Object.fromEntries(Object.entries(m).filter(([u]) => !o[u])); };
function playersOf(f: AnyFun): string[] | null {
  if (f.kind === 'ak') return f.phase === 'ready' || f.phase === 'play' ? Object.keys((f as unknown as Ak).st || {}) : null;
  if (f.kind === 'lg') return f.phase === 'ready' || f.phase === 'pick' || f.phase === 'move' ? Object.keys((f as unknown as Lg).team || {}).filter((u) => !isLgBot(u)) : null; // 🤖 팀 채움 봇 = 끊김 아웃 없음
  if (f.kind === 'aj') return f.phase === 'intro' || f.phase === 'q' || f.phase === 'show' ? Object.keys((f as unknown as Aj).alive || {}) : null;
  return null;
}
/** 끊긴 시각 적기 · 30초 넘으면 아웃 (바뀐 게 없으면 null) */
export function dropOff(R: Room, f: AnyFun, now: number): AnyFun | null {
  const ps = playersOf(f); if (!ps) return null;
  const x = f as AnyFun & { off?: Record<string, number>; out?: Record<string, true> }, on = new Set(studentsIn(R, now)), off = { ...(x.off || {}) }, out = { ...(x.out || {}) };
  let ch = false; const gone: string[] = [];
  for (const u of ps) {
    if (out[u]) continue;
    if (on.has(u)) { if (off[u] != null) { delete off[u]; ch = true; } continue; }
    if (off[u] == null) { off[u] = now; ch = true; continue; }
    if (now - off[u]! >= OUT_MS) { out[u] = true; delete off[u]; gone.push(u); ch = true; }
  }
  if (!ch) return null;
  const y = { ...x, off, out } as AnyFun & { off: Record<string, number>; out: Record<string, true> };
  if (gone.length && f.kind === 'ak') { const k = y as unknown as Ak; k.st = { ...k.st }; for (const u of gone) if (k.st[u]) k.st[u] = { ...k.st[u]!, on: 0, back: 1e9, vx: 0, vy: 0 }; } // 🥏 알 = 판에서 내림 · 되살아나지 않음 · 점수 · 순위는 남음
  if (gone.length && f.kind === 'aj') { const a = y as unknown as Aj; a.alive = Object.fromEntries(Object.entries(a.alive || {}).filter(([u]) => !gone.includes(u))) as Record<string, true>; } // 😆 「모두 맞힘」 셈에서 빠짐 · 점수는 남음
  return y;
}
export function tick(S: Store, code: string, me: string): boolean {
  const R = S.get<Room>(roomPath(code)), f = funOf(R), now = S.now();
  if (!R || !f || (f.kind as Game) === 'td') return false;
  const lease = f.kind === 'nun' ? 3000 : 4000;
  if (f.drv && f.drv.u !== me && now - (f.drv.at || 0) < lease) return false;
  if (f.phase !== 'end') { // ⏸ 집중 = 멈춤
    if (R.state.focus) { if (f.frz == null) S.set(P(code, 'fun/frz'), now); if (!f.drv || f.drv.u !== me || now - f.drv.at > 1200) S.set(P(code, 'fun/drv'), { u: me, at: now }); return true; }
    if (f.frz != null) { const span = Math.max(0, now - Number(f.frz)), up = f as unknown as Record<string, unknown>; S.set(P(code, 'fun'), { ...up, frz: null, ...Object.fromEntries((['to', 'lastAt', 'until'] as const).filter((k) => typeof up[k] === 'number').map((k) => [k, (up[k] as number) + span])), drv: { u: me, at: now } }); return true; }
  }
  if (f.phase === 'end') {
    const hold = f.kind === 'nun' ? 15000 : 60000;
    if (now - (f.endAt || now) > hold) stopFun(S, code); else if (!f.drv || f.drv.u !== me || now - f.drv.at > 1200) S.set(P(code, 'fun/drv'), { u: me, at: now });
    return true;
  }
  let nx: AnyFun | null;
  if (f.kind === 'drg') {
    const d = f as unknown as Drg & { nx?: number }, prog = ((R as unknown as { dg?: Record<string, Record<string, Record<string, Prog>>> }).dg?.[d.g]?.[d.round]) ?? {};
    nx = stepDrg(d, prog, now, !!d.nx) as unknown as AnyFun | null;
    if (nx) (nx as unknown as { nx?: null }).nx = null;
    // 🐞 #44 ⑩ 1판 출발 순간에 들어와 있는 학생 = 모두 참가 (안내 10초 동안 들어온 학생 · 새 판 받느라 늦은 학생 · 전엔 「시작」 누른 순간 명단만 → 단추가 안 먹힘)
    if (nx && d.phase === 'intro' && d.round === 1 && (nx as unknown as Drg).phase === 'play') { const n2 = nx as unknown as Drg, add = studentsIn(R, now).filter((u) => !n2.alive?.[u]); if (add.length) { n2.alive = { ...(n2.alive || {}), ...Object.fromEntries(add.map((u) => [u, 1 as const])) }; n2.total = Object.keys(n2.alive).length; } }
  } else if (f.kind === 'lg') {
    const l = f as unknown as Lg, fv = (R as unknown as { fv?: Record<string, Record<string, number | string>> }).fv;
    nx = stepLg(l, fv?.[rkJoin(l.g)] ?? null, l.phase === 'pick' ? notOut(fv?.[rkTurn(l.g, l.turn)], f) : null, now) as unknown as AnyFun | null;
  } else if (f.kind === 'ak') {
    const k = f as unknown as Ak, fv = (R as unknown as { fv?: Record<string, Record<string, unknown>> }).fv;
    nx = stepAk(k, fv?.[akJoinK(k.g)] ?? null, notOut(fv?.[rkShot(k.g)] as Record<string, Shot> | undefined, f), now) as unknown as AnyFun | null;
  } else if (f.kind === 'aj') {
    const a = f as unknown as Aj; nx = stepAj(a, notOut((R as unknown as { fv?: Record<string, Record<string, Ans>> }).fv?.[a.rk], f), now) as unknown as AnyFun | null;
    if (nx && (nx as unknown as Aj).phase === 'end' && !ajNoSave(S, R)) { const r = (nx as unknown as Aj).round || 1; S.set(ajPath(R), nextRound(r)); if (r >= AJ.rounds) S.set(`${ajPath(R)}Done`, (Number(S.get(`${ajPath(R)}Done`)) || 0) + 1); } // 📜 판을 끝까지 = 다음 회차 · 8회 끝 = 한 바퀴
    if (nx) { const n2 = nx as unknown as Aj, add = studentsIn(R, now).filter((u) => !n2.alive?.[u] && !(f as { out?: Record<string, true> }).out?.[u]); if (add.length) { n2.alive = { ...(n2.alive || {}), ...Object.fromEntries(add.map((u) => [u, true as const])) }; n2.total = Object.keys(n2.alive).length; } } // 😆 늦게 들어온 학생도 다음 문제부터 함께 (모두 맞힘 = 바로 공개 셈에 들어감)
  } else if (f.kind === 'nun') {
    const g = (f as Nun).g, rd = (f as Nun).round, x = R as unknown as { nun?: Record<string, Record<string, Record<string, number>>>; nunE?: Record<string, Record<string, { e: string; at: number }>> };
    nx = stepNun(f as Nun, f.phase === 'play' ? x.nun?.[g]?.[rd] ?? {} : {}, now, f.phase === 'show' ? x.nunE?.[g] ?? {} : null) as AnyFun | null;
  } else {
    const ff = norm(f as Fun)!, votes = ff.phase === 'pick' && now >= ff.to ? ((R as unknown as { fv?: Record<string, Record<string, string>> }).fv?.[ff.rk] ?? {}) : null;
    nx = step(ff, votes, now) as AnyFun | null;
    if (nx && nx.phase === 'show' && nx.kind !== 'quiz' && !(nx as Fun).rps) tally(S, nx as Fun);
    if (nx && nx.phase === 'pick' && (nx as Fun).n !== ff.n && !(nx as Fun).rps && R.meta.cls) S.set(`school/funUsed/${ck(R.meta.cls as string)}/${KIND[nx.kind as Kind].pre}${(nx as Fun).qi}`, true);
  }
  if (f.kind === 'ak' || f.kind === 'lg' || f.kind === 'aj') nx = dropOff(R, nx ?? f, now) ?? nx; // 📵 #14 끊긴 학생 = 30초 뒤 그 판만 아웃
  if (nx) S.set(P(code, 'fun'), { ...nx, drv: { u: me, at: now } });
  else if (!f.drv || f.drv.u !== me || now - f.drv.at > 1200) S.set(P(code, 'fun/drv'), { u: me, at: now });
  return true;
}
/** 쏠림 재기 (정식 tally): 고른 사람(관객 포함) 4명 이상이면 school/funStats/{질문} 에 적은 쪽 비율 */
function tally(S: Store, f: Fun) {
  const r = f.res!, a = r.a.length + (r.sa || 0), b = r.b.length + (r.sb || 0);
  if (a + b < 4 || f.qi == null) return;
  const st = S.get<{ n: number; m: number }>(`school/funStats/${f.qi}`) || { n: 0, m: 0 };
  S.set(`school/funStats/${f.qi}`, { n: (st.n || 0) + 1, m: Math.round(((st.m || 0) + Math.min(a, b) / (a + b)) * 1000) / 1000 });
}
/** 💎 · EXP (정식 phone 보상 · 같은 판은 한 번): 참여 💎1 · 우승 💎4 · OX 타임 모두 정답 💎2 · ⭕ 맞힌 문장 × 2 EXP */
export const G = { funJoin: 1, funWin: 4, quizAll: 2 };
export function rewardOf(f: AnyFun, me: string): { gem: number; xp: number; why: string } | null {
  if (f.phase !== 'end') return null;
  if (f.kind === 'quiz') { const mk = String(((f as Fun).marks || {})[me] || ''), ok = (mk.match(/o/g) || []).length; if (!mk.length) return null; return { gem: ok === mk.length ? G.quizAll : 0, xp: ok * 2, why: `⭕ ${ok} / ${mk.length} 정답` }; }
  const win = ((f as { win?: string[] }).win || []).includes(me);
  if (f.kind === 'lg') { const l = f as unknown as Lg, t = l.team?.[me]; if (t == null || isLgBot(me)) return null; const w = (l.winTeams || []).includes(t); return { gem: w ? LG.gemWin : LG.gemJoin, xp: 0, why: w ? '🏁 우리 팀 1등' : '🏁 참가' }; } // 📜 1등 팀 💎 30 · 참가 💎 10 · 하루 3판(payFun)
  if (f.kind === 'ak') { const k = f as unknown as Ak, r = k.rank?.[me]; if (r == null) return null; const gem = r === 1 ? AK.gem1 : r <= 3 ? AK.gem23 : AK.gemJoin; return { gem, xp: 0, why: `🥏 ${r}등 · ${k.sc?.[me] ?? 0}점` }; } // 📜 1등 💎 30 · 2 · 3등 20 · 참가 10 · 하루 3판(payFun)
  if (f.kind === 'aj') { const a = f as unknown as Aj, st = standingsAj(a).find((x) => x.u === me); if (!a.alive?.[me] && !st) return null; const top = !!st && st.rank <= 3; return { gem: G.funJoin + (top ? G.funWin : 0), xp: 0, why: top ? `😆 ${st!.rank}등 · ${st!.pts}점` : st ? `😆 ${st.pts}점` : '참여' }; } // 😆 득점 1 ~ 3등 = 우승 💎
  if (f.kind === 'drg') { const d = f as unknown as Drg; if (d.pts?.[me] == null) return null; return { gem: G.funJoin + (win ? G.funWin : 0), xp: 0, why: win ? (d.clean?.includes(me) && !(d.win || []).slice(0, 3).includes(me) ? '🐉 한 번도 안 걸림' : '🏆 상위') : '참여' }; } // 🐉 #25 = 다른 놀이와 같은 💎(참여 1 · 1~3등 · 안 걸린 용사 +4)
  const joined = f.kind === 'nun' ? !!((f as Nun).hist || []).length || !!(f as Nun).alive?.[me] || win : (f as Fun).outAt?.[me] != null || win || !!(f as Fun).alive?.[me];
  if (!joined) return null;
  return { gem: G.funJoin + (win ? G.funWin : 0), xp: 0, why: win ? '🏆 우승' : '참여' };
}
/** 🏕 쉼터 켜기(분 기억) · 분 바꾸기 · 끝 (놀이도 같이 끝) */
export function restOn(S: Store, code: string, R: Room, min: number) {
  saveRestMin(S, min);
  if (R.state.rest) S.set(P(code, 'state/rest/min'), Math.max(1, Math.min(20, Math.round(min))));
  else setRest(S, code, true, min);
}
export function endRest(S: Store, code: string) { stopFun(S, code); setRest(S, code, false); }
/** 시계 맡기 (TV · 교사 폰): 0.15초마다 tick · 끄면 멈춤 */
export function driveFun(S: Store, code: string, me: string): () => void {
  const t = setInterval(() => { try { tick(S, code, me); } catch { /* 다음 번에 */ } }, 150);
  return () => clearInterval(t);
}
/** 🎁 놀이 보상 = gifts/{uid}/fun{g} (같은 판은 한 번 · 캠프에서 지갑 · EXP 에 들어감 · 정식 Gem.add key fun_{g}) */
export function payFun(S: Store, f: AnyFun, uid: string, code: string): { gem: number; xp: number; why: string } | null {
  const r = rewardOf(f, uid);
  if (!r || (!r.gem && !r.xp)) return r;
  if (f.kind === 'lg' || f.kind === 'ak') { // 🏁 🥏 하루 3판까지 (그 뒤 = 순위만) · gifts/{uid}/lg{날짜}_{g} · ak{날짜}_{g}
    const pre = f.kind, max = f.kind === 'ak' ? AK.dayMax : LG.dayMax, day = new Date(S.now() + 9 * 3600e3).toISOString().slice(0, 10), G = (S.get<Record<string, unknown>>(`gifts/${uid}`)) || {}, kk = `gifts/${uid}/${pre}${day}_${f.g}`;
    if (S.get(kk)) return r;
    if (Object.keys(G).filter((k) => k.startsWith(`${pre}${day}_`)).length >= max) return { ...r, gem: 0, why: `${r.why} · 오늘 보상은 ${max}판까지` };
    S.set(kk, { g: r.gem, at: S.now(), code, fun: r.why }); return r;
  }
  const k = `gifts/${uid}/fun${f.g}`;
  if (!S.get(k)) S.set(k, { g: r.gem, ...(r.xp ? { x: r.xp } : {}), at: S.now(), code, fun: r.why });
  return r;
}

// ── 🏰 디펜스: 폰 = 자리(선착순 · 한 번) · 기술(한 판 한 번) / 교사 = 🛡 수호 방패(한 판 한 번) · ✨ 응원(웨이브마다) ──
export const tdPick = (S: Store, code: string, g: number, no: number, uid: string) => { const k = P(code, `tdp/${g}/${no}`); if (S.get(k)) return false; S.set(k, uid); return true; };
export const tdSkill = (S: Store, code: string, g: number, uid: string) => S.set(P(code, `tdt/${g}/${uid}`), S.now());
// #146 정식 그대로 되살림: 🔁 1:1 자리 교환(tdm/{g}/{uid}/sw = 상대 · 서로 신청이 맞으면 TV 가 맞바꿈 · no = 거절) · ⬆ 판 안 업그레이드(tdu/{g}/{uid}/{n} = a|b|c · 12초 안 고르면 저절로) · ⚙ 용사 바꾸기(tdm/{g}/{uid}/hero · 자리 고르기 동안만 · 모양 · 근접/원거리만)
export const tdSwap = (S: Store, code: string, g: number, uid: string, to: string | null) => S.set(P(code, `tdm/${g}/${uid}/sw`), to);
export const tdAccept = (S: Store, code: string, g: number, uid: string, from: string) => { S.set(P(code, `tdm/${g}/${uid}/sw`), from); S.set(P(code, `tdm/${g}/${uid}/no`), null); };
export const tdReject = (S: Store, code: string, g: number, uid: string, from: string) => S.set(P(code, `tdm/${g}/${uid}/no`), from);
export const tdUp = (S: Store, code: string, g: number, uid: string, n: number, k: 'a' | 'b' | 'c') => S.set(P(code, `tdu/${g}/${uid}/${n}`), k);
export const tdHero = (S: Store, code: string, g: number, uid: string, hero: number) => S.set(P(code, `tdm/${g}/${uid}/hero`), hero);
export const tdShield = (S: Store, code: string) => S.set(P(code, 'fun/sh'), S.now());
export const tdCheer = (S: Store, code: string, wave: number) => S.set(P(code, `fun/ch/${wave}`), S.now());
/** 교실 TV 가 켜져 있음 (3초마다) — 디펜스 시작 조건 */
export const tvBeat = (S: Store, code: string) => S.set(P(code, 'tvAt'), S.now());
/** 🎁 디펜스 보상 (정식 · 하루 💎 최대 3 · 이기면 3 · 지면 1 · 같은 날 진 뒤 이긴 판은 3 까지 채움) = gifts/{uid}/td{날짜}… */
export function payTd(S: Store, uid: string, win: boolean, code: string): number {
  const day = new Date(S.now() + 9 * 3600e3).toISOString().slice(0, 10); // KST · 정식 today() 꼴
  const G = (S.get<Record<string, { g: number }>>(`gifts/${uid}`)) || {}, had = Object.entries(G).filter(([k]) => k.startsWith(`td${day}`)).reduce((a, [, x]) => a + (Number(x.g) || 0), 0), want = win ? 3 : 1;
  if (had >= want) return 0;
  S.set(`gifts/${uid}/td${day}_${had}`, { g: want - had, at: S.now(), code, fun: '🏰 디펜스' });
  return want - had;
}
