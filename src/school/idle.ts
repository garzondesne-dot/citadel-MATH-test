// 🤝 손 놓은 학생 · 🧱 같은 칸 막힘 (📜 2026-11-16 선생님 「추천대로」 · DECISIONS 🌊 ① ② · 머리 🔨)
//   ① 몬스터 공격 단계(정찰 끝 뒤) · 아직 다 맞히지 않은 학생이 90초 동안 아무 입력이 없으면 → 폰 「🤝 첫 줄만 같이 볼까?」(💡 도움 2단 · 없으면 1단 · 예전 💡)
//      + 리모컨 그 학생 칸 노랑 「멈춤」 = rooms/{수업}/players/{나}/idle = { mid, at } (학생 자기 칸 · 규칙 그대로) · 입력하면 풀림 · 몬스터마다 한 번 · TV 없음 · 기록 없음(성적 아님)
//   ② 같은 소문제에서 「2번 이상 틀림 또는 ① 멈춤」 학생 ≥ 3 → 리모컨 위 띠 「문제 n · ②칸 3명 막힘 · 전체 설명 권장」 · 누르면 닫힘 · 칸마다 한 번 · 이름 없이 수만 · TV 없음
import type { Given, LessonPack, Room } from '../model/types';
import { grade } from '../engine/grade';
import { attemptsOf, chainItems, chainSubs, gradeAttempt, isChain, itemsFor } from '../raid/raid';

export const IDLE_MS = 90_000;
/** 지금 「🤝」 를 띄울 때인가 */
export const shouldNudge = (o: { attack: boolean; done: boolean; asked: boolean; now: number; last: number }) => o.attack && !o.done && !o.asked && o.now - o.last >= IDLE_MS;
/** 리모컨: 이 몬스터에서 멈춘 학생인가 */
export const idleOn = (R: Room | null | undefined, uid: string, mid: string | null | undefined) => !!mid && (R?.players?.[uid] as { idle?: { mid?: string } | null } | undefined)?.idle?.mid === mid;

/** ② 막힌 칸: 그 몬스터 소문제(⚔ 소레이드 = 단계)마다 「2번 이상 틀렸고 아직 못 맞힘 · 또는 ① 멈춤(아직 못 맞힌 첫 칸)」 학생 수 */
export const STUCK_N = 3;
export function stuckCells(L: LessonPack, R: Room, mid: string, uids: string[]): number[] {
  const out: number[] = [];
  const chainOn = isChain(L, R, mid);
  for (const u of uids) {
    const wrong: number[] = [], right: boolean[] = [];
    if (chainOn) {
      const its = chainItems(L, R, mid, u, 0);
      for (const t of chainSubs(R, mid, u)) {
        if (t.p || t.ph || t.s == null) continue; const q = its[t.s]; if (!q) continue;
        const g = (q.type === 'multi' ? (Array.isArray(t.g) ? t.g : t.g && typeof t.g === 'object' ? Object.values(t.g as object) : []) : t.g) as Given;
        if (grade(q, g)) right[t.s] = true; else wrong[t.s] = (wrong[t.s] || 0) + 1;
      }
    } else {
      for (const a of attemptsOf(R, mid, u)) gradeAttempt(L, R, mid, u, a.attempt, a.given).marks.forEach((m, i) => { if (m) right[i] = true; else if (a.given?.[i] != null) wrong[i] = (wrong[i] || 0) + 1; });
    }
    const n = chainOn ? chainItems(L, R, mid, u, 0).length : itemsFor(L, R, mid, u, 0).length;
    const idleAt = idleOn(R, u, mid) ? Array.from({ length: n }, (_, i) => i).find((i) => !right[i]) ?? -1 : -1;
    for (let i = 0; i < n; i++) if (!right[i] && ((wrong[i] || 0) >= 2 || i === idleAt)) out[i] = (out[i] || 0) + 1;
  }
  return Array.from({ length: out.length }, (_, i) => out[i] || 0);
}
