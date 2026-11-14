// 👥 게시판 동료 (📜 2026-11-14 선생님 「게시판 레이드 전투 화면에 동료들 표시 · 동료들 공격하는 장면 볼 수 있게」) — 순수 계산
//   동료 = 팀 글 순서(나 빼고 · 최대 3) · 이름 = 팀 줄과 같은 이름 · 용사 · 강화 · 스킬 = 방 players(심장 박동) → 없으면 팀 글 용사
//   공격 사건 = TV 와 같은 hitsOf(snapOf) · 정답 · 오답 글자는 만들지 않음 · 한꺼번에 들어오면 줄 세워 하나씩
import type { LessonPack, Room } from '../../model/types';
import { stepOf } from '../../raid/raid';
import { hitsOf, snapOf, type Hit, type Snap } from '../tv/arena/events';

export interface Mate { uid: string; name: string; hero: number; enh: number; fx: string }
/** 줄 선 공격 하나 (k = 들어온 순서 번호 · 늘기만 함) */
export interface MateHit extends Hit { k: number }
export const MATE_MAX = 3, QUEUE_MAX = 6;

/** 동료 목록: ids = 팀 순서 · me 빼고 · 최대 3명 */
export function matesOf(ids: string[], me: string, R: Room | null, names: Record<string, string>, heroes: Record<string, number> = {}): Mate[] {
  return ids.filter((u) => u !== me).slice(0, MATE_MAX).map((u) => {
    const p = R?.players?.[u];
    return { uid: u, name: names[u] ?? p?.nick ?? '친구', hero: Number(p?.hero ?? heroes[u] ?? 0) || 0, enh: Math.max(0, Math.min(10, Number(p?.enh) || 0)), fx: p?.fx || '' };
  });
}

/** 동료 기록 지금 모습 (몬스터 · 보스 단계만 · 아니면 null) */
export function mateSnaps(L: LessonPack, R: Room, mates: string[]): { key: string; cur: Record<string, Snap> } | null {
  const st = stepOf(L, R); if (!st || (st.kind !== 'monster' && st.kind !== 'boss')) return null;
  const cur: Record<string, Snap> = {}; for (const u of mates) cur[u] = snapOf(L, R, st, u);
  return { key: `${R.state.step}|${st.id}`, cur };
}

/** 지난 모습과 비교 → 번호 붙은 공격 사건 (단계가 바뀌면 비교하지 않음 = 사건 없음) */
export function mateHits(was: { key: string; cur: Record<string, Snap> } | null, now: { key: string; cur: Record<string, Snap> }, k0: number): MateHit[] {
  if (!was || was.key !== now.key) return [];
  return hitsOf(was.cur, now.cur).map((h, i) => ({ ...h, k: k0 + i + 1 }));
}

/** 줄 세우기: 들어온 순서대로 · 너무 많이 쌓이면(QUEUE_MAX 넘게) 동료마다 하나로 묶음(데미지 합 · 맞힘 하나라도 있으면 맞힘 · TV 와 같은 꼴) */
export function queueHits(q: MateHit[], add: MateHit[], max = QUEUE_MAX): MateHit[] {
  const all = [...q, ...add]; if (all.length <= max) return all;
  const by = new Map<string, MateHit>();
  for (const h of all) {
    const o = by.get(h.u);
    if (!o) { by.set(h.u, { ...h }); continue; }
    o.dmg += h.dmg; o.k = Math.max(o.k, h.k);
    if (h.kind === 'hit') o.kind = 'hit'; else if (o.kind === 'miss' && h.kind === 'practice') o.kind = 'practice';
    if (h.perfect) o.perfect = true;
  }
  return [...by.values()];
}
