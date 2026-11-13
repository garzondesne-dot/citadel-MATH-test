// ⚙ 우리 학교 기능 = 스위치 틀 (V1-DESIGN 10절): 묶음 · 낱낱 스위치 · 잠김(필요한 것 없음) · 설정 없는 서버 = 🏰 전체
import { describe, expect, it } from 'vitest';
import { BUNDLES, FEATS, stateOf, wanted, lockOf, DEFAULT_CFG, type FeatId } from '../src/school/features.svelte';
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';

const S: Store = { ...memoryStore(), kind: 'memory', now: () => 0 } as Store;
describe('⚙ 스위치 틀', () => {
  it('설정 없음 = 🏰 전체 (우리 학교 그대로) · 모든 기능 켬', () => {
    for (const f of FEATS) expect(wanted(null, f.id)).toBe(true);
    expect(DEFAULT_CFG.bundle).toBe('full');
  });
  it('🪶 기본 = 모두 끔 · ⚔ 표준 = 용사 · 쉼터 · 몬스터 공격 · 🏰 전체 = 모두', () => {
    for (const f of FEATS) expect(wanted({ bundle: 'basic' }, f.id)).toBe(f.id === 'scarecrow' || f.id === 'board'); // 🪶 기본 = 뼈대 + 복습(🎯 · 📋)
    const std = BUNDLES.find((b) => b.id === 'standard')!.on;
    for (const id of ['hero', 'rest-balance', 'rest-defense', 'mon-attack'] as FeatId[]) expect(std).toContain(id);
    for (const id of ['forge', 'citadel', 'photo', 'contest'] as FeatId[]) expect(wanted({ bundle: 'standard' }, id)).toBe(false);
  });
  it('낱낱 스위치가 묶음보다 먼저 (더하고 뺌)', () => {
    expect(wanted({ bundle: 'basic', on: { forge: true } }, 'forge')).toBe(true);
    expect(wanted({ bundle: 'full', on: { hero: false } }, 'hero')).toBe(false);
  });
  it('잠김 = 켰지만 필요한 것 없음 → 채우는 길 한 줄 · 공통수학2 팩 = 모루 · 기호 톡 · OX 있음', () => {
    expect(lockOf(S, 'forge')).toBeNull(); expect(lockOf(S, 'symtalk')).toBeNull(); expect(lockOf(S, 'rest-ox')).toBeNull();
    expect(lockOf(S, 'photo')).toMatch(/AI/); expect(stateOf(S, null, 'photo')).toBe('locked');
    expect(stateOf(S, { bundle: 'basic' }, 'photo')).toBe('off');
    S.set('school/ai/on', true); expect(stateOf(S, null, 'photo')).toBe('on');
  });
});
import { bossAttacks } from '../src/raid/attacks';
import { packOf } from '../src/engine/packs';
import { SUBJ } from '../src/engine/subject';
describe('📚 과목 팩으로 옮긴 것 (⚙ 스위치 틀)', () => {
  it('던전 특수 공격 = 팩 specialAttacks[차시 번호] · 엔진엔 차시 번호 없음', () => {
    const L = packOf('set-06')!; expect(bossAttacks(L)).not.toContain('mirror');
    expect(bossAttacks({ ...L, no: 8 })).toContain('mirror'); expect(bossAttacks({ ...L, no: 9 })).toContain('lock'); expect(bossAttacks({ ...L, no: 10 })).toContain('scale');
  });
  it('파지직 기호 = 팩 glitchSyms', () => { expect(SUBJ.glitchSyms).toContain('∪'); });
});
import { applySchoolInfo, CLASSES, firstClass } from '../src/school/school';
import { BELLS, PERIODS } from '../src/school/bells';
describe('🏫 학교 정보 = school/info (반 목록 · 교시 · 처음 반)', () => {
  it('바꾸면 그 자리에서 · 없으면 우리 학교 값으로 되돌림', () => {
    const b0 = structuredClone(BELLS), p0 = structuredClone(PERIODS), base = { bells: b0, periods: p0 };
    applySchoolInfo({ classes: ['2-1', '2-2'], bells: { 1: ['08:40', '09:25'] }, periods: { 1: [1] } }, BELLS, PERIODS, base);
    expect(CLASSES).toEqual(['2-1', '2-2']); expect(firstClass()).toBe('2-1'); expect(BELLS[1]).toEqual(['08:40', '09:25']); expect(BELLS[2]).toBeUndefined(); expect(PERIODS[1]).toEqual([1]);
    applySchoolInfo(null, BELLS, PERIODS, base);
    expect(CLASSES).toHaveLength(8); expect(firstClass()).toBe('1-1'); expect(BELLS).toEqual(b0); expect(PERIODS).toEqual(p0);
  });
});
