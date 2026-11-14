// 그래픽 배치표 — 그림 파일 이름은 여기에만 (정식 assets/manifest.js 방식)
// 'mimic:0' = 정식 monsters-extra-v2 시트의 3번 줄(이끼 미믹 · 정식 sprite 'extra:3')만 잘라 옮긴 것 · 칸 256 · 자세 3
// 끝에 '@h120' = 색 변형 (hue-rotate · 정식과 같은 꼴) — b2 는 그림 하나로 몬스터 · 보스를 색만 바꿔 씀
export interface Sheet { src: string; cols: number; rows: number; cell: number; poses: Record<'idle' | 'attack' | 'down', number>; names: string[] }

import { SUBJ } from '../engine/subject';
const GEN = SUBJ.themes; // 몬스터 줄 · 던전 배경 표 = 과목 팩 (#132 · #136)
export const SHEETS: Record<string, Sheet> = {
  mimic: { src: 'art/monster-mimic-v1.webp', cols: 3, rows: 1, cell: 256, poses: { idle: 0, attack: 1, down: 2 }, names: ['이끼 미믹'] },
  // 🧩 #132 정식 차시가 쓰는 몬스터 줄만 잘라 온 것 (tools/pack-from-release · 'new2:0' = 정식 'new:2')
  ...Object.fromEntries(Object.entries(GEN.sheets as Record<string, { src: string; cell: number; names: string[] }>).map(([k, v]) => [k, { src: v.src, cols: 3, rows: 1, cell: v.cell, poses: { idle: 0, attack: 1, down: 2 }, names: v.names }])),
};

export function spriteOf(ref: string) {
  const [base, h] = ref.split('@h');
  const [k, i] = (base || '').split(':');
  const s = SHEETS[k || ''];
  if (!s) throw new Error(`배치표에 없는 그림: ${ref}`);
  return { sheet: s, row: Number(i || 0) % s.rows, hue: Number(h) || 0, url: `${import.meta.env.BASE_URL}${s.src}` };
}

// 던전 배경 (정식 manifest.dungeons · 차시 팩 theme) — 원본 1672 × 941 을 정확히 절반(최근접)으로 줄인 판
export const DUNGEONS: Record<string, string> = {
  '01-burrow': 'art/dg-01-burrow-v1h.webp',
  ...(GEN.dungeons as Record<string, string>),
};
export const dungeonOf = (theme?: string) => `${import.meta.env.BASE_URL}${DUNGEONS[theme || ''] ?? DUNGEONS['01-burrow']}`;

