// 🌊 파도 레이드에서 가져온 것 (📜 2026-11-16 · DECISIONS 🌊 · 머리 🔨)
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Room, Store } from '../src/model/types';
import { giveStamp, stamped } from '../src/raid/actions';

const store = (): Store => ({ ...memoryStore(), kind: 'memory' as const });
describe('⑤ ✅ 도장 📜', () => {
  it('한 수업에 한 번 · 📜 +1 = gifts · 표시 = rooms/…/stamp · 다른 수업은 따로', () => {
    const S = store(); S.set('rooms/K1', { meta: {}, state: { step: 0 } });
    expect(giveStamp(S, 'K1', 's1_1_3')).toBe(true);
    expect(giveStamp(S, 'K1', 's1_1_3')).toBe(false);
    expect(stamped(S.get<Room>('rooms/K1'), 's1_1_3')).toBe(true);
    expect(stamped(S.get<Room>('rooms/K1'), 's1_1_4')).toBe(false);
    expect(S.get('gifts/s1_1_3/stamp_K1')).toMatchObject({ g: 0, s: 1, fun: '✅ 도장', code: 'K1' });
    expect(giveStamp(S, 'K2', 's1_1_3')).toBe(true);
    expect(Object.keys(S.get<Record<string, unknown>>('gifts/s1_1_3')!)).toEqual(['stamp_K1', 'stamp_K2']);
  });
});
