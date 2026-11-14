// 🌫 정찰 초 (📜 2026-11-15 「B 추천대로」 = 리모컨 ± 는 그 수업만 · 📋 차시 준비 기본값은 그대로)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { setSolveSec } from '../src/raid/actions';
describe('🌫 정찰 초', () => {
  it('리모컨 ± = 그 수업 방만 · 0 ~ 300 · 차시 준비 값은 안 건드림', () => {
    const S = memoryStore();
    S.set('rooms/123456/meta/lesson', 'set-06'); S.set('school/prep/set-06/solve', 60); setSolveSec(S, '123456', 50);
    expect(S.get('rooms/123456/meta/solve')).toBe(50); expect(S.get('school/prep/set-06/solve')).toBe(60);
    setSolveSec(S, '123456', 999); expect(S.get('rooms/123456/meta/solve')).toBe(300);
  });
});
