// 🐞 11/20 ③ 반쪽 데이터: 서버 값이 비거나 반만 와도 화면이 읽기 전에 거름 (store/tidy.ts)
import { describe, expect, it } from 'vitest';
import { halfRoom, tidy } from '../src/store/tidy';

const room = { state: { step: 0 }, meta: { lesson: 'set-01' }, players: { a: { nick: '1번', num: 1, seen: 1 }, ghost: { seen: 5 }, bad: 3 } };
describe('③ 반쪽 데이터', () => {
  it('state · meta 없는 방 = 없음 · 배열 · 글자 방도 없음', () => {
    expect(tidy(['rooms', 'X'], { players: { a: { seen: 1 } } })).toBeNull();
    expect(tidy(['rooms', 'X'], { state: { step: 0 } })).toBeNull();
    expect(tidy(['rooms', 'X'], 'oops')).toBeNull();
    expect(halfRoom({ state: 1, meta: {} })).toBe(true);
  });
  it('방 안 seen 만 남은 사람 줄 · 숫자 줄 = 뺌 (TV · 대기실 이름표가 undefined 로 터지지 않게)', () => {
    const r = tidy(['rooms', 'X'], room) as typeof room;
    expect(Object.keys(r.players)).toEqual(['a']);
    expect(Object.keys(tidy(['rooms', 'X', 'players'], room.players) as object)).toEqual(['a']);
  });
  it('방 목록 = 반쪽 방 빼고 · 나머지 방도 사람 줄 거름', () => {
    const all = tidy(['rooms'], { A: room, B: { players: {} }, C: null }) as Record<string, typeof room>;
    expect(Object.keys(all)).toEqual(['A']); expect(Object.keys(all.A!.players)).toEqual(['a']);
  });
  it('방 밖 칸 = 그대로', () => { const v = { x: 1 }; expect(tidy(['gem', '1-1', '3'], v)).toBe(v); });
});
