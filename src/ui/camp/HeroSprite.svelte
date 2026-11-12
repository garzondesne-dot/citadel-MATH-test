<script lang="ts">
  import { AURA_CSS } from '../../model/hero';
  import { HERO, heroGeo, heroNudge, heroUrl } from '../manifest';
  // 🧙 용사 도트 한 칸 (정식 heroesV2 · 칸 80 × 64) · 정수 배율 · 강화 오라 1~10(정식 .aura-n 빛 + 발밑 빛 웅덩이)
  //   row = 줄(0 idle · 2 공격 · 8 앉기) · play = 그 줄 4칸을 돌림(움직임 줄이기 설정이면 멈춤) · dim = 잠긴 용사(그림자)
  const { id, row = 0, play = false, scale = 1, aura = 0, dim = false, label = '' }:
    { id: number; row?: number; play?: boolean; scale?: number; aura?: number; dim?: boolean; label?: string } = $props();
  const a = $derived(AURA_CSS[Math.max(0, Math.min(10, aura))] ?? ['', '', 0]);
  const nd = $derived(heroNudge(id, row));
  const g = $derived(heroGeo(id)); // 새 화풍(세밀 시트)은 같은 자리에서 위 · 옆으로 넘쳐 그림 // 🎯 보이는 부분 정중앙 · 발 기준선 (#121)
</script>

<span class="hs" class:aura={aura > 0} style:width="{HERO.w * scale}px" style:height="{HERO.h * scale}px" style:--a1={a[0]} style:--a2={a[1]} style:--ar="{a[2]}px" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'}>
  <i class:play class:dim style:left="{g.dx * scale}px" style:top="{g.dy * scale}px" style:width="{g.w * scale}px" style:height="{g.h * scale}px" style:translate="{nd.dx * scale}px {nd.dy * scale}px" style:background-image="url({heroUrl(id)})" style:background-size="{HERO.cols * 100}% {HERO.rows * 100}%" style:background-position-y="{(row / (HERO.rows - 1)) * 100}%"></i>
</span>

<style>
  .hs { position: relative; display: inline-block; flex: none; }
  i { position: absolute; display: block; background-repeat: no-repeat; background-position-x: 0; image-rendering: pixelated; }
  i.play { animation: idle 1.28s steps(4) infinite; }
  @keyframes idle { from { background-position-x: 0%; } to { background-position-x: 133.333%; } }
  i.dim { filter: brightness(0) opacity(0.55); }
  .aura i:not(.dim) { filter: drop-shadow(0 0 var(--ar) var(--a1)) drop-shadow(0 0 1px var(--a2)); }
  .aura::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 76%; height: 16%; min-height: 8px; transform: translateX(-50%); border-radius: 50%; pointer-events: none; z-index: -1;
    background: radial-gradient(ellipse, color-mix(in srgb, var(--a1) 70%, transparent), transparent 70%); animation: pool 3.2s ease-in-out infinite; }
  @keyframes pool { 0%, 100% { opacity: 0.45; transform: translateX(-50%) scale(0.9); } 50% { opacity: 0.9; transform: translateX(-50%) scale(1.08); } }
  @media (prefers-reduced-motion: reduce) { i.play, .aura::after { animation: none; } }
</style>
