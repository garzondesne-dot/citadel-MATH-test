<script lang="ts">
  import { untrack } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import { dragonAt, FIN, meStart, ranks, tap, type Drg, type Me, type Prog } from '../../rest/dragon';
  import { drgProg } from '../../rest/run';
  // 🐉 용이 잠든 사이 · 학생 폰 (📜 2026-11-17 #25): 👣 왼발 · 👣 오른발 번갈아 · 위 = 용 상태 띠 + 내 자리 막대 + 순위 · 판정은 이 폰에서(서버 시각)
  const { S, R, code, uid, now, f }: { S: Store; R: Room; code: string; uid: string; now: number; f: Drg } = $props();
  let me = $state<Me>(meStart()), key = '', lastW = 0, flash = $state(''), flashT: ReturnType<typeof setTimeout> | null = null;
  $effect(() => { const k = `${f.g}|${f.round}`; untrack(() => { if (k !== key) { key = k; const p = (R as unknown as { dg?: Record<string, Record<string, Record<string, Prog>>> }).dg?.[f.g]?.[f.round]?.[uid]; me = { ...meStart(), p: Number(p?.p) || 0, h: Number(p?.h) || 0, ...(p?.f != null ? { f: p.f } : {}) }; } }); }); // 다시 들어오면 이어서
  const t = $derived(now - f.at);
  const play = $derived(f.phase === 'play' && t >= 0);
  const d = $derived(play ? dragonAt(f, t) : { st: 'sleep' as const, eye: -1 });
  const frz = $derived(now < me.frzTo + f.at && me.frzTo > 0 && play);
  const prog = $derived(((R as unknown as { dg?: Record<string, Record<string, Record<string, Prog>>> }).dg?.[f.g]?.[f.round]) ?? {});
  const ids = $derived(Object.keys(f.alive || {}));
  const myRank = $derived.by(() => { const o = ids.map((u) => ({ u, f: u === uid ? me.f : prog[u]?.f, p: u === uid ? me.p : Number(prog[u]?.p) || 0 })).sort((a, b) => (a.f != null ? (b.f != null ? Number(a.f) - Number(b.f) : -1) : b.f != null ? 1 : b.p - a.p)); return o.findIndex((x) => x.u === uid) + 1; });
  function send(force: boolean) { const n = S.now(); if (!force && n - lastW < 250) return; lastW = n; drgProg(S, code, f.g, f.round, uid, { p: me.p, h: me.h, ...(me.f != null ? { f: me.f + f.at } : {}) }); }
  function press(side: 'L' | 'R', e: Event) {
    e.preventDefault(); if (!play || f.alive?.[uid] == null) return;
    const r = tap(f, me, side, S.now() - f.at); me = r.me;
    if (r.r === 'hit') { flash = '🔥 앗 뜨거! 10칸 뒤로'; try { navigator.vibrate?.(200); } catch { /* 없음 */ } send(true); }
    else if (r.r === 'go') send(false); // 폰 = 소리 없음 · 진동만 (README 6)
    else if (r.r === 'fin') { flash = '🏆 보물 상자 도착!'; send(true); }
    else if (r.r === 'same') flash = '👣 번갈아 눌러요';
    if (flashT) clearTimeout(flashT); flashT = setTimeout(() => (flash = ''), 900);
  }
  // 예고 = 진동 한 번 (README 「폰 = 진동」)
  let warned = -1;
  $effect(() => { if (d.st === 'warn') untrack(() => { const k = Math.floor(t / 1000); if (k !== warned) { warned = k; try { navigator.vibrate?.(60); } catch { /* 없음 */ } } }); });
  const sec = $derived(Math.max(0, Math.ceil((f.to - now) / 1000)));
  const rk = $derived(ranks(f));
  const myTot = $derived(rk.find((x) => x.u === uid));
</script>

