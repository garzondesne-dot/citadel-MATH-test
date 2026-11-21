// ⚔ 기사단 토벌 주간 — 게시판 던전 반 대항전 (🔨 #51 · 📜 2026-11-21 선생님 확정 · hero-v2 CLASS-WAR-v1.md · 서버 칸 = docs/board-atb/SERVER-v1.md 4절)
//   반 = 기사단 · 판이 끝나면 각자 공적을 자기 반에 더함(합 그대로) · 매주 월요일 0시(KST) 마감 → 1 · 2 · 3위 반 학생 💎 300 · 150 · 100 (우편 선물 · 받기)
//   마감 = 서버 함수가 없으므로 월요일 0시 뒤 처음 접속한 교사 기기가 지난주를 확정(done) · 💎 지급 스위치(school/war.pay · 베타 = 끔) 켜져 있을 때만 선물
//   🧪 테스트 반 · 연습방 = 공적 없음 · 테스트 반 = 순위 밖
import type { Store } from '../model/types';
import { CLASSES, isBeta, uidOf } from '../school/school';
import { addTo, txOn } from '../store/atomic';
import { josa } from './josa';

export const WAR = 'classWar', KNIGHTS = 'school/knights', WAR_CFG = 'school/war';
/** 한 판에 더할 수 있는 공적 최대 (규칙도 같은 값으로 막음) */
export const MERIT_MAX = 200;
export const PRIZE = [300, 150, 100] as const;
export const PRIZE_TITLE = '왕의 기사단';
/** 처음 이름 · 문장 (교사가 바꿈) */
export const KNIGHT0: Record<string, { name: string; crest: string }> = {
  '1-1': { name: '붉은 사자단', crest: '🦁' }, '1-2': { name: '푸른 매단', crest: '🦅' }, '1-3': { name: '황금 곰단', crest: '🐻' },
  '1-4': { name: '은빛 늑대단', crest: '🐺' }, '1-5': { name: '초록 사슴단', crest: '🦌' },
};
const KST = 9 * 3600e3, DAY = 86400e3;
const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
/** 그 시각이 속한 주 = 그 주 월요일 KST 날짜 (YYYY-MM-DD) */
export function weekOf(t: number): string {
  const k = new Date(t + KST), dow = (k.getUTCDay() + 6) % 7; // 월 = 0
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - dow * DAY).toISOString().slice(0, 10);
}
export const prevWeek = (week: string) => new Date(Date.parse(`${week}T00:00:00Z`) - 7 * DAY).toISOString().slice(0, 10);
/** 이번 주 마감까지 남은 날 (월 = 7 · 일 = 1) */
export function daysLeft(t: number): number { const k = new Date(t + KST); return 7 - ((k.getUTCDay() + 6) % 7); }
/** 이번 주 마감(다음 월요일 0시 KST)까지 남은 분 */
export function minsLeft(t: number): number { const end = Date.parse(`${weekOf(t)}T00:00:00Z`) - KST + 7 * DAY; return Math.ceil((end - t) / 60000); }
/** 순위에 드는 반 = 기사단 표가 있는 반 중 테스트 반 빼고 */
export function warClasses(S: Store | null): string[] {
  const names = (S?.get<Record<string, unknown>>(KNIGHTS)) || {};
  return CLASSES.filter((c) => (KNIGHT0[c] || names[ck(c)]) && !isBeta(S, c));
}
export const knightOf = (S: Store | null, cls: string) => ({ ...(KNIGHT0[cls] ?? { name: `${cls}반 기사단`, crest: '🛡' }), ...((S?.get<{ name?: string; crest?: string }>(`${KNIGHTS}/${ck(cls)}`)) || {}) });
export const payOn = (S: Store | null) => !!S?.get<{ pay?: boolean }>(WAR_CFG)?.pay;
export interface Stand { cls: string; name: string; crest: string; pts: number; rank: number }
/** 그 주 순위 (공적 큰 순 · 같으면 반 이름 순 · 같은 공적 = 같은 등수) */
export function standings(S: Store | null, week: string, sum0?: Record<string, number> | null): Stand[] {
  const sum = sum0 ?? (S?.get<Record<string, number>>(`${WAR}/${week}/sum`)) ?? {};
  const rows = warClasses(S).map((c) => ({ cls: c, ...knightOf(S, c), pts: Math.max(0, Number(sum[ck(c)]) || 0), rank: 0 })).sort((a, b) => b.pts - a.pts || (a.cls < b.cls ? -1 : 1));
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1]!.pts === r.pts ? rows[i - 1]!.rank : i + 1; });
  return rows;
}
/** 판 하나의 공적을 내 반에 더함 (테스트 반 · 0 이하 = 안 더함) — 반 합 · 내 칸 둘 다 서버 increment */
export function addMerit(S: Store, cls: string, num: number, pts: number, now = S.now()): number {
  const n = Math.max(0, Math.min(MERIT_MAX, Math.round(Number(pts) || 0)));
  if (!n || !cls || !num || isBeta(S, cls)) return 0;
  const w = weekOf(now);
  addTo(S, `${WAR}/${w}/sum/${ck(cls)}`, n);
  addTo(S, `${WAR}/${w}/by/${ck(cls)}/${num}`, n);
  return n;
}
/** 지난주 왕의 깃발 (마감된 1위 · 없으면 null) */
export function lastKing(S: Store | null, now: number, wk0?: { done?: { rank?: string[] }; sum?: Record<string, number> } | null): Stand | null {
  const pw = prevWeek(weekOf(now)), d = wk0 !== undefined ? wk0?.done : S?.get<{ rank?: string[] }>(`${WAR}/${pw}/done`);
  const c = d?.rank?.[0]; if (!c) return null;
  const st = standings(S, pw, wk0 !== undefined ? wk0?.sum ?? {} : undefined).find((x) => x.cls === c);
  return st ?? { cls: c, ...knightOf(S, c), pts: 0, rank: 1 };
}
/** 🗓 마감 (교사 기기 · 월요일 0시 뒤 처음): 지난주 done 이 없으면 순위 확정 → done → 스위치 켜져 있으면 1~3위 반 학생에게 우편 선물
 *  두 교사 기기가 동시에 해도 done 은 transaction 으로 한 번만 · 돌려주는 값 = 이번에 확정했으면 순위 · 아니면 null */
