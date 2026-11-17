import type { LessonPack, Question } from '../model/types';
import { makeRng } from './rng';
import { getBossGen, getChainGen, getGen } from './registry';

// 차시 팩 → 문항 만들기. 정식 차시 파일의 items(id, seed, attempt) 와 같은 시드 규칙:
//   난수 = Rng(`${seed}|${몬스터}|${판}`) · seed = `${방코드}|${학생}` (raid.ts seedOf)
//   보스 = Rng(`${seed}|boss|${문항}|${시도}`) (정식 bossItem)
// 같은 (팩 · 칸 · 시드 · 판)은 늘 같은 문항 → 한 번 만든 것은 다시 씀 (시계가 돌 때마다 다시 만들지 않게 · 정식 bossMade 와 같은 까닭)
const memo = new Map<string, Question[]>();
/** 📦 같은 id 의 팩을 다시 올리면(검사 · 미리 보기) 지난 판으로 만든 문항을 지움 */
export const forget = (id: string): void => { for (const k of [...memo.keys()]) if (k.startsWith(`${id}|`)) memo.delete(k); };
const remember = (k: string, make: () => Question[]): Question[] => {
  let v = memo.get(k);
  if (!v) {
    if (memo.size > 4000) memo.clear();
    v = make();
    memo.set(k, v);
  }
  return v;
};

/** 🔢 소문제 번호 겹침 정리 (🐞 머리 🔨 2026-11-14 「(1)(2)(3)(3)」): 학습지 한 번호에 소문제가 둘 이상이면(★ 칸만 남긴 결과) 「(3) ①」「(3) ②」 · 학생 폰 · TV · 교사 화면 모두 이 문항을 씀 */
const CIRC = '①②③④⑤⑥⑦⑧⑨';
export function relabel(qs: Question[]): Question[] {
  const lab = (q: Question) => /^\((\d+)\)\s/.exec(q?.question ?? '')?.[1] ?? null;
  const n = new Map<string, number>(); qs.forEach((q) => { const l = lab(q); if (l) n.set(l, (n.get(l) || 0) + 1); });
  if (![...n.values()].some((c) => c > 1)) return qs;
  const seen = new Map<string, number>();
  return qs.map((q) => { const l = lab(q); if (!l || (n.get(l) || 0) < 2) return q; const k = seen.get(l) || 0; seen.set(l, k + 1); return { ...q, question: q.question.replace(/^\((\d+)\)\s/, `(${l}) ${CIRC[k] ?? k + 1} `) } as Question; });
}

export function items(L: LessonPack, mid: string, seed: string, variant: number): Question[] {
  const m = L.monsters[mid];
  if (!m) return [];
  return remember(`${L.id}|${mid}|${seed}|${variant}`, () => fresh(L, m, mid, seed, variant));
}
/** 생성기 그대로의 문항 (다시 뽑기 전 · 정식 출력과 같은지 시험할 때) */
export function baseItems(L: LessonPack, mid: string, seed: string, variant: number): Question[] {
  const m = L.monsters[mid];
  return m ? relabel(itemsRaw(L, m, mid, seed, variant)) : [];
}
/** 🐞 11/17 ⓓ 「한 번 더 했는데 문제가 안 바뀌어요」(선생님 A): 생성기 판이 바로 앞 판과 같은 소문제 = 다른 난수로 다시 뽑음(최대 8번 · 정해진 순서라 어느 기기에서나 같음)
 *  판 0 (교과서 · first) · 엑셀 차시(pool) = 그대로 */
