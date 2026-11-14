// 🏆 게시판 던전 랭킹 · 📜 내 기록 · 📣 최근 전투 (📜 DECISIONS 2026-11-14 「차시 칩 · 지난 기록 · 익명 결과 · 랭킹 세부」 「수호자 = 절대 등급 · 도전자 = 상대 성장」)
//   🛡 수호자 = 수호자로 들어간 판 · 차시별 최고 등급 점수 합(S4 A3 B2 C1) → 첫 시도 정답률(평균) → 시간(합 · 짧을수록) · 🤝 구조 수는 옆 표시
//   🌱 도전자 = 차시마다 성장 = 게시판 최고 정답률 − 기준선(그 차시 수업 정답률 · 없으면 게시판 첫 판) · %p · 차시마다 최대 +60 · 순위 = 성장 합 → 성장한 차시 수
//       80% 를 넘긴 판 = 「🛡 승급!」 · 그 뒤 그 차시는 더하지 않음(그때 값 그대로)
//   팀 판 = 내가 푼 소문제만 내 기록 · 학기 단위(3~8월 = 1학기 · 9~2월 = 2학기) · 익명(반 · 용사 · 강화) · 🧪 베타 반 · 시험 계정 · 교사 = 뺌
//   서버: 랭킹 줄 = school/board/rk2/{학기}/{학생 칸} (본인만 씀) · 내 기록 = bonus/{반}/{번호}/board/{판} · 최근 전투 = school/board/feed/{판}
export const GS: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };
export const GROW_MAX = 60, UP_AT = 0.8, TOP = 10, NEAR = 2;
export interface GRow { gs: number; acc: number; sec: number }
export interface CRow { base: number; best: number; up?: boolean }
export interface Agg { cls: string; hero: number; enh: number; x?: boolean; g?: Record<string, GRow>; c?: Record<string, CRow>; rz?: number; at?: number }
export interface Run { lid: string; role: 'g' | 'c'; grade: string; acc: number; sec: number; base: number | null }
/** 학기 열쇠 (KST) — 3~8월 = 1학기 · 9~2월 = 2학기(1 · 2월은 앞 해) */
export function semOf(t: number): string {
  const d = new Date(t + 9 * 3600e3), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  return m >= 3 && m <= 8 ? `${y}-1` : `${m <= 2 ? y - 1 : y}-2`;
}
/** 한 판 더하기 → 새 줄 + 이번에 「🛡 승급!」 했나 */
export function addRun(a: Agg, r: Run): { agg: Agg; up: boolean } {
  const agg: Agg = JSON.parse(JSON.stringify(a));
  if (r.role === 'g') {
    const g = (agg.g ||= {}), was = g[r.lid], gs = GS[r.grade] ?? 0;
    if (!was || gs > was.gs || (gs === was.gs && (r.acc > was.acc || (r.acc === was.acc && r.sec < was.sec)))) g[r.lid] = { gs, acc: r.acc, sec: r.sec };
    return { agg, up: false };
  }
  const c = (agg.c ||= {}), was = c[r.lid];
  if (!was) { const row: CRow = { base: r.base ?? r.acc, best: r.acc }; if (r.acc >= UP_AT) row.up = true; c[r.lid] = row; return { agg, up: !!row.up && (r.base ?? r.acc) < UP_AT }; }
  if (was.up) return { agg, up: false };
  if (r.acc > was.best) was.best = r.acc;
  if (r.acc >= UP_AT) { was.up = true; return { agg, up: true }; }
  return { agg, up: false };
}
export const growOf = (c: CRow) => Math.min(GROW_MAX, Math.max(0, Math.round((c.best - c.base) * 100)));
type Who = { id: string; a: Agg };
const pick = <T>(o: Record<string, T> | undefined, lid?: string) => Object.entries(o || {}).filter(([k]) => !lid || k === lid).map(([, v]) => v);
/** 🛡 수호자 줄 세우기 */
export function guardList(rows: Who[], lid?: string) {
  return rows.map(({ id, a }) => { const g = pick(a.g, lid); return { id, a, n: g.length, score: g.reduce((s, x) => s + x.gs, 0), acc: g.length ? g.reduce((s, x) => s + x.acc, 0) / g.length : 0, sec: g.reduce((s, x) => s + x.sec, 0) }; })
    .filter((x) => x.n > 0).sort((p, q) => q.score - p.score || q.acc - p.acc || p.sec - q.sec || (p.id < q.id ? -1 : 1));
}
/** 🌱 도전자 줄 세우기 */
export function growList(rows: Who[], lid?: string) {
  return rows.map(({ id, a }) => { const c = pick(a.c, lid); const gs = c.map(growOf); return { id, a, n: c.length, score: gs.reduce((s, x) => s + x, 0), up: gs.filter((x) => x > 0).length }; })
    .filter((x) => x.n > 0).sort((p, q) => q.score - p.score || q.up - p.up || (p.id < q.id ? -1 : 1));
}
/** 보여 줄 줄 = 위 10 + 내 위아래 2 · 내 순위 */
export function viewOf<T extends { id: string }>(list: T[], mine: string): { pos: number; n: number; rows: (T & { rank: number })[] } {
  const ranked = list.map((x, i) => ({ ...x, rank: i + 1 })), me = ranked.findIndex((x) => x.id === mine);
  const keep = new Set<number>(ranked.slice(0, TOP).map((_, i) => i));
  if (me >= 0) for (let i = Math.max(0, me - NEAR); i <= Math.min(ranked.length - 1, me + NEAR); i++) keep.add(i);
  return { pos: me + 1, n: ranked.length, rows: ranked.filter((_, i) => keep.has(i)) };
}
/** 랭킹에 넣을 사람 = 🧪 아님 · 반 거르기 */
export const rowsOf = (all: Record<string, Agg> | null, cls?: string): Who[] => Object.entries(all || {}).filter(([, a]) => a && !a.x && (!cls || a.cls === cls)).map(([id, a]) => ({ id, a }));
