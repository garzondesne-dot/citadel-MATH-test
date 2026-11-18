// 🔥 탐사대 (📜 #67 · DECISIONS 「탐사대 확정」 2026-11-18): 그 차시를 배움터 📖 예습에서 몬스터 2개 이상 처치 → 그 차시 본레이드에서만 탐사대
//   보이는 차이만(점수 · 능력치 0) · 학생 폰이 수업 방에 들어올 때 rooms/{code}/players/{pid}/exp = { n, m: { 몬스터: 처치 수 } } 를 씀 (규칙 = 내 칸만 · 그대로)
//   TV = 정찰 때 탐사대 용사(최대 3명) 횃불 · 빛 구멍 · 나머지 = 이름 옆 🔥
import type { Room } from '../model/types';
import { prepKey, type PrepRec } from './prepopen';

export const EXP_MIN = 2, EXP_TV = 3;
export interface Exp { n: number; m?: Record<string, number>; test?: boolean }
/** 예습 기록 → 처치한 몬스터 수 · 몬스터마다 처치 수 */
export function expFrom(rec: Record<string, PrepRec | null> | null | undefined): Exp {
  const m: Record<string, number> = {};
  for (const [mid, r] of Object.entries(rec || {})) if (r && (r.clear || Number(r.kills) > 0)) m[mid] = Math.max(1, Number(r.kills) || 0);
  return { n: Object.keys(m).length, m };
}
export const prepRecPath = (base: string, lid: string) => `${base}/review/${prepKey(lid)}`;
export const expOf = (R: Room | null | undefined, uid: string): Exp | null => { const e = (R?.players?.[uid] as { exp?: Exp } | undefined)?.exp; return e && Number(e.n) >= EXP_MIN ? e : null; };
/** 탐사대 = 예습 처치 2 이상 (들어온 순서) */
export const explorers = (R: Room | null | undefined): string[] => Object.keys(R?.players || {}).filter((u) => !!expOf(R, u));
/** 노련한 탐험가 = 예습 3개 차시 · 차시마다 처치 2 이상 */
export const veteranN = (review: Record<string, unknown> | null | undefined) => Object.entries(review || {}).filter(([k, v]) => k.startsWith('prep_') && v && typeof v === 'object' && expFrom(v as Record<string, PrepRec>).n >= EXP_MIN).length;
/** 학생 폰 한 줄 */
export const expLine = (e: Exp | null, mid: string | null | undefined) => (!e ? '' : mid && e.m?.[mid] ? `🔥 탐사 때 이 몬스터를 ${e.m[mid]}번 쓰러뜨렸어요` : '🔥 이 던전을 탐사했어요');
