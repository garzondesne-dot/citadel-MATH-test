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
describe('📄 대시보드 「모의전 약점」 (📜 11/25 B)', () => {
  it('반 전체 차시별 틀린 수 합 · 많은 차시부터 · 학생 이름 · 점수 칸 없음', async () => {
    const { memoryStore } = await import('../src/store/device');
    const { view, scope } = await import('../src/school/views');
    const { bonusBase } = await import('../src/school/castle');
    const S = memoryStore(), studs = scope(S, '1-3').studs;
    S.set(`${bonusBase('1-3', studs[0]!.n)}/mock`, { best: 7, tries: 2, wrong: { 'set-07': 2, 'set-09': 1 } });
    S.set(`${bonusBase('1-3', studs[1]!.n)}/mock`, { best: 9, tries: 1, wrong: { 'set-09': 4 } });
    const v = view(S, '1-3', 'mock');
    expect(v.kpis?.[0]?.big).toBe('2명'); expect(v.kpis?.[1]?.big).toBe('3번');
    const rows = v.table!.rows.map((r) => [String(r.cells[0]!.t), r.cells[1]!.t]);
    expect(rows[0]![0]).toMatch(/^9차시/); expect(rows[0]![1]).toBe('5개'); expect(rows[1]![1]).toBe('2개');
    expect(JSON.stringify(v)).not.toContain(studs[0]!.name);
  });
});
