// 😆 아재 퀴즈 (📜 2026-11-24): 문제 은행 · 칩 · 점수 · 판 흐름
import { describe, expect, it } from 'vitest';
import { AJ, QS, chipsFor, pickQs, rankAns, startAj, stepAj, standingsAj, syl, qOf, type Aj } from '../src/rest/ajae';
import { rewardOf, GAMES, GAME_FEAT } from '../src/rest/run';

let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
describe('😆 문제 은행 · 칩', () => {
  it('51개 · 정답 2 ~ 6 글자 · 번호 겹침 없음', () => {
    expect(QS.length).toBe(51); expect(new Set(QS.map((q) => q.no)).size).toBe(51);
    QS.forEach((q) => { expect(syl(q.a).length).toBeGreaterThanOrEqual(2); expect(syl(q.a).length).toBeLessThanOrEqual(6); expect(q.q && q.why).toBeTruthy(); });
  });
  it('모든 문제: 칩 8칸 · 정답 글자 다 있음 · 정답이 두 가지로 안 만들어짐(정답 글자가 칩에 정답 수보다 많이 나오지 않음)', () => {
    for (const q of QS) for (let t = 0; t < 5; t++) {
      const c = chipsFor(q.no, rnd), ans = syl(q.a);
      expect(c.length).toBe(Math.max(AJ.chips, ans.length));
      const cnt = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map<string, number>());
      const cc = cnt(c), ca = cnt(ans);
      ca.forEach((n, ch) => expect(cc.get(ch)).toBe(n)); // 정답 글자 = 딱 정답 수만큼 → 한 가지로만 완성
    }
  });
  it('판 문제 6개 · 안 겹침 · 최근 문제는 뒤로', () => {
    const recent = QS.slice(0, 45).map((q) => q.no), p = pickQs(recent, rnd);
    expect(p.length).toBe(6); expect(new Set(p).size).toBe(6); expect(p.every((n) => !recent.includes(n))).toBe(true);
  });
});
describe('😆 점수 · 흐름', () => {
  const no = QS[0]!.no, A = qOf(no)!.a;
  it('1등 3 · 2등 2 · 3등 1 · 틀린 답 0 · 같은 시각 = 같은 등수', () => {
    expect(rankAns(no, { a: { a: A, at: 30 }, b: { a: A, at: 10 }, c: { a: '틀림', at: 5 }, d: { a: A, at: 20 }, e: { a: A, at: 40 } })).toEqual([['b', 3], ['d', 2], ['a', 1]]);
    expect(rankAns(no, { a: { a: A, at: 10 }, b: { a: A, at: 10 }, c: { a: A, at: 20 } })).toEqual([['a', 3], ['b', 3], ['c', 1]]);
  });
  it('안내 → 문제(30초 · 모두 맞히면 바로) → 공개 5초 → … → 6문제 뒤 끝 · 다득점 우승 · 보상 1 ~ 3등', () => {
    let f: Aj = startAj(['a', 'b'], 0, [], rnd); let t = 0;
    f = stepAj(f, null, (t = AJ.introMs))!; expect(f.phase).toBe('q');
    for (let i = 0; i < AJ.n; i++) {
      const q = qOf(f.qs[f.n - 1]!)!;
      expect(stepAj(f, { a: { a: q.a, at: t + 1 } }, t + 100)).toBeNull(); // b 아직
      f = stepAj(f, { a: { a: q.a, at: t + 1 }, b: { a: q.a, at: t + 2 } }, (t += 100))!; expect(f.phase).toBe('show');
      f = stepAj(f, null, (t += AJ.showMs))!;
    }
    expect(f.phase).toBe('end'); expect(f.score).toEqual({ a: 18, b: 12 }); expect(f.win).toEqual(['a']);
    expect(standingsAj(f).map((x) => x.rank)).toEqual([1, 2]);
    expect(rewardOf(f as never, 'a')?.gem).toBe(5); expect(rewardOf(f as never, 'b')?.gem).toBe(5);
  });
  it('시간이 다 되면 맞힌 사람만 점수 · 놀이 목록 · 스위치', () => {
    let f: Aj = stepAj(startAj(['a', 'b'], 0, [], rnd), null, AJ.introMs)!;
    f = stepAj(f, null, AJ.introMs + AJ.qMs)!; expect(f.phase).toBe('show'); expect(f.last).toEqual([]);
    expect(GAMES.some((g) => g.k === 'aj')).toBe(true); expect(GAME_FEAT.aj).toBe('rest-ajae');
  });
});
