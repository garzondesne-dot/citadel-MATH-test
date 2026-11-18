<script lang="ts">
  import { CAMP_PORTAL, cellBg, type CampProp } from '../manifest';
  // 🏕 캠프 물건 그림 한 개 (학생 캠프 · TV 교사 캠프 같은 부품 · 자리는 바깥 칸이 CAMP_PROPS 로 잡음)
  //   📋 게시판(k = 'dummy') = ① 평소 / ② 모집 중(종이 금빛) 칸 + 오른쪽 옆 파란 포털(바깥 칸 밖 · 게시판 폭 기준으로 놓음)
  //   포털 기믹 = 평소 작은 불씨(0.15 · 흐림) · 모집 중 방 = 불씨에서 열림 크기로 커지며(📜 2026-11-15 캠프 A) 소용돌이 회전 · 파란 빛 맥박 · 반짝 입자 · 바닥 고리 퍼짐 · 출발 = 1.0 확 열림(0.4초 · 바닥 빛 고리) · 동작 줄이기 = 크기 · 빛만
  const { p, phase = 'idle', hit = false, on = false }: { p: CampProp; phase?: 'idle' | 'recruit' | 'open'; /** 🏕 누름 = 반응 그림 4칸(0.11초씩) */ hit?: boolean; /** 상태 칸(② · 우편함 새 소식 · 책상 새 소식) */ on?: boolean } = $props();
  // 📜 2026-11-18 새 캠프: ① 평소 · ② 상태(게시판 모집 중 · 우편함 새 소식 · 허수아비 맞음 · 책상 새 소식) · 누르면 ③~⑥ 반응 4칸 → 허수아비는 끝에 ② 맞음 한 번
  const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rf = $state<number | null>(null);
  $effect(() => {
    if (!hit || !p.react?.length) return;
    const seq = [...(RM ? [p.react[1]!] : p.react), ...(p.k === 'scare' && p.state != null ? [p.state, p.state] : [])]; let i = 0; rf = seq[0]!;
    const t = setInterval(() => { i += 1; if (i >= seq.length) { clearInterval(t); rf = null; return; } rf = seq[i]!; }, 110);
    return () => { clearInterval(t); rf = null; };
  });
  const stateOn = $derived(p.state != null && ((p.k === 'dummy' && phase !== 'idle') || on));
  const col = $derived(rf ?? (stateOn ? p.state! : 0));
  // 포털 = 게시판 칸(폭 p.width%) 기준 상대 자리 → 캠프 그림 %(CAMP_PORTAL) 와 같아지게
  const pl = $derived(((CAMP_PORTAL.left - p.left) / p.width) * 100), pw = $derived((CAMP_PORTAL.width / p.width) * 100);
</script>

