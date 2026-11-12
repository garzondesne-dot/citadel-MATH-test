<script lang="ts">
  import { untrack } from 'svelte';
  import type { ForgeCard as Card } from '../../model/forge';
  import type { Given, Question } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { SUBJ } from '../../engine/subject';
  import { grade } from '../../engine/grade';
  import { absArt } from '../manifest';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import RuneKeypad from '../q/RuneKeypad.svelte';
  import ForgeCard from './ForgeCard.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { heroOf } from '../../model/hero';
  import { ECON_VER } from '../../model/wallet';

  // ⚒ 모루 (#148 · 정식 js/raid/forge.js 「C안」 + 시안 44dEkAKGELJTBPUs2gkwnD ①~④) — 정식 그림 · 틀 그대로(forgec 바탕 · 모루 · 재료 흰 틀 · 연산 검은 틀 · 고른 칸 푸른 빛 · 망치)
  //   엄격 연성 · 모두 열림(진도 상관없음) · 처음 만든 카드 = 마력 예제를 맞혀야 완성 · 실패 = 💡 힌트 조각 +1(최대 9 · 처음 2) · 첫 카드 💎 +3(하루 한도 밖) · 카드는 공격에 안 씀
  //   테마가 바뀌어도 모루 그림은 그대로 · 위 막대 · 아래 단추만 테마 · ⭐ 찜(기호 톡) = 위 칩 줄 · 💡 목록 맨 위 · 도감 금빛 테두리
  const { me, save, who, onclose }: { me: Me; save: () => void; who: string; onclose: () => void } = $props();
  const U = SUBJ.forge!.unit, NO = 99; // 2026-11-05 결정: 연성 도감은 진도와 상관없이 모두 열림
  const BYSYM = SUBJ.cards?.bySym ?? {};
  // CSS 변수(url) 로 넘기므로 절대 주소
  const IMG = { bg: absArt('art/forge/forgec-background-v2.webp'), anvil: absArt('art/forge/forgec-anvil-v2.webp'), mat: absArt('art/forge/forgec-material-v2.webp'), op: absArt('art/forge/forgec-operator-v2.webp'), pick: absArt('art/forge/forgec-button-v2.webp'), hammer: absArt('art/forge/forgec-hammer-v2.webp') };
  const owned = $derived(me.cards || {});
  const cardFm = (c: Card) => c.mf || c.fm;
  const tok = (t: string | null) => (t && t.startsWith('card:') ? U.card(t.slice(5)) ?? null : null);
  const symOf = (t: string | null) => { if (!t) return ''; const c = tok(t); if (c) return cardFm(c); return U.MATS.find((x) => x.id === t)?.sym ?? t; };
  // ⭐ 찜 = 기호 톡에서 찜한 기호 → 그 기호를 만드는 카드 (아직 안 만든 것)
  const wishIds = $derived(new Set(Object.keys(me.wishes || {}).map((s) => BYSYM[s]?.id).filter((x): x is string => !!x)));
  const wishCards = $derived(U.CARDS.filter((c) => wishIds.has(c.id) && !owned[c.id]));
  // 💡 힌트 조각 (정식 그대로 · 이 기기 · citadel-hint-{반}-{번호})
  const HK = `citadel-hint-${untrack(() => who)}`;
  type Hint = { pts: number; lv: Record<string, number> };
  const hintGet = (): Hint => { try { return { pts: 2, lv: {}, ...(JSON.parse(localStorage.getItem(HK) || 'null') || {}) }; } catch { return { pts: 2, lv: {} }; } };
  let hint = $state<Hint>(hintGet());
  const hintSet = (h: Hint) => { hint = h; try { localStorage.setItem(HK, JSON.stringify(h)); } catch { /* 무시 */ } };
  // ── ① 연성 ──
  let slots = $state<{ l: string | null; op: string | null; r: string | null }>({ l: null, op: null, r: null }), pickK = $state<'l' | 'op' | 'r'>('l');
  const opNow = $derived(slots.op ? U.opOf(slots.op) ?? null : null);
  const full = $derived(!!slots.op && !!slots.l && (opNow?.unary || !!slots.r));
  let msg = $state('연산을 고르고 재료 · 연산 · 재료를 올려 두드려요'), bad = $state(false), shake = $state(false);
  function put(t: string) {
    let k: 'l' | 'r' | null = pickK === 'op' ? null : pickK;
    if (opNow?.unary) k = 'l';
    if (!k || slots[k]) k = !slots.l ? 'l' : !slots.r && !opNow?.unary ? 'r' : 'l';
    slots = { ...slots, [k]: t }; pickK = !slots.l ? 'l' : !slots.op ? 'op' : !slots.r && !opNow?.unary ? 'r' : k;
  }
  function putOp(id: string) { const o = U.opOf(id); slots = { ...slots, op: id, ...(o?.unary ? { r: null } : {}) }; pickK = !slots.l ? 'l' : !slots.r && !o?.unary ? 'r' : 'op'; bad = false; msg = o?.unary ? `${o.sym} 는 한 칸 연산 — 재료 하나만 올려요` : '연산을 고르고 재료 · 연산 · 재료를 올려 두드려요'; }
  function tapSlot(k: 'l' | 'op' | 'r') { if (slots[k]) slots = { ...slots, [k]: null }; pickK = k; }
  let busy = $state(false), stage: HTMLDivElement | undefined = $state(), hammerEl: HTMLImageElement | undefined = $state();
  let exam = $state<Card | null>(null), reveal = $state<{ c: Card; first: boolean } | null>(null);
  function hit() {
    if (busy || !full) return;
    const r = U.forge(slots.op, slots.l, opNow?.unary ? null : slots.r, NO);
    if (!r.ok) { hintSet({ ...hint, pts: Math.min(9, hint.pts + 1) }); msg = `${r.msg} · 💡 힌트 조각 +1`; bad = true; shake = false; requestAnimationFrame(() => (shake = true)); return; }
    bad = false;
    if (!owned[r.card.id]) { exam = r.card; exAns = null; exWrong = false; return; } // 처음 = 마력 예제
    strike().then(() => (reveal = { c: r.card, first: false }));
  }
  // 망치: 위에서 나타나 내려찍고 사라짐 (정식 strike · 약 1.3초) · 쾅 = 충격파 · 불꽃 · 흔들림
  let impact = $state(false), sparks = $state<{ x: number; dx: number; dy: number }[]>([]);
  function strike(): Promise<void> {
    busy = true;
    return new Promise((res) => {
      const h = hammerEl;
      if (h?.animate) h.animate([{ transform: 'translateY(-150%)', opacity: 0 }, { transform: 'translateY(-20%) scale(1.04)', opacity: 1, offset: 0.3 }, { transform: 'translateY(92%) scale(.96)', opacity: 1, offset: 0.5 }, { transform: 'translateY(88%)', opacity: 1, offset: 0.75 }, { transform: 'translateY(-60%)', opacity: 0 }], { duration: 1300, easing: 'cubic-bezier(.5,0,.5,1)' });
      setTimeout(() => { impact = true; sparks = Array.from({ length: 16 }, () => ({ x: 50 + (Math.random() - 0.5) * 40, dx: (Math.random() - 0.5) * 240, dy: -60 - Math.random() * 120 })); try { navigator.vibrate?.(70); } catch { /* 무시 */ } }, 650);
      setTimeout(() => { impact = false; sparks = []; busy = false; res(); }, 1350);
    });
  }
  // ── ② 마력 예제 ──
  let exAns = $state<Given | null>(null), exWrong = $state(false);
  const exQ = $derived(exam ? (exam.ex as Question) : null);
  function exSubmit() {
    if (!exam || !exQ || exAns == null) return;
    if (!grade(exQ, exAns)) { exWrong = true; return; }
    const c = exam; exam = null;
    strike().then(() => (reveal = { c, first: true }));
  }
  // 📖 도감 특전 (정식 PERKS · 문구 · 값 그대로): 그 차시 카드를 다 모으면 용사 열림 · 💎 로 먼저 열기 → 다 모으면 돌려받음(되팔기 아님)
  const PERKS = SUBJ.forge!.perks ?? [];
  const perkCards = (p: { a: number; b: number; skip?: string }) => U.CARDS.filter((c) => c.no >= p.a && c.no <= p.b && c.id !== p.skip);
  const heroName = (id: number) => `${heroOf(id).job} ${heroOf(id).name}`;
  const bought = (id: number) => me.wallet.buys.some((b) => b.id === `hero_${id}`);
  const logHas = (k: string) => (me.wallet.log || []).includes(k);
  let ptoast = $state('');
  function buyPerk(id: number) {
    const price = heroOf(id).price ?? 0;
    if (me.wallet.gem < price || !window.confirm(`💎 ${price} 로 🧑 ${heroName(id)}를 먼저 열까요?\n그 차시 카드를 다 모으면 💎 ${price} 를 돌려받아요 (되팔기는 안 돼요).`)) return;
    me.wallet.gem -= price; me.wallet.buys = [...me.wallet.buys, { id: `hero_${id}`, ver: ECON_VER, at: Date.now() }]; save();
    ptoast = `🧑 ${heroName(id)} 열림! 🧙 내 용사에서 골라요`; setTimeout(() => (ptoast = ''), 3000);
  }
  function perkCheck(newId: string) {
    const p = PERKS.find((x) => perkCards(x).some((c) => c.id === newId)); if (!p || logHas(`perk_${p.id}`)) return;
    if (!perkCards(p).every((c) => me.cards?.[c.id])) return;
    const price = heroOf(p.id).price ?? 0, was = bought(p.id);
    if (was) me.wallet.gem += price; else me.wallet.buys = [...me.wallet.buys, { id: `hero_${p.id}`, ver: ECON_VER, at: Date.now() }];
    me.wallet.log = [...(me.wallet.log || []), `perk_${p.id}`]; save();
    ptoast = `🎉 🧑 ${heroName(p.id)} 열림!${was ? ` · 💎 ${price} 돌려받았어요` : ''}`; setTimeout(() => (ptoast = ''), 4500);
  }
  function keep() {
    if (!reveal) return;
    if (reveal.first) { me.cards = { ...(me.cards || {}), [reveal.c.id]: true }; me.wallet.gem += 3; save(); perkCheck(reveal.c.id); } // 첫 카드 💎 +3 (하루 한도 밖 · 정식 G.card)
    reveal = null; slots = { l: null, op: null, r: null }; pickK = 'l'; msg = '연산을 고르고 재료 · 연산 · 재료를 올려 두드려요';
  }
  // ── ③ 💡 목록 · ④ 도감 ──
  let view = $state<'forge' | 'list' | 'book'>('forge'), focusId = $state('');
  const haveN = $derived(U.CARDS.filter((c) => owned[c.id]).length);
  const nos = [...new Set(U.CARDS.map((c) => c.no))].sort((a, b) => a - b);
  const secOf = (n: number) => [...new Set(U.CARDS.filter((c) => c.no === n).map((c) => c.sec))].join(' · ');
  function reveal1(id: string) { if (!hint.pts) return; hintSet({ pts: hint.pts - 1, lv: { ...hint.lv, [id]: (hint.lv[id] || 0) + 1 } }); }
  let chip = $state<'all' | 'wish' | number>('all'), zoom = $state<Card | null>(null);
  const bookCards = (n: number) => U.CARDS.filter((c) => c.no === n && (chip === 'all' || (chip === 'wish' ? wishIds.has(c.id) : chip === n)));
  const putCards = $derived(U.CARDS.filter((c) => owned[c.id]));
