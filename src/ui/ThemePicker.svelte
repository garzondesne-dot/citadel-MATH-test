<script lang="ts">
  import { lockOf, savedPaper, setPaper, THEMES, type Feats, type Theme } from '../theme/theme';
  import { setSubmit, submit } from './submit.svelte';
  // 🎨 테마 고르기 (#144): 11칸 · 고른 것 ✓ · 잠긴 테마 = 흐림 + 조건 한 줄(진행 n / m) · feats = null 이면 모두 열림(교사 폰)
  const { now, feats, onpick, paper = false, sub = false }: { now: Theme; feats: Feats | null; onpick: (t: Theme) => void; /** 📜 문제 칸만 양피지 칸 보이기 (학생 · 교사 폰) */ paper?: boolean; /** 📝 제출 모드 v2 칸 (학생 캠프만 · 테마처럼 고름 · 2026-11-14) */ sub?: boolean } = $props();
  let qp = $state(savedPaper());
</script>

<div class="tgrid" role="group" aria-label="테마">
  {#each THEMES as d (d.id)}
    {@const L = lockOf(d, feats)}
    {@const on = now === d.id && !(sub && submit.on)}
    <button type="button" class="th" data-th={d.id} class:on aria-pressed={on} disabled={!L.open} onclick={() => { if (sub) setSubmit(false); onpick(d.id); }}>
      <span class="sw" aria-hidden="true"><i></i><i></i><i></i></span>
      <b>{d.ic} {d.name}{#if on} ✓{/if}</b>
      {#if !L.open && d.need}<small>🔒 {d.need.text}{L.have != null ? ` · ${Math.min(L.have, d.need.n)} / ${d.need.n}` : ' · 기능이 열리면'}</small>{/if}
    </button>
  {/each}
  {#if sub}<button type="button" class="th" data-th="submit" data-k="th-submit" class:on={submit.on} aria-pressed={submit.on} onclick={() => setSubmit(true)}>
    <span class="sw" aria-hidden="true"><i></i><i></i><i></i></span>
    <b>제출{#if submit.on} ✓{/if}</b><small>학습지 꼴 · 글자만</small>
  </button>{/if}
</div>
{#if paper}<button type="button" class="qp" role="switch" aria-checked={qp} data-k="qpaper" onclick={() => { qp = !qp; setPaper(qp); }}><span class="pv" aria-hidden="true"></span><span class="tx"><b>📜 문제 칸만 양피지</b><small>어느 테마든 문제 카드만 양피지 바탕 · 진한 글씨</small></span><i class="sw2" class:on={qp}></i></button>{/if}

<style>
  .qp { margin-top: 8px; width: 100%; min-height: 56px; display: flex; align-items: center; gap: 10px; padding: 6px 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: inherit; text-align: left; }
  .qp .pv { flex: none; width: 34px; height: 34px; border-radius: 6px; border: 2px solid #5a4024; background: #f2e6c9 url('/art/ui/ui-paper-v1.webp') center / 100% 100%; }
  .qp .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; } .qp b { font-size: 14px; } .qp small { font-size: 12px; color: var(--text-2); }
  .sw2 { flex: none; width: 44px; height: 26px; border-radius: 13px; background: var(--line); position: relative; } .sw2::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left 0.15s; } .sw2.on { background: var(--ok); } .sw2.on::after { left: 21px; }
  .tgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .th { min-height: 56px; padding: 6px 10px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 3px; text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .th.on { border: 2px solid var(--accent); }
  .th:disabled { opacity: 0.5; box-shadow: none; }
  .th:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .th small { font-size: 11.5px; font-weight: 500; color: var(--text-2); line-height: 1.3; }
  .sw { display: flex; gap: 3px; } .sw i { width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(128, 128, 128, 0.4); }
  /* 견본 색 = 그 테마의 바탕 · 판 · 강조 */
  [data-th='gold'] .sw i:nth-child(1) { background: #0f1115; } [data-th='gold'] .sw i:nth-child(2) { background: #222632; } [data-th='gold'] .sw i:nth-child(3) { background: #f5b84a; }
  [data-th='navy'] .sw i:nth-child(1) { background: #0d1530; } [data-th='navy'] .sw i:nth-child(2) { background: #15224a; } [data-th='navy'] .sw i:nth-child(3) { background: #f2c14e; }
  [data-th='classic'] .sw i:nth-child(1) { background: #14110f; } [data-th='classic'] .sw i:nth-child(2) { background: #2b241e; } [data-th='classic'] .sw i:nth-child(3) { background: #ebb84f; }
  [data-th='cloud'] .sw i:nth-child(1) { background: #eef1f6; } [data-th='cloud'] .sw i:nth-child(2) { background: #fff; } [data-th='cloud'] .sw i:nth-child(3) { background: #e9a23b; }
  [data-th='lava'] .sw i:nth-child(1) { background: #140f0d; } [data-th='lava'] .sw i:nth-child(2) { background: #2b211b; } [data-th='lava'] .sw i:nth-child(3) { background: #ff8f3f; }
  [data-th='star'] .sw i:nth-child(1) { background: #0c1020; } [data-th='star'] .sw i:nth-child(2) { background: #1e2640; } [data-th='star'] .sw i:nth-child(3) { background: #e6ebf5; }
  [data-th='sakura'] .sw i:nth-child(1) { background: #140d12; } [data-th='sakura'] .sw i:nth-child(2) { background: #2b1e27; } [data-th='sakura'] .sw i:nth-child(3) { background: #ff9ec7; }
  [data-th='sand'] .sw i:nth-child(1) { background: #15120c; } [data-th='sand'] .sw i:nth-child(2) { background: #2c261b; } [data-th='sand'] .sw i:nth-child(3) { background: #e9d8a6; }
  [data-th='deep'] .sw i:nth-child(1) { background: #08131a; } [data-th='deep'] .sw i:nth-child(2) { background: #172a35; } [data-th='deep'] .sw i:nth-child(3) { background: #ffe066; }
  [data-th='porcelain'] .sw i:nth-child(1) { background: #f6f4ef; } [data-th='porcelain'] .sw i:nth-child(2) { background: #ece8de; } [data-th='porcelain'] .sw i:nth-child(3) { background: #1f2a44; }
  [data-th='parchment'] .sw i:nth-child(1) { background: #efe2c4; } [data-th='parchment'] .sw i:nth-child(2) { background: #e7d5ad; } [data-th='parchment'] .sw i:nth-child(3) { background: #7a4a10; }
  [data-th='submit'] .sw i:nth-child(1) { background: #f7f6f1; } [data-th='submit'] .sw i:nth-child(2) { background: #fff; } [data-th='submit'] .sw i:nth-child(3) { background: #1f3a68; }
</style>
