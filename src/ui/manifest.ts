// 그래픽 배치표 — 그림 파일 이름은 여기에만 (정식 assets/manifest.js 방식)
// 'mimic:0' = 정식 monsters-extra-v2 시트의 3번 줄(이끼 미믹 · 정식 sprite 'extra:3')만 잘라 옮긴 것 · 칸 256 · 자세 3
export interface Sheet { src: string; cols: number; rows: number; cell: number; poses: Record<'idle' | 'attack' | 'down', number>; names: string[] }

export const SHEETS: Record<string, Sheet> = {
  mimic: { src: 'art/monster-mimic-v1.webp', cols: 3, rows: 1, cell: 256, poses: { idle: 0, attack: 1, down: 2 }, names: ['이끼 미믹'] },
};

export function spriteOf(ref: string) {
  const [k, i] = ref.split(':');
  const s = SHEETS[k || ''];
  if (!s) throw new Error(`배치표에 없는 그림: ${ref}`);
  return { sheet: s, row: Number(i || 0) % s.rows, url: `${import.meta.env.BASE_URL}${s.src}` };
}
