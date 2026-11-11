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
  .sb { display: grid; gap: var(--s2); }
  .made { display: flex; flex-wrap: wrap; gap: 6px; min-height: 44px; padding: 6px; border: 1px dashed var(--line); border-radius: var(--r); }
  .set { display: inline-flex; align-items: center; gap: var(--s1); padding: 2px 8px; border-radius: 12px; background: var(--surface-2); font-weight: 700; }
  .x { position: relative; padding: 0 6px; min-height: 28px; border: none; background: transparent; color: var(--text-2); }
  .x::before { content: ''; position: absolute; inset: -10px; }
  .ph { color: var(--text-3); font-size: var(--fs-small); }
  .chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 6px; }
  .chip { min-height: 50px; border-radius: var(--r); border: 2px solid var(--surface-2); background: var(--surface-2); color: var(--text); font: 700 18px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .chip.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); box-shadow: 0 3px 0 var(--accent-sh); }
  .chip.empty { border-style: dashed; border-color: var(--line); font-size: 15px; }
  .put { min-height: var(--tap); border-radius: var(--r); border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .put:disabled { opacity: 0.4; }
</style>
