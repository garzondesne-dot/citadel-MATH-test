<script lang="ts">
  // 고르기 · OX · 기호 칸 보기 (정식 itemHtml choice · ox · blanks)
  const { opts, value, col = false, disabled = false, onpick }: { opts: string[]; value: number | null; col?: boolean; disabled?: boolean; onpick: (i: number) => void } = $props();
</script>

<div class="opts" class:col>
  {#each opts as o, k (k)}
    <button type="button" class="opt" class:on={value === k} {disabled} onclick={() => onpick(k)}>{o}</button>
  {/each}
</div>

<style>
  .opts { display: flex; flex-wrap: wrap; gap: 8px; }
  .opts.col { flex-direction: column; }
  .opt { min-height: 44px; min-width: 52px; text-align: left; border-radius: 10px; border: 2px solid var(--muted); background: var(--card); color: var(--fg); font-size: 1rem; overflow-wrap: anywhere; }
  .opts:not(.col) .opt { text-align: center; }
  .opt.on { border-color: var(--accent); background: var(--accent); color: var(--card); }
  .opt:disabled { opacity: 0.5; }
</style>
