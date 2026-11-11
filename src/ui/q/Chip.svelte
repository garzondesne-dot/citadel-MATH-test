<script lang="ts">
  import type { Question } from '../../model/types';
  import { chipToggle } from '../../engine/input';
  // 🔘 원소 칩 · 여러 개 고르기 (정식 P8 · #41 두 칸 고르기 groups · ∅ 단추 q.empty)
  type Multi = Extract<Question, { type: 'multi' }>;
  const { q, value, disabled = false, onchange }: { q: Multi; value: number[]; disabled?: boolean; onchange: (v: number[]) => void } = $props();
  const on = $derived(new Set(value || []));
  const parts = $derived.by(() => {
    if (!q.groups?.length) return [{ label: '', from: 0, n: q.options.length }];
    let b0 = 0;
    return q.groups.map((g) => { const p = { label: g.label, from: b0, n: g.n }; b0 += g.n; return p; });
  });
</script>

{#each parts as p (p.from)}
  <div class="grp">
    {#if p.label}<b class="grp-h">{p.label}</b>{/if}
    <div class="chips">
      {#each q.options.slice(p.from, p.from + p.n) as o, j (p.from + j)}
        {@const k = p.from + j}
        <button type="button" class="chip" class:on={on.has(k)} aria-pressed={on.has(k)} class:empty={(q.empty || []).includes(k)} {disabled} onclick={() => onchange(chipToggle(q, value, k))}>{o}</button>
      {/each}
    </div>
  </div>
{/each}

<style>
  .grp { display: flex; flex-direction: column; gap: 6px; }
  .grp-h { font-size: var(--fs-small); color: var(--text-2); overflow-wrap: anywhere; }
  .chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 6px; }
  .chip { min-height: 50px; min-width: 0; padding: 0 4px; border-radius: var(--r); border: 2px solid var(--surface-2); background: var(--surface-2); color: var(--text); font: 700 18px var(--font); box-shadow: 0 3px 0 var(--press-sh); overflow-wrap: anywhere; transition: transform var(--t); }
  .chip:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .chip.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); box-shadow: 0 3px 0 var(--accent-sh); }
  .chip.empty { border-style: dashed; border-color: var(--line); }
  .chip:disabled { opacity: 0.4; box-shadow: none; }
</style>
