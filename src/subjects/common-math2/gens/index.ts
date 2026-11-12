import type { BossGenerator, ChainGenerator, Generator } from '../../../model/subject';
import { chainOf, set06boss, set06m1, set06m2, set06m3, unitMake } from './set06';
import { OFFICIAL_BOSS, OFFICIAL_CHAIN, OFFICIAL_GENS } from './official';

// 공통수학2 이름 등록 생성기 — 차시 팩(JSON)에는 이름 · params 만 · 코드는 여기에만 (엔진 = engine/registry.ts 가 SUBJ.generators 로 찾음)

export const GENS: Record<string, Generator> = {
  'set06.m1': set06m1,
  'set06.m2': set06m2,
  'set06.m3': set06m3,
  'set06.u4': unitMake('u4'),
  'set06.u5': unitMake('u5'),
  'set06.u6': unitMake('u6'),
  'set06.u7': unitMake('u7'),
  ...OFFICIAL_GENS, // 🧩 #132 정식 차시 원문 생성기 (tools/pack-from-release 가 만듦)
};
export const CHAIN_GENS: Record<string, ChainGenerator> = {
  'set06.u4': chainOf('u4'),
  'set06.u5': chainOf('u5'),
  'set06.u6': chainOf('u6'),
  'set06.u7': chainOf('u7'),
  ...OFFICIAL_CHAIN,
};

export const BOSS_GENS: Record<string, BossGenerator> = {
  'set06.boss': set06boss,
  ...OFFICIAL_BOSS,
};
