<script lang="ts">
  import type { Store } from '../../model/types';
  import { CLASSES, isBeta, lastClass, week } from '../../school/school';
  import { DOW, kst, PERIODS } from '../../school/bells';
  import { feat } from '../../school/features.svelte';
  import SchedEdit from './SchedEdit.svelte';
  // 📅 시간표 · 진도 맞추기 (📜 2026-11-16 DECISIONS 「📋 교사 준비 탭 2개」 · 옛 준비 탭 「시간표」를 👥 반 · 시간표 안으로 · 기능 · 저장 그대로 · 자리만)
  const { S, now }: { S: Store; now: number } = $props();
  let ver = $state(0);
  const W = $derived.by(() => { void ver; return week(S); });
  const prog = (c: string) => { void ver; return Number(S.get<number>(`school/prog/${c}`)) || (lastClass(S, c)?.no ?? 0) + 1; };
  const nextSlot = (c: string) => { const k = kst(now); for (let d = 0; d < 7; d++) { const dow = ((k.dow - 1 + d) % 7) + 1; for (const p of PERIODS[dow] || []) if (W[String(dow)]?.[String(p)] === c) return `${DOW[dow]} ${p}교시`; } return '시간표 없음'; };
</script>

{#if feat('schedule')}
  <SchedEdit {S} />
  <p class="lab">진도 맞추기 · 반마다 다음 차시</p>
  <div class="list">
    {#each CLASSES as c (c)}
      <div class="pg"><b>{c}{isBeta(S, c) ? ' 🧪' : ''}</b><span>다음 {prog(c)}차시 · <small>{nextSlot(c)}</small></span>
        <button type="button" aria-label="{c} 진도 당기기" onclick={() => { S.set(`school/prog/${c}`, Math.max(1, prog(c) - 1)); ver++; }}>−</button><button type="button" aria-label="{c} 진도 밀기" onclick={() => { S.set(`school/prog/${c}`, prog(c) + 1); ver++; }}>＋</button></div>
    {/each}
  </div>
{:else}
  <div class="off" data-k="sched-off"><b>📅 시간표가 꺼져 있어요</b><small>「나」 → ⚙ 우리 학교 기능 → ⚙ 자세히 → 📅 시간표 · 교시 시각을 켜면 여기서 시간표와 진도를 맞춰요</small></div>
{/if}

<style>
  .lab { margin: 14px 0 6px; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .pg { display: grid; grid-template-columns: 60px minmax(0, 1fr) 44px 44px; gap: 6px; align-items: center; min-height: 48px; padding: 0 0 0 12px; border-radius: var(--r); background: var(--surface); font-size: 13.5px; }
  .pg small { color: var(--text-2); }
  .pg button { height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 18px var(--font); }
  .off { display: flex; flex-direction: column; gap: 4px; padding: 16px; border-radius: var(--r); background: var(--surface); } .off small { color: var(--text-2); }
</style>
