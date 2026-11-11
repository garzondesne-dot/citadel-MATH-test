<script lang="ts">
  import type { Snippet } from 'svelte';
  // BottomAction (3절): 주요 단추 1(꽉 찬 폭 · 강조색 · 칼각 그림자) + 보조 0~2(테두리 단추) · 높이 72 · 화면 아래 고정
  //   못 누름 = 흐림 + 이유 한 줄(why)
  const { main, disabled = false, why = '', onmain, aux, mainLabel }:
    { main?: Snippet; disabled?: boolean; why?: string; onmain?: () => void; aux?: Snippet; mainLabel?: string } = $props();
</script>

<div class="act">
  <div class="row">
    {#if aux}{@render aux()}{/if}
    {#if main}<button type="button" class="btn" {disabled} aria-label={mainLabel} onclick={() => onmain?.()}>{@render main()}</button>{/if}
  </div>
  {#if why}<p class="why">{why}</p>{/if}
</div>

<style>
  .act { position: sticky; bottom: 0; z-index: 4; min-height: var(--bar-bottom); padding: var(--s2) var(--s4) calc(var(--s3) + env(safe-area-inset-bottom, 0px)); background: var(--bg); display: flex; flex-direction: column; gap: var(--s1); }
  .row { display: flex; gap: var(--s2); }
  .btn { flex: 1; min-height: 52px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 17px var(--font); box-shadow: 0 3px 0 var(--accent-sh); display: flex; align-items: center; justify-content: center; gap: var(--s2); transition: transform var(--t), box-shadow var(--t); }
  .btn:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .btn:disabled { opacity: 0.4; box-shadow: none; }
  .row :global(.btn2) { min-height: 52px; min-width: 92px; padding: 0 var(--s3); border-radius: 14px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .row :global(.btn2:disabled) { opacity: 0.4; }
  .why { margin: 0; text-align: center; font-size: var(--fs-small); color: var(--text-3); }
</style>
