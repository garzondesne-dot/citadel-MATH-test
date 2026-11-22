<script lang="ts">
  // ⚔ #51 기사단 토벌 주간 막대 (SERVER-v1.md 5절) — full = 게시판 맨 위(5 기사단 깃발 막대 · 우리 반 강조 · 지난주 왕의 깃발) · line = 캠프 · 종합실 대기 한 줄
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import { daysLeft, KNIGHTS, lastKing, minsLeft, prevWeek, standings, WAR, weekOf } from '../../board/war';
  import { liveValue } from '../room.svelte';
  import { clock } from '../clock.svelte';
  import { flagBg, flagOf, KNIGHT_FLAG } from '../manifest';

  let { S, cls = '', line = false, test = false }: { S: Store; cls?: string; line?: boolean; /** 🧪 #86 테스트 계정 = 「테스트 · 공적 안 쌓임」 */ test?: boolean } = $props();
  const w0 = untrack(() => weekOf(S.now()));
  const cur = untrack(() => liveValue<{ sum?: Record<string, number> }>(S, `${WAR}/${w0}`)), prev = untrack(() => liveValue<{ done?: { rank?: string[] }; sum?: Record<string, number> }>(S, `${WAR}/${prevWeek(w0)}`)), kn = untrack(() => liveValue<unknown>(S, KNIGHTS));
  onDestroy(() => { cur.stop(); prev.stop(); kn.stop(); });
  const rows = $derived.by(() => { void kn.v.val; return standings(S, w0, cur.v.val?.sum ?? {}); });
  const king = $derived.by(() => { void kn.v.val; return lastKing(S, S.now(), prev.v.val); });
  const top = $derived(Math.max(1, ...rows.map((r) => r.pts)));
  const left = $derived(daysLeft(clock.now || S.now()));
  const mine = $derived(rows.find((r) => r.cls === cls) ?? null);
  // 🏆 📜 #77 순위표 꼴: 1 ~ 3위 = 🥇🥈🥉 · 4위부터 숫자 · 모두 0점(공동) = 「–」(반 번호 순) · 이름 옆 반 · 우리 반 = 「우리 반」
  const allZero = $derived(rows.every((r) => r.pts <= 0));
  const rankT = (n: number) => (allZero ? '–' : (['🥇', '🥈', '🥉'][n - 1] ?? String(n)));
  // 📜 #70 공통 문구 (STORY-LINES-v1 3절): 남은 날 · 마지막 날 · 1시간 안 · 바로 위 기사단까지 · 선두 · 왕의 깃발
  const mins = $derived(minsLeft(clock.now || S.now()));
  const leftT = $derived(mins <= 60 ? `⚔ 마감까지 ${Math.max(1, mins)}분 · 마지막 한 판!` : left <= 1 ? '⚔ 토벌 주간 · 오늘이 마지막 날!' : `⚔ 토벌 주간 · 남은 ${left}일`);
  const above = $derived(mine && mine.rank > 1 ? [...rows].reverse().find((r) => r.pts > mine.pts) ?? null : null);
  const gapT = $derived(!mine ? '' : above ? `🚩 ${above.name}까지 ${(above.pts - mine.pts).toLocaleString()} 공적 남았다` : mine.pts > 0 ? '🚩 우리 기사단이 선두에 섰다!' : '');
  const kingT = $derived(!king ? '' : king.cls === cls ? `👑 왕의 깃발이 ${king.name}에게 왔다!` : `👑 이번 주 왕의 깃발은 ${king.name}에게`);
</script>