// 용사 (정식 heroesV2 · 칸 80 × 64 · 4열 × 12줄 · 0줄 = idle · 2줄 = 공격 · 8줄 = 앉기) — b7: 31명 (그림 파일 이름 = hero-data.json sprite)
import { heroOf, PORTRAITS } from '../model/hero';
import { savedLook } from '../store/me.svelte';
export const HERO = { w: 80, h: 64, cols: 4, rows: 12, idleRow: 0, atkRow: 2, sitRow: 8 };
// 🎯 캐릭터 정중앙 (#121): 그림 틀(80 × 64 · 256)이 아니라 보이는 부분(알파 상자 · tools/make-sprite-bbox.py) 가운데를 칸 가운데 · 발을 칸 아래 기준선에
//   가로 = 서 있는 줄(0) 상자 가운데(공격 줄도 몸이 같은 자리 · 무기가 뻗어도 흔들리지 않게) · 앉기 줄(8)은 그 줄 상자 · 세로 = 그 줄 상자 아래
import BBOX from './sprite-bbox.json';
type Box = [number, number, number, number];
// 🧙 새 화풍 세밀 시트 (#166 · #167 · tools/hero-hd/cut.py): 칸 192 × 144 · 화면 = ½(k=2 → 96 × 72) · 발 = 칸 아래 8px(화면 4px)
//   옛 80 × 64 칸과 섞여도 됨: 화면 자리(레이아웃)는 옛 칸 80 × 64 그대로 · 새 그림은 그 칸 바닥 가운데에 발을 맞춰 위 · 옆으로 넘쳐 그림
//   ⏸ #170 꺼 둠: 오늘은 34명 같은 화풍(옛 꼬마 시트 + PixelLab 숨쉬기) → hero-data 가 새 파일을 안 가리킴 · 표 · 파일 · cut.py 는 남김(새 화풍을 다시 시작하면 hero-data sprite 만 바꿈)
export const HERO_HD: Record<string, { cw: number; ch: number; k: number; base: number }> = {
  'hero-sword-v4a.webp': { cw: 192, ch: 144, k: 2, base: 8 },
  'hero-priest-v4a.webp': { cw: 192, ch: 144, k: 2, base: 8 },
};
// 🫁 대기 = PixelLab 숨쉬기 8프레임 · 34명 모두 (#169 시험 → #170 · DECISIONS 「🧍 v1.0 용사 대기 = PixelLab 숨쉬기 34명」) — 되돌리기 = on: false 한 줄 (파일 하나: 줄 = 용사 번호 · 칸 80 × 64 · 8칸)
//   그 용사 줄에 그림이 있을 때만 · 새 화풍 세밀 시트(HERO_HD) 용사는 그 시트 그대로 · 늘이기 없이 칸만 차례로(약 1.3초에 8장)
export const IDLE8 = { on: true, src: 'art/heroes/hero-idle8-pl-v3.webp', frames: 8, rows: 34, ms: 1300, has: Array.from({ length: 34 }, (_, i) => i),
  /** 정중앙 (#121): 8칸을 합친 보이는 상자(알파 > 40) 가운데 → 칸 가운데 · 발 → 칸 바닥 = [dx, dy] */ nd: {0: [6, 1], 1: [8, 1], 2: [8, 1], 3: [14, 1], 4: [5, 1], 5: [2, 1], 6: [4, 1], 7: [7, 1], 8: [4, 1], 9: [18, 1], 10: [10, 1], 11: [9, 1], 12: [6, 1], 13: [10, 1], 14: [8, 1], 15: [12, 1], 16: [6, 1], 17: [13, 1], 18: [11, 1], 19: [16, 1], 20: [12, 1], 21: [14, 1], 22: [7, 1], 23: [4, 1], 24: [4, 1], 25: [8, 1], 26: [10, 1], 27: [10, 1], 28: [10, 1], 29: [11, 1], 30: [0, 1], 31: [3, 1], 32: [5, 1], 33: [8, 1]} as Record<number, [number, number]> };
export const idle8Of = (id: number) => (IDLE8.on && IDLE8.has.includes(id) && !HERO_HD[heroOf(id).sprite || ''] ? `${import.meta.env.BASE_URL}${IDLE8.src}` : null);
/** 👑 머리 자리 (tools/make-hero-head.py · 「후광 = 머리 뒤 중앙」 2026-11-13): [가로(보이는 상자 가운데에서), 높이(발에서 위로)] · 옛 칸 80 × 64 px · idle8 = 캠프 숨쉬기 시트 */
export function heroHead(id: number, idle8 = false): [number, number] {
  const H = (BBOX as unknown as { heads?: Record<string, [number, number]> }).heads ?? {};
  return H[idle8 && idle8Of(id) ? `idle8:${id}` : heroOf(id).sprite || 'hero-sword-v3c.webp'] ?? [0, 37];
}
/** 그리는 칸: cw · ch = 그림 칸 · w · h = 화면 칸 · dx · dy = 옛 80 × 64 칸 왼쪽 위에서 그릴 상자까지(배율 1 기준) */
export function heroGeo(id: number) {
  const f = heroOf(id).sprite || 'hero-sword-v3c.webp', hd = HERO_HD[f];
  if (!hd) return { hd: false, cw: HERO.w, ch: HERO.h, k: 1, w: HERO.w, h: HERO.h, dx: 0, dy: 0, base: 0 };
  const w = hd.cw / hd.k, h = hd.ch / hd.k;
  return { hd: true, cw: hd.cw, ch: hd.ch, k: hd.k, w, h, dx: (HERO.w - w) / 2, dy: HERO.h - h + hd.base / hd.k, base: hd.base };
}
export function heroNudge(id: number, row: number): { dx: number; dy: number } {
  const f = heroOf(id).sprite || 'hero-sword-v3c.webp';
  if (HERO_HD[f]) return { dx: 0, dy: 0 }; // 새 화풍 = 자를 때 이미 가운데 · 발 맞춤
  const rows = (BBOX.heroes as unknown as Record<string, Record<string, Box>>)[f];
  const base = rows?.[row === HERO.sitRow ? '8' : '0'], own = rows?.[String(row)] ?? base;
  if (!base || !own) return { dx: 0, dy: 0 };
  return { dx: HERO.w / 2 - (base[0] + base[2]) / 2, dy: HERO.h - own[3] };
}
/** 몬스터 칸(줄 · 자세 열)의 보이는 부분 → 가운데 · 발 맞춤 (칸 크기 기준 비율) */
export function monNudge(src: string, row: number, col: number, cell: number): { dx: number; dy: number } {
  const b = (BBOX.monsters as unknown as Record<string, Record<string, Box | null>>)[src.split('/').pop() ?? '']?.[`${row}:${col}`];
  return b ? { dx: (cell / 2 - (b[0] + b[2]) / 2) / cell, dy: (cell - b[3]) / cell } : { dx: 0, dy: 0 };
}
/** ⚔ 몬스터 보이는 몸통 (칸 비율 「x0,y0,x1,y1」 · 정식 bodies 자리 · fx/attack.ts body) */
export function monBody(src: string, row: number, col: number, cell: number): string {
  const b = (BBOX.monsters as unknown as Record<string, Record<string, Box | null>>)[src.split('/').pop() ?? '']?.[`${row}:${col}`];
  return b ? b.map((v) => (v / cell).toFixed(3)).join(',') : '';
}
/** 몬스터 칸의 보이는 높이 (칸 대비 비율 · 체력 막대를 머리 바로 위에 놓을 때) */
export function monVis(src: string, row: number, col: number, cell: number): number {
  const b = (BBOX.monsters as unknown as Record<string, Record<string, Box | null>>)[src.split('/').pop() ?? '']?.[`${row}:${col}`];
  return b ? (b[3] - b[1]) / cell : 1;
}
/** 용사 그림 주소 · id 를 안 주면 이 기기에 저장된 출전 용사 */
export const heroUrl = (id: number = savedLook().hero) => `${import.meta.env.BASE_URL}art/heroes/${heroOf(id).sprite || 'hero-sword-v3c.webp'}`;
/** 용사 얼굴(소개 카드) = 정식 hero-portraits-v2 6 × 6 */
export const portraitOf = (id: number) => { const c = PORTRAITS.list[String(id)]; return c ? { url: `${import.meta.env.BASE_URL}art/heroes/${PORTRAITS.src}`, cols: PORTRAITS.cols, rows: PORTRAITS.rows, c } : null; };

