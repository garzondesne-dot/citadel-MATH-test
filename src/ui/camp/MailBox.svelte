<script lang="ts">
  // 📮 우편함 (정식 mail.js open 그대로 · 아래 시트): 받은 소식(안 읽음 = 왼쪽 금빛 줄) · 🎁 아직 안 받은 선물 = 「받기」 · 받은 선물 = ✔ 받음 · 열면 모두 읽음
  //   보내기 = 📝 설문(열렸을 때) · 💌 편지 · 🎁 친구 선물 = 다음 판 (정식에 있지만 베타에 아직 없음)
  import { untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import { inbox, isNew, md, seenGet, seenSet, unreadOf, type MailItem } from '../../school/mailbox';
  const { S, uid, cls, num, gem, survey = 0, onclaim, onsurvey, onclose }: { S: Store; uid: string; cls: string; num: number; gem: number; survey?: number; onclaim: (id: string) => string | Promise<string>; onsurvey?: () => void; onclose: () => void } = $props();
  let ver = $state(0), toast = $state('');
  const seen0 = untrack(() => seenGet(cls, num, S)); // 이번에 열기 전 = 안 읽음 표시 기준 (서버 · 이 기기 중 늦은 것)
  const list = $derived.by(() => { void ver; return inbox(S, uid, cls); });
  // 🗂 보관함 (📜 2026-11-15 머리 🔨): 읽은 소식 · 받은 선물 = 보관함 · 이번에 열 때 새 것이던 줄은 닫을 때까지 「받은 소식」에 그대로 (보다가 사라지지 않게)
  const new0 = untrack(() => new Set(inbox(S, uid, cls).filter((x) => isNew(x, seen0)).map((x) => `${x.k}|${x.id}`)));
  const fresh = $derived(list.filter((x) => new0.has(`${x.k}|${x.id}`) || isNew(x, seen0)));
  const kept = $derived(list.filter((x) => !new0.has(`${x.k}|${x.id}`) && !isNew(x, seen0)));
  let box = $state(false);
  const un = $derived(unreadOf(list, seen0));
  $effect(() => { const t = list[0]?.at ?? 0; untrack(() => seenSet(cls, num, Math.max(Date.now(), t), S)); }); // 열면 = 지금까지 모두 읽음
  const IC: Record<MailItem['k'], string> = { gift: '🎁', msg: '✉', reply: '💌', notice: '📢' };
  let busy = false;
  async function take(x: MailItem) { if (busy) return; busy = true; try { toast = await onclaim(x.id); } finally { busy = false; } ver++; setTimeout(() => (toast = ''), 2000); } // 🐞 11/20 ② 두 번 누름 · 두 기기 = 한 번만
</script>

<Sheet {onclose} tall>
  {#snippet title()}📮 우편함 <small class="gem">💎 {gem.toLocaleString()}</small>{/snippet}
  <div class="mb" data-k="mailbox">
    <p class="sub"><b>받은 소식</b><span>{un ? `안 읽음 ${un}` : '모두 읽음'}</span></p>
    {#if toast}<p class="toast" role="status">{toast}</p>{/if}
    {#snippet row(x: MailItem)}
      <div class="mi" class:unread={x.at > seen0 || (x.k === 'gift' && !x.got)} data-mail={x.k}>
        <span class="ic" aria-hidden="true">{IC[x.k]}</span>
        <span class="tx"><b>{x.text}{x.g ? ` · 💎 ${x.g}` : ''}{x.s ? ` · 📜 ${x.s}` : ''}</b><small>{x.sub} · {md(x.at)}</small></span>
        {#if x.k === 'gift' && !x.got}<button type="button" class="take" data-claim={x.id} onclick={() => take(x)}>받기</button>{:else if x.k === 'gift' || (x.k !== 'notice' && x.g)}<em>✔ 받음</em>{/if}
      </div>
    {/snippet}
    {#each fresh.slice(0, 40) as x (`${x.k}|${x.id}`)}{@render row(x)}{:else}
      <div class="empty"><span aria-hidden="true">📮</span><p>{kept.length ? '새 소식이 없어요 · 읽은 것은 🗂 보관함에' : '아직 받은 소식이 없어요'}</p></div>
    {/each}
    {#if kept.length}<button type="button" class="boxh" data-k="mail-box" aria-expanded={box} onclick={() => (box = !box)}><b>🗂 보관함</b><span>{kept.length} {box ? '⌃' : '⌄'}</span></button>
      {#if box}{#each kept.slice(0, 60) as x (`${x.k}|${x.id}`)}{@render row(x)}{/each}{/if}{/if}
    <p class="sub"><b>보내기</b></p>
    <div class="send">
      <button type="button" disabled={!survey} onclick={() => onsurvey?.()}><i>📝</i>설문{#if survey}<small>{survey}차시</small>{/if}</button>
      <button type="button" disabled title="다음 판에서 열려요"><i>💌</i>편지<small>다음 판</small></button>
      <button type="button" disabled title="다음 판에서 열려요"><i>🎁</i>친구 선물<small>다음 판</small></button>
    </div>
  </div>
</Sheet>

<style>
  .gem { margin-left: 8px; font-size: 14px; color: var(--gem); font-weight: 700; }
  .mb { display: flex; flex-direction: column; gap: var(--s2); padding-bottom: var(--s3); }
  .sub { margin: var(--s2) 0 0; display: flex; justify-content: space-between; align-items: baseline; font-size: 15px; }
  .sub span { color: var(--text-2); font-size: 13px; }
  .mi { display: flex; align-items: center; gap: var(--s2); padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface-2); border-left: 3px solid transparent; min-height: var(--tap); }
  .mi.unread { border-left-color: var(--accent); }
  .ic { font-size: 20px; width: 28px; text-align: center; flex: none; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .tx b { font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
  .tx small { font-size: 13px; color: var(--text-2); }
  em { font-style: normal; font-size: 13px; color: var(--ok); flex: none; }
  .take { flex: none; min-height: 40px; padding: 0 14px; border-radius: 12px; border: 0; background: var(--accent); color: var(--on-accent, #1a1400); font: 700 14px var(--font); box-shadow: 0 3px 0 var(--accent-sh, rgba(0, 0, 0, 0.4)); }
  .take:active { transform: translateY(2px); box-shadow: none; }
  .send { display: flex; gap: var(--s2); }
  .send button { flex: 1; min-height: 64px; border-radius: 12px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
  .send button i { font-style: normal; font-size: 20px; }
  .send button small { font-size: 11px; color: var(--text-2); font-weight: 500; }
  .send button:disabled { opacity: 0.45; }
  .boxh { all: unset; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center; min-height: var(--tap); padding: 0 var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--line, #2f3440); cursor: pointer; font-size: 15px; } .boxh span { color: var(--text-2); font-size: 13px; }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--s4); color: var(--text-2); }
  .empty span { font-size: 32px; }
  .empty p { margin: 0; }
  .toast { margin: 0; color: var(--ok); font-weight: 700; font-size: 14px; }
</style>
