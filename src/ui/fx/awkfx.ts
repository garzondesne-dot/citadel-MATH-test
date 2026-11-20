// ⚡ #83 A3 각성 필살기 연출 34 (📜 2026-11-20 · 메타인지 8 · 그림 = hero-v2 docs/handoff/assets/vfx-awaken/v3 · whole 띠만)
//   연출만 (데미지 · 판정 같음) · 각성 상태의 ⚡ 필살기 · 🌟 진필살기에서 지금 광역 대신 · 몬스터 발에 맞춰 그 위에 겹침
//   몬스터 색 바꾸는 효과(그림엔 없음) = 코드 색조: 글라세 얼음 · 마진 금빛 · 핑 초록 글리치 · 녹스 핏빛
//   폰(장면 띠) · TV(Pixi 위 DOM 층) 같은 함수 · TV 몬스터 색조 = tint 콜백(Pixi)
import T from './awk-vfx.json';
import { baseOf, heroOf, isAwkId } from '../../model/hero';
import { artUrl } from '../manifest';

type V = { src: string; w: number; h: number; cols: number; n: number; fps: number; ox: number; oy: number };
export const AWK_VFX = T as Record<string, V>;
/** 각성 모습 id → 연출 열쇠 (로안 = blond · 나머지 = 용사 그림 이름) · 없으면 null */
export function awkKey(hero: number): string | null {
  if (!isAwkId(hero)) return null;
  const b = baseOf(hero);
  if (b === 0) return 'blond';
  const k = (heroOf(b).sprite || '').replace(/^hero-/, '').replace(/-v\d.*$/, '');
  return AWK_VFX[k] ? k : null;
}
/** 몬스터 색조 (그림에 없는 효과) */
export const AWK_TINT: Record<string, { css: string; px: number }> = {
  frost: { css: 'sepia(1) hue-rotate(160deg) saturate(3) brightness(1.25)', px: 0x8fdcff },
  merchant: { css: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.2)', px: 0xffd25a },
  hacker: { css: 'sepia(1) hue-rotate(70deg) saturate(5) brightness(1.1)', px: 0x5dff8a },
  dknight: { css: 'sepia(1) hue-rotate(-40deg) saturate(4) brightness(.8)', px: 0xd0405a },
};
const seen = new Set<string>();
export function preloadAwk(hero: number) { const k = awkKey(hero); if (!k || seen.has(k) || typeof Image === 'undefined') return; seen.add(k); const im = new Image(); im.src = artUrl(AWK_VFX[k]!.src); }
export type Box = { cx: number; y1: number; w: number; h: number };
/** 연출 한 번 · 끝나면 resolve · tint = TV 몬스터 색조(없으면 monBox CSS 필터) */
export function awkBlast(scene: HTMLElement, B: Box, key: string, o: { monBox?: HTMLElement | null; tint?: (color: number, ms: number) => void } = {}): Promise<void> {
  const v = AWK_VFX[key]; if (!v || typeof document === 'undefined') return Promise.resolve();
  if (getComputedStyle(scene).position === 'static') scene.style.position = 'relative';
  const R = scene.getBoundingClientRect(), fitTop = v.oy < 0 ? (B.y1 - 4) / -v.oy : 9, fitW = (R.width || 9e3) / v.w; // 장면 위 · 옆으로 넘치지 않게
  const k = Math.max(0.5, Math.min(4, B.w / 140, fitTop, fitW)), rows = Math.ceil(v.n / v.cols), ms = Math.round((v.n / v.fps) * 1000);
  const e = document.createElement('i'); e.className = 'awk-vfx'; e.dataset.k = `awk-vfx-${key}`;
  e.style.cssText = `left:${Math.round(B.cx + v.ox * k)}px;top:${Math.round(B.y1 + v.oy * k)}px;width:${Math.round(v.w * k)}px;height:${Math.round(v.h * k)}px;background-image:url('${artUrl(v.src)}');background-size:${v.cols * 100}% ${rows * 100}%`;
  scene.appendChild(e);
  const t = AWK_TINT[key];
  if (t) { if (o.tint) o.tint(t.px, ms); else o.monBox?.animate?.([{ filter: t.css }, { filter: t.css, offset: 0.85 }, { filter: 'none' }], { duration: ms + 300 }); }
  return new Promise((res) => {
    let f = 0;
    const step = () => {
      const c = f % v.cols, r = Math.floor(f / v.cols);
      e.style.backgroundPosition = `${v.cols > 1 ? (c / (v.cols - 1)) * 100 : 0}% ${rows > 1 ? (r / (rows - 1)) * 100 : 0}%`;
      f++;
      if (f < v.n && e.isConnected) setTimeout(step, 1000 / v.fps); else { e.remove(); res(); }
    };
    step();
  });
}