// 🏕 캠프 (정식 manifest.camp · 원본 픽셀 1182 × 1330 · 자리 = 정식 cs-v2 캠프 그대로)
const A = (f: string) => `${import.meta.env.BASE_URL}art/camp/${f}`;
export const CAMP = {
  size: [1182, 1330] as const,
  bg: A('camp-citadel-v2.webp'),
  castle: { src: A('camp-castle-dark-v2.webp'), lit: A('camp-castle-lights-v2.webp'), x: 334, y: 166, w: 547 },
  tent: { src: A('camp-tent-v1.webp'), x: 118, y: 668, w: 330 },
  gateOn: { src: A('camp-gate-on-v1.webp'), x: 820, y: 520, w: 362 },
  zones: { castle: [300, 165, 900, 464], tent: [118, 668, 448, 888], gate: [915, 575, 1095, 885] } as Record<string, [number, number, number, number]>,
  fire: { src: A('campfire-v2.webp'), cols: 4, rows: 2, frames: 8, ms: 120, aspect: 240 / 230, left: 45, bottom: 17, width: 15 },
  // ⚠ 물건 자리는 아래 CAMP_PROPS 한 곳 (학생 캠프 · 교사 「나」 내 캠프 · TV 교사 캠프 · 테스트 모드가 모두 이 표를 읽음)
  hero: { left: 30, bottom: 15 },
};

