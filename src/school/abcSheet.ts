// 🚪 던전 문 1차 · 📄 기말 대비 답안지 (📜 2026-11-25 선생님 · 🌊 설계 방 DESIGN-v1 13절 · 머리 🔨 「던전 문 1차」)
//   종이로 세트를 풀고 → 폰에 답만 입력(7칸 · ① ~ ④) → 제출(세트마다 1번) → 7 / 7 = 통과(던전 문에 기여)
//   하나라도 틀리면 = 틀린 번호만(정답은 안 알려 줌) → 다음 세트 A → B → C
//   C 뒤에도 못 통과 = C 의 틀린 문항을 종이에서 다시 풀어 그 번호만 다시 입력 → 모두 맞으면 통과 (틀리면 남은 번호로 또 · 몇 번이든)
//   열림 = 선생님이 그 반을 열어 둔 동안만 (school/abc/open/{반} = true) · 정답표 = school/abc/key/{A|B|C} = '1234123'(7자리 · 1 ~ 4) · 코드에 정답 없음
//   기록 = bonus/{반}/{번호}/abc (학생 쓰기 = 내 칸 · 규칙 그대로) · 🧪 테스트 · 교사 = 이 기기에만
import type { Store } from '../model/types';
import { CLASSES, isBeta, isExcluded, roster } from './school';
const bonusBase = (cls: string, num: number) => `bonus/${(cls || 'me').replace(/[.#$/[\]]/g, '_')}/${num || 0}`; // castle.ts 와 같은 꼴 (무거운 성채 모듈을 안 불러옴)

export const ABC_PATH = 'school/abc';
export const ABC_SETS = ['A', 'B', 'C'] as const;
export type AbcSet = (typeof ABC_SETS)[number];
export const ABC_N = 7;
/** 다시 입력을 몇 번 하면 「선생님께 손들기」 한 줄을 보여 줄까 */
export const ABC_HELP_AT = 3;

/** 낸 답 한 번: g = 낸 답('1' ~ '4' · 빈칸 '0') · nums = 문항 번호(1부터) · wrong = 틀린 번호 */
export interface AbcTry { nums: number[]; g: string; wrong: number[]; at: number }
export interface AbcRec { A?: AbcTry; B?: AbcTry; C?: AbcTry; /** C 뒤 다시 입력 (차례대로) */ R?: AbcTry[]; /** 통과 */ pass?: { at: number; by: AbcSet | 'R' } }
/** 지금 할 것 */
export type AbcStep = { kind: 'done'; by: AbcSet | 'R'; at: number } | { kind: 'set'; set: AbcSet; nums: number[]; prev: AbcTry | null } | { kind: 'redo'; nums: number[]; round: number; prev: AbcTry };

export const keyOk = (k: unknown): k is string => typeof k === 'string' && /^[1-4]{7}$/.test(k);
/** 정답표 글(띄어쓰기 · 동그라미 숫자 · 쉼표 허용) → '1234123' · 틀린 꼴 = '' */
export function normKey(s: string): string {
  const t = String(s ?? '').replace(/[①②③④]/g, (c) => String('①②③④'.indexOf(c) + 1)).replace(/[\s,·./-]/g, '');
  return keyOk(t) ? t : '';
}
const all = () => Array.from({ length: ABC_N }, (_, i) => i + 1);

/** 서버 배열 · 빈칸이 빠진 꼴도 받기 */
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]).filter((x) => x != null) : v && typeof v === 'object' ? (Object.values(v) as T[]) : []);
const tryOf = (v: unknown): AbcTry | null => { if (!v || typeof v !== 'object') return null; const o = v as Partial<AbcTry>; return { nums: arr<number>(o.nums).map(Number), g: String(o.g ?? ''), wrong: arr<number>(o.wrong).map(Number), at: Number(o.at) || 0 }; };

/** 지금 할 일 (기록 → 다음 세트 · 다시 입력 · 끝) */
export function abcStep(rec0: AbcRec | null | undefined): AbcStep {
  const rec = rec0 || {};
  if (rec.pass) return { kind: 'done', by: rec.pass.by, at: Number(rec.pass.at) || 0 };
  let prev: AbcTry | null = null;
  for (const s of ABC_SETS) { const t = tryOf(rec[s]); if (!t) return { kind: 'set', set: s, nums: all(), prev }; prev = t; }
  const R = arr<AbcTry>(rec.R).map(tryOf).filter((x): x is AbcTry => !!x), last = R[R.length - 1] ?? (prev as AbcTry);
  return { kind: 'redo', nums: last.wrong.slice().sort((a, b) => a - b), round: R.length + 1, prev: last };
}

/** 채점: 문항 번호마다 낸 답(1 ~ 4 · 0 = 빈칸) vs 정답표 */
export function gradeAbc(key: string, nums: number[], given: number[]): { wrong: number[]; ok: number } {
  const wrong = nums.filter((n, i) => Number(key[n - 1]) !== (given[i] || 0));
  return { wrong, ok: nums.length - wrong.length };
}

