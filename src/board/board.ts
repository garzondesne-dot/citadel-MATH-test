import type { LessonPack, Room } from '../model/types';
import { BOSS_ID, bossState, chainItems, chainRecord, isChain, itemsFor, plainRecord, stepOf } from '../raid/raid';

// 📋 게시판 던전 규칙 (#143 · DECISIONS 「🏕 v1.0 쉼터 · 📋 게시판 던전 확정」) — 화면은 이 함수만 읽음
//   판 = 그 차시의 문제(몬스터) → 형성평가(보스)만 · 개념 · 도입 없음 · 「다음 판에서」 자리도 풂 · 첫 판부터 숫자 바뀐 판(meta.fresh)
export const SEC_PER_ITEM = 90;
/** 등급 (첫 시도 기준 · 틀림 + 미제출 비율) */
export const GRADE: [string, number][] = [['S', 0.1], ['A', 0.25], ['B', 0.5]];
/** 💎 (❓ #143-b 답 오기 전 = 손발 추천 A: 맞힌 소문제 × 1 (최대 12) + 시간 안 클리어 4 · 정식 레이드 solvedMax · clear) · 하루 한도 = 정식 DAY_CAP */
export const GEM = { perItem: 1, itemMax: 12, clear: 4, dayCap: 100 };
/** 팀 배수 · 수호 보너스 · 도전자만 (확정안) */
export const TEAM_X = [1, 1, 1.1, 1.2, 1.3];

export function boardPack(L: LessonPack): LessonPack {
  const steps = L.steps.filter((s) => (s.kind === 'monster' && L.monsters[s.id]) || (s.kind === 'boss' && L.boss)).map((s) => ({ ...s, later: false }));
  return { ...L, steps };
}
/** 숫자 바뀐 판부터: 모든 몬스터 · 보스 */
export const freshAll = (L: LessonPack) => Object.fromEntries([...L.steps.filter((s) => s.kind === 'monster').map((s) => s.id), BOSS_ID].map((k) => [k, true]));
/** 소문제 수 (= 팀 공동 체력 · 시간 계산) */
export function itemCount(L: LessonPack, R: Room): number {
  return L.steps.reduce((a, s) => a + (s.kind === 'boss' ? L.boss?.items || 0 : isChain(L, R, s.id) ? chainItems(L, R, s.id, '_', 0).length : itemsFor(L, R, s.id, '_', 0).length), 0);
}
/** 이 학생이 지금 단계를 다 했나 (다 맞힘 · 기회를 다 씀) → 다음 단계로 */
export function stepDone(L: LessonPack, R: Room, uid: string): boolean {
  const s = stepOf(L, R);
  if (!s) return false;
  if (s.kind === 'boss') return bossState(L, R, uid).every((x) => x.ok || x.left <= 0);
  if (s.kind !== 'monster') return true;
  if (isChain(L, R, s.id)) { const r = chainRecord(L, R, s.id, uid); return r.done || r.fail || r.locked; }
  const r = plainRecord(L, R, s.id, uid);
  return r.perfect || (r.submitted && !r.canRetry);
}
/** 첫 시도 기준 맞힘 · 틀림 · 미제출 (소문제 수) */
export function firstTry(L: LessonPack, R: Room, uid: string) {
  let ok = 0, bad = 0, none = 0;
  L.steps.forEach((s) => {
    if (s.kind === 'boss') { bossState(L, R, uid).forEach((x) => { if (x.first) ok++; else if (x.firstTried) bad++; else none++; }); return; }
    if (isChain(L, R, s.id)) { const r = chainRecord(L, R, s.id, uid), reached = r.done || r.fail || r.locked ? r.n : r.stage; const o = r.stFirst.filter(Boolean).length; ok += o; bad += Math.max(0, reached - o); none += Math.max(0, r.n - reached); return; }
    const r = plainRecord(L, R, s.id, uid), t = r.tries[0];
    if (!t) none += r.total; else { ok += t.correct; bad += t.total - t.correct; }
  });
  return { ok, bad, none, total: ok + bad + none };
}
export function gradeOf(f: { bad: number; none: number; total: number }): string {
  const r = f.total ? (f.bad + f.none) / f.total : 1;
  return (GRADE.find(([, m]) => r <= m) || ['C'])[0];
}
/** 💎 한 판 (하루 한도 전) · n = 팀 인원 · right = 맞힌 소문제(최고) */
export function gemsOf(o: { right: number; clear: boolean; n: number }): { base: number; team: number; total: number } {
  const base = Math.min(GEM.itemMax, o.right * GEM.perItem) + (o.clear ? GEM.clear : 0), x = TEAM_X[Math.max(1, Math.min(4, o.n))] ?? 1;
  const team = Math.round(base * x) - base;
  return { base, team, total: base + team };
}
/** 오늘 날짜 (KST · 정식 today) */
export const kstDay = (t: number) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