<i class="img" data-col={col} style="{cellBg(p.src, p.cols, col)};aspect-ratio:{p.aspect}"></i>
{#if p.k === 'dummy'}
  <span class="portal {phase}" style="left:{pl}%;width:{pw}%" style:--s={CAMP_PORTAL.scale[phase]} aria-hidden="true" data-phase={phase}>
    {#if phase === 'open'}<i class="ring"></i>{/if}
    {#if phase === 'recruit'}<i class="ring2"></i><i class="ring2 r2"></i>{/if}
    <i class="pimg" style="background-image:url({CAMP_PORTAL.src});aspect-ratio:{CAMP_PORTAL.aspect}"></i>
    {#if phase === 'recruit'}<i class="vortex"></i><i class="pk k1"></i><i class="pk k2"></i><i class="pk k3"></i>{/if}
  </span>
{/if}

<style>
  .img { display: block; width: 100%; background-repeat: no-repeat; image-rendering: pixelated; transition: transform 0.12s ease-out; transform-origin: 50% 100%; }
  .portal { position: absolute; bottom: 0; display: block; pointer-events: none; transform-origin: 50% 100%; }
  .pimg { display: block; width: 100%; background-size: 100% 100%; transform: scale(var(--s)); transform-origin: 50% 92%; transition: transform 0.4s cubic-bezier(0.2, 1.4, 0.4, 1), opacity 0.4s; filter: drop-shadow(0 0 6px rgba(90, 170, 255, 0.7)); }
  .idle .pimg { opacity: 0.55; animation: ember 1.6s ease-in-out infinite alternate; }
  .recruit .pimg { animation: grow 0.6s cubic-bezier(0.2, 1.4, 0.4, 1) both, breathe 1.6s 0.6s ease-in-out infinite; }
  /* 🌀 모집 중 (캠프 A): 소용돌이(원뿔 무늬 회전 · 둥근 가림) · 반짝 입자 셋 · 바닥 고리 둘이 번갈아 퍼짐 */
  .vortex { position: absolute; left: 50%; bottom: 14%; width: 70%; aspect-ratio: 1 / 1.25; transform: translateX(-50%) scale(var(--s)); transform-origin: 50% 80%; border-radius: 50%; background: conic-gradient(from 0deg, rgba(150, 220, 255, 0) 0deg, rgba(150, 220, 255, 0.75) 60deg, rgba(150, 220, 255, 0) 140deg, rgba(200, 240, 255, 0.6) 220deg, rgba(150, 220, 255, 0) 300deg); -webkit-mask: radial-gradient(closest-side, #000 55%, transparent 100%); mask: radial-gradient(closest-side, #000 55%, transparent 100%); mix-blend-mode: screen; animation: vortex 1.4s linear infinite; }
  .pk { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #e8f7ff; box-shadow: 0 0 8px 3px rgba(120, 200, 255, 0.95); bottom: 30%; opacity: 0; animation: pk 1.8s ease-out infinite; }
  .k1 { left: 30%; } .k2 { left: 55%; animation-delay: -0.6s; } .k3 { left: 72%; animation-delay: -1.2s; }
  .ring2 { position: absolute; left: 50%; bottom: 4%; width: 150%; aspect-ratio: 3 / 1; border-radius: 50%; border: 2px solid rgba(120, 200, 255, 0.9); box-shadow: 0 0 10px rgba(120, 200, 255, 0.8); transform: translate(-50%, 50%) scale(0.3); opacity: 0; animation: ring2 1.8s ease-out infinite; }
  .ring2.r2 { animation-delay: -0.9s; }
  @keyframes grow { from { transform: scale(0.15); } to { transform: scale(var(--s)); } }
  @keyframes vortex { to { transform: translateX(-50%) scale(var(--s)) rotate(360deg); } }
  @keyframes pk { 0% { opacity: 0; transform: translateY(0) scale(0.6); } 25% { opacity: 1; } 100% { opacity: 0; transform: translateY(-160%) scale(1.1); } }
  @keyframes ring2 { 0% { opacity: 0.9; transform: translate(-50%, 50%) scale(0.3); } 100% { opacity: 0; transform: translate(-50%, 50%) scale(1); } }
  .open .pimg { animation: swirl 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both, spin 1.2s 0.4s linear infinite; }
  .ring { position: absolute; left: 50%; bottom: 4%; width: 180%; aspect-ratio: 3 / 1; border-radius: 50%; border: 3px solid rgba(120, 200, 255, 0.9); box-shadow: 0 0 12px rgba(120, 200, 255, 0.8); transform: translate(-50%, 50%) scale(0.2); animation: ring 0.7s ease-out forwards; }
  @keyframes ember { from { transform: scale(calc(var(--s) * 0.85)); opacity: 0.4; } to { transform: scale(var(--s)); opacity: 0.7; } }
  @keyframes breathe { 0%, 100% { transform: scale(var(--s)); filter: drop-shadow(0 0 4px rgba(90, 170, 255, 0.6)); } 50% { transform: scale(calc(var(--s) * 1.1)); filter: drop-shadow(0 0 12px rgba(120, 200, 255, 0.95)); } }
  @keyframes swirl { from { transform: scale(0.6) rotate(-40deg); } to { transform: scale(1) rotate(0); } }
  @keyframes spin { 0% { transform: scale(1) rotate(0); } 50% { transform: scale(1.04) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
  @keyframes ring { to { transform: translate(-50%, 50%) scale(1); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .pimg, .idle .pimg, .recruit .pimg, .open .pimg { animation: none; } .ring, .ring2, .pk { display: none; } .vortex { animation: none; } }
</style>
