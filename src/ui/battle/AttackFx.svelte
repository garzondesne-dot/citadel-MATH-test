<script lang="ts">
  import { SUBJ } from "../../engine/subject";
  import { onDestroy, onMount } from 'svelte';
  import ChainFx from './ChainFx.svelte';
  import { fx } from './fx.svelte';
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
  const NOISE = '▓※#', DIG = '0123456789', SYMS = SUBJ.glitchSyms ?? ''; // 바꾸는 기호 = 과목 팩 (⚙ 스위치 틀)
  function glitch() {
    const q = host?.closest('.qwrap'); if (!q) return;
    const nodes: Text[] = []; const w = document.createTreeWalker(q, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const el = n.parentElement; if (!el || el.closest('button, input, textarea, .row, .runepad, .gfx, [role="button"]:not(.sy)') || !n.nodeValue?.trim()) continue; nodes.push(n as Text); }
    const flick = () => {
      const saved = nodes.map((n) => n.nodeValue ?? '');
      const fake = saved.map((s) => [...s].map((ch) => (/\d/.test(ch) ? DIG[(Number(ch) + 3 + Math.floor(Math.random() * 6)) % 10] : SYMS.includes(ch) ? NOISE[Math.floor(Math.random() * 3)] : ch)).join(''));
      nodes.forEach((n, i) => { n.nodeValue = fake[i]!; });
      later(110, () => nodes.forEach((n, i) => { if (n.nodeValue === fake[i]) n.nodeValue = saved[i]!; }));
    };
    const k = len >= 900 ? 3 : 2; // 깜빡임 ≤ 3번/초
    for (let i = 0; i < k; i++) later(Math.round((i * len) / k) + 30, flick);
  }
  // 🌀 혼란 (📜 2026-11-13 밤 다시): 문제 칸이 어지럽게 출렁 + 보기 칸이 둘씩 비틀거리며 서로 자리를 바꿨다 돌아옴 (보이기만 · 고른 답 · 누름은 그대로)
  function confuse() {
    const q = host?.closest('.qwrap') as HTMLElement | null; if (!q) return;
    q.style.setProperty('--clen', `${len}ms`); q.classList.add('cwob'); later(len, () => q.classList.remove('cwob'));
    const os = [...q.querySelectorAll<HTMLElement>('.bcard :is(.opt, .chip, .rune)')].filter((e) => e.offsetParent && e.getBoundingClientRect().width > 0);
    const R = (e: HTMLElement) => e.getBoundingClientRect();
    for (let i = 0; i + 1 < os.length; i += 2) {
      const a = os[i]!, b = os[i + 1]!, ra = R(a), rb = R(b), dx = rb.left - ra.left, dy = rb.top - ra.top;
      for (const [el, x, y, k] of [[a, dx, dy, 1], [b, -dx, -dy, -1]] as const) { el.style.setProperty('--sx', `${x}px`); el.style.setProperty('--sy', `${y}px`); el.style.setProperty('--sk', String(k)); el.style.setProperty('--clen', `${len}ms`); el.classList.add('cswap'); }
    }
    later(len, () => os.forEach((e) => e.classList.remove('cswap')));
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
    if (fx.chain.broken) return;
    if (d === sw.dir) sw.run += Math.abs(dx); else { if (sw.run > 40) { sw.flips += 1; cut = sw.flips; fx.chain.cut = Math.min(2, cut); } sw.dir = d; sw.run = Math.abs(dx); }
    if (sw.run > 40 && sw.flips >= 2) { cut = 3; shatter(); }
  }
  // ⛓ 끊김 = 사슬이 조각조각 부서져 흩어진 뒤(0.45초) 풀림 · 카드 · 노란 단추 함께
  function shatter() { fx.chain.broken = true; later(450, onclear); }
  // 💤 수면: 두 번 빠르게 톡(0.35초 안) = 번쩍
  let lastTap = 0, woke = $state(false);
  function tap() { const t = performance.now(); if (t - lastTap < 350) { woke = true; later(160, onclear); } lastTap = t; }
  // 🌑 어둠: 손가락 닿은 곳만 보임 (덮개는 누름을 막지 않음 · 화면 어디를 눌러도 그 자리가 밝아짐)
  let lx = $state(-999), ly = $state(-999);
  function light(e: PointerEvent) { if (!host) return; const r = host.getBoundingClientRect(); if (e.type === 'pointerup' || e.type === 'pointercancel') { lx = ly = -999; return; } if (e.type === 'pointermove' && !(e.buttons || e.pointerType === 'touch')) return; lx = e.clientX - r.left; ly = e.clientY - r.top; }
  // 🔒 자물쇠: 문제 카드 안 아무 데나 떨어진 🗝 → 끌어서 주요 단추(🔒) 위에 놓으면 풀림
  let kx = $state(0), ky = $state(0), drag = $state(false), inserted = $state(false), k0 = { x: 0, y: 0, px: 0, py: 0 };
  function kdown(e: PointerEvent) { drag = true; k0 = { x: kx, y: ky, px: e.clientX, py: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }
  function kmove(e: PointerEvent) { if (!drag) return; kx = k0.x + e.clientX - k0.px; ky = k0.y + e.clientY - k0.py; }
  function kup(e: PointerEvent) {
    if (!drag) return; drag = false; const b = document.querySelector('.act .pmain.lockd')?.getBoundingClientRect();
    if (b && e.clientX >= b.left - 12 && e.clientX <= b.right + 12 && e.clientY >= b.top - 16 && e.clientY <= b.bottom + 12) { inserted = true; fx.chain.open = true; later(260, shatter); return; } // 🗝 꽂음 → 자물쇠 고리 튕김 → 사슬 부서짐
  }
  onMount(() => {
    if (kind === 'glitch') glitch(); if (kind === 'fog') fog(); if (kind === 'confuse') confuse();
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
    <!-- 🔥 화염 (📜 2026-11-13 밤 다시 · 「너무 단조로움」): 불길 세 겹(뒤 붉은 · 가운데 주황 · 앞 노랑 · 혀마다 다른 박자로 일렁) + 불똥이 튀어 오름 + 문제 칸 가장자리 그을음 · 끄기 = 노란 단추 🧯 꾹(연기는 BottomAction) -->
    <div class="flames" style:opacity={0.45 + 0.55 * p}>
      {#each ['back', 'mid', 'front'] as ly (ly)}<div class="fl {ly}">{#each Array.from({ length: 7 }, (_, i) => i) as i (i)}<i style:left="{-6 + i * 15.5}%" style:animation-delay="{((i * 37) % 9) * 0.06}s" style:animation-duration="{0.38 + ((i * 13) % 5) * 0.06}s"></i>{/each}</div>{/each}
      {#each Array.from({ length: 14 }, (_, i) => i) as i (i)}<b class="ember" style:left="{4 + ((i * 53) % 92)}%" style:animation-delay="{((i * 29) % 13) * 0.11}s" style:animation-duration="{0.9 + ((i * 7) % 5) * 0.18}s"></b>{/each}
    </div>
  {:else if kind === 'poison'}
    <!-- ☠ 독 (📜 2026-11-13 밤 다시 · 「공격 이펙트랑 안 어울림」): 문제 칸 위에서 보라 · 초록 독이 줄줄 흘러내리고 방울이 떨어짐 · 위에 고인 독에서 거품이 부풀다 톡 터짐 -->
    <div class="pois">
      <i class="slime"></i>
      {#each Array.from({ length: 9 }, (_, i) => i) as i (i)}<i class="drip" class:g={i % 3 === 1} style:left="{4 + i * 11 + ((i * 7) % 5)}%" style:--h="{34 + ((i * 37) % 80)}px" style:animation-delay="{((i * 13) % 7) * 0.09}s"><b></b></i>{/each}
      {#each Array.from({ length: 7 }, (_, i) => i) as i (i)}<i class="bub" class:g={i % 2 === 0} style:left="{6 + ((i * 41) % 86)}%" style:--s="{12 + ((i * 17) % 14)}px" style:animation-delay="{0.5 + ((i * 23) % 11) * 0.12}s"></i>{/each}
    </div>
  {:else if kind === 'wind'}
    <div class="gust"><i></i><i></i><i></i><i></i></div>
  {:else if kind === 'bind'}
    <div class="chains" role="button" tabindex="-1" aria-label="좌우로 쓸어 사슬 끊기" onpointermove={swipe} onpointerdown={swipe}>
      <ChainFx cut={Math.min(2, cut)} broken={fx.chain.broken} />{#if !fx.chain.broken}<span class="hint">↔ 좌우로 쓸어 끊기 · {Math.ceil(left / 1000)}초</span>{/if}
    </div>
  {:else if kind === 'sleep'}
    <div class="lids" class:woke role="button" tabindex="-1" aria-label="두 번 톡 눌러 깨기" onpointerdown={tap}>
      <i class="lid top"></i><i class="lid bot"></i><span class="zzz">Z<small>z</small><small>z</small></span><span class="hint">👆👆 두 번 톡 = 번쩍</span>
    </div>
  {:else if kind === 'dark'}
    <!-- 🌑 어둠 (📜 2026-11-13 밤 다시 · 「눈앞을 가리는 거니까 느낌을 잘 살려 줘」): 검은 먹물 덩어리가 가장자리 · 귀퉁이에서 번져 들어와 덮고 연기가 일렁임 · 손가락 닿은 곳만 동그랗게 보임 -->
    <div class="darkc" style:--lx="{lx}px" style:--ly="{ly}px" style:opacity={Math.min(1, 0.35 + 1.3 * p)}>
      <i class="ink k1"></i><i class="ink k2"></i><i class="ink k3"></i><i class="ink k4"></i><i class="ink k5"></i><i class="ink k6"></i><i class="smoke"></i>
    </div>
    <span class="hint dh">👆 손가락을 대면 그 자리가 보여요</span>
  {:else if kind === 'lock'}
    {#if !inserted}<span class="key" class:drag role="button" tabindex="-1" aria-label="열쇠" style:left="{kx}px" style:top="{ky}px" onpointerdown={kdown} onpointermove={kmove} onpointerup={kup} onpointercancel={kup}>🗝</span>{/if}
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
  :global(.qwrap:has(.afx.smash)) :global(.bcard) { animation: smash 0.8s ease-out; }
  @keyframes smash { 10% { transform: translateX(-6px) rotate(-1.2deg); } 25% { transform: translateX(6px) rotate(1deg); } 45% { transform: translateX(-4px) rotate(-0.6deg); } 65% { transform: translateX(3px) rotate(0.3deg); } 100% { transform: none; } }
  /* ── #161 새 효과 ── (움직임 ≤ 효과 시간 · 레이아웃 0 = transform · 덮개만) */
  .afx.strong :is(.chains, .lids, .darkc) { box-shadow: inset 0 0 0 2px var(--bad); }
  :global(.qwrap:has(.afx.wind)) :global(.bcard :is(p, .qt, .q, .q1, .q2, .story, .lab)) { animation: gust 1.1s ease-in-out; }
  @keyframes gust { 30% { transform: translateX(16px) skewX(-14deg); opacity: 0.35; filter: blur(1px); } 60% { transform: translateX(-6px) skewX(6deg); opacity: 0.7; } 100% { transform: none; } }
  .gust { position: absolute; inset: 0; overflow: hidden; border-radius: var(--r); }
  .gust i { position: absolute; left: -40%; height: 2px; width: 40%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent); animation: streak 0.9s linear 1 forwards; }
  .gust i:nth-child(1) { top: 18%; } .gust i:nth-child(2) { top: 42%; animation-delay: 0.15s; } .gust i:nth-child(3) { top: 63%; animation-delay: 0.3s; } .gust i:nth-child(4) { top: 82%; animation-delay: 0.1s; }
  @keyframes streak { to { transform: translateX(360%); } }
  :global(.qwrap:has(.afx.mirror)) :global(.bcard :is(p, .qt, .q, .q1, .q2, .story)) { animation: mir var(--len, 2000ms) steps(1) 1; }
  @keyframes mir { 0% { transform: none; } 8% { transform: scaleX(-1); } 92% { transform: scaleX(-1); } 100% { transform: none; } }
  :global(.qwrap:has(.afx.scale)) :global(.bcard) { transform-origin: 50% 100%; animation: tilt 1.6s ease-out; }
  @keyframes tilt { 15% { transform: rotate(-4deg); } 40% { transform: rotate(3deg); } 65% { transform: rotate(-1.5deg); } 85% { transform: rotate(0.6deg); } 100% { transform: none; } }
  .chains { position: absolute; inset: 0; pointer-events: auto; touch-action: none; border-radius: var(--r); background: rgba(8, 9, 12, 0.35); overflow: visible; }
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
  .key { position: absolute; z-index: 7; width: 48px; height: 48px; margin: -24px 0 0 -24px; display: grid; place-items: center; font-size: 32px; pointer-events: auto; touch-action: none; cursor: grab; filter: drop-shadow(0 2px 0 #000) drop-shadow(0 0 6px rgba(245, 184, 74, 0.9)); }
  .key.drag { cursor: grabbing; transform: scale(1.15); }
  .afx.sleep { z-index: 7; }
  .afx.lock, .afx.dark, .afx.wind, .afx.mirror, .afx.scale, .afx.poison, .afx.confuse { pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { :global(.qwrap) :global(.bcard) { animation: none !important; } }
  /* 🌀 혼란: 출렁(기울기 · 기울어짐 · 색 살짝 돌기) · 보기 자리 바꿈(비틀 → 남의 자리 → 비틀 → 제자리) */
  :global(.qwrap.cwob) { animation: cwob var(--clen, 3000ms) ease-in-out; transform-origin: 50% 40%; }
  @keyframes cwob { 0%, 100% { transform: none; filter: none; } 12% { transform: rotate(-1.6deg) skewX(3deg); filter: hue-rotate(25deg); } 26% { transform: rotate(1.4deg) skewX(-3deg) translateX(4px); } 40% { transform: rotate(-1deg) skewX(2deg); filter: hue-rotate(-20deg); } 55% { transform: rotate(1.2deg) skewX(-2deg) translateX(-4px); } 70% { transform: rotate(-0.8deg) skewX(1.5deg); } 85% { transform: rotate(0.5deg); filter: none; } }
  :global(.cswap) { position: relative; z-index: 2; animation: cswap var(--clen, 3000ms) cubic-bezier(0.5, 0, 0.4, 1) both; }
  @keyframes cswap { 0% { transform: none; } 14% { transform: translate(calc(var(--sx) * 0.15), -10px) rotate(calc(var(--sk) * -9deg)); } 30% { transform: translate(var(--sx), var(--sy)) rotate(calc(var(--sk) * 5deg)); } 45% { transform: translate(var(--sx), var(--sy)) rotate(calc(var(--sk) * -4deg)); } 62% { transform: translate(var(--sx), var(--sy)) rotate(calc(var(--sk) * 3deg)); } 80% { transform: translate(calc(var(--sx) * 0.4), calc(var(--sy) * 0.4 + 8px)) rotate(calc(var(--sk) * -7deg)); } 100% { transform: none; } }
  @media (prefers-reduced-motion: reduce) { :global(.qwrap.cwob), :global(.cswap) { animation: none; } }
  /* 🌑 어둠: 먹물(가장자리 · 귀퉁이 덩어리가 0.9초 동안 번져 커짐) + 연기(느리게 일렁) · 손전등 = 덮개 전체에 구멍(mask) */
  .darkc { position: absolute; inset: -6px; border-radius: var(--r); pointer-events: none; overflow: hidden; -webkit-mask: radial-gradient(circle 78px at calc(var(--lx) + 6px) calc(var(--ly) + 6px), transparent 0 52%, #000 88%); mask: radial-gradient(circle 78px at calc(var(--lx) + 6px) calc(var(--ly) + 6px), transparent 0 52%, #000 88%); background: rgba(3, 3, 7, 0.0); animation: dbase 0.7s 0.15s ease-in forwards; }
  @keyframes dbase { to { background: rgba(2, 2, 5, 0.985); } }
  .ink { position: absolute; width: 80%; aspect-ratio: 1; border-radius: 46% 54% 52% 48% / 55% 45% 55% 45%; background: radial-gradient(circle at 50% 50%, #020205 0 45%, rgba(2, 2, 5, 0.85) 60%, transparent 72%); transform: scale(0.1); animation: ink 0.9s cubic-bezier(0.3, 0.6, 0.4, 1) forwards, wob 2.4s 0.9s ease-in-out infinite alternate; filter: blur(2px); }
  .k1 { left: -30%; top: -30%; } .k2 { right: -30%; top: -25%; animation-delay: 0.08s, 1s; } .k3 { left: -35%; bottom: -30%; animation-delay: 0.15s, 1.1s; } .k4 { right: -30%; bottom: -35%; animation-delay: 0.05s, 0.95s; } .k5 { left: 30%; top: -45%; animation-delay: 0.2s, 1.2s; } .k6 { left: 25%; bottom: -45%; animation-delay: 0.12s, 1.05s; }
  @keyframes ink { 0% { transform: scale(0.1) rotate(0); } 55% { transform: scale(2) rotate(25deg); } 100% { transform: scale(2.9) rotate(40deg); } }
  @keyframes wob { from { border-radius: 46% 54% 52% 48% / 55% 45% 55% 45%; } to { border-radius: 55% 45% 44% 56% / 46% 56% 44% 54%; } }
  .smoke { position: absolute; inset: -20%; background: radial-gradient(circle at 20% 30%, rgba(60, 50, 80, 0.35), transparent 30%), radial-gradient(circle at 75% 60%, rgba(50, 40, 70, 0.3), transparent 32%), radial-gradient(circle at 40% 85%, rgba(70, 60, 90, 0.28), transparent 28%); filter: blur(10px); opacity: 0; animation: smk 6s linear infinite, sin 0.9s 0.4s forwards; }
  @keyframes smk { to { transform: translate(8%, -6%) rotate(12deg); } } @keyframes sin { to { opacity: 1; } }
  .hint.dh { top: 12px; bottom: auto; z-index: 2; }
  @media (prefers-reduced-motion: reduce) { .ink, .smoke { animation: none; transform: scale(2.3); opacity: 1; } .darkc { animation: none; background: rgba(3, 3, 7, 0.94); } }
  /* 🔥 화염 */
  .flames { position: fixed; left: 0; right: 0; margin: 0 auto; max-width: 430px; bottom: calc(96px + env(safe-area-inset-bottom, 0px)); height: 32vh; pointer-events: auto; overflow: hidden; background: linear-gradient(transparent, rgba(120, 20, 0, 0.35) 25%, rgba(255, 70, 10, 0.75) 70%, rgba(255, 120, 20, 0.95)); }
  .fl { position: absolute; inset: 0; }
  .fl i { position: absolute; bottom: -12%; width: 22%; height: 85%; border-radius: 50% 50% 22% 22% / 62% 62% 38% 38%; transform-origin: 50% 100%; animation: tongue 0.45s ease-in-out infinite alternate; }
  .fl.back i { height: 100%; width: 26%; background: radial-gradient(ellipse at 50% 85%, #ff5a1a, #b3200a 50%, transparent 72%); opacity: 0.9; }
  .fl.mid i { height: 78%; background: radial-gradient(ellipse at 50% 85%, #ffb347, #ff6a14 50%, transparent 72%); margin-left: 4%; }
  .fl.front i { height: 52%; width: 16%; background: radial-gradient(ellipse at 50% 88%, #fffbe0, #ffe066 40%, #ff9a1c 60%, transparent 74%); margin-left: 7%; mix-blend-mode: screen; }
  @keyframes tongue { 0% { transform: scaleY(1) skewX(-4deg) translateX(0); } 50% { transform: scaleY(0.82) skewX(5deg) translateX(3%); } 100% { transform: scaleY(1.12) skewX(-2deg) translateX(-2%); } }
  .ember { position: absolute; bottom: 8%; width: 4px; height: 4px; border-radius: 1px; background: #ffd27a; box-shadow: 0 0 6px #ff8a1c; animation: ember 1.1s ease-out infinite; }
  @keyframes ember { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 70% { opacity: 0.9; } 100% { transform: translate(14px, -26vh) scale(0.4); opacity: 0; } }
  :global(.qwrap:has(.afx.fire)) :global(.bcard) { box-shadow: inset 0 -40px 40px -20px rgba(30, 8, 0, 0.85), inset 0 0 0 2px rgba(120, 40, 0, 0.6); animation: heat 0.18s steps(2) infinite; }
  @keyframes heat { 50% { filter: brightness(1.04) contrast(1.02); } }
  @media (prefers-reduced-motion: reduce) { .fl i, .ember { animation: none; } .ember { display: none; } :global(.qwrap:has(.afx.fire)) :global(.bcard) { animation: none; } }
  /* ☠ 독 */
  .pois { position: absolute; inset: 0; border-radius: var(--r); overflow: hidden; pointer-events: none; }
  .slime { position: absolute; left: -4%; right: -4%; top: -14px; height: 30px; background: radial-gradient(ellipse at 20% 100%, #8a3cff 0 40%, transparent 41%) 0 0 / 18% 100% repeat-x, linear-gradient(#5a1a9e, #8a3cff); filter: drop-shadow(0 2px 3px rgba(100, 255, 120, 0.4)); animation: slin 0.35s ease-out both; }
  @keyframes slin { from { transform: translateY(-100%); } to { transform: none; } }
  .drip { position: absolute; top: 8px; width: 9px; height: 0; opacity: 0.9; border-radius: 0 0 6px 6px; background: linear-gradient(#8a3cff, #a35bff 60%, #b97aff); box-shadow: inset -2px 0 0 rgba(255, 255, 255, 0.25); animation: drip 1.1s cubic-bezier(0.5, 0, 0.7, 1) forwards; }
  .drip.g { background: linear-gradient(#2fbf4a, #5be36d 60%, #8bff9a); }
  .drip b { position: absolute; left: 50%; bottom: -8px; width: 11px; height: 13px; margin-left: -5.5px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: inherit; animation: drop 0.6s 1.1s ease-in forwards; }
  @keyframes drip { to { height: var(--h); } }
  @keyframes drop { to { transform: translateY(220px); opacity: 0; } }
  .bub { position: absolute; top: 4px; width: var(--s); height: var(--s); border-radius: 50%; border: 2px solid rgba(220, 180, 255, 0.95); background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.7) 0 18%, rgba(170, 90, 255, 0.55) 40%, rgba(120, 40, 220, 0.4)); transform: scale(0); animation: bub 1.1s ease-in infinite; }
  .bub.g { border-color: rgba(170, 255, 180, 0.95); background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.7) 0 18%, rgba(90, 230, 110, 0.55) 40%, rgba(30, 160, 60, 0.4)); }
  @keyframes bub { 0% { transform: translateY(0) scale(0); opacity: 1; } 70% { transform: translateY(10px) scale(1.25); opacity: 1; } 78% { transform: translateY(12px) scale(1.6); opacity: 0.6; border-width: 1px; } 82% { transform: translateY(12px) scale(1.9); opacity: 0; } 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .slime, .drip, .drip b, .bub { animation: none; } .drip { height: var(--h); } .bub { transform: none; } }
</style>
