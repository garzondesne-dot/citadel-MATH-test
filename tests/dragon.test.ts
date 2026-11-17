// 🐉 용이 잠든 사이 (📜 2026-11-17 #25 · 두 단추 번갈아)
import { describe, expect, it } from 'vitest';
import { BACK, dragonAt, FIN, FREEZE, GRACE, meStart, ranks, roundPts, schedule, startDrg, stepDrg, STEP_MS, tap, WARN, type Drg } from '../src/rest/dragon';

describe('🐉 용이 잠든 사이', () => {
  it('일정: 1판 = 속임수 없음 · 2판 · 결승 = 속임수 2~3 · 눈 뜸 길이 범위', () => {
    const a = schedule(123, 1), b = schedule(123, 2), c = schedule(123, 3);
    expect(a.fakes.length).toBe(0); expect(b.fakes.length).toBeGreaterThanOrEqual(1); expect(c.eyes.length).toBeGreaterThan(0);
    a.eyes.forEach(([s, e]) => { expect(e - s).toBeLessThanOrEqual(3001); expect(s).toBeGreaterThanOrEqual(1500); });
    expect(schedule(123, 1)).toEqual(a); // 같은 씨앗 = 같은 일정 (폰마다 같음)
  });
  it('번갈아 = 한 칸 · 같은 단추 거듭 = 0 · 너무 빠르면 0 (초당 8칸)', () => {
    const f = { eyes: [] as [number, number][], fakes: [] };
    let me = meStart(), t = 0;
    let r = tap(f, me, 'L', t); expect(r.r).toBe('go'); me = r.me;
    r = tap(f, me, 'L', t + 500); expect(r.r).toBe('same'); expect(r.me.p).toBe(1);
    r = tap(f, me, 'R', t + 50); expect(r.r).toBe('fast');
    r = tap(f, me, 'R', t + STEP_MS); expect(r.r).toBe('go'); expect(r.me.p).toBe(2);
    me = { ...meStart(), p: FIN - 1, last: 'L' }; r = tap(f, me, 'R', 1000); expect(r.r).toBe('fin'); expect(r.me.f).toBe(1000);
  });
  it('눈 뜬 동안 누름 = 10칸 뒤로 + 0.8초 멈춤 · 0.3초 봐줌 · 한 눈에 한 번 · 0 아래로 안 감', () => {
    const f = { eyes: [[5000, 7000]] as [number, number][], fakes: [] };
    const me = { ...meStart(), p: 15 };
    expect(tap(f, me, 'L', 5000 + GRACE - 10).r).toBe('frz');
    const h = tap(f, me, 'L', 5000 + GRACE + 10); expect(h.r).toBe('hit'); expect(h.me.p).toBe(15 - BACK); expect(h.me.frzTo).toBe(5000 + GRACE + 10 + FREEZE);
    expect(tap(f, h.me, 'R', 6500).r).toBe('frz'); // 같은 눈 = 다시 안 밀림
    expect(tap(f, { ...meStart(), p: 3 }, 'L', 5600).me.p).toBe(0);
    expect(dragonAt(f, 5000 - WARN + 10).st).toBe('warn');
  });
  it('판 점수 · 진행 · 시상(1~3등 + 한 번도 안 걸린 용사)', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const pts = roundPts({ a: { p: 60, f: 1000 }, b: { p: 60, f: 2000 }, c: { p: 30 }, d: { p: 0 } }, ids);
    expect(pts).toEqual({ a: 4, b: 3, c: 1, d: 0 });
    let f: Drg | null = startDrg(ids, 0);
    f = stepDrg(f, {}, 10000)!; expect(f.phase).toBe('play');
    // 절반 들어옴 = 판 끝
    f = stepDrg(f, { a: { p: 60, f: 11000 }, b: { p: 60, f: 12000, h: 1 }, c: { p: 10 } }, 12500)!; expect(f.phase).toBe('res');
    for (const r of [2, 3]) { f = stepDrg(f, {}, f.to + 1)!; expect(f.round).toBe(r); f = stepDrg(f, {}, f.to + 1)!; expect(f.phase).toBe('res'); }
    f = stepDrg(f, {}, f.to + 1)!; expect(f.phase).toBe('end');
    expect(f.win).toContain('a'); expect(f.clean).toContain('a'); expect(f.clean).not.toContain('b');
    expect(ranks(f)[0]!.u).toBe('a');
  });
});
