<script lang="ts">
  // 😆 아재 퀴즈 진행자 = 현자 올드윈 동작 시트 (📜 2026-11-24 · 에셋 방 2 hero-v2 384baa5 minigame/sage-host-v1 · 7칸 × 3줄 · 칸 256 × 144 · 오른쪽 봄)
  //   줄 0 = 말하기(안내) · 1 = 크게 웃기(정답 공개 · 결과) · 2 = 지팡이 들기(문제 중 · 빛남) · 7칸 돌림(움직임 줄이기 = 첫 칸 멈춤)
  const { act = 'talk', h = 144 }: { act?: 'talk' | 'laugh' | 'staff'; /** 보이는 높이 px (너비 = 16 : 9) */ h?: number } = $props();
  const row = $derived(act === 'laugh' ? 1 : act === 'staff' ? 2 : 0);
  const src = `${import.meta.env.BASE_URL}art/minigame/sage-host-v1.webp`;
  const w = $derived(Math.round((h * 256) / 144));
</script>

<i class="sage" data-k="aj-host" data-act={act} aria-hidden="true" style:width="{w}px" style:height="{h}px" style:background-image="url({src})" style:background-size="{w * 7}px {h * 3}px" style:background-position-y="-{row * h}px" style:--w="{w * 7}px"></i>

<style>
  .sage { display: block; background-repeat: no-repeat; image-rendering: pixelated; animation: sage-run 0.9s steps(7) infinite; }
  @keyframes sage-run { from { background-position-x: 0; } to { background-position-x: calc(-1 * var(--w)); } }
  @media (prefers-reduced-motion: reduce) { .sage { animation: none; } }
</style>
