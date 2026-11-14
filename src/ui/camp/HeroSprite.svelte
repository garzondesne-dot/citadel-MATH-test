<script lang="ts">
  import { AURA_CSS } from '../../model/hero';
  import { aura as auraAct } from '../fx/aura';
  import { ANIM, HERO, type HPose, heroGeo, heroHead, heroNudge, heroUrl, IDLE8, idle8Of } from '../manifest';
  // 🧙 용사 도트 한 칸 (정식 heroesV2 · 칸 80 × 64) · 정수 배율 · 강화 오라 1~10(정식 .aura-n 빛 + 발밑 빛 웅덩이)
  //   row = 줄(0 idle · 2 공격 · 8 앉기) · play = 그 줄 4칸을 돌림(움직임 줄이기 설정이면 멈춤) · dim = 잠긴 용사(그림자)
  const { id, row: row0 = 0, play = false, scale = 1, aura = 0, dim = false, label = '', tv = false, pose }:
    { id: number; row?: number; play?: boolean; scale?: number; aura?: number; dim?: boolean; label?: string; tv?: boolean; /** 🎞 정식 anims 줄 하나를 돌림(📜 2026-11-14) · 있으면 row · play 대신 */ pose?: HPose } = $props();
  const an = $derived(pose ? ANIM[pose] : null), row = $derived(an ? an[0] : row0);
  // ✨ 오라 = 정식 aura.js 그림 오라(바닥 고리 · 발밑 빛 · 도는 입자 · 10 = 후광) · 폭 40px 이상만 · 붙으면 옛 빛(그림자 · 웅덩이)은 끔 (정식 .au-on)
  const a = $derived(AURA_CSS[Math.max(0, Math.min(10, aura))] ?? ['', '', 0]);
  const nd = $derived(heroNudge(id, row));
  const g = $derived(heroGeo(id));
  const i8 = $derived(play && !an && row === 0 ? idle8Of(id) : null); // 🫁 #169 대기 8프레임 (그 용사 줄) // 새 화풍(세밀 시트)은 같은 자리에서 위 · 옆으로 넘쳐 그림 // 🎯 보이는 부분 정중앙 · 발 기준선 (#121)
</script>

<span class="hs art" class:aura={aura > 0} class:au-on={aura > 0 && HERO.w * scale >= 40} use:auraAct={{ lv: dim ? 0 : aura, tv, head: heroHead(id, !!i8) }} style:width="{HERO.w * scale}px" style:height="{HERO.h * scale}px" style:--a1={a[0]} style:--a2={a[1]} style:--ar="{a[2]}px" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'}>
  {#if i8}
    <i class="i8" class:dim style:left="0" style:top="0" style:width="{HERO.w * scale}px" style:height="{HERO.h * scale}px" style:translate="{(IDLE8.nd[id]?.[0] ?? 0) * scale}px {(IDLE8.nd[id]?.[1] ?? 0) * scale}px" style:background-image="url({i8})" style:background-size="{IDLE8.frames * 100}% {IDLE8.rows * 100}%" style:background-position-y="{(id / (IDLE8.rows - 1)) * 100}%" style:animation-duration="{IDLE8.ms}ms"></i>
  {:else}
    <i class:play={play && !an} class:anim={!!an && an[1] > 1} class:once={!!an?.[3]} data-pose={pose} style:--n={an?.[1]} style:--n1={an ? Math.max(1, an[1] - 1) : undefined} style:--dur={an ? `${an[2]}s` : undefined} style:--end={an ? `${(an[1] / (HERO.cols - 1)) * 100}%` : undefined} style:--end1={an ? `${((an[1] - 1) / (HERO.cols - 1)) * 100}%` : undefined} class:dim style:left="{g.dx * scale}px" style:top="{g.dy * scale}px" style:width="{g.w * scale}px" style:height="{g.h * scale}px" style:translate="{nd.dx * scale}px {nd.dy * scale}px" style:background-image="url({heroUrl(id)})" style:background-size="{HERO.cols * 100}% {HERO.rows * 100}%" style:background-position-y="{(row / (HERO.rows - 1)) * 100}%"></i>
  {/if}
</span>

<style>
  .hs { position: relative; display: inline-block; flex: none; }
  i { position: absolute; display: block; background-repeat: no-repeat; background-position-x: 0; image-rendering: pixelated; }
  i.play { animation: idle 1.28s steps(4) infinite; }
  i.anim { animation: hrow var(--dur) steps(var(--n)) infinite; } i.anim.once { animation: hrow1 var(--dur) steps(var(--n1)) forwards; }
  @keyframes hrow { from { background-position-x: 0%; } to { background-position-x: var(--end); } }
  @keyframes hrow1 { from { background-position-x: 0%; } to { background-position-x: var(--end1); } }
  i.i8 { animation: idle8 1.3s steps(8) infinite; }
  @keyframes idle8 { from { background-position-x: 0%; } to { background-position-x: 114.2857%; } }
  @keyframes idle { from { background-position-x: 0%; } to { background-position-x: 133.333%; } }
  i.dim { filter: brightness(0) opacity(0.55); }
  .aura i:not(.dim) { filter: drop-shadow(0 0 var(--ar) var(--a1)) drop-shadow(0 0 1px var(--a2)); }
  .aura::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 76%; height: 16%; min-height: 8px; transform: translateX(-50%); border-radius: 50%; pointer-events: none; z-index: -1;
    background: radial-gradient(ellipse, color-mix(in srgb, var(--a1) 70%, transparent), transparent 70%); animation: pool 3.2s ease-in-out infinite; }
  @keyframes pool { 0%, 100% { opacity: 0.45; transform: translateX(-50%) scale(0.9); } 50% { opacity: 0.9; transform: translateX(-50%) scale(1.08); } }
  .au-on::after { display: none !important; } .au-on i:not(.dim) { filter: none !important; }
  @media (prefers-reduced-motion: reduce) { i.i8, i.play, i.anim, .aura::after { animation: none; } }
</style>
