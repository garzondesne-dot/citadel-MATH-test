// 📵 · 📶✕ 끊김 두 갈래 (📜 11/24 ❓ #10 C · DECISIONS c90bc05): 폰이 「나감」을 적음(seen 0) = 📵 화면 꺼짐 · 다른 앱 / 소식만 끊김 = 📶✕ 연결
import { describe, expect, it } from 'vitest';
import { HIDE_GRACE, offIcon, offKind } from '../src/raid/raid';
import type { Room } from '../src/model/types';

describe('📵 📶✕', () => {
  const R = { players: { a: { num: 1, nick: 'a', seen: 0 }, b: { num: 2, nick: 'b', seen: 123 } } } as unknown as Room;
  it('seen 0 = 📵 화면 꺼짐 · 다른 앱 · 남은 시각 = 📶✕ 연결 끊김', () => {
    expect([offKind(R, 'a'), offKind(R, 'b')]).toEqual(['scr', 'net']);
    expect([offIcon('scr'), offIcon('net')]).toEqual(['📵', '📶✕']);
  });
  it('방에 없는 학생 = 📶✕ (안 옴 판정은 리모컨이 따로)', () => { expect(offKind(R, 'z')).toBe('net'); });
  it('화면 숨김 유예 = 30초 (❓ #10 B)', () => { expect(HIDE_GRACE).toBe(30_000); });
});
