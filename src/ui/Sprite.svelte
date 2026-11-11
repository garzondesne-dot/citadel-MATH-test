<script lang="ts">
  import { spriteOf } from './manifest';
  let { ref, pose = 'idle', size = 160 }: { ref: string; pose?: 'idle' | 'attack' | 'down'; size?: number } = $props();
  const sp = $derived(spriteOf(ref));
  const col = $derived(sp.sheet.poses[pose]);
</script>

<i
  class="sprite"
  style:width="{size}px"
  style:height="{size}px"
  style:background-image="url({sp.url})"
  style:background-size="{sp.sheet.cols * size}px {sp.sheet.rows * size}px"
  style:background-position="-{col * size}px -{sp.row * size}px"
  aria-label={sp.sheet.names[sp.row]}
></i>

<style>
  .sprite { display: inline-block; image-rendering: pixelated; background-repeat: no-repeat; }
</style>
