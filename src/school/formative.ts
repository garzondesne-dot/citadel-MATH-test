// 📝 형성평가 불참 대책 A · B · C (📜 2026-11-17 선생님 「ABC 추천대로 진행」 · 머리 🔨 #35 · DECISIONS hero-v2 「📝 형성평가 불참 대책 A · B · C」)
//   A = 리모컨 도입 단계 「지금」 칸 띠: 지난 차시 형성평가 미제출 n명 · 🎯 허수아비로 안내 (교사 폰만)
//   B = ✅ 도장: 형성평가가 열린 차시에서 「제출」 안 한 학생 = 도장 막음 · 학생 폰은 제출하면 「✅ 형성평가 제출 완료」 크게
//   C = 📊 길잡이 ⏰: 남은 시간 ≤ 남은 형성평가 문항 × 1분 + 3분 · 아직 안 열었을 때 「👑 형성평가 지금 열기」 (시간 기준 = 수업 시작 + 45분)
import type { LessonPack, Room, Store } from '../model/types';
import { bossLive, stepIdx } from '../raid/raid';
import { SENT_BOSS, sentOf } from './sendReview';
import { uidOf } from './school';

const ck = (cls: string) => cls.replace(/[.#$/[\]]/g, '_');
/** 그 반 마지막 수업 = { lesson, code, boss(형성평가를 열었나), at } · 수업 닫을 때 교사 폰이 씀 */
export const lastLessonPath = (cls: string, test = false) => `school/lastLesson/${ck(cls)}${test ? '~test' : ''}`;
export type LastLesson = { lesson: string; no?: number; code: string; boss: boolean; at: number };

export const bossIdx = (L: LessonPack) => L.steps.findIndex((s) => s.kind === 'boss');
/** 이 수업에서 👑 형성평가를 열었나 = 형성평가 단계까지 왔고 🎯 복습으로 보내지 않음 */
export const bossOpened = (L: LessonPack, R: Room | null | undefined): boolean => {
  if (!R || !L.boss) return false; const bi = bossIdx(L);
  return bi >= 0 && stepIdx(R) >= bi && !sentOf(R)[SENT_BOSS];
};
/** 형성평가 「제출」을 한 번이라도 눌렀나 */
export const bossSubmitted = (R: Room | null | undefined, uid: string): boolean => Object.keys((R?.bossSub?.[uid] || {}) as object).length > 0;
/** B 도장 막음 = 형성평가가 열린 수업에서 아직 제출 안 함 */
export const stampBlocked = (L: LessonPack, R: Room | null | undefined, uid: string): boolean => bossOpened(L, R) && !bossSubmitted(R, uid);

/** C 시간 기준 = 수업 시작(t0 · 없으면 방 만든 때) + 45분 */
export const CLASS_MIN = 45, BOSS_PAD = 3;
export const classEnd = (R: Room) => (Number(R.meta.t0) || Number(R.meta.created) || 0) + CLASS_MIN * 60e3;
/** C ⏰ 남은 n분 ≤ 남은 형성평가 문항 × 1분 + 3분 · 형성평가 단계 전 · 보내지 않음 */
export function bossClock(L: LessonPack, R: Room, now: number): { left: number; need: number } | null {
  const bi = bossIdx(L), i0 = stepIdx(R);
  if (!L.boss || bi < 0 || i0 < 0 || i0 >= bi || sentOf(R)[SENT_BOSS] || R.state.closed) return null;
  const left = Math.max(0, Math.floor((classEnd(R) - now) / 60e3)), need = bossLive(L, R).items + BOSS_PAD;
  return left <= need ? { left, need } : null;
}

/** A 지난 차시 미제출 = 그 반 명단 중 지난 수업 형성평가를 수업(제출)에서도 🎯 허수아비에서도 안 낸 학생 번호 */
export async function prevPending(S: Store, cls: string, test: boolean, cur: string, nums: number[]): Promise<{ last: LastLesson; nums: number[] } | null> {
  const rd = async <T,>(p: string): Promise<T | null> => (S.fetch ? await S.fetch<T>(p).catch(() => null) : S.get<T>(p)) ?? null;
  const last = await rd<LastLesson>(lastLessonPath(cls, test));
  if (!last || !last.boss || last.lesson === cur) return null;
  const sub = (await rd<Record<string, unknown>>(`rooms/${last.code}/bossSub`)) || {};
  const out: number[] = [];
  for (const n of nums) {
    if (sub[uidOf(cls, n)]) continue;
    const rec = await rd<{ bossM?: string; code?: string }>(`records/${ck(cls)}/${n}/${last.lesson}`);
    if (rec?.bossM && /[ox]/.test(rec.bossM)) continue;
    const bon = await rd<{ tries?: number; clear?: boolean }>(`bonus/${ck(cls)}/${n}/${last.lesson}/boss`);
    if (bon && (bon.clear || Number(bon.tries) > 0)) continue;
    out.push(n);
  }
  return { last, nums: out };
}