/** 낸 답을 기록에 더함 (지금 단계 그대로 · 통과면 pass) */
export function submitAbc(rec0: AbcRec | null | undefined, key: string, given: number[], at: number): { rec: AbcRec; step: AbcStep; wrong: number[]; ok: number; total: number } {
  const rec: AbcRec = { ...(rec0 || {}) }, st = abcStep(rec);
  if (st.kind === 'done') return { rec, step: st, wrong: [], ok: 0, total: 0 };
  const { wrong, ok } = gradeAbc(key, st.nums, given), t: AbcTry = { nums: st.nums, g: given.map((x) => String(x || 0)).join(''), wrong, at };
  if (st.kind === 'set') rec[st.set] = t;
  else rec.R = [...arr<AbcTry>(rec.R), t];
  if (!wrong.length) rec.pass = { at, by: st.kind === 'set' ? st.set : 'R' };
  return { rec, step: abcStep(rec), wrong, ok, total: st.nums.length };
}

/** 이 단계 채점에 쓰는 정답표 (다시 입력 = C 정답표) */
export const keyFor = (st: AbcStep, keys: Partial<Record<AbcSet, string>> | null | undefined): string => {
  const k = st.kind === 'set' ? keys?.[st.set] : st.kind === 'redo' ? keys?.C : '';
  return keyOk(k) ? k : '';
};

/** 서버 칸 읽기 */
export const abcKeys = (S: Pick<Store, 'get'>): Partial<Record<AbcSet, string>> => S.get<Partial<Record<AbcSet, string>>>(`${ABC_PATH}/key`) || {};
export const abcOpen = (S: Pick<Store, 'get'>, cls: string): boolean => S.get<boolean>(`${ABC_PATH}/open/${cls.replace(/[.#$/[\]]/g, '_')}`) === true;
export const abcOpenAny = (S: Pick<Store, 'get'>): string[] => Object.entries(S.get<Record<string, boolean>>(`${ABC_PATH}/open`) || {}).filter(([, v]) => v === true).map(([c]) => c);
export const abcRecPath = (base: string) => `${base}/abc`;

/** 🚪 반마다 통과 수 (교사 · 교사 로그인 TV = 모든 학생 기록을 읽음) · 시험 계정 빼고 · beta = 🧪 시험 반(전체 합에서 빠짐) */
export interface AbcTally { cls: string; pass: number; total: number; beta: boolean; open: boolean }
export function abcTally(S: Store, classes: readonly string[] = CLASSES): AbcTally[] {
  const has = (c: string) => ['roster', 'rosterMask', 'school/roster'].some((r) => { const v = S.get<Record<string, unknown>>(`${r}/${c}`); return !!v && typeof v === 'object' && Object.keys(v).length > 0; }); // 명단을 올린 반만 (가짜 이름 반 = 0명으로 안 셈)
  return classes.filter(has).map((cls) => {
    const st = roster(cls, S).filter((p) => !isExcluded(S, cls, p.num) || isBeta(S, cls));
    const pass = st.filter((p) => abcStep(S.get<AbcRec>(abcRecPath(bonusBase(cls, p.num)))).kind === 'done').length;
    return { cls, pass, total: st.length, beta: isBeta(S, cls), open: abcOpen(S, cls) };
  }).filter((x) => x.total > 0);
}
/** 학교 전체 (🧪 시험 반 빼고) */
export const abcSum = (t: AbcTally[]) => t.filter((x) => !x.beta).reduce((a, x) => ({ pass: a.pass + x.pass, total: a.total + x.total }), { pass: 0, total: 0 });

/** ✏ 글 한 곳 */
export const ABC_TXT = {
  name: '📄 기말 대비 답안지',
  door: '🚪 무지의 마왕으로 가는 던전 문',
  intro: '종이 학습지로 푼 답을 그대로 골라요 · 세트마다 한 번만 낼 수 있어요',
  pass: '7 / 7 · 통과! 던전 문에 돌을 쌓았어요',
  fail: (ok: number, n: number) => `${ok} / ${n} · 아직 통과 못 했어요`,
  wrongLine: '틀린 번호 (정답은 종이에서 다시 풀어 봐요)',
  next: (s: AbcSet) => `📄 ${s}세트 답안지 열기`,
  redo: '✏ 틀린 문항만 다시 입력',
  redoHead: (n: number) => `C세트에서 남은 ${n}문항 · 종이에서 다시 풀고 그 번호만 골라요`,
  help: '🙋 막히면 선생님께 손들어요',
  closed: '선생님이 수업에서 열면 들어갈 수 있어요',
  noKey: '아직 정답표가 없어요 · 선생님께 말해 주세요',
  after: '이제 🏰 성채 던전을 자유롭게 풀어요',
} as const;
