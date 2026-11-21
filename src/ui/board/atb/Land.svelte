<script lang="ts">
  // 🔄 게시판 던전 가로 상자 (📜 요청 #8 · #74 ① 연습방 · 게시판 판(AtbNet) · 체험판 = 같은 상자)
  //   세로 폰 = 화면 전체를 CSS 로 시계 방향 90° (첫 그림부터 돌린 채 · 회전 잠금 그대로 · 눕혀 들기만) · 가로 = 상자 없음(display: contents)
  //   안전 영역 = 돌린 뒤 왼쪽 = 폰 위(노치) · 오른쪽 = 폰 아래(홈 바) → --safe-l · --safe-r (전투 무대가 씀)
  import { onDestroy, type Snippet } from 'svelte';
  import { ROT_ATTR } from '../../rot';
  const { children, z = 50 }: { children: Snippet; /** 돌린 상자 쌓임 순서 (게시판 시트 위 · #68) */ z?: number } = $props();
  const isPortrait = () => typeof innerHeight === 'number' && innerHeight > innerWidth;
  let portrait = $state(isPortrait());
  const onRot = () => (portrait = isPortrait());
  if (typeof window !== 'undefined') addEventListener('resize', onRot);
  onDestroy(() => { if (typeof window !== 'undefined') removeEventListener('resize', onRot); });
  const attrs = $derived(portrait ? { [ROT_ATTR]: '' } : {});
</script>

<div class="land" class:rot={portrait} style:--land-z={z} {...attrs} data-k="atb-land">{@render children()}</div>

<style>
  .land { display: contents; --safe-l: env(safe-area-inset-left, 0px); --safe-r: env(safe-area-inset-right, 0px); }
  .land.rot { display: block; position: fixed; top: 0; left: 0; width: 100vh; height: 100vw; width: 100dvh; height: 100dvw; transform-origin: top left; transform: translateX(100vw) rotate(90deg); overflow: hidden; z-index: var(--land-z, 50); --safe-l: env(safe-area-inset-top, 0px); --safe-r: env(safe-area-inset-bottom, 0px); }
</style>
