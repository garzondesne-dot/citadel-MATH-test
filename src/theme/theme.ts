// 테마 고르기는 아직 없음 (#107 ⑦) — 금빛 던전 하나만 켬 · 다른 테마 = tokens.css 에 묶음만 더하면 됨
// 🌐 #131 글꼴 = 웹폰트 번들(Pretendard 1.3.9 · OFL-1.1 · 한글 동적 하위 집합 woff2 · 쓰는 글자 조각만 받음) → 기기 · 브라우저마다 같은 글꼴
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './tokens.css';
import './ui.css';
export const THEMES = ['gold'] as const;
export type Theme = (typeof THEMES)[number];
export function applyTheme(t: Theme = 'gold'): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = t;
  // 🌐 #131 color-scheme 메타 = 테마의 밝기(지금 금빛 던전 = dark · 밝은 테마를 더하면 LIGHT 에 넣기)
  const LIGHT: readonly string[] = [];
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', LIGHT.includes(t) ? 'light' : 'dark');
}
