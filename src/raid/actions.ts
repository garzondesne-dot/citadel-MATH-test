import type { Given, LessonPack, Room, Store } from '../model/types';
import { record } from './raid';

// 방에서 하는 일 (쓰기) — 화면은 이 함수만 부르고, 그리는 쪽은 상태를 읽기만 한다
export const roomPath = (code: string) => `rooms/${code}`;

export function ensureRoom(S: Store, L: LessonPack, code: string): Room {
  const p = roomPath(code);
  const R = S.get<Room>(p);
  if (R && R.meta.lesson === L.id) return R;
  const fresh: Room = { meta: { code, lesson: L.id, version: 3, created: S.now() }, state: { step: 0 } };
  S.set(p, fresh);
  return fresh;
}

export function resetRoom(S: Store, L: LessonPack, code: string): void {
  S.set(roomPath(code), null);
  ensureRoom(S, L, code);
}

/** 학생 탭 들어옴 · 살아 있음 알림 (몇 초마다) */
export function heartbeat(S: Store, code: string, uid: string, num: number, nick: string): void {
  S.set(`${roomPath(code)}/players/${uid}`, { num, nick, seen: S.now() });
}
export function leave(S: Store, code: string, uid: string): void {
  S.set(`${roomPath(code)}/players/${uid}`, null);
}

/** 답 내기: 기회가 남아 있을 때만 · 시도 번호 = 지금까지 낸 수 */
export function submit(S: Store, L: LessonPack, code: string, mid: string, uid: string, given: Given[]): boolean {
  const R = S.get<Room>(roomPath(code));
  if (!R) return false;
  const rec = record(L, R, mid, uid);
  if (rec.submitted && !rec.canRetry) return false;
  S.set(`${roomPath(code)}/subs/${mid}/${uid}/${rec.nextAttempt}`, given);
  return true;
}
