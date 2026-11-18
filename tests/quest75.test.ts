import { describe, expect, it } from 'vitest';
import { findMarks, homography, questClaim, questRight, solveClaims, hallSolveClaim, uploadsToday, kweek, QUEST, type QuestRec } from '../src/school/quest';

// ✏ #75 출제 공방 — 모서리 찾기 · 반듯하게 · 보상 상한 · 답 맞춤
const T = Date.parse('2026-11-18T10:00:00+09:00');
const rec = (o: Partial<QuestRec>): QuestRec => ({ at: T, grade: 'green', status: 'done', base: { pack: 'eval-1', room: 'q04' }, type: 'subj', ...o });

/** 가짜 사진: 진한 책상 바탕 위에 기울어진 흰 종이 + 모서리 ㄱ 표시 4개 + 가운데 글씨 */
function photo(w: number, h: number, quad: [number, number][]) {
  const g = new Uint8ClampedArray(w * h).fill(40); // 책상 (진함 · 가장자리에 닿음)
  const inside = (x: number, y: number) => { let s = 0; for (let i = 0; i < 4; i++) { const [ax, ay] = quad[i]!, [bx, by] = quad[(i + 1) % 4]!; const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax); if (c < 0) s++; } return s === 0 || s === 4; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) g[y * w + x] = 230;
  // 표시 = 종이 꼭짓점에서 안쪽으로 조금 들어온 굵은 점 덩어리 (8 × 8)
  const cx = quad.reduce((a, p) => a + p[0], 0) / 4, cy = quad.reduce((a, p) => a + p[1], 0) / 4;
  const marks = quad.map(([x, y]) => [Math.round(x + (cx - x) * 0.08), Math.round(y + (cy - y) * 0.08)] as [number, number]);
  for (const [mx, my] of marks) for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) g[(my + y) * w + mx + x] = 10;
  for (let x = Math.round(cx - 40); x < cx + 40; x++) for (let y = Math.round(cy - 2); y < cy + 2; y++) g[y * w + x] = 15; // 글씨
  return { g, marks };
}

describe('✏ 모서리 표시 찾기', () => {
  it('진한 책상 위 기울어진 종이에서 네 표시를 찾음 (왼위 · 오른위 · 오른아래 · 왼아래)', () => {
    const w = 400, h = 560, { g, marks } = photo(w, h, [[40, 30], [370, 55], [355, 530], [25, 500]]);
    const m = findMarks(g, w, h)!;
    expect(m).not.toBeNull();
    m.forEach((p, i) => { expect(Math.abs(p[0] - marks[i]![0])).toBeLessThanOrEqual(7); expect(Math.abs(p[1] - marks[i]![1])).toBeLessThanOrEqual(7); }); // 찾은 점 = 그 표시 덩어리 안
  });
  it('표시 하나가 가려지면 못 찾음 (이름이 찍힌 채 보내지 않게)', () => {
    const w = 400, h = 560, { g, marks } = photo(w, h, [[40, 30], [370, 55], [355, 530], [25, 500]]);
    const [mx, my] = marks[2]!; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) g[(my + y) * w + mx + x] = 230;
    expect(findMarks(g, w, h)).toBeNull();
  });
  it('너무 어두운 사진 = null', () => { expect(findMarks(new Uint8ClampedArray(100 * 100).fill(30), 100, 100)).toBeNull(); });
  it('사영 변환: 네 꼭짓점이 목표 사각형 네 귀퉁이로', () => {
    const q: [[number, number], [number, number], [number, number], [number, number]] = [[40, 30], [370, 55], [355, 530], [25, 500]], f = homography(q, 1000, 1430);
    const near = (a: [number, number], b: [number, number]) => { expect(a[0]).toBeCloseTo(b[0], 4); expect(a[1]).toBeCloseTo(b[1], 4); };
    near(f(0, 0), q[0]); near(f(1000, 0), q[1]); near(f(1000, 1430), q[2]); near(f(0, 1430), q[3]);
  });
});

describe('✏ 보상 상한 (QUEST-PHOTO-PLAN 4절)', () => {
  it('🟢 = 💎3 · 하루 2번', () => {
    const log: Record<string, { at: number }> = {};
    expect(questClaim('a', rec({}), log, T)).toMatchObject({ key: 'quest_g_a', g: 3, s: 0 });
    log.quest_g_a = { at: T }; log.quest_g_b = { at: T };
    expect(questClaim('c', rec({}), log, T)).toBeNull();
    expect(questClaim('c', rec({}), log, T + 86400e3)).not.toBeNull(); // 다음 날
  });
  it('🔵 = 선생님 확인(ok) 뒤에만 💎8 + 📜1 · 기다림 · 고침은 없음', () => {
    expect(questClaim('a', rec({ grade: 'blue', status: 'wait' }), {}, T)).toBeNull();
    expect(questClaim('a', rec({ grade: 'blue', status: 'fix' }), {}, T)).toBeNull();
    expect(questClaim('a', rec({ grade: 'blue', status: 'ok' }), {}, T)).toMatchObject({ key: 'quest_b_a', g: 8, s: 1 });
  });
  it('🟣 = 💎20 + 📜2 (상한 없음 · 한 문제 한 번) · ⚪ = 없음', () => {
    expect(questClaim('p', rec({ grade: 'purple', status: 'ok' }), {}, T)).toMatchObject({ key: 'quest_p_p', g: 20, s: 2 });
    expect(questClaim('p', rec({ grade: 'purple', status: 'ok' }), { quest_p_p: { at: T } }, T)).toBeNull();
    expect(questClaim('x', rec({ grade: 'gray', status: 'gray' }), {}, T)).toBeNull();
  });
  it('내 문제를 친구가 풂 = 💎1 · 주 10', () => {
    const solved = Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`u${i}`, T]));
    expect(solveClaims([{ id: 'a', solved }], {}, T)).toHaveLength(QUEST.authorSolve.perWeek);
    const log = { qsolve_a_u0: { at: T } };
    expect(solveClaims([{ id: 'a', solved: { u0: T, u1: T } }], log, T)).toEqual([{ key: 'qsolve_a_u1', g: 1 }]);
    expect(kweek(Date.parse('2026-11-22T23:00:00+09:00'))).toBe('20261116'); // 일요일 = 그 주 월요일
  });
  it('전당 문제 풂 = 💎2 · 하루 5', () => {
    const log = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`qhall_h${i}`, { at: T }]));
    expect(hallSolveClaim('h9', log, T)).toBeNull();
    expect(hallSolveClaim('h9', {}, T)).toEqual({ key: 'qhall_h9', g: 2 });
  });
  it('오늘 올린 수 = 테스트 기록 뺌', () => { expect(uploadsToday({ a: rec({}), b: rec({ test: true }), c: rec({ at: T - 86400e3 }) }, T)).toBe(1); });
});

describe('✏ 답 맞춤', () => {
  it('객관식 = 번호 (③ · 3 · 3번)', () => { for (const g of ['③', '3', '3번']) expect(questRight({ type: 'obj', answer: '3' }, g)).toBe(true); expect(questRight({ type: 'obj', answer: '③' }, '2')).toBe(false); });
  it('주관식 = 공백 · 중괄호 무시', () => { expect(questRight({ type: 'subj', answer: '{1, 2}' }, '1,2')).toBe(true); expect(questRight({ type: 'subj', answer: '8' }, ' 8 ')).toBe(true); expect(questRight({ type: 'subj', answer: '8' }, '9')).toBe(false); });
});
