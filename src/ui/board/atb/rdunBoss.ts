// 🎲 게시판 던전 몬스터 = 랜덤 던전 그림 (📜 11/20 요청 #4 Y9 · 결정 14절 · 몬스터배정-rdun-초안)
//   차시마다 던전(테마) 하나 · 연습 · 일반 · 도전 = 다른 몬스터 · 대기 · 공격 · 맞음 · 쓰러짐 모션 = 그 시트 5칸 · 대표 행동 = 차시에 붙은 그대로
//   그림 이름 · 시트 = 화면 쪽(src/ui) · 규칙(engine · tune) = 그림을 모름 → 여기서 BossCfg 에 그림 · 이름만 입힘
import { RDUN, SHEETS } from '../../manifest';
import type { BossCfg, Diff } from '../../../board/atb/tune';

/** 차시 → 던전 (Y9 · d12 = 예비) */
export const RDUN_OF: Record<number, string> = { 2: 'd01', 3: 'd04', 4: 'd03', 5: 'd02', 6: 'd06', 7: 'd06', 8: 'd10', 9: 'd05', 10: 'd07', 11: 'd11', 12: 'd08', 13: 'd09' };
/** 난이도별 그림 = 배정표 행 번호 (docs/board-atb/design/몬스터배정-rdun-초안.md · Y9 「초안대로」) · 연습 = 작은 놈 · 일반 = 중간 · 도전 = 가장 큰 놈 */
const R = (d: string, e: number, n: number, h: number) => ({ easy: `${d}:${e}`, normal: `${d}:${n}`, hard: `${d}:${h}` });
export const ROWS: Partial<Record<number, Partial<Record<Diff, string>>>> = {
  2: R('d01', 0, 2, 5), 3: R('d04', 0, 2, 4), 4: R('d03', 0, 3, 4), 5: R('d02', 0, 1, 5), 6: R('d06', 0, 2, 4), 7: R('d06', 0, 2, 4),
  8: R('d10', 1, 2, 4), 9: R('d05', 0, 2, 4), 10: R('d07', 1, 2, 4), 11: R('d11', 0, 2, 4), 12: R('d08', 0, 2, 4), 13: R('d09', 0, 2, 3),
};
const nameOf = (ref: string) => { const [k, r] = ref.split(':'); return (SHEETS[k!] as { names?: string[] } | undefined)?.names?.[Number(r)] ?? ''; };
/** 그 판 보스 = 차시 설정(대표 행동 · 약점 · 공격 차례) + 랜덤 던전 그림 · 이름 (그림은 늘 왼쪽을 봄 = 반전 없음) */
export function bossArt(cfg: BossCfg, diff: Diff): BossCfg & { bg: string } {
  const d = RDUN_OF[cfg.no], D = d ? RDUN[d] : undefined; if (!d || !D) return { ...cfg, bg: '' };
  const ref = ROWS[cfg.no]?.[diff] ?? (diff === 'easy' ? `${d}:1` : diff === 'normal' ? `${d}:3` : D.boss != null ? `${d}:${D.boss}` : D.bossRef ?? `${d}:4`);
  return { ...cfg, sprite: ref, name: nameOf(ref) || cfg.name, flip: {}, bg: D.bg };
}
