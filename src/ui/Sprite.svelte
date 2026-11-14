<script lang="ts">
  import { monNudge, poseCol, runeAt, spriteOf, type MonPose } from './manifest';
  // 몬스터 한 칸 (DOM) · 🎲 5칸 시트 = 대기 때 A ↔ B 번갈아(숨쉬기 0.7초) · 몸 룬 원판에 기호(쓰러짐 = 없음) · 대장(@e) = 1.3배 + 금빛 테두리
  let { ref, pose = 'idle', size = 160 }: { ref: string; pose?: MonPose; size?: number } = $props();
  const sp = $derived(spriteOf(ref));
  const col = $derived(poseCol(sp.sheet, pose));
  const breath = $derived(pose === 'idle' && sp.sheet.poses.idleB != null);
  const nd = $derived(monNudge(sp.sheet.src, sp.row, sp.sheet.poses.idle, sp.sheet.cell)); // 🎯 서 있는 자세 상자 기준 정중앙 · 발 기준선 (#121)
  const rn = $derived(sp.rune ? runeAt(sp.sheet, sp.row, col) : null);
  const filt = $derived([sp.hue ? `hue-rotate(${sp.hue}deg)` : '', sp.elite ? 'drop-shadow(0 0 2px #ffd25a) drop-shadow(0 0 6px #e8a81f)' : ''].filter(Boolean).join(' ') || null);
</script>

<i
  class="sprite"
  class:breath
  class:elite={sp.elite}
  style:width="{size}px"
  style:height="{size}px"
  style:background-image="url({sp.url})"
  style:background-size="{sp.sheet.cols * size}px {sp.sheet.rows * size}px"
  style:background-position="-{col * size}px -{sp.row * size}px"
  style:--s="{size}px"
  style:--y="-{sp.row * size}px"
  style:filter={filt}
  style:translate="{nd.dx * size}px {nd.dy * size}px"
  aria-label={sp.sheet.names[sp.row]}
>{#if rn}<b class="rune" style:left="{rn[0] * 100}%" style:top="{rn[1] * 100}%" style:font-size="{rn[2] * size * 1.35}px">{sp.rune}</b>{/if}</i>

<style>
  .sprite { position: relative; display: inline-block; image-rendering: pixelated; background-repeat: no-repeat; font-style: normal; }
  .sprite.breath { animation: breath 1.4s steps(1) infinite; }
  @keyframes breath { 0% { background-position: 0 var(--y); } 50% { background-position: calc(-1 * var(--s)) var(--y); } }
  .sprite.elite { transform: scale(1.3); transform-origin: 50% 100%; }
  .rune { position: absolute; transform: translate(-50%, -52%); color: #fff; font-family: 'DejaVu Sans', system-ui, sans-serif; font-weight: 800; line-height: 1; text-shadow: 0 0 2px #0b3a52, 0 0 4px #0b3a52, 0 0 6px rgba(80, 230, 255, 0.8); pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .sprite.breath { animation: none; } }
</style>
