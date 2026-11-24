// 🎲 게시판 던전 몬스터 = 2 ~ 11 컨셉 몬스터(📜 #98-b) · 12 ~ 17 랜덤 던전 그림 (📜 11/20 요청 #4 Y9 · 결정 14절 · 몬스터배정-rdun-초안)
//   차시마다 던전(테마) 하나 · 연습 · 일반 · 도전 = 다른 몬스터 · 대기 · 공격 · 맞음 · 쓰러짐 모션 = 그 시트 5칸 · 대표 행동 = 차시에 붙은 그대로
//   그림 이름 · 시트 = 화면 쪽(src/ui) · 규칙(engine · tune) = 그림을 모름 → 여기서 BossCfg 에 그림 · 이름만 입힘
import { BUNDLES, bundleReady, RDUN, SHEETS } from '../../manifest';
import type { BossCfg, Diff } from '../../../board/atb/tune';

/** 차시 → 던전 (Y9 · 📜 요청 #57 14 ~ 17 = 랜덤 던전 그림 임시 · 함수 던전 그림이 오면 바꿔 끼움) = 배경 */
export const RDUN_OF: Record<number, string> = { 2: 'd01', 3: 'd04', 4: 'd03', 5: 'd02', 6: 'd06', 7: 'd06', 8: 'd10', 9: 'd05', 10: 'd07', 11: 'd11', 12: 'd08', 13: 'd09', 14: 'd12', 15: 'd02', 16: 'd07', 17: 'd10' };
/** 난이도별 그림 = 배정표 행 번호 (docs/board-atb/design/몬스터배정-rdun-초안.md · Y9 「초안대로」) · 연습 = 작은 놈 · 일반 = 중간 · 도전 = 가장 큰 놈 */
const R = (d: string, e: number, n: number, h: number) => ({ easy: `${d}:${e}`, normal: `${d}:${n}`, hard: `${d}:${h}` });
export const ROWS: Partial<Record<number, Partial<Record<Diff, string>>>> = {
  2: R('d01', 0, 2, 5), 3: R('d04', 0, 2, 4), 4: R('d03', 0, 3, 4), 5: R('d02', 0, 1, 5), 6: R('d06', 0, 2, 4), 7: R('d06', 0, 2, 4),
  8: R('d10', 1, 2, 4), 9: R('d05', 0, 2, 4), 10: R('d07', 1, 2, 4), 11: R('d11', 0, 2, 4), 12: R('d08', 0, 2, 4), 13: R('d09', 0, 2, 3),
  // 📜 요청 #57 = 2 ~ 13 이 안 쓴 칸만 (겹치지 않게) · 14 사슬 문지기 = 장난감 공방 · 15 능선의 용 = 용암 · 16 대기관 = 태엽 · 17 거울 군주 = 어둠 저택
  14: { easy: 'd12:1', normal: 'd12:2', hard: 'd12:3' }, 15: R('d02', 3, 4, 2), 16: { easy: 'd07:0', normal: 'd07:3', hard: 'd12:0' }, 17: { easy: 'd10:0', normal: 'd10:3', hard: 'd12:4' },
};
/** 그림 시트 이름 (개발 · 기록용 · 화면엔 안 씀) */
export const sheetName = (ref: string) => { const [k, r] = ref.split(':'); return (SHEETS[k!] as { names?: string[] } | undefined)?.names?.[Number(r)] ?? ''; };
/** 📜 #98-b 원래 컨셉 몬스터 차시 (2 ~ 11) = 설정표 그림 · 반전 그대로 · 연습 · 일반 · 도전 같은 보스 · 배경 = 그 차시 던전 */
export const CONCEPT = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
/** 📜 #98-b 5동작 시트(cm5-a 5줄 · cm5-b 4줄 · 칸 = 대기 A · 대기 B · 공격 · 맞음 · 쓰러짐 · 모두 왼쪽을 봄) = 과목 themes.json sheets 에 cols 5 로 들어오면 자동으로 이걸 씀 · 반전 없음 */
export const CM5_OF: Record<number, string> = { 2: 'cm5-a:0', 3: 'cm5-a:1', 4: 'cm5-a:2', 5: 'cm5-a:3', 6: 'cm5-a:4', 7: 'cm5-a:4', 8: 'cm5-b:0', 9: 'cm5-b:1', 10: 'cm5-b:2', 11: 'cm5-b:3' };
const has5 = (ref: string) => { const s = SHEETS[ref.split(':')[0]!]; return !!s && s.cols >= 5 && Number(ref.split(':')[1]) < s.rows; };
/** 📜 #106 함수 던전(14 ~ 17) 묶음 그림이 들어왔으면 = 연습 첫 몬스터 · 일반 둘째(fn5-{차시}) · 도전 👑 보스(fn5-boss 의 그 차시 줄 · 칸 384)
 *  그 시트 그림이 아직이면 null → 지금 임시 그림 그대로 */
export function fnRef(no: number, diff: Diff): string | null {
  const k = `fn5-${no}`, b = BUNDLES[k]; if (!b) return null;
  const ref = diff === 'hard' ? b.bossRef ?? null : `${k}:${diff === 'easy' ? 0 : Math.min(1, b.ids.length - 1)}`;
  return ref && bundleReady(ref.split(':')[0]!) ? ref : null;
}
/** 그 판 보스 = 차시 설정(대표 행동 · 약점 · 공격 차례) + 그림 · 이름
 *  2 ~ 11 = 컨셉 몬스터(설정표 sprite · flip · 5동작 시트가 오면 그것) · 12 · 13 = 설정표 그림 · 14 ~ 17 = 랜덤 던전 임시(난이도별)
 *  theme = 그 차시 팩의 던전 배경(있으면 컨셉 몬스터 배경으로 · 없으면 랜덤 던전 배경) */
export function bossArt(cfg: BossCfg, diff: Diff, theme?: string): BossCfg & { bg: string } {
  if (cfg.raid) return { ...cfg, flip: {}, bg: '' }; // 🏰 레이드 보스 = 설정 그림 그대로 (⏳ 임시 · 붉은 빛은 화면이 raid 를 보고 씀)
  const ds = Object.values(RDUN_OF), d = RDUN_OF[cfg.no] ?? ds[cfg.no % ds.length], D = d ? RDUN[d] : undefined;
  if (CONCEPT.has(cfg.no)) { const c5 = CM5_OF[cfg.no]; return c5 && has5(c5) ? { ...cfg, sprite: c5, flip: {}, bg: theme || D?.bg || '' } : { ...cfg, flip: cfg.flip ?? {}, bg: theme || D?.bg || '' }; }
  if (cfg.no === 12 || cfg.no === 13) return { ...cfg, flip: {}, bg: D?.bg ?? '' };
  const fn = fnRef(cfg.no, diff); if (fn) return { ...cfg, sprite: fn, flip: {}, bg: theme || D?.bg || '' }; // 📜 #106 함수 던전 묶음 그림이 왔으면
  if (!d || !D) return { ...cfg, bg: '' }; // 설정 없는 차시 = 던전 돌려 씀
  const ref = ROWS[cfg.no]?.[diff] ?? (diff === 'easy' ? `${d}:1` : diff === 'normal' ? `${d}:3` : D.boss != null ? `${d}:${D.boss}` : D.bossRef ?? `${d}:4`);
  return { ...cfg, sprite: ref, name: cfg.name, flip: {}, bg: D.bg }; // 📜 요청 #71 ① 화면 이름 = 설정표 이름 (그림 시트 이름은 안 씀 · sheetName 으로만)
}
