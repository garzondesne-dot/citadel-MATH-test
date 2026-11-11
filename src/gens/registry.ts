import type { Question } from '../model/types';
import type { Rng } from '../engine/rng';
import { set06boss, set06m1, set06m2, set06m3 } from './set06';

// 이름 등록 생성기 — 차시 팩(JSON)에는 이름 · params 만 적고, 코드는 여기에만 (팩에 코드를 넣지 못함 · 설계서 6절 보안)
export type Generator = (variant: number, rng: Rng, params?: Record<string, unknown>) => Question[];
export type BossGenerator = (i: number, attempt: number, rng: Rng) => Question;

const GENS: Record<string, Generator> = {
  'set06.m1': set06m1,
  'set06.m2': set06m2,
  'set06.m3': set06m3,
};
const BOSS_GENS: Record<string, BossGenerator> = {
  'set06.boss': set06boss,
};

export function getGen(name: string): Generator {
  const g = GENS[name];
  if (!g) throw new Error(`등록되지 않은 생성기: ${name}`);
  return g;
}
export function getBossGen(name: string): BossGenerator {
  const g = BOSS_GENS[name];
  if (!g) throw new Error(`등록되지 않은 보스 생성기: ${name}`);
  return g;
}
export const genNames = (): string[] => [...Object.keys(GENS), ...Object.keys(BOSS_GENS)];
