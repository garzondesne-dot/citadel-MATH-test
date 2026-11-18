// 📖 배움터 · 예습 (📜 #66 · DECISIONS 「📖🎯 배움터」 2026-11-18)
//   열림 = 반마다 n차시 수업을 한 뒤 다음 차시(n + 1) 하나 자동 · 교사 덮어쓰기 school/prepOpen/{반}/{차시 id} = true(열기) · false(닫기) · 없음 = 자동
//   보상 0 · 기록 = bonus/{반}/{번호}/review/prep_{차시 id}/{몬스터} = { tries, clear, at } (review 아래 = 반 통계 · 허수아비 목록 · 업적에 안 섞임 · 🔑 keyp_ 과 같은 자리)
import type { LessonPack, Store } from '../model/types';
import { PACKS } from '../engine/packs';
import { lastClass } from './school';

export const PREP_PATH = 'school/prepOpen';
export const prepKey = (lid: string) => `prep_${lid.replace(/[.#$/[\]]/g, '_')}`;
/** 예습할 수 있는 차시 = 일반 몬스터가 있는 차시 팩 (성채 · 평가 팩 빼기) */
export const prepPacks = (): LessonPack[] => PACKS.filter((p) => !/^eval-/.test(p.id) && p.steps.some((s) => s.kind === 'monster'));
/** 그 반이 수업한 마지막 차시 번호 (교사가 연 수업 · 내 수업 기록 중 큰 것) */
export function heldNo(S: Store, cls: string, recs: Record<string, unknown> = {}): number {
  const own = Object.keys(recs).map((id) => PACKS.find((p) => p.id === id)?.no ?? 0);
  return Math.max(0, Number(lastClass(S, cls)?.no) || 0, ...own);
}
export type PrepOver = Record<string, boolean>;
export const prepOver = (S: Store, cls: string): PrepOver => (cls ? S.get<PrepOver>(`${PREP_PATH}/${cls}`) : null) || {};
/** 자동으로 열릴 차시 = 수업한 차시 다음 번호 중 가장 작은 것 · 없으면 null + 기다리는 번호 */
export function autoNext(n: number): { L: LessonPack | null; want: number } {
  const L = prepPacks().filter((p) => p.no > n).sort((a, b) => a.no - b.no)[0] ?? null;
  return { L: n > 0 ? L : null, want: n + 1 };
}
/** 열린 예습 차시 (all = 시험 · 이 기기 · 체험 = 모두) · wait = 다음 차시 팩이 아직 없음(「아직 준비 중」) */
export function prepOpenList(S: Store, cls: string, recs: Record<string, unknown> = {}, all = false): { open: LessonPack[]; wait: number | null; auto: string | null } {
  if (all || !cls) return { open: prepPacks(), wait: null, auto: null };
  const n = heldNo(S, cls, recs), a = autoNext(n), ov = prepOver(S, cls);
  const open = prepPacks().filter((p) => (ov[p.id] === true) || (ov[p.id] !== false && a.L?.id === p.id));
  return { open, wait: n > 0 && !a.L ? a.want : null, auto: a.L?.id ?? null };
}
export interface PrepRec { tries?: number; clear?: boolean; at?: number }
/** 학생 한 명의 예습 기록 = 차시마다 푼 문제 수 (낸 답이 있는 몬스터) */
export function prepCount(review: Record<string, unknown> | null | undefined): { by: { lid: string; no: number; n: number }[]; total: number } {
  const by = Object.entries(review || {}).filter(([k, v]) => k.startsWith('prep_') && v && typeof v === 'object').map(([k, v]) => {
    const lid = k.slice(5), n = Object.values(v as Record<string, PrepRec | null>).filter((m) => m && Number(m.tries) > 0).length;
    return { lid, no: PACKS.find((p) => prepKey(p.id) === k)?.no ?? 0, n };
  }).filter((x) => x.n > 0).sort((a, b) => a.no - b.no);
  return { by, total: by.reduce((a, x) => a + x.n, 0) };
}
/** 「📖 예습: 9차시 3문제 · 10차시 1문제」 */
export const prepLine = (c: ReturnType<typeof prepCount>) => (c.total ? `📖 예습: ${c.by.map((x) => `${x.no || x.lid}차시 ${x.n}문제`).join(' · ')}` : '');
