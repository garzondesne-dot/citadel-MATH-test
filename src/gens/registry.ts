import type { Question } from '../model/types';
import type { Rng } from '../engine/rng';
import { set06m1 } from './set06';

// 이름 등록 생성기 — 차시 팩(JSON)에는 이름 · params 만 적고, 코드는 여기에만 (팩에 코드를 넣지 못함 · 설계서 6절 보안)
export type Generator = (variant: number, rng: Rng, params?: Record<string, unknown>) => Question[];

const GENS: Record<string, Generator> = {
  'set06.m1': set06m1,
};

export function getGen(name: string): Generator {
  const g = GENS[name];
  if (!g) throw new Error(`등록되지 않은 생성기: ${name}`);
  return g;
}
export const genNames = (): string[] => Object.keys(GENS);
