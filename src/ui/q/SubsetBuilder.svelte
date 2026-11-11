<script lang="ts">
  // 🧩 부분집합 모두 쓰기 = 새 칸 (#99 ③): 원소 칩으로 집합 하나를 만들어 「➕ 넣기」 · ∅ 단추 따로 · 만든 집합은 ✕ 로 뺌
  const { base, value, disabled = false, onchange }: { base: number[]; value: number[][]; disabled?: boolean; onchange: (v: number[][]) => void } = $props();
  let cur = $state<number[]>([]);
  const key = (s: number[]) => s.slice().sort((a, b) => a - b).join(',');
  const label = (s: number[]) => (s.length ? `{${s.slice().sort((a, b) => a - b).join(', ')}}` : '∅');
  const has = (s: number[]) => (value || []).some((x) => key(x) === key(s));
  const toggle = (x: number) => { cur = cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x].sort((a, b) => a - b); };
  function add(s: number[]) { if (!has(s)) onchange([...(value || []), s.slice()]); cur = []; }
  const drop = (i: number) => onchange((value || []).filter((_, k) => k !== i));
</script>

<div class="sb">
  <div class="made" aria-label="만든 집합">
    {#each value || [] as s, i (key(s))}
      <span class="set">{label(s)} <button type="button" class="x" {disabled} aria-label="{label(s)} 빼기" onclick={() => drop(i)}>✕</button></span>
    {:else}
      <span class="ph">아래에서 집합을 하나씩 만들어 넣어요</span>
    {/each}
  </div>
  <div class="chips">
    {#each base as x (x)}
      <button type="button" class="chip" class:on={cur.includes(x)} {disabled} onclick={() => toggle(x)}>{x}</button>
    {/each}
    <button type="button" class="chip empty" {disabled} onclick={() => add([])}>∅ 넣기</button>
  </div>
  <button type="button" class="put" disabled={disabled || !cur.length || has(cur)} onclick={() => add(cur)}>➕ {cur.length ? label(cur) : '집합'} 넣기</button>
</div>

<style>
  .sb { display: grid; gap: 8px; }
  .made { display: flex; flex-wrap: wrap; gap: 6px; min-height: 36px; padding: 6px; border: 1px dashed var(--muted); border-radius: 10px; }
  .set { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; background: var(--muted); }
  .x { padding: 0 6px; min-height: 28px; border: none; background: transparent; color: var(--fg); }
  .ph { color: var(--sub); font-size: 0.9rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { min-width: 44px; min-height: 44px; border-radius: 22px; border: 2px solid var(--muted); background: var(--card); color: var(--fg); font-size: 1.05rem; }
  .chip.on { border-color: var(--accent); background: var(--accent); color: var(--card); }
  .chip.empty { border-style: dashed; }
  .put { min-height: 44px; }
</style>
