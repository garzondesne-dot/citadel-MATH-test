<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import { AK, powerOf, predict, rankAk, viewAt, type Ak, type Stone } from '../../rest/alkkagi';
  import { akJoin, akShoot } from '../../rest/run';
  import { drawAk, fitCam, type Cam, type Dust } from './akDraw';
  // 🥏 알까기 난장판 · 학생 폰 (📜 2026-11-24 · 에셋 방 2 시안 v3 alk-ph-1 ~ 3): 모이기 = 「참가」
  //   판 = 내 알을 따라가는 창(판 가운데 쪽으로 40% 당김 · 알 지름 59px) · 왼쪽 ＋ / － / ⛶ 전체 · 두 손가락 = 판만 확대 · 축소 · 창 밖 알 = 가장자리 ▶ + 이름
  //   판 어디든 눌러 뒤로 당겼다 놓기(새총 · 당긴 길이 = 세기 3단 · 화면 px) · 점선(멈출 자리 · 처음 부딪히는 알과 밀려갈 방향 · 판 밖 = 빨강) · 쏜 뒤 4초 = 파란 고리
  //   떨어지면 판 어둡게 「3 · 2 · 1」 + 누가 떨어뜨렸는지 · 떨어진 자리 = 코드 먼지
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
  /** 보기: follow = 내 알 따라가기 · all = 판 전체 · zoom = ＋ / － / 두 손가락 배율 */
  let mode = $state<'follow' | 'all'>('follow'), zoom = $state(1);
  const me = $derived(f.st?.[uid]);
  const ar = $derived(f.ar ?? AK.r);
  const mine = () => view[uid];
  const canShoot = () => { const s = mine(); return f.phase === 'play' && !!s?.on && s.cd <= 1e-6 && sent <= (me?.n ?? 0); };
  let fallMsg = $state(''), lastFallT = -1;
  $effect(() => { const e = [...(f.ev || [])].reverse().find((x) => x.k === 'fall' && x.u === uid); if (e && e.k === 'fall' && e.t !== lastFallT) { lastFallT = e.t; fallMsg = e.by ? `${nick(e.by)}이(가) 떨어뜨렸어요` : '혼자 떨어졌어요'; } });
  // 💨 먼지 = 이번 박자 안에서 떨어진 알 (그 자리 · 그 순간)
  let dust: Dust[] = [], seenFall = new Set<string>();
  const dpr = () => Math.min(2, devicePixelRatio || 1);
  let camNow: Cam = { cx: 0, cy: 0, k: 1 };
  function camOf(W: number, H: number): Cam {
    const fit = fitCam(W, H, f.R);
    if (mode === 'all' || !mine()?.on) return { ...fit, k: fit.k * (mode === 'all' ? zoom : 1) };
    const s = mine()!, k = Math.max(fit.k, ((59 * dpr()) / (2 * ar)) * zoom);
    return { cx: s.x * 0.6, cy: s.y * 0.6, k };
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    const c = cv; if (!c) return; fit(c); const g = c.getContext('2d'); if (!g) return;
    const W = c.width, H = c.height, t = S.now(), v = viewAt(f, t);
    view = v.st;
    for (const e of v.ev) if (e.k === 'fall' && e.x != null) { const key = `${f.beat}|${e.u}|${e.t}`; if (!seenFall.has(key)) { seenFall.add(key); dust.push({ x: e.x, y: e.y ?? 0, t0: performance.now() }); } }
    dust = dust.filter((d) => performance.now() - d.t0 < 800);
    const cam = (camNow = camOf(W, H));
    let path = null;
    if (drag && canShoot()) {
      const dx = (drag.x - drag.cx) / dpr(), dy = (drag.y - drag.cy) / dpr(), p = powerOf(Math.hypot(dx, dy));
      if (p >= 0) path = predict(view, f.R, uid, Math.atan2(dy, dx), p, ar);
    }
    const s = mine();
    drawAk(g, W, H, f.R, view, { me: uid, crown: f.crown, path, ar, cam, dpr: dpr(), edges: mode === 'follow', dust, now: performance.now(), ring: s?.on ? 1 - Math.min(1, s.cd / AK.cool) : undefined, label: (u) => (u === uid ? '나' : nick(u)) });
  }
  /** 캔버스 = 보이는 크기 × 화면 배율(최대 2) */
  const fit = (c: HTMLCanvasElement) => { const r = c.getBoundingClientRect(), d = dpr(), w = Math.round(r.width * d), h = Math.round(r.height * d); if (w && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; } };
  onMount(() => { raf = requestAnimationFrame(frame); });
  onDestroy(() => cancelAnimationFrame(raf));

  const pt = (e: PointerEvent) => { const r = cv!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv!.width, y: ((e.clientY - r.top) / r.height) * cv!.height }; };
  // 👆 한 손가락 = 당기기 · 두 손가락 = 판만 확대 · 축소 (페이지 확대는 touch-action: none 으로 막힘 그대로)
  const ptrs = new Map<number, { x: number; y: number }>(); let pinch0 = 0, zoom0 = 1;
  const clampZ = (z: number) => Math.max(0.5, Math.min(2.5, z));
  function down(e: PointerEvent) {
    const p = pt(e); ptrs.set(e.pointerId, p); (e.target as Element).setPointerCapture?.(e.pointerId);
    if (ptrs.size === 2) { drag = null; const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a!.x - b!.x, a!.y - b!.y); zoom0 = zoom; return; }
    if (mode === 'all' && mine()?.on) { const s = mine()!, sx = cv!.width / 2 + (s.x - camNow.cx) * camNow.k, sy = cv!.height / 2 + (s.y - camNow.cy) * camNow.k; if (Math.hypot(p.x - sx, p.y - sy) < ar * camNow.k * 1.6) { mode = 'follow'; zoom = 1; return; } } // 내 알을 누르면 다시 따라가기
    if (!canShoot()) return; drag = { x: p.x, y: p.y, cx: p.x, cy: p.y };
  }
  function move(e: PointerEvent) {
    if (!ptrs.has(e.pointerId)) return; const p = pt(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; zoom = clampZ((zoom0 * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / pinch0); return; }
    if (drag) drag = { ...drag, cx: p.x, cy: p.y };
  }
  function up(e: PointerEvent) {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0;
    const d = drag; drag = null; if (!d || !canShoot() || !cv) return;
    const dx = (d.x - d.cx) / dpr(), dy = (d.y - d.cy) / dpr(), p = powerOf(Math.hypot(dx, dy));
    if (p < 0) return;
    const n = (me?.n ?? 0) + 1; sent = n; akShoot(S, code, f.g, uid, { a: Math.atan2(dy, dx), p, n });
    try { navigator.vibrate?.(25); } catch { /* 없음 */ }
  }
  const isOut = $derived(!!(f as Ak & { out?: Record<string, true> }).out?.[uid]); // 📵 #14 이 판 아웃 = 되살아나기 숫자 · 안내 없음
  const backIn = $derived(me && !me.on && !isOut ? Math.max(1, Math.ceil(me.back + 1)) : 0);
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
        <canvas bind:this={cv} class="board" data-k="ak-board" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={(e) => { ptrs.delete(e.pointerId); drag = null; }} aria-label="알까기 판 · 눌러서 뒤로 당겼다 놓아요"></canvas>
        <div class="zoom" data-k="ak-zoom"><button type="button" aria-label="확대" onclick={() => (zoom = clampZ(zoom * 1.25))}>＋</button><button type="button" aria-label="축소" onclick={() => (zoom = clampZ(zoom / 1.25))}>－</button><button type="button" class:on={mode === 'all'} aria-label="판 전체" data-k="ak-all" onclick={() => { mode = mode === 'all' ? 'follow' : 'all'; zoom = 1; }}>⛶</button></div>
        {#if mode === 'all'}<p class="tip">내 알을 누르면 다시 따라가요</p>{/if}
        {#if backIn}<div class="fall" data-k="ak-fall"><b>{backIn}</b><span>{fallMsg || '떨어졌어요'}</span></div>{/if}
      </div>
      <p class="hint" data-k="ak-hint">{f.phase === 'ready' ? '곧 시작해요' : isOut ? '📵 이번 판은 끝 · 친구들 판을 구경해요' : !me.on ? '곧 다시 나와요 (나온 뒤 2초 무적)' : sent > me.n ? '🚀 날아가는 중…' : me.cd > 0 ? `🔄 ${Math.ceil(me.cd)}초 쉬는 중` : '👆 판을 누르고 뒤로 당겼다 놓아요'}</p>
      <ol class="top">{#each top as u, i (u)}<li class:me={u === uid}><b>{i + 1}</b><span>{nick(u)}{f.crown === u ? ' 👑' : ''}</span><em>{f.sc?.[u] ?? 0}점</em></li>{/each}</ol>
    {/if}
  {/if}
</div>

<style>
  .ak { display: flex; flex-direction: column; align-items: center; gap: var(--s3); width: 100%; text-align: center; }
  .band { margin: 0; font: 800 16px var(--font); color: var(--text); } .sc { color: var(--accent); }
  .rule { margin: 0; font: 600 15px/1.5 var(--font); color: var(--text-2); } .ok { margin: 0; font: 700 16px var(--font); color: var(--ok); }
  .big { min-height: 64px; padding: 0 var(--s6); border-radius: var(--r); border: 0; background: var(--accent); color: var(--on-accent); font: 900 22px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .wrap { position: relative; width: min(100vw, 560px); margin-inline: calc((100% - min(100vw, 560px)) / 2); aspect-ratio: 1; } /* 🔨 #17 폰 = 원판이 화면 폭 꽉 (옆 여백까지 · 넓은 화면은 560) */
  .board { width: 100%; height: 100%; touch-action: none; display: block; border-radius: 0; background: #1a1410; }
  .zoom { position: absolute; left: 8px; top: 8px; display: grid; gap: 6px; }
  .zoom button { width: 44px; height: 44px; border-radius: var(--r-sm); border: 1px solid var(--line); background: rgba(15, 17, 21, 0.78); color: #fff; font: 800 20px var(--font); box-shadow: 0 3px 0 var(--press-sh); } .zoom button.on { background: var(--accent); color: var(--on-accent); }
  .tip { position: absolute; left: 0; right: 0; bottom: 8px; margin: 0; text-align: center; font: 700 14px var(--font); color: #fff; text-shadow: 0 1px 2px #000; pointer-events: none; }
  .fall { position: absolute; inset: 0; display: grid; place-content: center; gap: 4px; border-radius: var(--r); background: rgba(15, 17, 21, 0.62); color: #fff; pointer-events: none; }
  .fall b { font: 900 56px var(--font); } .fall span { font: 700 15px var(--font); }
  .hint { margin: 0; min-height: 22px; font: 700 15px var(--font); color: var(--text); }
  .res { margin: 0; font: 900 26px var(--font); color: var(--accent); }
  .top { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; width: min(100%, 320px); }
  .top li { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; padding: 8px 12px; border-radius: var(--r-sm); background: var(--surface-2); font: 700 15px var(--font); text-align: left; }
  .top li.me { box-shadow: inset 0 0 0 2px var(--accent); } .top em { font-style: normal; color: var(--accent); }
</style>
