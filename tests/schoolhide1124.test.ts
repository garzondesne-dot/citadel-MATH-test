// 🏫 학교판 숨김 (📜 11/24 🔨 #12 · DECISIONS 2b6a94b): 🥏 알까기 = 우리 학교(정식 · 베타)만 · 학교판(VITE_SCHOOL)엔 쉼터 목록 · ⚙ 기능 목록 모두 안 보임
import { describe, expect, it } from 'vitest';
import { FEATS, feat, schoolHides } from '../src/school/features.svelte';
import { gamesOn, GAMES } from '../src/rest/run';

describe('🏫 학교판 알까기 숨김', () => {
  it('학교판 = 🥏 알까기 · 🏁 땅따먹기 · 😆 아재 퀴즈 숨김 · 다른 놀이는 그대로', () => {
    for (const id of ['rest-alkkagi', 'rest-landgrab', 'rest-ajae'] as const) expect(schoolHides(id, true)).toBe(true); // 📜 #13 더하기 = 땅따먹기 · 아재 퀴즈도
    for (const id of ['rest-balance', 'rest-flip', 'rest-ox', 'rest-nunchi'] as const) expect(schoolHides(id, true)).toBe(false);
  });
  it('우리 학교(이 빌드) = 🥏 알까기 있음 · 쉼터 목록 맨 뒤', () => {
    expect(schoolHides('rest-alkkagi', false)).toBe(false);
    expect(FEATS.some((f) => f.id === 'rest-alkkagi')).toBe(true);
    expect(GAMES.map((g) => g.k)).toContain('ak'); // 쉼터 목록 맨 뒤 (선생님이 엶)
    expect(GAMES.at(-1)?.k).toBe('ak');
    void feat; void gamesOn;
  });
});
