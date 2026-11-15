// 🎯 진도를 다 못 나간 문제 = A 복습으로 보내기 (📜 2026-11-16 선생님 「진행」 · DECISIONS 「🎯 진도를 다 못 나간 문제」)
//   리모컨 「🎯 복습으로 보내기」(남은 몬스터 전부 / 하나씩 · 👑 형성평가도) · 수업을 닫을 때 남은 몬스터 = 저절로
//   방 state.sent = { 몬스터 단계 id | 'boss': 보낸 시각 } → 수업에서 건너뜀(nextIdx) · 기록 = 's'(수업에서 넘어온 문제) → 🎯 허수아비 「📚 수업에서 넘어온 문제」 · 👑 「⭐ 꼭 풀기」
import type { LessonPack, Room, Store, Step } from '../model/types';
import { cleared, bossHp, stepIdx } from '../raid/raid';

export const SENT_BOSS = 'boss';
export const sentKey = (s: Step) => (s.kind === 'boss' ? SENT_BOSS : s.id);
export const sentOf = (R: Room | null | undefined): Record<string, number> => (R?.state as { sent?: Record<string, number> } | undefined)?.sent || {};
export const isSent = (R: Room | null | undefined, s: Step | null | undefined) => !!s && (s.kind === 'monster' || s.kind === 'boss') && !!sentOf(R)[sentKey(s)];
/** 아직 남은 몬스터 · 형성평가 (지금 단계부터 · 이미 쓰러뜨린 것 · 보낸 것 빼고) */
export function leftSteps(L: LessonPack, R: Room, now: number): Step[] {
  const i0 = Math.max(0, stepIdx(R)), sent = sentOf(R);
  return L.steps.filter((s, i) => i >= i0 && !s.later && !sent[sentKey(s)] && ((s.kind === 'monster' && L.monsters[s.id] && !cleared(L, R, s.id, now)) || (s.kind === 'boss' && L.boss && !bossHp(L, R, now).won)));
}
/** 보내기 (교사 기기) */
export function sendToReview(S: Store, code: string, keys: string[]) {
  const t = S.now();
  for (const k of keys) S.set(`rooms/${code}/state/sent/${k}`, t);
}
