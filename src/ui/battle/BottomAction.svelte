<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fx } from './fx.svelte';
  // 🟡 BottomAction (3절 · #151 「주요 단추 = 모든 화면 한 자리」): 학생 폰의 노란 주요 단추는 이 부품 하나로만 그림
  //   주요 단추 = 높이 56 · 폭 = 양옆 16 뺀 전체 · 폰 바닥(안전 영역 위)에서 20 · 늘 맨 아래
  //   그 위 = 이유 한 줄(why) · 보조 줄(aux: 보조 단추 · 바뀐 것 줄 …) — 주요 단추를 밀어 올리지 않고 위로 쌓임
  //   주요 단추가 없는 화면 = 그 자리를 비워 두지 않고 흐린 단추(text) + 이유
  //   dock = 화면 바닥에 고정(fixed + 같은 높이 빈칸) · false = 이미 바닥에 붙은 판(시트 · 전체 화면 판) 안에서 마지막 줄
  //   💥 몬스터 공격 중(fx.block) = 같은 자리 흐린 「⏳ 막는 중…」
  const { main, text = '', disabled = false, why = '', onmain, aux, mainLabel, href, dock = true, battle = false }:
    { main?: Snippet; text?: string; disabled?: boolean; why?: string; onmain?: () => void; aux?: Snippet; mainLabel?: string; href?: string; dock?: boolean; battle?: boolean } = $props();
  let h = $state(0);
  const block = $derived(battle && fx.block);
</script>

{#if dock}<div class="spacer" style:height="{h}px" aria-hidden="true"></div>{/if}
<div class="act" class:dock bind:clientHeight={h}>
  {#if why && !block}<p class="why">{why}</p>{/if}
  {#if aux}<div class="row">{@render aux()}</div>{/if}
  {#if block}
    <button type="button" class="btn pmain" disabled aria-label="막는 중">⏳ 막는 중…</button>
  {:else if href}
    <a class="btn pmain" {href} aria-label={mainLabel}>{#if main}{@render main()}{:else}{text}{/if}</a>
  {:else}
    <button type="button" class="btn pmain" disabled={disabled || (!main && !onmain)} aria-label={mainLabel} onclick={() => onmain?.()}>{#if main}{@render main()}{:else}{text}{/if}</button>
  {/if}
</div>

<style>
  .spacer { flex: none; }
  .act { box-sizing: border-box; flex: none; z-index: 4; padding: var(--s2) var(--s4) calc(20px + env(safe-area-inset-bottom, 0px)); background: var(--bg); display: flex; flex-direction: column; gap: var(--s2); }
  .act.dock { position: fixed; bottom: 0; left: 0; right: 0; max-width: 430px; margin: 0 auto; }
  .row { display: flex; gap: var(--s2); align-items: center; min-width: 0; }
  .btn { box-sizing: border-box; width: 100%; height: var(--btn-h); flex: none; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 var(--btn-fs) var(--font); box-shadow: 0 3px 0 var(--accent-sh); display: flex; align-items: center; justify-content: center; gap: var(--s2); text-decoration: none; padding: 0 var(--s3); overflow: hidden; white-space: nowrap; transition: transform var(--t), box-shadow var(--t); }
  .btn :global(small) { font-size: 13px; font-weight: 500; opacity: 0.85; }
  .btn:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .btn:disabled { opacity: 0.4; box-shadow: none; }
  .row :global(.btn2) { min-height: var(--btn-h); min-width: 92px; padding: 0 var(--s3); border-radius: 14px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .row :global(.btn2:disabled) { opacity: 0.4; }
  .why { margin: 0; text-align: center; font-size: var(--fs-small); color: var(--text-3); }
</style>