// 🏕 캠프 물건 자리표 = 한 곳 (🔨 2026-11-13 밤 선생님 「캠프라는 캠프는 모두 지침대로 배치해」 · V1-DESIGN 4-1 🏕 캠프 자리표)
//   자리 = 캠프 그림(1182 × 1330) 안 % (left · bottom · width) → 폰 · TV 크기가 달라도 같은 비율 · ⚙ 스위치로 꺼진 물건 = 그 자리만 비움(다른 물건 안 움직임)
//   🎯 허수아비 = ⚒ 모루와 ✏ 출제 공방(텐트) 사이 바닥 · 📋 게시판 던전(k = 'dummy' · 옛 허수아비 자리) = 게시판 그림 2칸(① 평소 ② 모집 중) + 오른쪽 옆 바닥 파란 포털
export type CampPropKey = 'anvil' | 'scare' | 'dummy' | 'mail';
export interface CampProp { k: CampPropKey; src: string; cols: number; aspect: string; left: number; bottom: number; width: number; feat?: 'forge' | 'scarecrow' | 'board' }
export const CAMP_PROPS: CampProp[] = [
  { k: 'anvil', src: A('anvil-v1.webp'), cols: 3, aspect: '362 / 362', left: 6, bottom: 8, width: 19, feat: 'forge' },
  { k: 'scare', src: A('camp-dummy-v2.webp'), cols: 2, aspect: '96 / 96', left: 24, bottom: 29.5, width: 9, feat: 'scarecrow' },
  { k: 'dummy', src: A('obj-board-v1.webp'), cols: 2, aspect: '192 / 192', left: 66, bottom: 19, width: 13, feat: 'board' },
  { k: 'mail', src: A('camp-mail-v2.webp'), cols: 2, aspect: '96 / 96', left: 42, bottom: 33, width: 10 },
];
/** 🌀 파란 포털 (정식 dportal-bonus · 게시판 오른쪽 옆 바닥 · 게시판보다 조금 작게) · 크기 = 평소 0.15(불씨) · 모집 0.6(숨쉬기 2초) · 출발 1.0(0.4초 · 소용돌이) */
export const CAMP_PORTAL = { src: A('obj-portal-v1.webp'), left: 79.5, bottom: 19, width: 8, aspect: '200 / 300', scale: { idle: 0.15, recruit: 0.6, open: 1 } };
export const campProp = (k: CampPropKey) => CAMP_PROPS.find((p) => p.k === k)!;
export const propPos = (p: { left: number; bottom: number; width: number }) => `left:${p.left}%;bottom:${p.bottom}%;width:${p.width}%`;
/** 그림 칸 한 장 (cols 칸 중 col 번째) */
export const cellBg = (src: string, cols: number, col: number) => `background-image:url(${src});background-size:${cols * 100}% 100%;background-position:${cols > 1 ? (col / (cols - 1)) * 100 : 0}% 0`;

// 🧊 얼음 공격 그림 (정식 hero-v2 12e8be3 docs/handoff/ice · 2026-11-13 밤) — 칸 5개 · 알파로 잘라 기준선 맞춤 · 가운데 반투명 그대로
//   btn = 노란 단추: ① 멀쩡 ② 금 하나 ③ 별 금 ④ 크게 금 ⑤ 깨져 흩어짐 (bar = 단추 몸이 있는 줄 · 단추 가운데에 맞춤)
//   tv = 용사 얼음: ① 발밑 서리 ② 반 ③ 다 얼음 ④ 녹으며 물방울 ⑤ 거의 녹음 (발 기준선 = 칸 아래)
/** ⛓ 속박 사슬 그림 (📜 2026-11-14 🎨 chain-bind · 6칸: ① 왼쪽 날아옴 ② 오른쪽 날아옴 ③ X 교차 ④ 철컥 번쩍 ⑤ 금 · 불티 ⑥ 조각나 흩어짐) */
export const CHAIN = { src: `${import.meta.env.BASE_URL}art/chain/chain-bind-v1.webp`, n: 6 };
export const ICE = {
  /** ❄ 얼음 결정 조각 8종 (📜 2026-11-14 🎨 ice-crystal · 정식 ce40993 · 96 × 96 칸: 0 가시 · 1 육각 · 2 세 갈래 · 3 눈송이 · 4 깨진 조각 · 5 반짝이 · 6 휜 조각 · 7 덩어리) — 용사 얼음 · ❄ 맞는 순간 파편 · 🧊 단추 깨짐 */
  crystal: { src: `${import.meta.env.BASE_URL}art/ice/ice-crystal-v1.webp`, n: 8, cell: 96 },
  btn: { src: `${import.meta.env.BASE_URL}art/ice/ice-btn-v1.webp`, cols: 5, w: 206, h: 342, barTop: 130, barBot: 210 },
  tv: { src: `${import.meta.env.BASE_URL}art/ice/ice-tv-v1.webp`, cols: 5, w: 202, h: 352 },
};

