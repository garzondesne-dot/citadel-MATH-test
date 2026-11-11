// 테마 고르기는 아직 없음 (#107 ⑦) — 금빛 던전 하나만 켬 · 다른 테마 = tokens.css 에 묶음만 더하면 됨
import './tokens.css';
import './ui.css';
export const THEMES = ['gold'] as const;
export type Theme = (typeof THEMES)[number];
export function applyTheme(t: Theme = 'gold'): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = t;
}
