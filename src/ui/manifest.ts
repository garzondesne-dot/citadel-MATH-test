// 그래픽 배치표 — 그림 파일 이름은 여기에만 (정식 assets/manifest.js 방식)
// 'mimic:0' = 정식 monsters-extra-v2 시트의 3번 줄(이끼 미믹 · 정식 sprite 'extra:3')만 잘라 옮긴 것 · 칸 256 · 자세 3
// 끝에 '@h120' = 색 변형 (hue-rotate · 정식과 같은 꼴) — b2 는 그림 하나로 몬스터 · 보스를 색만 바꿔 씀
export interface Sheet { src: string; cols: number; rows: number; cell: number; poses: Record<'idle' | 'attack' | 'down', number>; names: string[] }

import GEN from './sheets.gen.json';
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
export function heroNudge(id: number, row: number): { dx: number; dy: number } {
  const f = heroOf(id).sprite || 'hero-sword-v3c.webp';
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
  anvil: { src: A('anvil-v1.webp'), cols: 3, left: 6, bottom: 8, width: 19 },
  dummy: { src: A('camp-dummy-v2.webp'), cols: 2, left: 67, bottom: 19, width: 11 },
  mail: { src: A('camp-mail-v2.webp'), cols: 2, left: 37, bottom: 33, width: 10 },
  hero: { left: 30, bottom: 15 },
};
