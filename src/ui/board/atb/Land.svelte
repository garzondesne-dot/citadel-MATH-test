<script lang="ts">
  // 🔄 게시판 던전 가로 상자 (📜 요청 #8 · #74 ① 연습방 · 게시판 판(AtbNet) · 체험판 = 같은 상자)
  //   세로 폰 = 화면 전체를 CSS 로 시계 방향 90° (첫 그림부터 돌린 채 · 회전 잠금 그대로 · 눕혀 들기만) · 가로 = 상자 없음(display: contents)
  //   안전 영역 = 돌린 뒤 왼쪽 = 폰 위(노치) · 오른쪽 = 폰 아래(홈 바) → --safe-l · --safe-r (전투 무대가 씀)
  import { onDestroy, type Snippet } from 'svelte';
  import { ROT_ATTR } from '../../rot';
  const { children, z = 50 }: { children: Snippet; /** 돌린 상자 쌓임 순서 (게시판 시트 위 · #68) */ z?: number } = $props();
  import { BOX, boxOf, landBox } from './landBox.svelte';
  const isPortrait = () => typeof innerHeight === 'number' && innerHeight > innerWidth;
  let portrait = $state(isPortrait());
  /* 📐 #118 비율 고정 상자 (돌린 화면 = 돌린 뒤 가로 · 세로) */
  const measure = () => { const p = isPortrait(), W = typeof innerWidth === 'number' ? (p ? innerHeight : innerWidth) : 844, H = typeof innerHeight === 'number' ? (p ? innerWidth : innerHeight) : 390, b = boxOf(W, H); landBox.on = b.on; landBox.s = b.s; return b; };
  let bx = $state(measure());
  const onRot = () => { portrait = isPortrait(); bx = measure(); };
  /* 남는 띠 = 차시 배경을 흐리게 (안의 전투 · 결과 배경을 그대로 가져옴) */
  let boxEl = $state<HTMLElement>(), bgImg = $state('');
  $effect(() => { if (!bx.on || !boxEl) return; const pick = () => { const el = boxEl?.querySelector('.stage, .rs') as HTMLElement | null; const im = el ? getComputedStyle(el).backgroundImage : ''; if (im && im !== 'none') bgImg = im; }; pick(); const t = setInterval(pick, 1000); return () => clearInterval(t); });
  onDestroy(() => { landBox.on = false; landBox.s = 1; });
  if (typeof window !== 'undefined') addEventListener('resize', onRot);
  onDestroy(() => { if (typeof window !== 'undefined') removeEventListener('resize', onRot); });
  const attrs = $derived(portrait ? { [ROT_ATTR]: '' } : {});
</script>

<div class="land" class:rot={portrait} class:tab={bx.on} style:--land-z={z} {...attrs} data-k="atb-land">{#if bx.on}<div class="lbg" style:background-image={bgImg || undefined} aria-hidden="true"></div><div class="lbox" bind:this={boxEl} data-landscale style:width="{BOX.w}px" style:height="{BOX.h}px" style:transform="translate(-50%, -50%) scale({bx.s})" style:--lvh="{BOX.h / 100}px" data-k="atb-lbox">{@render children()}</div>{:else}{@render children()}{/if}</div>

<style>
  .land { display: contents; --safe-l: env(safe-area-inset-left, 0px); --safe-r: env(safe-area-inset-right, 0px); }
  .land.rot { display: block; position: fixed; top: 0; left: 0; width: 100vh; height: 100vw; width: 100dvh; height: 100dvw; transform-origin: top left; transform: translateX(100vw) rotate(90deg); overflow: hidden; z-index: var(--land-z, 50); --safe-l: env(safe-area-inset-top, 0px); --safe-r: env(safe-area-inset-bottom, 0px); }
  /* ── 📐 #118 비율 고정 상자 ── */
  .land.tab { display: block; position: fixed; inset: 0; overflow: hidden; z-index: var(--land-z, 50); background: #0b0910; }
  .land.tab.rot { inset: auto; top: 0; left: 0; }
  .lbg { position: absolute; inset: -20px; background: #0b0910 center / cover no-repeat; filter: blur(14px) brightness(0.35) saturate(0.8); }
  .lbox { position: absolute; left: 50%; top: 50%; transform-origin: 50% 50%; overflow: hidden; contain: layout paint; box-shadow: 0 0 0 1px #000, 0 0 40px #000c; }
</style>
