// 🧩 빠진 수업 기록 채우기 (🐞 11/26 선생님 「수업 종료를 안 누르면 대시보드 기록이 누락돼」 · 머리 🔨)
//   원인 = 반 전체 기록(records/{반}/{번호}/{차시})은 수업이 닫힐 때 한 번에 씀 · 수업 시간이 끝나 종합실 TV 가 닫으면 TV 는 학생 기록을 쓸 권한이 없어(규칙 = 교사 · 본인만) 조용히 실패
//   고침 = 교사 로그인한 기기(교사 폰 · 교사 로그인 PC)가 「닫혔는데 반 기록을 아직 안 쓴 방」(state.recAt 없음)을 찾아 그 자리에서 씀 → recAt 표시
//     · 교사 앱이 켜질 때 · 2분마다 · 대시보드를 열 때 · 다음 수업을 열 때 / 닫히지 않은 채 3시간 넘게 멈춘 방(오늘 수업이 아닌) = 닫고 씀
//   ⚠ 지난 수업(이 판이 나오기 전)은 건드리지 않음 = since(이 판 시각) 뒤에 연 방만 · 지난 것은 선생님 말씀 뒤 따로
import type { LessonPack, Room, Store } from '../model/types';
import { classRecords } from './records';
import { withCarry, carryOfRoom } from './carry';
import { endClass, roomPath } from '../raid/actions';
import { isLobby } from '../raid/raid';

/** 이 판부터 연 수업만 저절로 (그 전 수업 = 선생님 말씀 뒤) — 2026-11-26 KST 25:30 */
export const RECFILL_SINCE = Date.UTC(2026, 10, 26, 16, 30);
/** 닫히지 않은 채 멈춘 방을 닫는 때 (마지막 진행 뒤) */
export const STALE_MS = 3 * 3600e3;
const isAdm = (S: Store) => S.kind !== 'server' || !!(S as Store & { isAdmin?: () => boolean }).isAdmin?.();
const startOf = (R: Room) => Number((R.meta as { t0?: number }).t0) || Number(R.state?.stepAt) || 0;

/** 채울 방인가 (닫힘 · 반 수업 · 대기실 아님 · 반 기록 아직 · since 뒤) */
export function needFill(R: Room | null | undefined, since = RECFILL_SINCE): boolean {
  if (!R?.meta?.cls || !R.state?.closed || isLobby(R)) return false;
  if ((R.state as { recAt?: number }).recAt) return false;
  if ((R.meta as { profile?: string }).profile === 'test' || R.meta.cls === 'test') return false;
  return startOf(R) >= since;
}
/** 닫아야 할 멈춘 방인가 (지금 수업이 아님 · 3시간 넘게 진행 없음) */
export function isStale(R: Room | null | undefined, now: number, liveCode: string | null, code: string, since = RECFILL_SINCE): boolean {
  if (!R?.meta?.cls || R.state?.closed || code === liveCode || R.meta.cls === 'test') return false;
  const last = Number(R.state?.stepAt) || startOf(R);
  return startOf(R) >= since && now - last > STALE_MS;
}
/** 한 바퀴: 멈춘 방 닫기 + 빠진 반 기록 쓰기 → 채운 방 수 (교사 로그인 기기만) */
export async function fillRecords(S: Store, packs: readonly LessonPack[], since = RECFILL_SINCE, only?: readonly string[]): Promise<number> {
  if (!isAdm(S)) return 0;
  // 후보 = 반마다 마지막 수업 방(school/last/{반}.code) + 지금 수업(school/live) — 다음 수업을 열기 직전에도 돌아서 바뀌기 전에 채움 · 방 전체를 읽지 않음(무거움)
  const lastAll = (S.fetch ? await S.fetch<Record<string, { code?: string }>>('school/last').catch(() => null) : S.get<Record<string, { code?: string }>>('school/last')) || {};
  const live = S.get<{ code?: string }>('school/live')?.code ?? null, now = S.now();
  const codes = only ? [...only] : [...new Set([...Object.values(lastAll).map((v) => v?.code).filter((c): c is string => !!c), ...(live ? [live] : [])])];
  let n = 0;
  for (const code of codes) {
    const R0 = (S.fetch ? await S.fetch<Room>(roomPath(code)).catch(() => null) : null) ?? S.get<Room>(roomPath(code)); if (!R0) continue;
    const base = R0 && packs.find((p) => p.id === R0.meta?.lesson); if (!base) continue;
    const L = withCarry(base, carryOfRoom(S, code), packs as LessonPack[]);
    if (isStale(R0, now, live, code, since)) endClass(S, L, code); // 닫으면서 반 기록도 씀(교사 기기)
    const R = S.get<Room>(roomPath(code)) ?? R0;
    if (!needFill(R, since)) continue;
    const k = await classRecords(S, L, R, code).catch(() => -1);
    if (k >= 0) { S.set(`${roomPath(code)}/state/recAt`, S.now()); n++; }
  }
  return n;
}

/** 🧩 지난 수업 한 번 채우기 (📜 선생님 「지난 수업 기록 채워」 · 이 판 전 · TV 가 닫아 반 기록이 빠진 수업 = 운영 읽기로 찾은 5개 · 2026-11-26) — 교사 ⚙ 단추 한 번 · 다 하면 school/recFillPast = 시각 */
export const RECFILL_PAST = ['926576', '379092', '758258', '294683', '624623'] as const;
export const RECFILL_PAST_DONE = 'school/recFillPast';
export async function fillPast(S: Store, packs: readonly LessonPack[]): Promise<number> {
  const n = await fillRecords(S, packs, 0, RECFILL_PAST);
  S.set(RECFILL_PAST_DONE, { at: S.now(), n }); return n;
}
