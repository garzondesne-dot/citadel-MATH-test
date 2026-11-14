<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fx } from './fx.svelte';
  import ChainFx from './ChainFx.svelte';
  import { ICE } from '../manifest';
  import { sfx } from '../sound.svelte';
  // 🟡 BottomAction (3절 · #151 「주요 단추 = 모든 화면 한 자리」): 학생 폰의 노란 주요 단추는 이 부품 하나로만 그림
  //   주요 단추 = 높이 56 · 폭 = 양옆 16 뺀 전체 · 폰 바닥(안전 영역 위)에서 20 · 늘 맨 아래
  //   그 위 = 이유 한 줄(why) · 보조 줄(aux: 보조 단추 · 바뀐 것 줄 …) — 주요 단추를 밀어 올리지 않고 위로 쌓임
  //   주요 단추가 없는 화면 = 그 자리를 비워 두지 않고 흐린 단추(text) + 이유
  //   dock = 화면 바닥에 고정(fixed + 같은 높이 빈칸) · false = 이미 바닥에 붙은 판(시트 · 전체 화면 판) 안에서 마지막 줄
  //   💥 몬스터 공격 중(fx.block) = 같은 자리 흐린 「⏳ 막는 중…」
  const { main, text = '', disabled = false, why = '', onmain, aux, mainLabel, href, dock = true, battle = false, left, right }:
    { main?: Snippet; text?: string; disabled?: boolean; why?: string; onmain?: () => void; aux?: Snippet; mainLabel?: string; href?: string; dock?: boolean; battle?: boolean; /** 📜 2026-11-13 밤 시안 ②⑤⑥′: 맨 아래 한 줄 = 왼쪽(💡 정사각 56) · 가운데 노란 · 오른쪽(✍ 폭 84) · 없는 자리 = 노란이 넓어짐 */ left?: Snippet; right?: Snippet } = $props();
  let h = $state(0);
  const chained = $derived(battle && fx.bind); // ⛓ 속박 · 🔒 자물쇠 = 노란 단추도 사슬로 X 감김 (카드와 같은 사슬)
  const block = $derived(battle && fx.block && !chained);
  // 🧊 얼음 = 주요 단추가 얼어붙음 → 톡톡 4번 깨기 · 🔥 화염 = 같은 자리 「🧯 꾹 눌러 끄기」 1초 (#152 · 시간이 지나면 저절로)
  const ice = $derived(battle && fx.ice > 0), fire = $derived(battle && fx.fire);
  let holdT: ReturnType<typeof setTimeout> | null = null, holding = $state(false);
  // 🧯 다 끄면 = 불길 자리에서 회색 연기가 뭉게뭉게 피어오름(0.9초 · 📜 2026-11-13 밤 다시)
  let smoke = $state(0);
  const holdOn = () => { holding = true; holdT = setTimeout(() => { fx.fire = false; holding = false; smoke = Date.now(); setTimeout(() => (smoke = 0), 950); }, 1000); };
  // 🧊 얼음 단추 (그림 · 📜 2026-11-13 밤 🎨): 덮임 ① → 톡마다 금 ②③④ → 4번째 톡 = ⑤ 깨져 흩어짐(0.45초 · 살짝 멈칫 · 소리) · 3초면 녹음은 그대로
  const iceBg = (k: number) => { const B = ICE.btn; return `background-image:url(${B.src});background-size:${B.cols * 100}% 100%;background-position:${(Math.max(0, Math.min(4, k)) / (B.cols - 1)) * 100}% 0;aspect-ratio:${B.w} / ${B.h};--bc:${((B.barTop + B.barBot) / 2 / B.h) * 100}%`; };
  let iceBreak = $state(0);
  function iceTap() { if (fx.ice <= 1) { iceBreak = Date.now(); sfx('frost', 0.9); try { navigator.vibrate?.(40); } catch { /* 무시 */ } setTimeout(() => (iceBreak = 0), 460); } else sfx('block', 0.5); fx.ice = Math.max(0, fx.ice - 1); }
  const holdOff = () => { holding = false; if (holdT) clearTimeout(holdT); holdT = null; };
