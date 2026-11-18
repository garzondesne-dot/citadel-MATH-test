<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import type { Me } from '../../store/me.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import Challenges from './Challenges.svelte';
  import type { ChalCtx } from '../../school/challenges';
  import { CARD_TOTAL, TITLES } from '../../model/hero';
  // ⛺ #73 텐트 = 🏆 나의 기록 방 (📜 2026-11-18 · DECISIONS 「텐트 = 나의 기록 방」): 도전과제 판(#68) + 칭호 + 도감 · 위 막대 🏆 단추 대신
  //   탭 = 🏆 도전과제 · 🏅 칭호 · 📖 도감 (+ 🥚 비밀 = #74 가 extra 로 더함)
  type Tab = { id: string; label: string; body: Snippet };
  const { me, ctx, claim, earned, symSeen = 0, onanvil, onclose, tab = 'chal', extra = [] }: {
    me: Me; ctx: () => ChalCtx; claim: (key: string, row: { g: number; s?: number; at: number; why: string }) => boolean;
    /** 가진 칭호 id */ earned: string[]; /** 💬 기호 톡에서 본 기호 수 */ symSeen?: number; onanvil: () => void; onclose: () => void; tab?: string; extra?: Tab[];
  } = $props();
  let cur = $state(untrack(() => tab));
  const cardsN = $derived(Object.keys(me.cards ?? {}).length);
  const TIER_CLS: Record<string, string> = { w: 't-w', b: 't-b', p: 't-p', o: 't-o' };
</script>

<Sheet {onclose} tall mainText="닫기">
  {#snippet title()}⛺ 기록 텐트{/snippet}
  <div class="rr" data-k="rec-room">
    <div class="tabs" role="tablist">
      {#each [{ id: 'chal', label: '🏆 도전과제' }, { id: 'ttl', label: '🏅 칭호' }, { id: 'book', label: '📖 도감' }, ...extra.map((x) => ({ id: x.id, label: x.label }))] as t (t.id)}
        <button type="button" role="tab" aria-selected={cur === t.id} class:on={cur === t.id} data-k="rec-tab-{t.id}" onclick={() => (cur = t.id)}>{t.label}</button>
      {/each}
    </div>
    {#if cur === 'chal'}
      <Challenges {me} {ctx} {claim} {onclose} embed />
    {:else if cur === 'ttl'}
      <p class="cap">가진 칭호 <b>{TITLES.filter((t) => earned.includes(t.id)).length}</b> / {TITLES.length} · 고르기 = 🧙 내 용사</p>
      <div class="ttls" data-k="rec-titles">
        {#each TITLES.filter((t) => earned.includes(t.id)) as t (t.id)}<span class="ttp {TIER_CLS[t.tier]}">{t.name}</span>{/each}
        {#each TITLES.filter((t) => !earned.includes(t.id)) as t (t.id)}<span class="ttp lock">{t.name}<small>{t.cond}</small></span>{/each}
      </div>
    {:else if cur === 'book'}
      <div class="book" data-k="rec-book">
        <button type="button" class="row" onclick={onanvil}><span class="ic" aria-hidden="true">🃏</span><span class="tx"><b>카드 도감</b><small>모루에서 만든 카드</small></span><em>{cardsN} / {CARD_TOTAL}</em></button>
        <div class="row"><span class="ic" aria-hidden="true">💬</span><span class="tx"><b>기호 톡</b><small>문제에서 눌러 본 기호</small></span><em>{symSeen}</em></div>
      </div>
    {:else}
      {#each extra.filter((x) => x.id === cur) as x (x.id)}{@render x.body()}{/each}
    {/if}
  </div>
</Sheet>

<style>
  .rr { display: flex; flex-direction: column; gap: var(--s3); padding-bottom: var(--s3); }
  .tabs { display: flex; gap: 6px; overflow-x: auto; position: sticky; top: 0; z-index: 2; padding: 2px 0 6px; background: var(--surface, #181b22); }
  .tabs button { flex: none; min-height: 40px; padding: 0 14px; border-radius: 20px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text-2); font: 700 14px var(--font); }
  .tabs button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent, #1d1406); }
  .cap { margin: 0; font-size: 13px; color: var(--text-2); }
  .ttls { display: flex; flex-wrap: wrap; gap: 6px; }
  .ttp { display: inline-flex; flex-direction: column; padding: 6px 12px; border-radius: 12px; background: var(--surface-2); font: 700 14px var(--font); }
  .ttp small { font: 500 11px var(--font); color: var(--text-3); }
  .ttp.lock { opacity: 0.55; }
  .ttp.t-b { color: #6cc6ff; } .ttp.t-p { color: #c79bff; } .ttp.t-o { color: #f5b84a; }
  .book { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 10px; min-height: 60px; padding: 8px 12px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line, #2f3440); color: var(--text); text-align: left; font: inherit; }
  .row .ic { font-size: 24px; } .row .tx { flex: 1; display: flex; flex-direction: column; } .row b { font-size: 15px; } .row small { font-size: 12px; color: var(--text-2); } .row em { font: 800 15px var(--font); font-style: normal; color: var(--accent); }
</style>
