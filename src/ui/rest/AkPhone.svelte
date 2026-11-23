<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import { AK, powerOf, predict, rankAk, viewAt, type Ak, type Stone } from '../../rest/alkkagi';
  import { akJoin, akShoot } from '../../rest/run';
  import { drawAk, scaleOf } from './akDraw';
  // 🥏 알까기 난장판 · 학생 폰 (📜 2026-11-24): 모이기 = 「참가」 · 판 전체 · 판 어디든 눌러 뒤로 당겼다 놓기(새총 · 당긴 길이 = 세기 3단)
  //   당기는 동안 내 폰에만 점선(멈출 자리 · 처음 부딪히는 알과 밀려갈 방향 · 판 밖 = 빨강) · 쏜 뒤 4초 = 내 알 둘레 파란 고리
  //   떨어지면 「3 · 2 · 1」 + 누가 떨어뜨렸는지 · 위 = 남은 시간 · 내 점수 · 아래 = 1 ~ 3등
  const { S, R, code, uid, now, f }: { S: Store; R: Room; code: string; uid: string; now: number; f: Ak } = $props();
  const fv = $derived((R as unknown as { fv?: Record<string, Record<string, unknown>> }).fv);
  const joined = $derived(!!fv?.[`ak${f.g}_j`]?.[uid] || !!f.st?.[uid]);
  const nick = (u: string) => (R.players?.[u] as { nick?: string; name?: string } | undefined)?.nick || (u === uid ? '나' : '친구');
  const sec = $derived(Math.max(0, Math.ceil((f.to - now) / 1000)));
  const playLeft = $derived(Math.max(0, Math.ceil(AK.playSec - f.gt)));
  const top = $derived(rankAk(f).order.slice(0, 3));
  const myRank = $derived(f.rank?.[uid] ?? rankAk(f).rank[uid]);

  let cv = $state<HTMLCanvasElement>(), raf = 0, view: Record<string, Stone> = {};
  let drag: { x: number; y: number; cx: number; cy: number } | null = $state(null), sent = $state(0);
  const me = $derived(f.st?.[uid]);
  /** 지금 내 알 (그려진 판 기준) */
  const mine = () => view[uid];
  const canShoot = () => { const s = mine(); return f.phase === 'play' && !!s?.on && s.cd <= 1e-6 && sent <= (me?.n ?? 0); };
  let fallMsg = $state(''), lastFallT = -1;
  $effect(() => { const e = [...(f.ev || [])].reverse().find((x) => x.k === 'fall' && x.u === uid); if (e && e.k === 'fall' && e.t !== lastFallT) { lastFallT = e.t; fallMsg = e.by ? `${nick(e.by)}이(가) 떨어뜨렸어요` : '혼자 떨어졌어요'; } });

  function frame() {
    raf = requestAnimationFrame(frame);
    const c = cv; if (!c) return; fit(c); const g = c.getContext('2d'); if (!g) return;
    const W = c.width, H = c.height, t = S.now();
    view = viewAt(f, t).st;
    let path = null;
    if (drag && canShoot()) {
      const k = scaleOf(W, H, f.R), dx = (drag.x - drag.cx) / k, dy = (drag.y - drag.cy) / k, len = Math.hypot(dx, dy), p = powerOf(len);
      if (p >= 0) path = predict(view, f.R, uid, Math.atan2(dy, dx), p);
    }
    const s = mine();
    drawAk(g, W, H, f.R, view, { me: uid, crown: f.crown, path, ring: s?.on ? 1 - Math.min(1, s.cd / AK.cool) : undefined, label: (u) => (u === uid ? '나' : '') });
  }
  /** 캔버스 = 보이는 크기 × 화면 배율(최대 2) */
  const fit = (c: HTMLCanvasElement) => { const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * d), h = Math.round(r.height * d); if (w && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; } };
  onMount(() => { raf = requestAnimationFrame(frame); });
  onDestroy(() => cancelAnimationFrame(raf));

  const pt = (e: PointerEvent) => { const r = cv!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv!.width, y: ((e.clientY - r.top) / r.height) * cv!.height }; };
  function down(e: PointerEvent) { if (!canShoot()) return; const p = pt(e); drag = { x: p.x, y: p.y, cx: p.x, cy: p.y }; (e.target as Element).setPointerCapture?.(e.pointerId); }
  function move(e: PointerEvent) { if (!drag) return; const p = pt(e); drag = { ...drag, cx: p.x, cy: p.y }; }
  function up() {
    const d = drag; drag = null; if (!d || !canShoot() || !cv) return;
    const k = scaleOf(cv.width, cv.height, f.R), dx = (d.x - d.cx) / k, dy = (d.y - d.cy) / k, p = powerOf(Math.hypot(dx, dy));
    if (p < 0) return;
    const n = (me?.n ?? 0) + 1; sent = n; akShoot(S, code, f.g, uid, { a: Math.atan2(dy, dx), p, n });
    try { navigator.vibrate?.(25); } catch { /* 없음 */ }
  }
  const backIn = $derived(me && !me.on ? Math.max(1, Math.ceil(me.back + 1)) : 0);