</script>

{#if iceBreak}{#key iceBreak}<div class="icebreak" aria-hidden="true"><i class="iceart brk" style="{iceBg(4)}"></i></div>{/key}{/if}
{#if smoke}{#key smoke}<div class="smokepuff" aria-hidden="true">{#each Array.from({ length: 9 }, (_, i) => i) as i (i)}<i style:left="{6 + i * 11}%" style:animation-delay="{(i % 3) * 0.08}s"></i>{/each}</div>{/key}{/if}
{#if dock}<div class="spacer" style:height="{h}px" aria-hidden="true"></div>{/if}
<div class="act" class:dock bind:clientHeight={h}>
  {#if why && !block}<p class="why">{why}</p>{/if}
  {#if aux}<div class="row">{@render aux()}</div>{/if}
  <div class="line">
  {#if left && !block}{@render left()}{/if}
  {#if block}
    <button type="button" class="btn pmain" disabled aria-label="막는 중">⏳ 막는 중…</button>
  {:else if chained}
    <button type="button" class="btn pmain chained" disabled aria-label={'사슬에 묶임 · 문제 칸을 좌우로 쓸어 끊기'}><span class="ctx">⛓ 위 칸을 좌우로 쓸어 끊기</span><ChainFx thin cut={fx.chain.cut} broken={fx.chain.broken} /></button>
  {:else if ice}
    <button type="button" class="btn pmain ice" aria-label="얼음 깨기 · {fx.ice}번 남음" onclick={iceTap}><i class="iceart" style="{iceBg(4 - fx.ice)}" aria-hidden="true"></i><span class="ict">🧊 톡톡 깨기 · {fx.ice}</span></button>
  {:else if fire}
    <button type="button" class="btn pmain fire" class:holding aria-label="불 끄기" onpointerdown={holdOn} onpointerup={holdOff} onpointerleave={holdOff} onpointercancel={holdOff} oncontextmenu={(e) => e.preventDefault()}>🧯 꾹 눌러 끄기</button>
  {:else if href}
    <a class="btn pmain" {href} aria-label={mainLabel}>{#if main}{@render main()}{:else}{text}{/if}</a>
  {:else}
    <button type="button" class="btn pmain" disabled={disabled || (!main && !onmain)} aria-label={mainLabel} onclick={() => onmain?.()}>{#if main}{@render main()}{:else}{text}{/if}</button>
  {/if}
  {#if right && !block}{@render right()}{/if}
  </div>
</div>

<style>
  .spacer { flex: none; }
  .act { box-sizing: border-box; flex: none; z-index: 4; padding: var(--s2) var(--s4) calc(20px + env(safe-area-inset-bottom, 0px)); background: var(--bg); display: flex; flex-direction: column; gap: var(--s2); }
  .act.dock { position: fixed; bottom: 0; left: 0; right: 0; max-width: 430px; margin: 0 auto; }
  .line { display: flex; gap: var(--s2); align-items: stretch; min-width: 0; }
  .line > .btn { flex: 1; width: auto; min-width: 0; }
  .line :global(.side) { flex: none; height: var(--btn-h); border-radius: 14px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 12px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45); position: relative; }
  .line :global(.side:disabled) { opacity: 0.4; box-shadow: none; }
  .line :global(.side.hint) { width: var(--btn-h); } .line :global(.side.hint i) { font-style: normal; font-size: 22px; line-height: 1.1; }
  .line :global(.side.hint b) { position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; border-radius: 10px; background: var(--bad); color: #fff; font-size: 12px; display: grid; place-items: center; padding: 0 5px; }
  .line :global(.side.wr) { width: 84px; border: 2px solid var(--scroll); background: rgba(199, 155, 255, 0.14); font-size: 14px; } .line :global(.side.wr small) { font-size: 10px; font-weight: 500; color: var(--scroll); }
  .row { display: flex; gap: var(--s2); align-items: center; min-width: 0; }
  .btn { box-sizing: border-box; width: 100%; height: var(--btn-h); flex: none; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 var(--btn-fs) var(--font); box-shadow: 0 3px 0 var(--accent-sh); display: flex; align-items: center; justify-content: center; gap: var(--s2); text-decoration: none; padding: 0 var(--s3); overflow: hidden; white-space: nowrap; transition: transform var(--t), box-shadow var(--t); }
  .btn :global(small) { font-size: 13px; font-weight: 500; opacity: 0.85; }
  .btn:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .btn:disabled { opacity: 0.4; box-shadow: none; }
  .btn.ice { position: relative; overflow: visible; background: linear-gradient(135deg, #cfeaff, #8fc9f2 60%, #e8f6ff); color: #0d3550; box-shadow: 0 3px 0 #4f8fbf; }
  .iceart { position: absolute; left: 50%; top: 50%; width: 108%; transform: translate(-50%, calc(var(--bc) * -1)); background-repeat: no-repeat; image-rendering: pixelated; pointer-events: none; z-index: 1; }
  .btn.ice:active .iceart { transform: translate(-50%, calc(var(--bc) * -1)) scale(0.97); }
  .ict { position: relative; z-index: 2; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8); }
  .icebreak { position: fixed; left: 0; right: 0; margin: 0 auto; max-width: 430px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); height: var(--btn-h); padding: 0 var(--s4); pointer-events: none; z-index: 6; }
  .icebreak .iceart { width: calc(108% - 2 * var(--s4) * 1.08); animation: ibk 0.45s ease-out forwards; }
  @keyframes ibk { 0% { transform: translate(-50%, calc(var(--bc) * -1)) scale(1); opacity: 1; } 15% { transform: translate(-50%, calc(var(--bc) * -1)) scale(1.06); } 100% { transform: translate(-50%, calc(var(--bc) * -1)) scale(1.18); opacity: 0; } }
  .btn.chained { position: relative; overflow: visible; opacity: 1; background: #24262e; color: #c9ccd6; box-shadow: inset 0 0 0 2px #5a5e6b; }
  .btn.chained .ctx { position: relative; z-index: 0; font-size: 15px; opacity: 0.8; }
  .btn.fire { background: #3a1a12; color: #ffd7b0; box-shadow: inset 0 0 0 2px #ff7a3a, 0 3px 0 #000; touch-action: none; user-select: none; -webkit-user-select: none; }
  .btn.fire.holding { background: linear-gradient(90deg, #ff7a3a 0%, #3a1a12 0%); animation: hold 1s linear forwards; }
  @keyframes hold { from { background-size: 0% 100%; } to { background: #ff7a3a; } }
  .row :global(.btn2) { min-height: var(--btn-h); min-width: 92px; padding: 0 var(--s3); border-radius: 14px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .row :global(.btn2:disabled) { opacity: 0.4; }
  .why { margin: 0; text-align: center; font-size: var(--fs-small); color: var(--text-3); }
  .smokepuff { position: fixed; left: 0; right: 0; margin: 0 auto; max-width: 430px; bottom: calc(96px + env(safe-area-inset-bottom, 0px)); height: 32vh; pointer-events: none; z-index: 5; overflow: hidden; }
  .smokepuff i { position: absolute; bottom: -10%; width: 34%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, rgba(200, 200, 210, 0.75), rgba(140, 140, 150, 0.35) 55%, transparent 70%); filter: blur(4px); animation: puff 0.9s ease-out forwards; }
  @keyframes puff { from { transform: translateY(0) scale(0.4); opacity: 0.9; } to { transform: translateY(-24vh) scale(1.6); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .smokepuff { display: none; } }
</style>
