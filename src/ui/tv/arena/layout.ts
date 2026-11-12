// 📺 TV 전투 장면 배치 (#157 · 정식 js/raid/hall.js buildFight · css .raid2 · .fh2 를 화면 비율로 옮김) — 순수 계산(시험 가능)
//   몬스터 = 장면 가운데 크게(화면 높이의 46% · 보스 54%) · 머리 위 굵은 체력 막대 + 숫자
//   용사 = 아래 절반 · 정식은 두 줄(72% · 87%) 고르게 → 인원이 적으면 크게 · 가운데로 모음 (1 · 3 · 15 · 26명 단계)
export interface Slot { x: number; y: number; s: number; flip: boolean }
export interface ArenaBox { mon: { cx: number; top: number; size: number }; hp: { x: number; y: number; w: number; h: number }; shadow: { cx: number; y: number; w: number } }

/** 몬스터 · 체력 막대 자리 (W × H 픽셀 · 오른쪽에 시연 칸이 있으면 장면 폭 = W 의 54%) */
//   vis = 몬스터 그림의 보이는 높이(칸 대비 · manifest monVis) → 체력 막대 = 보이는 머리 바로 위
export function arenaBox(W: number, H: number, boss: boolean, split = false, vis = 1): ArenaBox {
  const cx = split ? W * 0.27 : W / 2;
  const size = Math.min(H * (boss ? 0.54 : 0.46), (split ? W * 0.5 : W) * 0.42);
  const top = H * (boss ? 0.06 : 0.1); // 발 = top + size (보스 0.60 · 몬스터 0.56)
  const hw = size * 0.84, hh = Math.max(14, H * 0.03);
  const head = top + size * (1 - Math.min(1, Math.max(0.2, vis)));
  const hy = Math.max(H * 0.15, head - hh - H * 0.012); // 위 막대 · 이름표와 겹치지 않게
  return { mon: { cx, top, size }, hp: { x: cx - hw / 2, y: hy, w: hw, h: hh }, shadow: { cx, y: top + size * 0.97, w: size * 0.72 } };
}

/** 단계: 인원 → 용사 배율(1080p 기준 칸 80 × 64 의 몇 배) · 줄 수 */
export function tierOf(n: number): { k: number; rows: number } {
  if (n <= 1) return { k: 4, rows: 1 };
  if (n <= 3) return { k: 3.5, rows: 1 };
  if (n <= 15) return { k: 2.5, rows: 2 };
  return { k: 2, rows: 2 };
}

/** 용사 자리: 발 = (x, y) · s = 그림 배율 · 오른쪽 절반은 몬스터 쪽(가운데)을 봄 */
export function partyLayout(n: number, W: number, H: number, split = false): Slot[] {
  if (n <= 0) return [];
  const { k, rows } = tierOf(n), s = k * (H / 1080);
  const left = split ? W * 0.02 : W * 0.06, width = (split ? W * 0.5 : W * 0.88);
  const slotW = 80 * s * 0.78; // 보이는 몸 폭 ≈ 칸의 ⅗ → 조금 겹쳐도 됨
  const out: Slot[] = [];
  const row0 = rows === 1 ? n : Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const r = i < row0 ? 0 : 1, kk = r ? i - row0 : i, cnt = r ? n - row0 : row0;
    const span = Math.min(width, cnt * slotW * 1.25); // 적으면 가운데로 모음
    const x0 = left + (width - span) / 2 + (r ? slotW * 0.3 : 0);
    const x = x0 + ((kk + 0.5) / cnt) * span;
    const y = rows === 1 ? H * 0.86 : r ? H * 0.9 : H * 0.76; // 발 (이름표는 발 아래)
    out.push({ x, y, s, flip: x > (split ? W * 0.27 : W / 2) });
  }
  return out;
}

/** 글자 4단계 · 굵기 2단계 (TV 한 글꼴 · 화면 높이 비율) — HTML(cqh) · 캔버스(px) 같은 표 */
export const TV_FS = { big: 0.06, title: 0.032, body: 0.024, small: 0.018 } as const;
export const TV_FW = { normal: 500, bold: 700 } as const;
