import type { DungeonProfile, Given, LessonPack, Room, Store } from '../model/types';
import { rulesOf } from '../model/profiles';
import { BOSS_ID, bossState, chainRecord, isChain, isEnd, nextIdx, plainRecord, PRAC_MAX, pracUsed, stepOf } from './raid';

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

/** 학생 탭 들어옴 · 살아 있음 알림 (몇 초마다) — 🔥 한 판 더 판 수(pr)는 지킴 */
export function heartbeat(S: Store, code: string, uid: string, num: number, nick: string): void {
  const base = `${roomPath(code)}/players/${uid}`;
  S.set(`${base}/num`, num); S.set(`${base}/nick`, nick); S.set(`${base}/seen`, S.now());
}
export function leave(S: Store, code: string, uid: string): void {
  S.set(`${roomPath(code)}/players/${uid}`, null);
}

/** 몬스터 답 내기: 기회가 남아 있을 때만 · 시도 번호 = 지금까지 낸 수 */
export function submit(S: Store, L: LessonPack, code: string, mid: string, uid: string, given: Given[]): boolean {
  const R = getRoom(S, code);
  if (!R) return false;
  if (isChain(L, R, mid)) return false; // 소레이드는 chainSubmit
  const rec = plainRecord(L, R, mid, uid);
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

// ── ⚔ 소레이드 (정식 actions.chainSubmit · pracStart · chainRelease) ──
/** 단계 답 한 줄 내기: s = 단계 · p = 판 · w = 1 이면 💡 근거 빈칸 답 · 막히면 이유 글을 돌려줌 */
export function chainSubmit(S: Store, L: LessonPack, code: string, mid: string, uid: string, s: number, p: number, g: Given, w?: 1): string | null {
  const R = getRoom(S, code);
  if (!R || !isChain(L, R, mid)) return '소레이드가 아니에요';
  const rec = chainRecord(L, R, mid, uid);
  if (p > PRAC_MAX) return `🔥 연습은 ${PRAC_MAX}번까지예요`;
  if (p && !w && rec.pass === p && rec.pFail) return '이번 연습 판은 기회를 다 썼어요';
  if (!p && (rec.locked || rec.fail || rec.done)) return rec.locked ? '🙋 선생님 확인을 기다려요' : '이 문제는 끝났어요';
  S.set(`${roomPath(code)}/chain/${mid}/${uid}/${rec.nextK}`, { s, p: p || 0, g: g == null ? '' : g, ...(w ? { w: 1 } : {}) });
  return null;
}
/** 🔥 한 판 더 시작 = 셈 (도중에 그만둬도) · PRAC_MAX 넘으면 막음 → 새 판 번호 (막히면 0) */
export function pracStart(S: Store, L: LessonPack, code: string, mid: string, uid: string): number {
  const R = getRoom(S, code);
  if (!R) return 0;
  const used = pracUsed(R, mid, uid, chainRecord(L, R, mid, uid));
  if (used >= PRAC_MAX) return 0;
  S.set(`${roomPath(code)}/players/${uid}/pr/${mid}`, used + 1);
  return used + 1;
}
/** 🙋 종합실 「✔ 풀어주기」: 기회 1칸 남은 학생의 잠김을 풂 */
export function chainRelease(S: Store, code: string, mid: string, uid: string): void {
  S.set(`${roomPath(code)}/chainOk/${mid}/${uid}`, true);
}
