// 📜 문제 칸 양피지 = 기본값 켬 (2026-11-15 머리 🔨): 저장값 없음 = 켬 · '0' = 끔 그대로 · '1' = 켬 · 저장 막힘 = 켬
import { describe, expect, it } from 'vitest';
import { savedPaper } from '../src/theme/theme';

const fake = (v: string | null, boom = false) => { (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: () => { if (boom) throw new Error('막힘'); return v; } }; };
describe('📜 양피지 기본 켬', () => {
  it('저장값 없음 → 켬 · 0 → 끔 · 1 → 켬 · 막힘 → 켬', () => {
    fake(null); expect(savedPaper()).toBe(true);
    fake('0'); expect(savedPaper()).toBe(false);
    fake('1'); expect(savedPaper()).toBe(true);
    fake(null, true); expect(savedPaper()).toBe(true);
  });
});
