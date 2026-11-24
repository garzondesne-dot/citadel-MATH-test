<script lang="ts">
  import type { Room, Store } from '../../model/types';
  import { DIRS, fxCells, fxLine, hidden, LG, ownAt, scores, TEAMS, type Lg } from '../../rest/landgrab';
  import { isLgBot, lgBotHero, lgBotName } from '../../rest/landgrab';
  import { lgDir, lgJoin } from '../../rest/run';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { artUrl, LG_ART, lgTilePos } from '../manifest';
  // 🏁 땅따먹기 · 학생 폰 (📜 2026-11-24): 모이기 = 「참가」 · 판 = 나를 가운데 둔 7×7 · 방향 4개(3초 안에 바꿀 수 있음 · 안 고르면 지난 방향) · 내가 칠한 칸 · 개인 순위는 안 보여 줌
  const { S, R, code, uid, now, f }: { S: Store; R: Room; code: string; uid: string; now: number; f: Lg } = $props();
  const fv = $derived((R as unknown as { fv?: Record<string, Record<string, number>> }).fv);
  const joined = $derived(!!fv?.[`lg${f.g}_j`]?.[uid] || f.team?.[uid] != null);
  const myT = $derived(f.team?.[uid]);
  const me = $derived(f.pos?.[uid]);
  const picked = $derived(f.phase === 'pick' ? fv?.[`lg${f.g}_${f.turn}`]?.[uid] : undefined);
  const sec = $derived(Math.max(0, Math.ceil((f.to - now) / 1000)));
  const W = 3; // 7×7 = 가운데 ± 3
  const cells = $derived.by(() => { if (!me) return []; const out: { x: number; y: number; c: number; in: boolean; star: boolean; who: string[] }[] = []; for (let dy = -W; dy <= W; dy++) for (let dx = -W; dx <= W; dx++) { const x = me[0] + dx, y = me[1] + dy, inb = x >= 0 && y >= 0 && x < f.size && y < f.size; out.push({ x, y, in: inb, c: inb ? ownAt(f, x, y) : -1, star: inb && (f.stars || []).some((s) => s[0] === x && s[1] === y), who: inb ? Object.keys(f.pos || {}).filter((u) => f.pos[u]![0] === x && f.pos[u]![1] === y) : [] }); } return out; });
  const sc = $derived(scores(f));
  const order = $derived(Array.from({ length: f.nTeam }, (_, t) => t).sort((a, b) => sc[b]! - sc[a]!));
  const go = (d: number) => { if (f.phase === 'pick' && myT != null) { lgDir(S, code, f.g, f.turn, uid, d); try { navigator.vibrate?.(20); } catch { /* 없음 */ } } };
  // 📜 11/24 🔨 #18 연출(폰 = 작게): 뺏은 칸 반짝 · ⭐ 파도 · 💥 부딪힘 + 튕김 · 해설 한 줄
  const fx = $derived(f.fx && f.phase !== 'end' ? f.fx : null);
  const fxKey = $derived(fx ? `${f.g}|${fx.t}` : '');
  const flash = $derived(fxCells(fx));
  const bumpAt = $derived(new Set((fx?.bump || []).map((b) => `${b[0]},${b[1]}`)));
  let buzzed = '';
  $effect(() => { const k = fxKey; if (!k || k === buzzed) return; buzzed = k; if (fx && fx.bu[uid]) try { navigator.vibrate?.(60); } catch { /* 없음 */ } });
  let sx = 0, sy = 0;
  const swipe = (e: PointerEvent) => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return; go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : dy > 0 ? 1 : 0); };
</script>

