import type { BossGenerator, ChainGenerator, Generator } from '../model/subject';
import { SUBJ } from './subject';

// 이름 등록 생성기 찾기 — 차시 팩(JSON)에는 이름만 · 코드는 과목 팩(SUBJ.generators)에 (엔진은 과목을 모름 · #136)
export type { BossGenerator, ChainGenerator, Generator };
export function getGen(name: string): Generator {
  const g = SUBJ.generators.gens[name];
  if (!g) throw new Error(`등록되지 않은 생성기: ${name}`);
  return g;
}
/** ⚔ 소레이드 생성기 (판, 난수, 시드) → 단계 문항들 */
export function getChainGen(name: string): ChainGenerator {
  const g = SUBJ.generators.chains[name];
  if (!g) throw new Error(`등록되지 않은 소레이드 생성기: ${name}`);
  return g;
}
export function getBossGen(name: string): BossGenerator {
  const g = SUBJ.generators.boss[name];
  if (!g) throw new Error(`등록되지 않은 보스 생성기: ${name}`);
  return g;
}
export const genNames = (): string[] => [...Object.keys(SUBJ.generators.gens), ...Object.keys(SUBJ.generators.boss), ...Object.keys(SUBJ.generators.chains).map((k) => `chain:${k}`)];
