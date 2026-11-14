// 📕 held = 그 반이 게임으로 수업한 차시 (정식 actions.js · 🔁 연속 참여 💎 의 기준) — 수업 시작 때 적고 🧪 테스트 수업은 안 적음
import { describe, expect, it } from 'vitest';
import type { Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { nextStep, openRoom } from '../src/raid/actions';
import { packOf } from '../src/engine/packs';

describe('📕 held (수업한 차시)', () => {
  const L = packOf('set-06@7')!;
  it('실제 수업 시작 = held/{반}/{차시} = true', () => {
    const S: Store = { ...memoryStore(), kind: 'memory' };
    openRoom(S, L, 'H1', PROFILES.test); S.set('rooms/H1/meta/cls', '1-3'); S.set('school/live', { code: 'H1', cls: '1-3', lesson: L.id });
    nextStep(S, L, 'H1');
    expect(S.get(`held/1-3/${L.id}`)).toBe(true);
  });
  it('🧪 테스트 수업 = 안 적음', () => {
    const S: Store = { ...memoryStore(), kind: 'memory' };
    openRoom(S, L, 'H2', PROFILES.test); S.set('rooms/H2/meta/cls', '1-3'); S.set('school/live', { code: 'H2', cls: '1-3', lesson: L.id, test: true });
    nextStep(S, L, 'H2');
    expect(S.get('held/1-3')).toBeNull();
  });
});
