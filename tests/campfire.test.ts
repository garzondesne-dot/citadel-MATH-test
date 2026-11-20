// 🔥 모닥불 친구 (📜 2026-11-20) — 고르는 순서 · 게시판 짝 · 오늘 한 줄 · 받은 인사 · 띠 글
import { describe, expect, it } from 'vitest';
import { freshHi, hiLine, matesOf, pickFriends, todayLine, type Cand } from '../src/school/campfire';

const C = (num: number, o: Partial<Cand> = {}): Cand => ({ num, hero: num % 30, title: 'none', fx: '', ...o });
describe('🔥 고르기', () => {
  it('나 빼고 3명 · 최근 같이 한 친구 → 오늘 온 친구 → 그 밖', () => {
    const cs = [C(1), C(2, { day: '2026-11-20' }), C(3), C(4, { mate: 100 }), C(5, { mate: 300 }), C(6)];
    const p = pickFriends(cs, 1, '2026-11-20', 7).map((c) => c.num);
    expect(p).toEqual([5, 4, 2]);
  });
  it('같은 묶음 안 = seed 로 섞임 (들어올 때마다 조금씩)', () => {
    const cs = Array.from({ length: 20 }, (_, i) => C(i + 1));
    const a = pickFriends(cs, 1, 'x', 1).map((c) => c.num).join(), b = pickFriends(cs, 1, 'x', 2).map((c) => c.num).join();
    expect(a).not.toBe(b);
    expect(pickFriends(cs, 1, 'x', 1).map((c) => c.num)).not.toContain(1);
  });
  it('친구가 없으면 빈 줄 · 둘이면 둘', () => { expect(pickFriends([C(1)], 1, 'x', 1)).toEqual([]); expect(pickFriends([C(1), C(2), C(3)], 1, 'x', 1)).toHaveLength(2); });
});
describe('🔥 기록', () => {
  it('게시판 짝 = 나와 같은 글에 있던 같은 반 · 다른 반 빼고', () => {
    const posts = { a: { at: 5, mem: { me: { cls: '1-3', num: 1 }, u2: { cls: '1-3', num: 2 }, u9: { cls: '1-4', num: 9 } } }, b: { at: 9, mem: { me: {}, u2: { cls: '1-3', num: 2 } } }, c: { at: 7, mem: { u3: { cls: '1-3', num: 3 } } } };
    expect(matesOf(posts, 'me', '1-3')).toEqual({ 2: 9 });
  });
  it('오늘 한 줄 = 오늘 처음 처치 (성채 eval- · 허수아비 그 밖)', () => {
    const t = Date.parse('2026-11-20T03:00:00Z'), y = Date.parse('2026-11-18T03:00:00Z');
    const bonus = { 'eval-1': { q1: { clear: true, at: t }, q2: { clear: true, at: t } }, 'ex-9': { m1: { clear: true, at: t }, m2: { clear: false, at: t } }, 'ex-8': { m1: { clear: true, at: y } }, board: { p: { at: t } } };
    expect(todayLine(bonus, '2026-11-20')).toBe('성채 2방 · 허수아비 1');
    expect(todayLine({}, '2026-11-20')).toBe('');
  });
  it('받은 인사 = 안 본 것만 · 띠 글', () => {
    const box = { 2: { e: '👋', day: '2026-11-20' }, 3: { e: '🔥', day: '2026-11-20' }, 4: { e: '✨', day: '2026-11-19' } };
    expect(freshHi(box, ['2026-11-20|3']).map((h) => h.from)).toEqual([2, 4]);
    expect(hiLine([{ name: '김*수', e: '👋' }])).toBe('🔥 김*수가 놀러 왔어요! 👋');
    expect(hiLine([{ name: '김*수', e: '👋' }, { name: 'B', e: '🔥' }, { name: 'C', e: '✨' }])).toBe('🔥 김*수 외 2명이 놀러 왔어요! 👋');
  });
});
