// 📚 #25 반 진도가 지난 차시로 되돌아감 (2026-11-20 선생님 「가끔 차시 진행했는데 최근차시가 과거차시로 돌아간 이유찾고 고쳐줘」)
//   원인 ① school/last = 마지막으로 「연」 수업 → 지난 차시를 다시 열면 내려감 ② 옛 school/prog(진도 맞추기)가 진행한 차시보다 낮게 남으면 ⭐ 가 그 차시로
//   고침 = 진도 = 실제 진행한(held · last) 차시 중 가장 큰 번호 · ⭐ = max(진도 맞추기, 진도 + 1) · 🧪 테스트는 진도를 바꾸지 않음
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { LessonPack, Store } from '../src/model/types';
import { PACKS } from '../src/engine/packs';
import { openLesson } from '../src/school/openLesson';
import { nextStep } from '../src/raid/actions';
import { doneNo, lessonNo, nextNo } from '../src/school/progress';
import { starPack } from '../src/school/autoOpen';
import { heldNo } from '../src/school/prepopen';
import { progressOf } from '../src/school/castle';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
const P = (no: number) => PACKS.find((p) => p.no === no) as LessonPack;
/** 교사가 「수업 열기」 → 대기실에서 첫 단계로 (진짜 수업 = held 적힘) */
const teach = (S: Store, cls: string, no: number, test = false) => { const L = P(no); const code = openLesson(S, cls, L, { test }); nextStep(S, L, code); return code; };
const nos = [...new Set(PACKS.map((p) => p.no))].sort((a, b) => a - b);
const has = (...n: number[]) => n.every((x) => nos.includes(x));

describe('📚 #25 진도 = 진행한 가장 큰 차시', () => {
  it('3차시 → 5차시 진행 → 3차시 다시 열기 = 진도 5 그대로 · ⭐ 6 이상 · 예습 · 성채 · 허수아비 기준도 5', () => {
    if (!has(3, 5)) return;
    const S = mk();
    teach(S, '1-3', 3); teach(S, '1-3', 5);
    expect(doneNo(S, '1-3')).toBe(5);
    teach(S, '1-3', 3); // 지난 차시 다시 (복습 · 보충)
    expect(S.get<{ no: number }>('school/last/1-3')?.no).toBe(3); // ⏯ 이어서 자리는 마지막으로 연 수업 그대로
    expect(doneNo(S, '1-3')).toBe(5);
    expect(nextNo(S, '1-3')).toBe(6);
    expect(starPack(S, '1-3', PACKS)!.no).toBeGreaterThanOrEqual(6);
    expect(heldNo(S, '1-3')).toBe(5);
    expect(progressOf(S, '1-3')).toBe(5);
  });
  it('10차시 뒤 9차시 = 숫자 비교 (「9」 > 「10」 아님)', () => {
    if (!has(9, 10)) return;
    const S = mk();
    teach(S, '1-4', 10); teach(S, '1-4', 9);
    expect(doneNo(S, '1-4')).toBe(10); expect(nextNo(S, '1-4')).toBe(11);
    expect(lessonNo('set-10')).toBe(10); expect(lessonNo('ex-11')).toBe(11);
  });
  it('옛 진도 맞추기(school/prog 9)가 남아도 11차시까지 했으면 ⭐ 12 (운영 1-2 반 그대로)', () => {
    if (!has(11)) return;
    const S = mk(); S.set('school/prog/1-2', 9);
    teach(S, '1-2', 11);
    expect(nextNo(S, '1-2')).toBe(12);
    S.set('school/prog/1-2', 14); expect(nextNo(S, '1-2')).toBe(14); // 앞으로 미는 진도 맞추기는 그대로
  });
  it('🧪 테스트 수업 = 진도를 바꾸지 않음', () => {
    if (!has(3, 5)) return;
    const S = mk();
    teach(S, '1-5', 3); teach(S, '1-5', 5, true);
    expect(doneNo(S, '1-5')).toBe(3); expect(nextNo(S, '1-5')).toBe(4);
  });
});
