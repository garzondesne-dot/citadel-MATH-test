// 📥 #111 스킬 도감 「도감 넣기」 = v4 띠 9개가 게임 기본 (폰 · TV · 게시판 · 허수아비 · 캠프 = spec 하나) · 갤러리 「옛 것」 = 옛 띠
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { isNewFx, isV4, setNewFx, spec } from '../src/ui/fx/fx';
const PICK: Record<string, string> = { slash: 'slash-a', twin: 'twin-x', cyclone: 'cyclone-a', pillar: 'pillar-mix', thunder: 'thunder-mix', vortex: 'vortex-a', void: 'void-a', wave: 'wave-a', tsunami: 'tsunami-b' };
describe('📥 #111 v4 띠', () => {
  it('9개 = pfx4 새 띠 · 파일 있음 · 맞는 칸 · 기준점 · Pixi 새 엔진(isNewFx) 안 씀', () => {
    setNewFx('auto');
    for (const [k, nm] of Object.entries(PICK)) {
      const sp = spec(k)!; expect(sp.src, k).toBe(`pfx4/sk4-${nm}-v1.webp`); expect(isV4(k)).toBe(true); expect(isNewFx(k)).toBe(false);
      expect(existsSync(`public/art/${sp.src}`), k).toBe(true); expect(sp.pk!).toBeLessThan(sp.n); expect(sp.px).toBeLessThanOrEqual(sp.w); expect(sp.py).toBeLessThanOrEqual(sp.h);
    }
    expect(spec('flame')!.src).toMatch(/^pfx\//); // 다른 스킬 = 그대로
  });
  it('갤러리 「옛 것」 = 옛 띠', () => { setNewFx(false); expect(spec('pillar')!.src).toBe('pfx/fx-pillar-v1.webp'); expect(isV4('twin')).toBe(false); setNewFx('auto'); });
});
