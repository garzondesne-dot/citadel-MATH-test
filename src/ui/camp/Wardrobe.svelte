<script lang="ts">
  import Sheet from '../battle/Sheet.svelte';
  import HeroSprite from './HeroSprite.svelte';
  import NameTag from '../cos/NameTag.svelte';
  import CosAura from '../cos/CosAura.svelte';
  import { COS, COS_BY, COS_KINDS, auraColorOf, buyCos, cardBgOf, cosLog, cosWorn, furnOf, isWorn, ownsCos, priceOf, toggleWear, type CosKind, type CosOn } from '../../model/cosmetics';
  import type { Me } from '../../store/me.svelte';
  import { meBound } from '../../store/meSync';
  import { sfx } from '../sound.svelte';
  // 🎨 옷장 (📜 2026-11-25 · 머리 🔨 · 설계 gem-sinks DESIGN-v1 2-2절): 위 = 내 용사 미리 보기(카드 배경 · 발밑 빛 · 이름표 · 공격 색 견본) · 가운데 = 종류 탭 5 + 물건 칸
  //   물건 누르기 = 입어 보기(미리 보기만) → 아래 단추 「💎 n 으로 사기」 → 한 번 더 「정말 살까요?」 → 산 것은 「입기 / 벗기」 · 되팔기 · 선물 없음 · 같은 종류는 하나만 입음
  let { me, save, lk, name, onclose }: { me: Me; save: () => void; lk: number; name: string; onclose: () => void } = $props();
  let tab = $state<CosKind>('nameColor'), tryId = $state(''), ask = $state(false), toast = $state('');
  const worn = $derived(cosWorn(me.wallet, me.cos));
  const view = $derived<CosOn>(tryId ? (isWorn(worn, COS_BY[tryId]!) ? worn : toggleWear(worn, COS_BY[tryId]!)) : worn); // 입어 보기 = 미리 보기에만 (가구 = 목록에 더해 봄)
  const items = $derived(COS.filter((c) => c.kind === tab));
  const cur = $derived(tryId ? COS_BY[tryId] ?? null : null);
  const owned = $derived(!!cur && ownsCos(me.wallet, cur.id)), wearing = $derived(!!cur && isWorn(worn, cur));
  const price = $derived(cur ? priceOf(cur) : 0), short = $derived(cur && !owned ? Math.max(0, price - me.wallet.gem) : 0);
  const fxSw = $derived(view.fx ? COS_BY[view.fx]?.v2 ?? '' : '');
  const say = (t: string) => { toast = t; setTimeout(() => { if (toast === t) toast = ''; }, 1800); };
  function pick(id: string) { sfx('click', 0.5); ask = false; tryId = tryId === id ? '' : id; }
  function main() {
    if (!cur) { onclose(); return; }
    if (owned) { me.cos = toggleWear(worn, cur); save(); sfx('star', 0.6); say(wearing ? `${cur.name} 벗었어요` : `${cur.name} 입었어요`); tryId = ''; return; }
    if (!ask) { ask = true; return; }
    const at = Date.now(), err = buyCos(me.wallet, cur.id, at);
    if (err) { say(err); ask = false; return; }
    me.cos = isWorn(worn, cur) ? worn : toggleWear(worn, cur); // 산 것은 바로 입음 (가구 = 바로 놓음)
    save(); ask = false; sfx('special', 0.6); say(`🎨 ${cur.name} 샀어요 · 입었어요`);
    const b = meBound(); if (b) { const l = cosLog(cur.id, at); b.S.set(`gem/${b.cls}/${b.num}/log/${l.key}`, l.row); }
    tryId = '';
  }
  const mainText = $derived(!cur ? '닫기' : owned ? (cur.kind === 'furn' ? (wearing ? '치우기' : '놓기') : wearing ? '벗기' : '입기') : short ? `💎 ${short} 이 모자라요` : ask ? `정말 살까요? 💎 ${price}` : `💎 ${price} 으로 사기`);
</script>

