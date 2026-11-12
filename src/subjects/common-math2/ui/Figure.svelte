<script lang="ts">
  // 🟣 공통수학2 그림 (SUBJ.rich.Figure) — 벤 다이어그램 · 색칠 벤 (venn.ts 의 조각)
  import Venn from './Venn.svelte';
  const { fig }: { fig: unknown } = $props();
  const f = $derived(fig as { venn?: [string, string]; shade?: string });
</script>

<Venn venn={f.venn ?? null} shade={f.shade ?? null} />
