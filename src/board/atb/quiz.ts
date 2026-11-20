// 📝 게시판 던전 ATB — 문제 공급 (📜 결정 #5 · #6 · U1 · U3 · U6): 지금 차시 팩을 그대로 읽음
//   원문항 = 그 차시 몬스터 칸(복습 · 보강 칸 뺌) · 7변형 = 팩 버전 0 ~ 6 · 학생마다 시작 판 다름
//   소문항 정답 = ⚡ 1 (첫 시도 = 금색) · 소레이드 대장 단계(마지막 단계) = ⚡ 2 · 오답 = 아무것도 안 깎음 · 4번째 오답 = 같은 원문항 새 숫자 판(진행도만 처음부터)
//   원문항 끝까지 = 「완주」(실드 깨기 표) · 오답 없이 끝냄 = 퍼펙트(내 ATB 즉시 가득)
import type { Given, LessonPack, Question } from '../../model/types';
import { chainItems, items } from '../../engine/lessons';
import { grade } from '../../engine/grade';
import { T } from './tune';

export interface Origin { mid: string; title: string; chain: boolean; n: number }
/** 원문항 = 몬스터 칸 중 복습 · 보강 아닌 것 */
export function originsOf(L: LessonPack): Origin[] {
  return L.steps.filter((s) => s.kind === 'monster' && L.monsters[s.id] && !/^(복습|보강)/.test(String(s.title || ''))).map((s) => {
    const chain = !!L.monsters[s.id]!.chain;
    const n = (chain ? chainItems(L, s.id, 'n', 0) : items(L, s.id, 'n', 0)).length;
    return { mid: s.id, title: String(s.title || s.id), chain, n };
  });
}
/** 가장 쉬운 칸 = 소문항이 가장 적은 원문항(같으면 앞) — 도전자의 실드용 (U3) */
export const easiestOf = (os: Origin[]) => os.slice().sort((a, b) => a.n - b.n || os.indexOf(a) - os.indexOf(b))[0] ?? null;

export interface Run { mid: string; ver: number; k: number; wrong: number; clean: boolean; firstTry: boolean; vers: number[] }
export interface Earn { zap: number; gold: boolean; done: boolean; perfect: boolean; swapped: boolean; right: boolean }
const VERS = 7;
export const questionsOf = (L: LessonPack, r: Pick<Run, 'mid' | 'ver'>, seed: string): Question[] => (L.monsters[r.mid]?.chain ? chainItems(L, r.mid, seed, r.ver) : items(L, r.mid, seed, r.ver));
/** 새 원문항 시작 (ver0 = 이 학생 시작 판) */
export const startRun = (mid: string, ver0: number): Run => ({ mid, ver: ((ver0 % VERS) + VERS) % VERS, k: 0, wrong: 0, clean: true, firstTry: true, vers: [((ver0 % VERS) + VERS) % VERS] });
/** 답 하나 내기 → 새 진행 + 얻은 것 */
export function answer(L: LessonPack, r: Run, seed: string, given: Given): { run: Run; earn: Earn } {
  const qs = questionsOf(L, r, seed), q = qs[r.k];
  const none: Earn = { zap: 0, gold: false, done: false, perfect: false, swapped: false, right: false };
  if (!q) return { run: r, earn: none };
  if (grade(q, given)) {
    const last = r.k >= qs.length - 1, boss = !!L.monsters[r.mid]?.chain && last;
    const earn: Earn = { zap: boss ? 2 : 1, gold: r.firstTry, done: last, perfect: last && r.clean, swapped: false, right: true };
    return { run: last ? r : { ...r, k: r.k + 1, firstTry: true }, earn };
  }
  const wrong = r.wrong + 1;
  if (wrong >= T.wrongSwap) { // 4번째 오답 = 같은 원문항 새 숫자 판 · 진행도만 처음부터
    const used = new Set(r.vers), next = Array.from({ length: VERS }, (_, i) => (r.ver + 1 + i) % VERS).find((v) => !used.has(v)) ?? (r.ver + 1) % VERS;
    return { run: { mid: r.mid, ver: next, k: 0, wrong: 0, clean: false, firstTry: true, vers: [...r.vers, next] }, earn: { ...none, swapped: true } };
  }
  return { run: { ...r, wrong, clean: false, firstTry: false }, earn: none };
}
/** 다음 원문항 (차례대로 · 안 푼 것 먼저) */
export function nextOrigin(os: Origin[], done: Record<string, number>, prefer?: string | null): Origin | null {
  if (prefer) { const p = os.find((o) => o.mid === prefer); if (p) return p; }
  return os.slice().sort((a, b) => (done[a.mid] || 0) - (done[b.mid] || 0) || os.indexOf(a) - os.indexOf(b))[0] ?? null;
}
