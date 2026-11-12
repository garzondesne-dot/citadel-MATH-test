// #135 ③ 가벼운 판 준비: 숫자 바꾸기 = 이름 등록 생성기 또는 미리 쓴 판(pool) — 몬스터 · ⚔ 소레이드 · 👑 형성평가 모두 pool 로도 돌아감 (생성기 없이)
import { describe, expect, it } from 'vitest';
import type { LessonPack, Question } from '../src/model/types';
import { bossItem, chainItems, items, validate } from '../src/engine/lessons';

const n = (q: string, a: number): Question => ({ type: 'number', question: q, answer: a });
const P: LessonPack = {
  v: 1, id: 'pool-01', no: 1, title: '미리 쓴 판 차시', unit: '시험', defaultPct: 90,
  steps: [{ kind: 'monster', id: 'm1', title: '문제 1' }, { kind: 'monster', id: 'u1', title: '문제 2' }, { kind: 'boss', id: 'boss', title: '형성평가' }],
  monsters: {
    m1: { title: '문제 1', sprite: 'mimic:0', first: [n('1 + 1', 2)], retry: { pool: [[n('2 + 2', 4)], [n('3 + 3', 6)]] } },
    u1: { title: '문제 2', sprite: 'mimic:0', retry: { pool: [[n('4 + 4', 8)]] }, chain: { pool: [[n('단계 1', 1), n('단계 2', 2)], [n('단계 1′', 3), n('단계 2′', 4)]] } },
  },
  boss: { title: '형성평가', sprite: 'mimic:0', items: 2, hpItems: 2, sets: { 1: [n('보스 1', 1), n('보스 2', 2)] }, pool: [[n('보스 1′', 10), n('보스 1″', 11)], [n('보스 2′', 20)]] },
};
describe('pool 만으로 된 차시 팩 (#135 ③)', () => {
  it('팩 확인 통과 (생성기 이름 없이)', () => expect(validate(P)).toEqual([]));
  it('몬스터: 판 0 = first · 판 1 ~ = pool 차례', () => {
    expect(items(P, 'm1', 's', 0)[0]?.question).toBe('1 + 1');
    expect([1, 2, 3].map((v) => items(P, 'm1', 's', v)[0]?.question)).toEqual(['2 + 2', '3 + 3', '2 + 2']);
  });
  it('⚔ 소레이드: 판 0 = pool[0] · 한 판 더 = 다음 판 · 돌아감', () => {
    expect(chainItems(P, 'u1', 's', 0).map((q) => q.question)).toEqual(['단계 1', '단계 2']);
    expect(chainItems(P, 'u1', 's', 1).map((q) => q.question)).toEqual(['단계 1′', '단계 2′']);
    expect(chainItems(P, 'u1', 's', 2).map((q) => q.question)).toEqual(['단계 1', '단계 2']);
  });
  it('👑 형성평가: 시도 0 = 세트 1 · 시도 1 ~ = pool[문항] 차례', () => {
    expect(bossItem(P, 's', 0, 0)?.question).toBe('보스 1');
    expect([1, 2, 3].map((a) => bossItem(P, 's', 0, a)?.question)).toEqual(['보스 1′', '보스 1″', '보스 1′']);
    expect(bossItem(P, 's', 1, 2)?.question).toBe('보스 2′');
  });
});
