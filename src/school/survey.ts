// 📝 수업 설문 (정식 js/raid/survey.js 그대로 옮김 · v0.9.8.2 2026-11-04 사용자 확정 · 문항 · 저장 꼴 · 보상 값 같음)
//   저장 (이름 · 번호 · 시각 없음):
//     survey/{반}           = { open: true, no: 차시 }                   ← 교사만 씀 (리모컨 마무리 · 소식 「📝 수업 설문」)
//     surveyA/{반}/{무작위}  = { no, r: [[전, 지금] × 7], pick, cmp, say, want } ← 열려 있을 때만 새로 쓰기 · 교사만 읽기
//     surveyDone/{반}/{번호} = true                                       ← 응답했는지만 (한 번만 · +5 EXP · 💎 +10 한도 밖)
//   응답 키는 무작위(시각이 들어가는 push id 를 쓰지 않음) → EXP 기록 시각과 이어 맞출 수 없다
//   🧪 시험 계정 · 베타 반 = 응답 집계에 넣지 않음(surveyA 안 씀) · 응답 표시 · 보상은 학생과 같음 (정식 #67 · #122)
import type { Store } from '../model/types';
import type { Cell, SheetData } from './xlsx';

export const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
// A. 회고 비교 (중간고사 전 · 지금 각각 1~5)
export const PAIR = [
  '문제를 끝까지 풀어 보려고 했다',
  '틀린 문제를 다시 풀어 봤다',
  '모르면 친구에게 풀이를 묻거나 알려 줬다',
  '답을 보고 옮겨 적지 않고 내가 직접 풀었다',
  '내 답이 맞았는지 바로 알 수 있었다',
  '점수(수행평가)가 아니어도 풀고 싶었다',
  '수학 시간이 기다려졌다',
] as const;
export const WHEN = ['2학기 중간고사 전', '지금'] as const; // 2026-11-10 미래교육상 근거: 1학기로 헷갈리지 않게
export const SCALE = ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'] as const;
// B. 지금 수업만
export const PICKS = ['재도전', '친구 힐', '보스전', '오답노트', '쉼터 놀이', 'OX 타임'] as const;
export const CMP = ['지금이 더 좋다', '비슷하다', '예전이 더 좋다'] as const;
export const MAXT = 100;
export const REWARD = { xp: 5, gem: 10 } as const; // 정식 XP.survey · G.survey (💎 = 하루 한도 밖 · 한 번만)

export interface Answer { r: number[][]; pick: number[]; cmp: number; say?: string; want?: string }
export interface Saved { no: number; r: number[][]; pick: number[]; cmp: number; say: string; want: string }
export const blank = (): Answer => ({ r: PAIR.map(() => [0, 0]), pick: [], cmp: -1, say: '', want: '' });

/** 응답 고르기 (화면 · 규칙과 같은 모양) → 틀리면 오류 문장 · 맞으면 '' */
export function check(a: Answer | null | undefined): string {
  if (!a || !Array.isArray(a.r) || a.r.length !== PAIR.length) return '모든 문장에 답해 주세요.';
  for (let i = 0; i < PAIR.length; i++) {
    const p = a.r[i];
    if (!Array.isArray(p) || p.length !== 2 || !p.every((v) => Number.isInteger(v) && v >= 1 && v <= 5)) return `${i + 1}번 문장의 「${!p || !p[0] ? WHEN[0] : WHEN[1]}」을 골라 주세요.`;
  }
  if (!Array.isArray(a.pick) || a.pick.length < 1 || a.pick.length > 2 || !a.pick.every((v) => Number.isInteger(v) && v >= 0 && v < PICKS.length) || new Set(a.pick).size !== a.pick.length) return '8번: 도움이 된 것을 1~2개 골라 주세요.';
  if (!Number.isInteger(a.cmp) || a.cmp < 0 || a.cmp >= CMP.length) return '9번을 골라 주세요.';
  return '';
}
/** 첫 빈칸 (보내기 실패 때 그 문항으로 스크롤) · 0~6 = A 문장 · 7 = 8번 · 8 = 9번 · -1 = 없음 */
export function firstGap(a: Answer): number {
  const i = a.r.findIndex((p) => !p[0] || !p[1]); if (i >= 0) return i;
  if (a.pick.length < 1) return 7;
  if (a.cmp < 0) return 8;
  return -1;
}
/** 8번 고르기 (2개까지 · 셋째를 누르면 가장 먼저 고른 것이 빠짐 = 정식) */
export function togglePick(pick: number[], v: number): number[] {
  const out = pick.slice(), i = out.indexOf(v);
  if (i >= 0) out.splice(i, 1); else { if (out.length >= 2) out.shift(); out.push(v); }
  return out;
}

