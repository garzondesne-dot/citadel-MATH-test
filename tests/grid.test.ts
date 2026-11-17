// 📊 한눈에 표 = 정식 dash.js COLS 그대로 (📜 2026-11-15 머리 🔨): 칸 제목 · ❗ 남은 문제 = 오답노트(허수아비와 같은 셈) · OX · 힌트 · 사다리 · 업적 · 카드 · 정렬 값 · CSV
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { view } from '../src/school/views';
import { fullLesson } from '../src/school/statsCells';
import { noteOf } from '../src/school/dummy';

describe('📊 한눈에 표', () => {
  it('칸 = 정식 COLS · 값 = 서버 기록', () => {
    const S = { ...memoryStore(), kind: 'server' as const };
    S.set('roster/1-3', { 5: '가', 6: '나' });
    const rec5 = { no: 6, conc: { c1: [2, 4] }, boss: 4, bossN: 6, bossM: 'ooooxx', mons: { m1: 'o', m2: 'x', m3: 'f', u4: 'x', u5: 'o', u6: 'o', u7: 'n' }, ox: [3, 4], hints: 2, hg: 1, lad: { u4: 1, u5: 4 }, fixed: 3 };
    S.set('records/1-3', { 5: { 'set-06': rec5 } });
    S.set('bonus/1-3', { 5: { 'set-06': { m2: { clear: true, tries: 1 }, boss: { clear: true } }, 'eval-1': { q07: { clear: true, ph: 'p0', ph2: 'p1' } } } });
    S.set('photo/1-3/5', { 'set-06_u4': { a: { status: 'retry' }, b: { status: 'pass' }, c: { status: 'pass' } } }); // ✍ 연습 1 (같은 문항 두 번 통과 = 1)
    S.set('gifts/s1_3_5', { 'ult_set-06_u4': { s: 1 }, 'ult_set-06_u4_v': { s: 1, ph: 'c' } }); // ✍ 실력 = 📜 칸 _v 1 + 성채 ph2 1
    S.set('cards/1-3', { 5: { sub: true, emp: true } });
    const v = view(S, '1-3', 'grid'), T = v.table!;
    expect(T.sort).toBe(true);
    expect(T.head).toEqual(['번호 · 이름', '6차시', '❗ 남은 문제', '참여', '형성평가', '첫 시도', '⭕ OX', '고친 수', '💡 힌트', '💡 힌트 준', '✍ 연습 통과', '✍ 실력 통과', '🔑 열쇠', '🔑 칸 첫 시도', '🪜 사다리', '업적', '던전 도전', '카드', 'Lv']);
    const r5 = T.rows.find((r) => r.pick?.n === 5)!.cells.map((c) => c.t), r6 = T.rows.find((r) => r.pick?.n === 6)!.cells.map((c) => c.t);
    const left = noteOf(fullLesson('set-06')!, rec5, { m2: { clear: true }, boss: { clear: true } }).left;
    expect(left).toBeGreaterThan(0);
    expect(r5.slice(1)).toEqual(['4/6', `❗ ${left}`, '1/1', '67%', '50%', '75%', '3', '2', '1', '1', '2', '', '—', '4👣 5✍ 💪✍2', '1', '1', '2', expect.stringMatching(/^Lv\.\d+$/)]);
    expect(r6[1]).toBe('불참'); expect(r6[2]).toBe('✔');
    const H = v.csv!.rows[0]!; expect(H.slice(0, 4)).toEqual(['번호', '이름', '6차시 형성평가', '남은 문제(오답노트)']); expect(H.slice(-9)).toEqual(['EXP', '전환 시각', '전환 때 업적', '전환 전 깃털', '깃털→💎', '💎 소급 카드', '카드→💎', '전환 전 💎', '전환 뒤 💎']);
    expect(v.csv!.rows.length).toBe(3);
    S.set('gem/1-3/5/conv', { at: 1, seals: 2, feather: 30, featherGem: 60, cardsUnpaid: 3, cardGem: 9, gemBefore: 10, gemAfter: 79 });
    const row5 = view(S, '1-3', 'grid').csv!.rows.find((r) => r[0] === 5)!; expect(row5.slice(-7)).toEqual([2, 30, 60, 3, 9, 10, 79]);
  });
});

