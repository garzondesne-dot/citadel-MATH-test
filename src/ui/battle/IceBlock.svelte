<script lang="ts">
  // 🧊 얼음 덩어리 (2026-11-13 선생님 「네모칸이 용사를 덮지도 않고 얼음 같지도 않음」 → 용사를 실제로 덮는 얼음)
  //   용사 실루엣 = 투명 하늘색(그림 모양 그대로 · mask) + 서리 가장자리(drop-shadow) · 바깥 = 각진 결정 덩어리(반투명 · 하이라이트 · 결정 조각)
  //   taps = 깨기 톡 수(0~4) → 금이 하나씩 늘어남 · mode shatter = 조각으로 깨져 흩어짐 · melt = 녹듯 사라짐 (둘 다 0.6초)
  //   폰(장면 띠) · TV(DOM 대체 화면) 같은 부품 · Pixi TV 는 arena/pixi.ts 가 같은 모양을 그림
  const { url, size, pos, w, h, taps = 0, mode = 'on' }: { url: string; size: string; pos: string; w: number; h: number; taps?: number; mode?: 'on' | 'shatter' | 'melt' } = $props();
  const CRACKS = ['M50 8 L46 30 L54 44 L48 62', 'M46 30 L30 38 L22 52', 'M54 44 L70 50 L78 66 L74 80', 'M48 62 L40 78 L44 94 M48 62 L60 74 L58 92'];
  const SHARDS = [[-60, -50, -40], [55, -60, 30], [-70, 10, -70], [70, 0, 60], [-40, 60, 25], [45, 55, -35], [0, -75, 80], [5, 70, -20]];
</script>

<span class="ice2 {mode}" style:width="{w}px" style:height="{h}px" aria-label="얼음 {4 - taps}번 남음" role="img">
  <i class="sil" style:mask-image="url({url})" style:-webkit-mask-image="url({url})" style:mask-size={size} style:-webkit-mask-size={size} style:mask-position={pos} style:-webkit-mask-position={pos}></i>
  {#if mode !== 'shatter'}
    <i class="blk"><i class="hl"></i><i class="hl2"></i></i>
    <svg class="cr" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{#each CRACKS.slice(0, Math.min(4, taps)) as d, k (k)}<path {d} />{/each}</svg>
    <i class="shard s1"></i><i class="shard s2"></i><i class="shard s3"></i>
  {:else}
    {#each SHARDS as [x, y, r], k (k)}<i class="frag" style:--x="{x}px" style:--y="{y}px" style:--r="{r}deg" style:left="{30 + (k % 4) * 12}%" style:top="{25 + Math.floor(k / 4) * 30}%"></i>{/each}
  {/if}
</span>

<style>
  .ice2 { position: absolute; display: block; pointer-events: none; }
  .sil { position: absolute; inset: 0; opacity: 0.62; background: linear-gradient(160deg, rgba(240, 252, 255, 0.95), rgba(150, 215, 245, 0.8) 55%, rgba(110, 185, 230, 0.85)); mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 3px rgba(190, 235, 255, 0.95)); image-rendering: pixelated; }
  /* 각진 결정 덩어리 = 몸통 둘레 (발 · 머리 포함) */
  .blk { position: absolute; left: 24%; right: 24%; top: 8%; bottom: 4%; clip-path: polygon(18% 0, 62% 3%, 92% 14%, 100% 46%, 94% 82%, 70% 100%, 26% 98%, 4% 80%, 0 40%, 6% 12%); background: linear-gradient(135deg, rgba(225, 248, 255, 0.5), rgba(150, 210, 240, 0.32) 45%, rgba(190, 235, 255, 0.45)); box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.7); }
  .blk::after { content: ''; position: absolute; inset: 0; clip-path: inherit; background: repeating-linear-gradient(115deg, transparent 0 14px, rgba(255, 255, 255, 0.16) 14px 16px); }
  .hl { position: absolute; left: 14%; top: 8%; width: 16%; height: 46%; background: linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0)); transform: skewX(-12deg); }
  .hl2 { position: absolute; right: 14%; top: 14%; width: 6%; height: 20%; background: rgba(255, 255, 255, 0.7); transform: skewX(-12deg); }
  .cr { position: absolute; left: 24%; right: 24%; top: 8%; bottom: 4%; width: 52%; height: 88%; overflow: visible; }
  .cr path { fill: none; stroke: #fff; stroke-width: 2.2; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 1px #3d8fc4); stroke-linecap: square; }
  .shard { position: absolute; width: 14%; height: 18%; background: linear-gradient(135deg, rgba(240, 252, 255, 0.85), rgba(140, 205, 240, 0.55)); clip-path: polygon(50% 0, 100% 40%, 70% 100%, 10% 75%); }
  .s1 { left: 18%; bottom: 2%; } .s2 { right: 16%; bottom: 6%; transform: rotate(30deg) scale(0.8); } .s3 { right: 22%; top: 4%; transform: rotate(-20deg) scale(0.7); }
  .frag { position: absolute; width: 18%; height: 18%; background: linear-gradient(135deg, rgba(240, 252, 255, 0.9), rgba(120, 195, 235, 0.6)); clip-path: polygon(40% 0, 100% 30%, 80% 100%, 0 70%); animation: frag 0.6s ease-out forwards; }
  @keyframes frag { to { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 0; } }
  .shatter .sil { animation: fade 0.25s ease-out forwards; }
  .melt { animation: melt 0.6s ease-in forwards; }
  @keyframes melt { to { opacity: 0; transform: translateY(6px); filter: blur(1px); } }
  @keyframes fade { to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .frag, .melt { animation-duration: 0.01s; } }
</style>
