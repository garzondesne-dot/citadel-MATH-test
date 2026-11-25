// 🚪 던전 문 1차 · 📄 기말 대비 답안지 (📜 11/25 · 머리 🔨): A → B → C · 7 / 7 통과 · 틀린 번호만 · C 뒤 = 틀린 번호만 다시 입력
//   정답표는 시험용 가짜 값 (진짜 정답표는 코드에 넣지 않음 · 선생님이 ⚙ 에서 넣음)
import { describe, expect, it } from 'vitest';
import { abcStep, gradeAbc, keyFor, normKey, submitAbc, type AbcRec } from '../src/school/abcSheet';

const K = { A: '1111111', B: '2222222', C: '3412341' };
const g = (s: string) => [...s].map(Number);

describe('📄 기말 대비 답안지', () => {
  it('정답표 글 다듬기: 동그라미 숫자 · 띄어쓰기 · 쉼표 · 틀린 꼴 = 빈 값', () => {
    expect(normKey('② ④ ① ③ ② ④ ①')).toBe('2413241');
    expect(normKey('2,4,1,3,2,4,1')).toBe('2413241');
    expect(normKey('241324')).toBe('');
    expect(normKey('2413245')).toBe('');
  });
  it('처음 = A세트 · 7문항', () => {
    const st = abcStep(null);
    expect(st).toMatchObject({ kind: 'set', set: 'A', nums: [1, 2, 3, 4, 5, 6, 7] });
    expect(keyFor(st, K)).toBe(K.A);
    expect(keyFor(st, {})).toBe('');
  });
  it('A 7 / 7 = 바로 통과 · 더 낼 것 없음', () => {
    const r = submitAbc(null, K.A, g('1111111'), 10);
    expect(r).toMatchObject({ ok: 7, total: 7, wrong: [] });
    expect(r.rec.pass).toEqual({ at: 10, by: 'A' });
    expect(r.step.kind).toBe('done');
  });
  it('하나라도 틀리면 = 틀린 번호만 · 다음은 B세트(빈칸도 틀림)', () => {
    const r = submitAbc(null, K.A, [1, 1, 2, 1, 0, 1, 1], 10);
    expect(r.wrong).toEqual([3, 5]);
    expect(r.rec.pass).toBeUndefined();
    expect(r.step).toMatchObject({ kind: 'set', set: 'B' });
  });
  it('A · B · C 모두 못 통과 → C 에서 틀린 번호만 다시 → 또 틀리면 남은 번호 → 모두 맞으면 통과', () => {
    let rec: AbcRec | undefined;
    rec = submitAbc(rec, K.A, g('2111111'), 1).rec;
    rec = submitAbc(rec, K.B, g('2222221'), 2).rec;
    const c = submitAbc(rec, K.C, g('3412000'), 3); // 5 · 6 · 7 틀림
    expect(c.wrong).toEqual([5, 6, 7]);
    expect(c.step).toMatchObject({ kind: 'redo', nums: [5, 6, 7], round: 1 });
    expect(keyFor(c.step, K)).toBe(K.C);
    const r1 = submitAbc(c.rec, K.C, [3, 4, 2], 4); // 5 ✔ 6 ✔ 7 ✘
    expect(r1.wrong).toEqual([7]);
    expect(r1.step).toMatchObject({ kind: 'redo', nums: [7], round: 2 });
    const r2 = submitAbc(r1.rec, K.C, [1], 5);
    expect(r2.rec.pass).toEqual({ at: 5, by: 'R' });
    expect(r2.step.kind).toBe('done');
    expect(r2.rec.R?.length).toBe(2);
  });
  it('채점 = 번호마다 그 번호 정답과 비교', () => {
    expect(gradeAbc('3412341', [2, 7], [4, 1])).toEqual({ wrong: [], ok: 2 });
    expect(gradeAbc('3412341', [2, 7], [4, 2])).toEqual({ wrong: [7], ok: 1 });
  });
  it('서버가 배열을 맵으로 돌려줘도 같음', () => {
    const rec = { A: { nums: { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 }, g: '2111111', wrong: { 0: 1 }, at: 1 } } as unknown as AbcRec;
    expect(abcStep(rec)).toMatchObject({ kind: 'set', set: 'B', prev: { wrong: [1] } });
  });
});

// 🚪 반별 통과 수 (교사 · 교사 로그인 TV)
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';
import { abcSum, abcTally } from '../src/school/abcSheet';
describe('🚪 던전 문 통과 수', () => {
  it('반마다 통과 = 기록에 pass · 시험 반(🧪)은 학교 합에서 빠짐 · 열림 표시', () => {
    const S: Store = { ...memoryStore(), kind: 'memory', now: () => 1 };
    S.set('roster/1-1', { 1: '가나', 2: '다라', 3: '마바' });
    S.set('roster/1-2', { 1: '사아', 2: '자차' });
    S.set('roster/1-6', { 1: '카타' });
    S.set('school/cls/1-6/beta', true);
    S.set('bonus/1-1/1/abc', { pass: { at: 1, by: 'A' } });
    S.set('bonus/1-1/3/abc', { A: { nums: [1, 2, 3, 4, 5, 6, 7], g: '1111112', wrong: [7], at: 1 } });
    S.set('bonus/1-2/2/abc', { pass: { at: 2, by: 'R' } });
    S.set('bonus/1-6/1/abc', { pass: { at: 2, by: 'B' } });
    S.set('school/abc/open/1-2', true);
    const t = abcTally(S, ['1-1', '1-2', '1-6', '1-7']);
    expect(t.map((x) => [x.cls, x.pass, x.total, x.open, x.beta])).toEqual([['1-1', 1, 3, false, false], ['1-2', 1, 2, true, false], ['1-6', 1, 1, false, true]]);
    expect(abcSum(t)).toEqual({ pass: 2, total: 5 });
  });
});
