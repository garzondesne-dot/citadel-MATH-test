// 🔔 교시 시각 (정식 js/raid/sched.js BELLS · PERIODS 그대로 · 한국 시각) — 수업 열기 · 끝 예상 · 문 닫는 시각
export const BELLS: Record<number, [string, string]> = { 1: ['09:00', '09:50'], 2: ['10:00', '10:50'], 3: ['11:00', '11:50'], 4: ['12:00', '12:50'], 5: ['14:00', '14:50'], 6: ['15:00', '15:50'], 7: ['16:10', '17:00'] };
/** 요일(월 1 … 금 5)마다 있는 교시 */
export const PERIODS: Record<number, number[]> = { 1: [1, 2, 3, 4, 5, 6, 7], 2: [1, 2, 3, 4, 5, 6, 7], 3: [1, 2, 3, 4, 5, 6], 4: [1, 2, 3, 4, 5, 6, 7], 5: [1, 2, 3, 4, 5] };
const KST = 9 * 3600e3;
/** 한국 시각의 날짜 · 요일 (월 1 … 일 7) */
export function kst(now: number) { const d = new Date(now + KST); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), dow: d.getUTCDay() || 7, hm: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
const mins = (hm: string) => { const [h, m] = hm.split(':').map(Number); return (h ?? 0) * 60 + (m ?? 0); };
/** 오늘 hm(분) 의 시각 (ms) */
export function at(now: number, minOfDay: number) { const k = kst(now); return Date.UTC(k.y, k.m - 1, k.d) - KST + minOfDay * 60e3; }
/** 지금 교시 (시작 10분 전부터 끝까지) · 없으면 0 */
export function periodNow(now: number): number {
  const k = kst(now);
  for (const p of PERIODS[k.dow] || []) { const b = BELLS[p]; if (b && k.hm >= mins(b[0]) - 10 && k.hm < mins(b[1])) return p; }
  return 0;
}
/** 지금 교시가 끝나는 시각 (정식 periodEnd) · 교시 밖이면 null */
export function periodEnd(now: number): number | null { const p = periodNow(now), b = BELLS[p]; return p && b ? at(now, mins(b[1])) : null; }
/** ⏳ 보스 타임바 끝 (📜 2026-11-15 「시간표 켜도 수동 열기」): 지금이 그 반의 시간표 교시 안이면 그 교시 끝 · 아니면 null(= 열 때부터 50분) — week = 요일 → 교시 → 반 */
export function classPeriodEnd(week: Record<string, Record<string, string>>, cls: string, now: number): number | null {
  const p = periodNow(now); if (!p) return null;
  return week[String(kst(now).dow)]?.[String(p)] === cls ? periodEnd(now) : null;
}
export const hhmm = (t: number) => { const d = new Date(t + KST); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
export const DOW = ['', '월', '화', '수', '목', '금', '토', '일'];
