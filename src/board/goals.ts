// 🎯 #79 게시판 던전 목표 (📜 2026-11-18 · DECISIONS 「게시판 던전 목표 = ⭐ 차시 정복 지도 + 📕 내 오답 0 + 🛡 수호자 명성」)
//   ⭐ 차시마다 던전 등급 최고 기록 S/A/B → ⭐ 3/2/1 (C · 클리어 못 함 = 0) · 지도 = 차시 순서대로 돌 원 · 남는 원 = 🔒 다음 단원 · 마지막 원 = 🏰 성채
//   📕 남은 오답 = 오답노트(수업 틀림 · 안 풂 중 복습으로 아직 안 푼 칸) · 게시판에서 그 문제를 풀면 「복습 완료」(bonus/…/review) → 줄어듦 · 0 이 되면 ✔ 오답 정리 도장
//   🛡 수호자 명성 = 🛡 로 들어가 도전자와 함께 클리어한 판 수 → 견습 3 · 기사 10 · 스승 25 · 보상 = 칭호 · 배지 · 도장만(💎 ✗)
import type { LessonPack } from '../model/types';
import { noteOf, type Bon, type Rec } from '../school/dummy';
export interface BoardRec { at?: number; lid?: string; no?: number; n?: number; role?: 'g' | 'c'; grade?: string; clear?: boolean }
export const STAR: Record<string, number> = { S: 3, A: 2, B: 1 };
/** 🗺 📜 #133 지도 v2 (그림 board-map-v2 1672 × 941 · 손발이 빨간 점으로 잰 돌 원판 가운데 · %) — 칸 i = (i + 2)차시 (머리 11/22 답)
 *  아래 줄 왼→오 = 2 ~ 7 (숲 · 폐허 · 얼음 동굴 · 화산 · 버섯 동굴 · 용) · 가운데 = 8 ~ 13 (별 사슴 · 도서관 · 연못 · ⚖ 저울 · 열쇠 · 수정 광산) · 위 = 14 ~ 17 (금광 · 별자리 · 톱니 · 거울 폭포)
 *  맨 끝 = 🔒 성문(다음 단원 · 칸 아님 · 장식) */
export const MAP_PTS: [number, number][] = ([[261, 835], [491, 823], [716, 836], [946, 824], [1195, 823], [1439, 824], [208, 541], [443, 550], [687, 549], [950, 549], [1210, 553], [1461, 550], [307, 270], [566, 269], [846, 268], [1143, 272], [1482, 150]] as [number, number][]).map(([x, y]) => [+(x / 16.72).toFixed(2), +(y / 9.41).toFixed(2)]);
export const MAP_SIZE: [number, number] = [1672, 941];
/** 게시판 차시 (차시 번호마다 하나 · 쪼갠 팩 = 같은 번호면 한 칸) */
export function mapLessons(packs: LessonPack[]): { no: number; ids: string[] }[] {
  const by = new Map<number, string[]>();
  for (const p of packs) if (p.steps.some((s) => s.kind === 'monster') || p.boss) by.set(p.no, [...(by.get(p.no) || []), p.id]);
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([no, ids]) => ({ no, ids }));
}
/** 차시마다 최고 ⭐ (차시 번호 → 0~3) */
export function starsByNo(recs: Record<string, BoardRec | null> | null | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  for (const r of Object.values(recs || {})) { if (!r || !r.clear) continue; const s = STAR[String(r.grade)] ?? 0, no = Number(r.no) || 0; if (no && s > (out[no] ?? 0)) out[no] = s; }
  return out;
}
export const starTotal = (byNo: Record<number, number>, lessons: { no: number }[]) => lessons.reduce((a, l) => a + (byNo[l.no] ?? 0), 0);
/** 🛡 수호자 명성 = 🛡 로 · 2명 이상 팀 · 클리어 */
/** 🛡 #104 (📜 DECISIONS 11/22 「수호자 · 도전자 다시 세우기」 ⑤): 수호자 명성 = 🤝 구조 성공 수 (판 기록 acts.rescue 합 · 옛 판 = 칸 없음 = 0) */
export const fameOf = (recs: Record<string, BoardRec | null> | null | undefined) => Object.values(recs || {}).reduce((a, r) => a + (Number((r as { acts?: { rescue?: number } } | null)?.acts?.rescue) || 0), 0);
/** 옛 셈(수호자로 2명 이상 클리어한 판 수) — 이미 받은 배지 · 칭호를 빼지 않으려고만 씀 (새로 세지 않음) */
export const fameLegacy = (recs: Record<string, BoardRec | null> | null | undefined) => Object.values(recs || {}).filter((r) => r && r.role === 'g' && r.clear && (Number(r.n) || 1) >= 2).length;
/** 배지 · 칭호 단계 = 새 셈과 옛 셈 중 높은 단계 (fameLv 는 커질수록 같거나 높음) */
export const fameHeld = (recs: Record<string, BoardRec | null> | null | undefined) => Math.max(fameOf(recs), fameLegacy(recs));
export const FAME: { n: number; id: string; name: string; cell: number }[] = [{ n: 3, id: 'guard1', name: '수호 견습', cell: 0 }, { n: 10, id: 'guard2', name: '수호 기사', cell: 1 }, { n: 25, id: 'guard3', name: '수호 스승', cell: 2 }];
export const fameLv = (n: number) => [...FAME].reverse().find((f) => n >= f.n) ?? null;
export const nextFame = (n: number) => FAME.find((f) => n < f.n) ?? null;
/** 📕 차시마다 남은 오답 (수업 기록이 있는 차시만 · 게시판 「복습 완료」도 푼 것으로) */
export function noteLeftByNo(packs: LessonPack[], recs: Record<string, Rec>, bonAll: Record<string, Bon & { review?: Record<string, Record<string, unknown>> }>): Record<number, { left: number; had: boolean }> {
  const out: Record<number, { left: number; had: boolean }> = {}, rv = (bonAll as { review?: Record<string, Record<string, unknown>> }).review || {};
  for (const L of packs) {
    const rec = recs[L.id] ?? (L.partOf ? recs[L.partOf] : undefined); if (!rec) continue;
    const b: Bon = { ...((bonAll[L.id] as Bon) || {}) };
    for (const mid of Object.keys(rv[L.id] || {})) (b as Record<string, unknown>)[mid] = { ...((b as Record<string, { clear?: boolean }>)[mid] || {}), clear: true };
    const x = noteOf(L, rec, b), o = (out[L.no] ||= { left: 0, had: false }); o.left += x.left; o.had = true;
  }
  return out;
}
/** 별 칭호 (⭐10 · ⭐25 · 모든 차시 ⭐3) */
export const STAR_TITLES = { explore: 10, conquer: 25 } as const;
export const legendOf = (byNo: Record<number, number>, lessons: { no: number }[]) => lessons.length > 0 && lessons.every((l) => (byNo[l.no] ?? 0) >= 3);
