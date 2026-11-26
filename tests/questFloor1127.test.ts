import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { questFloorOk, QUEST_FLOORS } from '../src/school/quest';

// 📜 2026-11-27 선생님 「1~3층만」 — 출제 바탕 방 = 성채 1~3층 (진도로 4층이 열린 반도 같음)
describe('✏ 출제 바탕 방 = 성채 1~3층만', () => {
  it('1 · 2 · 3층만 됨 · 4층 이상 · 0층은 안 됨', () => {
    expect(QUEST_FLOORS).toBe(3);
    expect([1, 2, 3].every(questFloorOk)).toBe(true);
    expect([0, 4, 5, 9].some(questFloorOk)).toBe(false);
  });
  it('출제 책상 목록이 층 거르기를 씀 (4층이 열린 1-3반 · 1-5반 계정도 1~3층만)', () => {
    const src = readFileSync('src/ui/quest/QuestDesk.svelte', 'utf8');
    expect(src).toMatch(/castles\.list\.filter\(\(x\) => !x\.hide && questFloorOk\(x\.floor\)\)/);
  });
});