{#if line}
  <div class="wl" data-k="war-line">
    {#if king}<span class="k">👑 {king.crest} {king.name}</span>{/if}
    <span>{leftT}{#if mine}{#if allZero} · 공적 0{:else} · 우리 반 {mine.crest} {mine.rank}위 · 공적 {mine.pts.toLocaleString()}{/if}{/if}</span><!-- #66-2 · #70 -->
  </div>
{:else if rows.length}
  <section class="wb" data-k="war-bar" aria-label="기사단 토벌 주간">
    <div class="hd"><b>⚔ 기사단 토벌 주간</b><small>{leftT.replace('⚔ 토벌 주간 · ', '')}</small></div>
    {#if test}<p class="tst" data-k="war-test">🧪 테스트 · 공적 안 쌓임</p>{/if}
    {#if kingT}<p class="ln k" data-k="war-king"><span class="fl kf" aria-hidden="true" style={flagBg(KNIGHT_FLAG.king)}></span>{kingT}</p>{/if}
    {#if gapT}<p class="ln" data-k="war-gap">{gapT}</p>{/if}
    {#each rows as r (r.cls)}
      <div class="row" class:me={r.cls === cls} data-war={r.cls}>
        <span class="no" aria-label={allZero ? '순위 없음' : `${r.rank}위`}>{rankT(r.rank)}</span><span class="cr fl" aria-hidden="true" style={flagBg(flagOf(r.crest))}>{#if flagOf(r.crest) === KNIGHT_FLAG.blank}<i>{r.crest}</i>{/if}</span>
        <span class="nm">{r.name} <small>· {r.cls}반</small>{#if king?.cls === r.cls}<i class="kg" title="지난주 왕의 기사단">👑</i>{/if}{#if r.cls === cls}<em class="us">우리 반</em>{/if}</span>
        <i class="bar"><i style:width="{Math.round((r.pts / top) * 100)}%"></i></i>
        <b class="pt">{r.pts.toLocaleString()}</b>
      </div>
    {/each}
  </section>
{/if}

<style>
  .tst { margin: 4px 0 0; color: var(--text-2); font: 600 14px var(--font); }
  .wb { display: grid; gap: 6px; padding: 12px; border-radius: var(--r, 12px); background: var(--surface, #181b22); }
  .hd { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .hd b { font-size: 16px; } .hd small { font-size: 13px; color: var(--text-2, #b4b8c2); }
  .row { display: grid; grid-template-columns: 24px 24px minmax(0, 1fr) 64px 44px; align-items: center; gap: 6px; min-height: 36px; padding: 0 4px; border-radius: 8px; font-size: 14px; }
  .row.me { background: color-mix(in srgb, var(--accent, #f5b84a) 16%, transparent); outline: 1px solid var(--accent, #f5b84a); }
  .no { color: var(--text-3, #7c8190); font-variant-numeric: tabular-nums; text-align: center; }
  .nm { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .kg { font-style: normal; margin-left: 4px; }
  .nm small { font-size: 13px; color: var(--text-3, #7c8190); } .us { margin-left: 6px; padding: 0 6px; border-radius: 6px; background: var(--accent, #f5b84a); color: var(--on-accent, #1d1406); font: 700 12px var(--font); font-style: normal; }
  .row.me { outline-width: 2px; }
  .bar { display: block; height: 8px; border-radius: 4px; background: var(--surface-2, #222632); overflow: hidden; }
  .bar > i { display: block; height: 100%; background: var(--accent, #f5b84a); transition: width 160ms ease-out; }
  .fl { display: inline-grid; place-items: center; width: 24px; height: 32px; background-repeat: no-repeat; image-rendering: pixelated; } .fl i { font-style: normal; font-size: 12px; margin-top: 4px; }
  .ln.k { display: flex; align-items: center; gap: 6px; } .kf { flex: none; width: 27px; height: 36px; }
  .pt { text-align: right; font-variant-numeric: tabular-nums; }
  .ln { margin: 0; font-size: 14px; color: var(--text-2, #b4b8c2); } .ln.k { color: var(--accent, #f5b84a); font-weight: 700; }
  .wl { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 13px; color: var(--text-2, #b4b8c2); }
  .wl .k { color: var(--accent, #f5b84a); font-weight: 700; }
</style>
