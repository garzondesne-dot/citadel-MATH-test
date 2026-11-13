<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  // 💥 몬스터 공격 화면 효과 (#152 · raid/attacks.ts 등록 표) — 문제 카드 묶음(.qwrap) 위에만 · 레이아웃 0(덮개 · transform) · 문제 · 보기 · 고른 답은 안 건드림
  //   pause = 덮개 + 줄어드는 원 · glitch = 문제 글 숫자 · 기호가 2~3번 잠깐 바뀌었다 원래대로 + 색 갈라짐 · fog = 안개(문지르면 닦임)
  //   fire = 아래 불길이 보기 칸을 가림(주요 단추 자리 🧯 꾹) · smash = 카드 흔들(±6px · 기울기 · 0.8초 감쇠) · ice = 주요 단추가 얼음(BottomAction)
  //   #161 새 6 · 특수 3: confuse = 보기 칩 한 바퀴 빙글 → 제자리 · wind = 문제 글이 바람에 흩날렸다 제자리 · poison = 카드 테두리 보라 세 번 두근
  //   bind = 사슬이 카드를 감음(입력 막힘) → 좌우로 3번 쓸면 끊김 · sleep = 눈꺼풀이 위아래에서 감김 + Zzz → 두 번 빠르게 톡 = 번쩍
  //   dark = 손가락 닿은 곳만 손전등 원 · 점점 밝아짐 · mirror = 문제 글 좌우 뒤집힘 → 돌아옴 · lock = 주요 단추 🔒 + 떨어진 🗝 끌어다 꽂기 · scale = 카드가 기울었다 균형
  //   strong(분노) = 같은 효과 · 테두리 붉게(장면 띠도 붉음) · 시간은 등록 표 attackMs 가 정함
  const { kind, len, left, onclear, strong = false }: { kind: string; len: number; left: number; onclear: () => void; strong?: boolean } = $props();
  let host: HTMLDivElement;
  let cv = $state<HTMLCanvasElement | null>(null);
  const timers: ReturnType<typeof setTimeout>[] = [];
  const later = (ms: number, f: () => void) => timers.push(setTimeout(f, ms));
  onDestroy(() => timers.forEach(clearTimeout));

  // ⚡ 파지직: 문제 글(보기 · 칩 · 단추 · 답 칸 밖)의 글자 노드만 잠깐 바꿨다가 원래 값으로 (그 사이 화면이 글을 바꿨으면 건드리지 않음)
  const NOISE = '▓※#', DIG = '0123456789';
  function glitch() {
    const q = host?.closest('.qwrap'); if (!q) return;
    const nodes: Text[] = []; const w = document.createTreeWalker(q, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const el = n.parentElement; if (!el || el.closest('button, input, textarea, .row, .runepad, .gfx, [role="button"]:not(.sy)') || !n.nodeValue?.trim()) continue; nodes.push(n as Text); }
    const flick = () => {
      const saved = nodes.map((n) => n.nodeValue ?? '');
      const fake = saved.map((s) => [...s].map((ch) => (/\d/.test(ch) ? DIG[(Number(ch) + 3 + Math.floor(Math.random() * 6)) % 10] : /[∪∩⊂⊄∈∉=<>+\-×÷ᶜ]/.test(ch) ? NOISE[Math.floor(Math.random() * 3)] : ch)).join(''));
      nodes.forEach((n, i) => { n.nodeValue = fake[i]!; });
      later(110, () => nodes.forEach((n, i) => { if (n.nodeValue === fake[i]) n.nodeValue = saved[i]!; }));
    };
    const k = len >= 900 ? 3 : 2; // 깜빡임 ≤ 3번/초
    for (let i = 0; i < k; i++) later(Math.round((i * len) / k) + 30, flick);
  }
  // 🌫 안개: 캔버스 · 문지르면 그 자리 닦임 · 시간이 지나면 옅어짐 · 70% 닦으면 끝
  function fog() {
    const c = cv; if (!c) return; const r = c.getBoundingClientRect(); c.width = Math.max(1, Math.round(r.width)); c.height = Math.max(1, Math.round(r.height));
    const g = c.getContext('2d'); if (!g) return;
    const grd = g.createLinearGradient(0, 0, c.width, c.height); grd.addColorStop(0, 'rgba(210,218,230,0.96)'); grd.addColorStop(1, 'rgba(180,190,205,0.96)');
    g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.12})`; g.beginPath(); g.arc(Math.random() * c.width, Math.random() * c.height, 30 + Math.random() * 60, 0, Math.PI * 2); g.fill(); }
  }
  function rub(e: PointerEvent) {
    const c = cv; if (!c || !(e.buttons || e.pointerType === 'touch')) return; const g = c.getContext('2d'); if (!g) return; const r = c.getBoundingClientRect();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(e.clientX - r.left, e.clientY - r.top, 34, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over';
    const d = g.getImageData(0, 0, c.width, c.height).data; let on = 0; for (let i = 3; i < d.length; i += 64) if (d[i]! > 40) on++;
    if (on / (d.length / 64) < 0.3) onclear();
  }
  // ⛓ 속박: 좌우로 쓸기 — 40px 넘게 방향을 3번 바꾸면 끊김
  let sw = { x: 0, dir: 0, run: 0, flips: 0 }, cut = $state(0);
  function swipe(e: PointerEvent) {
    if (!(e.buttons || e.pointerType === 'touch')) { sw = { x: e.clientX, dir: 0, run: 0, flips: sw.flips }; return; }
    const dx = e.clientX - sw.x; sw.x = e.clientX; if (!dx) return; const d = Math.sign(dx);
    if (d === sw.dir) sw.run += Math.abs(dx); else { if (sw.run > 40) { sw.flips += 1; cut = sw.flips; } sw.dir = d; sw.run = Math.abs(dx); }
    if (sw.run > 40 && sw.flips >= 2) { cut = 3; onclear(); }
  }
  // 💤 수면: 두 번 빠르게 톡(0.35초 안) = 번쩍
  let lastTap = 0, woke = $state(false);
  function tap() { const t = performance.now(); if (t - lastTap < 350) { woke = true; later(160, onclear); } lastTap = t; }
  // 🌑 어둠: 손가락 닿은 곳만 보임 (덮개는 누름을 막지 않음 · 화면 어디를 눌러도 그 자리가 밝아짐)
  let lx = $state(-999), ly = $state(-999);
  function light(e: PointerEvent) { if (!host) return; const r = host.getBoundingClientRect(); if (e.type === 'pointerup' || e.type === 'pointercancel') { lx = ly = -999; return; } if (e.type === 'pointermove' && !(e.buttons || e.pointerType === 'touch')) return; lx = e.clientX - r.left; ly = e.clientY - r.top; }
  // 🔒 자물쇠: 문제 카드 안 아무 데나 떨어진 🗝 → 끌어서 주요 단추(🔒) 위에 놓으면 풀림
  let kx = $state(0), ky = $state(0), drag = $state(false), k0 = { x: 0, y: 0, px: 0, py: 0 };
  function kdown(e: PointerEvent) { drag = true; k0 = { x: kx, y: ky, px: e.clientX, py: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }
  function kmove(e: PointerEvent) { if (!drag) return; kx = k0.x + e.clientX - k0.px; ky = k0.y + e.clientY - k0.py; }
  function kup(e: PointerEvent) {
    if (!drag) return; drag = false; const b = document.querySelector('.act .pmain.lockd')?.getBoundingClientRect();
    if (b && e.clientX >= b.left - 12 && e.clientX <= b.right + 12 && e.clientY >= b.top - 16 && e.clientY <= b.bottom + 12) { onclear(); return; }
  }
  onMount(() => {
    if (kind === 'glitch') glitch(); if (kind === 'fog') fog();
    if (kind === 'lock' && host) { const r = host.getBoundingClientRect(); kx = Math.round(r.width * (0.2 + Math.random() * 0.55)); ky = Math.round(Math.min(r.height - 60, 40 + Math.random() * Math.max(40, r.height - 120))); }
    if (kind === 'dark') { const o = { capture: true } as const; for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) window.addEventListener(t, light as EventListener, o); return () => { for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) window.removeEventListener(t, light as EventListener, o); }; }
  });
  const p = $derived(Math.max(0, Math.min(1, left / Math.max(1, len))));
</script>

<div class="afx {kind}" class:strong bind:this={host} aria-hidden={kind !== 'pause'} style:--len="{len}ms">
  {#if kind === 'pause'}
    <div class="block" role="status" aria-live="polite">
      <svg viewBox="0 0 44 44" width="56" height="56" aria-hidden="true"><circle cx="22" cy="22" r="18" class="ring0" /><circle cx="22" cy="22" r="18" class="ring" style:animation-duration="{len}ms" /></svg>
      <b>잠깐! 막는 중</b><span>{Math.ceil(left / 1000)}초 · 고른 답은 그대로예요</span>
    </div>
  {:else if kind === 'glitch'}
    <div class="cover"></div>
  {:else if kind === 'fog'}
    <canvas bind:this={cv} class="fogc" style:opacity={0.35 + 0.65 * p} onpointermove={rub} onpointerdown={rub}></canvas>
  {:else if kind === 'fire'}
    <div class="flames" style:opacity={0.4 + 0.6 * p}><i></i><i></i><i></i><i></i><i></i></div>
  {:else if kind === 'wind'}
    <div class="gust"><i></i><i></i><i></i><i></i></div>
  {:else if kind === 'bind'}
    <div class="chains" class:c1={cut >= 1} class:c2={cut >= 2} role="button" tabindex="-1" aria-label="좌우로 쓸어 사슬 끊기" onpointermove={swipe} onpointerdown={swipe}>
      <i class="ch a"></i><i class="ch b"></i><span class="hint">↔ 좌우로 쓸어 끊기 · {Math.ceil(left / 1000)}초</span>
    </div>
  {:else if kind === 'sleep'}
    <div class="lids" class:woke role="button" tabindex="-1" aria-label="두 번 톡 눌러 깨기" onpointerdown={tap}>
      <i class="lid top"></i><i class="lid bot"></i><span class="zzz">Z<small>z</small><small>z</small></span><span class="hint">👆👆 두 번 톡 = 번쩍</span>
    </div>
  {:else if kind === 'dark'}
    <div class="darkc" style:--lx="{lx}px" style:--ly="{ly}px" style:opacity={0.45 + 0.53 * p}><span class="hint">👆 손가락을 대면 그 자리가 보여요</span></div>
  {:else if kind === 'lock'}
    <span class="key" class:drag role="button" tabindex="-1" aria-label="열쇠" style:left="{kx}px" style:top="{ky}px" onpointerdown={kdown} onpointermove={kmove} onpointerup={kup} onpointercancel={kup}>🗝</span>
  {/if}
</div>

<style>
  .afx { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
  .afx.pause, .afx.glitch, .afx.fog { pointer-events: auto; }
  .block { position: absolute; inset: 0; padding-top: 40px; border-radius: var(--r); background: rgba(8, 9, 12, 0.62); display: flex; flex-direction: column; align-items: center; gap: var(--s1); text-align: center; backdrop-filter: blur(1px); }
  .block b { font-size: 20px; color: #fff; } .block span { font-size: var(--fs-small); color: var(--text-2); }
  .ring0 { fill: none; stroke: rgba(255, 255, 255, 0.15); stroke-width: 4; }
  .ring { fill: none; stroke: var(--bad); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 113.1; stroke-dashoffset: 0; transform: rotate(-90deg); transform-origin: 22px 22px; animation: ringd linear forwards; }
  @keyframes ringd { to { stroke-dashoffset: 113.1; } }
  .cover { position: absolute; inset: 0; }
  :global(.qwrap:has(.afx.glitch)) :global(.bcard) { animation: rgbs 0.33s steps(2) 3; }
  @keyframes rgbs { 50% { text-shadow: 2px 0 rgba(255, 40, 80, 0.8), -2px 0 rgba(40, 200, 255, 0.8); } }
  .fogc { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: var(--r); touch-action: none; }
  /* 불길 = 화면 아래(주요 단추 바로 위 · 보기 칸 자리)에 고정 · 문제 글은 그대로 보임 */
  .flames { position: fixed; left: 0; right: 0; margin: 0 auto; max-width: 430px; bottom: calc(96px + env(safe-area-inset-bottom, 0px)); height: 30vh; pointer-events: auto; overflow: hidden; background: linear-gradient(transparent, rgba(255, 90, 20, 0.55) 30%, rgba(255, 60, 0, 0.92)); }
  .flames i { position: absolute; bottom: -10%; width: 26%; height: 90%; border-radius: 50% 50% 20% 20%; background: radial-gradient(ellipse at 50% 80%, #ffe08a, #ff8a1c 45%, transparent 70%); animation: fl 0.5s ease-in-out infinite alternate; }
  .flames i:nth-child(1) { left: -4%; } .flames i:nth-child(2) { left: 18%; animation-delay: 0.1s; } .flames i:nth-child(3) { left: 40%; animation-delay: 0.2s; } .flames i:nth-child(4) { left: 62%; animation-delay: 0.05s; } .flames i:nth-child(5) { left: 82%; animation-delay: 0.15s; }
  @keyframes fl { to { transform: scaleY(0.82) translateY(4%); } }
  :global(.qwrap:has(.afx.smash)) :global(.bcard) { animation: smash 0.8s ease-out; }
  @keyframes smash { 10% { transform: translateX(-6px) rotate(-1.2deg); } 25% { transform: translateX(6px) rotate(1deg); } 45% { transform: translateX(-4px) rotate(-0.6deg); } 65% { transform: translateX(3px) rotate(0.3deg); } 100% { transform: none; } }
  /* ── #161 새 효과 ── (움직임 ≤ 효과 시간 · 레이아웃 0 = transform · 덮개만) */
  .afx.strong :is(.chains, .lids, .darkc) { box-shadow: inset 0 0 0 2px var(--bad); }
  :global(.qwrap:has(.afx.confuse)) :global(:is(.opt, .chip, .rune)) { animation: spin1 0.8s ease-in-out; }
  @keyframes spin1 { to { transform: rotate(360deg); } }
  :global(.qwrap:has(.afx.wind)) :global(.bcard :is(p, .qt, .q, .q1, .q2, .story, .lab)) { animation: gust 1.1s ease-in-out; }
  @keyframes gust { 30% { transform: translateX(16px) skewX(-14deg); opacity: 0.35; filter: blur(1px); } 60% { transform: translateX(-6px) skewX(6deg); opacity: 0.7; } 100% { transform: none; } }
  .gust { position: absolute; inset: 0; overflow: hidden; border-radius: var(--r); }
  .gust i { position: absolute; left: -40%; height: 2px; width: 40%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent); animation: streak 0.9s linear 1 forwards; }
  .gust i:nth-child(1) { top: 18%; } .gust i:nth-child(2) { top: 42%; animation-delay: 0.15s; } .gust i:nth-child(3) { top: 63%; animation-delay: 0.3s; } .gust i:nth-child(4) { top: 82%; animation-delay: 0.1s; }
  @keyframes streak { to { transform: translateX(360%); } }
  :global(.qwrap:has(.afx.poison)) :global(.bcard) { animation: pz 0.6s ease-in-out 3; }
  @keyframes pz { 50% { box-shadow: 0 0 0 3px #b06cff, 0 0 18px rgba(176, 108, 255, 0.7); } }
  :global(.qwrap:has(.afx.mirror)) :global(.bcard :is(p, .qt, .q, .q1, .q2, .story)) { animation: mir var(--len, 2000ms) steps(1) 1; }
  @keyframes mir { 0% { transform: none; } 8% { transform: scaleX(-1); } 92% { transform: scaleX(-1); } 100% { transform: none; } }
  :global(.qwrap:has(.afx.scale)) :global(.bcard) { transform-origin: 50% 100%; animation: tilt 1.6s ease-out; }
  @keyframes tilt { 15% { transform: rotate(-4deg); } 40% { transform: rotate(3deg); } 65% { transform: rotate(-1.5deg); } 85% { transform: rotate(0.6deg); } 100% { transform: none; } }
  .chains { position: absolute; inset: 0; pointer-events: auto; touch-action: none; border-radius: var(--r); background: rgba(8, 9, 12, 0.35); overflow: hidden; }
  .ch { position: absolute; left: -10%; right: -10%; height: 18px; top: 45%; background: repeating-linear-gradient(90deg, #c9c9d6 0 14px, #6d6f7d 14px 18px, transparent 18px 22px); border-radius: 9px; box-shadow: 0 2px 0 #000; transition: opacity 0.15s, transform 0.15s; }
  .ch.a { transform: rotate(-24deg); } .ch.b { transform: rotate(24deg); }
  .chains.c1 .ch.a { opacity: 0.35; transform: rotate(-24deg) translateY(-10px); } .chains.c2 .ch.b { opacity: 0.35; transform: rotate(24deg) translateY(10px); }
  .hint { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); padding: 4px 10px; border-radius: 12px; background: rgba(8, 9, 12, 0.8); color: #fff; font-size: var(--fs-small); font-weight: 700; white-space: nowrap; }
  .lids { position: fixed; inset: 0; z-index: 6; max-width: 430px; margin: 0 auto; pointer-events: auto; touch-action: manipulation; overflow: hidden; }
  .lid { position: absolute; left: 0; right: 0; height: 52%; background: linear-gradient(#1a1220, #2a1d30); }
  .lid.top { top: 0; transform: translateY(-100%); border-radius: 0 0 50% 50% / 0 0 30% 30%; animation: lidT var(--len, 3000ms) ease-in-out forwards; }
  .lid.bot { bottom: 0; transform: translateY(100%); border-radius: 50% 50% 0 0 / 30% 30% 0 0; animation: lidB var(--len, 3000ms) ease-in-out forwards; }
  @keyframes lidT { 18% { transform: translateY(-38%); } 30% { transform: translateY(-58%); } 40% { transform: translateY(-34%); } 52% { transform: translateY(-12%); } 100% { transform: translateY(-8%); } }
  @keyframes lidB { 18% { transform: translateY(38%); } 30% { transform: translateY(58%); } 40% { transform: translateY(34%); } 52% { transform: translateY(12%); } 100% { transform: translateY(8%); } }
  .lids.woke .lid.top { animation: none; transform: translateY(-100%); transition: transform 0.15s ease-out; } .lids.woke .lid.bot { animation: none; transform: translateY(100%); transition: transform 0.15s ease-out; }
  .zzz { position: absolute; right: 18%; top: 34%; color: #cfd6ff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 0 #000; } .zzz small { font-size: 0.7em; margin-left: 2px; }
  .lids .hint { bottom: auto; top: 50%; transform: translate(-50%, -50%); }
  .darkc { position: absolute; inset: 0; border-radius: var(--r); pointer-events: none; background: radial-gradient(circle 70px at var(--lx) var(--ly), transparent 0 55%, rgba(4, 4, 8, 0.97) 100%); }
  .darkc .hint { top: 12px; bottom: auto; }
  .key { position: absolute; z-index: 7; width: 48px; height: 48px; margin: -24px 0 0 -24px; display: grid; place-items: center; font-size: 32px; pointer-events: auto; touch-action: none; cursor: grab; filter: drop-shadow(0 2px 0 #000) drop-shadow(0 0 6px rgba(245, 184, 74, 0.9)); }
  .key.drag { cursor: grabbing; transform: scale(1.15); }
  .afx.sleep { z-index: 7; }
  .afx.lock, .afx.dark, .afx.wind, .afx.mirror, .afx.scale, .afx.poison, .afx.confuse { pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { :global(.qwrap) :global(.bcard) { animation: none !important; } }
</style>
