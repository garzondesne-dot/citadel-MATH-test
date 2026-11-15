// 📝 수업 설문 = 정식 js/raid/survey.js 와 같은 문항 · 검사 · 집계 · 저장 꼴
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { blank, check, clean, cleanWords, CMP, csvRows, firstGap, norm, PAIR, PICKS, rid, REWARD, rewardWrites, sheets, submit, summary, togglePick, WHEN, type Answer } from '../src/school/survey';
import type { Store } from '../src/model/types';

function mem(init: Record<string, unknown> = {}): Store & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = { ...init };
  return { kind: 'memory', data, get: <T>(p: string) => (p in data ? (data[p] as T) : (Object.keys(data).some((k) => k.startsWith(p + '/')) ? (Object.fromEntries(Object.entries(data).filter(([k]) => k.startsWith(p + '/')).map(([k, v]) => [k.slice(p.length + 1), v])) as T) : null)), set: (p, v) => { if (v == null) delete data[p]; else data[p] = v; }, watch: () => () => {}, now: () => 1e12 };
}
const full = (): Answer => ({ r: PAIR.map((_q, i) => [1 + (i % 5), 5 - (i % 5)]), pick: [0, 2], cmp: 0, say: '재밌어요', want: '' });

describe('📝 설문 문항 = 정식 원문', () => {
  it('문항 · 보기 원문이 정식 survey.js 와 같다', () => {
    let src = '';
    try { src = readFileSync('/home/user/Citadel-MATH/js/raid/survey.js', 'utf8'); } catch { return; } // 정식 저장소가 없으면 건너뜀
    for (const q of [...PAIR, ...WHEN, ...PICKS, ...CMP]) expect(src).toContain(`'${q}'`);
  });
  it('7문항 × (전 · 지금) · 고르기 6 · 비교 3 · 보상 +5 EXP · 💎 10', () => {
    expect(PAIR.length).toBe(7); expect(PICKS.length).toBe(6); expect(CMP.length).toBe(3);
    expect(REWARD).toEqual({ xp: 5, gem: 10 });
  });
});

describe('📝 검사 (정식 check)', () => {
  it('빈 답 = A 1번 「중간고사 전」', () => { expect(check(blank())).toBe(`1번 문장의 「${WHEN[0]}」을 골라 주세요.`); expect(firstGap(blank())).toBe(0); });
  it('지금만 빠짐 = 「지금」', () => { const a = full(); a.r[3] = [2, 0]; expect(check(a)).toBe('4번 문장의 「지금」을 골라 주세요.'); expect(firstGap(a)).toBe(3); });
  it('8번 · 9번', () => { const a = full(); a.pick = []; expect(check(a)).toMatch(/^8번/); expect(firstGap(a)).toBe(7); a.pick = [1]; a.cmp = -1; expect(check(a)).toBe('9번을 골라 주세요.'); expect(firstGap(a)).toBe(8); });
  it('다 채움 = 통과', () => { expect(check(full())).toBe(''); expect(firstGap(full())).toBe(-1); });
  it('8번은 2개까지 · 셋째 = 가장 먼저 고른 것이 빠짐', () => { expect(togglePick(togglePick(togglePick([], 0), 3), 5)).toEqual([3, 5]); expect(togglePick([3, 5], 3)).toEqual([5]); });
});

describe('📝 저장 꼴 (이름 · 번호 · 시각 없음)', () => {
  it('clean = { no, r, pick, cmp, say, want } · 100자 · 낱말 가림', () => {
    const a = full(); a.say = '시 발 ' + '가'.repeat(200);
    const c = clean(a, 7);
    expect(Object.keys(c).sort()).toEqual(['cmp', 'no', 'pick', 'r', 'say', 'want']);
    expect(c.no).toBe(7); expect(c.say.length).toBeLessThanOrEqual(100); expect(c.say).not.toMatch(/시\s*발/); expect(c.say).toContain('＊');
  });
  it('낱말 거르개 = 정식 words.js (기호 · 숫자 끼워도 잡음)', () => { expect(cleanWords('ㅅ1ㅂ 뭐야').bad).toBe(true); expect(cleanWords('좋아요').bad).toBe(false); expect(cleanWords('a'.repeat(30)).text.length).toBe(20); });
  it('응답 키 = 무작위 16자 (시각 없음)', () => { const k = rid(); expect(k).toMatch(/^[a-z2-9]{16}$/); expect(rid()).not.toBe(k); });
  it('서버가 배열을 {0:…} 로 돌려줘도 되돌림', () => { const n = norm({ no: 7, r: { 0: { 0: 1, 1: 3 }, 1: [2, 2] }, pick: { 0: 4 }, cmp: 1, say: '', want: '' }); expect(n?.r).toEqual([[1, 3], [2, 2]]); expect(n?.pick).toEqual([4]); });
});

