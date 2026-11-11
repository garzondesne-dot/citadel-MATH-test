<script lang="ts">
  import { BY } from '../../engine/symtalk';
  import { closeSym, symState } from './symsheet.svelte';
  import Sheet from './Sheet.svelte';
  // 기호 톡 누른 뒤 (⑧′): ① 정확한 뜻(굵게) → ② 쉽게 말하면(기울임 · 옅게) → ③ 기억 고리(작게) · 문구 = 정식 SYMBOL-TALK 그대로
  const r = $derived(symState.open ? BY[symState.open] : null);
</script>

{#if r}
  <Sheet onclose={closeSym} mainText="문제로 돌아가기">
    {#snippet title()}<span class="big">{r.sym}</span>{/snippet}
    <p class="def">{r.def}</p>
    <p class="easy">쉽게 말하면 · {r.easy}</p>
    {#if r.memo}<p class="memo">기억 고리 · {r.memo}</p>{/if}
  </Sheet>
{/if}

<style>
  .big { color: var(--accent); }
  .def { margin: 0; font-size: var(--fs-body); font-weight: 700; line-height: 1.55; }
  .easy { margin: 0; font-size: 15px; font-style: italic; color: var(--text-2); }
  .memo { margin: 0; font-size: var(--fs-small); color: var(--text-3); }
</style>
