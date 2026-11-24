<script lang="ts">
  import Sheet from '../battle/Sheet.svelte';
  import PetSprite from '../cos/PetSprite.svelte';
  import { PET_CFG, PET_TRIAL, eggPriceOf, PET_COS, PET_KINDS, PET_NAME_A, PET_NAME_B, PET_BY, STAGE_NAME, buyEgg, buyPetCos, nextOf, ownsPetCos, petClean, petCosOf, stageOf, togglePetCos, type PetKind, type PetState } from '../../model/pets';
  import type { Me } from '../../store/me.svelte';
  import { meBound } from '../../store/meSync';
  import { sfx } from '../sound.svelte';
  import { TRIAL } from '../../channel';
  // 🐾 둥지 (📜 2026-11-25 · 머리 🔨 · 설계 gem-sinks DESIGN-v1 3절): 탭 3 = 🐾 내 펫(데리고 다닐 펫 · 먹이 막대 · 누르면 폴짝) / 🥚 알(3종 · 단계 그림 미리 다 보임 · 이름 = 낱말 둘 고르기 · 💎 150) / 🎀 꾸미기(다 큰 펫만 · 머리 · 목 · 💎 80)
  //   💎 로 먹이를 살 수 없음 · 먹이 = 수업 한 차시 +5 · 허수아비 정답 +1(하루 5) · 굶지 않음
  let { me, save, onclose }: { me: Me; save: () => void; onclose: () => void } = $props();
  const st = $derived<PetState>(petClean(me.pet));
  const ids = $derived(Object.keys(st.list || {}));
  let tab = $state<'mine' | 'egg' | 'cos'>(Object.keys(petClean(me.pet).list || {}).length ? 'mine' : 'egg');
  let kind = $state<PetKind>('dragon'), na = $state<string>(PET_NAME_A[0]), nb = $state<string>(PET_NAME_B[0]), ask = $state(false), toast = $state(''), hop = $state(0), pickCos = $state('');
  const cur = $derived(st.on && st.list?.[st.on] ? { id: st.on, ...st.list[st.on]! } : null);
  const eggPrice = $derived(eggPriceOf(me.pet, TRIAL)), mul = TRIAL ? PET_TRIAL.foodMul : 1; // 👩‍🏫 체험판 = 첫 알 무료 · 먹이 ×5 (원래 수업은 💎 150 · +5 · +1)
  const say = (t: string) => { toast = t; setTimeout(() => { if (toast === t) toast = ''; }, 1800); };
  const logBuy = (key: string, g: number, why: string, at: number) => { const b = meBound(); if (b) b.S.set(`gem/${b.cls}/${b.num}/log/${key}`, { g: 0, spend: g, at, why }); };
  function setOn(id: string) { sfx('click', 0.5); me.pet = { ...st, on: id }; save(); hop++; }
  function buy() {
    if (!ask && eggPrice) { ask = true; return; }
    const s2 = petClean(me.pet), at = Date.now(), r = buyEgg(me.wallet, s2, kind, `${na} ${nb}`, at, eggPrice);
    ask = false;
    if ('err' in r) { say(r.err); return; }
    me.pet = s2; save(); sfx('special', 0.6); say(`🥚 ${PET_BY[kind].name} 알이 둥지에 왔어요!`); logBuy(`pet_egg_${r.id}`, eggPrice, `🐾 ${PET_BY[kind].name} 알`, at); tab = 'mine'; hop++;
  }
  function cosMain() {
    if (!cur || !pickCos) return;
    if (ownsPetCos(me.wallet, cur.id, pickCos)) { const s2 = petClean(me.pet); s2.list![cur.id] = togglePetCos(s2.list![cur.id]!, pickCos); me.pet = s2; save(); sfx('star', 0.6); pickCos = ''; return; }
    if (!ask) { ask = true; return; }
    const s2 = petClean(me.pet), at = Date.now(), err = buyPetCos(me.wallet, s2, cur.id, pickCos, at); ask = false;
    if (err) { say(err); return; }
    s2.list![cur.id] = togglePetCos(s2.list![cur.id]!, pickCos); me.pet = s2; save(); sfx('special', 0.6); logBuy(`petcos_${pickCos}_${cur.id}`, PET_CFG.cos, '🎀 펫 꾸미기', at); say('🎀 샀어요 · 입혔어요'); pickCos = '';
  }
  const eggShort = $derived(Math.max(0, eggPrice - me.wallet.gem)), cosShort = $derived(Math.max(0, PET_CFG.cos - me.wallet.gem));
  const cosOwned = $derived(!!cur && !!pickCos && ownsPetCos(me.wallet, cur.id, pickCos)), cosOn = $derived(!!cur && petCosOf(cur).includes(pickCos));
  const mainText = $derived(tab === 'egg' ? (eggShort ? `💎 ${eggShort} 이 모자라요` : !eggPrice ? '🥚 첫 알 무료로 받기' : ask ? `정말 살까요? 💎 ${eggPrice}` : `🥚 💎 ${eggPrice} 으로 알 사기`) : tab === 'cos' && pickCos ? (cosOwned ? (cosOn ? '벗기기' : '입히기') : cosShort ? `💎 ${cosShort} 이 모자라요` : ask ? `정말 살까요? 💎 ${PET_CFG.cos}` : `🎀 💎 ${PET_CFG.cos} 으로 사기`) : '닫기');
  const onmain = $derived(tab === 'egg' ? buy : tab === 'cos' && pickCos ? cosMain : onclose);
  const disabled = $derived((tab === 'egg' && !!eggShort) || (tab === 'cos' && !!pickCos && !cosOwned && !!cosShort));
