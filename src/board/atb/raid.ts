// 🏰 성채 레이드 문항 (📜 11/24 선생님 · DECISIONS 14415bc ① 「바로 쓰는 방만 먼저 · 고쳐 쓸 방은 나중」 · 설계 castle-raid/ITEMS.md)
//   층 = 성채 평가 팩 하나(eval-1 · 2 · 3) · 레이드 = 「바로 쓸 수 있음」 방만 · 판 1 ~ 6 (판 0 = 학습지 원본은 뺌 = first 없는 pool)
//   📸 서술형 방 = 단계 문항만(사진 단계 없음 = 팩의 photo 칸을 읽지 않음) · 혼자 성채 기록과 안 섞임(문항만 빌려 씀)
import type { LessonPack } from '../../model/types';
import type { CastlePack } from '../../school/castle';
import { RAID, RAID_BOSSES } from './tune';

/** 층별 레이드 방 (ITEMS.md 「바로 쓸 수 있음」 · 순서 = 학생마다 엇갈려 시작하는 차례) · 🔧 고친 뒤 쓸 방 = 머리 방이 팩을 고치면 여기 더함 */
export const RAID_ROOMS: Record<1 | 2 | 3, string[]> = {
  1: ['q05', 'q07', 'q11'],
  2: ['q02', 'q03', 'q04', 'q05', 'q07', 'q10'],
  3: ['q11', 'q14', 'q15', 'q16', 'q06', 'q13', 'q05'],
};
export const raidFloorOf = (packId: string): 1 | 2 | 3 | null => { const m = /^eval-([1-3])$/.exec(packId); return m ? (Number(m[1]) as 1 | 2 | 3) : null; };

/** 성채 팩 → 레이드 차시 팩 (no = 101 ~ 103 · 게시판 ATB 엔진 · quiz 가 그대로 읽음) · 레이드 방이 하나도 없으면 null */
export function raidPack(P: CastlePack, floor: 1 | 2 | 3 = raidFloorOf(P.id) ?? 1): LessonPack | null {
  const rooms = RAID_ROOMS[floor].map((id) => P.rooms.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r && r.vers.length > 1);
  if (!rooms.length) return null;
  const B = RAID_BOSSES[floor];
  return {
    v: 1, id: `raid-${floor}`, no: RAID.no[floor], title: `${floor}층 ${B.name}`, unit: P.unit, theme: 'citadel-boss', defaultPct: 100,
    steps: rooms.map((r) => ({ kind: 'monster', id: r.id, title: r.title.replace(/^👑\s*/, '') })),
    monsters: Object.fromEntries(rooms.map((r) => [r.id, { title: r.title.replace(/^👑\s*/, ''), sprite: r.sprite, attack: 'pause', retry: { pool: r.vers }, ...(r.chain ? { chain: { pool: r.vers } } : {}) }])),
  } as LessonPack;
}
