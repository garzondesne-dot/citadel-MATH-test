// 📊 📜 #130 ⑥ 게시판 던전 오답 = 교사 대시보드 「개념별 약점」 · 오개념에 섞이지 않음 (수업 기록 records/ 만 셈 · 게시판 = bonus/{반}/{번호}/board)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';
import { realClass } from '../src/school/dash';

const base = (): Store => {
  const S: Store = { ...memoryStore(), kind: 'memory' };
  S.set('school/roster/1-2', { 3: '테스트 가' });
  S.set('records/1-2/3/set-06', { no: 6, at: Date.now(), conc: { c1: { ok: 1, total: 2 } }, names: { c1: '합집합' } });
  return S;
};
describe('📊 게시판 기록 ↔ 수업 통계 분리', () => {
  it('게시판 판(오답 · 첫 시도 · mis 꼴 포함)이 있어도 개념별 약점 · 오개념 집계는 같음', () => {
    const a = realClass(base(), '1-2');
    const S = base();
    S.set('bonus/1-2/3/board/p1_abc', { at: Date.now(), lid: 'set-06', no: 6, atb: true, win: false, right: 0, total: 10, first: 0, mis: { m1: [0, 5] }, conc: { c1: { ok: 0, total: 10 } } });
    const b = realClass(S, '1-2');
    const pick = (r: ReturnType<typeof realClass>) => r.studs.map((s) => ({ conc: s.conc, mis: (s as { mis?: unknown }).mis ?? null }));
    expect(Object.keys(a.studs[0]?.conc ?? {}).length).toBeGreaterThan(0); // 수업 기록은 잡힘 (빈 비교가 아님)
    expect(pick(b)).toEqual(pick(a));
  });
});
