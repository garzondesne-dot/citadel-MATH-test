// 📝 제출 모드 v2 덧붙임 (📜 2026-11-14 선생님 「B D 추천대로 진행」 · 머리 DECISIONS db0d7c5)
//   B 공부 증거 한 줄 = 수업 끝 개인 결과에 「오늘 푼 문제 n개 · 지난주보다 +k」 (두 모드 모두)
//     n = 그날 그 학생이 낸 소문제 수(raid solvedN · 형성평가 · 소레이드 단계 포함 · 다 맞힌 뒤 연습 뺌) · 같은 날 수업 여럿 = 더함
//     지난주 = 7일 전 같은 요일의 n · 기록 없으면 앞만 · k ≤ 0 이면 뒤를 뺌(깎는 말 없음)
//   D 모드 바꾼 기록 = 바꿀 때마다 { 학생 · 시각 · 방향 · 화면 } · 이 기기 저장(서버는 출시 때 같은 꼴) · 교사 대시보드 반별 한 줄 · 학생 화면에 안 보임
import { kstDay } from '../board/board';

const DAYS = 'citadel-v1-solved', LOG = 'citadel-v1-modelog', DAY = 864e5;
type DayMap = Record<string, Record<string, Record<string, number>>>; // 학생 → 날 → 수업 코드 → n
const read = <T>(k: string, d: T): T => { try { return (JSON.parse(localStorage.getItem(k) || 'null') as T) ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 사생활 창 */ } };

/** 이 수업에서 낸 소문제 수를 그날 칸에 적음 (같은 수업 = 덮어씀 · 같은 날 다른 수업 = 따로) */
export function noteSolved(who: string, code: string, n: number, now: number): void {
  const m = read<DayMap>(DAYS, {}), d = kstDay(now);
  ((m[who] ??= {})[d] ??= {})[code] = n;
  write(DAYS, m);
}
/** 그날 낸 소문제 수 합 (기록 없으면 null) */
export function daySolved(who: string, now: number): number | null {
  const x = read<DayMap>(DAYS, {})[who]?.[kstDay(now)];
  return x ? Object.values(x).reduce((a, v) => a + (Number(v) || 0), 0) : null;
}
/** 결과 화면 한 줄 */
export function proofLine(today: number, lastWeek: number | null): string {
  const k = lastWeek == null ? 0 : today - lastWeek;
  return `오늘 푼 문제 ${today}개${k > 0 ? ` · 지난주보다 +${k}` : ''}`;
}
export const lastWeekOf = (who: string, now: number) => daySolved(who, now - 7 * DAY);

// ── D 모드 바꾼 기록 ──
export interface ModeLog { who: string; cls?: string; num?: number; at: number; dir: 'g2s' | 's2g'; screen: string }
export function logMode(e: ModeLog): void { const a = read<ModeLog[]>(LOG, []); a.push(e); write(LOG, a.slice(-500)); }
export const modeLogs = (): ModeLog[] => read<ModeLog[]>(LOG, []);
/** 반별 한 줄: 제출 모드 학생 수(마지막 방향 = 제출) · 오늘 바꾼 횟수 · 학생별 횟수 · 마지막 모드 */
export function modeSummary(logs: ModeLog[], cls: string | null, now: number) {
  const mine = logs.filter((l) => !cls || l.cls === cls), today = kstDay(now);
  const by = new Map<string, { who: string; num?: number; n: number; today: number; last: 'game' | 'submit' }>();
  for (const l of [...mine].sort((a, b) => a.at - b.at)) {
    const r = by.get(l.who) ?? { who: l.who, num: l.num, n: 0, today: 0, last: 'game' as const };
    r.n++; if (kstDay(l.at) === today) r.today++; r.last = l.dir === 'g2s' ? 'submit' : 'game'; by.set(l.who, r);
  }
  const rows = [...by.values()].sort((a, b) => (a.num ?? 999) - (b.num ?? 999));
  return { submitN: rows.filter((r) => r.last === 'submit').length, todayN: rows.reduce((a, r) => a + r.today, 0), rows };
}