<div class="lg" data-k="lg-phone" data-phase={f.phase}>
  {#if f.phase === 'join'}
    <p class="band">🏁 땅따먹기</p>
    <p class="rule">5초마다 한 칸씩 · 밟은 칸 = 우리 팀 색 · 30번 뒤 칸이 많은 팀이 이겨요</p>
    {#if joined}<p class="ok" data-k="lg-joined">✅ 참가했어요 · 선생님이 「출발」을 누르면 시작해요</p>
    {:else}<button type="button" class="big" data-k="lg-join" onclick={() => lgJoin(S, code, f.g, uid)}>🙋 참가</button>{/if}
  {:else if myT == null}
    <p class="band">🏁 땅따먹기 · {f.turn} / {LG.turns}턴</p>
    {#if joined}<p class="ok">✅ 다음 턴부터 함께해요</p>{:else}<button type="button" class="big" data-k="lg-join" onclick={() => lgJoin(S, code, f.g, uid)}>🙋 지금 참가</button>{/if}
  {:else}
    <p class="band" style:--tc={TEAMS[myT]!.c}><img class="flag" src={artUrl(LG_ART.flags[myT]!)} alt="" /><b class="tm">{TEAMS[myT]!.n} 팀</b> · {f.phase === 'ready' ? `준비 ${sec}초` : f.phase === 'end' ? '끝' : `${f.turn} / ${LG.turns}턴 · ${f.phase === 'pick' ? `${sec}초 안에 골라요` : '움직이는 중'}`}</p>
    {#if f.phase === 'end'}
      {@const r = (f.rank || [])[myT] ?? 0}
      <p class="res" data-k="lg-res">{(f.winTeams || []).includes(myT) ? '🏆 우리 팀 1등!' : `우리 팀 ${r}등`}</p>
      <ol class="bars">{#each order as t (t)}<li style:--tc={TEAMS[t]!.c}><b>{f.rank?.[t]}등 {TEAMS[t]!.n}</b><span>{sc[t]}칸</span></li>{/each}</ol>
      <p class="rule">내가 칠한 칸 {f.mine?.[uid] ?? 0}</p>
    {:else}
      <p class="cast" data-k="lg-cast">{#key fxKey}<span>{fxLine(f)}</span>{/key}</p>
      {#key fxKey}<div class="win" class:shake={!!fx?.bu[uid]} role="img" aria-label="내 둘레 7×7" style:--n={W * 2 + 1} onpointerdown={(e) => { sx = e.clientX; sy = e.clientY; }} onpointerup={swipe}>
        {#each cells as c, i (i)}{@const fl = flash[`${c.x},${c.y}`]}{@const bu = c.who.length ? fx?.bu[c.who[0]!] : undefined}<span class="c {fl ?? ''}" class:out={!c.in} class:star={c.star} style:background-image={c.in ? `url(${artUrl(LG_ART.tiles)})` : undefined} style:background-position={c.in ? lgTilePos(c.c, c.star) : undefined}>{#if bumpAt.has(`${c.x},${c.y}`)}<em class="bang">💥</em>{/if}{#if c.who.length}<i class="who" class:me={c.who.includes(uid)} class:bu={!!bu} style:--bx={bu ? bu[0] : 0} style:--by={bu ? bu[1] : 0} style:--tc={TEAMS[f.team[c.who[0]!] ?? 0]!.c}><HeroSprite id={isLgBot(c.who[0]!) ? lgBotHero(c.who[0]!) : (R.players?.[c.who[0]!]?.hero ?? 0)} scale={0.36} /></i>{/if}</span>{/each}
      </div>{/key}
      <div class="pad" data-k="lg-pad">
        {#each [[0, '▲', 'up'], [2, '◀', 'left'], [3, '▶', 'right'], [1, '▼', 'down']] as [d, ic, k] (k)}<button type="button" class="d {k}" class:on={picked === d || (picked == null && f.last?.[uid] === d)} aria-pressed={picked === d} data-d={d} disabled={f.phase !== 'pick'} onclick={() => go(d as number)}>{ic}</button>{/each}
      </div>
      <p class="rule">내가 칠한 칸 {f.mine?.[uid] ?? 0}{hidden(f) ? ' · 🤫 점수는 마지막에 공개' : ''}</p>
    {/if}
  {/if}
</div>

<style>
  .lg { display: flex; flex-direction: column; align-items: center; gap: var(--s3); width: 100%; text-align: center; }
  .band { margin: 0; font: 800 16px var(--font); color: var(--text); display: flex; align-items: center; justify-content: center; gap: 4px; } .flag { width: 28px; height: 28px; image-rendering: pixelated; } .tm { color: var(--tc); }
  .rule { margin: 0; font: 600 15px/1.5 var(--font); color: var(--text-2); } .ok { margin: 0; font: 700 16px var(--font); color: var(--ok); }
  .big { min-height: 64px; padding: 0 var(--s6); border-radius: var(--r); border: 0; background: var(--accent); color: var(--on-accent); font: 900 22px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .win { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); grid-template-rows: repeat(var(--n), minmax(0, 1fr)); gap: 2px; width: min(100%, 336px); aspect-ratio: 1; touch-action: none; }
  .c { position: relative; display: grid; place-items: center; border-radius: 3px; background-color: var(--surface-2); background-size: 600% 100%; background-repeat: no-repeat; image-rendering: pixelated; font-size: 14px; } .c.out { background: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.04) 0 4px, transparent 4px 8px); } /* 벽 밖 */
  .who { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 50%; box-shadow: inset 0 0 0 3px var(--tc); overflow: hidden; } .who.me { box-shadow: inset 0 0 0 3px #ffd34d, 0 0 0 2px #ffd34d; }
  .cast { margin: 0; min-height: 22px; font: 800 14px var(--font); color: var(--text); } .cast span { display: inline-block; animation: castIn 0.3s ease-out; } @keyframes castIn { from { transform: scale(1.2); opacity: 0; } }
  .win.shake { animation: lgShake 0.3s linear; } @keyframes lgShake { 25% { transform: translate(-4px, 2px); } 50% { transform: translate(4px, -2px); } 75% { transform: translate(-2px, -1px); } }
  .c.steal { animation: steal 0.6s ease-out; } @keyframes steal { 0% { filter: brightness(2.4); transform: scale(1.15); } }
  .c.wave0, .c.wave1, .c.wave2 { animation: wave 0.7s ease-out both; } .c.wave1 { animation-delay: 0.1s; } .c.wave2 { animation-delay: 0.2s; } @keyframes wave { 30% { filter: brightness(2.2); transform: scale(1.18); box-shadow: 0 0 10px #ffd34d; } }
  .bang { position: absolute; inset: -30%; z-index: 3; display: grid; place-items: center; font-style: normal; font-size: 26px; pointer-events: none; animation: bang 0.55s ease-out both; } @keyframes bang { 0% { transform: scale(0.2); } 40% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
  .who.bu { animation: bounce 0.4s ease-out; } @keyframes bounce { 35% { transform: translate(calc(var(--bx) * 35%), calc(var(--by) * 35%)); } }
  @media (prefers-reduced-motion: reduce) { .win.shake, .who.bu, .c.steal, .c.wave0, .c.wave1, .c.wave2 { animation: none; } }
  .pad { display: grid; grid-template-columns: repeat(3, 72px); grid-template-rows: repeat(3, 56px); gap: 6px; }
  .d { border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 800 24px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .d.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); } .d:disabled { opacity: 0.5; }
  .up { grid-column: 2; grid-row: 1; } .left { grid-column: 1; grid-row: 2; } .right { grid-column: 3; grid-row: 2; } .down { grid-column: 2; grid-row: 3; }
  .res { margin: 0; font: 900 26px var(--font); color: var(--accent); }
  .bars { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; width: min(100%, 320px); } .bars li { display: flex; justify-content: space-between; padding: 8px 12px; border-radius: var(--r-sm); background: var(--surface-2); border-left: 6px solid var(--tc); font: 700 15px var(--font); }
</style>