describe('🏆 랭킹', () => {
  it('판 6개(형성평가 · 첫 시도 · 참여 · 끈기 · 자기주도 · 성장) · 같은 값 = 같은 등수 · TOP 5 · 전체 = 반 대항전', () => {
    const S = { ...memoryStore(), kind: 'server' as const };
    S.set('roster/1-3', { 1: '가', 2: '나', 3: '다' });
    S.set('records/1-3', { 1: { 'set-06': { no: 6, conc: { c1: [4, 4] }, boss: 6, bossN: 6, fixed: 2 } }, 2: { 'set-06': { no: 6, conc: { c1: [2, 4] }, boss: 6, bossN: 6 } }, 3: { 'set-06': { no: 6, conc: { c1: [1, 4] }, boss: 3, bossN: 6, fixed: 5 } } });
    const v = view(S, '1-3', 'rank');
    expect(v.boards!.map((b) => b.title)).toEqual(['🎯 형성평가', '✅ 첫 시도 정답률', '🙋 참여', '🔁 끈기 TOP 5', '🏆 자기주도 TOP 5', '⭐ 성장 TOP 5']);
    expect(v.boards![0]!.rows.map((r) => [r.rk, r.nm, r.val])).toEqual([[1, '1번 가', '100% (6/6)'], [1, '2번 나', '100% (6/6)'], [3, '3번 다', '50% (3/6)']]);
    expect(v.boards![3]!.rows[0]).toMatchObject({ rk: 1, nm: '3번 다', val: '5개' });
    expect(v.table).toBeUndefined();
    const all = view(S, '전체', 'rank'); expect(all.tableTitle).toMatch(/반 대항전/); expect(all.table!.head).toEqual(['반', '인원', '형성평가', '첫 시도', '참여', '평균 EXP']);
  });
});

describe('📚 성취기준', () => {
  it('지난 시간 복습(review) 칸은 성취기준에 넣지 않음 (정식 Standards.of)', async () => {
    const { classData, STANDARDS } = await import('../src/school/dash');
    const S = { ...memoryStore(), kind: 'server' as const };
    S.set('roster/1-3', { 1: '가' });
    S.set('records/1-3', { 1: { 'set-04': { no: 4, conc: { review: [0, 3], c1: [2, 2] }, boss: 1, bossN: 2 } } });
    const st = classData(S, '1-3').studs[0]!.std, id = STANDARDS.find((x) => x.lessons.includes(4))!.id;
    expect(st[id]).toEqual([2, 2]);
  });
});

describe('🧹 옛 판 계산 오류 기록 빼기 (6차시 c4 · 선생님 답 A)', () => {
  it('11/11 10:46 KST 전 c4 = 대시보드에서 뺌 · 뒤 기록은 그대로 · 「개념별 약점」 한 줄', async () => {
    const { classData } = await import('../src/school/dash');
    const S = { ...memoryStore(), kind: 'server' as const };
    S.set('roster/1-3', { 1: '가', 2: '나' });
    const old = Date.UTC(2026, 10, 10, 1, 0), late = Date.UTC(2026, 10, 12, 1, 0);
    S.set('records/1-3', { 1: { 'set-06': { no: 6, at: old, conc: { c1: [2, 4], c4: [0, 17] }, boss: 1, bossN: 6 } }, 2: { 'set-06': { no: 6, at: late, conc: { c4: [10, 17] }, boss: 1, bossN: 6 } } });
    const st = classData(S, '1-3').studs;
    expect(Object.keys(st[0]!.conc)).toEqual(['set-06|c1']); expect(st[1]!.conc['set-06|c4']).toMatchObject({ ok: 10, total: 17 });
    expect(view(S, '1-3', 'weak').note).toMatch(/옛 판 계산 오류로 뺌/);
    expect(S.get('records/1-3/1/set-06/conc/c4')).toEqual([0, 17]); // 서버 기록은 그대로
  });
});

describe('📝 세특 초안 = 실제 기록 (옛 정식 memoParts 문장 그대로)', () => {
  it('힌트 준 · 고친 · 그림 힌트 · 성채 · 허수아비 · 오답 고침 · 기호 톡 · 설문 문장이 나옴', async () => {
    const { classData, seteukOf } = await import('../src/school/dash');
    const { seteukDraft } = await import('../src/school/seteuk');
    const S = { ...memoryStore(), kind: 'server' as const };
    S.set('roster/1-3', { 1: '가' });
    S.set('records/1-3/1', { 'set-06': { no: 6, at: Date.UTC(2026, 10, 12), conc: { c1: [4, 4] }, boss: 5, bossN: 6, bossM: 'ooooox', mons: { m1: 'x', m2: 'o' }, hg: 2, hints: 1, fixed: 3 } });
    S.set('bonus/1-3/1', { 'set-06': { m1: { clear: true, tries: 2 } }, 'eval-1': { r1: { tries: 4 } } });
    S.set('xp/1-3/1', { total: 10, st: { 'set-06': { in: 2 } } });
    S.set('surveyDone/1-3/1', true);
    const s = classData(S, '1-3').studs[0]!, d = seteukDraft(seteukOf(s)), all = [d.main, ...d.more].join(' ');
    for (const t of ['친구를 돕고', '오류를 스스로 바로잡음(3개)', '단서를 활용', '단원 평가 문항에 4회', '유사 문항으로 반복 연습함(2회)', '보완을 완료함(1문항)', '기호의 뜻을 스스로', '성찰에 참여함']) expect(all, t).toContain(t);
  });
});
