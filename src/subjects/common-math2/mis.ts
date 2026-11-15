// 🔎 오개념 분류 (정식 lessons/curriculum.js DS.Mis 그대로 옮김 · 📜 2026-11-15 머리 「conc · mis 계산 그대로」)
//   classify(문항, 틀린 답, 형성평가 꼬리표) → 오개념 코드 목록 · 형성평가 꼬리표 = 차시 → 세트(1 원문 · 2 옛 둘째 세트) → 문항 번호 → { 보기: 코드 } · num = 숫자 답 · any = 어떤 오답이든
import type { Question } from '../../model/types';
type Tag = Record<string, unknown> & { num?: Record<number, string>; any?: string };
const BOSS: Record<string, Record<number, (Tag | null)[]>> = {
    'set-02': {
      1: [{ 0: 'M07', 2: 'M07' }, { any: 'M07' }, { 1: 'M15', 2: 'M15', 3: 'M15' }, { 0: 'M05', 2: 'M03' }, { 1: 'M05', 2: 'M03', 3: 'M05' }],
      2: [{ 0: 'M07', 2: 'M07' }, { any: 'M07' }, { 1: 'M15', 2: 'M15', 3: 'M15' }, { 0: 'M05', 1: 'M03' }, { 1: 'M03', 2: 'M15', 3: 'M15' }],
    },
    'set-03': {
      1: [null, { 0: 'M01', 1: 'M01', 2: 'M03' }, null, null, { num: { 4: 'M04', 2: 'M03' } }, { any: 'M06' }, null],
      2: [null, { 0: 'M01', 2: 'M03', 3: 'M04' }, null, null, { num: { 4: 'M04', 2: 'M03' } }, { any: 'M06' }, null],
    },
    'set-04': {
      1: [{ 0: 'M08', 1: 'M08', 3: 'M08' }, { 0: 'M08', 2: 'M08' }, { num: { 11: 'M09' } }, { 0: 'M08' }, { 1: 'M08', 2: 'M08' }, null],
      2: [{ 0: 'M08', 1: 'M08', 2: 'M08' }, { 0: 'M08', 1: 'M08' }, { num: { 11: 'M09' } }, { 1: 'M08' }, { 0: 'M08', 2: 'M08' }, null],
    },
    'set-05': {
      1: [{ any: 'M16' }, { any: 'M08' }, { any: 'M16' }, { any: 'M10' }, { 0: 'M10', 1: 'M08', 2: 'M10' }, { 0: 'M10', 2: 'M08', 3: 'M10' }], // v4: 6문항
      2: [{ any: 'M16' }, { any: 'M08' }, { any: 'M16' }, { any: 'M10' }, { 1: 'M10', 2: 'M08', 3: 'M10' }, { 0: 'M10', 1: 'M08', 3: 'M10' }],
    },
    'set-06': {
      // v3 (2026-11-05): 드모르간 · n(Aᶜ) · 04 n(A ∩ B) · 05⑷ A − B · 06 서로소 · 10 n(Aᶜ ∩ Bᶜ)
      1: [{ any: 'M11' }, { num: { 7: 'M10', 27: 'M10' } }, { num: { 41: 'M09' }, any: 'M09' }, { any: 'M10' }, { any: 'M03' }, { num: { 10: 'M11' }, any: 'M09' }],
      2: [{ any: 'M11' }, { any: 'M10' }, { any: 'M09' }, { any: 'M10' }, { any: 'M03' }, { any: 'M09' }],
    },
  };
const ELEM = ['∈', '∉'], SUB = ['⊂', '⊄'], EQ = ['=', '≠'];
const isPow2 = (n: number) => n >= 4 && Number.isInteger(Math.log2(n));
const key = (s: unknown) => (Array.isArray(s) ? [...s].map(Number).sort((a, b) => a - b).join(',') : '');
export const bossTag = (lid: string, set: number, i: number): Tag | null => BOSS[lid]?.[set]?.[i] ?? null;
export function classify(q: Question | null, given: unknown, tag?: Tag | null): string[] {
  if (!q || given == null) return [];
  const out = new Set<string>(), a = q as unknown as Record<string, unknown>;
  if (tag) {
    if (q.type === 'number' && tag.num && tag.num[Number(given)]) out.add(tag.num[Number(given)]!);
    else if (q.type === 'choice' && typeof tag[String(given)] === 'string') out.add(tag[String(given)] as string);
    if (!out.size && tag.any) out.add(tag.any);
  }
  if (q.type === 'blanks') ((a.items as { answer: string }[]) || []).forEach((it, k) => {
    const g = (given as string[] | undefined)?.[k], ans = it.answer; if (g == null || g === ans) return;
    if ((SUB.includes(ans) && ELEM.includes(g)) || (ELEM.includes(ans) && SUB.includes(g))) out.add('M01');
    else if (SUB.includes(ans) && SUB.includes(g)) out.add('M02');
    else if (EQ.includes(ans) && EQ.includes(g)) out.add('M06');
  });
  if (q.type === 'subsets') {
    const keys = ((given as unknown[]) || []).map(key);
    if (!keys.includes('')) out.add('M03');
    if (!keys.includes(key(a.base))) out.add('M04');
  }
  const chk = a.check as { base?: number[]; options?: number[][] } | undefined;
  if (q.type === 'multi' && chk?.base && chk.options) {
    const pick = new Set(((given as unknown[]) || []).map(Number)), ans = new Set(((a.answer as unknown[]) || []).map(Number)), base = chk.base;
    chk.options.forEach((o, j) => {
      if (ans.has(j) && !pick.has(j) && !o.length) out.add('M03');
      if (ans.has(j) && !pick.has(j) && o.length === base.length) out.add('M04');
      if (pick.has(j) && !ans.has(j) && o.some((x) => !base.includes(x))) out.add('M02');
    });
  }
  if (q.type === 'number' && !out.size) {
    const ans = Number(a.answer), g = Number(given);
    if ((isPow2(ans) && g === ans - 1) || (isPow2(ans + 1) && g === ans + 1)) out.add('M04');
  }
  return [...out];
}
/** 누적: acc[코드] = [틀린 횟수, 바로잡은 횟수] */
export function addMis(acc: Record<string, [number, number]>, codes: string[], fixed: boolean) { for (const c of codes) { const v = (acc[c] ||= [0, 0]); v[0]++; if (fixed) v[1]++; } return acc; }
