// 🎲 게시판 던전 몬스터 = 랜덤 던전 그림 (📜 11/20 요청 #4 Y9 · 결정 14절 · 몬스터배정-rdun-초안)
//   차시마다 던전(테마) 하나 · 연습 · 일반 · 도전 = 다른 몬스터 · 대기 · 공격 · 맞음 · 쓰러짐 모션 = 그 시트 5칸 · 대표 행동 = 차시에 붙은 그대로
//   그림 이름 · 시트 = 화면 쪽(src/ui) · 규칙(engine · tune) = 그림을 모름 → 여기서 BossCfg 에 그림 · 이름만 입힘
import { RDUN, SHEETS } from '../../manifest';
import type { BossCfg, Diff } from '../../../board/atb/tune';

/** 차시 → 던전 (Y9 · d12 = 예비) */
export const RDUN_OF: Record<number, string> = { 2: 'd01', 3: 'd04', 4: 'd03', 5: 'd02', 6: 'd06', 7: 'd06', 8: 'd10', 9: 'd05', 10: 'd07', 11: 'd11', 12: 'd08', 13: 'd09' };
/** ⏳ 난이도별 그림 = 배정 초안 표의 행 번호 (표가 오면 여기만 채움 · 「d01:3」 · 「bg1:0」) · 빈 칸 = 임시(연습 = 둘째 줄 · 일반 = 넷째 줄 · 도전 = 그 던전 보스) */
export const ROWS: Partial<Record<number, Partial<Record<Diff, string>>>> = {};
const nameOf = (ref: string) => { const [k, r] = ref.split(':'); return (SHEETS[k!] as { names?: string[] } | undefined)?.names?.[Number(r)] ?? ''; };
/** 그 판 보스 = 차시 설정(대표 행동 · 약점 · 공격 차례) + 랜덤 던전 그림 · 이름 (그림은 늘 왼쪽을 봄 = 반전 없음) */
export function bossArt(cfg: BossCfg, diff: Diff): BossCfg & { bg: string } {
  const d = RDUN_OF[cfg.no], D = d ? RDUN[d] : undefined; if (!d || !D) return { ...cfg, bg: '' };
  const ref = ROWS[cfg.no]?.[diff] ?? (diff === 'easy' ? `${d}:1` : diff === 'normal' ? `${d}:3` : D.boss != null ? `${d}:${D.boss}` : D.bossRef ?? `${d}:4`);
  return { ...cfg, sprite: ref, name: nameOf(ref) || cfg.name, flip: {}, bg: D.bg };
}
