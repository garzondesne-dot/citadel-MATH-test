<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import { CLASSES } from '../../school/school';
  import { autoNext, heldNo, PREP_PATH, prepOver, prepPacks } from '../../school/prepopen';

  // 📖 #66 배움터 예습 열기 · 닫기 (DECISIONS 「📖🎯 배움터」): 기본 = 자동(반이 n차시 수업을 하면 n + 1 하나) · 차시마다 「열기 · 닫기」로 덮어씀
  //   저장 = school/prepOpen/{반}/{차시 id} = true(열기) · false(닫기) · 지움 = 자동 (교사만 쓰기 · 규칙 그대로)
  const { S }: { S: Store } = $props();
  let cls = $state(CLASSES[0] ?? ''), ver = $state(0);
  const stop = untrack(() => S.watch(PREP_PATH, () => ver++)); onDestroy(stop);
  const info = $derived.by(() => { void ver; const n = heldNo(S, cls), a = autoNext(n); return { n, auto: a.L?.id ?? null, wait: n > 0 && !a.L ? a.want : null, ov: prepOver(S, cls) }; });
  const stateOf = (lid: string): 'auto' | 'on' | 'off' => { const v = info.ov[lid]; return v === true ? 'on' : v === false ? 'off' : 'auto'; };
  const isOpen = (lid: string) => { const st = stateOf(lid); return st === 'on' || (st === 'auto' && info.auto === lid); };
  function set(lid: string, st: 'auto' | 'on' | 'off') { S.set(`${PREP_PATH}/${cls}/${lid.replace(/[.#$/[\]]/g, '_')}`, st === 'auto' ? null : st === 'on'); ver++; }
</script>

<div class="pu" data-k="prep-unlock">
  <p class="fx">기본 = <b>자동</b> · 반이 n차시 수업을 하면 <b>다음 차시 하나</b>가 던전 문 🔥 예습(탐사)에 열려요 · 보상 · 반 통계 없음</p>
  <div class="chips">{#each CLASSES as c (c)}<button type="button" class:on={cls === c} onclick={() => (cls = c)}>{c}</button>{/each}</div>
  <p class="now" data-k="prep-now">{cls}반 · {info.n ? `${info.n}차시까지 수업함` : '아직 수업 기록 없음'} · {info.auto ? `자동 = ${prepPacks().find((p) => p.id === info.auto)?.no}차시` : info.wait ? `${info.wait}차시 팩이 아직 없어요(준비 중)` : '자동으로 열린 차시 없음'}</p>
  <ul class="rows">
    {#each prepPacks() as L (L.id)}
      <li class:open={isOpen(L.id)} data-lid={L.id}><span class="t"><b>{L.no}차시</b> {L.title}<small>{isOpen(L.id) ? '📖 열림' : '닫힘'}{stateOf(L.id) === 'auto' && info.auto === L.id ? ' · 자동' : ''}</small></span>
        <span class="seg">{#each [['auto', '자동'], ['on', '열기'], ['off', '닫기']] as [k, t] (k)}<button type="button" class:on={stateOf(L.id) === k} data-k="prep-{k}" onclick={() => set(L.id, k as 'auto' | 'on' | 'off')}>{t}</button>{/each}</span></li>
    {/each}
  </ul>
</div>

<style>
  .pu { display: flex; flex-direction: column; gap: var(--s3); }
  .fx { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-2); } .fx b { color: var(--text); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { min-height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); } .chips button.on { background: var(--accent); color: var(--on-accent, #1d1406); border-color: var(--accent); }
  .now { margin: 0; font: 700 13px var(--font); color: var(--text-2); }
  .rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .rows li { display: flex; align-items: center; gap: var(--s2); min-height: 52px; padding: 4px var(--s2); border-radius: 10px; background: var(--surface-2); } .rows li.open { box-shadow: inset 3px 0 0 var(--accent); }
  .t { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: 14px; } .t small { color: var(--text-3); font-size: 12px; }
  .seg { display: flex; flex: none; border-radius: 10px; overflow: hidden; border: 1px solid var(--line, #2f3440); }
  .seg button { min-height: 40px; min-width: 48px; border: 0; background: var(--surface); color: var(--text-2); font: 700 13px var(--font); } .seg button.on { background: var(--accent); color: var(--on-accent, #1d1406); }
</style>
