// 📝 12월 마무리 설문 (📜 11/23 「진행」) — 24문항 (📜 11/27 C 에 2문항 더함) · 규칙 그대로(surveyA 꼴) · 한 번만 = EXP 칸 · 보상 11/17 과 같음 · 11/17 집계와 섞이지 않음
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { answers, keepNo, PAIR, setOpen, summary } from '../src/school/survey';
import { blank12, check12, clean12, firstGap12, INTRO12, isDone12, NO12, norm12, pendingAny, PICKQ, Q12S, SCALES, sheets12, submit12, summary12, svLabel } from '../src/school/survey12';

const fill = () => { const a = blank12(); for (const q of Q12S) if (q.kind === 'scale') a.v[q.n] = 4; else if (q.kind === 'scale0') a.v[q.n] = q.n === 13 ? 0 : 5; else if (q.kind === 'pick') a.v[q.n] = 1; a.say = '끝까지 풀게 됐다'; return a; };
describe('12월 마무리 설문', () => {
  it('문항 24 · 5점 19 · 고르기 3 · 자유 2 · A = 11/17 글자 그대로 · 안내 글', () => {
    expect(Q12S.length).toBe(24); expect(SCALES.length).toBe(19); expect(PICKQ.map((q) => q.n)).toEqual([12, 21, 22]);
    expect(Q12S.filter((q) => q.kind === 'text').map((q) => q.n)).toEqual([23, 24]);
    expect(Q12S.slice(0, 7).map((q) => q.t)).toEqual([...PAIR]);
    expect(Q12S.filter((q) => q.kind === 'scale0').map((q) => q.n)).toEqual([13, 14, 15, 16, 17, 18, 19, 20]); expect(Q12S.map((q) => q.n)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(INTRO12).toBe('성적과 상관없고, 안 해도 불이익 없어요. 선생님은 누가 무엇을 답했는지 볼 수 없어요.');
    expect(svLabel(NO12)).toBe('12월 마무리'); expect(svLabel(13)).toBe('13차시'); expect(keepNo(100)).toBe(100); expect(keepNo(40)).toBe(30);
  });
  it('빈칸 검사 · 저장 꼴 = 규칙이 요구하는 no · r · pick · cmp', () => {
    const a = blank12(); expect(check12(a)).toBe('1번을 골라 주세요.');
    const b = fill(); b.v[20] = -1; expect(firstGap12(b)).toBe(20); b.v[20] = 0; b.v[22] = -1; expect(firstGap12(b)).toBe(22);
    const c = clean12(fill());
    expect(c.no).toBe(100); expect(c.v).toBe(3); expect(c.r.length).toBe(19); expect(c.r[11]).toBe(0); expect(c.pick).toEqual([1, 1, 1]); expect(c.cmp).toBe(1);
  });
  it('보내기 → 응답 · 「12월 했음」(EXP 칸) · 보상 한 번 · 11/17 집계에 안 섞임 · 시험 계정 = 응답 안 씀', async () => {
    const S = memoryStore();
    setOpen(S, '1-3', true, NO12);
    expect(pendingAny(S, '1-3', 3)).toBe(100);
    S.set('surveyDone/1-3/3', true); // 11/17 에 이미 함 → 12월은 따로
    expect(pendingAny(S, '1-3', 3)).toBe(100);
    const r = await submit12(S, '1-3', 3, fill(), false, 1000);
    expect(r).toEqual({ gem: 10, xp: 5 });
    expect(isDone12(S, '1-3', 3)).toBe(true); expect(pendingAny(S, '1-3', 3)).toBe(0);
    await expect(submit12(S, '1-3', 3, fill(), false, 2000)).rejects.toThrow('이미 응답');
    S.set('surveyA/1-3/old', { no: 13, r: [[2, 4]], pick: [0], cmp: 0, say: '', want: '' });
    const old = await answers(S, '1-3'); expect(old.map((x) => x.no)).toEqual([13]); expect(summary(old).n).toBe(1);
    const all = Object.values(S.get<Record<string, unknown>>('surveyA/1-3')!).map(norm12).filter(Boolean);
    expect(all.length).toBe(1);
    const s = summary12(all); expect(s.n).toBe(1); expect(s.scales[0]!.avg).toBe(4); expect(s.scales[11]!.n).toBe(13); expect(s.scales[11]!.none).toBe(1); expect(s.scales[11]!.avg).toBeNull(); expect(s.say).toEqual(['끝까지 풀게 됐다']);
    expect(sheets12({ '1-3': all }).map((x) => x.name)).toEqual(['12월 요약', '12월 응답']);
    const S2 = memoryStore(); setOpen(S2, '1-3', true, NO12);
    await submit12(S2, '1-3', 4, fill(), true, 1000);
    expect(S2.get('surveyA/1-3')).toBeFalsy(); expect(isDone12(S2, '1-3', 4)).toBe(true);
    setOpen(S2, '1-3', true, 13); expect(pendingAny(S2, '1-3', 5)).toBe(13); // 차시 설문은 그대로
  });
});
describe('15번 = 과목 팩 이름', () => { it('공통수학2 = 단원 평가 도전 공간', () => { expect(Q12S.find((q) => q.n === 15)!.t).toBe('단원 평가 도전 공간에서 어려운 문제에 끝까지 도전해 봤다'); }); });
describe('교사 응답 수', () => { it('12월 = EXP 칸 수', async () => { const { doneCount12 } = await import('../src/school/survey12'); const S = memoryStore(); S.set('xp/1-3/3/log/survey12', { xp: 5 }); S.set('xp/1-3/4/log/survey', { xp: 5 }); expect(doneCount12(S, '1-3')).toBe(1); }); });
describe('📜 11/27 24문항 판 저장 꼴', () => {
  it('cmp = 22번 (다음 단원도) · 새 19 · 20 = r 끝 두 칸 · 22문항 판(v 2) 응답도 그대로 읽힘', () => {
    const a = blank12(); for (const q of Q12S) if (q.kind !== 'text') a.v[q.n] = q.kind === 'pick' ? 0 : 3;
    a.v[19] = 5; a.v[20] = 0; a.v[22] = 2;
    const c = clean12(a); expect(c.cmp).toBe(2); expect(c.pick).toEqual([0, 0, 2]); expect(c.r.slice(-2)).toEqual([5, 0]);
    const old = norm12({ no: 100, v: 2, r: Array(17).fill(4), pick: [1, 1, 1], cmp: 1, say: '', want: '' })!;
    expect(old.v).toBe(2); const s = summary12([old, c]); expect(s.n).toBe(2); expect(s.scales[0]!.avg).toBe(3.5);
    expect(s.scales[17]!.n).toBe(19); expect(s.scales[17]!.avg).toBe(5); expect(s.scales[18]!.none).toBe(1);
  });
});
