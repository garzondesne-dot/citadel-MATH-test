<script lang="ts">
  // ⚡ 스킬 「모았다 놓기」 (시안 atb-3-charge · 결정 T3): 꾹 누르면 고리가 차오름 → 떼는 순간 판정 · 빗나감 100% · 성공 125% · 딱 맞음 150%
  //   금색 ⚡ 가 많을수록 「딱!」 칸이 넓어짐 · 진동 = 안드로이드만(아이폰 = 화면 흔들림 + 소리) · 나머지 화면은 어둡게
  import { onDestroy } from 'svelte';
  import { T } from '../../../board/atb/tune';
  import { bestZone, holdOf, type Hold, type Zap } from '../../../board/atb/engine';
  import AtbIcon from './AtbIcon.svelte';
  const { zaps, ondone, oncancel }: { zaps: Zap[]; ondone: (h: Hold) => void; oncancel: () => void } = $props();
  const gold = $derived(zaps.filter((z) => z === 'g').length), ult = $derived(zaps.length >= T.zapMax);
  const best = $derived(bestZone(gold));
  let p = $state(0), holding = $state(false), t0 = 0, raf = 0, done = false, shake = $state(false);
  const vib = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* 무시 */ } };
  const loop = () => { p = Math.min(1, (performance.now() - t0) / T.holdMs); raf = requestAnimationFrame(loop); };
  function down(e: PointerEvent) { if (done) return; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); holding = true; t0 = performance.now(); vib(15); raf = requestAnimationFrame(loop); }
  function up() { if (!holding || done) return; done = true; holding = false; cancelAnimationFrame(raf); const r = holdOf(p, gold); vib(r === 'best' ? (ult ? [60, 40, 160] : 80) : r === 'ok' ? 40 : 10); shake = true; setTimeout(() => ondone(r), 320); }
  onDestroy(() => cancelAnimationFrame(raf));
  // 🧪 화면 시험: 구간 한가운데에서 뗌
  (globalThis as unknown as { __atbHold?: (k: Hold) => void }).__atbHold = (k) => { holding = true; p = k === 'best' ? (best[0] + best[1]) / 2 : k === 'ok' ? T.holdOk[0] + 0.03 : 0.2; up(); };
  const R = 80, C = 2 * Math.PI * R, arc = (a: number, b: number) => `${C * (b - a)} ${C}`;
</script>

<div class="cr" class:shake role="dialog" aria-label="스킬 · 꾹 누르고 있다가 떼기" data-k="atb-charge">
  <div class="top"><b>{ult ? '⚡ 가득 · 필살기' : `⚡ ${zaps.length}개 · 스킬`}</b><span>{#each zaps as z, i (i)}<AtbIcon name={z === 'g' ? 'zap-gold' : 'zap'} size={28} />{/each}</span></div>
  <button type="button" class="ring" data-k="atb-hold" onpointerdown={down} onpointerup={up} onpointercancel={up} oncontextmenu={(e) => e.preventDefault()}>
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r={R} class="base" />
      <circle cx="100" cy="100" r={R} class="ok" stroke-dasharray={arc(T.holdOk[0], T.holdOk[1])} stroke-dashoffset={-C * T.holdOk[0]} />
      <circle cx="100" cy="100" r={R} class="best" stroke-dasharray={arc(best[0], best[1])} stroke-dashoffset={-C * best[0]} />
      <circle cx="100" cy="100" r={R} class="fill" stroke-dasharray="{C * p} {C}" />
      <text x="100" y="108" text-anchor="middle">{holding ? '…' : '꾹!'}</text>
    </svg>
  </button>
  <p class="tip">꾹 누르고 있다가 — 떼기! <small>딱! = 금색 칸 · 성공 = 파란 칸</small></p>
  <button type="button" class="x" onclick={oncancel}>그만두기</button>
</div>

<style>
  .cr { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: #000a; }
  .cr.shake { animation: sh 0.3s; } @keyframes sh { 25% { transform: translate(-4px, 2px); } 75% { transform: translate(4px, -2px); } }
  .top { display: flex; align-items: center; gap: 8px; padding: 4px 14px; border-radius: 12px; border: 2px solid #e2b04a; background: #2a1a0e; color: #ffe08a; font: 800 16px var(--font); }
  .ring { width: min(44vh, 220px); height: min(44vh, 220px); padding: 0; border: none; background: none; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  circle { fill: none; stroke-width: 18; }
  .base { stroke: #1d2a4a; } .ok { stroke: #5aa9ff; } .best { stroke: #ffd34d; } .fill { stroke: #ffffffcc; stroke-width: 8; }
  text { transform: rotate(90deg); transform-origin: 100px 100px; fill: #ffe08a; font: 800 30px var(--font); }
  .tip { margin: 0; padding: 6px 16px; border-radius: 12px; background: #f6e7c4; color: #3a2614; font: 800 16px var(--font); text-align: center; }
  .tip small { display: block; font: 600 11px var(--font-plain); }
  .x { min-height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid #ffffff55; background: #0006; color: #fff; font: 600 13px var(--font-plain); }
</style>
