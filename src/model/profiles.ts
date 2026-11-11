import type { DungeonProfile } from './types';

// 던전 「다른 점 표」 값 (설계서 5절). 표에 없는 차이 = 버그.
// 값의 출처 = 정식 코드 (#101 조사): model.js RETRIES=3 · actions.js solve 60 · test.js solve 5 · TEST_GEM 9999 · TEST_SCROLL 30
export const PROFILES: Record<DungeonProfile['key'], DungeonProfile> = {
  class: {
    key: 'class', label: '📚 차시 던전(수업)', players: 'class', concept: true,
    retries: 3, pct: null, scoutSec: 60, timeLimit: true,
    reward: { gem: 'earn', scroll: 'earn' }, storage: 'server',
  },
  test: {
    key: 'test', label: '🧪 테스트 모드', players: 'class', concept: true,
    retries: 3, pct: null, scoutSec: 5, timeLimit: false,
    reward: { gem: 9999, scroll: 30 }, storage: 'device',
  },
};
