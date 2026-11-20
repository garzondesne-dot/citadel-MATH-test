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
  return L.steps.filter((s) => s.kind === 'monster' && L.monsters[s.id] && !/^[^가-힣\w]*(복습|보강)/.test(String(s.title || ''))).map((s) => {
    const chain = !!L.monsters[s.id]!.chain;
    const n = (chain ? chainItems(L, s.id, 'n', 0) : items(L, s.id, 'n', 0)).length;
    return { mid: s.id, title: String(s.title || s.id), chain, n };
  });
}
/** 가장 쉬운 칸 = 소문항이 가장 적은 원문항(같으면 앞) — 도전자의 실드용 (U3) */
export const easiestOf = (os: Origin[]) => os.slice().sort((a, b) => a.n - b.n || os.indexOf(a) - os.indexOf(b))[0] ?? null;

export interface Run { mid: string; ver: number; k: number; wrong: number; clean: boolean; firstTry: boolean; vers: number[]; /** 이 원문항만의 씨앗 (없으면 판 씨앗 · 📜 요청 #19 덧2) */ seed?: string; /** 소문항마다 한 번에 맞혔나 (Y8 채점 ○ ×) */ marks: boolean[] }
/** 얻은 것 · 충전은 엔진이 done · perfect 로 정함(Y1 원문항 통째) · gold = 이 소문항 첫 시도 정답(표시만) · marks = 끝났을 때 소문항 ○ × */
export interface Earn { gold: boolean; done: boolean; perfect: boolean; swapped: boolean; right: boolean; marks?: boolean[] }
const VERS = 7;
export const questionsOf = (L: LessonPack, r: Pick<Run, 'mid' | 'ver'> & { seed?: string }, seed: string): Question[] => { const s = r.seed ?? seed; return L.monsters[r.mid]?.chain ? chainItems(L, r.mid, s, r.ver) : items(L, r.mid, s, r.ver); };
/** 새 원문항 시작 (ver0 = 이 학생 시작 판) */
export const startRun = (mid: string, ver0: number): Run => ({ mid, ver: ((ver0 % VERS) + VERS) % VERS, k: 0, wrong: 0, clean: true, firstTry: true, vers: [((ver0 % VERS) + VERS) % VERS], marks: [] });
/** 답 하나 내기 → 새 진행 + 얻은 것 */
export function answer(L: LessonPack, r: Run, seed: string, given: Given, avoid: number[] = []): { run: Run; earn: Earn } {
  const qs = questionsOf(L, r, seed), q = qs[r.k];
  const none: Earn = { gold: false, done: false, perfect: false, swapped: false, right: false };
  if (!q) return { run: r, earn: none };
  if (grade(q, given)) {
    const last = r.k >= qs.length - 1, marks = [...r.marks.slice(0, r.k), r.firstTry];
    const earn: Earn = { gold: r.firstTry, done: last, perfect: last && r.clean, swapped: false, right: true, ...(last ? { marks } : {}) };
    return { run: last ? { ...r, marks } : { ...r, k: r.k + 1, firstTry: true, marks }, earn };
  }
  const wrong = r.wrong + 1;
  if (wrong >= T.wrongSwap) { // 4번째 오답 = 같은 원문항 새 숫자 판 · 진행도만 처음부터 · 📜 요청 #19 덧2 = 이 기기에서 본 판 · 친구가 지금 쓰는 판(avoid)도 피함
    const used = new Set(r.vers), cand = Array.from({ length: VERS }, (_, i) => (r.ver + 1 + i) % VERS);
    const next = cand.find((v) => !used.has(v) && !avoid.includes(v)) ?? cand.find((v) => !used.has(v)) ?? (r.ver + 1) % VERS;
    return { run: { ...(r.seed ? { seed: r.seed } : {}), mid: r.mid, ver: next, k: 0, wrong: 0, clean: false, firstTry: true, vers: [...r.vers, next], marks: [] }, earn: { ...none, swapped: true } };
  }
  return { run: { ...r, wrong, clean: false, firstTry: false }, earn: none };
}
/** 다음 원문항 (차례대로 · 안 푼 것 먼저) */
export function nextOrigin(os: Origin[], done: Record<string, number>, prefer?: string | null): Origin | null {
  if (prefer) { const p = os.find((o) => o.mid === prefer); if (p) return p; }
  return os.slice().sort((a, b) => (done[a.mid] || 0) - (done[b.mid] || 0) || os.indexOf(a) - os.indexOf(b))[0] ?? null;
}

