// 🎯 허수아비 보상 = 정식 그대로 (📜 2026-11-15 머리 🔨 ⑥): 복습 3 = 틀림 · 안 풂 해결만(하루 6) · 재대결 14 · 첫 복습 4 = 한 번 · 업적 12 · 오답노트 7 · EXP = 처음 처치만
import { describe, expect, it } from 'vitest';
import { packOf } from '../src/engine/packs';
import { dummyReward, fieldIds, noteOf } from '../src/school/dummy';
import type { LessonPack } from '../src/model/types';

const L = packOf('set-02') as LessonPack;
const ids = fieldIds(L);
const day = '2026-11-15';
// 수업 기록: 첫 문제 틀림 · 둘째 안 풂 · 나머지 맞힘 · 형성평가 일부 틀림
const rec = { mons: Object.fromEntries(ids.map((id, i) => [id, i === 0 ? 'x' : i === 1 ? '-' : 'o'])), bossM: 'xo' };
const sum = (g: { n: number }[]) => g.reduce((a, x) => a + x.n, 0);

describe('🎯 허수아비 보상 · 기록 (정식 bonus.js win)', () => {
  it('오답노트 상태 = 정식 note.js (틀림 · 안 풂 · 형성평가 틀린 칸 = 남은 문제)', () => {
    const x = noteOf(L, rec, {});
    expect(x.mons[0]).toBe('x'); expect(x.mons[1]).toBe('-'); expect(x.mons[2]).toBe('o');
    expect(x.left).toBe(2 + [...x.boss.slice(0, x.hp)].filter((s) => ['x', '-', 'n', 'a'].includes(s)).length);
    expect(noteOf(L, undefined, {}).none).toBe(true);
  });
  it('맞힌 문제만 다시 깸 = 💎 복습 0 · 첫 복습 4 · EXP 5', () => {
    const r = dummyReward(L, rec, {}, [ids[2]!], {}, day);
    expect(r.gems.map((g) => g.key)).toEqual(['firstreview']);
    expect(r.xp).toBe(5);
  });
  it('틀린 문제 해결 = 복습 3 · 같은 몬스터를 또 깨면 0 (EXP 도 0)', () => {
    const a = dummyReward(L, rec, {}, [ids[0]!], { firstreview: { g: 4 } }, day);
    expect(a.gems.map((g) => [g.key, g.n])).toEqual([[`review_${day}_0`, 3]]);
    expect(a.xp).toBe(5);
    const b = dummyReward(L, rec, a.bon, [ids[0]!], { firstreview: {}, [`review_${day}_0`]: {} }, day);
    expect(b.gems).toEqual([]); expect(b.xp).toBe(0);
  });
  it('복습 3 = 하루 6번까지 (서버 log 의 오늘 키 수)', () => {
    const log = Object.fromEntries([...Array(6).keys()].map((k) => [`review_${day}_${k}`, {}]));
    const r = dummyReward(L, rec, {}, [ids[0]!, ids[1]!], { ...log, firstreview: {} }, day);
    expect(r.gems.filter((g) => g.key.startsWith('review_'))).toEqual([]);
    const next = dummyReward(L, rec, {}, [ids[0]!], { ...log, firstreview: {} }, '2026-11-16');
    expect(next.gems.map((g) => g.key)).toEqual(['review_2026-11-16_0']);
  });
  it('👑 재대결 처음 처치 = 14 + 🏆 업적 12(한도 밖) + EXP 15 · 다시 = 0', () => {
    const r = dummyReward(L, rec, {}, ['boss'], { firstreview: {} }, day);
    expect(r.gems.map((g) => [g.key, g.n, !!g.free])).toEqual([[`bossre_${L.id}`, 14, false], [`seal_${L.id}`, 12, true]]);
    expect(r.xp).toBe(15);
    const again = dummyReward(L, rec, r.bon, ['boss'], { firstreview: {}, [`bossre_${L.id}`]: {}, [`seal_${L.id}`]: {} }, day);
    expect(again.gems).toEqual([]); expect(again.xp).toBe(0);
  });
  it('남은 문제를 다 풀면 📕 오답노트 완성 7 (한 번) · 판 전체 합', () => {
    const all = [...ids, 'boss'];
    const r = dummyReward(L, rec, {}, all, {}, day);
    expect(r.gems.map((g) => g.key)).toEqual(['firstreview', `review_${day}_0`, `review_${day}_1`, `bossre_${L.id}`, `seal_${L.id}`, `note_${L.id}`]);
    expect(sum(r.gems)).toBe(4 + 3 + 3 + 14 + 12 + 7);
    expect(r.xp).toBe(5 * ids.length + 15);
    expect(noteOf(L, rec, r.bon).left).toBe(0);
  });
  it('수업 기록이 없는 차시 = 복습 💎 없음 · 오답노트 없음 (정식 noteOf none)', () => {
    const r = dummyReward(L, undefined, {}, [ids[0]!], { firstreview: {} }, day);
    expect(r.gems).toEqual([]); expect(r.xp).toBe(5);
  });
});

import { reviewTodo } from '../src/school/dummy';
describe('🏕 캠프 🎯 할 일 (시안 A)', () => {
  it('남은 복습 문제 · 오늘 받을 💎 = 남은 문제 × 3 (하루 6번 안) · 기록 없는 차시는 셈 안 함', () => {
    const recs = { [L.id]: rec };
    const a = reviewTodo([L], recs, {}, {}, day);
    expect(a.left).toBe(noteOf(L, rec, {}).left); expect(a.gem).toBe(Math.min(a.left, 6) * 3);
    const log5 = Object.fromEntries([...Array(5).keys()].map((k) => [`review_${day}_${k}`, {}]));
    expect(reviewTodo([L], recs, {}, log5, day).gem).toBe(3);
    expect(reviewTodo([L], {}, {}, {}, day)).toEqual({ left: 0, gem: 0 });
  });
});

describe('⭐ 도전 = 수업 밖으로 뺀 몬스터(later) (📜 11/17 #26)', () => {
  const L2 = { ...L, steps: L.steps.map((s) => (s.id === ids[ids.length - 1] ? { ...s, later: true } : s)) } as LessonPack;
  const last = ids[ids.length - 1]!;
  it('수업 기록이 「안 풂」이어도 도전(c) · 남은 것에 안 셈 · 깨면 보충 완료', () => {
    const r = { mons: Object.fromEntries(ids.map((id) => [id, 'o'])) };
    const x = noteOf(L2, { mons: { ...r.mons, [last]: 'n' } }, {});
    expect(x.mons[ids.indexOf(last)]).toBe('c');
    expect(x.left).toBe(noteOf(L2, r, {}).left);
    expect(noteOf(L2, r, { [last]: { clear: true } }).mons[ids.indexOf(last)]).toBe('p');
  });
});

// 🐞 11/24 학생 인터뷰 「허수아비 푼 것 · 안 푼 것 표시 불분명(초록 칸만)」 = 해결한 줄 끝에 글자 「✔ 해결」
import { readFileSync as rf1124 } from 'node:fs';
describe('🎯 허수아비 해결 표시', () => {
  it('해결한 줄(남은 문제 아님 · 👑 재대결 아님) = ✔ 해결 글자', () => {
    const s = rf1124('src/ui/dummy/Dummy.svelte', 'utf8');
    expect(s).toMatch(/\{#if !r\.need && !r\.bossNeed && \(r\.clear \|\| !!r\.st\)\}<b class="done" data-k="dummy-done"[^>]*>✔ 해결<\/b>/);
  });
});
