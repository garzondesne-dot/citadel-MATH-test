// 🧪 베타 반 · 시험 계정 (#123): 함수 하나 isExcluded(반, 번호) · 체력 머릿수에서만 빠짐 (데미지 · 화면 · 규칙은 같음) · 가짜 명단 8반
import { describe, expect, it } from 'vitest';
import type { LessonPack, Room, Store } from '../src/model/types';
import pack from '../src/subjects/common-math2/lessons/set-06.json';
import { PROFILES } from '../src/model/profiles';
import { memoryStore } from '../src/store/device';
import { heartbeat, openRoom, roomPath } from '../src/raid/actions';
import { headcount } from '../src/raid/raid';
import { CLASSES, isBeta, isExcluded, isTester, roster } from '../src/school/school';

const L = pack as LessonPack;
describe('베타 반 · 시험 계정 (#123)', () => {
  it('가짜 명단 = 1-1 ~ 1-8 · 1-6 = 베타 반', () => {
    expect(CLASSES).toEqual(['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8']);
    expect(CLASSES.every((c) => roster(c).length === 15)).toBe(true);
    const S = memoryStore();
    expect(CLASSES.filter((c) => isBeta(S, c))).toEqual(['1-6']);
    S.set('school/cls/1-6/beta', false); S.set('school/cls/1-2/beta', true);
    expect(CLASSES.filter((c) => isBeta(S, c))).toEqual(['1-2']);
  });
  it('isExcluded = 베타 반 이거나 시험 계정 하나', () => {
    const S = memoryStore();
    S.set('school/test/1-3/7', true);
    expect(isTester(S, '1-3', 7)).toBe(true);
    expect(isExcluded(S, '1-3', 7)).toBe(true);
    expect(isExcluded(S, '1-3', 8)).toBe(false);
    expect(isExcluded(S, '1-6', 1)).toBe(true);
  });
  it('체력 머릿수 = 🧪 를 뺀 접속 학생 (최소 1)', () => {
    const S: Store = memoryStore();
    openRoom(S, L, 'B', PROFILES.class);
    heartbeat(S, 'B', 'a', 1, '가', { x: false }); heartbeat(S, 'B', 'b', 2, '나', { x: true }); heartbeat(S, 'B', 'c', 3, '다', { x: false });
    const R = S.get<Room>(roomPath('B')) as Room;
    expect(headcount(R, S.now())).toBe(2);
    const S2: Store = memoryStore(); openRoom(S2, L, 'C', PROFILES.class);
    heartbeat(S2, 'C', 'a', 1, '가', { x: true });
    expect(headcount(S2.get<Room>(roomPath('C')) as Room, S2.now())).toBe(1);
  });
});
