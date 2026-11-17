// 📜 #38 ① 서술 조각 = 결과가 저장되는 자리에서 (사진 통과 · 선생님 ✔) · 문제당 한 번 · 성채 문항 빼고
import { describe, expect, it } from 'vitest';
import type { Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { markPhoto, passScroll } from '../src/school/photo';
import { addCastles, castles } from '../src/school/castles.svelte';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
describe('📜 #38 서술 조각 지급 자리', () => {
  it('사진 통과 = 그 자리에서 ult 선물 1 · 두 번째 = 없음', () => {
    const S = mk();
    expect(passScroll(S, '1-2', 3, 'set-09', 'm5')).toBe(true);
    expect(S.get('gifts/s1_2_3/ult_set-09_m5')).toMatchObject({ s: 1, g: 0 });
    expect(passScroll(S, '1-2', 3, 'set-09', 'm5')).toBe(false);
  });
  it('선생님 ✔ = 교사 폰이 ult 선물 · ✖ = 없음 · 성채 문항 = 없음', async () => {
    const S = mk();
    await markPhoto(S, { c: '1-5', n: '5', k: 'set-10_m4', id: 'r1' } as never, true);
    expect(S.get('gifts/s1_5_5/ult_set-10_m4')).toMatchObject({ s: 1 });
    await markPhoto(S, { c: '1-5', n: '3', k: 'set-10_m4', id: 'r2' } as never, false);
    expect(S.get('gifts/s1_5_3/ult_set-10_m4')).toBeNull();
    addCastles([{ kind: 'castle', id: 'eval-1', floor: 1, title: 't', unit: 'u', bossPct: 60, rooms: [], raw: {} }]);
    await markPhoto(S, { c: '1-1', n: '5', k: 'eval-1_q07', id: 'r3' } as never, true);
    expect(S.get('gifts/s1_1_5/ult_eval-1_q07')).toBeNull();
    castles.list = [];
  });
});
