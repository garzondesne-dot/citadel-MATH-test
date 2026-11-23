// 📝 12월 마무리 설문 (📜 11/23 선생님 「진행」 · 미래교육상 보고서 근거 · 받는 기간 12/1 ~ 12/4)
//   22문항 = A 5점 7 (11/17 설문 A 와 글자 그대로 · 이번엔 「지금」 하나만) · B 5점 4 + 고르기 1 · C 5점 6 (+ 「안 써 봤다」) · D 고르기 2 · E 자유 2
//   열기 = 지금 설문과 같은 칸 survey/{반} = { open, no: 100 } (no 100 = 마무리 설문 표시 · 규칙 그대로)
//   저장 = surveyA/{반}/{무작위} 같은 칸 · 규칙이 요구하는 no · r · pick · cmp 를 맞춤 + v: 2
//     r = 5점 17문항(1~5 · C 13 ~ 18 의 「안 써 봤다」 = 0) · pick = [12번, 19번, 20번] 고른 칸 번호 · cmp = 20번 · say / want = 21 · 22번 (100자)
//   한 번만 = 학생 자기 EXP 칸 xp/{반}/{번호}/log/survey12 (보상 기록이 곧 「12월 했음」 · 11/17 의 surveyDone 은 이미 true 라 못 씀)
//   보상 = 11/17 과 같음 (+5 EXP · 💎 +10 한도 밖 · 한 번) · 11/17 과 비교 = 반 단위만 (11/17 응답은 학생과 이어지지 않게 저장했음)
import type { Store } from '../model/types';
import type { Cell, SheetData } from './xlsx';
import { SUBJ } from '../engine/subject';
import { ck, cleanWords, isDone as isDone1117, MAXT, PAIR, REWARD, rid, SCALE, stateOf } from './survey';

export const NO12 = 100;
export const is12 = (no: number | null | undefined) => Number(no) === NO12;
/** 학생 · 교사 화면 이름표 (「13차시」 대신) */
export const svLabel = (no: number) => (is12(no) ? '12월 마무리' : `${no}차시`);
export const INTRO12 = '성적과 상관없고, 안 해도 불이익 없어요. 선생님은 누가 무엇을 답했는지 볼 수 없어요.';
export const NONE = '안 써 봤다';

export type Kind = 'scale' | 'scale0' | 'pick' | 'text';
export interface Q12 { n: number; sec: 'A' | 'B' | 'C' | 'D' | 'E'; kind: Kind; t: string; opts?: readonly string[] }
export const SECS: Record<Q12['sec'], string> = { A: 'A. 이번 2학기 수학 시간의 나', B: 'B. 지금의 나와 수학', C: 'C. 수업 기능', D: 'D. 수업 전체', E: 'E. 한마디 (안 써도 돼요)' };
export const Q12S: readonly Q12[] = [
  ...PAIR.map((t, i) => ({ n: i + 1, sec: 'A' as const, kind: 'scale' as const, t })),
  { n: 8, sec: 'B', kind: 'scale', t: '수학 문제를 보면 해 볼 만하다는 생각이 든다' },
  { n: 9, sec: 'B', kind: 'scale', t: '틀린 문제를 다시 보는 것이 싫지 않다' },
  { n: 10, sec: 'B', kind: 'scale', t: '게임 보상이 없어도 수학 문제를 풀어 볼 것 같다' },
  { n: 11, sec: 'B', kind: 'scale', t: '수학 시간에 배운 것을 다른 사람에게 설명할 수 있다' },
  { n: 12, sec: 'B', kind: 'pick', t: '수업이 없는 날(주말 등)에도 교과서나 학습지를 펴 본 적이 있다', opts: ['그렇다', '아니다'] },
  { n: 13, sec: 'C', kind: 'scale0', t: '수업 전 입장 열쇠(중학교 내용 미리 풀기)가 수업 문제를 푸는 데 도움이 됐다' },
  { n: 14, sec: 'C', kind: 'scale0', t: '숫자를 바꿔 서술형을 다시 써 보니 풀이를 내 힘으로 쓸 수 있게 됐다' },
  { n: 15, sec: 'C', kind: 'scale0', t: `${SUBJ.surveyCastle ?? '도전 공간'}에서 어려운 문제에 끝까지 도전해 봤다` },
  { n: 16, sec: 'C', kind: 'scale0', t: '수업 밖 협동 던전에서 친구를 돕거나 도움을 받았다' },
  { n: 17, sec: 'C', kind: 'scale0', t: '실마리와 해설 덕분에 내 속도에 맞춰 배울 수 있었다' },
  { n: 18, sec: 'C', kind: 'scale0', t: '반 전체가 같이 하니까 혼자 할 때보다 끝까지 하게 됐다' },
  { n: 19, sec: 'D', kind: 'pick', t: '수업 속도는', opts: ['너무 빨라 혼자 생각할 시간이 부족했다', '알맞았다', '느렸다'] },
  { n: 20, sec: 'D', kind: 'pick', t: '다음 단원도 이렇게 배우고 싶다', opts: ['그렇다', '잘 모르겠다', '아니다'] },
  { n: 21, sec: 'E', kind: 'text', t: '이 수업에서 나에게 가장 달라진 점 한 가지' },
  { n: 22, sec: 'E', kind: 'text', t: '바꾸었으면 하는 점 한 가지' },
];
export const SCALES = Q12S.filter((q) => q.kind === 'scale' || q.kind === 'scale0'); // 17
export const PICKQ = Q12S.filter((q) => q.kind === 'pick'); // 12 · 19 · 20
export { SCALE };

