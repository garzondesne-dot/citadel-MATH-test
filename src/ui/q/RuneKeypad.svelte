<script lang="ts">
  import { runeNext } from '../../engine/input';
  // ⌨ 룬 키패드 (정식 #92 · #97): 0~9 + ⌫ (+ 음수 답만 −) · 빈 칸에서 시작 · 답 칸만 바뀜(화면 전체를 다시 그리지 않음)
  const { value, len = 2, neg = false, disabled = false, onchange }: { value: number | string | null; len?: number; neg?: boolean; disabled?: boolean; onchange: (v: number | '-' | null) => void } = $props();
  const has = $derived(value != null && value !== '');
  let lit = $state('');
  function press(k: string) {
    lit = k; setTimeout(() => { if (lit === k) lit = ''; }, 380);
    const was = has ? value : null, v = runeNext(value, k, { len });
    if (v !== was) onchange(v);
  }
</script>

<div class="runepad">
  <div class="rune-row">
    <div class="rune-slot" class:empty={!has} aria-live="polite">{#if has}{String(value).replace('-', '−')}{:else}<span class="ph">숫자를 넣어 주세요</span>{/if}</div>
    {#if neg}<button type="button" class="rune del" class:lit={lit === 'm'} {disabled} aria-label="빼기 부호" onclick={() => press('m')}>−</button>{/if}
    <button type="button" class="rune del" class:lit={lit === 'x'} {disabled} aria-label="지우기" onclick={() => press('x')}>⌫</button>
  </div>
  <div class="rune-keys">
    {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as n (n)}
      <button type="button" class="rune" class:lit={lit === String(n)} {disabled} aria-label="룬 {n}" onclick={() => press(String(n))}>{n}</button>
    {/each}
  </div>
</div>

<style>
  .runepad { display: grid; gap: 6px; margin-top: 6px; }
  .rune-row { display: flex; gap: 6px; align-items: stretch; }
  .rune-slot { flex: 1; min-width: 0; min-height: 44px; display: grid; place-items: center; font-size: 1.4rem; font-weight: 700; border: 2px solid var(--accent); border-radius: 10px; background: var(--card); }
  .rune-slot.empty { border-style: dashed; border-color: var(--muted); }
  .ph { font-size: 0.85rem; font-weight: 400; color: var(--sub); }
  .rune-keys { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
  .rune { min-height: 44px; min-width: 0; padding: 0; font-size: 1.15rem; font-weight: 700; border-radius: 10px; border: 1px solid var(--muted); background: var(--card); color: var(--fg); transition: box-shadow 0.2s; }
  .rune.del { flex: 0 0 52px; }
  .rune.lit { box-shadow: 0 0 0 3px var(--accent); }
  .rune:disabled { opacity: 0.5; }
</style>
