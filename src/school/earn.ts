// 💎 · 📜 얻는 길 (📜 2026-11-20 선생님 「마정석 누르면 도전과제부터 복습 허수아비 성채던전까지 마정석 구할 수 있는 루트 알려 주는 창 · 장황하게 스크롤 말고 정갈하게」 · 머리 🔨)
//   창 = 스크롤 없는 한 장 · 2열 타일 · 타일마다 아이콘 + 이름 + 한 줄 + 「💎 +n」(코드 값 그대로 · 범위 = 가장 적게 ~ 가장 많이) · 누르면 그 물건(캠프 tap 이름)
//   값은 여기서 계산하지 않고 각 규칙 파일의 상수를 읽기만 함 → 규칙을 바꾸면 창도 따라 바뀜
import { CHALS } from './challenges';
import { DUMMY_G } from './dummy';
import { CASTLE_GEM, CASTLE_PHOTO_GEM } from './castle';
import { G } from './reward';
import { KEY_CHEST } from './keys';
import { GEM as BOARD_GEM, TEAM_X } from '../board/board';

export type EarnKind = 'gem' | 'scroll';
/** go = 캠프 tap() 이름 (scare · castle · dummy · tentdeco · mail · gate) */
export interface EarnTile { k: string; ic: string; name: string; how: string; amt: string; go: string }

const rng = (lo: number, hi: number) => (lo === hi ? `+${lo}` : `+${lo}~${hi}`);
const chalGems = CHALS.map((c) => Number(c.reward.gem) || 0).filter((n) => n > 0);
const chalScrolls = CHALS.map((c) => Number(c.reward.scroll) || 0).filter((n) => n > 0);
const dummyAll = Object.values(DUMMY_G).filter((n) => typeof n === 'number') as number[];

/** 💎 얻는 길 7칸 (머리 🔨 순서 그대로) */
export const GEM_TILES: EarnTile[] = [
  { k: 'chal', ic: '🏆', name: '도전과제', how: '목표를 채우고 기록 텐트에서 받기', amt: rng(Math.min(...chalGems), Math.max(...chalGems)), go: 'tentdeco' },
  { k: 'scare', ic: '🎯', name: '복습 허수아비', how: '지난 차시 문제를 다시 처치', amt: rng(Math.min(...dummyAll), Math.max(...dummyAll)), go: 'scare' },
  { k: 'castle', ic: '🏰', name: '성채 던전', how: '평가 방을 처음 처치', amt: rng(Math.min(CASTLE_GEM.room, CASTLE_GEM.first), CASTLE_GEM.roomBoss), go: 'castle' },
  { k: 'board', ic: '📋', name: '게시판 던전', how: '혼자 · 친구와 한 판 (팀이면 더)', amt: rng(BOARD_GEM.perItem, Math.round((BOARD_GEM.perItem * BOARD_GEM.itemMax + BOARD_GEM.clear) * Math.max(...TEAM_X))), go: 'dummy' },
  { k: 'raid', ic: '⚔', name: '수업 레이드', how: '수업에 참여 · 맞힐수록 더', amt: rng(G.join, G.join + G.solvedMax + G.perfect + G.bossPerfect), go: 'gate' },
  { k: 'chest', ic: '🔑', name: '열쇠 보물상자', how: '입장 열쇠를 모아 상자 열기', amt: rng(KEY_CHEST.gem, KEY_CHEST.gem), go: 'gate' },
  { k: 'mail', ic: '📮', name: '우편 선물', how: '선생님이 보낸 선물 받기', amt: '여러 개', go: 'mail' },
];

/** 📜 얻는 길 = 서술형 📸 통과 곳 (수업 · 허수아비 · 성채) + 🏆 도전과제(📜 보상 있는 것) · 📸 = 처음 통과 1 + 만점 1 + 점수 오르면 1 (castle photoScrolls) */
export const SCROLL_TILES: EarnTile[] = [
  { k: 'raid', ic: '⚔', name: '수업 서술형', how: '수업에서 ✍ 쓰고 📸 사진 통과', amt: '+1~3', go: 'gate' },
  { k: 'scare', ic: '🎯', name: '허수아비 서술형', how: '복습에서 ✍ 쓰고 📸 사진 통과', amt: '+1~3', go: 'scare' },
  { k: 'castle', ic: '🏰', name: '성채 서술형', how: '평가 방에서 ✍ 쓰고 📸 사진 통과', amt: '+1~3', go: 'castle' },
  ...(chalScrolls.length ? [{ k: 'chal', ic: '🏆', name: '도전과제', how: '성채 층 보스 처치 등', amt: rng(Math.min(...chalScrolls), Math.max(...chalScrolls)), go: 'tentdeco' }] : []),
];
export const earnTiles = (k: EarnKind) => (k === 'gem' ? GEM_TILES : SCROLL_TILES);
/** 성채 📸 서술형 통과 💎 (참고 · 타일 한 줄에는 안 씀) */
export const PHOTO_GEM = CASTLE_PHOTO_GEM;
