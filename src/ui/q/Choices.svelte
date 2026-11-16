<script lang="ts">
  // 고르기 · OX · 기호 칸 보기 (정식 itemHtml choice · ox · blanks)
  import { SUBJ } from '../../engine/subject';
  const F = SUBJ.rich?.Figure;
  const optOf = (o: string) => (SUBJ.rich ? SUBJ.rich.opt(o) : { text: o });
  const { opts, value, col = false, disabled = false, onpick }: { opts: string[]; value: number | null; col?: boolean; disabled?: boolean; onpick: (i: number) => void } = $props();
</script>

<div class="opts" class:col class:many={opts.length >= 8}> <!-- 📜 2026-11-16 보기 8개 이상 = 작은 단추 · 2열 격자 -->
  {#each opts as o, k (k)}
    <button type="button" class="opt" class:on={value === k} aria-pressed={value === k} {disabled} onclick={() => onpick(k)}>{#if F && 'fig' in optOf(o)}<F fig={(optOf(o) as { fig: unknown }).fig} />{:else}{o}{/if}</button>
  {/each}
</div>

<style>
  .opts { display: flex; flex-wrap: wrap; gap: var(--s2); }
  .opts.col { flex-direction: column; }
  .opts.many { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .opts.many .opt { min-height: 44px; padding: 6px var(--s2); font-size: 15px; }
  .opt { min-height: var(--tap); min-width: 56px; padding: var(--s2) var(--s3); text-align: left; border-radius: var(--r); border: 2px solid var(--surface-2); background: var(--surface-2); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); overflow-wrap: anywhere; }
  .opts:not(.col) .opt { text-align: center; }
  .opt:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .opt.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); box-shadow: 0 3px 0 var(--accent-sh); }
  .opt:disabled { opacity: 0.4; box-shadow: none; }
</style>
