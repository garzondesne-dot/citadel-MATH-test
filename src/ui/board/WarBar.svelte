<script lang="ts">
  // ⚔ #51 기사단 토벌 주간 막대 (SERVER-v1.md 5절) — full = 게시판 맨 위(5 기사단 깃발 막대 · 우리 반 강조 · 지난주 왕의 깃발) · line = 캠프 · 종합실 대기 한 줄
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import { daysLeft, KNIGHTS, lastKing, prevWeek, standings, WAR, weekOf } from '../../board/war';
  import { liveValue } from '../room.svelte';
  import { clock } from '../clock.svelte';

  let { S, cls = '', line = false }: { S: Store; cls?: string; line?: boolean } = $props();
  const w0 = untrack(() => weekOf(S.now()));
  const cur = untrack(() => liveValue<{ sum?: Record<string, number> }>(S, `${WAR}/${w0}`)), prev = untrack(() => liveValue<{ done?: { rank?: string[] }; sum?: Record<string, number> }>(S, `${WAR}/${prevWeek(w0)}`)), kn = untrack(() => liveValue<unknown>(S, KNIGHTS));
  onDestroy(() => { cur.stop(); prev.stop(); kn.stop(); });
  const rows = $derived.by(() => { void kn.v.val; return standings(S, w0, cur.v.val?.sum ?? {}); });
  const king = $derived.by(() => { void kn.v.val; return lastKing(S, S.now(), prev.v.val); });
  const top = $derived(Math.max(1, ...rows.map((r) => r.pts)));
  const left = $derived(daysLeft(clock.now || S.now()));
  const mine = $derived(rows.find((r) => r.cls === cls) ?? null);
</script>

{#if line}
  <div class="wl" data-k="war-line">
    {#if king}<span class="k">👑 {king.crest} {king.name}</span>{/if}
    <span>⚔ 남은 {left}일{#if mine} · 우리 반 {mine.crest} {mine.rank}위 · 공적 {mine.pts.toLocaleString()}{/if}</span><!-- #66-2 「⚔ 남은 n일 · 우리 반 n위 · 공적 n」 -->
  </div>
{:else if rows.length}
  <section class="wb" data-k="war-bar" aria-label="기사단 토벌 주간">
    <div class="hd"><b>⚔ 기사단 토벌 주간</b><small>남은 {left}일 · 판을 끝내면 공적이 우리 반에</small></div>
    {#each rows as r (r.cls)}
      <div class="row" class:me={r.cls === cls} data-war={r.cls}>
        <span class="no">{r.rank}</span><span class="cr" aria-hidden="true">{r.crest}</span>
        <span class="nm">{r.name}{#if king?.cls === r.cls}<i class="kg" title="지난주 왕의 기사단">👑</i>{/if}</span>
        <i class="bar"><i style:width="{Math.round((r.pts / top) * 100)}%"></i></i>
        <b class="pt">{r.pts.toLocaleString()}</b>
      </div>
    {/each}
  </section>
{/if}

<style>
  .wb { display: grid; gap: 6px; padding: 12px; border-radius: var(--r, 12px); background: var(--surface, #181b22); }
  .hd { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .hd b { font-size: 16px; } .hd small { font-size: 13px; color: var(--text-2, #b4b8c2); }
  .row { display: grid; grid-template-columns: 18px 22px minmax(0, 1fr) 72px 44px; align-items: center; gap: 6px; min-height: 28px; padding: 0 4px; border-radius: 8px; font-size: 14px; }
  .row.me { background: color-mix(in srgb, var(--accent, #f5b84a) 16%, transparent); outline: 1px solid var(--accent, #f5b84a); }
  .no { color: var(--text-3, #7c8190); font-variant-numeric: tabular-nums; text-align: center; }
  .nm { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .kg { font-style: normal; margin-left: 4px; }
  .bar { display: block; height: 8px; border-radius: 4px; background: var(--surface-2, #222632); overflow: hidden; }
  .bar > i { display: block; height: 100%; background: var(--accent, #f5b84a); transition: width 160ms ease-out; }
  .pt { text-align: right; font-variant-numeric: tabular-nums; }
  .wl { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 13px; color: var(--text-2, #b4b8c2); }
  .wl .k { color: var(--accent, #f5b84a); font-weight: 700; }
</style>
