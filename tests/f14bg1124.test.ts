// 🎨 f14-bg (📜 11/24 머리 🔨): 14차시(ex-14) 서버 팩 theme 04-mine → 앱이 14-chainmine 배경으로 덮음 · 팩 파일로 내보낼 땐 옛 theme 그대로
import { describe, expect, it } from 'vitest';
import { applyAddon } from '../src/school/video';
import { DUNGEONS } from '../src/ui/manifest';
import { packJson } from '../src/school/packExport';
describe('🎨 14차시 배경', () => {
  it('ex-14 · theme 04-mine = 14-chainmine · 다른 차시 · 선생님이 바꾼 theme 은 그대로', () => {
    const a = [{ id: 'ex-14', theme: '04-mine' }, { id: 'set-08', theme: '04-mine' }, { id: 'ex-14b', theme: '04-mine' }], b = [{ id: 'ex-14', theme: '07-volcano' }];
    applyAddon(a); applyAddon(b);
    expect(a.map((p) => p.theme)).toEqual(['14-chainmine', '04-mine', '04-mine']); expect(b[0]!.theme).toBe('07-volcano');
    expect(DUNGEONS['14-chainmine']).toBe('art/dg-14-chainmine-v1h.webp');
  });
  it('팩 내보내기 = 옛 theme', () => {
    const L = { id: 'ex-14', no: 14, title: 't', theme: '14-chainmine', steps: [] } as never;
    expect((packJson(L, false, [], {}) as { theme?: string }).theme).toBe('04-mine');
  });
});