<Sheet {onclose} tall mainText={mainText} onmain={main} mainDisabled={!!short} why={short ? '💎 는 수업 · 복습 · 게시판 던전에서 모여요' : ask ? '산 물건은 되팔 수 없어요' : ''}>
  {#snippet title()}🎨 옷장 <small class="wal" data-k="ward-gem">💎 {me.wallet.gem.toLocaleString()}</small>{/snippet}
  <div class="pv" style:background={cardBgOf(view) || null} data-k="ward-preview" data-bg={view.cardBg ?? ''}>
    <span class="hero"><CosAura color={auraColorOf(view)} /><span class="spr"><HeroSprite id={lk} scale={1.5} aura={me.enh} play /></span></span>
    <span class="nm"><NameTag {name} on={view} /></span>
    {#if furnOf(view).length}<span class="furn" data-k="ward-furn">{#each furnOf(view) as f (f)}<img src={COS_BY[f]?.img} alt={COS_BY[f]?.name} />{/each}</span>{/if}
    {#if fxSw}<span class="fxs" style:--c={fxSw} data-k="ward-fx">⚔ 공격 색</span>{/if}
  </div>
  <div class="tabs" role="tablist">
    {#each COS_KINDS as k (k.k)}<button type="button" role="tab" class:on={tab === k.k} aria-selected={tab === k.k} data-k="ward-tab-{k.k}" onclick={() => { tab = k.k; tryId = ''; ask = false; }}><i aria-hidden="true">{k.ic}</i>{k.name}</button>{/each}
  </div>
  <div class="grid">
    {#each items as c (c.id)}
      {@const own = ownsCos(me.wallet, c.id)}
      {@const on = isWorn(worn, c)}
      <button type="button" class="it" class:sel={tryId === c.id} class:own data-k="ward-item" data-id={c.id} aria-pressed={tryId === c.id} onclick={() => pick(c.id)}>
        {#if c.img}<img class="sw img {c.kind}" src={c.img} alt="" aria-hidden="true" />{:else}<i class="sw {c.kind}" style:--c={c.kind === 'fx' ? c.v2 : c.kind === 'nameFrame' ? c.v : c.v} style:background={c.kind === 'cardBg' ? c.v : null} aria-hidden="true"></i>{/if}
        <b>{c.name}</b>
        <small>{on ? (c.kind === 'furn' ? '✓ 놓음' : '✓ 입음') : own ? '가짐' : `💎 ${priceOf(c)}`}</small>
      </button>
    {/each}
  </div>
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
</Sheet>

<style>
  .wal { margin-left: 8px; font: 700 14px var(--font); color: var(--gem, #6cc6ff); }
  .pv { position: relative; display: grid; justify-items: center; gap: 8px; padding: 16px 12px 14px; border-radius: 16px; background: var(--surface-2); min-height: 190px; overflow: hidden; }
  .hero { position: relative; display: grid; place-items: end center; min-height: 120px; }
  .spr { position: relative; z-index: 1; }
  .nm { font: 700 16px var(--font); color: var(--text); }
  .fxs { position: absolute; right: 10px; top: 10px; padding: 2px 10px; border-radius: 999px; font: 700 13px var(--font); color: #fff; background: color-mix(in srgb, var(--c) 70%, #000); box-shadow: 0 0 10px var(--c); }
  .tabs { position: sticky; top: 0; z-index: 3; display: flex; gap: 6px; overflow-x: auto; padding: 10px 0 8px; scrollbar-width: none; background: var(--surface); } /* 물건이 많아 내려도 종류 탭은 위에 남음 */
  .tabs button { flex: none; }
  .tabs button { flex: none; min-height: 40px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 700 14px var(--font); display: inline-flex; gap: 4px; align-items: center; }
  .tabs button.on { background: var(--accent); color: #1a1206; border-color: var(--accent); }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-bottom: 8px; }
  .it { min-height: 88px; display: grid; justify-items: center; align-content: center; gap: 4px; padding: 8px 4px; border-radius: 12px; border: 2px solid var(--line); background: var(--surface-2); color: var(--text); font: 600 14px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .it:active { transform: translateY(2px); box-shadow: none; }
  .it.sel { border-color: var(--accent); }
  .it small { font: 600 13px var(--font); color: var(--text-2); }
  .it.own small { color: var(--ok, #4cc38a); }
  .sw { width: 34px; height: 22px; border-radius: 999px; background: var(--c); }
  .sw.nameFrame { background: transparent; border: 3px solid var(--c); box-shadow: 0 0 8px var(--c); }
  .sw.aura { border-radius: 50%; width: 40px; height: 14px; background: radial-gradient(ellipse, var(--c), transparent 70%); }
  .sw.cardBg { width: 40px; height: 28px; border-radius: 6px; }
  .sw.img { width: auto; height: 40px; max-width: 64px; object-fit: contain; image-rendering: pixelated; background: none; border-radius: 6px; }
  .sw.img.cardBg { width: 30px; height: 40px; object-fit: cover; }
  .furn { position: absolute; left: 8px; bottom: 8px; display: flex; gap: 4px; align-items: flex-end; }
  .furn img { height: 34px; image-rendering: pixelated; }
  .toast { position: sticky; bottom: 0; margin: 4px 0 0; padding: 8px 12px; border-radius: 12px; background: rgba(0, 0, 0, 0.7); color: #fff; font: 600 14px var(--font); text-align: center; }
</style>
