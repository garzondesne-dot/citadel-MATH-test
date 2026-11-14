// 🎞 용사 줄 돌리기 (📜 2026-11-14 머리 🔨 「용사 공격할 때 공격 모션으로 안 나가 · 모션 전부 점검」)
//   그림 칸이 % 로 놓인 용사 요소(배경 = 시트 cols × rows) 하나를 정식 anims 줄로 돌림 — TV 공격 대역 · 교사 시연 등 DOM 이 직접 그리는 곳
//   한 번만(쓰러짐 · 포털) = 마지막 칸에서 멈춤 · 칸 1(맞음) = 그 칸 그대로 · 움직임 줄이기 = 첫 칸만
import { ANIM, HERO, type HPose } from '../manifest';

const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function rowAnim(el: HTMLElement | null | undefined, p: HPose) {
  if (!el) return;
  const [row, n, dur, once] = ANIM[p];
  el.style.backgroundPositionY = `${(row / (HERO.rows - 1)) * 100}%`;
  el.style.backgroundPositionX = '0%';
  el.dataset.pose = p;
  for (const a of el.getAnimations?.() ?? []) if (a.id === 'hrow') a.cancel();
  if (n < 2 || !el.animate || reduce()) return;
  const end = once ? n - 1 : n;
  const a = el.animate([{ backgroundPositionX: '0%' }, { backgroundPositionX: `${(end / (HERO.cols - 1)) * 100}%` }], { duration: dur * 1000, iterations: once ? 1 : Infinity, easing: `steps(${end})`, fill: once ? 'forwards' : 'none' });
  a.id = 'hrow';
}
