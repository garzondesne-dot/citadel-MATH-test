<script lang="ts">
  import { runeNext } from '../../engine/input';
  import { RUNE } from '../manifest';
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

<div class="runepad" style:--rk="url({RUNE.key})" style:--rl="url({RUNE.lit})" style:--rs="url({RUNE.slot})" style:--ro="url({RUNE.slotOn})">
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
  .runepad { display: grid; gap: 6px; }
  .rune-row { display: flex; gap: 6px; align-items: stretch; }
  /* 그림 틀 = 9-slice (가장자리 고정 · 가운데 늘림) · 크기는 그대로 · 글자색 = 틀 안이 늘 어두운 남색이라 테마와 상관없이 밝게 */
  .rune-slot { flex: 1; min-width: 0; min-height: 46px; box-sizing: border-box; display: grid; place-items: center; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; color: #fff4d6; border: 10px solid transparent; border-image: var(--ro) 14 fill / 10px stretch; image-rendering: pixelated; text-shadow: 0 1px 0 #000; }
  .rune-slot.empty { border-image-source: var(--rs); }
  .ph { font-size: var(--fs-small); font-weight: 500; color: #b9c0d4; text-shadow: none; }
  .rune-keys { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
  .rune { min-height: var(--tap); min-width: 0; padding: 0; box-sizing: border-box; font: 700 18px var(--font); color: #fff4d6; text-shadow: 0 1px 0 #000; border: 9px solid transparent; border-image: var(--rk) 15 fill / 9px stretch; background: none; image-rendering: pixelated; filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.35)); }
  .rune:active:not(:disabled) { transform: translateY(2px); filter: none; }
  .rune.del { flex: 0 0 56px; }
  .rune.lit { border-image-source: var(--rl); }
  .rune:disabled { opacity: 0.4; box-shadow: none; }
</style>
