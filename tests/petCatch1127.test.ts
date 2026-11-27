// 🐞 🐾 11/27 「둥지에서 알이 수업 끝나도 5 가 안 찬다」 — 수업 끝 화면을 못 본 학생(중간에 나감 · 폰 꺼짐 · 종합실이 시간으로 닫음)은 먹이를 못 받았음
//   → 캠프에 들어오면 놓친 차시를 채움 · 규칙 그대로(차시마다 +5 한 번 · 펫을 들인 뒤 수업만 · 정식 둥지가 열린 뒤만)
import { describe, expect, it } from 'vitest';
import { PET_CFG, PET_SINCE, adoptedAt, feed, missedLessons, type PetState } from '../src/model/pets';

const T = (d: number, h = 3) => Date.UTC(2026, 10, d, h); // 11월 d일 (UTC h시)
const pet = (at: number, extra: Partial<PetState> = {}): PetState => ({ on: `bird_${at.toString(36)}`, list: { [`bird_${at.toString(36)}`]: { kind: 'bird', food: 0, name: '삐' } as never }, ...extra });

describe('🐾 놓친 수업 먹이', () => {
  it('들인 시각 = 펫 id 꼬리(36진수) · 정식 둥지 전이면 그 시각(11/25 14:38 KST)부터', () => {
    expect(adoptedAt(pet(T(26)))).toBe(T(26));
    expect(adoptedAt(pet(T(20)))).toBe(PET_SINCE);
  });
  it('들인 뒤 수업 · 아직 안 먹인 차시만 (먹인 차시 · 들이기 전 차시 = 빼기)', () => {
    const st = pet(T(26, 0), { fed: { 'ex-14': true } });
    expect(missedLessons(st, { 'ex-12': T(24), 'ex-13': T(26, 1), 'ex-14': T(27), 'ex-15': T(27, 5) })).toEqual(['ex-13', 'ex-15']);
  });
  it('채우면 차시마다 +5 한 번 · 다시 해도 0 (끝 화면 먹이와 같은 칸 fed)', () => {
    const st = pet(T(25, 6)), miss = missedLessons(st, { 'ex-13': T(26), 'ex-14': T(27) });
    let n = 0; for (const l of miss) n += feed(st, { lesson: l });
    expect(n).toBe(2 * PET_CFG.lesson); expect(st.list![st.on!]!.food).toBe(10);
    expect(missedLessons(st, { 'ex-13': T(26), 'ex-14': T(27) })).toEqual([]);
    expect(feed(st, { lesson: 'ex-13' })).toBe(0); // 수업 끝 화면이 뒤늦게 와도 두 번 안 줌
  });
  it('데리고 다니는 펫이 없으면 = 없음', () => { expect(missedLessons({}, { 'ex-13': T(26) })).toEqual([]); });
});
