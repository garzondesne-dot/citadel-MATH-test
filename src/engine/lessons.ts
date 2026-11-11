import type { LessonPack, Question } from '../model/types';
import { makeRng } from './rng';
import { getGen } from '../gens/registry';

// 차시 팩 → 문항 만들기. 정식 차시 파일의 items(id, seed, attempt) 와 같은 시드 규칙:
//   난수 = Rng(`${seed}|${몬스터}|${판}`) · seed = `${방코드}|${학생}` (raid.ts seedOf)
export function items(L: LessonPack, mid: string, seed: string, variant: number): Question[] {
  const m = L.monsters[mid];
  if (!m) return [];
  const rng = makeRng(`${seed}|${mid}|${variant}`);
  if (variant === 0 && m.first) return m.first;
  if ('gen' in m.retry) return getGen(m.retry.gen)(variant, rng, m.retry.params);
  // 엑셀 차시: 판 0 = first(없으면 pool[0]) · 판 1~ = pool 에서 차례로
  const pool = m.retry.pool;
  if (!pool.length) return m.first || [];
  const k = m.first ? (variant - 1) % pool.length : variant % pool.length;
  return pool[k] as Question[];
}

/** 팩 확인: 모든 생성기가 등록돼 있고 판 0 이 문항을 만드는지 */
export function validate(L: LessonPack): string[] {
  const err: string[] = [];
  if (L.v !== 1) err.push('팩 판 v 는 1');
  for (const s of L.steps) if ((s.kind === 'monster') && !L.monsters[s.id]) err.push(`단계 ${s.id} 의 몬스터 없음`);
  for (const [id] of Object.entries(L.monsters)) {
    try {
      if (!items(L, id, 'check', 0).length) err.push(`${id}: 문항 0개`);
    } catch (e) {
      err.push(`${id}: ${(e as Error).message}`);
    }
  }
  return err;
}