// 🔁 📜 요청 #19 덧2 「같은 문제가 계속 나와요」
//   원인 = 씨앗 고정(연습방 1) + 원문항 순서 고정 + 첫 판 = 자리 번호로 정해짐 → 판마다 똑같은 문제
//   고침 = 판마다 원문항 순서 섞음 · 판(버전) = 이 기기에서 최근 본 판을 피해 고름(다 봤으면 가장 오래된 것부터) · 친구가 같은 원문항에서 지금 쓰는 판도 피함
export const VERS_N = VERS;
/** 판 고르기 · seen = 이 원문항에서 이 기기가 본 판(오래된 것 → 새 것) · busy = 친구가 지금 쓰는 판 */
export function pickVer(seen: readonly number[], busy: readonly number[] = [], rnd: () => number = Math.random): number {
  const all = Array.from({ length: VERS }, (_, i) => i), any = (xs: number[]) => xs[Math.floor(rnd() * xs.length)]!;
  const a = all.filter((v) => !seen.includes(v) && !busy.includes(v)); if (a.length) return any(a);
  const b = all.filter((v) => !seen.includes(v)); if (b.length) return any(b);
  const old = seen.filter((v, i) => seen.indexOf(v) === i); // 다 봄 = 가장 오래된 것부터
  return old.find((v) => !busy.includes(v)) ?? old[0] ?? 0;
}
/** 본 판 적기 (맨 뒤 = 가장 최근) */
export const noteSeen = (seen: readonly number[], v: number): number[] => [...seen.filter((x) => x !== v), v].slice(-VERS);
/** 원문항 순서 섞기 (판마다 새 순서) */
export function shuffled<X>(xs: readonly X[], rnd: () => number): X[] { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; }
/** 글자 씨앗 → 0 ~ 1 난수 (같은 씨앗 = 같은 흐름) */
export function rngOf(seed: string): () => number { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = (h + 0x6d2b79f5) | 0; let a = Math.imul(h ^ (h >>> 15), h | 1); a ^= a + Math.imul(a ^ (a >>> 7), a | 61); return ((a ^ (a >>> 14)) >>> 0) / 4294967296; }; }
/** 이 기기에서 본 판 (차시 · 원문항마다) · 저장 못 하면 빈 것 */
const SEEN_KEY = 'atb-seen-v1';
export type Seen = Record<string, number[]>;
export const seenKey = (L: { id: string }, mid: string) => `${L.id}|${mid}`;
export function loadSeen(): Seen { try { const s = JSON.parse(globalThis.localStorage?.getItem(SEEN_KEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch { return {}; } }
export function saveSeen(s: Seen): void { try { globalThis.localStorage?.setItem(SEEN_KEY, JSON.stringify(s)); } catch { /* 무시 */ } }
/** 문제 묶음 지문 (32비트) */
export function sigOf(qs: readonly Question[]): number { let h = 2166136261; for (const c of JSON.stringify(qs)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
/** 새 원문항 판 = 판(버전) 고르고 · 최근 본 문제 묶음과 같으면 씨앗을 바꿔 다시(판마다 8번 · 최대 56번) · seen 을 고쳐 돌려줌
 *  (생성기 숫자 폭이 좁은 칸 = 같은 묶음이 다시 나올 수 있음 → 묶음 지문으로 한 번 더 거름) */
export function freshRun(L: LessonPack, mid: string, seed: string, seen: Seen, busy: readonly number[] = [], rnd: () => number = Math.random): Run {
  const k = seenKey(L, mid), v = pickVer(seen[k] ?? [], busy, rnd), sigs = seen[k + '#'] ?? [];
  let s = seed, sig = 0, ver = v;
  for (let i = 0; i < 56; i++) { ver = (v + (i >> 3)) % VERS; s = i ? `${seed}~${i}` : seed; sig = sigOf(questionsOf(L, { mid, ver }, s)); if (!sigs.includes(sig)) break; } // 판마다 씨앗 8번 → 다음 판
  seen[k] = noteSeen(seen[k] ?? [], ver); seen[k + '#'] = [...sigs.filter((x) => x !== sig), sig].slice(-6);
  return { ...startRun(mid, ver), ...(s !== seed ? { seed: s } : {}) };
}

// 📄 📜 요청 #24 덧붙임 (선생님 「몇 차시 학습지 몇 번 문제인지 반드시」) = 「n차시 학습지 · 문제 k (소문항) · i/전체」
//   k = 팩 원문항 제목의 학습지 번호 그대로(「문제 3 · …」 → 3 · 「문제 1 · 2 · …」 → 1·2) · 숫자 바뀐 판도 같은 번호 · 소레이드 = (졸개 i · 대장)
//   제목에 학습지 번호가 없으면 = 「n차시 · 문제 k」(k = 원래 순서) · noSheet = true (보고용 목록)
export function sheetNo(L: LessonPack, mid: string): { no: string; sheet: boolean } {
  const t = String(L.steps.find((s) => s.id === mid)?.title ?? ''), m = /^문제\s*(\d+(?:\s*·\s*\d+)*)/.exec(t);
  if (m) return { no: m[1]!.replace(/\s*·\s*/g, '·'), sheet: true };
  const k = originsOf(L).findIndex((o) => o.mid === mid); return { no: String(k + 1), sheet: false };
}
export function sheetTitle(L: LessonPack, mid: string, k: number, n: number): string {
  const { no, sheet } = sheetNo(L, mid), chain = !!L.monsters[mid]?.chain;
  const sub = chain ? (k >= n - 1 ? '대장' : `졸개 ${k + 1}`) : `${k + 1}`;
  return `${L.no}차시${sheet ? ' 학습지' : ''} · 문제 ${no} (${sub}) · ${k + 1}/${n}`;
}
