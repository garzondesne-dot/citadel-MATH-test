<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import HeroSprite from './HeroSprite.svelte';
  import { awkId, awkTitle, famOfHero, heroOf, skillName, titleOf } from '../../model/hero';
  import { sfx } from '../sound.svelte';
  // ⚡ #94 각성 해금 연출 (📜 선생님 「각성 용사 해금 시 각성 해금 연출 보여 줘!」 · DECISIONS 맨 아래 줄)
  //   약 4초 · 건너뛰기: 어두워짐 + 기본 모습 크게 → 발밑 금빛 빛기둥 · 조각 모여듦 1.5초 → 번쩍(한 번) → 각성 모습 + 「⚡ 각성 해금!」 · 「각성한 ○○ · 「칭호」」 · 각성 필살기 이름 · 소리 → 「확인」
  //   움직임 줄이기 = 정지 화면(바로 마지막 장면) · 새 그림 없음(있는 시트 · 오라 재사용)
  const { hero, onclose }: { hero: number; onclose: () => void } = $props();
  const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let phase = $state(RM ? 2 : 0);
  const h0 = untrack(() => hero), base = heroOf(h0), t = awkTitle(h0), tName = (t && titleOf(t)?.name) || '', ult = skillName(String(famOfHero(h0).ids[3] ?? ''));
  const timers: ReturnType<typeof setTimeout>[] = [];
  if (!RM) { timers.push(setTimeout(() => (phase = 1), 1500)); timers.push(setTimeout(() => { phase = 2; sfx('awaken-cutin', 0.8); }, 1700)); } else sfx('awaken-cutin', 0.8);
  onDestroy(() => timers.forEach(clearTimeout));
  function skip() { timers.forEach(clearTimeout); if (phase < 2) { phase = 2; sfx('awaken-cutin', 0.8); } else onclose(); }
</script>

<div class="awp" class:p0={phase === 0} class:p2={phase === 2} class:rm={RM} role="dialog" aria-modal="true" aria-label="각성 해금" data-k="awaken-pop">
  {#if phase < 2}<button type="button" class="skip" data-k="awaken-skip" onclick={skip}>건너뛰기 ›</button>{/if}
  <div class="stage">
    <i class="pillar" aria-hidden="true"></i>
    {#if phase < 2}{#each Array.from({ length: 12 }) as _, i (i)}<i class="bit" style="--a:{i * 30}deg;--d:{(i % 4) * 0.12}s" aria-hidden="true"></i>{/each}{/if}
    <div class="hero">{#if phase < 2}<HeroSprite id={hero} scale={3} />{:else}<HeroSprite id={awkId(hero)} scale={3} aura={10} play />{/if}</div>
  </div>
  {#if phase === 1}<i class="flash" aria-hidden="true"></i>{/if}
  {#if phase === 2}
    <div class="txt" data-k="awaken-text">
      <b class="big">⚡ 각성 해금!</b>
      <span class="nm">각성한 {base.name}{tName ? ` · 「${tName}」` : ''}</span>
      {#if ult}<span class="awult">🌟 각성 필살기 · {ult}</span>{/if}
    </div>
    <button type="button" class="ok" data-k="awaken-ok" onclick={onclose}>확인</button>
  {/if}
</div>

<style>
  .awp { position: fixed; inset: 0; z-index: 400; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: rgba(6, 6, 12, 0.92); color: #fff; animation: dim 0.4s ease-out; }
  .awp.rm { animation: none; }
  @keyframes dim { from { background: rgba(6, 6, 12, 0); } }
  .skip { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); right: 16px; min-height: 44px; padding: 0 14px; border: 0; border-radius: 22px; background: rgba(255, 255, 255, 0.12); color: #fff; font: 600 14px var(--font); }
  .stage { position: relative; width: 240px; height: 260px; display: flex; align-items: flex-end; justify-content: center; }
  .hero { position: relative; z-index: 2; }
  .pillar { position: absolute; bottom: 0; left: 50%; width: 120px; height: 100%; transform: translateX(-50%); background: linear-gradient(to top, rgba(255, 211, 77, 0.85), rgba(255, 211, 77, 0.15) 70%, transparent); filter: blur(6px); opacity: 0; animation: rise 1.5s ease-out forwards; }
  .p2 .pillar { opacity: 0.6; animation: none; }
  .rm .pillar { opacity: 0.6; animation: none; }
  @keyframes rise { from { opacity: 0; transform: translateX(-50%) scaleY(0.2); transform-origin: bottom; } to { opacity: 1; transform: translateX(-50%) scaleY(1); } }
  .bit { position: absolute; left: 50%; top: 55%; width: 8px; height: 8px; border-radius: 2px; background: #ffd34d; box-shadow: 0 0 8px #ffd34d; transform: rotate(var(--a)) translateY(-140px); opacity: 0; animation: gather 1.2s ease-in var(--d) forwards; }
  @keyframes gather { 0% { opacity: 0; transform: rotate(var(--a)) translateY(-140px); } 30% { opacity: 1; } 100% { opacity: 0; transform: rotate(var(--a)) translateY(0); } }
  .flash { position: fixed; inset: 0; z-index: 3; background: #fff; animation: fl 0.2s ease-out forwards; }
  @keyframes fl { from { opacity: 0.9; } to { opacity: 0; } }
  .txt { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 0 16px; animation: up 0.2s ease-out; }
  .rm .txt { animation: none; }
  @keyframes up { from { transform: translateY(8px); opacity: 0; } }
  .big { font: 800 28px var(--font); color: #ffd34d; text-shadow: 0 2px 0 #7a4a00; }
  .nm { font: 700 18px var(--font); }
  .awult { font: 600 16px var(--font); color: #ffe9a8; }
  .ok { min-width: 200px; min-height: 48px; border: 0; border-radius: var(--r); background: var(--accent); color: var(--on-accent); font: 700 16px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .ok:active { transform: translateY(2px); box-shadow: none; }
</style>
