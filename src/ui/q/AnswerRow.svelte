<script lang="ts">
  // 🧾 답안 줄 (#108 ①): 소문제(소레이드 = 단계)마다 칸 하나 「① {5, 6}」 · 고른 답이 계속 보임 · 지금 칸 = 금빛 테두리
  //   칸을 누르면 그 소문제로 · 좁으면 답을 … 으로 줄임(누르면 카드에서 전체) · 채점 = 왼쪽부터 뒤집힘(✔ 초록 · ✘ 빨강) · 다 맞히면 줄 전체 금빛 반짝
  export type Cell = { text: string | null; state: 'empty' | 'filled' | 'ok' | 'bad' | 'oldbad' };
  const { cells, cur = -1, flash = false, onpick, label = (i: number) => '①②③④⑤⑥⑦⑧⑨'[i] ?? String(i + 1) }:
    { cells: Cell[]; cur?: number; flash?: boolean; onpick?: (i: number) => void; label?: (i: number) => string } = $props();
</script>

<div class="row" class:flash role="group" aria-label="답안 줄">
  {#each cells as c, i (i)}
    <button type="button" class="cell {c.state}" class:now={i === cur} disabled={!onpick} aria-current={i === cur ? 'step' : undefined}
      aria-label="{label(i)} {c.state === 'ok' ? '맞음 ' : c.state === 'bad' || c.state === 'oldbad' ? '틀림 ' : ''}{c.text ?? '빈 칸'}" onclick={() => onpick?.(i)}>
      <b>{label(i)}</b><span class="tx">{c.text ?? '＿'}</span>{#if c.state === 'ok'}<i class="badge ok" aria-hidden="true">✔</i>{:else if c.state === 'bad' || c.state === 'oldbad'}<i class="badge bad" aria-hidden="true">✘</i>{/if}
    </button>
  {/each}
</div>

<style>
  .row { padding-top: 6px; display: grid; grid-template-columns: repeat(auto-fit, minmax(68px, 1fr)); gap: 6px; border-radius: var(--r); transition: box-shadow var(--t); }
  .row.flash { animation: flash 0.6s ease-out 1; }
  @keyframes flash { 0% { box-shadow: 0 0 0 0 rgba(245, 184, 74, 0); } 40% { box-shadow: 0 0 0 4px var(--accent); } 100% { box-shadow: 0 0 0 0 rgba(245, 184, 74, 0); } }
  .cell { position: relative; overflow: visible; min-height: var(--tap); min-width: 0; display: flex; align-items: center; gap: 2px; padding: 0 6px; border-radius: var(--r-sm); border: 2px solid var(--line); background: var(--surface); color: var(--text); font: 700 var(--fs-small) var(--font); text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .cell:disabled { opacity: 1; box-shadow: none; }
  /* ✔ ✘ 배지 (#110 · 5절 8번 색만으로 뜻 전하지 않음): 오른쪽 위 모서리 · 지름 16 · 흰 기호 · 테두리에 반쯤 걸침 */
  .badge { position: absolute; top: -8px; right: -6px; width: 16px; height: 16px; border-radius: 8px; display: grid; place-items: center; font-style: normal; font-size: 11px; font-weight: 700; line-height: 1; color: #fff; box-shadow: 0 0 0 2px var(--bg); }
  .badge.ok { background: var(--ok); }
  .badge.bad { background: var(--bad); }
  .cell b { color: var(--text-2); flex: none; }
  .tx { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cell.empty .tx { color: var(--text-3); }
  .cell.now { border-color: var(--accent); }
  .cell.ok { border-color: var(--ok); background: color-mix(in srgb, var(--ok) 22%, var(--surface)); animation: flip 0.2s ease-out 1; }
  .cell.bad { border-color: var(--bad); background: color-mix(in srgb, var(--bad) 22%, var(--surface)); animation: flip 0.2s ease-out 1; }
  .cell.oldbad { border-color: var(--bad); }
  .cell.oldbad.now { box-shadow: 0 0 0 2px var(--accent); }
  .cell:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  @keyframes flip { from { transform: rotateX(90deg); } to { transform: rotateX(0); } }
  @media (prefers-reduced-motion: reduce) { .cell.ok, .cell.bad, .row.flash { animation: none; } }
</style>
