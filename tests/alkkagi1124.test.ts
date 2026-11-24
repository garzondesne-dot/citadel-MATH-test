// 🥏 쉼터 놀이 「알까기 난장판」 (📜 2026-11-24 · 설계 DESIGN-v1 · sim.py) — 엔진 규칙
import { describe, expect, it } from 'vitest';
import { AK, crownOf, deal, powerOf, predict, radiusFor, ringFor, simBeat, startAk, stepAk, stoneFor, viewAt, type Ak, type Stone } from '../src/rest/alkkagi';
import { rewardOf } from '../src/rest/run';

const S = (x: number, y: number, o: Partial<Stone> = {}): Stone => ({ x, y, vx: 0, vy: 0, on: 1, cd: 0, inv: 0, back: 0, l: '', lt: -9, f: 0, n: 0, ...o });
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]!; };
const base = (st: Record<string, Stone>, o: Partial<Ak> = {}): Ak => ({ ...startAk(0), phase: 'play', R: 5.5, t0: 0, bm: 1000, beat: 1, gt: 0, st, sc: Object.fromEntries(Object.keys(st).map((u) => [u, 0])), kn: {}, fall: {}, total: Object.keys(st).length, ...o });

describe('🥏 알까기 엔진', () => {
  it('📜 11/24 판 반지름 = 2 × max(5.5, 2 + 1.2√인원) · 출발 = 반지름 절반 원 위 같은 간격 · 알 = min(0.9, 원에 들어가는 크기)', () => {
    expect(radiusFor(4)).toBe(11); expect(radiusFor(28)).toBeCloseTo(16.70, 1); expect(ringFor(11)).toBe(5.5);
    expect(stoneFor(8, ringFor(radiusFor(8)))).toBe(0.9); expect(stoneFor(28, ringFor(radiusFor(28)))).toBeLessThan(0.9);
    const f = deal(startAk(0), ['a', 'b', 'c', 'd', 'e', 'f'], 0);
    expect(f.phase).toBe('ready'); expect(f.ring).toBeCloseTo(f.R / 2, 2);
    const v = Object.values(f.st); expect(v.length).toBe(6);
    expect(v.every((s) => Math.abs(Math.hypot(s.x, s.y) - f.ring!) < 0.01)).toBe(true); // 모두 같은 원 위
    const ang = v.map((s) => Math.atan2(s.y, s.x)).sort((a, b) => a - b), gaps = ang.map((a, i) => ((ang[(i + 1) % 6]! - a + Math.PI * 2) % (Math.PI * 2)));
    expect(gaps.every((g) => Math.abs(g - Math.PI / 3) < 0.01)).toBe(true); // 같은 간격 60°
  });
  it('세기 = 미끄러지는 거리 2배 (속도 √2) · 당긴 길이 px → 세기', () => {
    expect(AK.pow[0] ** 2 / (2 * AK.fric)).toBeCloseTo((7 * 7 * 2) / (2 * AK.fric), 6);
    expect([powerOf(10), powerOf(40), powerOf(80), powerOf(200)]).toEqual([-1, 0, 1, 2]);
  });
  it('모이기 = 「출발」 + 2명부터', () => {
    const f = startAk(0);
    expect(stepAk(f, { a: 1, b: 1 }, null, 10)).toBeNull();
    expect(stepAk({ ...f, go: 5 }, { a: 1 }, null, 10)).toBeNull();
    expect(stepAk({ ...f, go: 5 }, { a: 1, b: 1 }, null, 10)?.phase).toBe('ready');
  });
  it('발사 = 박자 경계에서 들어감 · 쉬는 4초 · 무적 끝 · 쉬는 중 발사 = 버림', () => {
    const f = base({ a: S(0, 0, { inv: 1.5 }), b: S(3, 3) });
    const n1 = stepAk(f, null, { a: { a: 0, p: 1, n: 1 } }, 1000)!;
    expect(n1.st.a!.vx).toBeCloseTo(11 * Math.SQRT2, 2); expect(n1.st.a!.cd).toBe(AK.cool); expect(n1.st.a!.inv).toBe(0); expect(n1.st.a!.f).toBe(1); expect(n1.st.a!.n).toBe(1);
    const n2 = stepAk(n1, null, { a: { a: Math.PI, p: 2, n: 2 } }, 2000)!;
    expect(n2.st.a!.n).toBe(2); expect(n2.st.a!.cd).toBeGreaterThan(2.9); // 쉬는 중 = 속도 안 바뀜 (번호만 씀)
  });
  it('떨어뜨리기 +3 (마지막으로 건드린 사람 · 3초 안) · 맞히기 +1 (쏜 알이 처음 부딪힐 때 한 번)', () => {
    const st = { a: S(3, 0, { vx: 9, f: 1 }), b: S(4.85, 0) };
    const r = simBeat(st, 5.5, 0, undefined);
    expect(r.sc.a).toBe(AK.hit + AK.knock); expect(r.kn.a).toBe(1); expect(r.fall.b).toBe(1);
    expect(r.ev.filter((e) => e.k === 'hit').length).toBe(1);
  });
  it('👑 1등 알을 떨어뜨리면 +5 · 혼자 떨어지면 0점', () => {
    const st = { a: S(3, 0, { vx: 9 }), b: S(4.85, 0) };
    expect(simBeat(st, 5.5, 0, 'b').sc.a).toBe(AK.crown);
    const solo = simBeat({ a: S(5, 0, { vx: 8 }) }, 5.5, 0, undefined);
    expect(solo.fall.a).toBe(1); expect(Object.values(solo.sc).reduce((x, y) => x + y, 0)).toBe(0);
  });
  it('무적 = 서로 통과 (밀지도 밀리지도 않음)', () => {
    const r = simBeat({ a: S(0, 0, { vx: 9 }), b: S(1.9, 0, { inv: 2 }) }, 5.5, 0, undefined);
    expect(r.st.b!.x).toBeCloseTo(1.9); expect(r.st.b!.vx).toBe(0);
  });
  it('떨어지면 3초 뒤 빈자리에 되살아남 + 무적 2초', () => {
    let f = base({ a: S(5.3, 0, { vx: 6 }), b: S(-3, 0) });
    let t = 1000; f = stepAk(f, null, null, t, seq(0.5))!; expect(f.st.a!.on).toBe(0);
    for (let i = 0; i < 2; i++) { t += 1000; f = stepAk(f, null, null, t, seq(0.5))!; }
    expect(f.st.a!.on).toBe(0);
    t += 1000; f = stepAk(f, null, null, t, seq(0.3, 0.7))!;
    expect(f.st.a!.on).toBe(1); expect(f.st.a!.inv).toBe(AK.inv); expect(Math.hypot(f.st.a!.x, f.st.a!.y)).toBeLessThan(f.R);
  });
  it('👑 = 0점 위 1등 · 같으면 지금 왕관 그대로', () => {
    expect(crownOf({ a: 0, b: 0 })).toBeUndefined(); expect(crownOf({ a: 3, b: 5 })).toBe('b'); expect(crownOf({ a: 5, b: 5 }, 'b')).toBe('b');
  });
  it('폰이 그리는 판 = 시계 기기가 다음 박자에 내려 주는 판 (같은 식)', () => {
    const f = base({ a: S(0, 0, { vx: 6, vy: 2, f: 1 }), b: S(2, 1), c: S(-2, -2, { vx: -3 }) });
    const v = viewAt(f, 1000).st, n = stepAk(f, null, null, 1000)!;
    for (const u of ['a', 'b', 'c']) { expect(n.st[u]!.x).toBeCloseTo(v[u]!.x, 2); expect(n.st[u]!.y).toBeCloseTo(v[u]!.y, 2); }
  });
  it('궤적 미리 보기: 판 밖 = out · 처음 부딪히는 알과 밀려갈 방향', () => {
    expect(predict({ a: S(4, 0) }, 5.5, 'a', 0, 2).out).toBe(true);
    const h = predict({ a: S(0, 0), b: S(3, 0) }, 5.5, 'a', 0, 1);
    expect(h.hit?.u).toBe('b'); expect(h.hit!.dx).toBeGreaterThan(3);
  });
  it('150초 = 150박자 뒤 끝 · 순위 · 💎 1등 30 · 2 · 3등 20 · 참가 10', () => {
    let f = base({ a: S(-2, 0), b: S(2, 0), c: S(0, 3), d: S(0, -3) }, { sc: { a: 9, b: 5, c: 5, d: 1 } });
    let t = 0; for (let i = 0; i < AK.playSec; i++) { t += 1000; f = stepAk(f, null, null, t) ?? f; }
    expect(f.phase).toBe('end'); expect(f.rank).toEqual({ a: 1, b: 2, c: 2, d: 4 }); expect(f.win).toEqual(['a']);
    const g = (u: string) => rewardOf(f as never, u)?.gem;
    expect([g('a'), g('b'), g('c'), g('d'), g('x')]).toEqual([30, 20, 20, 10, undefined]);
  });
});
