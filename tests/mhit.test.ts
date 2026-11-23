// 👹 #26 몬스터 맞는 그림 짝 (manifest mhitOf · mhit-map.json · 📜 2026-11-20 「초안 그대로」)
import { describe, expect, it } from 'vitest';
import { MHIT, MHIT_FLIP, MHIT_KINDS, MHIT_NOGROW, mhitOf, mhitUrl } from '../src/ui/manifest';
import MAP from '../src/subjects/common-math2/mhit-map.json';

describe('👹 맞는 그림 짝', () => {
  it('짝 표 164줄(옛 130 + 배정표 새 이름 34) · 종류는 10가지 안', () => {
    const v = Object.values(MAP as Record<string, string>);
    expect(v.length).toBe(164);
    expect(v.every((k) => (MHIT_KINDS as string[]).includes(k))).toBe(true);
  });
  it('시트줄 + 이름으로 찾음 · 랜덤 던전 이름 · 없는 그림 = smash', () => {
    expect(mhitOf('extra4:0')).toBe((MAP as Record<string, string>)['extra4|자수정 박쥐']);
    expect(mhitOf('d01:0')).toBe((MAP as Record<string, string>)['d01|이끼 슬라임'] ?? 'smash');
    expect(mhitOf('d03:1')).toBe((MAP as Record<string, string>)['d03|고드름 박쥐']); expect(mhitOf('bg1:0')).toBe((MAP as Record<string, string>)['d03👑|서리 여왕'] ?? (MAP as Record<string, string>)['d03|서리 여왕'] ?? 'smash'); expect(mhitOf('extra6:0@h300')).toBe((MAP as Record<string, string>)['extra6|서리 늑대']);
    expect(mhitOf('없는그림:0')).toBe('smash');
    expect(mhitOf('')).toBe('smash');
  });
  it('📜 11/24 배정표 그대로 (이름 → 효과 · 코드 이름 bolt = 번개 · smash = 내려찍기 · ram = 돌진 · lash = 초승달)', () => {
    const M = MAP as Record<string, string>;
    expect(M['base0|수정 슬라임']).toBe('poison'); expect(M['base1|바위 골렘']).toBe('smash'); expect(M['base2|성채 드래곤']).toBe('fire');
    expect(M['new3|번개 독수리']).toBe('bolt'); expect(M['new9|별빛 해파리']).toBe('bolt'); expect(M['extra0|에메랄드 멧돼지']).toBe('ram'); expect(M['extra4|자수정 박쥐']).toBe('lash');
    expect(M['crown9|청록 수정룡']).toBe('beam'); expect(M['mirrorboss80|부정의 수정 여왕']).toBe('ice');
    expect(mhitOf('base0:0')).toBe('poison'); expect(mhitOf('extra2:0')).toBe('beam');
  });
  it('재생 규칙: 6칸 · 80ms · 최대 3번째 · 0.8배 · 반전 5종 · 번개 · 광선 안 키움 · 새 그림 v2', () => {
    expect(MHIT.ms / MHIT.frames).toBe(80); expect(MHIT.peak).toBe(160); expect(MHIT.size).toBe(0.8);
    expect([...MHIT_FLIP].sort()).toEqual(['beam', 'fire', 'lash', 'poison', 'ram']);
    expect([...MHIT_NOGROW].sort()).toEqual(['beam', 'bolt']);
    expect(mhitUrl('bolt')).toMatch(/mhit-bolt-v2\.webp$/);
  });
});
