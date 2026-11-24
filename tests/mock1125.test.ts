// 📄 모의 시험지 마왕전 (📜 2026-11-25 · 머리 🔨): 문제 은행 · 무작위 10 · 채점 · 기록
import { describe, expect, it } from 'vitest';
import { PACKS } from '../src/engine/packs';
import { bankOf, drawMock, gradeMock, mergeMock, MOCK_N } from '../src/school/mockExam';
import { answerOf } from '../src/raid/raid';
import { rngOf } from '../src/board/atb/quiz';

describe('📄 모의 시험지', () => {
  const bank = bankOf(PACKS, 99);
  it('은행 = 15차시까지 · 연 차시까지만 · 몬스터 · 소레이드 · 형성평가', () => {
    expect(bank.length).toBeGreaterThan(30);
    expect(Math.max(...bank.map((s) => s.no))).toBeLessThanOrEqual(15);
    expect(new Set(bank.map((s) => s.kind))).toEqual(new Set(['mon', 'chain', 'boss']));
    expect(bankOf(PACKS, 5).every((s) => s.no <= 5)).toBe(true);
    expect(bankOf(PACKS, 0)).toEqual([]);
  });
  it('한 판 = 10문항 · 겹침 없음 · 차시 순서 · 정답을 내면 10/10 · 빈칸 = 틀림', () => {
    for (const sd of ['a', 'b', 'c']) {
      const qs = drawMock(PACKS, bank, rngOf(sd), MOCK_N, sd);
      expect(qs.length).toBe(MOCK_N);
      expect(new Set(qs.map((m) => `${m.slot.lid}|${m.slot.mid}|${m.slot.k}`)).size).toBe(MOCK_N);
      expect(qs.map((m) => m.slot.no)).toEqual(qs.map((m) => m.slot.no).slice().sort((a, b) => a - b));
      const ans = qs.map((m) => answerOf(m.q)), all = gradeMock(qs, ans);
      expect(all.n).toBe(ans.filter((a) => a != null).length); // 과목 고유 꼴(화살표 잇기 등) = 답 만들기 없음 → 빈칸
      const none = gradeMock(qs, qs.map(() => null));
      expect(none.n).toBe(0); expect(Object.values(none.wrongBy).reduce((a, b) => a + b, 0)).toBe(MOCK_N);
    }
  });
  it('기록 = 최고 · 도전 수 · 차시별 틀린 수 쌓임', () => {
    const a = mergeMock(null, 6, { 'set-07': 2, x: 2 }, 1), b = mergeMock(a, 4, { 'set-07': 1 }, 2);
    expect(b).toEqual({ best: 6, tries: 2, at: 2, wrong: { 'set-07': 3, x: 2 } });
  });
});
