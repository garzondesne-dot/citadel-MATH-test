// 📊 반 통계 = 그 반 수업에서 실제로 연 칸만 (📜 2026-11-15 DECISIONS 04ec16d · 선생님 「진행」)
//   칸 = 몬스터 id · 형성평가 = 'boss'
//   통계에 넣나 = ① 교사 스위치 school/statsPick/{반}/{차시}/{칸} = true | false (자동보다 우선)
//              ② 자동 = 연 칸(school/opened/{반}/{차시}/{칸} · 수업에서 그 칸을 소환할 때 적힘 + 과목 팩 legacyOpened = 정식 보관 서버 rooms 에서 뽑은 지난 수업)
//                       ∪ 그 반 수업 기록(records)에 누가 낸 칸(o · f · x · -) — 수업 기록은 레이드에서만 생김 · 지워진 옛 방도 메움
//   🎯 허수아비 · 혼자 한 기록(bonus)은 반 통계에 넣지 않음(개인 기록 · 💎 · EXP · 복습 완료는 그대로)
import { SUBJ } from '../engine/subject';
import type { LessonPack, Store } from '../model/types';
import { PACKS } from '../engine/packs';

const ck = (s: string) => String(s).replace(/[.#$/[\]]/g, '_');
export const openedPath = (cls: string, lid: string) => `school/opened/${ck(cls)}/${ck(lid)}`;
export const pickPath = (cls: string, lid: string) => `school/statsPick/${ck(cls)}/${ck(lid)}`;
export const BOSS = 'boss';
/** 차시 전체 (과목 팩 원본 = 나뉜 차시도 한 덩어리 · 없으면 올린 차시 팩) */
export const fullLesson = (lid: string): LessonPack | null => (SUBJ.lessons.find((l) => l.id === lid) as LessonPack | undefined) ?? PACKS.find((l) => l.id === lid) ?? null;
/** 그 차시의 통계 칸 목록 (몬스터 순서 · 형성평가 맨 끝) */
export function cellsOf(L: LessonPack): { id: string; title: string }[] {
  const out = L.steps.filter((s) => s.kind === 'monster' && !s.later && L.monsters[s.id]).map((s) => ({ id: s.id, title: s.title }));
  if (L.boss) out.push({ id: BOSS, title: '👑 형성평가' });
  return out;
}
type Rec = { mons?: Record<string, unknown>; bossM?: string; boss?: number };
/** 그 반 수업 기록에 누가 낸 칸 */
export function playedCells(recs: Rec[]): Set<string> {
  const s = new Set<string>();
  for (const r of recs) {
    for (const [k, v] of Object.entries(r.mons || {})) if (v === 'o' || v === 'f' || v === 'x' || v === '-') s.add(k);
    if (/[ox-]/.test(String(r.bossM || '')) || Number(r.boss) > 0) s.add(BOSS);
  }
  return s;
}
/** 자동 = 연 칸 ∪ 수업 기록에 낸 칸 */
export function autoCells(S: Store, cls: string, lid: string, recs: Rec[]): Set<string> {
  const s = playedCells(recs);
  for (const k of Object.keys(S.get<Record<string, unknown>>(openedPath(cls, lid)) || {})) s.add(k);
  for (const k of SUBJ.legacyOpened?.[cls]?.[lid] ?? []) s.add(k);
  return s;
}
export const picksOf = (S: Store, cls: string, lid: string) => S.get<Record<string, boolean>>(pickPath(cls, lid)) || {};
/** 통계에 넣는 칸 (교사 스위치 → 자동) */
export function includedCells(S: Store, cls: string, lid: string, recs: Rec[], all: string[]): Set<string> {
  const auto = autoCells(S, cls, lid, recs), pick = picksOf(S, cls, lid);
  return new Set(all.filter((c) => (pick[c] != null ? !!pick[c] : auto.has(c))));
}
/** 교사 스위치: v = true(넣기) · false(빼기) · null(자동으로) */
export const setPick = (S: Store, cls: string, lid: string, cell: string, v: boolean | null) => S.set(`${pickPath(cls, lid)}/${ck(cell)}`, v);
/** 수업에서 그 칸을 소환함 (리모컨 다음 ▶ · 🧪 테스트 수업은 안 적음) */
export const markOpened = (S: Store, cls: string, lid: string, cell: string) => S.set(`${openedPath(cls, lid)}/${ck(cell)}`, true);
