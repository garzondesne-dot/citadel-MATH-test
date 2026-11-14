<script lang="ts">
  import { onMount } from 'svelte';
  import { sfx } from '../sound.svelte';
  import { CHAIN } from '../manifest';
  // ⛓ 사슬 (👹 몬스터 공격 · 📜 2026-11-14 선생님 「사슬은 에셋 처리해」 → 🎨 chain-bind 6칸 그림)
  //   들어옴 = ① 왼쪽 사슬 → ② 오른쪽 사슬 → ③ X 교차(0.1초씩) → ④ 「철컥」(번쩍 그림 · 소리 · 진동 · 움찔) · 묶인 동안 ④ 유지 + 가끔 팽팽하게 떨림
  //   cut ≥ 1 (좌우로 쓸기) = ⑤ 금 · 불티 · broken = ⑥ 조각나 흩어지며 사라짐 · 카드(AttackFx) · 노란 단추(BottomAction) 같은 부품(그림을 그 칸 크기에 맞춤)
  //   동작 줄이기 = 바로 ④ · 떨림 없음
  const { cut = 0, broken = false, thin = false }: { cut?: number; broken?: boolean; thin?: boolean } = $props();
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let f = $state(reduce ? 3 : 0), clank = $state(false);
  const frame = $derived(broken ? 5 : f < 3 ? f : cut >= 1 ? 4 : 3);
  onMount(() => {
    if (reduce) return;
    const ts = [setTimeout(() => (f = 1), 110), setTimeout(() => (f = 2), 220), setTimeout(() => { f = 3; clank = true; sfx('block', 0.9); try { navigator.vibrate?.(30); } catch { /* 무시 */ } setTimeout(() => (clank = false), 160); }, 300)];
    return () => ts.forEach(clearTimeout);
  });
  $effect(() => { if (broken) sfx('smash', 0.8); });
</script>

<div class="chainfx" class:thin class:clank class:held={frame === 3} class:broken aria-hidden="true" data-cut={cut} data-f={frame}>
  {#if frame === 1}<i class="img" style:background-image="url({CHAIN.src})" style:background-size="{CHAIN.n * 100}% 100%" style:background-position-x="0%"></i>{/if}<!-- ② 때 ① 도 함께 = 양옆에서 함께 날아옴 -->
  <i class="img" style:background-image="url({CHAIN.src})" style:background-size="{CHAIN.n * 100}% 100%" style:background-position-x="{(frame / (CHAIN.n - 1)) * 100}%"></i>
</div>

<style>
  .chainfx { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
  /* 한 칸 비율(222 : 112) 그대로 가운데 · 문제 칸 = 폭 맞춤 · 노란 단추 = 높이의 2배(위아래로 조금 넘침) */
  .img { position: absolute; left: 50%; top: min(50%, 170px); width: 94%; aspect-ratio: 222 / 112; translate: -50% -50%; background-repeat: no-repeat; filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.7)); }
  .thin .img { width: auto; height: 200%; }
  .clank .img { animation: tight 0.16s ease-out; }
  @keyframes tight { 0% { transform: scale(1.06); } 45% { transform: scale(0.97); } 100% { transform: none; } }
  .held .img { animation: strain 1.6s 0.6s ease-in-out infinite; }
  @keyframes strain { 0%, 82%, 100% { transform: none; } 86% { transform: translate(1.5px, -1px) scale(1.012); } 90% { transform: translate(-1.5px, 1px) scale(1.006); } 94% { transform: translate(1px, 0); } }
  .broken .img { animation: gone 0.45s ease-out forwards; }
  @keyframes gone { 0%, 40% { opacity: 1; transform: none; } 100% { opacity: 0; transform: scale(1.08) translateY(6px); } }
  @media (prefers-reduced-motion: reduce) { .img { animation: none !important; } .broken .img { opacity: 0; } }
</style>
