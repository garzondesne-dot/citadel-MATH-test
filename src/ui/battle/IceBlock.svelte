<script lang="ts">
  // 🧊 용사 얼음 (📜 2026-11-14 선생님 「네모나게 꽁꽁 얼어버린 거 말고 용사 이미지 푸른색으로 칠해지면서 군데군데 얼음 결정 조각 붙은 걸로」)
  //   용사 그림 = 장면 쪽에서 푸른 필터(.frozen · 얼굴 · 옷 그대로) · 여기 = 옅은 서리 + 테두리 빛(mask) · 몸 군데군데 얼음 결정 6개(머리 · 어깨 · 팔 · 허리 · 다리)
  //   taps = 깨기 톡 수(0~4) → 결정이 하나씩 떨어져 나감 · mode shatter = 남은 결정이 튀어 흩어지고 푸른빛이 걷힘 · melt = 결정이 녹아 흘러내리며 푸른빛이 걷힘 (둘 다 0.6초)
  //   폰(장면 띠) · TV(DOM 대체 화면) 같은 부품 · Pixi TV 는 arena/pixi.ts 가 같은 모양을 그림
  import { ICE } from '../manifest';
  const CR = ICE.crystal;
  const { url, size, pos, w, h, taps = 0, mode = 'on' }: { url: string; size: string; pos: string; w: number; h: number; taps?: number; mode?: 'on' | 'shatter' | 'melt' } = $props();
  // 결정 자리(용사 칸 % · 몸통은 가운데 40~60%) · 크기 · 기울기 · 몇 번째 톡에 떨어지나
  const XT: [number, number, number, number, number, number][] = [[46, 18, 1.0, -15, 4, 2], [36, 40, 0.9, 20, 1, 0], [60, 42, 1.1, -30, 3, 6], [44, 60, 0.8, 10, 2, 4], [56, 74, 1.0, 35, 4, 7], [40, 82, 0.85, -25, 2, 1]]; // 마지막 = 결정 그림 칸 (🎨 ice-crystal)
</script>

<span class="ice3 {mode}" style:width="{w}px" style:height="{h}px" aria-label="얼음 {4 - taps}번 남음" role="img">
  <i class="frost" style:mask-image="url({url})" style:-webkit-mask-image="url({url})" style:mask-size={size} style:-webkit-mask-size={size} style:mask-position={pos} style:-webkit-mask-position={pos}></i>
  {#each XT as [x, y, s, r, k, c], i (i)}
    {#if mode === 'shatter' || taps < k}<i class="xt" class:fly={mode === 'shatter'} style:background-image="url({CR.src})" style:background-size="{CR.n * 100}% 100%" style:background-position-x="{(c / (CR.n - 1)) * 100}%" style:left="{x}%" style:top="{y}%" style:--s={s} style:--r="{r}deg" style:--fx="{(i % 2 ? 1 : -1) * (30 + i * 9)}px" style:--fy="{-30 - (i % 3) * 18}px"></i>
    {:else}<i class="xt off" style:background-image="url({CR.src})" style:background-size="{CR.n * 100}% 100%" style:background-position-x="{(c / (CR.n - 1)) * 100}%" style:left="{x}%" style:top="{y}%" style:--s={s} style:--r="{r}deg"></i>{/if}
  {/each}
</span>

<style>
  .ice3 { position: absolute; display: block; pointer-events: none; }
  /* 푸른색 물듦 = 용사 그림 자체에 필터(장면 쪽 .frozen · 얼굴 · 옷이 그대로 보임) · 여기는 옅은 서리 + 테두리 빛만 */
  .frost { position: absolute; inset: 0; background: linear-gradient(170deg, rgba(235, 250, 255, 0.14), rgba(160, 220, 255, 0) 55%, rgba(120, 190, 240, 0.06)); mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 3px rgba(170, 225, 255, 0.95)); image-rendering: pixelated; }
  /* 얼음 결정 조각 = 🎨 ice-crystal 그림 칸 (📜 2026-11-14) */
  .xt { position: absolute; width: calc(24% * var(--s)); aspect-ratio: 1; transform: translate(-50%, -50%) rotate(var(--r)); background-repeat: no-repeat; filter: drop-shadow(0 1px 0 rgba(10, 40, 80, 0.6)); }
  .xt.off { animation: drop 0.4s ease-in forwards; }
  @keyframes drop { to { transform: translate(-50%, 40%) rotate(calc(var(--r) + 50deg)); opacity: 0; } }
  .xt.fly { animation: fly 0.55s cubic-bezier(0.2, 0.7, 0.4, 1) forwards; }
  @keyframes fly { to { transform: translate(calc(-50% + var(--fx)), calc(-50% + var(--fy))) rotate(calc(var(--r) + 180deg)); opacity: 0; } }
  .shatter .frost { animation: fade 0.35s ease-out forwards; }
  .melt .frost { animation: fade 0.6s ease-in forwards; }
  .melt .xt { animation: melt 0.6s ease-in forwards; }
  @keyframes melt { to { transform: translate(-50%, 10%) rotate(var(--r)) scaleY(0.4); opacity: 0; } }
  @keyframes fade { to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .xt, .frost { animation-duration: 0.01s !important; } }
</style>
