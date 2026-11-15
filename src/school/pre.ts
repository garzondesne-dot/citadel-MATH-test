// ⚔ 선제 공격 (📜 2026-11-16 선생님 「넣어」 · DECISIONS 🌊 ③ · 머리 🔨)
//   지난 수업 뒤(= 그 반 마지막 수업 닫힌 시각 school/lastClose/{반}) 그 반 학생이 🎯 허수아비로 고친 칸 수 = 다음 수업 첫 몬스터 체력을 그만큼 깎고 시작
//   1칸 = 체력 1 · 최대 = 그 몬스터 체력의 10%(PRE_PCT) · 고친 칸 = bonus/{반}/{번호}/{차시}/{몬스터}.fixAt(틀림 · 안 풂 → 처치가 된 시각 · 허수아비가 적음)
//   방 meta.pre = { mid: 첫 몬스터, fixed: 칸 수, who: 학생 수 } (수업 시작 때 교사 기기가 한 번 적음) · TV 「⚔ 선제 공격! 복습한 친구 n명 · 체력 −k」 · 이름 없음 · 🧪 테스트 수업 = 따로 칸(~test)
import type { LessonPack, Room, Store } from '../model/types';

export const PRE_PCT = 10;
export type Pre = { mid: string; fixed: number; who: number };
const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
export const lastClosePath = (cls: string, test = false) => `school/lastClose/${ck(cls)}${test ? '~test' : ''}`;
type BonCls = Record<string, Record<string, Record<string, { fixAt?: number } | null> | null> | null> | unknown[] | null;
/** 고친 칸 수 · 학생 수 (since 뒤) */
export function preCount(bon: BonCls, since: number): { fixed: number; who: number } {
  let fixed = 0; const who = new Set<string>();
  const byN = Array.isArray(bon) ? Object.fromEntries(bon.map((x, i) => [String(i), x])) : bon || {};
  for (const [n, byL] of Object.entries(byN)) for (const byM of Object.values((byL as Record<string, unknown>) || {})) for (const x of Object.values((byM as Record<string, { fixAt?: number } | null>) || {})) {
    if (x && typeof x === 'object' && Number(x.fixAt) > since) { fixed++; who.add(n); }
  }
  return { fixed, who: who.size };
}
/** 첫 몬스터 단계 id */
export const firstMonster = (L: LessonPack) => L.steps.find((s) => s.kind === 'monster')?.id ?? null;
/** 깎는 체력 = min(칸 수, ⌊체력 × 10%⌋) */
export const preDmg = (R: Room | null | undefined, mid: string, max: number) => { const p = R?.meta.pre; return p && p.mid === mid ? Math.max(0, Math.min(Number(p.fixed) || 0, Math.floor((max * PRE_PCT) / 100))) : 0; };
/** 수업 시작 때 한 번 (교사 기기) — 기준 시각이 없으면(첫 수업) 0 */
export async function armPre(S: Store, L: LessonPack, code: string, cls: string, test: boolean): Promise<Pre | null> {
  const mid = firstMonster(L); if (!mid || !cls) return null;
  const read = async <T,>(p: string) => (S.fetch ? await S.fetch<T>(p).catch(() => null) : S.get<T>(p));
  const since = Number(await read<number>(lastClosePath(cls, test))) || 0; if (!since) return null;
  const c = preCount(await read<BonCls>(`bonus/${ck(cls)}`), since); if (!c.fixed) return null;
  const pre = { mid, ...c }; S.set(`rooms/${code}/meta/pre`, pre); return pre;
}
