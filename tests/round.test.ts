// 첫 한 바퀴 규칙: 학생 2명 → 체력 ⌊2 × 4 × 90%⌋ = 7 · 맞힌 수만큼 깎임 · 0 이면 쓰러짐 · 기회 4번
import { describe, expect, it } from 'vitest';
import type { Given, LessonPack, Question, Room } from '../src/model/types';
import pack from '../src/packs/set-06-m1.json';
import { memoryStore } from '../src/store/device';
import { ensureRoom, heartbeat, roomPath, submit } from '../src/raid/actions';
import { cleared, itemsFor, monsterHp, record, variantOf } from '../src/raid/raid';

const L = pack as LessonPack;
const right = (qs: Question[]) => qs.map((q) => (q as Extract<Question, { type: 'multi' }>).answer.slice()) as Given[];
const wrong = (qs: Question[]) => qs.map(() => []) as Given[];

describe('첫 한 바퀴 (두 학생)', () => {
  it('체력 · 데미지 · 쓰러짐 · 기회', () => {
    const S = memoryStore();
    ensureRoom(S, L, 'T');
    heartbeat(S, 'T', 'a', 1, '학생 01');
    heartbeat(S, 'T', 'b', 2, '학생 02');
    const R = () => S.get<Room>(roomPath('T')) as Room;
    const now = S.now();
    expect(monsterHp(L, R(), 'm1', now).max).toBe(7);

    // a: 틀림 → 같은 문제 그대로 (v3)
    const q0 = itemsFor(L, R(), 'm1', 'a', 0);
    expect(submit(S, L, 'T', 'm1', 'a', wrong(q0))).toBe(true);
    expect(itemsFor(L, R(), 'm1', 'a', 1).map((q) => q.question)).toEqual(q0.map((q) => q.question));
    // a: 다 맞힘 → 데미지 4 → 남은 체력 3
    expect(submit(S, L, 'T', 'm1', 'a', right(q0))).toBe(true);
    expect(monsterHp(L, R(), 'm1', now).left).toBe(3);
    // a: 다 맞힌 뒤 = 새 판(판 2 · 연습 · 데미지 그대로)
    //   주의: 정식 생성기는 새 판이 우연히 교과서 숫자와 같을 수 있음 (시드 'T|a' 판 2 가 그 예) → 글이 아니라 판 번호로 확인
    expect(variantOf(L, R(), 'm1', 'a', 2)).toBe(2);
    expect(monsterHp(L, R(), 'm1', now).left).toBe(3);
    // b: 다 맞힘 → 쓰러짐
    expect(cleared(L, R(), 'm1', now)).toBe(false);
    submit(S, L, 'T', 'm1', 'b', right(itemsFor(L, R(), 'm1', 'b', 0)));
    expect(cleared(L, R(), 'm1', now)).toBe(true);
  });

  it('기회 4번을 다 쓰면 더 못 냄', () => {
    const S = memoryStore();
    ensureRoom(S, L, 'T');
    heartbeat(S, 'T', 'c', 1, '학생 01');
    for (let k = 0; k < 4; k++) expect(submit(S, L, 'T', 'm1', 'c', wrong(itemsFor(L, S.get<Room>('rooms/T') as Room, 'm1', 'c', k)))).toBe(true);
    const R = S.get<Room>('rooms/T') as Room;
    expect(record(L, R, 'm1', 'c').left).toBe(0);
    expect(submit(S, L, 'T', 'm1', 'c', wrong(itemsFor(L, R, 'm1', 'c', 4)))).toBe(false);
  });
});
