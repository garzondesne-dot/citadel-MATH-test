import { describe, expect, it } from 'vitest';
import { FAMS } from '../src/model/hero';
import { LAYER_FX } from '../src/ui/fx/layer';
// ✨ 맞는 순간 겹 (📜 2026-11-14 👍 30): 목록의 스킬이 모두 진짜 스킬 · 계열이 있음
describe('맞는 순간 겹 👍 30', () => {
  const ids = new Set([...FAMS.flatMap((f) => f.ids), 'wings', 'smite']);
  it('30개', () => expect(LAYER_FX.size).toBe(30));
  it('모두 있는 스킬', () => { for (const k of LAYER_FX) expect(ids.has(k), k).toBe(true); });
});
