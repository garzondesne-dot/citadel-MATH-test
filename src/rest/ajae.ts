// 😆 쉼터 놀이 「아재 퀴즈」 (📜 2026-11-24 선생님 「아재퀴즈 개발 진행」 · hero-v2 docs/handoff/ajae-quiz/README.md · 문제 = ajae.json 51개 그대로)
//   📜 11/24 회차제: 1회 = 1 ~ 6번 … 8회 = 43 ~ 48번(49 ~ 51 예비) · 반마다 다음 회차 자동(school/funUsed/{반}/ajr) · 판을 끝까지 하면 +1
//   한 판 = 6문제 · 문제당 30초 · 글자 칩 8칸을 골라 정답 완성(틀리면 지우고 다시) · 문제마다 1등 3 · 2등 2 · 3등 1점(맞힌 시각 순 · 같은 시각 = 같은 등수)
//   문제 끝 = 정답 + why 5초 공개 · 다 끝나면 다득점 우승(같은 점수 = 공동) · 탈락 없음
//   학생 답 = rooms/{코드}/fv/{rk}/{uid} = { a: 고른 글자, at: 시각 } (이미 열린 칸 · 규칙 바뀜 없음) · 판정 = 시계 맡은 기기(TV · 교사 폰)
import BANK from './ajae.json';

/** ⚙ 값 한 곳 (바꾸기 쉽게) */
export const AJ = { n: 6, qMs: 30000, showMs: 5000, introMs: 4000, pts: [3, 2, 1], chips: 8, min: 1, rounds: 8 } as const;
/** 시간 값 (🧪 화면 시험만 globalThis.__AJ_SPEED 로 줄임 · 디펜스 __TD_PICK 과 같은 꼴) */
const ms = (k: 'qMs' | 'showMs' | 'introMs') => AJ[k] * (Number((globalThis as { __AJ_SPEED?: number }).__AJ_SPEED) || 1);
export interface AjQ { no: number; q: string; a: string; why: string; cat: string }
export const QS: AjQ[] = (BANK as { list: AjQ[] }).list;
export const qOf = (no: number) => QS.find((x) => x.no === no) ?? null;
/** 글자 나누기 (한글 한 글자 = 한 칸) */
export const syl = (s: string) => Array.from(s);

export interface Aj {
  kind: 'aj'; g: number; /** 📜 회차 1 ~ 8 */ round: number; phase: 'intro' | 'q' | 'show' | 'end'; to: number; endAt?: number;
  /** 이번 판 문제 번호들 · 지금 몇 번째(1 ~ n) */ qs: number[]; n: number;
  /** 지금 문제의 글자 칩 (모든 기기가 같은 칩) */ chips: string[];
  /** 지금 문제 답칸 이름 (fv/{rk}) */ rk: string;
  alive: Record<string, true>; total: number;
  /** 누적 점수 */ score: Record<string, number>;
  /** 방금 문제 맞힌 순서 [uid, 점수][] (show 때) */ last?: [string, number][];
  win?: string[]; drv?: { u: string; at: number }; frz?: number | null;
}
export type Ans = { a: string; at: number };

type Rnd = () => number;
const shuffle = <T,>(xs: T[], rnd: Rnd) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; };

/** 📜 11/24 회차제 (선생님 「랜덤 말고 · 스포되면 안 되니까 회차로」): no 1 ~ 48 을 6개씩 1 ~ 8회차로 고정 · 49 ~ 51 = 예비(판에 안 나옴) */
export const roundQs = (r: number): number[] => { const k = ((Math.max(1, Math.round(r)) - 1) % AJ.rounds); return Array.from({ length: AJ.n }, (_, i) => k * AJ.n + i + 1); };
/** 반마다 다음 회차 (1 ~ 8 · 8 다음 = 1) */
export const nextRound = (r: number) => (Math.max(1, Math.round(r) || 1) % AJ.rounds) + 1;
/** 글자 칩 8칸 = 정답 글자 + 다른 정답들의 글자(정답 글자와 겹치지 않는 것만 → 정답이 두 가지로 안 만들어짐) */
export function chipsFor(no: number, rnd: Rnd = Math.random, k: number = AJ.chips): string[] {
  const q = qOf(no); if (!q) return [];
  const ans = syl(q.a), has = new Set(ans);
  const pool = [...new Set(QS.filter((x) => x.no !== no).flatMap((x) => syl(x.a)).filter((c) => !has.has(c)))];
  const fill = shuffle(pool, rnd).slice(0, Math.max(0, k - ans.length));
  return shuffle([...ans, ...fill], rnd);
}
/** 고른 글자가 정답인가 */
export const isRight = (no: number, a: string) => { const q = qOf(no); return !!q && a === q.a; };
const rkOf = (g: number, n: number) => `aj${g}_${n}`;