// ── 낱말 거르개 (정식 js/raid/words.js 그대로 · 띄어쓰기 · 숫자 · 기호를 끼워 피해 가는 것도 잡음 · 가린 글자 = ＊) ──
const BAD = ['시발', '씨발', '씨빨', '시바', '씨바', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '빙신', '좆', 'ㅈㄴ', '존나', '졸라', '개새', '개색', '새끼', 'ㅅㄲ', '닥쳐', '꺼져', '미친', 'ㅁㅊ', '지랄', 'ㅈㄹ', '엿먹', 'fuck', 'shit', '애미', '애비', '느금', '니미', '엠창', '등신', '찐따', '죽어', '꺼지', '빡대가리', '돌대가리', '장애'];
const SEP = '[\\s\\d!-/:-@[-`{-~·…ㆍ_]';
const strip = (s: string) => s.toLowerCase().replace(new RegExp(SEP, 'g'), '');
export function cleanWords(text: unknown, max = 20): { text: string; bad: boolean } {
  let t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, max), bad = false;
  const flat = strip(t);
  for (const w of BAD) {
    if (!flat.includes(w)) continue;
    bad = true;
    const re = new RegExp(w.split('').map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(`${SEP}*`), 'gi');
    t = t.replace(re, (m) => '＊'.repeat(Math.min(3, m.length)));
  }
  return { text: t, bad };
}
export function clean(a: Answer, no: number): Saved {
  const t = (s: unknown) => cleanWords(s, MAXT).text.trim();
  return { no: Number(no) || 0, r: a.r.map((p) => [p[0]!, p[1]!]), pick: a.pick.slice(0, 2), cmp: a.cmp, say: t(a.say), want: t(a.want) };
}
export const rid = (rnd: () => number = Math.random) => Array.from({ length: 16 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(rnd() * 32)]).join('');

