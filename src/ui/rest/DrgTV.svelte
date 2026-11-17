<script lang="ts">
  import type { Room } from '../../model/types';
  import { dragonAt, FIN, ranks, type Drg, type Prog } from '../../rest/dragon';
  import HeroSprite from '../camp/HeroSprite.svelte';
  // 🐉 용이 잠든 사이 · 종합실 (📜 2026-11-17 #25): 가로 길(왼쪽 출발 → 오른쪽 보물 상자) · 반 전체 용사 걷기 + 이름 · 상자 위 용 · 위 가운데 남은 초 · 들어온 순서
  //   용 그림 = 잠든 2칸 주문 전 → 🐉 + 💤 · 눈 뜸 = 빨간 빛 (그림이 오면 성채 드래곤 칸으로 바꿈)
  const { R, f, now, nameOf }: { R: Room; f: Drg; now: number; nameOf: (u: string) => string } = $props();
  const t = $derived(now - f.at);
  const play = $derived(f.phase === 'play' && t >= 0);
  const d = $derived(play ? dragonAt(f, t) : { st: 'sleep' as const, eye: -1 });
  const prog = $derived(((R as unknown as { dg?: Record<string, Record<string, Record<string, Prog>>> }).dg?.[f.g]?.[f.round]) ?? {});
  const ids = $derived(Object.keys(f.alive || {}));
  const lanes = $derived(Math.max(1, Math.min(10, ids.length)));
  const order = $derived(ids.filter((u) => prog[u]?.f != null).sort((a, b) => Number(prog[a]!.f) - Number(prog[b]!.f)));
  const sec = $derived(Math.max(0, Math.ceil((f.to - now) / 1000)));
  const rk = $derived(ranks(f).slice(0, 3));
</script>

<div class="dtv" data-k="drg-tv" data-st={play ? d.st : f.phase}>
  <div class="top"><b>🐉 용이 잠든 사이 · {f.phase === 'intro' ? '안내' : f.phase === 'end' ? '시상' : f.round === 3 ? '결승' : `${f.round}판`}</b><span class="sec" data-k="drg-sec">{f.phase === 'end' ? '' : `${sec}초`}</span></div>
  {#if f.phase === 'intro'}
    <p class="rule">용이 <b>잘 때</b> 👣 두 단추를 <b>번갈아</b> 눌러 달려요 · 용이 <b>눈을 뜨면</b> 멈춰요! · 보물 상자에 먼저 닿으면 이겨요</p>
  {:else if f.phase === 'end'}
    <div class="podium">{#each rk as x (x.u)}<span class="pd r{x.rank}"><b>{x.rank}등</b>{nameOf(x.u)} · {x.pts}점</span>{/each}</div>
    {#if f.clean?.length}<p class="rule">🐉 한 번도 안 걸린 용사 · {f.clean.map(nameOf).join(' · ')}</p>{/if}
  {:else}
    <div class="road" style:--lanes={lanes}>
      <div class="dragon {d.st}" aria-label="용 {d.st === 'eye' ? '눈 뜸' : d.st === 'warn' ? '깨려는 중' : '자는 중'}"><span>🐉</span>{#if d.st === 'sleep'}<i>💤</i>{:else if d.st === 'warn'}<i>…!</i>{:else}<i>👁</i>{/if}</div>
      <span class="chest">🎁</span>
      {#each ids as u, i (u)}
        {@const p = Number(prog[u]?.p) || 0}{@const hit = !!prog[u]?.h && d.st === 'eye'}
        <div class="runner" style:left="{4 + (p / FIN) * 80 - Math.floor(i / lanes) * 2.4}%" style:top="{8 + ((i % lanes) / lanes) * 84 + (Math.floor(i / lanes) % 2) * 3}%" style:z-index={10 + (i % lanes)}>
          <HeroSprite id={R.players?.[u]?.hero ?? 0} scale={1} pose={prog[u]?.f != null ? 'win' : hit ? 'hit' : play && d.st !== 'eye' ? 'walk' : 'idle'} tv />
          <em>{nameOf(u)}{order.includes(u) ? ` · ${order.indexOf(u) + 1}` : ''}</em>
        </div>
      {/each}
    </div>
    {#if f.phase === 'res'}<p class="rule">{f.round}판 끝 · 들어온 순서 {order.slice(0, 3).map((u, k) => `${k + 1} ${nameOf(u)}`).join(' · ') || '없음'}</p>{/if}
  {/if}
</div>

<style>
  .dtv { position: absolute; inset: 0; display: flex; flex-direction: column; color: #fff; padding: 2cqh 2cqw; gap: 1.5cqh; }
  .top { display: flex; justify-content: center; align-items: baseline; gap: 2cqw; font: 900 var(--tv-h, 4cqh) var(--font); }
  .sec { color: var(--accent); font-variant-numeric: tabular-nums; }
  .rule { margin: auto; max-width: 80cqw; text-align: center; font: 800 4.4cqh/1.5 var(--font); }
  .road { position: relative; flex: 1; border-radius: 2cqh; background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)); border: 1px solid rgba(255, 255, 255, 0.15); }
  .runner { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; transition: left 0.25s linear; }
  .runner em { font-style: normal; font: 700 1.8cqh var(--font); background: rgba(0, 0, 0, 0.55); border-radius: 0.6cqh; padding: 0 0.6cqw; white-space: nowrap; }
  .chest { position: absolute; right: 2cqw; bottom: 8%; font-size: 9cqh; }
  .dragon { position: absolute; right: 1cqw; top: 22%; font-size: 14cqh; line-height: 1; filter: drop-shadow(0 0 1cqh rgba(0, 0, 0, 0.6)); }
  .dragon i { position: absolute; left: -2cqw; top: 0; font-style: normal; font-size: 5cqh; }
  .dragon.warn span { animation: shiver 0.15s linear infinite; } .dragon.eye span { filter: drop-shadow(0 0 3cqh #ff3b30); }
  @keyframes shiver { 50% { transform: translateX(0.4cqw); } }
  .podium { margin: auto; display: flex; gap: 2cqw; } .pd { display: grid; gap: 1cqh; padding: 2cqh 3cqw; border-radius: 2cqh; background: rgba(0, 0, 0, 0.5); font: 800 3.6cqh var(--font); text-align: center; } .pd b { font-size: 5cqh; color: var(--accent); }
  @media (prefers-reduced-motion: reduce) { .dragon.warn span { animation: none; } .runner { transition: none; } }
</style>