describe('📝 보내기 · 보상', () => {
  it('열려 있으면 surveyA(무작위 키) + surveyDone · 두 번은 안 됨', async () => {
    const S = mem({ 'survey/1-3': { open: true, no: 7 } });
    await submit(S, '1-3', 5, full(), 7, false);
    const keys = Object.keys(S.data).filter((k) => k.startsWith('surveyA/1-3/'));
    expect(keys.length).toBe(1); expect(keys[0]).toMatch(/^surveyA\/1-3\/[a-z2-9]{16}$/);
    expect(S.data['surveyDone/1-3/5']).toBe(true);
    expect(JSON.stringify(S.data[keys[0]!])).not.toMatch(/"(n|num|name|at|uid)"/);
    await expect(submit(S, '1-3', 5, full(), 7, false)).rejects.toThrow('이미 응답했어요');
  });
  it('🧪 시험 계정 · 베타 반 = surveyA 안 씀 · 응답 표시만', async () => {
    const S = mem({ 'survey/8-1': { open: true, no: 7 } });
    await submit(S, '8-1', 2, full(), 7, true);
    expect(Object.keys(S.data).some((k) => k.startsWith('surveyA/'))).toBe(false);
    expect(S.data['surveyDone/8-1/2']).toBe(true);
  });
  it('닫혀 있거나 빈칸 = 오류(user)', async () => {
    await expect(submit(mem(), '1-1', 1, full(), 7, false)).rejects.toMatchObject({ user: true });
    await expect(submit(mem({ 'survey/1-1': { open: true, no: 7 } }), '1-1', 2, blank(), 7, false)).rejects.toMatchObject({ user: true });
  });
  it('보상 = gem/log/survey 10 · xp/log/survey 5 · 이미 받았으면 0', () => {
    expect(rewardWrites(mem(), '1-3', 5, 9).writes).toEqual([['gem/1-3/5/log/survey', { g: 10, at: 9, why: '수업 설문' }], ['xp/1-3/5/log/survey', { xp: 5, at: 9, why: '수업 설문' }]]);
    const r = rewardWrites(mem({ 'gem/1-3/5/log/survey': { g: 10 }, 'xp/1-3/5/log/survey': { xp: 5 } }), '1-3', 5, 9);
    expect([r.gem, r.xp, r.writes.length]).toEqual([0, 0, 0]);
  });
});

describe('📝 집계 · 엑셀 (정식 summary · csvRows)', () => {
  const L = [clean({ r: PAIR.map(() => [2, 4]), pick: [0, 1], cmp: 0, say: '끝까지 풀었다', want: '' }, 7), clean({ r: PAIR.map(() => [3, 3]), pick: [1], cmp: 1, say: '', want: '보스 더' }, 7)];
  it('평균 · 변화 · 오름/같음/내림 · 고른 수 · 글', () => {
    const s = summary(L);
    expect(s.n).toBe(2); expect(s.pairs[0]).toMatchObject({ pre: 2.5, now: 3.5, diff: 1, up: 1, same: 1, down: 0 });
    expect(s.picks.map((x) => x.n)).toEqual([1, 2, 0, 0, 0, 0]); expect(s.cmp.map((x) => x.n)).toEqual([1, 1, 0]);
    expect(s.say).toEqual(['끝까지 풀었다']); expect(s.want).toEqual(['보스 더']);
  });
  it('csv = 머리 줄 + 응답 줄 (이름 없음) · 엑셀 3장(요약 · 응답 · 문항)', () => {
    const rows = csvRows({ '1-3': L });
    expect(rows[0]!.length).toBe(2 + 14 + 5); expect(rows.length).toBe(3); expect(rows[1]!.slice(0, 4)).toEqual(['1-3', 7, 2, 4]);
    const sh = sheets({ '1-3': L });
    expect(sh.map((x) => x.name)).toEqual(['요약', '응답', '문항']); expect(sh[2]!.rows.length).toBe(1 + 7 + 4);
  });
});
