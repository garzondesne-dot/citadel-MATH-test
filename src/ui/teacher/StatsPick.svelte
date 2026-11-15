<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import { CLASSES } from '../../school/school';
  import { autoCells, cellsOf, fullLesson, picksOf, setPick } from '../../school/statsCells';

  // 📊 통계에 넣는 칸 (📜 2026-11-15 DECISIONS 04ec16d) — 반 · 차시 · 칸마다 「넣기 / 빼기」 (교사만 쓰는 school 칸 · 자동보다 우선 · 학생 기록은 안 지움)
  //   자동 = 그 반 수업에서 연 칸 + 수업 기록에 누가 낸 칸 · 🎯 허수아비 기록은 넣지 않음
  const { S, cls: cls0, onclose, onchange }: { S: Store; cls: string; onclose: () => void; onchange: () => void } = $props();
  let cls = $state(untrack(() => (CLASSES.includes(cls0) ? cls0 : CLASSES[0] ?? '')));
  let ver = $state(0), open = $state('');
  const stop = untrack(() => [S.watch('school/statsPick', () => ver++), S.watch('school/opened', () => ver++)]); onDestroy(() => stop.forEach((f) => f()));
  type Rec = { mons?: Record<string, unknown>; bossM?: string; boss?: number; no?: number };
  const recAll = $derived.by(() => { void ver; void cls; return S.get<Record<string, Record<string, Rec>>>(`records/${cls}`) || {}; });
  const lessons = $derived.by(() => {
    const ids = [...new Set(Object.values(recAll).flatMap((x) => Object.keys(x || {})))];
    return ids.map((id) => fullLesson(id)).filter((L): L is NonNullable<typeof L> => !!L).sort((a, b) => a.no - b.no);
  });
  function rows(lid: string) {
    void ver;
    const L = fullLesson(lid); if (!L) return [];
    const recs = Object.values(recAll).map((x) => x?.[lid]).filter(Boolean) as Rec[], auto = autoCells(S, cls, lid, recs), pick = picksOf(S, cls, lid);
    return cellsOf(L).map((c) => ({ ...c, auto: auto.has(c.id), pick: pick[c.id] ?? null, on: pick[c.id] != null ? !!pick[c.id] : auto.has(c.id) }));
  }
  const sumOf = (lid: string) => { const r = rows(lid); return `${r.filter((x) => x.on).length} / ${r.length}칸${r.some((x) => x.pick != null) ? ' · 직접 바꿈' : ''}`; };
  function flip(lid: string, c: { id: string; on: boolean; auto: boolean }) { const v = !c.on; setPick(S, cls, lid, c.id, v === c.auto ? null : v); ver++; onchange(); } // 자동과 같아지면 직접 칸을 지움
</script>

<Sheet {onclose} tall mainText="닫기">
  {#snippet title()}📊 통계에 넣는 칸{/snippet}
  <div class="sp" data-k="stats-pick">
    <p class="hint">그 반 수업에서 연 칸만 반 통계(한눈에 표 · 반 비교 · 개념별 약점 · 성취기준)에 들어가요. 안 연 칸 = 「— 수업 안 함」. 🎯 허수아비로 한 것은 안 들어가요. 학생 기록은 지워지지 않아요.</p>
    <div class="chips" role="tablist" aria-label="반">{#each CLASSES as c (c)}<button type="button" role="tab" class:on={cls === c} aria-selected={cls === c} data-cls={c} onclick={() => { cls = c; open = ''; }}>{c}반</button>{/each}</div>
    {#each lessons as L (L.id)}
      <div class="ls">
        <button type="button" class="lh" aria-expanded={open === L.id} data-lesson={L.id} onclick={() => (open = open === L.id ? '' : L.id)}><b>{L.no}차시</b><span>{L.title}</span><small>{sumOf(L.id)}</small><i aria-hidden="true">{open === L.id ? '▾' : '▸'}</i></button>
        {#if open === L.id}
          <ul>
            {#each rows(L.id) as c (c.id)}
              <li><button type="button" class="cell" role="switch" aria-checked={c.on} data-cell={c.id} onclick={() => flip(L.id, c)}>
                <span><b>{c.title.split(' · ')[0]}</b><small>{c.pick != null ? '직접 바꿈' : c.auto ? '자동 · 수업에서 엶' : '자동 · 수업에서 안 엶'}</small></span>
                <em class:on={c.on}>{c.on ? '통계에 넣기' : '— 빼기'}</em></button></li>
            {/each}
          </ul>
        {/if}
      </div>
    {:else}<p class="hint">이 반은 아직 수업 기록이 없어요.</p>{/each}
  </div>
</Sheet>

<style>
  .sp { display: flex; flex-direction: column; gap: var(--s2); padding-bottom: var(--s4); }
  .hint { margin: 0; font-size: 13px; color: var(--text-2); line-height: 1.5; }
  .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .chips button { flex: none; min-height: 40px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .chips button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .ls { border-radius: var(--r); background: var(--surface-2); }
  .lh { width: 100%; min-height: 52px; display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3); border: 0; background: none; color: var(--text); text-align: left; font: inherit; }
  .lh b { font-size: 15px; } .lh span { flex: 1; min-width: 0; font-size: 13px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .lh small { font-size: 13px; color: var(--text-3); } .lh i { font-style: normal; color: var(--text-3); }
  ul { list-style: none; margin: 0; padding: 0 var(--s2) var(--s2); display: flex; flex-direction: column; gap: 4px; }
  .cell { width: 100%; min-height: 48px; display: flex; align-items: center; gap: var(--s2); padding: 4px var(--s3); border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface); color: var(--text); text-align: left; font: inherit; }
  .cell[aria-checked='true'] { border-color: var(--ok); }
  .cell span { flex: 1; display: flex; flex-direction: column; } .cell b { font-size: 14px; } .cell small { font-size: 13px; color: var(--text-3); }
  .cell em { font-style: normal; font: 700 13px var(--font); color: var(--text-3); } .cell em.on { color: var(--ok); }
</style>