/** ✉ 📜 #70 우편함 보상 편지 (STORY-LINES-v1 3절 · 제목 「⚔ 토벌 주간 보상」) */
export function warLetter(rank: number, name: string, g: number): string {
  if (rank === 1) return `⚔ 토벌 주간 보상 · 왕의 이름으로. ${josa(name, '이/가')} 가장 많은 균열을 닫았다. 💎 ${g} 과 「${PRIZE_TITLE}」 칭호를 내린다.`;
  if (rank <= 3) return `⚔ 토벌 주간 보상 · 왕의 이름으로. ${name}의 공을 기억한다. 💎 ${g} 을 내린다.`;
  return '⚔ 토벌 주간 보상 · 이번 주도 수고했다. 다음 주에 다시 깃발을 올리자.';
}
export async function closeWeek(S: Store, now = S.now()): Promise<{ week: string; rank: string[]; paid: number } | null> {
  const pw = prevWeek(weekOf(now)), path = `${WAR}/${pw}/done`;
  if (S.fetch) { await S.fetch(`${WAR}/${pw}`).catch(() => null); await S.fetch(KNIGHTS).catch(() => null); } // 거울이 아직 안 받았으면 빈 합으로 마감하지 않게 먼저 받음
  if (S.get(path)) return null;
  const st = standings(S, pw).filter((x) => x.pts > 0), rank = st.map((x) => x.cls), pay = payOn(S);
  let mine = false;
  const ok = await txOn<{ at: number; rank: string[]; paid: boolean }>(S, path, (cur) => { if (cur) return undefined; mine = true; return { at: now, rank, paid: pay }; });
  if (!ok || !mine) return null;
  let paid = 0;
  // ✉ 📜 #72 (선생님 2026-11-21) 4위 아래 반(공적 0 반 포함) = 우편함 편지만 · 💎 없음(받기 = 읽음)
  if (pay) for (const s of standings(S, pw)) {
    const g = s.pts > 0 ? PRIZE[s.rank - 1] ?? 0 : 0;
    if (S.fetch) await S.fetch(`accounts/${ck(s.cls)}`).catch(() => null);
    const nums = Object.keys((S.get<Record<string, unknown>>(`accounts/${ck(s.cls)}`)) || {}).map(Number).filter((n) => n > 0);
    for (const n of nums) { S.set(`gifts/${uidOf(s.cls, n)}/war_${pw}`, { g, at: now, fun: warLetter(g ? s.rank : 99, s.name, g), got: false, hold: true }); if (g) paid++; }
  }
  return { week: pw, rank, paid };
}
