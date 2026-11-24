<script lang="ts">
  import type { Room } from '../../model/types';
  import { hidden, LG, ownAt, scores, TEAMS, type Lg } from '../../rest/landgrab';
  import HeroSprite from '../camp/HeroSprite.svelte';
  // 🏁 땅따먹기 · 종합실 (📜 2026-11-24 · mock-teacher): 왼쪽 = 판 전체 · 오른쪽 = 남은 턴 · 다음 이동까지 초 · 팀 점수 막대(많은 순 · 마지막 5턴 「???」) · 학생 이름은 안 띄움
  const { R, f, now }: { R: Room; f: Lg; now: number } = $props();
  const sec = $derived(Math.max(0, Math.ceil((f.to - now) / 1000)));
  const joinN = $derived(Object.keys(((R as unknown as { fv?: Record<string, Record<string, unknown>> }).fv?.[`lg${f.g}_j`]) || {}).length);
  const sc = $derived(f.own ? scores(f) : []);
  const order = $derived(Array.from({ length: f.nTeam }, (_, t) => t).sort((a, b) => (sc[b] ?? 0) - (sc[a] ?? 0)));
  const total = $derived(f.size * f.size);
  const at = $derived.by(() => { const m: Record<string, string[]> = {}; for (const [u, p] of Object.entries(f.pos || {})) (m[`${p[0]},${p[1]}`] ||= []).push(u); return m; });
</script>

<div class="ltv" data-k="lg-tv" data-phase={f.phase}>
  {#if f.phase === 'join'}
    <p class="t">🏁 땅따먹기</p>
    <p class="rule">폰에서 <b>🙋 참가</b> → 4팀으로 나눠요 · 5초마다 한 칸 · 밟은 칸 = 우리 팀 색 · 30번 뒤 칸이 많은 팀 승리</p>
    <p class="big" data-k="lg-tv-join">참가 {joinN}명</p>
    <p class="rule small">선생님 폰 「▶ 출발」</p>
  {:else}
    <div class="board" style:--n={f.size}>
      {#each Array(total) as _, i (i)}{@const x = i % f.size}{@const y = Math.floor(i / f.size)}{@const c = ownAt(f, x, y)}{@const who = at[`${x},${y}`] || []}
        <span class="c" style:background={c >= 0 ? TEAMS[c]!.c : undefined}>{#if (f.stars || []).some((s) => s[0] === x && s[1] === y)}<em class="st">⭐</em>{/if}{#if who.length}<i class="who" style:--tc={TEAMS[f.team[who[0]!] ?? 0]!.c}><HeroSprite id={R.players?.[who[0]!]?.hero ?? 0} scale={0.42} tv />{#if who.length > 1}<b>{who.length}</b>{/if}</i>{/if}</span>
      {/each}
    </div>
    <div class="side">
      <p class="t">🏁 땅따먹기</p>
      <p class="turn" data-k="lg-tv-turn">{f.phase === 'ready' ? `준비 ${sec}초` : f.phase === 'end' ? '🏆 결과' : `남은 ${LG.turns - f.turn + 1}턴 · ${f.phase === 'pick' ? `${sec}초` : '이동'}`}</p>
      <ol class="bars">{#each order as t (t)}<li style:--tc={TEAMS[t]!.c}><b>{f.phase === 'end' ? `${f.rank?.[t]}등 ` : ''}{TEAMS[t]!.n}</b><span class="bar"><i style:width="{hidden(f) ? 0 : ((sc[t] ?? 0) / total) * 100}%"></i></span><em>{hidden(f) ? '???' : `${sc[t] ?? 0}칸`}</em></li>{/each}</ol>
      {#if f.phase === 'end'}<p class="win">{(f.winTeams || []).map((t) => `${TEAMS[t]!.n} 팀`).join(' · ')} 승리!</p>{/if}
      {#if hidden(f)}<p class="rule small">🤫 마지막 {LG.hideLast}턴 · 점수는 끝에 공개</p>{/if}
    </div>
  {/if}
</div>

<style>
  .ltv { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 3cqw; color: #fff; padding: 2cqh 3cqw; }
  .ltv[data-phase='join'] { flex-direction: column; text-align: center; }
  .t { margin: 0; font: 900 4.4cqh var(--font); } .rule { margin: 0; max-width: 70cqw; font: 700 3.6cqh/1.5 var(--font); } .small { font-size: 2.8cqh; opacity: 0.85; }
  .big { margin: 0; font: 900 10cqh var(--font); color: var(--accent); }
  .board { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 0.3cqh; height: min(72cqh, 60cqw); aspect-ratio: 1; margin-top: 6cqh; }
  .c { position: relative; border-radius: 0.6cqh; background: rgba(255, 255, 255, 0.08); display: grid; place-items: center; }
  .st { font-style: normal; font-size: 3.4cqh; filter: drop-shadow(0 0 1cqh #ffd34d); }
  .who { position: absolute; inset: 6%; display: grid; place-items: center; border-radius: 50%; box-shadow: inset 0 0 0 0.5cqh var(--tc); background: rgba(0, 0, 0, 0.35); overflow: hidden; } .who b { position: absolute; right: 0; bottom: 0; font: 900 1.8cqh var(--font); background: #000; border-radius: 0.6cqh; padding: 0 0.4cqh; }
  .side { display: grid; gap: 2cqh; min-width: 30cqw; }
  .turn { margin: 0; font: 900 5cqh var(--font); color: var(--accent); font-variant-numeric: tabular-nums; }
  .bars { margin: 0; padding: 0; list-style: none; display: grid; gap: 1.4cqh; } .bars li { display: grid; grid-template-columns: 9cqw 1fr 8cqw; align-items: center; gap: 1cqw; font: 800 3.4cqh var(--font); }
  .bars b { color: var(--tc); } .bar { height: 3cqh; border-radius: 1cqh; background: rgba(255, 255, 255, 0.12); overflow: hidden; } .bar i { display: block; height: 100%; background: var(--tc); transition: width 0.4s; } .bars em { font-style: normal; text-align: right; }
  .win { margin: 0; font: 900 5cqh var(--font); color: var(--accent); }
</style>
