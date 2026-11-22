// 📊 #56 교사 대시보드 「게시판 던전」 (📜 2026-11-21 선생님 고름 · 성적 아님)
//   학생 기록 = bonus/{반}/{번호}/board/{키} (ATB 판 = atb:true · 옛 팀전 = 칸 일부) · ⭐ = bonus/{반}/{번호}/boardStar/{차시 id} · 반 공적 = classWar/{주}/sum/{반}
export interface BoardRec { at?: number; lid?: string; no?: number; win?: boolean; clear?: boolean; grade?: string; right?: number; total?: number; first?: number; stars?: number; merit?: number; atb?: boolean; acts?: Partial<Acts> }
export interface Acts { block: number; rescue: number; cut: number; /** 🛡 실드 깨기 (새 판 shd + 옛 판 브레이크 · 📜 #101 C) */ brk: number }
export interface BoardStu { runs: number; wins: number; stars: Record<number, number>; starSum: number; first: number; firstTotal: number; acts: Acts; merit: number; byNo: Record<number, [number, number]> }
import { recStar } from '../board/goals';
const num = (v: unknown) => Number(v) || 0;
/** 한 학생 = 판 수 · 이긴 판 · 차시별 최고 별 · 첫 시도 [맞힘, 문항] · 활약 · 공적 */
export function boardStu(recs: Record<string, BoardRec | null> | null, starByLid: Record<string, number> | null, noOf: (lid: string) => number): BoardStu {
  const o: BoardStu = { runs: 0, wins: 0, stars: {}, starSum: 0, first: 0, firstTotal: 0, acts: { block: 0, rescue: 0, cut: 0, brk: 0 }, merit: 0, byNo: {} };
  for (const r of Object.values(recs || {})) {
    if (!r || !r.at) continue;
    o.runs++; if (r.win ?? r.clear) o.wins++;
    o.merit += num(r.merit);
    const no = num(r.no) || (r.lid ? noOf(r.lid) : 0), f = r.atb ? num(r.first) : num(r.right), t = num(r.total);
    if (t > 0) { o.first += f; o.firstTotal += t; if (no) { const b = (o.byNo[no] ??= [0, 0]); b[0] += f; b[1] += t; } }
    if (r.acts) { for (const k of ['block', 'rescue', 'cut', 'brk'] as const) o.acts[k] += num(r.acts[k]); o.acts.brk += num((r.acts as { shd?: number }).shd); } // 🛡 #101 「실드 깨기」 칸 = 새 판 실드 깨기(shd) + 옛 판 속성 브레이크(brk) 합침
    const st = recStar(r); if (no && st > (o.stars[no] ?? 0)) o.stars[no] = st; // 🐞 #140 옛 판 등급 별도 (지도와 같은 셈)
  }
  for (const [lid, s] of Object.entries(starByLid || {})) { const no = noOf(lid); if (no && num(s) > (o.stars[no] ?? 0)) o.stars[no] = Math.min(3, num(s)); }
  o.starSum = Object.values(o.stars).reduce((a, b) => a + b, 0);
  return o;
}
/** 반 전체 차시별 첫 시도 정답률 (낮은 순 = 약한 차시) */
export function weakNos(studs: BoardStu[]): { no: number; ok: number; total: number; pct: number }[] {
  const m: Record<number, [number, number]> = {};
  for (const s of studs) for (const [no, [a, b]] of Object.entries(s.byNo)) { const x = (m[Number(no)] ??= [0, 0]); x[0] += a; x[1] += b; }
  return Object.entries(m).filter(([, [, t]]) => t > 0).map(([no, [ok, total]]) => ({ no: Number(no), ok, total, pct: Math.round((100 * ok) / total) })).sort((a, b) => a.pct - b.pct || a.no - b.no);
}
