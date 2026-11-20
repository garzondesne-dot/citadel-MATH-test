// 🏹 대응 화살표 잇기 (📜 2026-11-20 머리 🔨 함수 단원 · 14차시~) — 순수 계산 (채점 · 답 줄 · 팩 올리기 · 가상 학생)
//   문항 = { type: 'match', xs, ys, answer: [X번, Y번][], alts?, xn?, yn? } · 학생 답 = [X번, Y번][] (화살표 목록 · 순서 무관 · 개수 안 막음)
//   팩 칸 = { type: 'match', q, x: [...], y: [...], a: "0-0,1-1,2-2" (여러 벌 = 「|」), xn?, yn? }
import type { Given, Question } from '../../model/types';

export type Pair = [number, number];
type Match = Extract<Question, { type: 'match' }>;
export const MATCH_MIN = 2, MATCH_MAX = 7;
const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : x && typeof x === 'object' ? (Object.values(x) as T[]) : []); // 서버(Firebase) = 배열이 칸 꼴로 올 수 있음
/** 화살표 목록 다듬기 (정수 두 개 · 겹친 것 하나로) */
export function pairsOf(g: unknown): Pair[] {
  const seen = new Set<string>(), out: Pair[] = [];
  for (const p of arr<unknown>(g)) { const [a, b] = arr<unknown>(p).map(Number); if (!Number.isInteger(a) || !Number.isInteger(b) || a! < 0 || b! < 0) continue; const k = `${a}-${b}`; if (seen.has(k)) continue; seen.add(k); out.push([a!, b!]); }
  return out;
}
export const pairKey = (ps: Pair[]) => ps.map(([a, b]) => `${a}-${b}`).sort().join(',');
const isMatch = (q: Question): q is Match => q.type === 'match';
const xsOf = (q: Match) => arr<string>(q.xs).map(String), ysOf = (q: Match) => arr<string>(q.ys).map(String);
/** 정답 벌 (첫 벌 + alts) */
export const answersOf = (q: Match): Pair[][] => [pairsOf(q.answer), ...arr<unknown>(q.alts).map(pairsOf)];
/** 채점 = 화살표 집합이 정답 한 벌과 같음 */
export function gradeMatch(q: Question, g: Given): boolean {
  if (!isMatch(q)) return false;
  const got = pairsOf(g); if (!got.length) return false;
  const k = pairKey(got);
  return answersOf(q).some((w) => w.length > 0 && pairKey(w) === k);
}
/** ✍ 내 답 한 줄 = 「1→1, 2→3」 (X 순서대로) */
export function penMatch(q: Question, g: Given): string | null {
  if (!isMatch(q)) return null;
  const ps = pairsOf(g); if (!ps.length) return null;
  const xs = xsOf(q), ys = ysOf(q);
  return ps.slice().sort((p, r) => p[0] - r[0] || p[1] - r[1]).map(([a, b]) => `${xs[a] ?? a}→${ys[b] ?? b}`).join(', ');
}
/** 화살표 하나 켜고 끄기 (같은 화살표를 다시 누르면 지움) */
export function togglePair(g: unknown, a: number, b: number): Pair[] {
  const ps = pairsOf(g), i = ps.findIndex(([x, y]) => x === a && y === b);
  return i >= 0 ? ps.filter((_, k) => k !== i) : [...ps, [a, b]];
}
/** 가상 학생: 맞힘 = 정답 · 틀림 = 첫 화살표를 다른 Y 로 */
export function botMatch(q: Question, right: boolean): Given {
  if (!isMatch(q)) return [];
  const w = pairsOf(q.answer); if (right || !w.length) return w;
  const n = ysOf(q).length, [a, b] = w[0]!; return [[a, (b + 1) % Math.max(1, n)], ...w.slice(1)];
}
/** 📦 팩 칸 → 문항 (검사 문구는 선생님이 읽음) */
export function matchFromPack(it: Record<string, unknown>, base: Record<string, unknown>, err: (m: string) => null): Question | null {
  const xs = Array.isArray(it.x) ? (it.x as unknown[]).map((v) => String(v).trim()) : null, ys = Array.isArray(it.y) ? (it.y as unknown[]).map((v) => String(v).trim()) : null;
  if (!xs || !ys) return err('대응 잇기(match)는 x · y 원소 배열이 있어야 해요 — 예) "x": ["1", "2", "3"]');
  for (const [nm, s] of [['x', xs], ['y', ys]] as const) {
    if (s.length < MATCH_MIN || s.length > MATCH_MAX) return err(`${nm} 원소는 ${MATCH_MIN} ~ ${MATCH_MAX}개예요 (지금 ${s.length}개)`);
    if (s.some((v) => !v)) return err(`${nm} 원소에 빈 칸이 있어요`);
    if (new Set(s).size !== s.length) return err(`${nm} 원소에 같은 것이 두 번 있어요`);
  }
  const raw = String(it.a ?? '').trim(); if (!raw) return err('정답 화살표(a)가 비었어요 — 예) "0-0,1-1,2-2" (X번-Y번 · 0부터)');
  const sets: Pair[][] = [];
  for (const part of raw.split('|')) {
    const ps: Pair[] = [];
    for (const tok of part.split(/[,，]/).map((t) => t.trim()).filter(Boolean)) {
      const m = /^(\d+)\s*-\s*(\d+)$/.exec(tok); if (!m) return err(`정답 화살표 「${tok}」 — 「X번-Y번」(0부터) 꼴이에요`);
      const a = Number(m[1]), b = Number(m[2]);
      if (a >= xs.length) return err(`정답 화살표 「${tok}」 — X 번호가 범위(0 ~ ${xs.length - 1}) 밖이에요`);
      if (b >= ys.length) return err(`정답 화살표 「${tok}」 — Y 번호가 범위(0 ~ ${ys.length - 1}) 밖이에요`);
      if (ps.some(([p, r]) => p === a && r === b)) return err(`정답 화살표 「${tok}」 가 두 번 있어요`);
      ps.push([a, b]);
    }
    if (!ps.length) return err('정답 화살표 한 벌이 비었어요 (「|」 앞뒤를 확인해요)');
    if (sets.some((s) => pairKey(s) === pairKey(ps))) return err('정답 여러 벌(「|」) 중 같은 벌이 두 번 있어요');
    sets.push(ps);
  }
  const nm = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  return { ...(base as { question: string }), type: 'match', xs, ys, answer: sets[0]!, ...(sets.length > 1 ? { alts: sets.slice(1) } : {}), xn: nm(it.xn, 'X'), yn: nm(it.yn, 'Y') };
}
