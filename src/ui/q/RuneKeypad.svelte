<script lang="ts">
  import { runeNext } from '../../engine/input';
  // ⌨ 룬 키패드 = 정식 그대로 (#159 · 정식 js/engine/ui.js DS.UI.runeHtml · runes · runeCast · css .rune*):
  //   빛 룬 0~9 (5 × 2) + ⌫ (+ 음수 답만 −) · 답 칸(빈 칸 = 점선 + 「숫자를 넣어 주세요」) · 누른 룬 빛남 0.38초 · 새긴 숫자 carve · 내기 = cast(cast 를 늘리면 시전 빛)
  //   문제 · 형성평가 · 성채 · 모루 예제 · 시연 모두 이 하나 · 색은 정식 값(어두운 판이라 테마와 상관없이 읽힘)
  const { value, len = 2, neg = false, disabled = false, cast = 0, onchange }: { value: number | string | null; len?: number; neg?: boolean; disabled?: boolean; cast?: number; onchange: (v: number | '-' | null) => void } = $props();
  const has = $derived(value != null && value !== '');
  let lit = $state(''), carve = $state(0);
  function press(k: string) {
    lit = ''; queueMicrotask(() => { lit = k; setTimeout(() => { if (lit === k) lit = ''; }, 380); });
    const was = has ? value : null, v = runeNext(value, k, { len });
    if (v === was) return;
    onchange(v);
    if (v != null && k !== 'x') carve++;
  }
</script>

<div class="runepad">
  <div class="rune-row">
    {#key `${carve}|${cast}`}
      <div class="rune-slot" class:empty={!has} class:carve={carve > 0} class:cast={cast > 0 && has} aria-live="polite">{#if has}{String(value).replace('-', '−')}{:else}<span class="rune-ph">숫자를 넣어 주세요</span>{/if}</div>
    {/key}
    {#if neg}<button type="button" class="rune rune-del rune-neg" class:lit={lit === 'm'} {disabled} aria-label="빼기 부호" onclick={() => press('m')}>−</button>{/if}
    <button type="button" class="rune rune-del" class:lit={lit === 'x'} {disabled} aria-label="지우기" onclick={() => press('x')} oncontextmenu={(e) => e.preventDefault()}>⌫</button>
  </div>
  <div class="rune-keys">
    {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as n (n)}
      <button type="button" class="rune" class:lit={lit === String(n)} {disabled} aria-label="룬 {n}" onclick={() => press(String(n))} oncontextmenu={(e) => e.preventDefault()}>{n}</button>
    {/each}
  </div>
</div>

<style>
  /* 정식 css/style.css .rune* 값 그대로 · --pixel = Galmuri11 (없으면 앱 글꼴) */
  .runepad { display: grid; gap: 8px; --pixel: 'Galmuri11', var(--font); }
  .rune-row { display: flex; gap: 8px; align-items: stretch; }
  .rune-slot { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; min-height: 52px; border: 2px solid #34507a; background: #0f0e14; color: #bfeaff; font: 30px var(--pixel); letter-spacing: 0.08em; text-shadow: 0 0 8px #7fd6ff88; border-radius: 10px; }
  .rune-slot.empty { border-style: dashed; }
  .rune-ph { font: 14px var(--pixel); color: #7f8fa8; letter-spacing: 0; text-shadow: none; }
  .rune-slot.carve { animation: runeCarve 0.35s ease-out; }
  .rune-slot.cast { animation: runeCast 0.5s ease-out; }
  @keyframes runeCarve { 0% { color: #fff; text-shadow: 0 0 16px #7fd6ff; transform: scale(1.06); } 100% { transform: none; } }
  @keyframes runeCast { 0% { box-shadow: 0 0 0 #7fd6ff; } 45% { box-shadow: 0 0 26px #7fd6ff, inset 0 0 14px #7fd6ff88; border-color: #bfeaff; } 100% { box-shadow: 0 0 0 #7fd6ff; } }
  .rune-keys { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
  .rune { min-height: 46px; min-width: 0; aspect-ratio: 1.15; font: 22px var(--pixel); color: #7fd6ff; background: radial-gradient(circle at 50% 40%, #25324a, #191d2b); border: 2px solid #34507a; border-radius: 50%; box-shadow: inset 0 0 8px #2b6a9a55; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; padding: 0; }
  .rune:active:not(:disabled) { transform: translateY(1px); }
  .rune.lit { color: #fff; box-shadow: 0 0 14px #7fd6ff, inset 0 0 10px #7fd6ff; border-color: #bfeaff; }
  .rune-del { aspect-ratio: auto; width: 64px; flex: none; border-radius: 10px; font: 26px system-ui, sans-serif; color: #ffd27a; }
  .rune-neg { color: #bfeaff; }
  .rune:disabled { opacity: 0.4; }
  @media (prefers-reduced-motion: reduce) { .rune-slot.carve, .rune-slot.cast { animation: none; } }
</style>
