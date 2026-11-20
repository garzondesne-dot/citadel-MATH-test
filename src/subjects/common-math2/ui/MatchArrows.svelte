<script lang="ts">
  // 🏹 대응 화살표 잇기 (📜 2026-11-20 함수 단원 · SUBJ.formats.match.Widget): 왼쪽 타원 X · 오른쪽 타원 Y
  //   X 원소를 누르고(금빛) → Y 원소를 누르면 화살표 · 같은 화살표를 다시 이으면(또는 화살표를 누르면) 지움 · 개수 안 막음
  //   자리 = 칸 수로 정해짐(재지 않음) → 학생 · 교사 시연 · 리모컨이 같은 모양
  import type { Given, Question } from '../../../model/types';
  import { pairsOf, togglePair } from '../match';
  const { q, value, disabled = false, onchange }: { q: Question; value: Given; disabled?: boolean; onchange: (v: Given) => void } = $props();
  const xs = $derived(q.type === 'match' ? (Array.isArray(q.xs) ? q.xs : Object.values(q.xs || {})).map(String) : []);
  const ys = $derived(q.type === 'match' ? (Array.isArray(q.ys) ? q.ys : Object.values(q.ys || {})).map(String) : []);
  const xn = $derived(q.type === 'match' ? q.xn || 'X' : 'X'), yn = $derived(q.type === 'match' ? q.yn || 'Y' : 'Y');
  const pairs = $derived(pairsOf(value));
  let pick = $state<number | null>(null);
  // 좌표 (viewBox 100 × H) · 줄 높이 14 · 위아래 여백 = 타원 이름 자리
  const ROW = 16, TOP = 12, BOT = 6, LX = 24, RX = 76;
  const rows = $derived(Math.max(xs.length, ys.length, 2));
  const H = $derived(TOP + rows * ROW + BOT);
  const yAt = (k: number, n: number) => TOP + ((rows * ROW) / n) * (k + 0.5);
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  function tapX(k: number) { if (disabled) return; pick = pick === k ? null : k; }
  function tapY(k: number) { if (disabled || pick == null) return; onchange(togglePair(value, pick, k)); pick = null; }
  const drop = (a: number, b: number) => { if (!disabled) onchange(togglePair(value, a, b)); };
  const used = (k: number) => pairs.some(([a]) => a === k), hit = (k: number) => pairs.some(([, b]) => b === k);
</script>

<div class="ma" style:aspect-ratio="100 / {H}" data-k="match">
  <svg viewBox="0 0 100 {H}" aria-hidden="true">
    <defs><marker id="ma-h" viewBox="0 0 6 6" refX="5.4" refY="3" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--accent)" /></marker></defs>
    <ellipse class="ov" cx={LX} cy={TOP + (rows * ROW) / 2} rx="19" ry={(rows * ROW) / 2 + 3} />
    <ellipse class="ov" cx={RX} cy={TOP + (rows * ROW) / 2} rx="19" ry={(rows * ROW) / 2 + 3} />
    <text x={LX} y="6.5" text-anchor="middle" class="nm">{xn}</text><text x={RX} y="6.5" text-anchor="middle" class="nm">{yn}</text>
    {#each pairs as [a, b] (`${a}-${b}`)}
      {#if a < xs.length && b < ys.length}
        <line class="ar" x1={LX + 8} y1={yAt(a, xs.length)} x2={RX - 8.5} y2={yAt(b, ys.length)} marker-end="url(#ma-h)" />
      {/if}
    {/each}
  </svg>
  <!-- 화살표 누르기 = 지움 (굵은 투명 줄) -->
  <svg class="hitl" viewBox="0 0 100 {H}" aria-hidden="true">
    {#each pairs as [a, b] (`h${a}-${b}`)}
      {#if a < xs.length && b < ys.length}<line role="presentation" x1={LX + 8} y1={yAt(a, xs.length)} x2={RX - 8.5} y2={yAt(b, ys.length)} onclick={() => drop(a, b)} />{/if}
    {/each}
  </svg>
  {#each xs as x, k (k)}
    <button type="button" class="el" class:on={pick === k} class:used={used(k)} style:left={pct(LX, 100)} style:top={pct(yAt(k, xs.length), H)} {disabled} aria-pressed={pick === k} aria-label="{xn}의 {x}" onclick={() => tapX(k)}>{x}</button>
  {/each}
  {#each ys as y, k (k)}
    <button type="button" class="el" class:ready={pick != null} class:used={hit(k)} style:left={pct(RX, 100)} style:top={pct(yAt(k, ys.length), H)} disabled={disabled || pick == null} aria-label="{yn}의 {y}" onclick={() => tapY(k)}>{y}</button>
  {/each}
</div>
<p class="tip" aria-live="polite">{#if disabled}&nbsp;{:else if pick != null}<b>{xs[pick]}</b> → {yn} 원소를 눌러요 (같은 것을 다시 이으면 지워져요){:else if pairs.length}화살표를 누르면 지워져요 · {pairs.length}개{:else}{xn} 원소를 먼저 누르고 {yn} 원소를 눌러요{/if}</p>

<style>
  .ma { position: relative; width: 100%; max-width: 360px; margin: 0 auto; color: var(--text); }
  .ma svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .ma svg.hitl { pointer-events: none; }
  .hitl line { stroke: transparent; stroke-width: 7; pointer-events: stroke; cursor: pointer; }
  .ov { fill: none; stroke: var(--line); stroke-width: 0.8; }
  .nm { fill: var(--text-2); font: italic 700 6px var(--font); }
  .ar { stroke: var(--accent); stroke-width: 1.1; color: var(--accent); }
  .el { position: absolute; transform: translate(-50%, -50%); min-width: 48px; min-height: 44px; padding: 0 8px; border-radius: 22px; border: 2px solid var(--surface-2); background: var(--surface-2); color: var(--text); font: 700 17px var(--font); box-shadow: 0 3px 0 var(--press-sh); white-space: nowrap; }
  .el.used { border-color: var(--accent); }
  .el.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); box-shadow: 0 3px 0 var(--accent-sh); }
  .el.ready:not(:disabled) { border-style: dashed; border-color: var(--accent); }
  .el:disabled { opacity: 1; }
  .el:active:not(:disabled) { transform: translate(-50%, calc(-50% + 2px)); box-shadow: none; }
  .tip { margin: var(--s1) 0 0; min-height: 20px; text-align: center; font-size: var(--fs-small); color: var(--text-2); }
</style>