export function startAj(alive: string[], now: number, round: number, rnd: Rnd = Math.random): Aj {
  const qs = roundQs(round);
  return { kind: 'aj', g: now, round: Math.max(1, Math.round(round) || 1), phase: 'intro', to: now + ms('introMs'), qs, n: 1, chips: chipsFor(qs[0]!, rnd), rk: rkOf(now, 1), alive: Object.fromEntries(alive.map((u) => [u, true])) as Record<string, true>, total: alive.length, score: {} };
}
/** 맞힌 순서 → 점수 (시각 순 · 같은 시각 = 같은 등수 · 3등까지) */
export function rankAns(no: number, ans: Record<string, Ans | string> | null | undefined): [string, number][] {
  const ok = Object.entries(ans || {}).filter(([, v]) => v && typeof v === 'object' && isRight(no, (v as Ans).a)).map(([u, v]) => [u, Number((v as Ans).at) || 0] as [string, number]).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const out: [string, number][] = []; let rank = 0, prevAt = -1, seen = 0;
  for (const [u, at] of ok) { seen++; if (at !== prevAt) { rank = seen; prevAt = at; } const p = AJ.pts[rank - 1] ?? 0; if (!p) break; out.push([u, p]); }
  return out;
}
/** 한 걸음 (시계 맡은 기기 · 0.15초마다) — 바뀌면 새 상태 · 아니면 null */
export function stepAj(f: Aj, ans: Record<string, Ans | string> | null, now: number, rnd: Rnd = Math.random): Aj | null {
  if (f.phase === 'end') return null;
  if (f.phase === 'intro') { if (now < f.to) return null; return { ...f, phase: 'q', to: now + ms('qMs') }; }
  if (f.phase === 'q') {
    const no = f.qs[f.n - 1]!, alive = Object.keys(f.alive || {}), okN = Object.entries(ans || {}).filter(([u, v]) => f.alive?.[u] && v && typeof v === 'object' && isRight(no, (v as Ans).a)).length;
    if (now < f.to && !(alive.length && okN >= alive.length)) return null; // 모두 맞히면 바로 공개
    const last = rankAns(no, ans), score = { ...(f.score || {}) };
    last.forEach(([u, p]) => { score[u] = (score[u] || 0) + p; });
    return { ...f, phase: 'show', to: now + ms('showMs'), last, score };
  }
  // show → 다음 문제 또는 끝
  if (now < f.to) return null;
  if (f.n >= f.qs.length) {
    const sc = f.score || {}, top = Math.max(0, ...Object.values(sc));
    return { ...f, phase: 'end', endAt: now, last: [], win: top > 0 ? Object.keys(sc).filter((u) => sc[u] === top) : [] };
  }
  const n = f.n + 1;
  return { ...f, phase: 'q', n, to: now + ms('qMs'), chips: chipsFor(f.qs[n - 1]!, rnd), rk: rkOf(f.g, n), last: [] };
}
/** 순위표 (점수 큰 순 · 같은 점수 = 같은 등수) */
export function standingsAj(f: Pick<Aj, 'score'>): { u: string; pts: number; rank: number }[] {
  const rows = Object.entries(f.score || {}).filter(([, p]) => p > 0).map(([u, pts]) => ({ u, pts, rank: 0 })).sort((a, b) => b.pts - a.pts);
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1]!.pts === r.pts ? rows[i - 1]!.rank : i + 1; });
  return rows;
}
/** 😆 진행자 = 현자 올드윈 (용사 7 · 📜 2026-11-24 선생님 · 진행자 시트(말하기 · 웃기)가 오면 그 그림으로) */
export const AJ_HOST = 7;
