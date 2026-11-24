// 📄 모의 시험지 마왕전 (📜 2026-11-25 · 머리 🔨 · 혼자 · 기말 대비 기간에만 · 체험판 · 학교판 숨김)
//   문제 은행 = 이미 게임에 있는 수업 몬스터 문항(숫자 바꾼 판 1 ~ 6) · 형성평가 문항(시도 1 ~ = 숫자 바꿈) · 소레이드 = 마지막 단계 하나
//     범위 = 시험 범위 차시(EXAM_MAX_NO 까지) 중 그 반이 연 차시 · 복습 · 보강 칸 · 바뀐 판 없는 칸(세트0 만) = 뺌 (게시판 던전과 같은 originsOf)
//   한 판 = 무작위 10문항 · 다시 도전 = 새 숫자 · 기록 = 나만(최고 · 도전 수 · 차시별 틀린 수) bonus/{반}/{번호}/mock · 반 랭킹 · 성적 칸 없음
//   ⚠ 실제 시험 문항은 넣지 않음 · 화면에 「기출」 「실제 시험」 낱말 쓰지 않음 (📜 11/25 덧붙임)
import type { Given, LessonPack, Question } from '../model/types';
import { bossItem, chainItems, items } from '../engine/lessons';
import { grade } from '../engine/grade';
import { originsOf, variantOf } from '../board/atb/quiz';

export const EXAM_MAX_NO = 15; // 📜 NEXT-ROOM 11/23 「실제 시험 범위 = 15차시까지」
export const MOCK_N = 10;
export const MOCK_MS = 25 * 60e3;
export const MOCK_GEM = { per: 3, dayMax: 2 } as const; // 💎 = 허수아비 복습과 같은 값(한 판 3 · 하루 2판까지 = 6)

export type Slot = { lid: string; no: number; mid: string; k: number; kind: 'mon' | 'chain' | 'boss'; title: string };
export interface MockQ { slot: Slot; q: Question; ver: number }

/** 문제 은행 칸 (차시 순서) */
export function bankOf(packs: readonly LessonPack[], reach: number, maxNo = EXAM_MAX_NO): Slot[] {
  const out: Slot[] = [];
  for (const L of packs) {
    if (L.hide || L.no > Math.min(reach, maxNo)) continue;
    for (const o of originsOf(L)) {
      if (o.chain) { out.push({ lid: L.id, no: L.no, mid: o.mid, k: -1, kind: 'chain', title: o.title }); continue; }
      for (let k = 0; k < o.n; k++) out.push({ lid: L.id, no: L.no, mid: o.mid, k, kind: 'mon', title: o.title });
    }
    const hp = L.boss ? Number(L.boss.hpItems ?? L.boss.items) || 0 : 0;
    for (let i = 0; i < hp; i++) out.push({ lid: L.id, no: L.no, mid: 'boss', k: i, kind: 'boss', title: '형성평가' });
  }
  return out;
}
/** 칸 + 판(1 ~ 6) → 문항 (없으면 null) */
export function questionOf(L: LessonPack, s: Slot, ver: number, seed: string): Question | null {
  if (s.kind === 'boss') return bossItem(L, seed, s.k, ver);
  if (s.kind === 'chain') { const qs = chainItems(L, s.mid, seed, variantOf(L, s.mid, ver)); return qs[qs.length - 1] ?? null; }
  return items(L, s.mid, seed, variantOf(L, s.mid, ver))[s.k] ?? null;
}
/** 한 판 뽑기: 은행에서 무작위 n 칸(겹침 없음) · 판 1 ~ 6 무작위 · 차시 순서로 늘어놓음 */
export function drawMock(packs: readonly LessonPack[], bank: readonly Slot[], rnd: () => number, n = MOCK_N, seed = 'mock'): MockQ[] {
  const byId = new Map(packs.map((L) => [L.id, L])), pool = bank.slice(), out: MockQ[] = [];
  while (out.length < n && pool.length) {
    const s = pool.splice(Math.floor(rnd() * pool.length), 1)[0]!, L = byId.get(s.lid); if (!L) continue;
    const ver = 1 + Math.floor(rnd() * 6), q = questionOf(L, s, ver, `${seed}|${out.length}`);
    if (q) out.push({ slot: s, q: { ...q, question: String(q.question ?? '').replace(/^\s*\d+\s*[.)]\s*/, '') } as Question, ver }); // 원래 문항 번호(「3.」) 뗌 · 채점은 그대로
  }
  return out.sort((a, b) => a.slot.no - b.slot.no);
}
/** 한꺼번에 채점 */
export function gradeMock(qs: readonly MockQ[], given: readonly Given[]): { ok: boolean[]; n: number; wrongBy: Record<string, number> } {
  const ok = qs.map((m, i) => given[i] != null && grade(m.q, given[i]!)), wrongBy: Record<string, number> = {};
  qs.forEach((m, i) => { if (!ok[i]) wrongBy[m.slot.lid] = (wrongBy[m.slot.lid] || 0) + 1; });
  return { ok, n: ok.filter(Boolean).length, wrongBy };
}
export type MockRec = { best?: number; tries?: number; at?: number; wrong?: Record<string, number> };
/** 기록 합치기 (나만 보기) · 차시별 틀린 수 = 쌓임 (교사 약점 보기) */
export function mergeMock(prev: MockRec | null | undefined, n: number, wrongBy: Record<string, number>, at: number): MockRec {
  const w: Record<string, number> = { ...(prev?.wrong || {}) };
  for (const [k, v] of Object.entries(wrongBy)) w[k.replace(/[.#$/[\]]/g, '_')] = (w[k.replace(/[.#$/[\]]/g, '_')] || 0) + v;
  return { best: Math.max(Number(prev?.best) || 0, n), tries: (Number(prev?.tries) || 0) + 1, at, wrong: w };
}
export const mockPath = (base: string) => `${base}/mock`;
