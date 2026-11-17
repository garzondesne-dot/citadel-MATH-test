// 📝 #35 형성평가 불참 대책 A · B · C (📜 2026-11-17 선생님 「ABC 추천대로 진행」)
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { packOf } from '../src/engine/packs';
import { bossSubmitAll, endClass, goBoss, openRoom, roomPath } from '../src/raid/actions';
import { bossIdx, bossClock, bossOpened, classEnd, lastLessonPath, prevPending, stampBlocked } from '../src/school/formative';
import { bossRecord, bossItem, answerOf, stepIdx } from '../src/raid/raid';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
const L = packOf('set-09')!;
const room = (S: Store, code: string) => S.get<Room>(roomPath(code))!;
const at = (S: Store, code: string, i: number) => S.set(`${roomPath(code)}/state/step`, i);

describe('📝 #35 형성평가 불참 대책', () => {
  it('B · 형성평가를 연 수업에서 제출 안 함 = 도장 막음 · 제출하면 풀림 · 열기 전 · 🎯 보낸 형성평가 = 막지 않음', () => {
    const S = mk(); openRoom(S, L, 'F1', PROFILES.class); S.set(`${roomPath('F1')}/meta/cls`, '1-3');
    at(S, 'F1', 2); expect(stampBlocked(L, room(S, 'F1'), 's1_3_1')).toBe(false);
    at(S, 'F1', bossIdx(L)); expect(bossOpened(L, room(S, 'F1'))).toBe(true); expect(stampBlocked(L, room(S, 'F1'), 's1_3_1')).toBe(true);
    const R = room(S, 'F1'), r = bossRecord(L, R, 's1_3_1');
    const g = Object.fromEntries(r.todo.map((i) => [i, answerOf(bossItem(L, R, 's1_3_1', i, r.next(i))!)]));
    expect(bossSubmitAll(S, L, 'F1', 's1_3_1', g)).toBe(true);
    expect(stampBlocked(L, room(S, 'F1'), 's1_3_1')).toBe(false);
    S.set(`${roomPath('F1')}/state/sent/boss`, S.now()); expect(stampBlocked(L, room(S, 'F1'), 's1_3_2')).toBe(false);
  });
  it('C · 남은 시간 ≤ 형성평가 문항 × 1 + 3분 · 형성평가 전만 · 「지금 열기」 = 남은 몬스터 🎯 → 형성평가 단계', () => {
    const S = mk(); openRoom(S, L, 'F2', PROFILES.class); S.set(`${roomPath('F2')}/meta/t0`, S.now()); at(S, 'F2', 2);
    const R = room(S, 'F2'), end = classEnd(R);
    expect(bossClock(L, R, end - 30 * 60e3)).toBeNull();
    const c = bossClock(L, R, end - 7 * 60e3); expect(c?.need).toBe(4 + 3); expect(c?.left).toBe(7);
    goBoss(S, L, 'F2');
    const R2 = room(S, 'F2'); expect(stepIdx(R2)).toBe(bossIdx(L));
    expect(Object.keys((R2.state as { sent?: Record<string, number> }).sent || {}).sort()).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'].filter((m) => L.steps.findIndex((s) => s.id === m) >= 2));
    expect(bossClock(L, R2, end - 1 * 60e3)).toBeNull(); // 이미 열림
  });
  it('A · 수업 닫을 때 그 반 마지막 수업 기록 → 다음 수업 미제출 = 수업 · 허수아비 모두 안 낸 번호', async () => {
    const S = mk(); openRoom(S, L, 'F3', PROFILES.class); S.set(`${roomPath('F3')}/meta/cls`, '1-3'); at(S, 'F3', bossIdx(L));
    const R = room(S, 'F3'), r = bossRecord(L, R, 's1_3_1');
    bossSubmitAll(S, L, 'F3', 's1_3_1', Object.fromEntries(r.todo.map((i) => [i, ''])));
    S.set('bonus/1-3/3/set-09/boss', { tries: 1, at: 1 }); // 3번 = 허수아비에서 냄
    S.set('records/1-3/4/set-09', { bossM: 'oxoo' }); // 4번 = 수업 기록에 있음
    endClass(S, L, 'F3');
    expect(S.get<{ lesson: string; boss: boolean }>(lastLessonPath('1-3'))).toMatchObject({ lesson: 'set-09', boss: true, code: 'F3' });
    const p = await prevPending(S, '1-3', false, 'set-10', [1, 2, 3, 4, 5]);
    expect(p?.nums).toEqual([2, 5]);
    expect(await prevPending(S, '1-3', false, 'set-09', [1, 2])).toBeNull(); // 같은 차시 = 안 보임
  });
});
