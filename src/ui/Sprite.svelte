<script lang="ts">
  import { monNudge, spriteOf } from './manifest';
  let { ref, pose = 'idle', size = 160 }: { ref: string; pose?: 'idle' | 'attack' | 'down'; size?: number } = $props();
  const sp = $derived(spriteOf(ref));
  const col = $derived(sp.sheet.poses[pose]);
  const nd = $derived(monNudge(sp.sheet.src, sp.row, sp.sheet.poses.idle, sp.sheet.cell)); // 🎯 서 있는 자세 상자 기준 정중앙 · 발 기준선 (#121)
</script>

<i
  class="sprite"
  style:width="{size}px"
  style:height="{size}px"
  style:background-image="url({sp.url})"
  style:background-size="{sp.sheet.cols * size}px {sp.sheet.rows * size}px"
  style:background-position="-{col * size}px -{sp.row * size}px"
  style:filter={sp.hue ? `hue-rotate(${sp.hue}deg)` : null}
  style:translate="{nd.dx * size}px {nd.dy * size}px"
  aria-label={sp.sheet.names[sp.row]}
></i>

<style>
  .sprite { display: inline-block; image-rendering: pixelated; background-repeat: no-repeat; }
</style>
