<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import type { LessonPack, Room, Step } from '../../model/types';
  import { arenaBox, partyLayout } from './arena/layout';
  import { hitsOf, snapOf, xpOf, type Snap } from './arena/events';
  import type { Arena, ArenaState, Hero } from './arena/pixi';
  import Sprite from '../Sprite.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { bossHp, monsterHp, isChain } from '../../raid/raid';
  import { monVis, spriteOf } from '../manifest';
  // ⚔ TV 전투 장면 (#157): PixiJS 캔버스(TV 들어갈 때만 불러옴) · WebGL 이 안 되면(또는 ?dom) 같은 배치의 DOM 장면
  //   공격 사건 = 학생마다 공격 횟수 · 데미지 비교(정식 hall.js attacks) → 0.35초 간격으로 차례로 · 쓰러지면 「몬스터 격파!」 + 머리 위 +EXP
  const { L, R, step, now, ids, nameOf, submitted, lost, split, shadow }:
    { L: LessonPack; R: Room; step: Step | null; now: number; ids: string[]; nameOf: (u: string) => string; submitted: (u: string) => boolean; lost: Set<string>; split: boolean; shadow: boolean } = $props();
  let host: HTMLDivElement;
  let A = $state<Arena | null>(null), mode = $state<'wait' | 'pixi' | 'dom'>('wait');
  let W = $state(0), H = $state(0);
  // 수업이 끝나는 순간 step 이 먼저 비워질 수 있음(장면이 사라지기 직전) → 빈 단계 = 아무것도 그리지 않음
  const boss = $derived(step?.kind === 'boss');
  const hp = $derived.by(() => { void now; const x = boss ? (L.boss ? bossHpOf() : null) : monHpOf(); return x; });
  function bossHpOf() { const b = bossHp(L, R, now); return { left: b.left, max: b.max, down: b.won }; }
  function monHpOf() { if (!step || step.kind !== 'monster' || !L.monsters[step.id]) return null; const h = monsterHp(L, R, step.id, now); return { left: h.left, max: h.max, down: h.left <= 0 }; }
  const sprite = $derived(boss ? (L.boss?.sprite ?? '') : (L.monsters[step?.id ?? '']?.sprite ?? ''));
  const hpLabel = $derived(boss ? `👑 ${L.boss?.title.split(' · ').pop() ?? '보스'}` : `${step?.kind === 'monster' && isChain(L, R, step.id) ? '👑 대장 · ' : ''}${step?.title.split(' · ').pop() ?? ''}`);
  const heroes = $derived<Hero[]>(ids.map((u) => ({ u, hero: R.players?.[u]?.hero ?? 0, name: nameOf(u), ok: submitted(u), off: lost.has(u) })));
  const st = $derived<ArenaState>({ boss, split, sprite, hp: hp ? { left: hp.left, max: hp.max } : null, hpLabel, down: !!hp?.down, shadow, heroes });

  onMount(() => {
    const ro = new ResizeObserver(() => { W = host.clientWidth; H = host.clientHeight; }); ro.observe(host); W = host.clientWidth; H = host.clientHeight;
    const forceDom = new URLSearchParams(location.search).has('dom');
    if (forceDom) mode = 'dom';
    else void import('./arena/pixi').then(async (m) => {
      const font = getComputedStyle(host).fontFamily || 'sans-serif';
      const a = await m.createArena(host, font);
      if (!host.isConnected) { a?.destroy(); return; }
      if (a) { A = a; mode = 'pixi'; } else mode = 'dom';
    }).catch((e) => { console.warn('PixiJS 불러오기 실패 → DOM', e); mode = 'dom'; });
    return () => ro.disconnect();
  });
  onDestroy(() => { A?.destroy(); A = null; clearTimeout(qT); });
  $effect(() => { void W; void H; if (A && step) A.update(st); });

  // ── 공격 사건 (단계가 바뀌면 지난 것은 다시 보이지 않음) ──
  let seen: Record<string, Snap> = {}, seenKey = '', wasDown = false, qT: ReturnType<typeof setTimeout> | undefined;
  const queue: { u: string; dmg: number; kind: 'hit' | 'miss' | 'practice' }[] = [];
  let domFx = $state<{ k: number; text: string; x: number; y: number; cls: string }[]>([]), domBan = $state(''), fk = 0, lunge = $state<Record<string, boolean>>({});
  function play() {
    if (qT) return;
    const h = queue.shift(); if (!h) return;
    if (A) A.hit(h.u, h.dmg, h.kind);
    else { lunge = { ...lunge, [h.u]: true }; setTimeout(() => (lunge = { ...lunge, [h.u]: false }), 380); const b = arenaBox(W, H, boss, split); domPop(h.kind === 'hit' ? `-${h.dmg}` : h.kind === 'practice' ? '연습' : 'MISS', b.mon.cx, b.mon.top + b.mon.size * 0.4, h.kind === 'hit' ? 'dmg' : 'miss'); }
    qT = setTimeout(() => { qT = undefined; play(); }, 350);
  }
  function domPop(text: string, x: number, y: number, cls: string) { const k = ++fk; domFx = [...domFx, { k, text, x, y, cls }]; setTimeout(() => (domFx = domFx.filter((f) => f.k !== k)), 1300); }
  $effect(() => {
    if (!step) return;
    const st0 = step, key = `${R.state.step}|${st0.id}`, cur: Record<string, Snap> = {};
    for (const u of ids) cur[u] = snapOf(L, R, st0, u);
    untrack(() => {
      if (key !== seenKey) { seenKey = key; seen = cur; wasDown = !!hp?.down; queue.length = 0; if (A) A.banner(null); domBan = ''; return; }
      const hs = hitsOf(seen, cur); seen = cur;
      if (hs.length) { queue.push(...hs); play(); }
      const d = !!hp?.down;
      if (d && !wasDown) {
        const text = boss ? '🎉 보스 격파! 모두 함께 이겼다!' : '⚔ 몬스터 격파!';
        setTimeout(() => { if (A) A.banner(text); else domBan = text; }, 350 * (queue.length + 1));
        setTimeout(() => ids.forEach((u, k) => { const x = xpOf(L, R, st0, u); if (!x) return; setTimeout(() => { if (A) A.exp(u, `+${x} EXP`); else { const sl = partyLayout(ids.length, W, H, split)[k]; if (sl) domPop(`+${x} EXP`, sl.x, sl.y - 64 * sl.s, 'exp'); } }, (k % 6) * 120); }), 350 * (queue.length + 1) + 600);
      }
      wasDown = d;
    });
  });
  // 화면 시험 고리(TV 장면 · 학생 화면엔 없음): 지금 그리는 방식 · 배치
  $effect(() => { (globalThis as { __arena?: unknown }).__arena = { mode, W, H, hp: hp ? `${hp.left} / ${hp.max}` : '', box: arenaBox(W, H, boss, split, vis), party: partyLayout(heroes.length, W, H, split) }; });

  const slots = $derived(partyLayout(heroes.length, W, H, split));
  const vis = $derived.by(() => { try { const sp = spriteOf(sprite); return monVis(sp.sheet.src, sp.row, sp.sheet.poses.idle, sp.sheet.cell); } catch { return 1; } });
  const box = $derived(arenaBox(W, H, boss, split, vis));