<div class="drg" data-k="drg-phone" data-st={play ? d.st : f.phase}>
  {#if f.phase === 'intro'}
    <p class="band sleep">🐉 용이 잠든 사이</p>
    <p class="rule">용이 <b>잘 때</b> 👣 두 단추를 <b>번갈아</b> 눌러 달려요 · 용이 <b>눈을 뜨면</b> 누르지 마요! · 보물 상자에 먼저 닿으면 이겨요</p>
    <p class="big">{sec}</p>
  {:else if f.phase === 'res' || f.phase === 'end'}
    <p class="band sleep">{f.phase === 'end' ? '🏆 시상' : `${f.round}판 끝`}</p>
    <p class="big" data-k="drg-myrank">{myTot ? `${myTot.rank}등 · ${myTot.pts}점` : '구경 중'}</p>
    {#if f.phase === 'end' && f.clean?.includes(uid)}<p class="rule">🐉 한 번도 안 걸린 용사!</p>{/if}
  {:else}
    <p class="band {d.st}" data-k="drg-band">{t < 0 ? `${Math.ceil(-t / 1000)} · 준비!` : d.st === 'eye' ? '👁 눈 떴다! 누르지 마!' : d.st === 'warn' ? '⚠ 눈꺼풀이 떨려요…' : '💤 자는 중 · 달려요!'}</p>
    <div class="track" aria-label="내 자리 {me.p} / {FIN}"><i class="flag">🏁</i><span class="bar"><i style:width="{(me.p / FIN) * 100}%"></i><b class="me" style:left="{(me.p / FIN) * 100}%">🧍</b></span><i class="box">🎁</i></div>
    <p class="meta"><b data-k="drg-pos">{me.p} / {FIN}칸</b> · {myRank} / {ids.length}등 · ⏱ {sec}초{me.h ? ` · 🔥 ${me.h}` : ''}</p>
    <p class="flash" aria-live="polite">{frz ? '🔥 앗 뜨거! 잠깐 멈춤' : flash}</p>
    <div class="pads" class:off={!play || me.f != null}>
      <button type="button" class="pad" data-k="drg-L" onpointerdown={(e) => press('L', e)}>👣<small>왼발</small></button>
      <button type="button" class="pad" data-k="drg-R" onpointerdown={(e) => press('R', e)}>👣<small>오른발</small></button>
    </div>
  {/if}
</div>

<style>
  .drg { width: 100%; display: flex; flex-direction: column; gap: 10px; align-items: stretch; text-align: center; height: 100%; padding-bottom: var(--s4); box-sizing: border-box; touch-action: none; user-select: none; -webkit-user-select: none; }
  .band { margin: 0; padding: 12px; border-radius: 14px; font: 900 20px var(--font); background: #1d2a3d; color: #cfe3ff; }
  .band.warn { background: #3a3210; color: #ffe28a; } .band.eye { background: #c62828; color: #fff; }
  .rule { margin: 0; font-size: 15px; color: var(--text-2); line-height: 1.5; }
  .big { margin: 0; font: 900 44px var(--font); color: var(--accent); font-variant-numeric: tabular-nums; }
  .track { display: flex; align-items: center; gap: 6px; }
  .track .bar { position: relative; flex: 1; height: 14px; border-radius: 7px; background: var(--surface-2); }
  .track .bar > i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 7px; background: var(--accent); }
  .track .me { position: absolute; top: -16px; transform: translateX(-50%); font-style: normal; font-size: 22px; }
  .track .flag, .track .box { font-style: normal; font-size: 22px; }
  .meta { margin: 0; font-size: 15px; color: var(--text-2); } .meta b { color: var(--text); }
  .flash { margin: 0; min-height: 22px; font: 800 16px var(--font); color: #ff8a80; }
  .pads { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-height: 0; }
  .pad { border: 0; border-radius: 20px; background: var(--accent); color: var(--on-accent); font: 900 46px/1 var(--font); display: grid; place-items: center; align-content: center; gap: 6px; box-shadow: 0 6px 0 var(--accent-sh); }
  .pad small { font-size: 18px; } .pad:active { transform: translateY(4px); box-shadow: none; }
  .pads.off .pad { opacity: 0.4; }
  .drg[data-st='eye'] .pad { background: #5a1a1a; color: #ffb4b6; box-shadow: 0 6px 0 #2a0c0c; }
</style>
