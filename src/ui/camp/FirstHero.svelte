<script lang="ts">
  import { untrack } from 'svelte';
  import { HEROES, heroOf } from '../../model/hero';
  import type { Me } from '../../store/me.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import HeroIntro from './HeroIntro.svelte';
  import HeroSprite from './HeroSprite.svelte';

  // 🧙 첫 용사 고르기 (📜 2026-11-13 밤 ❓#1 = A · 선생님 답 → 머리 🔨 「베타 가입 마지막에 기본 용사 · 🧙 소개 카드로 보고 고름 → 캠프」)
  //   가입한 그 폰 첫 캠프에서 한 번만 · 위 = 고른 용사 소개 카드(몽타주 · 이야기 · 스킬 단계) · 아래 = 기본 용사(처음부터 열린 용사)만 칸 · 「⚔ ○○ 와 시작」
  //   나중에 바꾸기 = 내 용사 「용사 바꾸기」(같은 소개 카드) · 고르면 me.hero 저장 · me.seen.hero0 = 다시 안 뜸
  const { me, persist, ondone }: { me: Me; persist: () => void; ondone: () => void } = $props();
  const BASIC = HEROES.filter((h) => !!h.open);
  let pick = $state(untrack(() => (BASIC.some((h) => h.id === me.hero) ? me.hero : (BASIC[0]?.id ?? 0))));
  const h = $derived(heroOf(pick));
  const ro = (n: string) => { const c = n.charCodeAt(n.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? '과' : '와'; };
  function go() { me.hero = pick; me.seen['hero0'] = true; persist(); ondone(); }
</script>

<div class="fh" role="dialog" aria-modal="true" aria-label="첫 용사 고르기" data-k="first-hero">
  <div class="hd"><b>🧙 첫 용사 고르기</b><small>함께 모험할 용사를 골라요 · 나중에 「내 용사」에서 바꿀 수 있어요</small></div>
  <div class="mid">
    <HeroIntro id={pick} />
    <div class="grid">
      {#each BASIC as x (x.id)}
        <button type="button" class="c" class:on={x.id === pick} aria-pressed={x.id === pick} aria-label="{x.name} · {x.job}" onclick={() => (pick = x.id)}>
          <span class="pic"><HeroSprite id={x.id} /></span><b>{x.name}</b><small>{x.job}</small>{#if x.id === pick}<em>✓</em>{/if}
        </button>
      {/each}
    </div>
  </div>
  <BottomAction dock={false} onmain={go} text="⚔ {h.name}{ro(h.name)} 시작" mainLabel="이 용사로 시작" />
</div>

<style>
  .fh { position: fixed; inset: 0; z-index: 40; max-width: 430px; margin: 0 auto; display: flex; flex-direction: column; background: var(--bg); color: var(--text); }
  .hd { padding: var(--s4) var(--s4) var(--s2); display: flex; flex-direction: column; gap: 2px; }
  .hd b { font-size: 20px; } .hd small { font-size: 14px; color: var(--text-2); }
  .mid { flex: 1; min-height: 0; overflow-y: auto; padding: 0 var(--s4) var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s2); }
  .c { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 112px; padding: var(--s2) 4px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font-family: var(--font); box-shadow: 0 3px 0 var(--press-sh, rgba(0, 0, 0, 0.4)); }
  .c:active { transform: translateY(2px); box-shadow: none; }
  .c.on { border: 2px solid var(--accent); background: var(--surface-2); }
  .pic { height: 60px; display: grid; place-items: end center; }
  .c b { font-size: 14px; } .c small { font-size: 13px; color: var(--text-2); }
  .c em { position: absolute; top: 4px; right: 6px; font-style: normal; color: var(--accent); font-weight: 900; }
</style>
