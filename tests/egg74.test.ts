import { describe, expect, it } from 'vitest';
import { EGGS, eggHint, eggsFound, fibTap, piMinute, stumpStep } from '../src/school/eggs';
import { CHALS, chalState } from '../src/school/challenges';
import { earnedFrom } from '../src/model/titles';
import { TITLES } from '../src/model/hero';
// 🥚 #74 이스터에그 8개: 찾는 법 셈 · 칭호 · 힌트 · 도전과제 25
const KST = (h: number, m: number) => Date.UTC(2026, 10, 19, h - 9, m, 30);
describe('🥚 #74 이스터에그', () => {
  it('8개 · 칭호가 목록에 있음 · 7 = 허수아비의 친구(도전과제 24 와 같은 칭호)', () => {
    expect(EGGS.length).toBe(8);
    for (const e of EGGS) expect(TITLES.some((t) => t.id === e.title)).toBe(true);
    expect(EGGS.find((e) => e.id === 'e7')!.title).toBe('dummyfriend');
  });
  it('원주율의 달 = KST 오후 3:14 · 1:59 그 1분만', () => {
    expect(piMinute(KST(15, 14))).toBe(true); expect(piMinute(KST(13, 59))).toBe(true);
    expect(piMinute(KST(15, 15))).toBe(false); expect(piMinute(KST(3, 14))).toBe(false); expect(piMinute(KST(14, 13))).toBe(false);
  });
  it('피보나치 불꽃 = 2초 안 간격 8번 연달아 · 끊기면 처음부터', () => {
    let t: number[] = [], hit = false;
    for (let i = 0; i < 7; i++) { const r = fibTap(t, 1000 + i * 1500); t = r.taps; hit = r.hit; }
    expect(hit).toBe(false);
    const r8 = fibTap(t, 1000 + 7 * 1500); expect(r8.hit).toBe(true);
    let u: number[] = []; for (let i = 0; i < 4; i++) u = fibTap(u, i * 1000).taps; u = fibTap(u, 9000).taps; expect(u.length).toBe(1);
  });
  it('넷이 둘러앉기 = 시계 방향 4개 차례(어디서 시작해도) · 거꾸로 = 안 됨', () => {
    let s: number[] = [], hit = false;
    for (const k of [2, 3, 0, 1]) { const r = stumpStep(s, k); s = r.seq; hit = r.hit; }
    expect(hit).toBe(true);
    s = []; hit = false; for (const k of [0, 3, 2, 1]) { const r = stumpStep(s, k); s = r.seq; hit = r.hit; }
    expect(hit).toBe(false);
  });
  it('찾음 = bonus.egg · 칭호 · 1~3 수수께끼 · 한 단계 더 · 4~8 = 우연', () => {
    const bonus = { egg: { e1: 1, e4: 2, e7: 3 } };
    expect(eggsFound(bonus)).toEqual(['e1', 'e4', 'e7']);
    const got = earnedFrom({ bonus } as never);
    expect(got).toContain('egg_root2'); expect(got).toContain('egg_fib'); expect(got).toContain('dummyfriend'); expect(got).not.toContain('egg_100');
    expect(eggHint(EGGS[0]!, 0)).toMatch(/일사일사/); expect(eggHint(EGGS[0]!, 1)).toMatch(/1\.414/);
    expect(eggHint(EGGS[4]!, 1)).toMatch(/우연히/);
  });
  it('도전과제 25 「비밀 탐험가」 = 8/8 전엔 숨김 · 8/8 = 받을 수 있음', () => {
    const ch = CHALS.find((c) => c.id === 'eggs')!;
    const seven = { d: { bonus: { egg: Object.fromEntries(EGGS.slice(0, 7).map((e) => [e.id, 1])) } } } as never;
    const all = { d: { bonus: { egg: Object.fromEntries(EGGS.map((e) => [e.id, 1])) } } } as never;
    expect(ch.hide!(seven)).toBe(true); expect(ch.hide!(all)).toBe(false);
    expect(chalState(ch, all).done).toBe(true);
    expect(CHALS.length).toBe(25);
  });
});
