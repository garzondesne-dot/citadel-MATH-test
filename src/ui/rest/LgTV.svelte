<script lang="ts">
  import type { Room } from '../../model/types';
  import { fxCells, fxLine, hidden, LG, ownAt, scores, TEAMS, type Lg } from '../../rest/landgrab';
  import { isLgBot, lgBotHero, lgBotName } from '../../rest/landgrab';
  import { sfx } from '../sound.svelte';
  import { artUrl, LG_ART, lgTilePos } from '../manifest';
  import HeroSprite from '../camp/HeroSprite.svelte';
  // 🏁 땅따먹기 · 종합실 (📜 2026-11-24 · mock-teacher): 왼쪽 = 판 전체 · 오른쪽 = 남은 턴 · 다음 이동까지 초 · 팀 점수 막대(많은 순 · 마지막 5턴 「???」)
  //   📜 11/24 🔨 #18 「연출만 세게」(규칙 그대로): 정사각 격자 · 용사 이름표 · 위 해설 한 줄 · ⚔ 충돌 불꽃 + 튕김 + 흔들림 + 쾅 · 뺏은 칸 반짝 · ⭐ 9칸 파도 + 큰 소리
  const { R, f, now, nameOf = (u: string) => u }: { R: Room; f: Lg; now: number; nameOf?: (u: string) => string } = $props();
  const short = (u: string) => (isLgBot(u) ? lgBotName(u) : nameOf(u).replace(/^\d+\s*/, '').replace(/^🤖/, '') || '?');
  const fx = $derived(f.fx && f.phase !== 'end' ? f.fx : null);
  const fxKey = $derived(fx ? `${f.g}|${fx.t}` : '');
  const flash = $derived(fxCells(fx));
  const bumpAt = $derived(new Set((fx?.bump || []).map((b) => `${b[0]},${b[1]}`)));
  let heard = '';
  $effect(() => { const k = fxKey; if (!k || k === heard) return; heard = k; if (fx?.star.length) sfx('star-bonus', 0.9); else if (fx?.bump.length) sfx('smash', 0.75); });
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
    <div class="left">
      <p class="cast" data-k="lg-tv-cast">{#key fxKey}<span>{fxLine(f)}</span>{/key}</p>
      {#key fxKey}<div class="board" class:shake={!!fx?.bump.length} style:--n={f.size} data-k="lg-tv-board">
        {#each Array(total) as _, i (i)}{@const x = i % f.size}{@const y = Math.floor(i / f.size)}{@const c = ownAt(f, x, y)}{@const who = at[`${x},${y}`] || []}{@const fl = flash[`${x},${y}`]}{@const bu = who.length ? fx?.bu[who[0]!] : undefined}
          {@const isStar = (f.stars || []).some((s) => s[0] === x && s[1] === y)}<span class="c {fl ?? ''}" style:background-image="url({artUrl(LG_ART.tiles)})" style:background-position={lgTilePos(c, isStar)}>{#if bumpAt.has(`${x},${y}`)}<em class="bang" data-k="lg-bang">💥</em>{/if}{#if who.length}<i class="who" class:bu={!!bu} style:--bx={bu ? bu[0] : 0} style:--by={bu ? bu[1] : 0} style:--tc={TEAMS[f.team[who[0]!] ?? 0]!.c}><span class="hs"><HeroSprite id={isLgBot(who[0]!) ? lgBotHero(who[0]!) : (R.players?.[who[0]!]?.hero ?? 0)} scale={0.42} tv /></span><b class="nm" data-k="lg-name">{short(who[0]!)}{who.length > 1 ? ` +${who.length - 1}` : ''}</b></i>{/if}</span>
        {/each}
      </div>{/key}
    </div>
    <div class="side">
      <p class="t">🏁 땅따먹기</p>
      <p class="turn" data-k="lg-tv-turn">{f.phase === 'ready' ? `준비 ${sec}초` : f.phase === 'end' ? '🏆 결과' : `남은 ${LG.turns - f.turn + 1}턴 · ${f.phase === 'pick' ? `${sec}초` : '이동'}`}</p>
      <ol class="bars">{#each order as t (t)}<li style:--tc={TEAMS[t]!.c}><b><img class="flag" src={artUrl(LG_ART.flags[t]!)} alt="" />{f.phase === 'end' ? `${f.rank?.[t]}등 ` : ''}{TEAMS[t]!.n}</b><span class="bar"><i style:width="{hidden(f) ? 0 : ((sc[t] ?? 0) / total) * 100}%"></i></span><em>{hidden(f) ? '???' : `${sc[t] ?? 0}칸`}</em></li>{/each}</ol>
      {#if f.phase === 'end'}<p class="win">{(f.winTeams || []).map((t) => `${TEAMS[t]!.n} 팀`).join(' · ')} 승리!</p>{/if}
      {#if hidden(f)}<p class="rule small">🤫 마지막 {LG.hideLast}턴 · 점수는 끝에 공개</p>{/if}
    </div>
  {/if}
</div>

<style>
  .ltv { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 3cqw; color: #fff; padding: 2cqh 3cqw; container-type: size; }
  .ltv[data-phase='join'] { flex-direction: column; text-align: center; }
  .t { margin: 0; font: 900 4.4cqh var(--font); } .rule { margin: 0; max-width: 70cqw; font: 700 3.6cqh/1.5 var(--font); } .small { font-size: 2.8cqh; opacity: 0.85; }
  .big { margin: 0; font: 900 10cqh var(--font); color: var(--accent); }
  /* 🔨 #18 ⑥ 정사각 격자: 칸 = minmax(0, 1fr) (그림 크기에 안 밀림) · 판 = 해설 줄 · 아래 놀이 막대만 빼고 높이 꽉 */
  .left { display: flex; flex-direction: column; align-items: center; gap: 1.2cqh; margin-bottom: 9cqh; }
  .cast { margin: 0; height: 5.4cqh; display: grid; place-items: center; font: 900 3.6cqh var(--font); white-space: nowrap; text-shadow: 0 0.3cqh 0 #000; }
  .cast span { animation: castIn 0.35s ease-out; } @keyframes castIn { from { transform: scale(1.25); opacity: 0; } to { transform: none; opacity: 1; } }
  .board { --sz: min(78cqh, 60cqw); width: var(--sz); height: var(--sz); display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); grid-template-rows: repeat(var(--n), minmax(0, 1fr)); gap: 0.3cqh; }
  .board.shake { animation: lgShake 0.32s linear; } @keyframes lgShake { 20% { transform: translate(-0.8cqh, 0.4cqh); } 40% { transform: translate(0.8cqh, -0.4cqh); } 60% { transform: translate(-0.5cqh, -0.3cqh); } 80% { transform: translate(0.4cqh, 0.3cqh); } }
  .c { position: relative; min-width: 0; min-height: 0; border-radius: 0.4cqh; background-color: rgba(255, 255, 255, 0.08); background-size: 600% 100%; background-repeat: no-repeat; image-rendering: pixelated; display: grid; place-items: center; } /* 🎨 칸 = 타일 그림 6칸 중 하나 */
  .c.steal { animation: steal 0.7s ease-out; } @keyframes steal { 0% { filter: brightness(2.6); transform: scale(1.18); box-shadow: 0 0 2cqh #fff; z-index: 2; } 100% { filter: none; transform: none; box-shadow: none; } }
  .c.wave0, .c.wave1, .c.wave2 { animation: wave 0.8s ease-out both; z-index: 2; } .c.wave1 { animation-delay: 0.12s; } .c.wave2 { animation-delay: 0.24s; }
  @keyframes wave { 0% { filter: brightness(1); transform: scale(1); } 30% { filter: brightness(2.4); transform: scale(1.22); box-shadow: 0 0 3cqh #ffd34d; } 100% { filter: none; transform: none; box-shadow: none; } }
  .st { font-style: normal; font-size: 3.4cqh; filter: drop-shadow(0 0 1cqh #ffd34d); }
  .bang { position: absolute; inset: -40%; z-index: 4; display: grid; place-items: center; font-style: normal; font-size: 5.5cqh; pointer-events: none; animation: bang 0.6s ease-out both; } @keyframes bang { 0% { transform: scale(0.2) rotate(-20deg); opacity: 1; } 40% { transform: scale(1.3) rotate(8deg); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
  .who { position: absolute; inset: 4%; z-index: 3; border-radius: 50%; box-shadow: inset 0 0 0 0.45cqh var(--tc); background: rgba(0, 0, 0, 0.35); }
  .who.bu { animation: bounce 0.45s ease-out; } @keyframes bounce { 35% { transform: translate(calc(var(--bx) * 38%), calc(var(--by) * 38%)); } 60% { transform: translate(calc(var(--bx) * -10%), calc(var(--by) * -10%)); } }
  .hs { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 50%; overflow: hidden; }
  .nm { position: absolute; left: 50%; bottom: -0.6cqh; transform: translateX(-50%); max-width: 150%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 0.4cqh; border-radius: 0.5cqh; background: rgba(0, 0, 0, 0.72); font: 800 1.7cqh/1.25 var(--font); color: #fff; }
  .side { display: grid; gap: 2cqh; min-width: 30cqw; }
  .turn { margin: 0; font: 900 5cqh var(--font); color: var(--accent); font-variant-numeric: tabular-nums; }
  .bars { margin: 0; padding: 0; list-style: none; display: grid; gap: 1.4cqh; } .bars li { display: grid; grid-template-columns: 9cqw 1fr 8cqw; align-items: center; gap: 1cqw; font: 800 3.4cqh var(--font); }
  .bars b { color: var(--tc); display: flex; align-items: center; gap: 0.6cqw; } .flag { width: 5cqh; height: 5cqh; image-rendering: pixelated; } .bar { height: 3cqh; border-radius: 1cqh; background: rgba(255, 255, 255, 0.12); overflow: hidden; } .bar i { display: block; height: 100%; background: var(--tc); transition: width 0.4s; } .bars em { font-style: normal; text-align: right; }
  .win { margin: 0; font: 900 5cqh var(--font); color: var(--accent); }
  @media (prefers-reduced-motion: reduce) { .board.shake, .who.bu, .c.steal, .c.wave0, .c.wave1, .c.wave2 { animation: none; } }
</style>
