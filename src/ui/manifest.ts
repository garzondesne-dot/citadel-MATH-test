// 그래픽 배치표 — 그림 파일 이름은 여기에만 (정식 assets/manifest.js 방식)
// 'mimic:0' = 정식 monsters-extra-v2 시트의 3번 줄(이끼 미믹 · 정식 sprite 'extra:3')만 잘라 옮긴 것 · 칸 256 · 자세 3
// 끝에 '@h120' = 색 변형 (hue-rotate · 정식과 같은 꼴) — b2 는 그림 하나로 몬스터 · 보스를 색만 바꿔 씀
export interface Sheet { src: string; cols: number; rows: number; cell: number; poses: Record<'idle' | 'attack' | 'down', number>; names: string[] }

export const SHEETS: Record<string, Sheet> = {
  mimic: { src: 'art/monster-mimic-v1.webp', cols: 3, rows: 1, cell: 256, poses: { idle: 0, attack: 1, down: 2 }, names: ['이끼 미믹'] },
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
};
export const dungeonOf = (theme?: string) => `${import.meta.env.BASE_URL}${DUNGEONS[theme || ''] ?? DUNGEONS['01-burrow']}`;

// 용사 (정식 heroesV2 · 칸 80 × 64 · 4열 × 12줄 · 0줄 = idle) — b4 는 검사(로안) 하나
export const HERO = { src: 'art/hero-sword-v3c.webp', w: 80, h: 64, cols: 4, rows: 12, idleRow: 0, name: '검사' };
export const heroUrl = () => `${import.meta.env.BASE_URL}${HERO.src}`;

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
