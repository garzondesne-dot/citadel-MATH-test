// 🚩 💎 급증 (DECISIONS 「💎 자기 지갑 조작 = A + 📊 급증 표시」)
import { describe, expect, it } from 'vitest';
import { check, snapOf, TOL } from '../src/school/gemwatch';

const H = 3600e3;
describe('🚩 💎 급증', () => {
  const prev = snapOf({ total: 100, day: { d1: 40 } }, 0);
  it('한도 안에서 번 것(day 늘어남) = 🚩 없음', () => {
    expect(check(prev, { total: 190, day: { d1: 40, d2: 90 } }, null, H)).toBeNull();
  });
  it('선생님 선물 · 연속 참여 · 레벨 log · 받은 선물 = 설명됨', () => {
    expect(check(prev, { total: 160, day: { d1: 40 }, log: { teacher_9: { g: 50, at: 10 } } }, null, H)).toBeNull();
    expect(check(prev, { total: 160, day: { d1: 40 } }, { fun1: { g: 50, at: 10, got: true } }, H)).toBeNull();
  });
  it('기록 없이 늘어남 = 🚩 (작은 몫 TOL 까지는 봐줌)', () => {
    expect(check(prev, { total: 100 + TOL, day: { d1: 40 } }, null, H)).toBeNull();
    const f = check(prev, { total: 600, day: { d1: 40 } }, null, H)!;
    expect(f.extra).toBe(500 - TOL); expect(f.from).toBe(100); expect(f.to).toBe(600);
  });
  it('📜 11/19 하루 한도 없음 = 하루 200 을 벌어도 🚩 없음', () => {
    expect(check(prev, { total: 300, day: { d1: 40, d2: 200 } }, null, H)).toBeNull();
  });
  it('쓴 것(💎 줄어듦) = 🚩 없음', () => {
    expect(check(prev, { total: 10, day: { d1: 40 } }, null, H)).toBeNull();
  });
});