// 🏕 쉼터 놀이 그림 · 배경음 (#142-2 · 정식 manifest fun · td · bgm 에서 옮김) — 교실 TV 에서만
export const FUN_BG: Record<string, string> = { bal: 'art/fun/fun-arena-v1.webp', rev: 'art/fun/fun-dorm-v1.webp', quiz: 'art/fun/fun-ox-safe-v1.webp', nun: 'art/fun/fun-arena-v1.webp' };
export const TD_ART: Record<string, string> = { forest: 'art/td/td-forest-v1.webp', volcano: 'art/td/td-volcano-v1.webp', ice: 'art/td/td-ice-v1.webp', desert: 'art/td/td-desert-v1.webp', crypt: 'art/td/td-crypt-v1.webp' };
export const BGM: Record<string, string> = { rest: 'bgm/rest-v1.mp3', bal: 'bgm/bal-v1.mp3', rev: 'bgm/rev-v1.mp3', quiz: 'bgm/ox-v1.mp3', nun: 'bgm/nun-v1.mp3', td: 'bgm/td-v1.mp3' };
export const artUrl = (p: string) => `${import.meta.env.BASE_URL}${p}`;

//   CSS 변수(url) 로 넘기므로 절대 주소 (상대 주소는 그 변수를 쓰는 스타일 파일 기준으로 풀려 assets/ 아래를 가리킴)
export const absArt = (p: string) => (typeof document !== 'undefined' ? new URL(artUrl(p), document.baseURI).href : artUrl(p));
// ✏ 출제 책상 (obj-quest · 캠프 물건 꼴 192 × 96 · 칸 96 · ① 평소 ② 새 소식) — 캠프 자리 · 기능은 출제 공방 시안 컨펌 뒤
export const QUEST_DESK = { src: artUrl('art/camp/obj-quest-v1.webp'), cols: 2 };
// 💫 #161 상태이상 그림(정식 status-v1 · 칸 80 × 80 · 6칸 × 8줄 = 속성) · 몬스터 → 용사 속성 이펙트(정식 pfx 띠 재사용 · pixelfx MIT) · 속성 소리
export const STATUS = { src: 'art/status-v1.webp', w: 80, h: 80, cols: 6, ms: 600, kinds: ['stun', 'freeze', 'bind', 'burn', 'poison', 'shock', 'confuse', 'sleep'] as const };
export const ELEM_FX: Record<string, { src: string; w: number; h: number; n: number; fps: number; sfx: string }> = {
  stun: { src: 'art/pfx/fx-bash-v1.webp', w: 91, h: 81, n: 14, fps: 15, sfx: 'smash' },
  // 🌪 바람 공격 = 👍 받은 용사 스킬 🌬 질풍 띠 (📜 2026-11-13 밤 「바람이면 플레이어 스킬 중에 바람 스킬 하나 가져다 써」) · Scene 이 atkId 'wind' 일 때
  gale: { src: 'art/pfx/fx-gale-v1.webp', w: 152, h: 89, n: 17, fps: 15, sfx: 'wind' },
  freeze: { src: 'art/pfx/fx-frost-v1.webp', w: 126, h: 115, n: 19, fps: 15, sfx: 'frost' },
  bind: { src: 'art/pfx/fx-bind-v1.webp', w: 138, h: 81, n: 20, fps: 15, sfx: 'block' },
  burn: { src: 'art/pfx/fx-flame-v1.webp', w: 199, h: 165, n: 16, fps: 15, sfx: 'fire' },
  poison: { src: 'art/pfx/fx-void-v1.webp', w: 162, h: 130, n: 22, fps: 15, sfx: 'magic' },
  shock: { src: 'art/pfx/fx-spark-v1.webp', w: 129, h: 104, n: 14, fps: 15, sfx: 'spark' },
  confuse: { src: 'art/pfx/fx-vortex-v1.webp', w: 150, h: 114, n: 22, fps: 15, sfx: 'wind' },
  sleep: { src: 'art/pfx/fx-twinkle-v1.webp', w: 110, h: 110, n: 16, fps: 15, sfx: 'magic' },
};
export const SFX: Record<string, string> = { swing: 'sfx/swing-v2.mp3', launch: 'sfx/launch-v2.mp3', cut: 'sfx/cut-v2.mp3', sweep: 'sfx/sweep-v2.mp3', star: 'sfx/star-v2.mp3', special: 'sfx/special-v2.mp3', finish: 'sfx/finish-v2.mp3', finish2: 'sfx/finish-v2b.mp3', holy: 'sfx/holy-v2.mp3', correct: 'sfx/correct-v2.mp3', smash: 'sfx/smash-v2.mp3', frost: 'sfx/frost-v2.mp3', block: 'sfx/block-v2.mp3', fire: 'sfx/fire-v2.mp3', magic: 'sfx/magic-v2.mp3', spark: 'sfx/spark-v2.mp3', wind: 'sfx/wind-v2.mp3', hurt: 'sfx/hurt-v2.mp3', click: 'sfx/click-v2.mp3' };
