<script lang="ts">
  import { untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import { CLASSES, isBeta, setSlot, week } from '../../school/school';
  import { BELLS, DOW, PERIODS } from '../../school/bells';

  // 📅 시간표 스위치를 켰을 때만 (📜 2026-11-13 밤 선생님 「시간표 기능은 시간도 · 시간표도 입력 가능하게」)
  //   🗓 시간표 = 월~금 × 교시 칸 · 누르면 반이 차례로 바뀜(— → 1-1 → … → —) · school/sched
  //   🕘 교시 시각 = 요일마다 몇 교시까지(− ＋) · 교시마다 시작 · 끝 · school/info/bells · periods (⚙ 학교 정보와 같은 칸 · 저장하면 바로 BELLS · PERIODS)
  //   컴시간 연동 없음 · 손으로만
  const { S, seg0 = 'week' }: { S: Store; seg0?: 'week' | 'bell' } = $props();
  let seg = $state<'week' | 'bell'>(untrack(() => seg0));
  const DAYS = [1, 2, 3, 4, 5];
  let ver = $state(0);
  const W = $derived.by(() => { void ver; return week(S); });
  // 교시 시각 · 요일마다 교시 수 (이 화면 사본 → 바꿀 때마다 저장)
  const MAXP = 9;
  let bells = $state<Record<number, [string, string]>>(untrack(() => structuredClone($state.snapshot(BELLS) as Record<number, [string, string]>)));
  let count = $state<Record<number, number>>(untrack(() => Object.fromEntries(DAYS.map((d) => [d, Math.max(0, ...(PERIODS[d] || [0]))]))));
  const maxP = $derived(Math.max(1, ...DAYS.map((d) => count[d] ?? 0)));
  const add = (hm: string, m: number) => { const [h, mm] = hm.split(':').map(Number); const t = Math.max(0, Math.min(24 * 60 - 1, (h ?? 0) * 60 + (mm ?? 0) + m)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const bad = (p: number) => { const b = bells[p]; return !b || !b[0] || !b[1] || b[0] >= b[1] || (p > 1 && bells[p - 1] && bells[p - 1]![1] > b[0]); };
  let saved = $state('');
  function save() {
    const per: Record<number, number[]> = {}, bl: Record<number, [string, string]> = {};
    for (const d of DAYS) per[d] = Array.from({ length: count[d] ?? 0 }, (_, i) => i + 1);
    for (let p = 1; p <= maxP; p++) { if (!bells[p]) bells[p] = [add(bells[p - 1]?.[1] ?? '08:50', 10), add(bells[p - 1]?.[1] ?? '08:50', 60)]; bl[p] = [bells[p]![0], bells[p]![1]]; }
    S.set('school/info/bells', bl); S.set('school/info/periods', per);
    saved = '✔ 저장'; setTimeout(() => (saved = ''), 1200);
  }
  const setCount = (d: number, n: number) => { count[d] = Math.max(0, Math.min(MAXP, n)); save(); };
  const setBell = (p: number, i: 0 | 1, v: string) => { const b = bells[p] ?? ['', '']; b[i] = v; bells[p] = [b[0], b[1]]; save(); };
  function cycle(d: number, p: number) {
    const cur = W[String(d)]?.[String(p)] || '', i = cur ? CLASSES.indexOf(cur) + 1 : 0;
    setSlot(S, d, p, i < CLASSES.length ? (CLASSES[i] as string) : null); ver++;
  }
</script>

<div class="seg2" role="tablist">{#each [['week', '🗓 시간표'], ['bell', '🕘 교시 시각']] as const as [k, t] (k)}<button type="button" role="tab" class:on={seg === k} aria-selected={seg === k} data-k="sched-{k}" onclick={() => (seg = k)}>{t}</button>{/each}</div>
{#if seg === 'week'}
  <div class="sg" role="grid" aria-label="시간표">
    <span></span>{#each DAYS as d (d)}<b>{DOW[d]}</b>{/each}
    {#each Array.from({ length: maxP }, (_, i) => i + 1) as p (p)}
      <b>{p}</b>
      {#each DAYS as d (d)}
        {@const c = W[String(d)]?.[String(p)] || ''}
        <button type="button" class:on={!!c} disabled={p > (count[d] ?? 0)} onclick={() => cycle(d, p)}>{c || '—'}{c && isBeta(S, c) ? '🧪' : ''}</button>
      {/each}
    {/each}
  </div>
  <p class="hint">칸을 누르면 반이 차례로 바뀌어요 · 끝까지 누르면 비움</p>
{:else}
  <p class="lab">요일마다 몇 교시까지 (− ＋) {#if saved}<em>{saved}</em>{/if}</p>
  <div class="days">
    {#each DAYS as d (d)}<div class="dc"><b>{DOW[d]} <span data-k="cnt-{d}">{count[d] ?? 0}</span></b><div class="stp"><button type="button" aria-label="{DOW[d]} 교시 줄이기" onclick={() => setCount(d, (count[d] ?? 0) - 1)}>−</button><button type="button" aria-label="{DOW[d]} 교시 늘리기" onclick={() => setCount(d, (count[d] ?? 0) + 1)}>＋</button></div></div>{/each}
  </div>
  <p class="lab">교시마다 시작 · 끝</p>
  <div class="bl">
    {#each Array.from({ length: maxP }, (_, i) => i + 1) as p (p)}
      <div class="br" class:bad={bad(p)}><b>{p}교시</b>
        <input type="time" aria-label="{p}교시 시작" data-k="bs-{p}" value={bells[p]?.[0] ?? ''} onchange={(e) => setBell(p, 0, e.currentTarget.value)} />
        <span>~</span>
        <input type="time" aria-label="{p}교시 끝" data-k="be-{p}" value={bells[p]?.[1] ?? ''} onchange={(e) => setBell(p, 1, e.currentTarget.value)} />
      </div>
    {/each}
  </div>
  <p class="hint">빨간 줄 = 끝이 시작보다 빠르거나 앞 교시와 겹침 · ⏳ 타임바 = 그 교시 끝</p>
{/if}

<style>
  .seg2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 3px; border-radius: 12px; background: var(--surface-2); }
  .seg2 button { height: 40px; border: 0; border-radius: 10px; background: none; color: var(--text-2); font: 700 14px var(--font); }
  .seg2 button.on { background: var(--surface); color: var(--text); box-shadow: 0 2px 0 var(--press-sh, rgba(0, 0, 0, 0.4)); }
  .sg { display: grid; grid-template-columns: 24px repeat(5, minmax(0, 1fr)); gap: 4px; align-items: center; text-align: center; font-size: 13px; }
  .sg b { color: var(--text-2); }
  .sg button { height: 40px; border-radius: 8px; border: 1px dashed var(--line); background: none; color: var(--text-3); font: 700 13px var(--font); }
  .sg button.on { border: 1px solid var(--accent); background: var(--surface-2); color: var(--text); }
  .sg button:disabled { opacity: 0.25; }
  .lab { margin: 0; font-size: 13px; font-weight: 700; color: var(--text-2); display: flex; justify-content: space-between; }
  .lab em { font-style: normal; color: var(--ok); }
  .hint { margin: 0; font-size: 13px; color: var(--text-3); text-align: center; }
  .days { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
  .dc { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 0; border-radius: 10px; background: var(--surface-2); }
  .dc b { font-size: 14px; } .dc b span { color: var(--accent); font-weight: 900; font-variant-numeric: tabular-nums; }
  .stp { display: flex; align-items: center; gap: 4px; }
  .stp button { width: 26px; height: 36px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--text); font: 700 15px var(--font); padding: 0; }
  .bl { display: flex; flex-direction: column; gap: 4px; }
  .br { display: grid; grid-template-columns: 52px 1fr 14px 1fr; gap: 6px; align-items: center; min-height: 44px; padding: 0 var(--s2); border-radius: 10px; background: var(--surface-2); }
  .br.bad { box-shadow: inset 0 0 0 1px var(--bad); }
  .br b { font-size: 14px; }
  .br span { color: var(--text-3); text-align: center; }
  .br input { min-width: 0; height: 36px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 600 15px var(--font); padding: 0 6px; color-scheme: dark; }
</style>
