// 🐞 정찰 초 (📜 2026-11-15 「정찰 50초로 하면 실제로 60」): 리모컨에서 바꾼 정찰 초 = 그 차시 준비 값도 같이 · 게시판(T 방)은 준비 값 안 건드림
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { setSolveSec } from '../src/raid/actions';
describe('🌫 정찰 초 맞추기', () => {
  it('리모컨 ± = 방 + 차시 준비 · 0 ~ 300 · T 방은 준비 그대로', () => {
    const S = memoryStore();
    S.set('rooms/123456/meta/lesson', 'set-06'); setSolveSec(S, '123456', 50);
    expect(S.get('rooms/123456/meta/solve')).toBe(50); expect(S.get('school/prep/set-06/solve')).toBe(50);
    setSolveSec(S, '123456', 999); expect(S.get('rooms/123456/meta/solve')).toBe(300);
    S.set('rooms/Tabc/meta/lesson', 'set-07'); setSolveSec(S, 'Tabc', 20); expect(S.get('school/prep/set-07/solve') ?? null).toBeNull();
  });
});