</script>

<div class="fg" role="dialog" aria-label="모루" style:--bg="url({IMG.bg})" style:--mat="url({IMG.mat})" style:--op="url({IMG.op})" style:--pick="url({IMG.pick})">
  <div class="bar"><button type="button" class="back" aria-label={view !== 'forge' ? '모루로' : '캠프로'} onclick={() => (view !== 'forge' ? (view = 'forge') : onclose())}>‹</button><b class="t">{view === 'book' ? '📖 도감' : view === 'list' ? '💡 만들 수 있는 카드' : '⚒ 모루'}</b><span class="wal">💎 {me.wallet.gem.toLocaleString()}</span></div>
  {#if view === 'forge'}
    {#if wishCards.length}<div class="wishes" role="group" aria-label="찜한 카드">{#each wishCards as c (c.id)}<button type="button" onclick={() => { focusId = c.id; view = 'list'; }}>⭐ {c.short || c.name}</button>{/each}</div>{/if}
    <div class="shelf ops" role="group" aria-label="연산">{#each U.OPS as o (o.id)}<button type="button" class="tile op mini" class:on={slots.op === o.id} class:long={o.sym.length > 3} onclick={() => putOp(o.id)}>{o.sym}</button>{/each}</div>
    <div class="stage" class:impact bind:this={stage}>
      <img class="anvil" src={IMG.anvil} alt="" />
      <div class="slots" class:shake>
        <button type="button" class="tile mat" class:empty={!slots.l} class:pick={pickK === 'l'} class:card={!!tok(slots.l)} aria-label="왼쪽 재료 칸" onclick={() => tapSlot('l')}>{slots.l ? symOf(slots.l) : '재료'}</button>
        <button type="button" class="tile op" class:empty={!slots.op} class:pick={pickK === 'op'} aria-label="연산 칸" onclick={() => tapSlot('op')}>{opNow ? opNow.sym : '연산'}</button>
        <button type="button" class="tile mat" class:empty={!slots.r} class:off={!!opNow?.unary} class:pick={pickK === 'r'} class:card={!!tok(slots.r)} aria-label="오른쪽 재료 칸" disabled={!!opNow?.unary} onclick={() => tapSlot('r')}>{opNow?.unary ? '—' : slots.r ? symOf(slots.r) : '재료'}</button>
      </div>
      <img class="hammer" bind:this={hammerEl} src={IMG.hammer} alt="" />
      {#each sparks as s, k (k)}<i class="spark" style:left="{s.x}%" style:--dx="{s.dx}px" style:--dy="{s.dy}px"></i>{/each}
    </div>
    <p class="msg" class:bad>{msg}</p>
    <div class="shelf mats" role="group" aria-label="재료">{#each U.MATS as m (m.id)}<button type="button" class="tile mat mini" class:long={m.sym.length > 3} title={m.tip} onclick={() => put(m.id)}>{m.sym}</button>{/each}{#each putCards as c (c.id)}<button type="button" class="tile mat mini card long" title={c.name} onclick={() => put(`card:${c.id}`)}>{cardFm(c)}</button>{/each}</div>
    <BottomAction dock={false} disabled={!full || busy} onmain={hit} text="🔨 두드리기">
      {#snippet aux()}<div class="row2"><button type="button" class="btn2" onclick={() => { focusId = ''; view = 'list'; }}>💡 만들 수 있는 카드 <b>{hint.pts}</b></button><button type="button" class="btn2" onclick={() => (view = 'book')}>📖 도감 {haveN} / {U.CARDS.length}</button></div>{/snippet}
    </BottomAction>
  {:else if view === 'list'}
    <!-- ③ 💡 만들 수 있는 카드 -->
    <div class="book">
      <p class="why lt">🧩 힌트 조각 <b>{hint.pts}</b> · 두드리기에 실패하면 +1 (벌이 아니라 단서) · 조각으로 재료 → 연산 순서로 열어요</p>
      {#each [...wishCards.filter((c) => !focusId || c.id === focusId), ...wishCards.filter((c) => focusId && c.id !== focusId)] as c (c.id)}{@render row(c, true)}{/each}
      {#each nos as n (n)}{@const todo = U.CARDS.filter((c) => c.no === n && !owned[c.id] && !wishIds.has(c.id))}
        <details class="grp" open={!focusId && n === nos.find((x) => U.CARDS.some((c) => c.no === x && !owned[c.id]))}><summary><b>{n}차시</b> <small>{secOf(n)}</small><span class:done={!todo.length}>해금 {U.CARDS.filter((c) => c.no === n && owned[c.id]).length} / {U.CARDS.filter((c) => c.no === n).length}</span></summary>
          {#each todo as c (c.id)}{@render row(c, false)}{:else}<p class="why lt">🎉 이 차시 카드를 모두 만들었어요!</p>{/each}</details>
      {/each}
    </div>
    <BottomAction dock={false} onmain={() => (view = 'forge')} text="⚒ 모루로" />
  {:else}
    <!-- ④ 도감 -->
    <div class="bk-h"><b>모은 카드 {haveN} / {U.CARDS.length}</b><i class="bar2"><i style:width="{(haveN / U.CARDS.length) * 100}%"></i></i></div>
    <div class="chips" role="group" aria-label="거르기"><button type="button" class:on={chip === 'all'} onclick={() => (chip = 'all')}>전체</button><button type="button" class:on={chip === 'wish'} onclick={() => (chip = 'wish')}>⭐ 찜</button>{#each nos as n (n)}<button type="button" class:on={chip === n} onclick={() => (chip = n)}>{n}</button>{/each}</div>
    <div class="book">
      {#if chip === 'all'}{@render perks()}{/if}
      {#each nos as n (n)}{@const cs = bookCards(n)}{#if cs.length}
        <h3>{n}차시 · {secOf(n)} · <em>{U.CARDS.filter((c) => c.no === n && owned[c.id]).length} / {U.CARDS.filter((c) => c.no === n).length}</em></h3>
        <div class="grid">{#each cs as c (c.id)}<button type="button" class="cw" aria-label={owned[c.id] || wishIds.has(c.id) ? c.name : '아직 못 만든 카드'} onclick={() => (zoom = c)}><ForgeCard card={c} w={100} unknown={!owned[c.id]} wish={!owned[c.id] && wishIds.has(c.id)} /></button>{/each}</div>
      {/if}{/each}
    </div>
    <BottomAction dock={false} onmain={() => (view = 'forge')} text="⚒ 모루로" />
  {/if}
</div>


{#snippet perks()}
  <div class="perks">{#each PERKS as p (p.id)}{@const cs = perkCards(p)}{@const got = cs.filter((c) => owned[c.id]).length}{@const done = cs.length > 0 && got === cs.length}{@const price = heroOf(p.id).price}
    <div class="perk" class:done><span class="ph"><HeroSprite id={p.id} scale={1} /></span><span class="tx"><b>🧑 {heroName(p.id)}</b><small>{p.a}~{p.b}차시 카드 {got} / {cs.length}</small><i class="pb"><i style:width="{cs.length ? (100 * got) / cs.length : 0}%"></i></i></span>
      {#if done || logHas(`perk_${p.id}`)}<span class="ok">✔ 열림</span>{:else if bought(p.id)}<span class="ok sm">💎 로 열림 · 다 모으면 돌려받음</span>{:else if price != null}<button type="button" onclick={() => buyPerk(p.id)}>💎 {price} 먼저 열기</button>{/if}</div>
  {/each}</div>
{/snippet}
{#snippet row(c: Card, wished: boolean)}
  {@const lv = hint.lv[c.id] || 0}
  {@const op = U.opOf(c.op)}
  <div class="hr" class:wished class:focus={focusId === c.id}>
    <div class="tx"><b>{wished ? `⭐ ${c.name} · ${c.fm}` : '???'}</b><small>{c.hint}</small></div>
    <div class="shape">{#if op?.unary}<i class="chip op">{lv >= 2 ? op.sym : '?'}</i><i class="chip">{lv >= 1 ? symOf(c.in[0] ?? '') : '?'}</i>{:else}<i class="chip">{lv >= 1 ? symOf(c.in[0] ?? '') : '?'}</i><i class="chip op">{lv >= 2 ? op?.sym : '?'}</i><i class="chip">{lv >= 1 ? symOf(c.in[1] ?? '') : '?'}</i>{/if}</div>
    {#if lv < 2}<button type="button" disabled={!hint.pts} onclick={() => reveal1(c.id)}>🧩 {lv ? '연산 보기' : '재료 보기'}</button>{:else}<small class="all">모두 공개</small>{/if}
  </div>
{/snippet}

{#if exam && exQ}
  <!-- ② 마력 예제 -->
  <div class="ov" role="dialog" aria-label="마력 예제" style:--bg="url({IMG.bg})">
    <div class="bar"><button type="button" class="back" aria-label="모루로" onclick={() => (exam = null)}>‹</button><b class="t">🔮 마력 예제</b></div>
    <div class="exm">
      <div class="pv"><ForgeCard card={exam} w={96} /><p>연성을 하려면 마력이 필요해 · 예제를 맞히면 <b>{exam.name}</b> 카드 완성!</p></div>
      <div class="qc"><p class="q">{exQ.question}</p>
        {#if exQ.type === 'choice'}<div class="chs">{#each exQ.choices as t, k (k)}<button type="button" class:on={exAns === k} onclick={() => { exAns = k; exWrong = false; }}>{t}</button>{/each}</div>
        {:else if exQ.type === 'ox'}<div class="chs two"><button type="button" class:on={exAns === true} onclick={() => { exAns = true; exWrong = false; }}>⭕</button><button type="button" class:on={exAns === false} onclick={() => { exAns = false; exWrong = false; }}>❌</button></div>
        {:else if exQ.type === 'number'}<RuneKeypad value={exAns as number | null} len={3} onchange={(v) => { exAns = v === '-' ? null : v; exWrong = false; }} />{/if}
        {#if exWrong}<p class="wr">❌ 마력이 모자라요… 해설: {exQ.solution} · 다시 골라요 (벌 없음)</p>{/if}
      </div>
    </div>
    <BottomAction dock={false} disabled={exAns == null} onmain={exSubmit} text="✨ 마력 넣기" />
  </div>
{/if}
{#if ptoast}<p class="ptoast" role="status">{ptoast}</p>{/if}
{#if reveal}
  <div class="ov rv" role="dialog" aria-label="카드 완성">
    <div class="rvc">
      <b class="new">{reveal.first ? 'NEW CARD!' : '이미 가진 카드'}</b>
      <ForgeCard card={reveal.c} w={220} />
      <b class="nm">{reveal.c.name}</b>
      {#if reveal.first}<b class="gem3">💎 +3 · 마정석을 받았어요</b>{/if}
    </div>
    <BottomAction dock={false} onmain={keep} text={reveal.first ? '🃏 내 카드에 넣기' : '확인'} />
  </div>
{/if}
{#if zoom}
  <Sheet onclose={() => (zoom = null)} mainText="닫기">
    {#snippet title()}{owned[zoom!.id] || wishIds.has(zoom!.id) ? zoom!.name : '아직 못 만든 카드'}{/snippet}
    <div class="zm"><ForgeCard card={zoom} w={180} unknown={!owned[zoom.id]} wish={!owned[zoom.id] && wishIds.has(zoom.id)} />
      <p>{owned[zoom.id] ? `${zoom.desc} · ${zoom.fm}` : `💡 ${zoom.hint} — 힌트를 보고 두드려 봐요`}</p>
      <p class="why">카드는 공격에 쓰지 않아요 · 꾸미기 특전용이에요</p></div>
  </Sheet>
{/if}

<style>
  .fg, .ov { position: fixed; inset: 0; z-index: 19; max-width: 430px; margin: 0 auto; display: flex; flex-direction: column; background: #171410 var(--bg) center / cover no-repeat; color: #f2e9d8; }
  .ov { z-index: 22; } .ov.rv { background: rgba(10, 8, 6, 0.92); align-items: stretch; padding: 16px 0 0; }
  .bar { flex: none; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3); background: color-mix(in srgb, var(--bg-solid, var(--bg)) 0%, transparent); }
  .back { width: 44px; height: 48px; border: 0; background: rgba(8, 9, 12, 0.5); border-radius: 22px; color: #fff; font-size: 24px; }
  .t { flex: 1; font-size: 18px; color: #fff; text-shadow: 0 1px 2px #000; } .wal { height: 32px; padding: 0 10px; border-radius: 16px; background: rgba(8, 9, 12, 0.6); display: flex; align-items: center; font: 700 14px var(--font); color: var(--gem); }
  .wishes { flex: none; display: flex; gap: 6px; overflow-x: auto; padding: 0 12px 4px; scrollbar-width: none; }
  .wishes button { flex: none; height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid #f5b84a; background: rgba(40, 30, 10, 0.85); color: #ffd98a; font: 700 13px var(--font); position: relative; }
  .wishes button::before { content: ''; position: absolute; inset: -6px 0; }
  .stage { position: relative; flex: none; height: 150px; margin: 0 12px; isolation: isolate; }
  .stage.impact { animation: shk 0.22s linear; }
  .anvil { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 72%; object-fit: fill; image-rendering: pixelated; filter: drop-shadow(0 10px 12px #000c); }
  .slots { position: absolute; left: 22%; right: 22%; top: 30%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6%; z-index: 3; }
  .slots.shake { animation: shk 0.3s 2; }
  .hammer { position: absolute; left: 12%; top: -10%; width: 76%; height: 50%; object-fit: contain; z-index: 8; pointer-events: none; opacity: 0; image-rendering: pixelated; }
  .spark { position: absolute; top: 62%; width: 5px; height: 12px; background: #ffd165; box-shadow: 0 0 8px #ff9a2a; z-index: 9; animation: spk 0.8s ease-out forwards; }
  @keyframes spk { to { transform: translate(var(--dx), var(--dy)) rotate(220deg); opacity: 0; } }
  @keyframes shk { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  .tile { position: relative; aspect-ratio: 3 / 4; border: 0; padding: 8%; min-width: 0; background: var(--mat) center / 100% 100% no-repeat; color: #201a11; font: 700 clamp(13px, 4vw, 20px) var(--font); display: grid; place-items: center; image-rendering: pixelated; white-space: nowrap; overflow: hidden; }
  .tile.op { background-image: var(--op); color: #ffe29a; text-shadow: 0 0 8px #ffb000aa; }
  .tile.empty { filter: brightness(0.6) saturate(0.6); font-size: 12px; color: #b9a77e; }
  .tile.op.empty { color: #8aa0c8; }
  .tile.off { opacity: 0.35; }
  .tile.pick { filter: drop-shadow(0 0 6px #5ae8ff); outline: 2px solid #5ae8ff; outline-offset: 1px; }
  .tile.card { filter: hue-rotate(185deg) saturate(0.7) brightness(1.08); }
  .tile.long { font-size: clamp(10px, 2.8vw, 13px); white-space: normal; word-break: keep-all; line-height: 1.1; }
  .tile.mini { aspect-ratio: auto; height: 40px; padding: 2px; font-size: 15px; }
  .tile.mini.long { font-size: 10.5px; }
  .tile.on { outline: 2px solid #5ae8ff; }
  .tile:active { transform: scale(0.94); }
  .msg { flex: none; margin: 4px 12px; min-height: 18px; font-size: 13px; text-align: center; color: #e8dcc0; text-shadow: 0 1px 2px #000; }
  .msg.bad { color: #ffb4ae; }
  .shelf { flex: none; display: grid; gap: 4px; padding: 0 12px; margin-bottom: 6px; }
  .shelf.ops { grid-template-columns: repeat(8, minmax(0, 1fr)); }
  .shelf.mats { grid-template-columns: repeat(7, minmax(0, 1fr)); max-height: 88px; overflow-y: auto; }
  .fg > :global(.act), .ov > :global(.act) { margin-top: auto; padding-top: 2px; gap: 6px; background: linear-gradient(transparent, rgba(10, 8, 6, 0.85) 30%); }
  .row2 { flex: 1; }
  .rvc { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .btn2 { min-height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 13.5px var(--font); }
  .btn2 b { color: var(--accent); }
  .bk-h { flex: none; padding: 0 16px 6px; display: flex; flex-direction: column; gap: 6px; } .bk-h b { color: #fff; text-shadow: 0 1px 2px #000; }
  .bar2 { display: block; height: 8px; border-radius: 4px; background: rgba(0, 0, 0, 0.5); } .bar2 i { display: block; height: 8px; border-radius: 4px; background: #f5b84a; }
  .chips { flex: none; display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 8px; scrollbar-width: none; }
  .chips button { flex: none; height: 36px; min-width: 40px; padding: 0 12px; border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.25); background: rgba(8, 9, 12, 0.6); color: #fff; font: 700 13px var(--font); position: relative; }
  .chips button::before { content: ''; position: absolute; inset: -6px 0; }
  .chips button.on { background: #f5b84a; color: #1a1300; border-color: #f5b84a; }
  .book { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px 16px; }
  .book h3 { margin: 10px 0 6px; font-size: 14px; color: #fff; text-shadow: 0 1px 2px #000; } .book h3 em { font-style: normal; color: #f5b84a; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; justify-items: center; }
  .cw { border: 0; background: none; padding: 0; }
  .why { margin: 0; font-size: 13px; color: var(--text-2); }
  .lt { color: #e8dcc0; text-shadow: 0 1px 2px #000; margin: 4px 0 8px; } .lt b { color: #ffd98a; }
  .grp { background: rgba(20, 16, 12, 0.85); border-radius: var(--r); padding: 0 10px; margin-bottom: 6px; color: var(--text); }
  .grp summary { display: flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; } .grp summary small { flex: 1; color: var(--text-2); } .grp summary span { font-size: 12.5px; color: var(--text-2); } .grp summary span.done { color: var(--ok); }
  .book > .hr { background: rgba(20, 16, 12, 0.9); color: var(--text); }
  .hr { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; align-items: center; padding: 8px 10px; border-radius: var(--r); background: var(--surface-2); margin-bottom: 6px; }
  .hr.wished { border: 2px solid var(--accent); } .hr.focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent); }
  .hr .tx { display: flex; flex-direction: column; gap: 2px; } .hr .tx small { font-size: 12.5px; color: var(--text-2); }
  .shape { display: flex; gap: 4px; } .chip { font-style: normal; min-width: 30px; height: 30px; padding: 0 4px; border-radius: 6px; background: #f2e9d8; color: #201a11; font-weight: 700; display: grid; place-items: center; font-size: 13px; } .chip.op { background: #2a2a33; color: #ffe29a; }
  .hr button { grid-column: 1 / -1; height: 40px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 13px var(--font); }
  .hr button:disabled { opacity: 0.45; } .hr .all { grid-column: 1 / -1; color: var(--text-3); font-size: 12px; }
  .exm { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
  .pv { display: flex; gap: 12px; align-items: center; } .pv p { margin: 0; font-size: 14px; color: #fff; text-shadow: 0 1px 2px #000; }
  .qc { background: var(--surface); color: var(--text); border-radius: var(--r); padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .q { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.5; }
  .chs { display: flex; flex-direction: column; gap: 6px; } .chs.two { flex-direction: row; } .chs.two button { flex: 1; font-size: 28px; }
  .chs button { min-height: 48px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); padding: 0 12px; box-shadow: 0 3px 0 var(--press-sh); }
  .chs button.on { border: 2px solid var(--accent); }
  .wr { margin: 0; padding: 8px 10px; border-radius: 10px; background: var(--bad-bg); font-size: 13.5px; }
  .new { font-size: 26px; color: #ffd25a; letter-spacing: 2px; text-shadow: 0 0 12px #ff9a2a; } .nm { font-size: 20px; color: #fff; } .gem3 { color: var(--gem); }
  .perks { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 8px; }
  .perk { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--r); background: rgba(20, 16, 12, 0.88); border: 1px solid #6b5a3a; color: var(--text); }
  .perk.done { border-color: #f5b84a; } .perk .ph { flex: none; } .perk .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; } .perk small { font-size: 12px; color: var(--text-2); }
  .pb { display: block; height: 6px; border-radius: 3px; background: rgba(0, 0, 0, 0.5); } .pb i { display: block; height: 6px; border-radius: 3px; background: #f5b84a; }
  .perk .ok { flex: none; font-size: 12.5px; font-weight: 700; color: var(--ok); } .perk .ok.sm { max-width: 92px; font-size: 11.5px; color: var(--gem); }
  .perk button { flex: none; height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--gem); background: none; color: var(--gem); font: 700 12.5px var(--font); }
  .ptoast { position: fixed; left: 50%; top: 64px; transform: translateX(-50%); z-index: 30; margin: 0; padding: 8px 14px; border-radius: 12px; background: var(--surface); font-weight: 700; white-space: nowrap; }
  .zm { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; } .zm p { margin: 0; }
</style>
