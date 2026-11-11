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
        <button type="button" class="chip" class:on={on.has(k)} class:empty={(q.empty || []).includes(k)} {disabled} onclick={() => onchange(chipToggle(q, value, k))}>{o}</button>
      {/each}
    </div>
  </div>
{/each}

<style>
  .grp { margin: 4px 0; }
  .grp-h { display: block; font-size: 0.9rem; margin-bottom: 4px; overflow-wrap: anywhere; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { min-width: 44px; min-height: 44px; max-width: 100%; border-radius: 22px; border: 2px solid var(--muted); background: var(--card); color: var(--fg); font-size: 1.05rem; overflow-wrap: anywhere; }
  .chip.on { border-color: var(--accent); background: var(--accent); color: var(--card); }
  .chip.empty { border-style: dashed; }
  .chip:disabled { opacity: 0.5; }
</style>
