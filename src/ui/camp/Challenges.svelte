<script lang="ts">
  import type { Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import { CHALS, chalState, claimOf, TIER_NAME, type ChalCtx, type Tier } from '../../school/challenges';
  import { titleOf } from '../../model/hero';
  import { sfx } from '../sound.svelte';
  // 🏆 #68 도전과제 판: 늘 보임 · 진행 막대 n/m · 「🎁 받기」 기한 없음 · 과제마다 한 번 · 보상 = 하루 한도 밖(gem log chal_{id})
  const { me, ctx, claim, onclose }: { S?: Store; me: Me; ctx: () => ChalCtx; /** 받기 = log 한 줄 쓰고 지갑에 (부모가 저장) */ claim: (key: string, row: { g: number; s?: number; at: number; why: string }) => boolean; onclose: () => void } = $props();
  let ver = $state(0), toast = $state('');
  const C = $derived.by(() => { void ver; return ctx(); });
  const rows = $derived.by(() => { void ver; return CHALS.filter((ch) => !ch.hide?.(C)).map((ch) => ({ ch, st: chalState(ch, C) })); });
  const tiers: Tier[] = ['seed', 'adv', 'leg'];
  const rw = (r: (typeof CHALS)[number]['reward']) => [r.gem ? `💎 ${r.gem}` : '', r.scroll ? `📜 ${r.scroll}` : '', r.title ? `🏅 「${titleOf(r.title)?.name ?? r.title}」` : '', r.unlock ? r.unlock : ''].filter(Boolean).join(' + ');
  let busy = '';
  function take(id: string) {
    if (busy) return; busy = id;
    const ch = CHALS.find((x) => x.id === id); if (!ch) { busy = ''; return; }
    const c = claimOf(ch, ctx(), Date.now());
    if (c && claim(c.key, c.row)) { sfx('mail', 0.7); toast = `🎁 ${ch.name} · ${rw(ch.reward)}`; setTimeout(() => (toast = ''), 2600); }
    ver++; busy = '';
  }
</script>

<Sheet {onclose} tall mainText="닫기">
  {#snippet title()}🏆 도전과제 <small class="cnt">{rows.filter((r) => r.st.got).length} / {rows.length}</small>{/snippet}
  <div class="ch" data-k="chal">
    {#if toast}<p class="toast" role="status" data-k="chal-toast">{toast}</p>{/if}
    {#each tiers as t (t)}
      <p class="tier">{TIER_NAME[t]}</p>
      <ul>
        {#each rows.filter((r) => r.ch.tier === t) as r (r.ch.id)}
          <li class:done={r.st.done} class:got={r.st.got} data-chal={r.ch.id}>
            <span class="ic" aria-hidden="true">{r.ch.ic}</span>
            <span class="tx"><b>{r.ch.name}</b><small>{r.ch.cond}</small>
              <span class="bar" aria-label="진행 {r.st.n} / {r.st.m}"><i style:width="{(r.st.n / Math.max(1, r.st.m)) * 100}%"></i></span>
              <em class="rw">{rw(r.ch.reward)} · {r.st.n} / {r.st.m}</em></span>
            {#if r.st.got}<span class="st ok">✔ {r.ch.auto ? '열림' : '받음'}</span>
            {:else if r.st.done}<button type="button" class="take" data-k="chal-take" onclick={() => take(r.ch.id)}>🎁 받기</button>
            {:else}<span class="st">진행 중</span>{/if}
          </li>
        {/each}
      </ul>
    {/each}
    <p class="note">기한 없음 · 과제마다 한 번 · 💎 는 하루 한도와 따로 · 수업 점수는 안 셈</p>
  </div>
</Sheet>

<style>
  .cnt { font-size: 13px; color: var(--text-2); font-weight: 600; margin-left: 4px; }
  .ch { display: flex; flex-direction: column; gap: var(--s2); padding-bottom: var(--s3); }
  .tier { margin: var(--s2) 0 0; font: 800 15px var(--font); color: var(--accent); }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  li { display: flex; align-items: center; gap: var(--s2); min-height: 64px; padding: 6px var(--s2); border-radius: 12px; background: var(--surface); border: 1px solid var(--line, #2f3440); }
  li.done:not(.got) { border-color: var(--accent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent); }
  li.got { opacity: 0.7; }
  .ic { flex: none; width: 34px; text-align: center; font-size: 24px; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; } .tx b { font-size: 15px; } .tx small { font-size: 12px; color: var(--text-2); }
  .bar { display: block; height: 6px; border-radius: 3px; background: var(--surface-2); overflow: hidden; } .bar i { display: block; height: 100%; background: var(--accent); border-radius: 3px; }
  .rw { font-style: normal; font-size: 12px; color: var(--gem); }
  .take { flex: none; min-height: 44px; min-width: 76px; border-radius: 12px; border: 0; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 14px var(--font); box-shadow: 0 3px 0 var(--accent-sh, #9a6a10); }
  .take:active { transform: translateY(2px); box-shadow: none; }
  .st { flex: none; font: 700 12px var(--font); color: var(--text-3); } .st.ok { color: var(--ok); }
  .toast { margin: 0; padding: var(--s2) var(--s3); border-radius: 10px; background: color-mix(in srgb, var(--accent) 20%, var(--surface)); font: 700 14px var(--font); text-align: center; }
  .note { margin: var(--s2) 0 0; font-size: 12px; color: var(--text-3); text-align: center; }
</style>
