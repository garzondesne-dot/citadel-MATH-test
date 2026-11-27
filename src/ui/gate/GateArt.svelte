<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { GateDraw, type GateView } from './gateDraw';
  // 🌀 차원문 그림 한 장 (📜 11/28) — TV = anim(날아오는 조각 · 빛) · 폰 = 멈춘 그림(crop = 문 둘레만)
  //   light = 바뀔 때마다 ⚡ 빛 한 줄기
  const { v, anim = true, crop, light = 0, label = '마왕성 차원문' }: { v: GateView; anim?: boolean; crop?: [number, number, number, number]; light?: number; label?: string } = $props();
  let cv: HTMLCanvasElement;
  let g: GateDraw | null = null;
  onMount(() => { g = new GateDraw(cv, { anim, crop }); g.init(untrack(() => v)); });
  onDestroy(() => g?.stop());
  $effect(() => { const x = { n: v.n, placed: v.placed, full: v.full, e: v.e, open: v.open }; untrack(() => g?.set(x)); });
  let seen = untrack(() => light);
  $effect(() => { const l = light; untrack(() => { if (l > seen) g?.light(); seen = l; }); });
</script>

<canvas bind:this={cv} class="ga" aria-label={label} data-k="gate-art" data-n={v.n} data-placed={v.placed} data-full={v.full ? '1' : '0'} data-e={v.e}></canvas>

<style>
  .ga { display: block; width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
</style>
