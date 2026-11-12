<script lang="ts">
  import HeroSprite from '../camp/HeroSprite.svelte';
  // ⚡ 필살기 컷인 (#146 · 정식 attack.js cutin 의 꼴): 화면을 가로지르는 띠 + 용사 얼굴 + 이름 · 1.5초(진필살기 = 금빛 · 2초) · 움직임 줄이기면 짧게
  const { hero, name, gold = false, big = false }: { hero: number; name: string; gold?: boolean; big?: boolean } = $props();
</script>

<div class="ult" class:gold class:big role="status" aria-label={name}>
  <i class="dim"></i>
  <div class="band"><span class="face"><HeroSprite id={hero} row={2} scale={big ? 4 : 2} /></span>{#if gold}<b class="tru">眞</b>{/if}<b class="nm">{name}</b></div>
  <i class="flash"></i>
</div>

<style>
  .ult { position: fixed; inset: 0; z-index: 60; pointer-events: none; display: grid; place-items: center; --c1: #ff7a1a; --c2: #ffd25a; }
  .ult.gold { --c1: #ffd25a; --c2: #fff3c0; }
  .dim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.55); animation: fade 1.5s ease-out forwards; }
  .band { position: relative; width: 100%; height: 30%; min-height: 110px; display: flex; align-items: center; justify-content: center; gap: 4%; background: linear-gradient(100deg, transparent 0 4%, var(--c1) 4% 6%, #120c08 6% 94%, var(--c1) 94% 96%, transparent 96%); transform: skewY(-6deg); animation: slide 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; overflow: hidden; }
  .face { filter: drop-shadow(0 0 10px var(--c2)); transform: skewY(6deg); }
  .nm { color: #fff; font-size: clamp(22px, 5vw, 64px); font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 12px var(--c1), 0 3px 0 #000; transform: skewY(6deg); white-space: nowrap; }
  .tru { color: var(--c2); font-size: clamp(30px, 7vw, 90px); text-shadow: 0 0 16px var(--c1); transform: skewY(6deg); }
  .flash { position: absolute; inset: 0; background: var(--c2); opacity: 0; animation: flash 0.5s 0.15s ease-out; }
  @keyframes slide { 0% { translate: 110% 0; } 18% { translate: 0 0; } 82% { translate: 0 0; opacity: 1; } 100% { translate: -110% 0; opacity: 0; } }
  @keyframes fade { 0% { opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes flash { 0% { opacity: 0.55; } 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .band { animation-duration: 0.6s; } .dim { animation-duration: 0.6s; } .flash { display: none; } }
</style>
