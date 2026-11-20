<script lang="ts">
  import type { Store } from '../../model/types';
  import { CLASSES, setSlot, week } from '../../school/school';
  import { doneNo, nextNo } from '../../school/progress';
  import { addMin, BELLS, DAYS5, DOW, kst, lessonLen, P7, setBell } from '../../school/bells';
  import { feat, saveOne, schoolInfo } from '../../school/features.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import { hiddenCls } from './flow';
  // 📅 시간표 (📜 2026-11-17 #21 D · DECISIONS 「📅 시간표 화면 정리」): 「시간표 쓰기」 스위치 없음 → 처음 한 번 「📅 시간표 쓰기 시작」 (끄기 = ⚙)
  //   월~금 × 7교시 늘 · 칸 톡 = 고르기 창(반 단추 + ✕ 없음)만 · 고른 값만 저장(톡을 거듭해도 반이 돌아가며 바뀌지 않음) · 교시 단추 톡 = 시종 창(−5 · +5분 · 저장)
  //   수업 길이 = ⚙ 한 곳 · 아래 📚 진도 · 차시 맞추기 그대로
  const { S, now }: { S: Store; now: number } = $props();
  let ver = $state(0);
  const on = $derived.by(() => { void ver; return feat('schedule'); });
  const W = $derived.by(() => { void ver; return week(S); });
  const shown = $derived.by(() => { void schoolInfo.ver; return CLASSES.filter((c) => !hiddenCls(S, c)); });
  const bell = (p: number) => { void schoolInfo.ver; void ver; return BELLS[p]?.[0] ?? addMin('09:00', (p - 1) * 60); };
  const len = $derived.by(() => { void ver; void schoolInfo.ver; return lessonLen(S); });
  const prog = (c: string) => { void ver; return nextNo(S, c); }; // 📚 #25 진행한 최대 차시 + 1 아래로 안 내려감
  const floor = (c: string) => { void ver; return doneNo(S, c) + 1; };
  const nextSlot = (c: string) => { const k = kst(now); for (let d = 0; d < 7; d++) { const dow = ((k.dow - 1 + d) % 7) + 1; for (const p of P7) if (W[String(dow)]?.[String(p)] === c) return `${DOW[dow]} ${p}교시`; } return '시간표 없음'; };
  let cell = $state<{ d: number; p: number } | null>(null);
  let bp = $state(0), bt = $state('');
  function pick(c: string | null) { if (!cell) return; setSlot(S, cell.d, cell.p, c); ver++; cell = null; }
  function openBell(p: number) { bp = p; bt = bell(p); }
  function saveBell() { setBell(S, bp, bt); ver++; bp = 0; }
  const today = $derived(kst(now).dow);
</script>

