// 🚶 💡 로딩 첫 화면 기억 (📜 2026-11-16 · DECISIONS 「⏳ 로딩 화면 = 걷는 용사 + 한 줄 팁」)
//   index.html 의 첫 화면 스크립트가 다음에 열 때 읽음: h = 내 용사 시트 파일(걷기 = 1줄) · g = 세밀 시트 칸 [가로, 세로, k] · t = 지금 켜진 기능의 팁 번호(1~12 · 문구는 index.html 한 곳)
import type { FeatId } from './school/features.svelte';
import { heroOf } from './model/hero';
import { savedLook } from './store/me.svelte';
import { HERO_HD } from './ui/manifest';

export const BOOT_KEY = 'citadel-boot';
/** 팁 번호 → 꺼지면 빠지는 기능 (없음 = 늘 보임) · 팁 문구 순서 = DECISIONS 목록 그대로 */
export const TIP_NEEDS: Record<number, FeatId[]> = { 2: ['sword'], 3: ['help3'], 4: ['scarecrow'], 5: ['pre', 'scarecrow'], 7: ['sword'], 8: ['hero'], 9: ['stamp'], 10: ['citadel'], 11: ['forge'] };
export const tipsOn = (on: (id: FeatId) => boolean): number[] => Array.from({ length: 12 }, (_, i) => i + 1).filter((n) => (TIP_NEEDS[n] ?? []).every(on));
export function rememberBoot(on: (id: FeatId) => boolean): void {
  try {
    const h = heroOf(savedLook().hero).sprite || 'hero-sword-v6.webp', hd = HERO_HD[h];
    localStorage.setItem(BOOT_KEY, JSON.stringify({ h, t: tipsOn(on), ...(hd ? { g: [hd.cw, hd.ch, hd.k] } : {}) })); // 🧙 #50 세밀 시트 = 칸 크기도
  } catch { /* 사생활 창 · 저장소 막힘 = 다음에도 기본(로안 · 늘 맞는 팁) */ }
}
