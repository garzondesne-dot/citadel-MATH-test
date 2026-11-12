import type { DungeonProfile } from './types';

// 던전 「다른 점 표」 값 (설계서 5절). 표에 없는 차이 = 버그.
// 값의 출처 = 정식 코드 (#101 조사): model.js RETRIES=3 · actions.js solve 60 · test.js solve 5 · TEST_GEM 9999 · TEST_SCROLL 30
export const PROFILES: Record<DungeonProfile['key'], DungeonProfile> = {
  class: {
    key: 'class', label: '📚 차시 던전(수업)', players: 'class', concept: true,
    retries: 3, healMax: 2, bossTries: 4, pct: null, scoutSec: 60, thinkSec: 5, timeLimit: true,
    reward: { gem: 'earn', scroll: 'earn' }, storage: 'server',
  },
  // 📋 게시판 던전 (#143 · 허수아비 대신): 개념 없이 문제 → 형성평가 · 숫자 바뀐 판 · 기회 = 하트 2(첫 시도 + 숫자 바꿔 한 번) · 정찰 없음 · 체력 = 소문제 수 · 시간 = 소문제 × 90초(board.ts)
  board: {
    key: 'board', label: '📋 게시판 던전', players: { fixed: 1 }, concept: false,
    retries: 1, healMax: 0, bossTries: 2, pct: 100, scoutSec: 0, thinkSec: 5, timeLimit: false,
    reward: { gem: 'earn', scroll: 'earn' }, storage: 'memory',
  },
  test: {
    key: 'test', label: '🧪 테스트 모드', players: 'class', concept: true,
    retries: 3, healMax: 2, bossTries: 4, pct: null, scoutSec: 5, thinkSec: 5, timeLimit: false,
    reward: { gem: 9999, scroll: 30 }, storage: 'device',
  },
};

/** 다른 점 표 → 방 규칙 (방을 만들 때 한 번) */
export const rulesOf = (p: DungeonProfile) => ({
  profile: p.key, retries: p.retries, healMax: p.healMax, bossTries: p.bossTries, solve: p.scoutSec, think: p.thinkSec, ...(p.pct != null ? { pct: p.pct } : {}),
});
