// 🎬 덧영상 (📜 11/24 선생님 ❓ #6 A · DECISIONS 634af93): 71 → 12차시 c1 · 72 → 14차시 c1 · c2 · 73 → 14차시 c3 · 옛 영상 그대로
import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADDON_VIDS, applyAddon, vidDockLabel, vidNext, vidOf, vidsAt } from '../src/school/video';
import { packJson } from '../src/school/packExport';
import type { LessonPack } from '../src/model/types';

const p14 = () => ({ id: 'ex-14', no: 14, videos: { c1: 'rtdb:prep/ex-14/vid/v14-58', c2: 'rtdb:prep/ex-14/vid/v14-59', c3: 'rtdb:prep/ex-14/vid/v14-60', c4: 'rtdb:prep/ex-14/vid/v14-61' } }) as { id: string; no: number; videos: Record<string, string>; addVids?: Record<string, string> };

describe('🎬 덧영상', () => {
  it('배정 = 71 → 12 c1 · 72 → 14 c1 · c2 · 73 → 14 c3 · 파일이 앱 안에 있고 1MB 아래', () => {
    expect(ADDON_VIDS).toEqual({ 'ex-12': { c1: 'video/v12-71.mp4' }, 'ex-14': { c1: 'video/v14-72.mp4', c2: 'video/v14-72.mp4', c3: 'video/v14-73.mp4' } });
    for (const f of ['v12-71', 'v14-72', 'v14-73']) { const p = `public/video/${f}.mp4`; expect(existsSync(p)).toBe(true); expect(statSync(p).size).toBeLessThan(1_048_576); }
  });
  it('옛 영상은 그대로 · 둘째 열쇠 = 칸~2', () => {
    const P = p14(); applyAddon([P]);
    expect(P.videos.c1).toBe('rtdb:prep/ex-14/vid/v14-58');
    expect(vidsAt(P, 'c1')).toEqual([{ key: 'c1', n: 1 }, { key: 'c1~2', n: 2 }]);
    expect(vidOf(P, 'c1~2')).toBe('video/v14-72.mp4'); expect(vidOf(P, 'c3~2')).toBe('video/v14-73.mp4');
    expect(vidsAt(P, 'c4')).toEqual([{ key: 'c4', n: 0 }]); // 덧영상 없는 칸 = 단추 하나 그대로
    expect(vidsAt(P, 'm1')).toEqual([]);
  });
  it('리모컨 · 종합실 🎬 한 자리 = 끔 → 1 → 2 → 끔 · 하나면 켬 ↔ 끔', () => {
    const P = p14(); applyAddon([P]);
    expect([vidNext(P, 'c1', null), vidNext(P, 'c1', 'c1'), vidNext(P, 'c1', 'c1~2')]).toEqual(['c1', 'c1~2', null]);
    expect([vidDockLabel(P, 'c1', null), vidDockLabel(P, 'c1', 'c1'), vidDockLabel(P, 'c1', 'c1~2')]).toEqual(['영상 2편', '1 / 2', '2 / 2']);
    expect([vidNext(P, 'c4', null), vidNext(P, 'c4', 'c4'), vidDockLabel(P, 'c4', null)]).toEqual(['c4', null, '영상']);
    expect(vidNext(P, 'c2', 'c1~2')).toBeNull(); // 다른 칸 영상이 켜져 있으면 끔
  });
  it('다른 차시 · 팩 내보내기에는 안 섞임', () => {
    const o = { id: 'ex-13', videos: { c1: 'x' } } as { id: string; videos: Record<string, string>; addVids?: Record<string, string> }; applyAddon([o]); expect(o.addVids).toBeUndefined();
    const P = p14(); applyAddon([P]);
    const j = packJson({ ...(P as unknown as LessonPack), steps: [], monsters: {} }, false, [], {});
    expect('addVids' in j).toBe(false);
  });
});