// ── 집계 (대시보드 · 엑셀) ────────────────────────────────
// 서버에서 배열이 {0:…,1:…} 로 돌아올 때가 있다 → 배열로 되돌림
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).sort((x, y) => Number(x) - Number(y)).map((k) => (v as Record<string, unknown>)[k]) : []);
export const norm = (a: unknown): Saved | null => {
  if (!a || typeof a !== 'object') return null;
  const o = a as Record<string, unknown>;
  return { no: Number(o.no) || 0, r: arr(o.r).map((p) => arr(p).map(Number)), pick: arr(o.pick).map(Number), cmp: Number(o.cmp), say: String(o.say ?? ''), want: String(o.want ?? '') };
};
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
export function summary(list: (Saved | null)[]) {
  const L = (list || []).filter((a): a is Saved => !!a && Array.isArray(a.r));
  const pairs = PAIR.map((q, i) => {
    const pre = L.map((a) => (a.r[i] || [])[0]).filter((v): v is number => Number.isFinite(v)), now = L.map((a) => (a.r[i] || [])[1]).filter((v): v is number => Number.isFinite(v));
    const up = L.filter((a) => a.r[i] && a.r[i]![1]! > a.r[i]![0]!).length, down = L.filter((a) => a.r[i] && a.r[i]![1]! < a.r[i]![0]!).length;
    const a0 = avg(pre), a1 = avg(now);
    return { q, pre: a0, now: a1, diff: a0 == null || a1 == null ? null : Math.round((a1 - a0) * 100) / 100, up, same: L.length - up - down, down };
  });
  const picks = PICKS.map((t, i) => ({ t, n: L.filter((a) => (a.pick || []).includes(i)).length }));
  const cmp = CMP.map((t, i) => ({ t, n: L.filter((a) => a.cmp === i).length }));
  const texts = (k: 'say' | 'want') => L.map((a) => a[k]).filter((s) => s && String(s).trim());
  return { n: L.length, pairs, picks, cmp, say: texts('say'), want: texts('want') };
}
/** { 반: [응답] } → 2차원 표 (한 줄 = 응답 하나 · 이름 없음 · 정식 csvRows) */
export function csvRows(byCls: Record<string, (Saved | null)[]>): Cell[][] {
  const head: Cell[] = ['반', '차시', ...PAIR.flatMap((_q, i) => [`${i + 1} 전`, `${i + 1} 지금`]), '도움1', '도움2', '쉼터 vs 5분퀴즈', '달라진 점', '바꿨으면'];
  const rows: Cell[][] = [];
  Object.keys(byCls).sort().forEach((c) => (byCls[c] || []).forEach((a) => { if (a) rows.push([c, a.no || '', ...PAIR.flatMap((_q, i) => (a.r[i] ?? ['', '']) as Cell[]), PICKS[a.pick[0] ?? -1] || '', PICKS[a.pick[1] ?? -1] || '', CMP[a.cmp] || '', a.say || '', a.want || '']); }));
  return [head, ...rows];
}
/** 엑셀 시트 3장 (요약 · 응답 · 문항) = 11/15 내보낸 「설문응답」 파일과 같은 꼴 */
export function sheets(byCls: Record<string, (Saved | null)[]>): SheetData[] {
  const sum: Cell[][] = [['📝 수업 설문 요약 · 익명(이름 · 번호 · 시각 없음) · 점수 1~5 (전혀 아니다 ~ 매우 그렇다)'], []];
  const groups: [string, number, Saved[]][] = [];
  const all: Saved[] = [];
  for (const c of Object.keys(byCls).sort()) {
    const by = new Map<number, Saved[]>();
    for (const a of byCls[c] || []) if (a) { all.push(a); by.set(a.no, [...(by.get(a.no) ?? []), a]); }
    for (const no of [...by.keys()].sort((x, y) => x - y)) groups.push([`${c}반`, no, by.get(no)!]);
  }
  groups.push(['전체', 0, all]);
  for (const [c, no, L] of groups) {
    const s = summary(L);
    sum.push([`${c}${no ? ` · ${no}차시` : ''} · 응답 ${s.n}명`]);
    sum.push(['문항', `${WHEN[0]} 평균`, `${WHEN[1]} 평균`, '변화', '오름', '같음', '내림']);
    s.pairs.forEach((p, i) => sum.push([`${i + 1}. ${p.q}`, p.pre, p.now, p.diff, p.up, p.same, p.down]));
    sum.push(['8. 가장 도움이 된 것 (2개까지)', ...s.picks.map((x) => `${x.t} ${x.n}`)]);
    sum.push(['9. 쉼터 놀이를 예전 5분 퀴즈와 비교하면', ...s.cmp.map((x) => `${x.t} ${x.n}`)]);
    sum.push([]);
  }
  const rows = csvRows(byCls);
  const qs: Cell[][] = [['번호', '문항(원문)', '보기'], ...PAIR.map((q, i) => [i + 1, q, `${WHEN[0]} / ${WHEN[1]} 각각 1~5`] as Cell[]),
    [8, '가장 도움이 된 것 (2개까지)', PICKS.join(' · ')], [9, '쉼터 놀이를 예전 5분 퀴즈와 비교하면', CMP.join(' · ')], [10, '달라진 점 (100자)', '서술'], [11, '바꿨으면 하는 것 (100자)', '서술']];
  return [{ name: '요약', rows: sum }, { name: '응답', rows }, { name: '문항', rows: qs }];
}

// ── 서버 ─────────────────────────────────────────
export interface SvState { open: true; no: number }
export const statePath = (c: string) => `survey/${ck(c)}`;
export const donePath = (c: string, n: number) => `surveyDone/${ck(c)}/${n}`;
export const stateOf = (S: Store, c: string): SvState | null => { const v = S.get<SvState>(statePath(c)); return v && v.open ? v : null; };
export const setOpen = (S: Store, c: string, open: boolean, no: number) => S.set(statePath(c), open ? { open: true, no: Number(no) || 0 } : null);
const doneKey = (c: string, n: number) => `citadel-survey-${ck(c)}-${n}`;
export function isDone(S: Store, c: string, n: number): boolean {
  try { if (localStorage.getItem(doneKey(c, n))) return true; } catch { /* 무시 */ }
  return S.get<boolean>(donePath(c, n)) === true;
}
/** 지금 이 학생에게 열린 설문 차시 (0 = 없음) */
export const pendingNo = (S: Store, c: string, n: number): number => { const st = stateOf(S, c); return st && !isDone(S, c, n) ? Number(st.no) || 1 : 0; };
/** 교사: 반 하나 응답 (한 번 받기 · surveyA 는 실시간 거울 밖 · 교사만 읽기) */
export async function answers(S: Store, c: string): Promise<Saved[]> {
  const v = (S.fetch ? await S.fetch<Record<string, unknown>>(`surveyA/${ck(c)}`).catch(() => null) : S.get<Record<string, unknown>>(`surveyA/${ck(c)}`)) || {};
  return Object.values(v).map(norm).filter((a): a is Saved => !!a);
}
export const doneCount = (S: Store, c: string) => Object.keys(S.get<Record<string, unknown>>(`surveyDone/${ck(c)}`) || {}).length;

