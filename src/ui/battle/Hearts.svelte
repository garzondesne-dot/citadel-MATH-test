<script lang="ts">
  // ❤ 노란 단추 오른쪽 고정 칸 (📜 2026-11-13 밤 · 베타 v4 · 시안 ⑤⑥): 풀 때 = ❤ 남은 수(반 하트 · 빈 하트 = 테두리 · 깨지는 연출 없이 조용히 비움)
  //   다 맞힌 뒤 = ⚡ 남은 수 · 🔥 재도전 판 = ⚡ + 🔒(판을 다 맞혀야 다음 ⚡)
  const { mode = 'heart', total = 4, left = 4, lock = false }: { mode?: 'heart' | 'energy'; total?: number; left?: number; lock?: boolean } = $props();
  const cells = $derived(Array.from({ length: Math.max(1, Math.ceil(total)) }, (_, i) => (left >= i + 1 ? 'full' : left > i ? 'half' : 'empty')));
</script>

{#if mode === 'heart'}
  <span class="hs" role="img" aria-label="하트 {left} / {total}">
    {#each cells as c, i (i)}<svg class={c} viewBox="0 0 16 14" width="15" height="13" aria-hidden="true"><defs><clipPath id="hh{i}"><rect x="0" y="0" width="8" height="14" /></clipPath></defs>
      <path d="M8 13 1.6 6.6A3.6 3.6 0 0 1 8 2.4a3.6 3.6 0 0 1 6.4 4.2Z" class="o" />{#if c === 'full'}<path d="M8 13 1.6 6.6A3.6 3.6 0 0 1 8 2.4a3.6 3.6 0 0 1 6.4 4.2Z" class="f" />{:else if c === 'half'}<path d="M8 13 1.6 6.6A3.6 3.6 0 0 1 8 2.4a3.6 3.6 0 0 1 6.4 4.2Z" class="f" clip-path="url(#hh{i})" />{/if}</svg>{/each}
  </span>
{:else}
  <span class="hs en" role="img" aria-label="기력 {left}{lock ? ' · 재도전 판을 다 맞혀야 다음 기력' : ''}"><b>⚡ {left}</b>{#if lock}<i>🔒</i>{/if}</span>
{/if}

<style>
  .hs { display: inline-flex; align-items: center; gap: 2px; padding: 4px 6px; border-radius: 10px; background: rgba(26, 19, 0, 0.14); }
  svg .o { fill: none; stroke: rgba(40, 20, 0, 0.6); stroke-width: 1.6; }
  svg .f { fill: var(--hp, #e5484d); stroke: #7a1a14; stroke-width: 1.2; }
  .en { background: #2a2200; padding: 4px 10px; gap: 4px; }
  .en b { color: #ffe066; font-size: 14px; font-weight: 900; }
  .en i { font-style: normal; font-size: 13px; }
</style>
