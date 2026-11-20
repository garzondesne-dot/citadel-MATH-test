<script lang="ts">
  import Sheet from '../battle/Sheet.svelte';
  import { earnTiles, type EarnKind } from '../../school/earn';
  // 💎 · 📜 얻는 길 (📜 2026-11-20 선생님 · 머리 🔨): 스크롤 없는 한 장 · 맨 위 「지금 n · 오늘 +m」 · 2열 타일 · 빨간 점 = 지금 받을 수 있음 · 타일 누르면 그 물건으로 바로
  const { kind, have, today = 0, dots = {}, off = [], onpick, onclose }:
    { kind: EarnKind; have: number; today?: number; dots?: Record<string, boolean>; /** ⚙ 꺼진 기능 · 체험판에 없는 곳 = 타일 빼기 */ off?: string[]; onpick: (go: string) => void; onclose: () => void } = $props();
  const ic = $derived(kind === 'gem' ? '💎' : '📜');
  const tiles = $derived(earnTiles(kind).filter((t) => !off.includes(t.k)));
</script>

<Sheet {onclose}>
  {#snippet title()}{ic} 얻는 길{/snippet}
  <p class="now" data-k="earn-now"><span class="ic" aria-hidden="true">{ic}</span><b>{have.toLocaleString()}</b><small>{kind === 'gem' ? '마정석' : '서술 조각'}</small>{#if kind === 'gem'}<em class:z={!today}>오늘 +{today}</em>{/if}</p>
  <div class="grid" data-k="earn-{kind}">
    {#each tiles as t (t.k)}
      <button type="button" class="tile" data-earn={t.k} onclick={() => onpick(t.go)}>
        <span class="ti" aria-hidden="true">{t.ic}</span>
        <span class="tx"><b>{t.name}</b><small>{t.how}</small></span>
        <em class="amt">{ic} {t.amt}</em>
        {#if dots[t.k]}<i class="dot" aria-label="지금 받을 수 있어요"></i>{/if}
      </button>
    {/each}
  </div>
</Sheet>

<style>
  .now { margin: 0; display: flex; align-items: baseline; gap: 6px; font-variant-numeric: tabular-nums; }
  .now .ic { font-size: 20px; align-self: center; }
  .now b { font-size: 24px; }
  .now small { font-size: var(--fs-small); color: var(--text-2); }
  .now em { margin-left: auto; font: 700 14px var(--font); font-style: normal; color: var(--ok); }
  .now em.z { color: var(--text-3); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s2); }
  .tile { position: relative; min-height: 84px; display: grid; grid-template-columns: auto 1fr; grid-template-rows: 1fr auto; column-gap: 8px; align-items: center; padding: 8px 10px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font-family: var(--font); text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .tile:active { transform: translateY(2px); box-shadow: none; }
  .ti { grid-row: 1 / 3; font-size: 26px; line-height: 1; }
  .tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .tx b { font-size: 15px; }
  .tx small { font-size: var(--fs-small); line-height: 1.3; color: var(--text-2); }
  .amt { font: 800 14px var(--font); font-style: normal; color: var(--accent); white-space: nowrap; }
  .dot { position: absolute; top: 6px; right: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--bad); box-shadow: 0 0 0 2px var(--surface-2); }
</style>
