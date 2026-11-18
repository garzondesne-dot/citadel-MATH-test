<script lang="ts">
  import type { Store } from '../../model/types';
  import { CLASSES } from '../../school/school';
  import { EGGS, eggHint } from '../../school/eggs';
  // 🥚 #74 이스터에그 「힌트 한 단계 더」 (반마다 · school/eggHint/{반} = 1) — 수수께끼 1 · 2 · 3 만 · 일주일 아무도 못 찾으면
  const { S }: { S: Store } = $props();
  let ver = $state(0);
  const lvOf = (c: string) => { void ver; return Number(S.get(`school/eggHint/${c}`)) || 0; };
  function flip(c: string) { S.set(`school/eggHint/${c}`, lvOf(c) ? null : 1); ver++; }
</script>

<div class="eh" data-k="egg-hint">
  <p class="fx">학생 ⛺ 기록 텐트 「🥚 비밀」 탭 · 못 찾은 칸에 보이는 힌트 · 켜면 1 · 2 · 3 번에 한 단계 더 (4 ~ 8 = 우연히 찾는 것 · 힌트 없음)</p>
  <ul class="cl">
    {#each CLASSES as c (c)}<li><span>{c}반</span><button type="button" class:on={lvOf(c) > 0} data-k="egg-hint-{c}" onclick={() => flip(c)}>{lvOf(c) ? '💡 한 단계 더 · 켜짐' : '기본 힌트'}</button></li>{/each}
  </ul>
  <p class="cap">학생에게 보이는 힌트</p>
  <ol>{#each EGGS.filter((e) => e.hint) as e (e.id)}<li><b>{e.no}.</b> {eggHint(e, 0)}<br /><small>한 단계 더 = 💡 {e.hint2}</small></li>{/each}</ol>
</div>

<style>
  .eh { display: flex; flex-direction: column; gap: 10px; padding-bottom: 12px; }
  .fx, .cap { margin: 0; font-size: 13px; color: var(--text-2); }
  .cl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .cl li { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 48px; padding: 0 10px; border-radius: 12px; background: var(--surface); }
  .cl button { min-height: 40px; padding: 0 14px; border-radius: 20px; border: 1px solid var(--line, #3a3f4c); background: var(--surface-2); color: var(--text-2); font: 700 13px var(--font); }
  .cl button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent, #1d1406); }
  ol { margin: 0; padding-left: 18px; font-size: 13px; display: flex; flex-direction: column; gap: 6px; } ol small { color: var(--text-3); }
</style>
