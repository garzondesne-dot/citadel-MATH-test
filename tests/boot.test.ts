// 🚶 💡 로딩 첫 화면 (📜 2026-11-16 · DECISIONS 「⏳ 로딩 화면 = 걷는 용사 + 한 줄 팁」)
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { tipsOn } from '../src/boot';
import { BUNDLES, wanted, type FeatId } from '../src/school/features.svelte';

describe('🚶 로딩 화면', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  it('팁 12개 = index.html 한 곳 · 4초마다 · 걷기 = 1줄 4칸 · 8초 새로 고침 그대로', () => {
    const m = html.match(/var BT = \[(.*?)\];/);
    expect(m).toBeTruthy();
    expect(JSON.parse(`[${m![1]!.replace(/'/g, '"')}]`)).toHaveLength(12);
    expect(html).toContain('4000');
    expect(html).toContain('steps(4)');
    expect(html).toContain('background-position: 0 -128px');
    expect(html).toContain('🔄 새로 고침');
    expect(html).toContain('8000');
  });
  it('모두 켬 = 12개 · 꺼진 기능의 팁은 빠짐', () => {
    expect(tipsOn(() => true)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const off = (x: FeatId[]) => (id: FeatId) => !x.includes(id);
    expect(tipsOn(off(['help3']))).not.toContain(3);
    expect(tipsOn(off(['scarecrow']))).not.toContain(5);
    expect(tipsOn(off(['stamp', 'citadel', 'forge']))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 12]);
  });
  it('🪶 가볍게(학교판 처음) = 늘 맞는 팁 + 허수아비', () => {
    const c = { bundle: BUNDLES[0]!.id };
    expect(tipsOn((id) => wanted(c, id))).toEqual([1, 4, 6, 12]);
  });
});
