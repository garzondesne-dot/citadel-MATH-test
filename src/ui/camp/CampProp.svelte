<script lang="ts">
  import { CAMP_PORTAL, cellBg, type CampProp } from '../manifest';
  // 🏕 캠프 물건 그림 한 개 (학생 캠프 · TV 교사 캠프 같은 부품 · 자리는 바깥 칸이 CAMP_PROPS 로 잡음)
  //   📋 게시판(k = 'dummy') = ① 평소 / ② 모집 중(종이 금빛) 칸 + 오른쪽 옆 파란 포털(바깥 칸 밖 · 게시판 폭 기준으로 놓음)
  //   포털 기믹 = 평소 작은 불씨(0.15 · 흐림) · 모집 글 있음 = 0.6 숨쉬기(2초) · 출발 = 1.0 확 열림(0.4초 · 소용돌이 · 바닥 빛 고리) · 동작 줄이기 = 크기만
  const { p, phase = 'idle' }: { p: CampProp; phase?: 'idle' | 'recruit' | 'open' } = $props();
  const col = $derived(p.k === 'dummy' && phase !== 'idle' ? 1 : 0);
  // 포털 = 게시판 칸(폭 p.width%) 기준 상대 자리 → 캠프 그림 %(CAMP_PORTAL) 와 같아지게
  const pl = $derived(((CAMP_PORTAL.left - p.left) / p.width) * 100), pw = $derived((CAMP_PORTAL.width / p.width) * 100);
</script>

<i class="img" style="{cellBg(p.src, p.cols, col)};aspect-ratio:{p.aspect}"></i>
{#if p.k === 'dummy'}
  <span class="portal {phase}" style="left:{pl}%;width:{pw}%" style:--s={CAMP_PORTAL.scale[phase]} aria-hidden="true" data-phase={phase}>
    {#if phase === 'open'}<i class="ring"></i>{/if}
    <i class="pimg" style="background-image:url({CAMP_PORTAL.src});aspect-ratio:{CAMP_PORTAL.aspect}"></i>
  </span>
{/if}

<style>
  .img { display: block; width: 100%; background-repeat: no-repeat; image-rendering: pixelated; transition: transform 0.12s ease-out; transform-origin: 50% 100%; }
  .portal { position: absolute; bottom: 0; display: block; pointer-events: none; transform-origin: 50% 100%; }
  .pimg { display: block; width: 100%; background-size: 100% 100%; transform: scale(var(--s)); transform-origin: 50% 92%; transition: transform 0.4s cubic-bezier(0.2, 1.4, 0.4, 1), opacity 0.4s; filter: drop-shadow(0 0 6px rgba(90, 170, 255, 0.7)); }
  .idle .pimg { opacity: 0.55; animation: ember 1.6s ease-in-out infinite alternate; }
  .recruit .pimg { animation: breathe 2s ease-in-out infinite; }
  .open .pimg { animation: swirl 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both, spin 1.2s 0.4s linear infinite; }
  .ring { position: absolute; left: 50%; bottom: 4%; width: 180%; aspect-ratio: 3 / 1; border-radius: 50%; border: 3px solid rgba(120, 200, 255, 0.9); box-shadow: 0 0 12px rgba(120, 200, 255, 0.8); transform: translate(-50%, 50%) scale(0.2); animation: ring 0.7s ease-out forwards; }
  @keyframes ember { from { transform: scale(calc(var(--s) * 0.85)); opacity: 0.4; } to { transform: scale(var(--s)); opacity: 0.7; } }
  @keyframes breathe { 0%, 100% { transform: scale(var(--s)); filter: drop-shadow(0 0 4px rgba(90, 170, 255, 0.6)); } 50% { transform: scale(calc(var(--s) * 1.1)); filter: drop-shadow(0 0 12px rgba(120, 200, 255, 0.95)); } }
  @keyframes swirl { from { transform: scale(0.6) rotate(-40deg); } to { transform: scale(1) rotate(0); } }
  @keyframes spin { 0% { transform: scale(1) rotate(0); } 50% { transform: scale(1.04) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
  @keyframes ring { to { transform: translate(-50%, 50%) scale(1); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .pimg, .idle .pimg, .recruit .pimg, .open .pimg { animation: none; } .ring { display: none; } }
</style>
