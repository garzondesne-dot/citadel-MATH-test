import { feat, type FeatId } from '../school/features.svelte';
import type { Room, Store } from '../model/types';
import { activeIds } from '../raid/raid';
import { roomPath, setRest } from '../raid/actions';
import { KIND, MIN, norm, oxPool, queue, round, step, type Fun, type Kind } from './fun';
import { startNun, stepNun, MIN as NUN_MIN, type Nun } from './nunchi';
import { MAPS, PICK_MS } from './td';

// 🏕 쉼터 놀이 진행 (#142 · 정식 fun.js start · stop · drive · hold 를 Store 위로)
//   시계를 맡는 기기 = 교실 TV(먼저) 또는 교사 폰 · 4초(눈치 3초) 넘게 소식이 없으면 다른 기기가 이어받음 (fun.drv)
//   🔴 집중 = 놀이 시계 멈춤: 켜진 동안 fun.frz = 멈춘 시각 · 끄면 그만큼 to · lastAt 을 뒤로 (정식 #117 hold)
export type Game = Kind | 'nun' | 'td';
/** 🧩 놀이마다 스위치 (⚙ 우리 학교 기능) */
export const GAME_FEAT: Record<Game, FeatId> = { bal: 'rest-balance', rev: 'rest-flip', quiz: 'rest-ox', ox: 'rest-ox', nun: 'rest-nunchi', td: 'rest-defense' };
export const gamesOn = () => GAMES.filter((g) => feat(GAME_FEAT[g.k]));
export const GAMES: { k: Game; ic: string; name: string }[] = [{ k: 'bal', ic: '⚖', name: '밸런스' }, { k: 'rev', ic: '🔄', name: '반대로' }, { k: 'quiz', ic: '⭕', name: 'OX' }, { k: 'nun', ic: '🙊', name: '눈치게임' }, { k: 'td', ic: '🏰', name: '디펜스' }];
const P = (code: string, s: string) => `${roomPath(code)}/${s}`;
const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
export const studentsIn = (R: Room, now: number) => activeIds(R, now).filter((u) => !R.players?.[u]?.teacher);
export type AnyFun = (Omit<Fun, 'kind'> & { kind: Game }) | (Omit<Nun, 'kind'> & { kind: Game });
export const funOf = (R: Room | null): AnyFun | null => ((R as unknown as { fun?: AnyFun })?.fun ?? null);
/** 쉼터 분 기본값 = 지난번 값 (정식 restMinDef · 1 ~ 20 · 처음 5) */
export const restMinDef = (S: Store) => { const m = Number(S.get<number>('school/teacher/restMin')); return m >= 1 && m <= 20 ? m : 5; };
export const saveRestMin = (S: Store, m: number) => S.set('school/teacher/restMin', Math.max(1, Math.min(20, Math.round(m))));

/** 놀이 시작 → 오류 글 또는 null */
export function startFun(S: Store, code: string, R: Room, kind: Game, opt: { which?: 'prev' | 'now'; no: number; me: string }): string | null {
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
export const stopFun = (S: Store, code: string) => { S.set(P(code, 'fun'), null); ['fv', 'tdp', 'tdt', 'tdl', 'tdm', 'tdu'].forEach((k) => S.set(P(code, k), null)); };
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
