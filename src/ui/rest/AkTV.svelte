<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Room } from '../../model/types';
  import { AK, rankAk, viewAt, type Ak } from '../../rest/alkkagi';
  import { drawAk, type Dust } from './akDraw';
  // 🥏 알까기 난장판 · 종합실 (📜 2026-11-24 · 시안 v3 alk-tv): 왼쪽 = 판 전체(알마다 이름표 · 👑 1등 · 떨어짐 먼지) · 오른쪽 = 남은 시간 · 순위 5줄 · 떨어뜨림 소식
  const { R, f, now, nameOf, clock }: { R: Room; f: Ak; now: number; nameOf: (u: string) => string; clock: () => number } = $props();
  const joinN = $derived(Object.keys(((R as unknown as { fv?: Record<string, Record<string, unknown>> }).fv?.[`ak${f.g}_j`]) || {}).length);
  const sec = $derived(Math.max(0, Math.ceil((f.to - now) / 1000)));
  const left = $derived(Math.max(0, Math.ceil(AK.playSec - f.gt)));
  const rk = $derived(rankAk(f));
  /** 📜 11/24 알마다 이름표 (번호 · 🤖 뺀 이름) */
  const short = (u: string) => nameOf(u).replace(/^\d+\s*/, '').replace(/^🤖/, '') || '?';
  let dust: Dust[] = []; const seen = new Set<string>();
  const feed = $derived([...(f.ev || [])].filter((e) => e.k === 'fall' && e.by).slice(-4).reverse());
  let cv = $state<HTMLCanvasElement>(), raf = 0;
  const fit = (c: HTMLCanvasElement) => { const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * d), h = Math.round(r.height * d); if (w && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; } };
  function frame() { raf = requestAnimationFrame(frame); const c = cv; if (!c) return; fit(c); const g = c.getContext('2d'); if (!g) return; const v = viewAt(f, clock()); for (const e of v.ev) if (e.k === 'fall' && e.x != null) { const key = `${f.beat}|${e.u}|${e.t}`; if (!seen.has(key)) { seen.add(key); dust.push({ x: e.x, y: e.y ?? 0, t0: performance.now() }); } } dust = dust.filter((d) => performance.now() - d.t0 < 800); drawAk(g, c.width, c.height, f.R, v.st, { crown: f.crown, label: short, ar: f.ar, dpr: Math.min(2, devicePixelRatio || 1), dust, now: performance.now() }); }
  onMount(() => { raf = requestAnimationFrame(frame); });
  onDestroy(() => cancelAnimationFrame(raf));
</script>

<div class="atv" data-k="ak-tv" data-phase={f.phase}>
  {#if f.phase === 'join'}
    <div class="intro">
      <p class="t">🥏 알까기 난장판</p>
      <p class="rule">폰에서 <b>🙋 참가</b> → 내 알을 당겼다 놓아 친구 알을 판 밖으로! · 떨어뜨리기 +3 · 맞히기 +1 · 👑 1등 알 +5 · 150초</p>
      <p class="big" data-k="ak-tv-join">참가 {joinN}명</p>
      <p class="rule small">선생님 폰 「▶ 출발」</p>
    </div>
  {:else}
    <canvas bind:this={cv} class="board" data-k="ak-tv-board"></canvas>
    <div class="side">
      <p class="t">🥏 알까기</p>
      <p class="turn" data-k="ak-tv-time">{f.phase === 'ready' ? `준비 ${sec}초` : f.phase === 'end' ? '🏆 결과' : `남은 ${left}초`}</p>
      <ol class="rank">{#each rk.order.slice(0, 5) as u (u)}<li><b>{f.phase === 'end' ? f.rank?.[u] : rk.rank[u]}등</b><span>{nameOf(u)}{f.crown === u ? ' 👑' : ''}</span><em>{f.sc?.[u] ?? 0}점</em></li>{/each}</ol>
      {#if f.phase === 'play' && feed.length}<ul class="feed">{#each feed as e (e.t + e.u)}{#if e.k === 'fall'}<li>💥 {nameOf(e.by)} → {nameOf(e.u)} <b>+{e.pts}</b></li>{/if}{/each}</ul>{/if}
    </div>
  {/if}
</div>

<style>
  .atv { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 4cqw; padding: 8cqh 4cqw 10cqh; container-type: size; color: #f2f3f5; }
  .intro { display: grid; gap: 2cqh; text-align: center; max-width: 80cqw; }
  .t { margin: 0; font: 900 5cqh var(--font); } .rule { margin: 0; font: 600 2.8cqh/1.5 var(--font); color: #b4b8c2; } .small { font-size: 2.4cqh; }
  .big { margin: 0; font: 900 9cqh var(--font); color: #f5b84a; }
  .board { height: min(80cqh, 56cqw); aspect-ratio: 1; }
  .side { display: grid; gap: 2cqh; min-width: 28cqw; }
  .turn { margin: 0; font: 900 6cqh var(--font); color: #f5b84a; font-variant-numeric: tabular-nums; }
  .rank { margin: 0; padding: 0; list-style: none; display: grid; gap: 1cqh; }
  .rank li { display: grid; grid-template-columns: 6cqh 1fr auto; gap: 1cqw; align-items: center; padding: 1cqh 1.5cqw; border-radius: 1.2cqh; background: rgba(255, 255, 255, 0.06); font: 700 3cqh var(--font); }
  .rank em { font-style: normal; color: #f5b84a; }
  .feed { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.6cqh; font: 600 2.4cqh var(--font); color: #b4b8c2; } .feed b { color: #4cc38a; }
</style>