{#if !on}
  <div class="start" data-k="sched-start-card">
    <b>📅 시간표를 쓰면</b>
    <small>⚔ 수업 탭 맨 위에 오늘 시간표 · 「▶ 바로 열기」 · ⏰ 자동 열기를 쓸 수 있어요</small>
    <button type="button" class="btn" data-k="sched-start" onclick={() => { saveOne(S, 'schedule', true); ver++; }}>📅 시간표 쓰기 시작</button>
  </div>
{:else}
  <p class="lab">🗓 시간표 <small>칸 = 반 고르기 · 교시 = 시작종 · 수업 {len}분</small></p>
  <div class="sg" role="grid" aria-label="시간표" data-k="sched-grid">
    <span></span>{#each DAYS5 as d (d)}<b class:td={d === today}>{DOW[d]}</b>{/each}
    {#each P7 as p (p)}
      <button type="button" class="pb" data-k="bell-{p}" aria-label="{p}교시 시작종 {bell(p)}" onclick={() => openBell(p)}><b>{p}</b><small>{bell(p)}</small></button>
      {#each DAYS5 as d (d)}
        {@const c = W[String(d)]?.[String(p)] || ''}
        <button type="button" class="cl" class:on={!!c} data-cell="{d}-{p}" aria-label="{DOW[d]} {p}교시 {c || '없음'}" onclick={() => (cell = { d, p })}>{c || '—'}</button>
      {/each}
    {/each}
  </div>
  <p class="lab">📚 진도 · 차시 맞추기 <small>반마다 다음 차시 (⭐)</small></p>
  <div class="list">
    {#each shown as c (c)}
      <div class="pg"><b>{c}</b><span>다음 {prog(c)}차시 · <small>{nextSlot(c)}</small></span>
        <button type="button" aria-label="{c} 진도 당기기" disabled={prog(c) <= floor(c)} title={prog(c) <= floor(c) ? `${floor(c) - 1}차시까지 수업함` : ''} onclick={() => { S.set(`school/prog/${c}`, Math.max(floor(c), prog(c) - 1)); ver++; }}>−</button><button type="button" aria-label="{c} 진도 밀기" onclick={() => { S.set(`school/prog/${c}`, prog(c) + 1); ver++; }}>＋</button></div>
    {/each}
  </div>
{/if}

{#if cell}
  <Sheet onclose={() => (cell = null)}>
    {#snippet title()}{DOW[cell!.d]} {cell!.p}교시{/snippet}
    <div class="g4" data-k="cell-pick">
      {#each shown as c (c)}<button type="button" class="pk" class:on={W[String(cell.d)]?.[String(cell.p)] === c} data-pick={c} onclick={() => pick(c)}><b>{c}</b></button>{/each}
      <button type="button" class="pk none" data-pick="none" onclick={() => pick(null)}><b>✕ 없음</b></button>
    </div>
  </Sheet>
{/if}
{#if bp}
  <Sheet onclose={() => (bp = 0)}>
    {#snippet title()}{bp}교시 시작종{/snippet}
    {#snippet act()}<button type="button" class="btn" data-k="bell-save" onclick={saveBell}>저장</button>{/snippet}
    <div class="brow"><button type="button" data-k="bell-m5" onclick={() => (bt = addMin(bt, -5))}>−5분</button><b data-k="bell-v">{bt}</b><button type="button" data-k="bell-p5" onclick={() => (bt = addMin(bt, 5))}>+5분</button></div>
    <p class="hint">끝 = {addMin(bt, len)} (수업 {len}분 · ⚙ 에서 바꿔요)</p>
  </Sheet>
{/if}

<style>
  .start { display: flex; flex-direction: column; gap: 8px; padding: 20px 16px; border-radius: var(--r); background: var(--surface); text-align: center; } .start small { color: var(--text-2); }
  .lab { margin: 14px 0 6px; font-size: 13px; font-weight: 700; color: var(--text-2); } .lab small { font-weight: 500; color: var(--text-3); }
  .sg { display: grid; grid-template-columns: 52px repeat(5, minmax(0, 1fr)); gap: 4px; align-items: center; text-align: center; font-size: 13px; }
  .sg > b { color: var(--text-2); } .sg > b.td { color: var(--accent); }
  .pb { height: 44px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; box-shadow: 0 2px 0 var(--press-sh); } .pb b { font-size: 14px; line-height: 1; } .pb small { font-size: 11px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .cl { height: 44px; border-radius: 8px; border: 1px dashed var(--line); background: none; color: var(--text-3); font: 700 13px var(--font); }
  .cl.on { border: 1px solid var(--accent); background: var(--surface-2); color: var(--text); }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .pg { display: grid; grid-template-columns: 52px minmax(0, 1fr) 44px 44px; gap: 6px; align-items: center; min-height: 48px; padding: 0 0 0 12px; border-radius: var(--r); background: var(--surface); font-size: 13.5px; } .pg small { color: var(--text-2); }
  .pg button { height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 18px var(--font); }
  .g4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .pk { min-height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); box-shadow: 0 3px 0 var(--press-sh); } .pk.on { border: 2px solid var(--accent); } .pk.none { color: var(--bad); }
  .brow { display: grid; grid-template-columns: 80px 1fr 80px; gap: 8px; align-items: center; } .brow b { text-align: center; font-size: 30px; color: var(--accent); font-variant-numeric: tabular-nums; }
  .brow button { height: 52px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 800 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .hint { margin: 0; text-align: center; font-size: 13px; color: var(--text-3); }
</style>
