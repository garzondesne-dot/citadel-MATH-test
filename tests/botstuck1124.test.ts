// 🙋 막히는 가상 학생 (📜 11/24 🔨 #11 · DECISIONS 21ba851): 몬스터마다 1 ~ 2명(4명 아래면 1명) · 몬스터마다 같은 줄
import { describe, expect, it } from 'vitest';
import { botId, stuckBots } from '../src/raid/bots';

const ids = (n: number) => Array.from({ length: n }, (_, i) => botId(i));
describe('🙋 막히는 가상 학생', () => {
  it('5명 = 몬스터마다 1 ~ 2명 · 3명 = 1명 · 0명 = 없음', () => {
    for (const m of ['m1', 'm2', 'm3', 'm4', 'u5', 'q07']) { const k = stuckBots(ids(5), m).size; expect(k === 1 || k === 2).toBe(true); expect(stuckBots(ids(3), m).size).toBe(1); }
    expect(stuckBots([], 'm1').size).toBe(0);
  });
  it('같은 몬스터 = 늘 같은 친구 (새로 고침해도) · 몬스터가 바뀌면 다른 친구도 나옴', () => {
    expect([...stuckBots(ids(5), 'm2')]).toEqual([...stuckBots(ids(5), 'm2')]);
    const all = new Set(['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].flatMap((m) => [...stuckBots(ids(5), m)])); expect(all.size).toBeGreaterThan(1);
  });
});
