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