</script>

<div class="ak" data-k="ak-phone" data-phase={f.phase}>
  {#if f.phase === 'join'}
    <p class="band">🥏 알까기 난장판</p>
    <p class="rule">내 알을 당겼다 놓아 친구 알을 판 밖으로! · 쏘면 4초 쉬어요 · 150초 동안 점수가 높은 사람이 이겨요</p>
    {#if joined}<p class="ok" data-k="ak-joined">✅ 참가했어요 · 선생님이 「출발」을 누르면 시작해요</p>
    {:else}<button type="button" class="big" data-k="ak-join" onclick={() => akJoin(S, code, f.g, uid)}>🙋 참가</button>{/if}
  {:else if !me}
    <p class="band">🥏 알까기 · 남은 {playLeft}초</p>
    {#if f.phase === 'end'}<p class="rule">이번 판은 끝났어요</p>{:else if joined}<p class="ok">✅ 곧 판 위에 나타나요</p>{:else}<button type="button" class="big" data-k="ak-join" onclick={() => akJoin(S, code, f.g, uid)}>🙋 지금 참가</button>{/if}
  {:else}
    <p class="band" data-k="ak-band">{f.phase === 'ready' ? `준비 ${sec}초 · 금빛 테두리가 내 알` : f.phase === 'end' ? '🏆 결과' : `남은 ${playLeft}초`} · <b class="sc">{f.sc?.[uid] ?? 0}점</b>{#if f.crown === uid} 👑{/if}</p>
    {#if f.phase === 'end'}
      <p class="res" data-k="ak-res">{myRank === 1 ? '🏆 1등!' : `${myRank}등`} · {f.sc?.[uid] ?? 0}점</p>
      <ol class="top">{#each rankAk(f).order.slice(0, 5) as u (u)}<li class:me={u === uid}><b>{f.rank?.[u]}등</b><span>{nick(u)}</span><em>{f.sc?.[u] ?? 0}점</em></li>{/each}</ol>
      <p class="rule">떨어뜨림 {f.kn?.[uid] ?? 0} · 떨어짐 {f.fall?.[uid] ?? 0}</p>
    {:else}
      <div class="wrap">
        <canvas bind:this={cv} class="board" data-k="ak-board" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={() => (drag = null)} aria-label="알까기 판 · 눌러서 뒤로 당겼다 놓아요"></canvas>
        {#if backIn}<div class="fall" data-k="ak-fall"><b>{backIn}</b><span>{fallMsg || '떨어졌어요'}</span></div>{/if}
      </div>
      <p class="hint" data-k="ak-hint">{f.phase === 'ready' ? '곧 시작해요' : !me.on ? '곧 다시 나와요 (나온 뒤 2초 무적)' : sent > me.n ? '🚀 날아가는 중…' : me.cd > 0 ? `🔄 ${Math.ceil(me.cd)}초 쉬는 중` : '👆 판을 누르고 뒤로 당겼다 놓아요'}</p>
      <ol class="top">{#each top as u, i (u)}<li class:me={u === uid}><b>{i + 1}</b><span>{nick(u)}{f.crown === u ? ' 👑' : ''}</span><em>{f.sc?.[u] ?? 0}점</em></li>{/each}</ol>
    {/if}
  {/if}
</div>

<style>
  .ak { display: flex; flex-direction: column; align-items: center; gap: var(--s3); width: 100%; text-align: center; }
  .band { margin: 0; font: 800 16px var(--font); color: var(--text); } .sc { color: var(--accent); }
  .rule { margin: 0; font: 600 15px/1.5 var(--font); color: var(--text-2); } .ok { margin: 0; font: 700 16px var(--font); color: var(--ok); }
  .big { min-height: 64px; padding: 0 var(--s6); border-radius: var(--r); border: 0; background: var(--accent); color: var(--on-accent); font: 900 22px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .wrap { position: relative; width: min(100%, 360px); aspect-ratio: 1; }
  .board { width: 100%; height: 100%; touch-action: none; display: block; }
  .fall { position: absolute; inset: 0; display: grid; place-content: center; gap: 4px; border-radius: 50%; background: rgba(15, 17, 21, 0.55); color: #fff; pointer-events: none; }
  .fall b { font: 900 56px var(--font); } .fall span { font: 700 15px var(--font); }
  .hint { margin: 0; min-height: 22px; font: 700 15px var(--font); color: var(--text); }
  .res { margin: 0; font: 900 26px var(--font); color: var(--accent); }
  .top { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; width: min(100%, 320px); }
  .top li { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; padding: 8px 12px; border-radius: var(--r-sm); background: var(--surface-2); font: 700 15px var(--font); text-align: left; }
  .top li.me { box-shadow: inset 0 0 0 2px var(--accent); } .top em { font-style: normal; color: var(--accent); }
</style>
