<script lang="ts">
  import { onDestroy } from 'svelte';
  import { type Chal } from '../../school/challenges';
  import { titleOf } from '../../model/hero';
  import { sfx } from '../sound.svelte';
  // 🏆 #73 도전과제 달성 연출 (📜 2026-11-18 · DECISIONS 「🏆 도전과제 달성 연출」): 막 채워진 과제 하나씩
  //   🌱 첫걸음 = 위에서 금빛 띠 + 빛 쓸림 2.5초 · ⚔ 도전 = 큰 띠 + 배지 쾅 + 금빛 입자 + 「💎+n · 📜+n」 3.5초 · 👑 전설 = 전체 화면 컷인 4초
  //   누르면 그 자리에서 「🎁 받기」(#68 받기와 같은 함수) · 그냥 넘기면 「⛺ 텐트에서 받아요」 · 여러 개 = 하나씩 + 마지막 「+n 개 더」
  const { list, more = 0, claim, ondone }: { list: Chal[]; /** 보여 주지 않고 남은 개수 (마지막 「+n 개 더」) */ more?: number; claim: (ch: Chal) => boolean; ondone: () => void } = $props();
  const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = { seed: 2500, adv: 3500, leg: 4000 } as const;
  let i = $state(0), taken = $state(false), moreOn = $state(false);
  const cur = $derived(list[i]);
  const rw = (c: Chal) => [c.reward.gem ? `💎+${c.reward.gem}` : '', c.reward.scroll ? `📜+${c.reward.scroll}` : ''].filter(Boolean).join(' · ');
  const ttl = (c: Chal) => (c.reward.title ? titleOf(c.reward.title)?.name ?? '' : '');
  let t: ReturnType<typeof setTimeout> | null = null;
  function next() { if (t) clearTimeout(t); taken = false; if (i + 1 < list.length) i += 1; else if (more > 0 && !moreOn) moreOn = true; else ondone(); }
  $effect(() => {
    const c = cur; void moreOn; if (t) clearTimeout(t);
    if (moreOn) { sfx('ach1', 0.6); t = setTimeout(ondone, 2500); return; }
    if (!c) { ondone(); return; }
    sfx(c.tier === 'leg' ? 'ach3' : c.tier === 'adv' ? 'ach2' : 'ach1', 0.7);
    t = setTimeout(next, DUR[c.tier]);
  });
  onDestroy(() => { if (t) clearTimeout(t); });
  function tap() { const c = cur; if (!c || moreOn) { next(); return; } if (!taken && !c.auto && claim(c)) { taken = true; sfx('mail', 0.6); if (t) clearTimeout(t); t = setTimeout(next, 1400); return; } next(); }
</script>

