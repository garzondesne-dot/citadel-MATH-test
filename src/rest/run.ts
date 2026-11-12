import type { Room, Store } from '../model/types';
import { activeIds } from '../raid/raid';
import { roomPath, setRest } from '../raid/actions';
import { KIND, MIN, norm, oxPool, queue, round, step, type Fun, type Kind } from './fun';
import { startNun, stepNun, MIN as NUN_MIN, type Nun } from './nunchi';

// 🏕 쉼터 놀이 진행 (#142 · 정식 fun.js start · stop · drive · hold 를 Store 위로)
//   시계를 맡는 기기 = 교실 TV(먼저) 또는 교사 폰 · 4초(눈치 3초) 넘게 소식이 없으면 다른 기기가 이어받음 (fun.drv)
//   🔴 집중 = 놀이 시계 멈춤: 켜진 동안 fun.frz = 멈춘 시각 · 끄면 그만큼 to · lastAt 을 뒤로 (정식 #117 hold)
export type Game = Kind | 'nun' | 'td';
export const GAMES: { k: Game; ic: string; name: string }[] = [{ k: 'bal', ic: '⚖', name: '밸런스' }, { k: 'rev', ic: '🔄', name: '반대로' }, { k: 'quiz', ic: '⭕', name: 'OX' }, { k: 'nun', ic: '🙊', name: '눈치게임' }, { k: 'td', ic: '🏰', name: '디펜스' }];
const P = (code: string, s: string) => `${roomPath(code)}/${s}`;
const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
export const studentsIn = (R: Room, now: number) => activeIds(R, now).filter((u) => !R.players?.[u]?.teacher);
export type AnyFun = (Fun | Nun) & { kind: Game };
export const funOf = (R: Room | null): AnyFun | null => ((R as unknown as { fun?: AnyFun })?.fun ?? null);
/** 쉼터 분 기본값 = 지난번 값 (정식 restMinDef · 1 ~ 20 · 처음 5) */
export const restMinDef = (S: Store) => { const m = Number(S.get<number>('school/teacher/restMin')); return m >= 1 && m <= 20 ? m : 5; };
export const saveRestMin = (S: Store, m: number) => S.set('school/teacher/restMin', Math.max(1, Math.min(20, Math.round(m))));

/** 놀이 시작 → 오류 글 또는 null */
export function startFun(S: Store, code: string, R: Room, kind: Game, opt: { which?: 'prev' | 'now'; no: number; me: string }): string | null {
  const now = S.now(), alive = studentsIn(R, now);
  if (kind === 'td') return '🏰 디펜스는 다음 판(#142-2)에서 열려요';
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
export const stopFun = (S: Store, code: string) => { S.set(P(code, 'fun'), null); S.set(P(code, 'fv'), null); };
/** 학생: 고르기 · 다시 참여 · 누르기 · 응원 */
export const pick = (S: Store, code: string, rk: string, uid: string, v: string) => S.set(P(code, `fv/${rk}/${uid}`), v);
export const nunPress = (S: Store, code: string, g: number, rd: number, uid: string) => S.set(P(code, `nun/${g}/${rd}/${uid}`), S.now());
export const nunCheer = (S: Store, code: string, g: number, uid: string, e: string) => S.set(P(code, `nunE/${g}/${uid}`), { e, at: S.now() });

/** 시계 한 번 (TV · 교사 폰이 0.15초마다 부름) — 맡은 기기만 씀 · true = 이 기기가 맡음 */
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
  if (f.kind === 'nun') {
    const g = (f as Nun).g, rd = (f as Nun).round, x = R as unknown as { nun?: Record<string, Record<string, Record<string, number>>>; nunE?: Record<string, Record<string, { e: string; at: number }>> };
    nx = stepNun(f as Nun, f.phase === 'play' ? x.nun?.[g]?.[rd] ?? {} : {}, now, f.phase === 'show' ? x.nunE?.[g] ?? {} : null) as AnyFun | null;
  } else {
    const ff = norm(f as Fun)!, votes = ff.phase === 'pick' && now >= ff.to ? ((R as unknown as { fv?: Record<string, Record<string, string>> }).fv?.[ff.rk] ?? {}) : null;
    nx = step(ff, votes, now) as AnyFun | null;
    if (nx && nx.phase === 'show' && nx.kind !== 'quiz' && !(nx as Fun).rps) tally(S, nx as Fun);
    if (nx && nx.phase === 'pick' && (nx as Fun).n !== ff.n && !(nx as Fun).rps && R.meta.cls) S.set(`school/funUsed/${ck(R.meta.cls as string)}/${KIND[nx.kind as Kind].pre}${(nx as Fun).qi}`, true);
  }
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
  const k = `gifts/${uid}/fun${f.g}`;
  if (!S.get(k)) S.set(k, { g: r.gem, ...(r.xp ? { x: r.xp } : {}), at: S.now(), code, fun: r.why });
  return r;
}
