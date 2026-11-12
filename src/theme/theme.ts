// 🎨 테마 (#144 · DECISIONS 「🎨 v1.0 테마 여는 법 = B + 🏛 클래식」): 11개 = 시안 8fD8n9QKzP4s8RfYktPoxx 의 10 + 🏛 클래식
//   처음부터 4개(금빛 · 청남 · 구름 · 클래식) · 나머지 7개 = 업적으로 열림(💎 로 팔지 않음) · 교사 폰 · TV = 11개 모두
//   테마 = tokens.css 의 색 묶음만 바꿈 · 🏛 클래식만 그림 판(9-slice) · 단추 그림 · Galmuri 글꼴을 더함 → classic.css 를 고른 폰만 받음(지연 로드)
// 🌐 #131 글꼴 = 웹폰트 번들(Pretendard 1.3.9 · OFL-1.1 · 한글 동적 부분 글꼴 woff2 · 쓰는 글자 조각만 받음) → 기기 · 브라우저마다 같은 글꼴
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './tokens.css';
import './ui.css';

export type Theme = 'gold' | 'navy' | 'cloud' | 'classic' | 'lava' | 'star' | 'sakura' | 'sand' | 'deep' | 'porcelain' | 'parchment';
/** 업적 칸: 지금 몇 번 했는지 (없는 기능 = null → 조건 줄만) */
export interface Feats { perfect: number; boss: number; classes: number; cards: number; review: number | null; guard: number | null; sRank: number | null }
export interface ThemeDef { id: Theme; name: string; ic: string; light?: boolean; /** 잠금 = 무엇을 몇 번 */ need?: { k: keyof Feats; n: number; text: string } }
export const THEMES: ThemeDef[] = [
  { id: 'gold', name: '금빛 던전', ic: '🟡' },
  { id: 'navy', name: '청남 성채', ic: '🔷' },
  { id: 'cloud', name: '구름 성채', ic: '☁', light: true },
  { id: 'classic', name: '클래식', ic: '🏛' },
  { id: 'lava', name: '용암', ic: '🔥', need: { k: 'perfect', n: 5, text: '몬스터 퍼펙트 5번' } },
  { id: 'star', name: '별빛', ic: '⭐', need: { k: 'boss', n: 5, text: '👑 보스 처치 5번' } },
  { id: 'sakura', name: '벚꽃', ic: '🌸', need: { k: 'guard', n: 1, text: '게시판 던전 🛡 수호자로 클리어 1번' } },
  { id: 'sand', name: '모래', ic: '🏜', need: { k: 'sRank', n: 1, text: '게시판 던전 S 등급 1번' } },
  { id: 'deep', name: '심해', ic: '🌊', need: { k: 'review', n: 10, text: '📕 복습 완료 10문제' } },
  { id: 'porcelain', name: '백자', ic: '🏺', light: true, need: { k: 'cards', n: 10, text: '⚒ 모루 카드 10장' } },
  { id: 'parchment', name: '양피지', ic: '📜', light: true, need: { k: 'classes', n: 10, text: '수업 10번 참여' } },
];
export const isTheme = (t: unknown): t is Theme => THEMES.some((x) => x.id === t);
/** 열림 여부 · 진행 (교사 = 모두 열림) */
export function lockOf(d: ThemeDef, f: Feats | null): { open: boolean; have: number | null } {
  if (!d.need) return { open: true, have: null };
  if (!f) return { open: true, have: null };
  const have = f[d.need.k];
  return { open: have != null && have >= d.need.n, have };
}
import { perfectsOf, wonOf } from '../school/records';
/** 수업 기록(records/{반}/{번호}) · 카드로 업적 세기 — 게시판 던전 · 복습 완료는 아직 기능이 없어 null(조건 줄만) */
export function featsOf(records: Record<string, Parameters<typeof perfectsOf>[0]> | null, cards: Record<string, unknown> | null): Feats {
  const rs = Object.values(records || {});
  return {
    perfect: rs.reduce((a, r) => a + perfectsOf(r), 0), // 정식 꼴 'o' · 옛 꼴 perfect 둘 다 (#163)
    boss: rs.filter(wonOf).length,
    classes: rs.length,
    cards: Object.keys(cards || {}).length,
    review: null, guard: null, sRank: null,
  };
}

const KEY = 'citadel-v1-theme';
let classicP: Promise<unknown> | null = null;
/** 테마 켜기 · tv = 색만(🏛 클래식도 그림 · 글꼴 없이 청남 색) */
export function applyTheme(t: Theme = 'gold', opt: { tv?: boolean } = {}): void {
  if (typeof document === 'undefined') return;
  const d = THEMES.find((x) => x.id === t) ?? THEMES[0]!;
  const root = document.documentElement;
  root.dataset.theme = d.id;
  if (opt.tv) root.dataset.tv = '1'; else delete root.dataset.tv;
  if (d.id === 'classic' && !opt.tv && !classicP) classicP = import('./classic.css');
  // 🌐 #131 color-scheme 메타 = 테마의 밝기
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', d.light ? 'light' : 'dark');
}
/** 이 기기에 기억한 테마 (첫 화면부터 같은 색) */
export function savedTheme(): Theme { try { const t = localStorage.getItem(KEY); return isTheme(t) ? t : 'gold'; } catch { return 'gold'; } }
export function setTheme(t: Theme, opt: { tv?: boolean } = {}): void { try { localStorage.setItem(KEY, t); } catch { /* 무시 */ } applyTheme(t, opt); }
