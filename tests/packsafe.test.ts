// 🗑 차시 팩 지우기 · 다시 올리기 안전장치 (📜 2026-11-15 DECISIONS)
import { describe, expect, it } from 'vitest';
import { recordedN, slotDiff } from '../src/school/packUpload';
import { packOf } from '../src/engine/packs';

describe('🗑 차시 팩 안전장치', () => {
  it('① 그 차시 기록이 있는 학생 수 (배열 꼴 반 포함)', () => {
    const all = { '1-3': { 1: { 'set-06': {} }, 2: { 'set-07': {} } }, '1-4': [null, { 'set-06': {} }, { 'set-06': {} }] };
    expect(recordedN(all, 'set-06')).toBe(3); expect(recordedN(all, 'x')).toBe(0); expect(recordedN(null, 'set-06')).toBe(0);
  });
  it('② 같은 팩 = 차이 없음 · 몬스터를 빼거나 더하거나 형성평가 문항 수가 바뀌면 목록', () => {
    const L = packOf('set-06')!, same = JSON.parse(JSON.stringify(L));
    expect(slotDiff(L, same)).toBeNull();
    const m0 = L.steps.find((s) => s.kind === 'monster')!.id;
    const fewer = { ...same, steps: same.steps.filter((s: { id: string }) => s.id !== m0) };
    expect(slotDiff(L, fewer)).toEqual({ gone: [m0], added: [] });
    const moreBoss = { ...same, boss: { ...same.boss, items: (L.boss?.items ?? 0) + 1 } };
    expect(slotDiff(L, moreBoss)!.added).toEqual([`👑${(L.boss?.items ?? 0) + 1}`]);
  });
});
