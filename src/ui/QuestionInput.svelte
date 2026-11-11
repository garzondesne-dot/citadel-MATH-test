<script lang="ts">
  import type { Given, Question } from '../model/types';

  // 문항 하나의 답 칸 (학생 몬스터 · 보스가 같이 씀) — 형식: multi 칩 · number 숫자 칸 · choice 보기 단추
  //   (b2: 룬 키패드 · 기호 칸 · 부분집합 만들기는 다음 판)
  const { q, value, disabled = false, onchange }: { q: Question; value: Given; disabled?: boolean; onchange: (v: Given) => void } = $props();
  const picked = $derived(Array.isArray(value) ? (value as number[]) : []);
  const toggle = (j: number) => onchange(picked.includes(j) ? picked.filter((x) => x !== j) : [...picked, j].sort((a, b) => a - b));
</script>

<div class="q">
  <p>{q.question}</p>
  {#if q.type === 'multi'}
    <div class="chips">
      {#each q.options as o, j (j)}
        <button class="chip" class:on={picked.includes(j)} {disabled} onclick={() => toggle(j)}>{o}</button>
      {/each}
    </div>
  {:else if q.type === 'number'}
    <input
      class="num"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      {disabled}
      value={value == null ? '' : String(value)}
      oninput={(e) => {
        const t = (e.currentTarget as HTMLInputElement).value.replace(/[^0-9-]/g, '').slice(0, 5);
        onchange(t === '' || t === '-' ? null : Number(t));
      }}
      aria-label="답"
    />
  {:else if q.type === 'choice'}
    <div class="chips">
      {#each q.choices as c, j (j)}
        <button class="chip" class:on={value === j} {disabled} onclick={() => onchange(j)}>{c}</button>
      {/each}
    </div>
  {:else}
    <p class="todo">이 형식({q.type})은 다음 판에서</p>
  {/if}
</div>

<style>
  .q { margin: 12px 0; }
  .q p { margin: 0 0 6px; line-height: 1.5; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { min-width: 44px; min-height: 44px; border-radius: 22px; border: 2px solid var(--muted); background: var(--card); color: var(--fg); font-size: 1.05rem; }
  .chip.on { border-color: var(--accent); background: var(--accent); color: var(--card); }
  .chip:disabled { opacity: 0.5; }
  .num { width: 7rem; min-height: 44px; font-size: 1.2rem; text-align: center; border-radius: 10px; border: 2px solid var(--muted); background: var(--card); color: var(--fg); }
  .todo { color: var(--sub); }
</style>