</script>

<Sheet {onclose} tall mainText={mainText} {onmain} mainDisabled={disabled} why={ask ? '산 것은 되팔 수 없어요' : tab === 'egg' ? '먹이는 💎 로 살 수 없어요 · 수업 · 허수아비로 키워요' : ''}>
  {#snippet title()}🐾 둥지 <small class="wal">💎 {me.wallet.gem.toLocaleString()}</small>{/snippet}
  <div class="tabs" role="tablist">
    <button type="button" role="tab" class:on={tab === 'mine'} aria-selected={tab === 'mine'} data-k="nest-tab-mine" disabled={!ids.length} onclick={() => { tab = 'mine'; ask = false; }}>🐾 내 펫</button>
    <button type="button" role="tab" class:on={tab === 'egg'} aria-selected={tab === 'egg'} data-k="nest-tab-egg" onclick={() => { tab = 'egg'; ask = false; }}>🥚 알</button>
    <button type="button" role="tab" class:on={tab === 'cos'} aria-selected={tab === 'cos'} data-k="nest-tab-cos" disabled={!cur} onclick={() => { tab = 'cos'; ask = false; }}>🎀 꾸미기</button>
  </div>
  {#if tab === 'mine' && cur}
    {@const nx = nextOf(cur.food)}
    <button type="button" class="big" data-k="nest-pet" onclick={() => { hop++; sfx('star', 0.4); }} aria-label="{cur.name} 쓰다듬기"><PetSprite pet={cur} size={150} {hop} />{#if hop}{#key hop}<i class="heart" aria-hidden="true">💗</i>{/key}{/if}</button>
    <p class="nm" data-k="nest-name"><b>{cur.name}</b> · {PET_BY[cur.kind].name} · {STAGE_NAME[stageOf(cur.food)]}</p>
    {#if nx}<div class="bar" aria-label="다음 단계까지 먹이"><i style:width="{(nx[0] / nx[1]) * 100}%"></i><span data-k="nest-food">🍖 {nx[0]} / {nx[1]}</span></div>{:else}<p class="sub">🐲 다 컸어요 · 🎀 꾸미기에서 모자 · 목도리를 입혀요</p>{/if}
    <p class="sub">먹이 = 수업 한 차시 끝까지 +{PET_CFG.lesson * mul} · 🎯 허수아비 정답 +{PET_CFG.scare * mul} (하루 {PET_CFG.scareDay}번)</p>
    {#if ids.length > 1}<div class="list">{#each ids as id (id)}{@const p = st.list![id]!}<button type="button" class="it" class:sel={id === st.on} data-k="nest-pick" onclick={() => setOn(id)}><PetSprite pet={p} size={48} still /><small>{p.name}</small>{#if id === st.on}<em>데리고 다님</em>{/if}</button>{/each}</div>{/if}
  {:else if tab === 'egg'}
    <div class="eggs">
      {#each PET_KINDS as k (k.k)}
        <button type="button" class="egg" class:sel={kind === k.k} data-k="nest-egg" data-kind={k.k} onclick={() => { kind = k.k; ask = false; sfx('click', 0.5); }}>
          <span class="row">{#each [0, PET_CFG.baby, PET_CFG.adult] as food (food)}<PetSprite pet={{ kind: k.k, food }} size={44} still />{/each}</span>
          <b>{k.ic} {k.name}</b>
        </button>
      {/each}
    </div>
    <p class="lab">이름 고르기</p>
    <div class="names"><select bind:value={na} aria-label="이름 앞">{#each PET_NAME_A as a (a)}<option>{a}</option>{/each}</select><select bind:value={nb} aria-label="이름 뒤">{#each PET_NAME_B as x (x)}<option>{x}</option>{/each}</select><b class="nm2" data-k="nest-newname">「{na} {nb}」</b></div>
    <p class="sub">무엇이 나올지 다 보여요 · 뽑기 없음 · 여러 마리 가질 수 있어요(데리고 다니는 것은 한 마리)</p>
  {:else if tab === 'cos' && cur}
    <div class="big"><PetSprite pet={pickCos && !petCosOf(cur).includes(pickCos) && stageOf(cur.food) === 2 ? togglePetCos(cur, pickCos) : cur} size={150} /></div>
    {#if stageOf(cur.food) < 2}<p class="sub" data-k="nest-cos-lock">🔒 다 큰 펫만 꾸밀 수 있어요 · 먹이 {PET_CFG.adult - cur.food} 더</p>{/if}
    <div class="list">{#each PET_COS as c (c.id)}<button type="button" class="it" class:sel={pickCos === c.id} disabled={stageOf(cur.food) < 2} data-k="nest-cos" data-id={c.id} onclick={() => { pickCos = pickCos === c.id ? '' : c.id; ask = false; }}><img src={c.src} alt="" /><small>{c.name}</small><em>{petCosOf(cur).includes(c.id) ? '✓ 입음' : ownsPetCos(me.wallet, cur.id, c.id) ? '가짐' : `💎 ${PET_CFG.cos}`}</em></button>{/each}</div>
  {/if}
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
</Sheet>

<style>
  .wal { margin-left: 8px; font: 700 14px var(--font); color: var(--gem, #6cc6ff); }
  .tabs { position: sticky; top: 0; z-index: 3; display: flex; gap: 6px; padding: 4px 0 10px; background: var(--surface); }
  .tabs button { flex: 1; min-height: 44px; border-radius: 999px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 700 14px var(--font); }
  .tabs button.on { background: var(--accent); color: #1a1206; border-color: var(--accent); }
  .tabs button:disabled { opacity: 0.4; }
  .big { position: relative; display: grid; place-items: center; width: 100%; min-height: 170px; border: 0; border-radius: 16px; background: radial-gradient(ellipse at 50% 80%, rgba(255, 210, 90, 0.18), transparent 60%), var(--surface-2); }
  .heart { position: absolute; top: 18px; left: 58%; font-style: normal; font-size: 24px; animation: up 0.9s ease-out forwards; }
  @keyframes up { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-40px); } }
  .nm { margin: 10px 0 6px; text-align: center; font: 600 15px var(--font); color: var(--text); }
  .bar { position: relative; height: 22px; border-radius: 999px; background: var(--surface-2); overflow: hidden; border: 1px solid var(--line); }
  .bar i { position: absolute; inset: 0 auto 0 0; background: linear-gradient(90deg, #f5b84a, #ffd25a); }
  .bar span { position: relative; display: block; text-align: center; font: 700 13px/22px var(--font); color: var(--text); }
  .sub, .lab { margin: 8px 0 0; text-align: center; color: var(--text-2); font-size: 13px; } .lab { text-align: left; font-weight: 700; }
  .list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .it { display: grid; justify-items: center; gap: 2px; padding: 8px 4px; min-height: 84px; border-radius: 12px; border: 2px solid var(--line); background: var(--surface-2); color: var(--text); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .it.sel { border-color: var(--accent); } .it:disabled { opacity: 0.45; box-shadow: none; }
  .it img { height: 34px; image-rendering: pixelated; } .it small { font: 600 13px var(--font); } .it em { font: 600 12px var(--font); font-style: normal; color: var(--text-2); }
  .eggs { display: grid; gap: 8px; }
  .egg { display: flex; align-items: center; gap: 10px; padding: 8px 12px; min-height: 64px; border-radius: 14px; border: 2px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .egg.sel { border-color: var(--accent); } .egg .row { display: flex; gap: 2px; }
  .names { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
  .names select { height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); padding: 0 10px; font: 600 15px var(--font); }
  .nm2 { font: 700 15px var(--font); color: var(--accent); }
  .toast { position: sticky; bottom: 0; margin: 8px 0 0; padding: 8px 12px; border-radius: 12px; background: rgba(0, 0, 0, 0.7); color: #fff; font: 600 14px var(--font); text-align: center; }
</style>
