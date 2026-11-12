<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  // 💥 몬스터 공격 화면 효과 (#152 · raid/attacks.ts 등록 표) — 문제 카드 묶음(.qwrap) 위에만 · 레이아웃 0(덮개 · transform) · 문제 · 보기 · 고른 답은 안 건드림
  //   pause = 덮개 + 줄어드는 원 · glitch = 문제 글 숫자 · 기호가 2~3번 잠깐 바뀌었다 원래대로 + 색 갈라짐 · fog = 안개(문지르면 닦임)
  //   fire = 아래 불길이 보기 칸을 가림(주요 단추 자리 🧯 꾹) · smash = 카드 흔들(±6px · 기울기 · 0.8초 감쇠) · ice = 주요 단추가 얼음(BottomAction)
  const { kind, len, left, onclear }: { kind: string; len: number; left: number; onclear: () => void } = $props();
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
  onMount(() => { if (kind === 'glitch') glitch(); if (kind === 'fog') fog(); });
  const p = $derived(Math.max(0, Math.min(1, left / Math.max(1, len))));
</script>

<div class="afx {kind}" bind:this={host} aria-hidden={kind !== 'pause'}>
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
  @media (prefers-reduced-motion: reduce) { :global(.qwrap) :global(.bcard) { animation: none !important; } }
</style>