/** 답 = 문항 번호 → 값 (5점 = 1~5 · 「안 써 봤다」 = 0 · 고르기 = 보기 번호 · 빈칸 = -1) */
export interface Answer12 { v: Record<number, number>; say: string; want: string }
export const blank12 = (): Answer12 => ({ v: Object.fromEntries(Q12S.filter((q) => q.kind !== 'text').map((q) => [q.n, -1])), say: '', want: '' });
const okVal = (q: Q12, x: number | undefined) => Number.isInteger(x) && (q.kind === 'scale' ? x! >= 1 && x! <= 5 : q.kind === 'scale0' ? x! >= 0 && x! <= 5 : x! >= 0 && x! < (q.opts?.length ?? 0));
/** 첫 빈칸 문항 번호 (0 = 없음) */
export const firstGap12 = (a: Answer12) => Q12S.find((q) => q.kind !== 'text' && !okVal(q, a.v[q.n]))?.n ?? 0;
export function check12(a: Answer12 | null | undefined): string { if (!a) return '모든 문항에 답해 주세요.'; const g = firstGap12(a); return g ? `${g}번을 골라 주세요.` : ''; }

export interface Saved12 { no: number; v: 2; r: number[]; pick: number[]; cmp: number; say: string; want: string }
export function clean12(a: Answer12): Saved12 {
  const t = (s: unknown) => cleanWords(s, MAXT).text.trim();
  return { no: NO12, v: 2, r: SCALES.map((q) => a.v[q.n]!), pick: PICKQ.map((q) => a.v[q.n]!), cmp: a.v[20]!, say: t(a.say), want: t(a.want) };
}
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).sort((x, y) => Number(x) - Number(y)).map((k) => (v as Record<string, unknown>)[k]) : []);
export function norm12(x: unknown): Saved12 | null {
  if (!x || typeof x !== 'object') return null; const o = x as Record<string, unknown>;
  if (!is12(Number(o.no))) return null;
  return { no: NO12, v: 2, r: arr(o.r).map(Number), pick: arr(o.pick).map(Number), cmp: Number(o.cmp), say: String(o.say ?? ''), want: String(o.want ?? '') };
}

