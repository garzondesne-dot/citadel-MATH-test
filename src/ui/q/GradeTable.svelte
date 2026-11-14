<script lang="ts">
  import { paperOn } from '../submit.svelte';
  // 🧾 채점표 (#113 · 시안 ⑩ v2): 공격하면 가로 답안 칸 → 세로 표 · 소문제마다 한 줄 = 번호 · 문제(짧게 · 넘치면 …) · 내 답 전체(자르지 않음 · 줄바꿈) · ✔/✘ 원 배지
  //   still = 다시 그릴 때 뒤집힘 없음(결과 화면) · wait = 아직 안 뒤집힘 · ok / bad = 뒤집힌 결과 · 다 맞히면 표 금빛 · 줄을 누르면 그 소문제로(✘ 줄만 · onpick 이 있을 때)
  export type GRow = { q: string; a: string | null; state: 'wait' | 'ok' | 'bad' | 'keep' };
  //   keep = 재도전 때 지난번 ✔ 줄(다시 안 뒤집힘 · 처음부터 초록)
  const { rows, gold = false, still = false, onpick, label = (i: number) => '①②③④⑤⑥⑦⑧⑨'[i] ?? String(i + 1) }:
    { rows: GRow[]; gold?: boolean; still?: boolean; onpick?: (i: number) => void; label?: (i: number) => string } = $props();
</script>

{#if paperOn() && rows.length && rows.every((r) => r.state !== 'wait')}<p class="pmark" data-k="pscore"><span class="pscore">{rows.filter((r) => r.state === 'ok' || r.state === 'keep').length} / {rows.length}</span></p>{/if}
<div class="gt" class:gold class:still role="list" aria-label="채점표">
  {#each rows as r, i (i)}
    {@const pick = !!onpick && r.state === 'bad'}
    <svelte:element this={pick ? 'button' : 'div'} type={pick ? 'button' : undefined} role={pick ? undefined : 'listitem'} class="r g-{r.state}" onclick={pick ? () => onpick?.(i) : undefined}
      aria-label="{label(i)} {r.q} · 내 답 {r.a ?? '빈 칸'}{r.state === 'ok' || r.state === 'keep' ? ' · 맞음' : r.state === 'bad' ? ' · 틀림' : ''}">
      <span class="n">{label(i)}</span><span class="q">{r.q}</span><span class="a">{r.a ?? '＿'}</span>
      <span class="m" aria-hidden="true">{r.state === 'ok' || r.state === 'keep' ? '✔' : r.state === 'bad' ? '✘' : ''}</span>
    </svelte:element>
  {/each}
</div>

<style>
  .pmark { margin: 4px 0 0; text-align: right; }
  .gt { padding-top: 6px; display: flex; flex-direction: column; gap: 6px; perspective: 500px; }
  .r { box-sizing: border-box; display: grid; grid-template-columns: 22px minmax(56px, 1fr) auto 22px; align-items: center; gap: 8px; min-height: var(--tap); padding: 4px 10px; border-radius: var(--r-sm); border: 2px solid var(--line); background: var(--surface-2); color: var(--text); font: inherit; text-align: left; width: 100%; }
  .n { font-size: var(--fs-small); color: var(--text-3); font-weight: 700; }
  .q { font-size: var(--fs-small); color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .a { font-size: 16px; font-weight: 700; justify-self: end; text-align: right; overflow-wrap: anywhere; max-width: 100%; }
  .m { width: 22px; height: 22px; border-radius: 11px; display: grid; place-items: center; font-size: 13px; font-weight: 700; color: #fff; }
  .g-ok { border-color: var(--ok); background: color-mix(in srgb, var(--ok) 22%, var(--surface)); animation: flip 0.25s ease-out 1; }
  .g-ok .m, .g-keep .m { background: var(--ok); }
  .g-keep { border-color: var(--ok); background: color-mix(in srgb, var(--ok) 22%, var(--surface)); }
  .g-bad { border-color: var(--bad); background: color-mix(in srgb, var(--bad) 22%, var(--surface)); animation: flip 0.25s ease-out 1; }
  .g-bad .m { background: var(--bad); }
  button.r { cursor: pointer; }
  .gt.gold .r { border-color: var(--accent); }
  @keyframes flip { 0% { transform: rotateX(90deg); } 100% { transform: rotateX(0); } }
  .still .r { animation: none; }
  @media (prefers-reduced-motion: reduce) { .g-ok, .g-bad { animation: none; } }
</style>
