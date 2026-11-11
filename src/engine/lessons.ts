import type { LessonPack, Question } from '../model/types';
import { makeRng } from './rng';
import { getBossGen, getGen } from '../gens/registry';

// 차시 팩 → 문항 만들기. 정식 차시 파일의 items(id, seed, attempt) 와 같은 시드 규칙:
//   난수 = Rng(`${seed}|${몬스터}|${판}`) · seed = `${방코드}|${학생}` (raid.ts seedOf)
//   보스 = Rng(`${seed}|boss|${문항}|${시도}`) (정식 bossItem)
// 같은 (팩 · 칸 · 시드 · 판)은 늘 같은 문항 → 한 번 만든 것은 다시 씀 (시계가 돌 때마다 다시 만들지 않게 · 정식 bossMade 와 같은 까닭)
const memo = new Map<string, Question[]>();
const remember = (k: string, make: () => Question[]): Question[] => {
  let v = memo.get(k);
  if (!v) {
    if (memo.size > 4000) memo.clear();
    v = make();
    memo.set(k, v);
  }
  return v;
};

export function items(L: LessonPack, mid: string, seed: string, variant: number): Question[] {
  const m = L.monsters[mid];
  if (!m) return [];
  return remember(`${L.id}|${mid}|${seed}|${variant}`, () => {
    const rng = makeRng(`${seed}|${mid}|${variant}`);
    if (variant === 0 && m.first) return m.first;
    if ('gen' in m.retry) return getGen(m.retry.gen)(variant, rng, m.retry.params);
    // 엑셀 차시: 판 0 = first(없으면 pool[0]) · 판 1~ = pool 에서 차례로
    const pool = m.retry.pool;
    if (!pool.length) return m.first || [];
    const k = m.first ? (variant - 1) % pool.length : variant % pool.length;
    return pool[k] as Question[];
  });
}

/** 보스 문항 i 의 시도 a (시도 0 = 원문 · 모든 학생 같음) */
export function bossItem(L: LessonPack, seed: string, i: number, a: number): Question | null {
  const b = L.boss;
  if (!b) return null;
  const k = a ? `${L.id}|boss|${seed}|${i}|${a}` : `${L.id}|boss|0|${i}`;
  return (remember(k, () => [getBossGen(b.gen)(i, a, makeRng(`${seed}|boss|${i}|${a}`))])[0]) ?? null;
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
