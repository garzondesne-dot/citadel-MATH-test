// 👹 #26 몬스터 맞는 그림 짝 (manifest mhitOf · mhit-map.json · 📜 2026-11-20 「초안 그대로」)
import { describe, expect, it } from 'vitest';
import { MHIT_KINDS, mhitOf } from '../src/ui/manifest';
import MAP from '../src/subjects/common-math2/mhit-map.json';

describe('👹 맞는 그림 짝', () => {
  it('짝 표 130마리 · 종류는 10가지 안', () => {
    const v = Object.values(MAP as Record<string, string>);
    expect(v.length).toBe(130);
    expect(v.every((k) => (MHIT_KINDS as string[]).includes(k))).toBe(true);
  });
  it('시트줄 + 이름으로 찾음 · 랜덤 던전 이름 · 없는 그림 = smash', () => {
    expect(mhitOf('extra4:0')).toBe((MAP as Record<string, string>)['extra4|자수정 박쥐']);
    expect(mhitOf('d01:0')).toBe((MAP as Record<string, string>)['d01|이끼 슬라임'] ?? 'smash');
    expect(mhitOf('d03:1')).toBe((MAP as Record<string, string>)['d03|고드름 박쥐']); expect(mhitOf('bg1:0')).toBe((MAP as Record<string, string>)['d03👑|서리 여왕'] ?? (MAP as Record<string, string>)['d03|서리 여왕'] ?? 'smash'); expect(mhitOf('extra6:0@h300')).toBe((MAP as Record<string, string>)['extra6|서리 늑대']);
    expect(mhitOf('없는그림:0')).toBe('smash');
    expect(mhitOf('')).toBe('smash');
  });
});