</script>

<div class="arena2" class:split bind:this={host} data-mode={mode}>
  {#if mode === 'dom' && W && step && sprite}
    <!-- DOM 장면 = 캔버스와 같은 배치 (WebGL 없는 기기) -->
    <i class="sh" style:left="{box.shadow.cx - box.shadow.w / 2}px" style:top="{box.shadow.y - H * 0.018}px" style:width="{box.shadow.w}px" style:height="{H * 0.036}px"></i>
    <div class="mon" class:shadow class:float={!hp?.down} style:left="{box.mon.cx - box.mon.size / 2}px" style:top="{box.mon.top}px"><Sprite ref={sprite} pose={hp?.down ? 'down' : 'idle'} size={box.mon.size} /></div>
    {#if hp && !shadow}
      <div class="hp" style:left="{box.hp.x}px" style:top="{box.hp.y}px" style:width="{box.hp.w}px" style:--h="{box.hp.h}px"><span class="lab">{hpLabel}</span><div class="b"><i style:width="{hp.max ? (Math.max(0, hp.left) / hp.max) * 100 : 0}%"></i><b>HP {hp.left} / {hp.max}</b></div></div>
    {/if}
    {#each heroes as h, k (h.u)}{@const sl = slots[k]}{#if sl}
      <div class="hr" class:off={h.off} class:lunge={lunge[h.u]} style:left="{sl.x}px" style:top="{sl.y}px" style:--dir={sl.flip ? -1 : 1} style:z-index={Math.round(sl.y)}>
        <span class="art" style:transform="scaleX({sl.flip ? -1 : 1})"><HeroSprite id={h.hero} scale={sl.s} /></span>
        <span class="nm" class:ok={h.ok}>{h.ok ? '✓ ' : h.off ? '📵 ' : ''}{h.name}</span>
      </div>
    {/if}{/each}
    {#each domFx as f (f.k)}<b class="pop {f.cls}" style:left="{f.x}px" style:top="{f.y}px">{f.text}</b>{/each}
    {#if domBan}<div class="ban" style:left="{split ? W * 0.27 : W / 2}px">{domBan}</div>{/if}
  {/if}
</div>

<style>
  .arena2 { position: absolute; inset: 0; z-index: 1; overflow: hidden; }
  .sh { position: absolute; border-radius: 50%; background: radial-gradient(ellipse, rgba(0, 0, 0, 0.55), transparent 70%); }
  .mon { position: absolute; } .mon.shadow { filter: brightness(0.08); }
  .mon.float { animation: bob 2.6s ease-in-out infinite; }
  @keyframes bob { 50% { transform: translateY(-0.6cqh); } }
  .hp { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 0.6cqh; font-size: var(--tv-body); font-weight: 700; text-shadow: 0 1px 2px #000; }
  .hp .lab { white-space: nowrap; }
  .hp .b { position: relative; width: 100%; height: var(--h); border-radius: 99px; background: #2a0d10; box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.7); overflow: hidden; display: grid; place-items: center; }
  .hp .b i { position: absolute; left: 0; top: 0; bottom: 0; background: #e5484d; transition: width 0.5s ease-out; }
  .hp .b b { position: relative; }
  .hr { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; transition: translate 0.18s ease-out; }
  .hr.lunge { translate: calc(var(--dir) * 4cqw) 0; }
  .hr.off { opacity: 0.45; }
  .art { display: block; line-height: 0; }
  .nm { margin-top: 0.4cqh; font-size: var(--tv-small); font-weight: 700; background: rgba(8, 9, 12, 0.72); padding: 0.1cqh 0.6cqw; border-radius: 99px; white-space: nowrap; }
  .nm.ok { color: var(--ok); }
  .pop { position: absolute; transform: translate(-50%, -100%); font-size: var(--tv-big); font-weight: 700; color: #ffd166; text-shadow: 0 3px 0 #000; animation: up 1.1s ease-out forwards; pointer-events: none; }
  .pop.miss { font-size: var(--tv-title); color: #cfd3db; } .pop.exp { font-size: var(--tv-body); color: #f5b84a; }
  @keyframes up { to { transform: translate(-50%, -180%); opacity: 0; } }
  .ban { position: absolute; top: 50%; transform: translate(-50%, -50%); font-size: var(--tv-big); font-weight: 700; color: #ffd166; padding: 1.6cqh 3cqw; border-radius: 2cqh; background: rgba(8, 9, 12, 0.78); border: 3px solid #f5b84a; white-space: nowrap; }
</style>
