// 📅 #73 예약 모집 시각 칩 (📜 선생님 2026-11-21): 오늘부터 7일 · 평일 16:00 ~ 21:30 · 주말 9:00 ~ 21:30 · 30분 · 지난 시각 · 5분 안 = 빼기 · KST
const KST = 9 * 3600e3, MIN = 60e3, DAY = 86400e3;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export interface ResvDay { key: string; label: string; times: { at: number; label: string }[] }
/** 시각 → 「11/22(토) 오후 8:00」 */
export function resvLabel(at: number): string {
  const k = new Date(at + KST), h = k.getUTCHours(), m = k.getUTCMinutes();
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()}(${DOW[k.getUTCDay()]}) ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`;
}
const hm = (at: number) => { const k = new Date(at + KST), h = k.getUTCHours(), m = k.getUTCMinutes(); return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`; };
/** 고를 수 있는 날 · 시각 (now 기준 7일 · 5분 안 · 지난 시각 뺌) */
export function resvDays(now: number, block?: (at: number) => boolean): ResvDay[] {
  const k0 = new Date(now + KST), day0 = Date.UTC(k0.getUTCFullYear(), k0.getUTCMonth(), k0.getUTCDate()) - KST, out: ResvDay[] = [];
  for (let d = 0; d < 7; d++) {
    const base = day0 + d * DAY, dow = new Date(base + KST).getUTCDay(), weekend = dow === 0 || dow === 6;
    const from = weekend ? 9 : 16, times: { at: number; label: string }[] = [];
    for (let t = from * 60; t <= 21 * 60 + 30; t += 30) { const at = base + t * MIN; if (at < now + 5 * MIN) continue; if (block?.(at)) continue; times.push({ at, label: hm(at) }); }
    const k = new Date(base + KST);
    if (times.length) out.push({ key: k.toISOString().slice(0, 10), label: d === 0 ? '오늘' : d === 1 ? '내일' : `${k.getUTCMonth() + 1}/${k.getUTCDate()}(${DOW[dow]})`, times });
  }
  return out;
}
