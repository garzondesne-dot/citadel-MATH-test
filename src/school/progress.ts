// 📚 반 진도 하나 (🔨 #25 · 2026-11-20 선생님 「가끔 차시 진행했는데 최근차시가 과거차시로 돌아간 이유찾고 고쳐줘」)
//   진도 = 그 반이 「수업 열기」로 실제 진행한 차시 중 가장 큰 번호 = max(held/{반} 차시들 · school/last/{반}.no)
//   school/last = 「마지막으로 연 수업」(⏯ 이어서 자리) → 지난 차시를 다시 열면 내려감 · 그래서 진도로 쓰지 않고 max 의 한 재료로만
//   🧪 테스트 수업(lastTest · held 안 적음) · 시연 · 미리 보기는 진도를 바꾸지 않음
//   ⭐ 다음 차시 = max(교사 진도 맞추기 school/prog, 진도 + 1) — 옛 school/prog 가 남아도(예 9) 진행한 차시(11) 아래로 내려가지 않음
import type { Store } from '../model/types';
import { PACKS } from '../engine/packs';
import { lastClass } from './school';

const safe = (c: string) => c.replace(/[.#$/[\]]/g, '_');
/** 차시 id → 번호 (팩 표 · 없으면 id 끝 숫자 · 끝 숫자 = 차시) */
export const lessonNo = (id: string): number => PACKS.find((p) => p.id === id)?.no ?? (Number(/(\d+)(?:@\d+)?$/.exec(id)?.[1]) || 0);
/** 그 반이 실제로 진행한 가장 큰 차시 (없으면 0) */
export function doneNo(S: Store, cls: string): number {
  if (!cls) return 0;
  const held = Object.keys(S.get<Record<string, unknown>>(`held/${safe(cls)}`) || {}).map(lessonNo);
  return Math.max(0, ...held, Number(lastClass(S, cls)?.no) || 0);
}
/** ⭐ 다음 차시 번호 */
export const nextNo = (S: Store, cls: string): number => Math.max(Number(S.get<number>(`school/prog/${cls}`)) || 0, doneNo(S, cls) + 1);
