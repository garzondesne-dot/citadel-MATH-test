import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { autoNext, heldNo, prepCount, prepKey, prepLine, prepOpenList, prepPacks } from '../src/school/prepopen';
// 📖 #66 배움터 예습: 반이 n차시 수업 → n + 1 하나 자동 · 교사 열기 · 닫기 덮어쓰기 · 팩 없음 = 준비 중 · 기록 = review/prep_{차시}
describe('📖 #66 예습 열림', () => {
  it('수업 전 = 열린 것 없음 · 9차시 수업 → 10차시만 · 마지막 차시 다음 = 준비 중', () => {
    const S = memoryStore();
    expect(prepOpenList(S, '1-6').open).toEqual([]);
    S.set('school/last/1-6', { lesson: 'set-09', no: 9, at: 1, done: true, code: '1' });
    expect(heldNo(S, '1-6')).toBe(9);
    expect(prepOpenList(S, '1-6').open.map((p) => p.no)).toEqual([10]);
    const max = Math.max(...prepPacks().map((p) => p.no));
    expect(autoNext(max)).toEqual({ L: null, want: max + 1 });
  });
  it('내 수업 기록이 더 앞이면 그 다음 · 6차시 나눔(@7) 다음 = 8차시', () => {
    const S = memoryStore();
    expect(prepOpenList(S, '1-1', { 'set-06@7': { no: 7 } }).open.map((p) => p.no)).toEqual([8]);
  });
  it('교사 덮어쓰기: 닫기 = 자동 차시도 닫힘 · 열기 = 더 열림', () => {
    const S = memoryStore(); S.set('school/last/1-6', { lesson: 'set-03', no: 3, at: 1, done: true, code: '1' });
    S.set('school/prepOpen/1-6', { 'set-04': false, 'set-08': true });
    expect(prepOpenList(S, '1-6').open.map((p) => p.id)).toEqual(['set-08']);
  });
  it('시험 · 이 기기 = 모두', () => { expect(prepOpenList(memoryStore(), '', {}, true).open.length).toBe(prepPacks().length); });
  it('푼 문제 수 = 낸 답이 있는 몬스터 · 「📖 예습: 10차시 2문제」', () => {
    const c = prepCount({ [prepKey('set-10')]: { m1: { tries: 2, clear: true }, m2: { tries: 1 }, m3: { tries: 0 } }, 'keyp_set-09': { n: 3 }, 'set-02': { m1: 1 } });
    expect(c.total).toBe(2); expect(prepLine(c)).toBe('📖 예습: 10차시 2문제');
  });
});