const sig = (q: unknown) => JSON.stringify(q, (k, v) => (k === 'say' || k === 'why' ? undefined : v));
function fresh(L: LessonPack, m: LessonPack['monsters'][string], mid: string, seed: string, variant: number): Question[] {
  const raw = relabel(itemsRaw(L, m, mid, seed, variant));
  if (variant <= 0 || !('gen' in m.retry)) return raw;
  const prev = items(L, mid, seed, variant - 1).map(sig);
  if (!raw.some((q, i) => sig(q) === prev[i])) return raw;
  const gen = getGen(m.retry.gen), out = raw.slice();
  out.forEach((_, i) => {
    for (let k = 1; k <= 8 && sig(out[i]) === prev[i]; k++) { const alt = relabel(gen(variant, makeRng(`${seed}|${mid}|${variant}|alt${k}`), m.retry.params))[i]; if (alt) out[i] = alt; }
  });
  return out;
}
function itemsRaw(L: LessonPack, m: LessonPack['monsters'][string], mid: string, seed: string, variant: number): Question[] {
  {
    const rng = makeRng(`${seed}|${mid}|${variant}`);
    if (variant === 0 && m.first) return m.first;
    if ('gen' in m.retry) return getGen(m.retry.gen)(variant, rng, m.retry.params);
    // 엑셀 차시: 판 0 = first(없으면 pool[0]) · 판 1~ = pool 에서 차례로
    const pool = m.retry.pool;
    if (!pool.length) return m.first || [];
    const k = m.first ? (variant - 1) % pool.length : variant % pool.length;
    return pool[k] as Question[];
  }
}

/** ⚔ 소레이드 단계 문항 (판 pass · 정식 L.chainItems: 난수 = Rng(`${seed}|${mid}|chain|${pass}`)) */
export function chainItems(L: LessonPack, mid: string, seed: string, pass: number): Question[] {
  const c = L.monsters[mid]?.chain;
  if (!c) return [];
  if ('pool' in c) return c.pool.length ? (c.pool[pass % c.pool.length] as Question[]) : []; // 미리 쓴 판 (#135 ③)
  return remember(`${L.id}|chain|${mid}|${seed}|${pass}`, () => getChainGen(c.gen)(pass, makeRng(`${seed}|${mid}|chain|${pass}`), seed));
}

/** 보스 문항 i 의 시도 a (시도 0 = 원문 · 모든 학생 같음) */
export function bossItem(L: LessonPack, seed: string, i: number, a: number): Question | null {
  const b = L.boss;
  if (!b) return null;
  i = b.pick ? (b.pick[i] ?? i) : i + (b.first || 0); // #149 나눈 형성평가 = 원래 번호 · #27 🎯 고른 문항 = 원래 번호
  const k = a ? `${L.id}|boss|${seed}|${i}|${a}` : `${L.id}|boss|0|${i}`;
  if (!b.gen) { // 미리 쓴 판 (#135 ③): 시도 0 = 세트 1 · 1~ = pool 차례로
    const first = b.sets?.['1']?.[i], ps = b.pool?.[i] || [];
    if (!a) return first ?? ps[0] ?? null;
    return ps.length ? (ps[(a - 1) % ps.length] as Question) : first ?? null;
  }
  const gen = b.gen;
  return (remember(k, () => [getBossGen(gen)(i, a, makeRng(`${seed}|boss|${i}|${a}`))])[0]) ?? null;
}

/** 팩 확인: 모든 생성기가 등록돼 있고 판 0 이 문항을 만드는지 */
export function validate(L: LessonPack): string[] {
  const err: string[] = [];
  if (L.v !== 1) err.push('팩 판 v 는 1');
  for (const s of L.steps) {
    if (s.kind === 'monster' && !s.later && !L.monsters[s.id]) err.push(`단계 ${s.id} 의 몬스터 없음`);
    if (s.kind === 'boss' && !L.boss) err.push('보스 단계가 있는데 boss 없음');
  }
  for (const [id] of Object.entries(L.monsters)) {
    try {
      if (!items(L, id, 'check', 0).length) err.push(`${id}: 문항 0개`);
      if (L.monsters[id]?.chain && chainItems(L, id, 'check', 0).length < 2) err.push(`${id}: 소레이드 단계 2개 미만`);
    } catch (e) {
      err.push(`${id}: ${(e as Error).message}`);
    }
  }
  if (L.boss) {
    try {
      for (let i = 0; i < L.boss.items; i++) if (!bossItem(L, 'check', i, 0)) err.push(`보스 ${i + 1}번 없음`);
    } catch (e) {
      err.push(`보스: ${(e as Error).message}`);
    }
  }
  return err;
}
