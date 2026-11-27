// 🐞 🥏 11/27 알까기 렉 (선생님 「렉없게」): 화면 그리기만 가볍게 — 판정 · 연출 · 시간은 그대로
//   viewRunner(이어 셈) = viewAt(매 프레임 처음부터 셈)과 프레임마다 똑같은 값 · 계산량은 박자당 최대 75걸음 → 프레임 수만큼 줄어듦
import { describe, expect, it } from 'vitest';
import { AK, akSmoother, botShot, deal, simBeat, startAk, stepAk, viewAt, viewRunner, type Ak, type Shot } from '../src/rest/alkkagi';

const lcg = (s: number) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
function beats(n = 18, count = 30) {
  const rnd = lcg(11), U = Array.from({ length: n }, (_, i) => `s${String(i).padStart(2, '0')}`);
  let f: Ak = deal({ ...startAk(0), go: 1 }, U, 0, rnd); f = stepAk(f, null, null, f.to)!;
  const out: Ak[] = [f]; const shots: Record<string, Shot> = {};
  for (let b = 0; b < count; b++) {
    for (const u of U) { const s = f.st[u]!, sh = botShot(f.st, u, 0.15, rnd); if (sh) shots[u] = { ...sh, n: s.n + 1 }; }
    f = stepAk(f, Object.fromEntries(U.map((u) => [u, 1])), shots, f.t0 + f.bm, rnd)!; out.push(f);
  }
  return out;
}

describe('🥏 11/27 알까기 렉 — 이어 셈 = 처음부터 셈', () => {
  it('18명 30박자 · 16ms 마다 · 박자 너머(늦게 받음)까지: 알 자리 · 사건이 viewAt 과 똑같음', () => {
    const B = beats(), run = viewRunner(); let n = 0, falls = 0;
    for (const f of B.slice(1)) for (let now = f.t0; now < f.t0 + f.bm * 1.6; now += 16) {
      const a = viewAt(f, now), b = run(f, now); n++;
      expect(b.k).toBe(a.k); expect(b.st).toEqual(a.st); expect(b.ev).toEqual(a.ev); falls += a.ev.filter((e) => e.k === 'fall').length;
    }
    expect(n).toBeGreaterThan(2500); expect(falls).toBeGreaterThan(0); // 떨어짐 · 부딪힘이 실제로 일어난 판
  });
  it('시간이 거꾸로 가도(시계 맞춤) · 같은 박자를 다시 받아도 = 처음부터 다시 셈해서 같은 값', () => {
    const B = beats(12, 8), run = viewRunner(), f = B[3]!;
    for (const now of [f.t0 + 700, f.t0 + 300, f.t0 + 900, f.t0 + 900, f.t0 + 1500, f.t0 + 100]) expect(run(f, now).st).toEqual(viewAt(f, now).st);
    expect(run({ ...f, phase: 'end' } as Ak, f.t0 + 500).st).toBe(f.st); // 판 밖 = 받은 그대로
  });
  it('돌려준 알은 복사본 (다음 프레임 계산이 지난 프레임 그림을 바꾸지 않음 · 부드럽게 메우기에 필요)', () => {
    const f = beats(10, 4)[2]!, run = viewRunner(), a = run(f, f.t0 + 200), x = JSON.stringify(a.st);
    run(f, f.t0 + 800); expect(JSON.stringify(a.st)).toBe(x);
  });
  it('simBeat 결과 그대로 (한 박자 25걸음 = 시계 기기가 쓰는 값)', () => {
    const f = beats(18, 6)[5]!, a = simBeat(f.st, f.R, f.gt, f.crown, AK.steps, f.ar), b = viewRunner()(f, f.t0 + f.bm);
    expect(b.st).toEqual(a.st);
  });
  it('부드럽게 메우기(akSmoother)도 계산 결과는 그대로 · 박자 사이 튐 없음', () => {
    const B = beats(18, 20), sm = akSmoother(); let maxJump = 0, prev: Record<string, { x: number; y: number; on: number }> | null = null, wall = 0;
    for (const f of B.slice(1)) for (let now = f.t0 + 300; now < f.t0 + f.bm + 300; now += 16) {
      const st = sm(f, now, (wall += 16)).st;
      if (prev) for (const [u, s] of Object.entries(st)) { const p = prev[u]; if (p?.on && s.on) { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < 6) maxJump = Math.max(maxJump, d); } }
      prev = st;
    }
    expect(maxJump).toBeLessThan(1.0);
  });
});
