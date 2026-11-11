import type { DungeonProfile, Given, LessonPack, Room, Store } from '../model/types';
import { rulesOf } from '../model/profiles';
import { BOSS_ID, bossState, isEnd, nextIdx, record, stepOf } from './raid';

// 방에서 하는 일 (쓰기) — 화면은 이 함수만 부르고, 그리는 쪽은 상태를 읽기만 한다
export const roomPath = (code: string) => `rooms/${code}`;
const getRoom = (S: Store, code: string) => S.get<Room>(roomPath(code));

/** 방 만들기 (다른 점 표 값을 meta 에 옮겨 적음) · 이미 같은 차시 · 같은 던전이면 그대로 */
export function openRoom(S: Store, L: LessonPack, code: string, P: DungeonProfile): Room {
  const R = getRoom(S, code);
  if (R && R.meta.lesson === L.id && R.meta.profile === P.key) return R;
  const fresh: Room = { meta: { code, lesson: L.id, version: 3, created: S.now(), ...rulesOf(P) }, state: { step: -1, stepAt: S.now() } };
  S.set(roomPath(code), fresh);
  return fresh;
}
/** 같은 던전으로 처음부터 */
export function resetRoom(S: Store, L: LessonPack, code: string, P: DungeonProfile): void {
  S.set(roomPath(code), null);
  openRoom(S, L, code, P);
}

/** 종합실 「다음 ▶」: 다음 단계로 (「다음 판에서」 자리는 건너뜀) */
export function nextStep(S: Store, L: LessonPack, code: string): void {
  const R = getRoom(S, code);
  if (!R || isEnd(L, R)) return;
  S.set(`${roomPath(code)}/state`, { ...R.state, step: nextIdx(L, R), stepAt: S.now() });
}
/** 종합실 「⚔ 등장!」: 정찰을 일찍 끝냄 */
export function appearNow(S: Store, L: LessonPack, code: string): void {
  const R = getRoom(S, code), st = R && stepOf(L, R);
  if (!R || !st) return;
  const id = st.kind === 'boss' ? BOSS_ID : st.id;
  S.set(`${roomPath(code)}/state/solveEnd/${id}`, S.now());
}

/** 학생 탭 들어옴 · 살아 있음 알림 (몇 초마다) */
export function heartbeat(S: Store, code: string, uid: string, num: number, nick: string): void {
  S.set(`${roomPath(code)}/players/${uid}`, { num, nick, seen: S.now() });
}
export function leave(S: Store, code: string, uid: string): void {
  S.set(`${roomPath(code)}/players/${uid}`, null);
}

/** 몬스터 답 내기: 기회가 남아 있을 때만 · 시도 번호 = 지금까지 낸 수 */
export function submit(S: Store, L: LessonPack, code: string, mid: string, uid: string, given: Given[]): boolean {
  const R = getRoom(S, code);
  if (!R) return false;
  const rec = record(L, R, mid, uid);
  if (rec.submitted && !rec.canRetry) return false;
  S.set(`${roomPath(code)}/subs/${mid}/${uid}/${rec.nextAttempt}`, given);
  return true;
}
/** 보스 문항 i 답 내기: 아직 못 맞혔고 기회가 남았을 때만 */
export function bossSubmit(S: Store, L: LessonPack, code: string, uid: string, i: number, given: Given): boolean {
  const R = getRoom(S, code);
  if (!R || !L.boss) return false;
  const s = bossState(L, R, uid)[i];
  if (!s || s.ok || s.left <= 0) return false;
  S.set(`${roomPath(code)}/bossTry/${uid}/${i}/${s.next}`, given);
  return true;
}