{#if moreOn}
  <button type="button" class="band seed" data-k="ach-more" onclick={next}><span class="sweep"></span><b>🏆 +{more}개 더 달성!</b><small>⛺ 텐트에서 모두 볼 수 있어요</small></button>
{:else if cur}
  {#key i}
  {#if cur.tier === 'leg'}
    <button type="button" class="cut" class:rm={RM} data-k="ach-pop" data-tier="leg" onclick={tap} aria-label="전설 도전과제 달성 · {cur.name}">
      <span class="rays" aria-hidden="true"></span>
      <span class="trophy" aria-hidden="true">🏆</span>
      <em class="lab">👑 전설 달성!</em>
      <b class="nm">{cur.name}</b>
      {#if ttl(cur)}<span class="ttl">「{ttl(cur)}」</span>{/if}
      <small class="hint">{taken ? '🎁 받았어요!' : cur.auto ? '' : '누르면 🎁 받기 · 그냥 두면 ⛺ 텐트에서 받아요'}</small>
    </button>
  {:else}
    <button type="button" class="band {cur.tier}" class:rm={RM} data-k="ach-pop" data-tier={cur.tier} onclick={tap}>
      <span class="sweep" aria-hidden="true"></span>
      {#if cur.tier === 'adv'}<span class="badge" aria-hidden="true">{cur.ic}</span>{#each Array(10) as _, n (n)}<i class="pt" style="--n:{n}"></i>{/each}{/if}
      <span class="tx"><em>🏆 도전과제 달성!</em><b>{cur.name}</b>
        {#if cur.tier === 'adv' && rw(cur)}<span class="up" data-k="ach-reward">{rw(cur)}</span>{/if}
        <small>{taken ? '🎁 받았어요!' : cur.auto ? '' : '누르면 🎁 받기 · 그냥 두면 ⛺ 텐트에서'}</small></span>
    </button>
  {/if}
  {/key}
{/if}

<style>
  .band { position: fixed; left: 50%; top: calc(10px + env(safe-area-inset-top, 0px)); z-index: 80; transform: translateX(-50%); width: min(92vw, 400px); display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 16px; border: 2px solid #f5c95a; background: linear-gradient(180deg, #3a2a08, #1d1404); color: #fff3cf; text-align: left; overflow: hidden; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55), 0 0 22px rgba(245, 184, 74, 0.45); animation: drop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both; font: 500 13px var(--font); }
  .band.adv { width: min(94vw, 420px); padding: 16px 18px; border-width: 3px; }
  .band .tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .band em { font: 800 12px var(--font); font-style: normal; color: #f5c95a; letter-spacing: 0.02em; }
  .band b { font: 800 18px var(--font); color: #fff; }
  .band.adv b { font-size: 21px; }
  .band small { color: #e9d9a8; opacity: 0.85; }
  .sweep { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 240, 190, 0.55) 50%, transparent 70%); transform: translateX(-120%); animation: sweep 1s 0.35s ease-out forwards; pointer-events: none; }
  .badge { flex: none; width: 56px; height: 56px; display: grid; place-items: center; font-size: 34px; border-radius: 50%; background: radial-gradient(circle, #ffe6a3, #c88a1e); box-shadow: 0 0 0 3px #f5c95a, 0 0 18px rgba(255, 210, 110, 0.9); animation: slam 0.5s 0.25s cubic-bezier(0.2, 1.6, 0.4, 1) both; }
  .up { display: inline-block; font: 800 16px var(--font); color: #ffd98a; animation: up 0.8s 0.6s ease-out both; }
  .pt { position: absolute; left: 44px; top: 50%; width: 6px; height: 6px; border-radius: 50%; background: #ffe39a; box-shadow: 0 0 6px 2px #ffb84a; opacity: 0; animation: pt 0.9s 0.5s ease-out forwards; --a: calc(var(--n) * 36deg); }
  @keyframes drop { from { transform: translate(-50%, -140%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
  @keyframes sweep { to { transform: translateX(120%); } }
  @keyframes slam { 0% { transform: scale(2.4); opacity: 0; } 60% { transform: scale(0.9); opacity: 1; } 100% { transform: scale(1); } }
  @keyframes up { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes pt { 0% { opacity: 1; transform: rotate(var(--a)) translateX(0); } 100% { opacity: 0; transform: rotate(var(--a)) translateX(70px); } }
  /* 👑 전설 컷인: 어둡게 · 뒤 빛살 회전 · 큰 트로피 · 칭호 내려앉음 */
  .cut { position: fixed; inset: 0; z-index: 90; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: radial-gradient(circle at 50% 42%, rgba(60, 40, 6, 0.85), rgba(0, 0, 0, 0.92) 70%); color: #fff; overflow: hidden; animation: fadeIn 0.35s ease-out both; font: 500 14px var(--font); }
  .rays { position: absolute; left: 50%; top: 40%; width: 160vmax; height: 160vmax; transform: translate(-50%, -50%); background: repeating-conic-gradient(from 0deg, rgba(255, 210, 110, 0.22) 0deg 8deg, transparent 8deg 22deg); animation: spin 9s linear infinite; pointer-events: none; mask-image: radial-gradient(circle, #000 0, transparent 45%); -webkit-mask-image: radial-gradient(circle, #000 0, transparent 45%); }
  .trophy { position: relative; font-size: 96px; line-height: 1; filter: drop-shadow(0 0 22px rgba(255, 200, 90, 0.95)); animation: slam 0.6s 0.2s cubic-bezier(0.2, 1.6, 0.4, 1) both; }
  .lab { position: relative; font: 800 15px var(--font); font-style: normal; color: #f5c95a; letter-spacing: 0.08em; animation: up 0.5s 0.5s ease-out both; }
  .nm { position: relative; font: 900 28px var(--font); text-shadow: 0 2px 0 #000, 0 0 16px rgba(255, 200, 90, 0.7); animation: up 0.5s 0.65s ease-out both; }
  .ttl { position: relative; padding: 6px 16px; border-radius: 999px; border: 2px solid #f5c95a; background: rgba(40, 28, 4, 0.85); color: #ffe39a; font: 800 18px var(--font); animation: land 0.6s 1s cubic-bezier(0.2, 1.4, 0.4, 1) both; }
  .hint { position: relative; color: #d9c793; opacity: 0.85; animation: up 0.5s 1.4s ease-out both; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
  @keyframes land { from { transform: translateY(-60px) scale(1.3); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
  .rm, .rm *, .rm::before { animation-duration: 0.01s !important; animation-delay: 0s !important; }
  .rm .rays { animation: none; }
</style>