// ── 한 번만 · 보상 ──
export const LOG12 = 'survey12';
const doneKey12 = (c: string, n: number) => `citadel-survey12-${ck(c)}-${n}`;
export function isDone12(S: Store, c: string, n: number): boolean {
  try { if (localStorage.getItem(doneKey12(c, n))) return true; } catch { /* 무시 */ }
  return !!S.get(`xp/${c}/${n}/log/${LOG12}`);
}
/** 열린 설문이 마무리 설문이면 그 기준으로 · 아니면 11/17 기준 (survey.pendingNo 대신) */
export const pendingAny = (S: Store, c: string, n: number): number => { const st = stateOf(S, c); if (!st) return 0; const no = Number(st.no) || 1; return (is12(no) ? isDone12(S, c, n) : isDone1117(S, c, n)) ? 0 : no; };
export function reward12(S: Store, c: string, n: number, at: number): { gem: number; xp: number; writes: [string, unknown][] } {
  if (S.loaded && !(S.loaded(`gem/${c}/${n}`) && S.loaded(`xp/${c}/${n}`))) return { gem: 0, xp: 0, writes: [] }; // 받기 전 = 안 줌 (두 번 받기 막음 · 11/17 과 같음)
  const gl = S.get(`gem/${c}/${n}/log/${LOG12}`), xl = S.get(`xp/${c}/${n}/log/${LOG12}`);
  const gem = gl ? 0 : REWARD.gem, xp = xl ? 0 : REWARD.xp, writes: [string, unknown][] = [];
  if (gem) writes.push([`gem/${c}/${n}/log/${LOG12}`, { g: gem, at, why: '12월 마무리 설문' }]);
  // EXP 칸 = 「12월 했음」 표시도 겸함 → 보상이 0 이어도(이미 받음) 남김
  writes.push([`xp/${c}/${n}/log/${LOG12}`, xl ?? { xp, at, why: '12월 마무리 설문' }]);
  return { gem, xp, writes };
}
type Writer = Store & { trySet?: (path: string, v: unknown) => Promise<boolean> };
/** 보내기 = 응답(시험 계정 · 베타 반 빼고) → 「12월 했음」(EXP 칸) → 이 기기 표시 · 💎 는 부르는 쪽 */
export async function submit12(S: Writer, c: string, n: number, a: Answer12, excluded: boolean, at: number): Promise<{ gem: number; xp: number }> {
  const err = check12(a); if (err) throw Object.assign(new Error(err), { user: true });
  if (isDone12(S, c, n)) throw Object.assign(new Error('이미 응답했어요. 고마워요!'), { user: true });
  const st = stateOf(S, c); if (!st || !is12(st.no)) throw Object.assign(new Error('설문이 닫혔어요.'), { user: true });
  const put = async (path: string, v: unknown) => { if (S.trySet) { if (!(await S.trySet(path, v))) throw Object.assign(new Error('보내지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.'), { user: true }); } else S.set(path, v); };
  if (!excluded) await put(`surveyA/${ck(c)}/${rid()}`, clean12(a));
  const r = reward12(S, c, n, at);
  for (const [k, v] of r.writes) await put(k, v);
  try { localStorage.setItem(doneKey12(c, n), '1'); } catch { /* 무시 */ }
  return { gem: r.gem, xp: r.xp };
}

// ── 집계 (엑셀 「12월 마무리」 시트 · 손발 12/5 익명 표) ──
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : null);
export function summary12(list: (Saved12 | null)[]) {
  const L = list.filter((a): a is Saved12 => !!a);
  const scales = SCALES.map((q, i) => {
    const vs = L.map((a) => a.r[i]).filter((x): x is number => Number.isInteger(x));
    const used = vs.filter((x) => x >= 1 && x <= 5);
    return { n: q.n, t: q.t, avg: avg(used), dist: [1, 2, 3, 4, 5].map((k) => used.filter((x) => x === k).length), none: vs.filter((x) => x === 0).length };
  });
  const picks = PICKQ.map((q, i) => ({ n: q.n, t: q.t, opts: (q.opts ?? []).map((o, k) => ({ o, c: L.filter((a) => a.pick[i] === k).length })) }));
  const texts = (k: 'say' | 'want') => L.map((a) => a[k]).filter((s) => s && s.trim());
  return { n: L.length, scales, picks, say: texts('say'), want: texts('want') };
}
/** 엑셀 시트 2장 (12월 요약 · 12월 응답) — 응답 한 줄 = 한 사람 · 이름 없음 */
export function sheets12(byCls: Record<string, (Saved12 | null)[]>): SheetData[] {
  const sum: Cell[][] = [['📝 12월 마무리 설문 · 익명(이름 · 번호 · 시각 없음) · 5점 = 1 전혀 아니다 ~ 5 매우 그렇다 · C 「안 써 봤다」는 평균에서 뺌'], []];
  const all: Saved12[] = [];
  const groups: [string, Saved12[]][] = [];
  for (const c of Object.keys(byCls).sort()) { const L = (byCls[c] || []).filter((a): a is Saved12 => !!a); all.push(...L); groups.push([`${c}반`, L]); }
  groups.push(['전체', all]);
  for (const [g, L] of groups) {
    const s = summary12(L);
    sum.push([`${g} · 응답 ${s.n}명`]);
    sum.push(['문항', '평균', '1', '2', '3', '4', '5', NONE]);
    s.scales.forEach((x) => sum.push([`${x.n}. ${x.t}`, x.avg, ...x.dist, x.none]));
    s.picks.forEach((x) => sum.push([`${x.n}. ${x.t}`, ...x.opts.map((o) => `${o.o} ${o.c}`)]));
    sum.push([]);
  }
  const head: Cell[] = ['반', ...SCALES.map((q) => `${q.n}`), ...PICKQ.map((q) => `${q.n}`), '21 달라진 점', '22 바꿨으면'];
  const rows: Cell[][] = [head];
  for (const c of Object.keys(byCls).sort()) for (const a of byCls[c] || []) if (a) rows.push([c, ...a.r.map((x) => (x === 0 ? NONE : x)), ...PICKQ.map((q, i) => q.opts?.[a.pick[i] ?? -1] ?? ''), a.say, a.want]);
  return [{ name: '12월 요약', rows: sum }, { name: '12월 응답', rows }];
}
