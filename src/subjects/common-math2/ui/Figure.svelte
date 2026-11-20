<script lang="ts">
  // 🟣 공통수학2 그림 (SUBJ.rich.Figure) — 벤 다이어그램 · 색칠 벤 (venn.ts 의 조각) · 📈 좌표평면 그래프 (graph.ts)
  import Venn from './Venn.svelte';
  import Graph from './Graph.svelte';
  const { fig }: { fig: unknown } = $props();
  const f = $derived(fig as { venn?: [string, string]; shade?: string; graph?: string; big?: boolean });
</script>

{#if f.graph != null}<Graph src={f.graph} big={!!f.big} />{:else}<Venn venn={f.venn ?? null} shade={f.shade ?? null} />{/if}
