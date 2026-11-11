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