type Writer = Store & { trySet?: (path: string, v: unknown) => Promise<boolean> };
/** 보내기 = 응답(시험 계정 · 베타 반은 빼고) → 응답 표시 → 이 기기 표시 · 보상은 부르는 쪽(지갑 · EXP 를 가진 화면)이 줌
 *  excluded = 집계에서 뺄 학생(isExcluded) · 오류 = { user: true } 문장 */
export async function submit(S: Writer, c: string, n: number, a: Answer, no: number, excluded: boolean): Promise<void> {
  const err = check(a); if (err) throw Object.assign(new Error(err), { user: true });
  if (isDone(S, c, n)) throw Object.assign(new Error('이미 응답했어요. 고마워요!'), { user: true });
  if (!stateOf(S, c)) throw Object.assign(new Error('설문이 닫혔어요.'), { user: true });
  const put = async (path: string, v: unknown) => { if (S.trySet) { if (!(await S.trySet(path, v))) throw Object.assign(new Error('보내지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.'), { user: true }); } else S.set(path, v); };
  if (!excluded) await put(`surveyA/${ck(c)}/${rid()}`, clean(a, no));
  await put(donePath(c, n), true);
  try { localStorage.setItem(doneKey(c, n), '1'); } catch { /* 무시 */ }
}
/** 보상 칸 (정식 Grow.add(survey) · Gem.add(survey, free)) — 이미 받았으면 0 */
export function rewardWrites(S: Store, c: string, n: number, at: number): { gem: number; xp: number; writes: [string, unknown][] } {
  const gl = S.get<{ g?: number }>(`gem/${c}/${n}/log/survey`), xl = S.get<{ xp?: number }>(`xp/${c}/${n}/log/survey`);
  const gem = gl ? 0 : REWARD.gem, xp = xl ? 0 : REWARD.xp, writes: [string, unknown][] = [];
  if (gem) writes.push([`gem/${c}/${n}/log/survey`, { g: gem, at, why: '수업 설문' }]);
  if (xp) writes.push([`xp/${c}/${n}/log/survey`, { xp, at, why: '수업 설문' }]);
  return { gem, xp, writes };
}

// ── 교사: 차시 번호 (이 기기 기억 · 정식 「설문 10차시에 열거야 · 내가 수동으로」) ──
const NOKEY = 'citadel-survey-no';
export const pickNo = (def = 10) => { try { return Number(localStorage.getItem(NOKEY)) || def; } catch { return def; } };
export const keepNo = (v: number) => { const n = Math.max(1, Math.min(30, Math.round(Number(v)) || 1)); try { localStorage.setItem(NOKEY, String(n)); } catch { /* 이 기기만 */ } return n; };

// ── 대시보드 「설문」 보기가 읽는 응답 (교사가 그 보기를 열 때 반마다 한 번 받아 둠 · Dash.svelte) ──
let cache: Record<string, Saved[]> = {};
export const surveyCache = () => cache;
export async function loadCache(S: Store, classes: string[]): Promise<Record<string, Saved[]>> {
  const out: Record<string, Saved[]> = {};
  for (const c of classes) { out[c] = await answers(S, c).catch(() => []); if (S.fetch) await S.fetch(`surveyDone/${ck(c)}`).catch(() => null); } // 응답 표시 수도 그 반 덩어리를 받아 둠
  cache = { ...cache, ...out };
  return out;
}
export const setCache = (v: Record<string, Saved[]>) => { cache = v; };
