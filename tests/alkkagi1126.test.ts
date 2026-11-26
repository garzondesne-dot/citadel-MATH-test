// 🐞 🥏 11/26 1-1반 18명 「렉이 심함 · 순간이동 · 혼자 떨어짐 · 등장하자마자 죽고」 — 시계 기기 1초 박자 + 서버 지연을 흉내 내 폰 화면의 끊김을 잼
//   폰은 박자(1초) 상태를 0.3초 늦게 받음 · 화면 = 16ms 마다 그림 → 알이 멈췄다 튀는 횟수 · 가장 큰 튐을 셈
import { describe, expect, it } from 'vitest';
import { AK, akSmoother, botShot, deal, startAk, stepAk, viewAt, type Ak, type Shot } from '../src/rest/alkkagi';

const lcg = (s: number) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
/** 18명 · 봇이 쉬는 시간이 끝나면 바로 쏨 · 박자 = 1초 · 지연 lat ms → 박자들(받은 시각 포함) */
function play(lat: number, beats = 40, fire = true) {
  const rnd = lcg(7), U = Array.from({ length: 18 }, (_, i) => `s${String(i).padStart(2, '0')}`);
  let f: Ak = deal({ ...startAk(0), go: 1 }, U, 0, rnd); f = stepAk(f, null, null, f.to)!; // ready → play (t0 = 5000)
  const out: { f: Ak; at: number }[] = [{ f, at: f.t0 + lat }]; const shots: Record<string, Shot> = {};
  for (let b = 0; b < beats; b++) {
    if (fire) for (const u of U) { const s = f.st[u]!, sh = botShot(f.st, u, 0.15, rnd); if (sh) shots[u] = { ...sh, n: s.n + 1 }; }
    f = stepAk(f, Object.fromEntries(U.map((u) => [u, 1])), shots, f.t0 + f.bm, rnd)!; out.push({ f, at: f.t0 + lat });
  }
  return out;
}
/** 폰 화면: now 마다 그때까지 받은 것 중 마지막 박자로 그림 → 프레임 사이 이동 거리 */
function frames(beats: { f: Ak; at: number }[], draw: (f: Ak, now: number) => Record<string, { x: number; y: number; on: 0 | 1 }>) {
  let prev: Record<string, { x: number; y: number; on: 0 | 1 }> | null = null, maxJump = 0, jumps = 0, freezes = 0; const still: Record<string, number> = {}, was: Record<string, number> = {};
  const t1 = beats[1]!.f.t0, t2 = beats[beats.length - 1]!.f.t0;
  for (let now = t1; now < t2; now += 16) {
    const got = beats.filter((x) => x.at <= now).pop(); if (!got) continue;
    const st = draw(got.f, now);
    if (prev) for (const [u, s] of Object.entries(st)) {
      const p = prev[u]; if (!p || !p.on || !s.on) continue;
      const d = Math.hypot(s.x - p.x, s.y - p.y); if (d > 6) continue; // 되살아남 = 셈 밖
      maxJump = Math.max(maxJump, d); if (d > 1.0) jumps++;
      // 멈춤 = 바로 앞 · 바로 뒤에 움직이는데 이번 프레임만 0 (박자 끝에서 서 있다가 튐)
      if (d < 1e-6) still[u] = (still[u] || 0) + 1; else { if ((still[u] || 0) >= 6 && (was[u] || 0) > 0.3 && d > 0.3) freezes++; still[u] = 0; was[u] = d; } // 움직이다 → 멈춤 → 다시 같은 빠르기 = 끊김 (멈춰 있던 알을 쏜 것은 셈 밖)
    }
    prev = st;
  }
  return { maxJump, jumps, freezes };
}

describe('🥏 알까기 18명 · 지연 0.3초 화면', () => {
  it('지금 그리기(박자 끝에서 멈춤 → 받으면 튐)를 재 보면 = 튐 · 멈춤이 많음', () => {
    const old = (f: Ak, now: number) => { const k = Math.max(0, Math.min(AK.steps, Math.floor(((now - f.t0) / f.bm) * AK.steps))); return viewAt({ ...f, t0: f.t0 }, f.t0 + (k / AK.steps) * f.bm).st; };
    const r = frames(play(300), old);
    console.log('고치기 전 꼴', r);
    expect(r.jumps + r.freezes).toBeGreaterThan(20);
  });
  it('고친 그리기(박자 너머로 이어 그림 + 어긋남은 0.12초에 걸쳐 메움) = 큰 튐 · 멈춤 거의 없음', () => {
    const sm = akSmoother(); let wall = 0;
    const r = frames(play(300), (f, now) => { wall = now; return sm(f, now, wall).st; });
    console.log('고친 뒤', r);
    expect(r.freezes).toBeLessThanOrEqual(2);
    expect(r.maxJump).toBeLessThan(1.6);
  });
  it('박자 너머 이어 그리기 = 다음 박자 시작 상태와 같음(새 발사가 없으면 이음매 0)', () => {
    const b = play(0, 8), a = b[1]!.f; // 막 쏜 판 → 미끄러지는 알이 있음
    let g: Ak = a; for (let i = 0; i < 2; i++) g = stepAk(g, null, null, g.t0 + g.bm)!; // 새 발사 없이 2박자
    const ext = viewAt(a, a.t0 + 2 * a.bm).st, moving = Object.values(a.st).some((s) => s.on && Math.hypot(s.vx, s.vy) > 0.5);
    expect(moving).toBe(true);
    for (const [u, s] of Object.entries(g.st)) { const e = ext[u]!; if (!s.on || !e.on) continue; expect(Math.hypot(e.x - s.x, e.y - s.y)).toBeLessThan(0.01); }
  });
  it('📜 손발: 되살아난 알 · 늦게 들어온 알 무적 = 3초 (받는 데 걸리는 시간만큼 늘림)', () => { expect(AK.inv).toBe(3); });
});
