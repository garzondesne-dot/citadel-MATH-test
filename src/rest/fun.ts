import FUNQ from './funq.json';
import { SUBJ } from '../engine/subject';

// 🏕 쉼터 놀이 (#142 · 정식 js/raid/fun.js 의 순수 계산을 그대로 옮김 · 숫자 · 규칙 · 문구 같음)
//   ⚖ bal = 적은 쪽 탈락 · 🔄 rev = 많은 쪽 탈락 · ⭕ quiz = OX 타임(탈락 없음 · 5문장 · 10초 · 지난 / 오늘) — ⭕ 수학 OX 문장 = 과목 팩(SUBJ.funOx)
//   방 rooms/{코드}/fun = 진행 상태(시계를 맡은 기기만 씀) · rooms/{코드}/fv/{판}/{uid} = 'a' | 'b' | 'c'(가위바위보)
//   💤 안 고른 학생 = 탈락이 아니라 관전 · 관전 중에 아무거나 고르면 다음 판부터 다시 (정식 #57 ⑫)
export type Kind = 'bal' | 'rev' | 'ox' | 'quiz';
export interface OxRow { no: number; t: string; a: boolean; why: string }
export const balList = (): [string, string, string][] => FUNQ.list as [string, string, string][];
export const oxList = (): OxRow[] => (SUBJ.funOx || []) as OxRow[];
export const KIND: Record<Kind, { name: string; short: string; rule: string; out: string; pre: string }> = {
  bal: { name: '⚖ 밸런스 게임', short: '⚖ 밸런스', rule: '적은 쪽이 탈락!', out: '적은 쪽이라', pre: '' },
  rev: { name: '🔄 반대로 밸런스', short: '🔄 반대로', rule: '이번엔 많은 쪽이 탈락!', out: '많은 쪽이라', pre: '' },
  ox: { name: '⭕ 수학 OX', short: '⭕ 수학 OX', rule: '틀리면 탈락!', out: '틀려서', pre: 'x' },
  quiz: { name: '⭕ OX 타임', short: '⭕ OX 타임', rule: '탈락 없는 복습!', out: '', pre: 'q' },
};
const listOf = (k: Kind) => (k === 'ox' || k === 'quiz' ? oxList() : balList());
export const QN = 5;
export const PICK = (n: number, kind: Kind) => (kind === 'quiz' ? 10000 : n <= 2 ? 15000 : 5000), SHOW = 6500, LIMIT = 240000, MIN = 3, QUEUE = 24;
export const RPS_AT = 5, HANDS = ['✊ 바위', '✌️ 가위', '✋ 보'], HAND_EMO: Record<string, string> = { a: '✊', b: '✌️', c: '✋' }, HAND_KO: Record<string, string> = { a: '바위', b: '가위', c: '보' };
const BEATS: Record<string, string> = { a: 'b', b: 'c', c: 'a' };
export interface Fun {
  kind: Kind; g: number; which?: string; lesson?: string | null; total: number; at0: number; queue: number[]; alive: Record<string, true>; outAt: Record<string, number>;
  n: number; rk: string; qi: number; rps: boolean; q: string[]; s: string | null; ans: string | null; why: string | null; phase: 'pick' | 'show' | 'end'; from: number; to: number; final: boolean;
  res: Res | null; until: number | null; win?: string[]; endAt?: number; zz?: Record<string, number>; back?: string[]; marks?: Record<string, string>; hist?: { qi: number; ok: number; n: number }[];
  drv?: { u: string; at: number }; frz?: number | null; saved?: boolean;
}
export interface Res { a: string[]; b: string[]; c?: string[]; none: string[]; zz?: string[]; lose: string; hand?: string; out: string[]; voided: boolean; sa: number; sb: number }
export const rpsOn = (f: Pick<Fun, 'kind' | 'alive'>) => (f.kind === 'bal' || f.kind === 'rev' || !f.kind) && Object.keys(f.alive || {}).length <= RPS_AT;
export const tHand = (g: number, n: number) => { let h = 2166136261; for (const ch of `${g}|${n}|rps`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return 'abc'[(h >>> 0) % 3] as string; };
export function judgeRps(alive: string[], votes: Record<string, string> | null, hand: string) {
  const v = votes || {}, by = (k: string) => alive.filter((u) => v[u] === k), a = by('a'), b = by('b'), c = by('c'), none = alive.filter((u) => !['a', 'b', 'c'].includes(v[u] as string));
  const lose = BEATS[hand] as string;
  let out = [...none, ...by(lose)], left = alive.filter((u) => !out.includes(u)), voided = false;
  if (!left.length) { out = []; left = alive.slice(); voided = true; }
  return { a, b, c, none, lose, hand, out, left, voided };
}
const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : x && typeof x === 'object' ? Object.keys(x).sort((p, q) => Number(p) - Number(q)).map((k) => (x as Record<string, T>)[k] as T) : []);
export function norm(f: Fun | null): Fun | null {
  if (!f) return f;
  const r = f.res ? { ...f.res, a: arr<string>(f.res.a), b: arr<string>(f.res.b), c: arr<string>(f.res.c), none: arr<string>(f.res.none), out: arr<string>(f.res.out), zz: arr<string>(f.res.zz) } : f.res;
  return { ...f, queue: arr<number>(f.queue), q: arr<string>(f.q), win: arr<string>(f.win), back: arr<string>(f.back), hist: arr(f.hist), res: r };
}
export function judge(alive: string[], votes: Record<string, string> | null, kind: Kind = 'bal', ans = '') {
  const v = votes || {}, a = alive.filter((u) => v[u] === 'a'), b = alive.filter((u) => v[u] === 'b'), none = alive.filter((u) => v[u] !== 'a' && v[u] !== 'b');
  const lose = kind === 'ox' ? (ans === 'a' ? 'b' : 'a') : a.length && b.length && a.length !== b.length ? ((kind === 'rev' ? a.length > b.length : a.length < b.length) ? 'a' : 'b') : '';
  let out = [...none, ...(lose === 'a' ? a : lose === 'b' ? b : [])], left = alive.filter((u) => !out.includes(u)), voided = false;
  if (!left.length) { out = []; left = alive.slice(); voided = true; }
  return { a, b, none, lose, out, left, voided };
}
export const tilted = (st?: { n: number; m: number }) => !!(st && st.n >= 2 && st.m / st.n < 0.25);
export function queue(used: Record<string, unknown> | null, n = QUEUE, rnd = Math.random, stats: Record<string, { n: number; m: number }> | null = null, pool: number[] | null = null, pre = '') {
  const base = pool || balList().map((_, i) => i);
  n = Math.min(n, base.length);
  const ok = base.filter((i) => !tilted((stats || {})[i]));
  const all = ok.length >= n ? ok : base, fresh = all.filter((i) => !(used || {})[pre + i]);
  const mix = (a: number[]) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j] as number, x[i] as number]; } return x; };
  const q = mix(fresh).slice(0, n);
  return { q: q.length < n ? [...q, ...mix(all.filter((i) => !q.includes(i))).slice(0, n - q.length)] : q, reset: fresh.length < n };
}
export function round(f: Pick<Fun, 'queue' | 'kind' | 'alive' | 'at0'>, n: number, now: number): Partial<Fun> {
  const qi = f.queue[(n - 1) % f.queue.length] as number, ox = f.kind === 'ox' || f.kind === 'quiz', x = listOf(f.kind)[qi] as unknown;
  const rps = !ox && rpsOn(f);
  const O = x as OxRow, B = x as [string, string];
  return { n, rk: `r${n}`, qi, rps, q: rps ? HANDS.slice() : ox ? ['⭕ 맞다', '❌ 아니다'] : [B[0], B[1]], s: ox ? O.t : null, ans: ox ? (O.a ? 'a' : 'b') : null, why: ox ? O.why : null, phase: 'pick', from: now, to: now + PICK(n, f.kind), final: now - f.at0 >= LIMIT, res: null, until: null };
}
/** 다음 상태 (바뀔 게 없으면 null) — 시계를 맡은 기기가 부름 (정식 step 그대로) */
export function step(f0: Fun | null, votes: Record<string, string> | null, now: number): Fun | null {
  let f = norm(f0);
  if (!f || f.phase === 'end') return null;
  if (f.phase === 'pick' && now >= f.to) {
    const alive = Object.keys(f.alive || {});
    if (f.kind === 'quiz') {
      const r = judge(alive, votes, 'ox', f.ans || ''), ok = f.ans === 'a' ? r.a : r.b, marks = { ...(f.marks || {}) };
      alive.forEach((u) => { marks[u] = (marks[u] || '') + (ok.includes(u) ? 'o' : r.none.includes(u) ? '-' : 'x'); });
      const hist = [...arr<{ qi: number; ok: number; n: number }>(f.hist), { qi: f.qi, ok: ok.length, n: alive.length }];
      return { ...f, phase: 'show', until: now + SHOW, res: { a: r.a, b: r.b, none: r.none, lose: r.lose, out: [], voided: false, sa: 0, sb: 0 }, marks, hist };
    }
    const zzOn = f.kind === 'bal' || f.kind === 'rev' || !f.kind, spect = Object.keys(votes || {}).filter((u) => !(f!.alive || {})[u]), back = zzOn ? spect.filter((u) => (f!.zz || {})[u]) : [];
    const sleep = (r: { voided: boolean; none: string[] }) => (zzOn && !r.voided ? r.none : []), zzOf = (r: { voided: boolean; none: string[] }) => ({ ...(f!.zz || {}), ...Object.fromEntries(sleep(r).map((u) => [u, f!.n])) }), outOf = (r: { voided: boolean; none: string[]; out: string[] }) => r.out.filter((u) => !sleep(r).includes(u));
    if (f.rps) {
      const r = judgeRps(alive, votes, tHand(f.g, f.n)), out = outOf(r);
      return { ...f, phase: 'show', until: now + SHOW, res: { a: r.a, b: r.b, c: r.c, none: r.none, zz: sleep(r), lose: r.lose, hand: r.hand, out, voided: r.voided, sa: 0, sb: 0 }, alive: Object.fromEntries(r.left.map((u) => [u, true])) as Record<string, true>, outAt: { ...(f.outAt || {}), ...Object.fromEntries(out.map((u) => [u, f!.n])) }, zz: zzOf(r), back };
    }
    const r = judge(alive, votes, f.kind || 'bal', f.ans || ''), out = outOf(r), sa = spect.filter((u) => (votes || {})[u] === 'a').length;
    return { ...f, phase: 'show', until: now + SHOW, res: { a: r.a, b: r.b, none: r.none, zz: sleep(r), lose: r.lose, out, voided: r.voided, sa, sb: spect.length - sa }, alive: Object.fromEntries(r.left.map((u) => [u, true])) as Record<string, true>, outAt: { ...(f.outAt || {}), ...Object.fromEntries(out.map((u) => [u, f!.n])) }, zz: zzOf(r), back };
  }
  if (f.phase === 'show' && now >= (f.until ?? 0)) {
    const back = arr<string>(f.back).filter((u) => (f!.zz || {})[u]), left = [...new Set([...Object.keys(f.alive || {}), ...back])], zz = { ...(f.zz || {}) };
    back.forEach((u) => { delete zz[u]; });
    if (back.length) f = { ...f, alive: Object.fromEntries(left.map((u) => [u, true])) as Record<string, true>, zz, back: [] };
    if (f.kind === 'quiz') return f.n >= Math.min(QN, f.queue.length) ? { ...f, phase: 'end', win: [], endAt: now } : { ...f, ...round(f, f.n + 1, now) } as Fun;
    if (left.length <= 2 || f.final) return { ...f, phase: 'end', win: left, endAt: now };
    return { ...f, ...round(f, f.n + 1, now) } as Fun;
  }
  return null;
}
/** ⭕ OX 타임 문장 고르기 (정식 start · which = prev 지난 차시 · now 이번 차시) */
export function oxPool(no: number, which: 'prev' | 'now'): number[] {
  const L = oxList(), pickNo = (want: number) => L.map((x, i) => (x.no === want ? i : -1)).filter((i) => i >= 0);
  return which === 'prev' && pickNo(no - 1).length ? pickNo(no - 1) : pickNo(no).length ? pickNo(no) : pickNo(no - 1);
}
export const status = (f: Fun | null) => {
  if (!f) return '';
  const n = Object.keys(f.alive || {}).length;
  if (f.kind === 'quiz') return `${KIND[f.kind].short} · ${f.phase === 'end' ? '끝' : `${f.n} / ${Math.min(QN, (f.queue || []).length)}`}`;
  return `${KIND[f.kind].short} · ${f.phase === 'end' ? `🏆 우승 ${(f.win || []).length}명` : `${f.n}판 · 생존 ${n}명`}`;
};
export const verdict = (f: Fun) => {
  const r = f.res!; const q = f.q || [];
  if (f.kind === 'quiz') { const n = r.a.length + r.b.length + r.none.length, ok = (f.ans === 'a' ? r.a : r.b).length; return `정답 ${f.ans === 'a' ? '⭕' : '❌'} — ${f.why} · 반 정답률 ${n ? Math.round((100 * ok) / n) : 0}%`; }
  if (f.rps) { const lost = (r.lose === 'a' ? r.a : r.lose === 'b' ? r.b : r.c || []).length, nn = (r.none || []).length;
    return r.voided ? `선생님 ${HAND_EMO[r.hand!]} — 모두 져서 이번 판은 없던 일! 다시 한 번` : !r.out.length ? `선생님 ${HAND_EMO[r.hand!]} — 아무도 안 졌어요! 다시 한 번` : `선생님 ${HANDS['abc'.indexOf(r.hand!)]} → ${HANDS['abc'.indexOf(r.lose)]}를 낸 ${lost}명 탈락!${nn ? ` (안 낸 ${nn}명도)` : ''}`; }
  if (r.voided) return '모두 탈락하게 돼서 이번 판은 없던 일! 다시 한 번';
  if (!r.lose) return r.a.length && r.b.length ? `${r.a.length} : ${r.b.length} 비김 — 아무도 탈락 안 해요` : '모두 같은 쪽! 아무도 탈락 안 해요';
  return `${q[r.lose === 'a' ? 0 : 1]} 쪽${f.kind === 'rev' ? '이 더 많아서' : ''} ${(r.lose === 'a' ? r.a : r.b).length}명 탈락!${f.kind === 'rev' ? ' 띠용~' : ''}`;
};
