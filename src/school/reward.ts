// 💎 · 🌱 수업 보상 (📜 2026-11-15 출시 막는 것 3 · 정식 js/raid/result.js save · gem.js G · grow.js XP 값 그대로 · 값을 바꾸지 않음)
//   💎 레이드 = 참여 4 + 맞힌 소문제 수(최대 12) · 키 raid_{수업} · 늘어난 만큼만(upsert) · 하루 한도 100 안
//   💎 ⚡ 퍼펙트 6 = 그 수업에서 첫 시도에 다 맞힌 몬스터가 하나라도 · 키 perfect_{수업} · 👑 형성평가 만점 6 · 키 bossperfect_{수업} (한 번 · 한도 안)
//   🌱 EXP = 참여 10 + 제출 2 × 시도 + 맞힌 소문제 2 × 개수 + 보스 처치 참여 10 + 형성평가 만점 5 (한 수업 최대 300 · 키 raid_{수업} · 늘어난 만큼만)
//   🆙 레벨 5 · 10 · 15 … = 💎 6 (한도 밖 · 키 lv{n}) · 서버 칸 = 정식과 같음: gem/{반}/{번호}/log/{키} = { g, at, why } · xp/{반}/{번호}/log/{키} = { xp, at, why }
//   (아직 안 옮김: 🔁 연속 참여 · 🎁 첫 출정 EXP · 🔥 연습 사슬 · 💡 힌트 EXP — HANDOVER 메모)
import type { LessonPack, Room } from '../model/types';
import { bossHp, bossState, chainRecord, isChain, mastery, plainRecord } from '../raid/raid';

export const G = { join: 4, solvedMax: 12, perfect: 6, bossPerfect: 6, level5: 6, dayCap: 100 } as const;
export const XP = { join: 10, submit: 2, correct: 2, fixed: 0, bossWin: 10, perfect: 5 } as const;
export type Parts = { join: number; submit: number; correct: number; fixed: number; bossWin: number; perfect: number };
const XP_MAX = 300;
export const xpOf = (p: Parts) => Math.min(XP_MAX, (Object.keys(XP) as (keyof Parts)[]).reduce((a, k) => a + XP[k] * (Number(p[k]) || 0), 0));
/** 정식 grow.js level: Lv.L → L+1 = 40 + 20 × (L − 1) */
export function levelOf(total: number): number { let lv = 1, rest = Math.max(0, Number(total) || 0); while (rest >= 40 + 20 * (lv - 1) && lv < 99) { rest -= 40 + 20 * (lv - 1); lv++; } return lv; }

/** 정식 compute() 의 parts · perfects (오개념 · 개념별 · 사다리는 기록 쪽 몫) */
export function partsOf(L: LessonPack, R: Room, uid: string, now: number): { parts: Parts; perfects: number } {
  let submit = 0, best = 0, fixed = 0, perfects = 0;
  for (const s of L.steps) {
    if (s.kind !== 'monster' || !L.monsters[s.id]) continue;
    if (isChain(L, R, s.id)) {
      const r = chainRecord(L, R, s.id, uid);
      submit += r.submitted ? 1 : 0; best += r.best;
      fixed += r.stOk.filter((ok, i) => ok && !r.stFirst[i]).length;
      if (r.submitted && r.n && r.stFirst.every(Boolean)) perfects++;
    } else {
      const r = plainRecord(L, R, s.id, uid), first = r.tries[0];
      submit += r.tries.length; best += r.best;
      const firstOk = Array.from({ length: r.total }, (_, i) => !!(first && first.attempt === 0 && first.marks[i]));
      const everOk = Array.from({ length: r.total }, (_, i) => r.tries.some((t) => t.marks[i]));
      fixed += everOk.filter((ok, i) => ok && !firstOk[i]).length;
      if (r.submitted && r.total && firstOk.every(Boolean)) perfects++;
    }
  }
  let bossWin = 0, perfect = 0, mast: boolean[] = [];
  if (L.boss) {
    const bs = bossState(L, R, uid); mast = mastery(L, R, uid);
    const tried = bs.some((x) => x.firstTried);
    fixed += mast.filter((ok, i) => ok && !bs[i]?.first).length;
    bossWin = bossHp(L, R, now).won && tried ? 1 : 0;
    perfect = mast.length > 0 && mast.every(Boolean) ? 1 : 0;
  }
  return { parts: { join: 1, submit, correct: best + mast.filter(Boolean).length, fixed, bossWin, perfect }, perfects };
}

/** 받을 것 (키 → 💎 · 한도 안?) · EXP */
export function rewardOf(L: LessonPack, R: Room, uid: string, code: string, now: number) {
  const { parts, perfects } = partsOf(L, R, uid, now);
  const gems: { key: string; g: number; why: string; upsert?: boolean }[] = [{ key: `raid_${code}`, g: G.join + Math.min(G.solvedMax, parts.correct), why: '레이드', upsert: true }];
  if (perfects > 0) gems.push({ key: `perfect_${code}`, g: G.perfect, why: '⚡ 퍼펙트' });
  if (parts.perfect) gems.push({ key: `bossperfect_${code}`, g: G.bossPerfect, why: '👑 형성평가 만점' });
  return { parts, perfects, gems, xp: { key: `raid_${code}`, n: xpOf(parts) } };
}

type Log = Record<string, { g?: number; xp?: number } | undefined>;
/** 받기 (정식 Gem.add · Grow.add 와 같은 뜻 · 같은 수업 = 늘어난 만큼만) → 지갑 · EXP 에 더한 값과 서버에 쓸 칸
 *  wallet.day = 하루 한도 · gemLog · xpLog = 서버 log (이미 받은 것) */
export function settle(rw: ReturnType<typeof rewardOf>, st: { gem: number; xp: number; day: Record<string, number> | undefined; gemLog: Log; xpLog: Log }, today: string, at: number) {
  let gem = 0; const day = { ...(st.day || {}) }, writes: Record<string, unknown> = {}, lines: string[] = [];
  for (const x of rw.gems) {
    const had = Number(st.gemLog[x.key]?.g) || 0;
    if (had && !x.upsert) continue;
    const used = Number(day[today]) || 0, g = Math.max(0, Math.min(x.g - had, G.dayCap - used));
    if (!g) continue;
    gem += g; day[today] = used + g; writes[`gem/log/${x.key}`] = { g: had + g, at, why: x.why }; lines.push(`💎 +${g} ${x.why}`);
  }
  const hadX = Number(st.xpLog[rw.xp.key]?.xp) || 0, dx = Math.max(0, rw.xp.n - hadX);
  if (dx) writes[`xp/log/${rw.xp.key}`] = { xp: hadX + dx, at, why: '레이드' };
  // 🆙 레벨 5 · 10 · 15 … (한도 밖 · 한 번)
  const lv0 = levelOf(st.xp), lv1 = levelOf(st.xp + dx);
  for (let lv = lv0 + 1; lv <= lv1; lv++) if (lv % 5 === 0 && !st.gemLog[`lv${lv}`]) { gem += G.level5; writes[`gem/log/lv${lv}`] = { g: G.level5, at, why: `Lv.${lv} 달성` }; lines.push(`💎 +${G.level5} Lv.${lv}`); }
  if (dx) lines.unshift(`+${dx} EXP`);
  return { gem, xp: dx, day, writes, lines };
}
