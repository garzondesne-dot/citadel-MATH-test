<script lang="ts">
  import { untrack } from 'svelte';
  import type { Me } from '../../store/me.svelte';
  import { AURA_NAMES, CARD_TOTAL, ENH, famOfHero, heroOf, HEROES, ladder, level, skillName, SKILL_PRICE, SKILL_SCROLL, STATS, titleOf, TITLES, TN, verdict } from '../../model/hero';
  import DATA from '../../model/hero-data.json';
  import { canEnh, canHero, canSkill, cost, dirty, earnedTitles, emptyPlan, equipOf, left, nextSkill, ownsHero, ownsSkill, save, type Look, type Plan } from '../../model/draft';
  import HeroSprite from './HeroSprite.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';

  // 🧙 내 용사 시트 (#114 · 시안 ⑪ · 정식 #98 구조 + 머리 방 진단 6줄)
  //   맨 위 카드(도트 · 오라 · +n · [호칭] 이름 · 테스터 배지 · 용사 · 속성 · Lv · 「용사 바꾸기 >」) → 탭 3 = 🔨 강화(처음) · ⚔ 스킬 · 🏅 기록
  //   고른 것은 저장 전까지 화면에서만(💎 가 빠져 보임) → 아래 막대 한 줄 「바뀐 것 · 되돌리기 · 💾 저장」 · 💎 를 쓰면 저장 때 가운데 확인 1번
  //   금빛 단추 늘 하나: 바뀐 것이 있으면 💾 저장 · 없으면 강화 탭의 「+n+1 으로 강화」
  const { me, persist, onclose }: { me: Me; persist: () => void; onclose: () => void } = $props();
  const snap = (): Look => ({ hero: me.hero, enh: me.enh, socket: { ...me.socket }, title: me.title || 'none' });
  let L0 = $state<Look>(untrack(snap));
  let look = $state<Look>(untrack(snap));
  let P = $state<Plan>(emptyPlan());
  let tab = $state<'enh' | 'sk' | 'rec'>('enh');
  let heroSheet = $state(false), pickH = $state(untrack(() => me.hero));
  let ttlSheet = $state(false), confirm = $state(false), ask = $state(false);
  let savedFlash = $state(false), topEl = $state<HTMLElement | null>(null), swTop = $state(160);
  function openHeroes() { pickH = look.hero; if (topEl) swTop = topEl.offsetTop + topEl.offsetHeight + 8; heroSheet = true; }
  let toast = $state(''), toastT: ReturnType<typeof setTimeout> | null = null;
  const say = (t: string, ms = 2200) => { toast = t; if (toastT) clearTimeout(toastT); toastT = setTimeout(() => (toast = ''), ms); };
  const tip96 = untrack(() => !me.seen['tip96']); // 「이제 용사마다 자기 속성…」 = 개편 뒤 한 번만

  const W = $derived(me.wallet);
  const lv = $derived(L0.enh + P.enh);
  const lf = $derived(left(W, P, L0.enh));
  const isDirty = $derived(dirty(P, L0, look));
  const c = $derived(cost(P, L0.enh));
  const info = $derived(heroOf(look.hero));
  const fam = $derived(famOfHero(look.hero));
  const lad = $derived(ladder(look.hero));
  const eq = $derived(equipOf(look));
  const nIdx = $derived(nextSkill(W, P, look.hero));
  const xp = $derived(level(me.xp));
  const earned = $derived(earnedTitles(me.test));
  const ttl = $derived(look.title && look.title !== 'none' ? titleOf(look.title) : null);
  const nx = $derived(ENH[lv + 1] ?? null);
  const dots = $derived({ enh: canEnh(W, P, L0.enh), sk: canSkill(W, P, look.hero, L0.enh), hero: canHero(W, P, L0.enh) });

  // ── 🔨 강화 ──
  function enh() {
    if (!nx) return;
    if (!canEnh(W, P, L0.enh)) { say(lf.gem < nx.g ? `💎 조각이 ${nx.g - lf.gem}개 모자라요` : `📜 서술 조각이 ${(nx.s ?? 0) - lf.scroll}개 모자라요`); return; }
    P.enh += 1;
  }
  // ── ⚔ 스킬 ── (정식 #98 · #96: 다음 칸만 · 고른 칸을 다시 누르면 그 칸부터 아래 고름 취소)
  let prev = $state<{ id: string; tier: number; n: number } | null>(null), prevT: ReturnType<typeof setTimeout> | null = null;
  function preview(id: string, tier: number) { prev = { id, tier, n: (prev?.n ?? 0) + 1 }; if (prevT) clearTimeout(prevT); prevT = setTimeout(() => (prev = null), 1600); }
  type SkState = 'equip' | 'own' | 'pick' | 'buy' | 'lock';
  const skState = (id: string, i: number): { st: SkState; sub: string } => {
    const g = SKILL_PRICE[id], s = SKILL_SCROLL[id] ?? 0, price = g != null ? `💎 ${g}${s ? ` · 📜 ${s}` : ''}` : '';
    if (P.sk.includes(id)) return { st: 'pick', sub: `고름 · 저장하면 내 것 · ${price}` };
    if (ownsSkill(W, P, look.hero, id)) return id === eq ? { st: 'equip', sub: '끼움' } : { st: 'own', sub: '✔ 가짐 · 누르면 끼움' };
    if (i !== nIdx) return { st: 'lock', sub: `${TN[i - 1]} 먼저` };
    if (g == null) return { st: 'lock', sub: '업적으로 열려요' };
    if (lf.gem < g) return { st: 'lock', sub: `${price} · 💎 ${g - lf.gem} 모자람` };
    if (lf.scroll < s) return { st: 'lock', sub: `${price} · 📜 ${s - lf.scroll} 모자람` };
    return { st: 'buy', sub: price };
  };
  function tapSkill(id: string, i: number) {
    preview(id, i);
    if (P.sk.includes(id)) { P.sk = P.sk.filter((x) => lad.indexOf(x) < i); if (!ownsSkill(W, P, look.hero, eq)) delete look.socket[String(look.hero)]; return; }
    if (ownsSkill(W, P, look.hero, id)) { look.socket[String(look.hero)] = id; return; }
    const st = skState(id, i);
    if (st.st === 'lock') { say(`🔒 ${st.sub}`); return; }
    P.sk = [...P.sk, id];
  }
  // ── 🧑 용사 바꾸기 ──
  const pick = $derived(heroOf(pickH));
  const ownsPick = $derived(ownsHero(W, P, pickH));
  const mine = $derived(HEROES.filter((h) => ownsHero(W, P, h.id)));
  const locked = $derived(HEROES.filter((h) => !ownsHero(W, P, h.id)));
  function buyHero() { const h = heroOf(pickH); if (h.price == null || lf.gem < h.price) { say('💎 가 모자라요'); return; } P.heroes = [...P.heroes, pickH]; }
  function useHero() { look.hero = pickH; heroSheet = false; }
  const allHeroes = $derived([...mine, ...locked]);
  const ownedSk = (id: number) => ladder(id).map((k) => ownsSkill(W, P, id, k));
  const topTier = (id: number) => { const o = ownedSk(id); const n = o.lastIndexOf(true); return n >= 0 ? TN[n] : ''; };
  const famName = (id: number) => famOfHero(id).name;
  /** 「으로 · 로」: 받침이 없거나 ㄹ 받침이면 로 */
  const ro = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; if (c < 0 || c > 11171) return '로'; const j = c % 28; return j === 0 || j === 8 ? '로' : '으로'; };
  // ── 🏅 기록 ──
  const nextAch = $derived.by(() => {
    const seals = 0, cand: [number, string][] = [];
    if (seals < 3) cand.push([3 - seals, `업적 ${3 - seals}개 더 모으면 🏅 호칭 「만 번째 베기」`]);
    const ui = DATA.unlock.findIndex((u) => seals < u);
    if (ui >= 0) cand.push([(DATA.unlock[ui] as number) - seals, `업적 ${(DATA.unlock[ui] as number) - seals}개 더 → ✨ ${skillName(DATA.fancy[ui] as string)} 이펙트`]);
    return cand.sort((a, b) => a[0] - b[0])[0]?.[1] ?? '모든 보상을 모았어요!';
  });
  const TIER_CLS: Record<string, string> = { w: 't-w', b: 't-b', p: 't-p', o: 't-o' };
  // ── 💾 저장 ──
  const changes = $derived.by(() => {
    const it: string[] = [];
    if (look.hero !== L0.hero) it.push(`출전 → ${info.name}`);
    P.heroes.forEach((id) => it.push(`용사 ${heroOf(id).name}`));
    if (P.enh) it.push(`강화 +${L0.enh} → +${lv}`);
    if (P.sk.length) it.push(`스킬 ${P.sk.map((k) => skillName(k)).join(' · ')}`);
    if (JSON.stringify(look.socket) !== JSON.stringify(L0.socket)) it.push(`끼울 스킬 → ${skillName(eq)}`);
    if (look.title !== L0.title) it.push('호칭');
    return it;
  });
  function undo() { P = emptyPlan(); look = { ...L0, socket: { ...L0.socket } }; say('↺ 모두 되돌렸어요', 1600); }
  function trySave() { if (c.g || c.s) confirm = true; else commit(); }
  function commit() {
    confirm = false;
    const r = save(W, P, L0, look, Date.now());
    if (typeof r === 'string') { say(r, 3000); return; }
    me.wallet = r.wallet; me.hero = r.look.hero; me.enh = r.look.enh; me.socket = r.look.socket; me.title = r.look.title;
    persist();
    L0 = { ...r.look, socket: { ...r.look.socket } }; look = { ...r.look, socket: { ...r.look.socket } }; P = emptyPlan();
    if (r.great) say(`🌟 강화 대성공 ${r.great}번! 💎 ${r.back}개 돌려받았어요`, 3600);
    savedFlash = true; setTimeout(() => (savedFlash = false), 1000); // ✔ 저장했어요 1초 뒤 처음 상태
  }
  function close() { if (isDirty) { ask = true; return; } onclose(); }
  function openTab(t: typeof tab) { tab = t; if (t === 'sk' && !me.seen['tip96']) { me.seen['tip96'] = true; persist(); } }
</script>

<div class="mh" role="dialog" aria-modal="true" aria-label="내 용사">
  <header class="bar">
    <button type="button" class="back" aria-label="닫기" onclick={close}><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M14 4 7 11l7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
    <b class="t">내 용사</b>
    <span class="pill" aria-label="마정석 {lf.gem}개"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1 13 6 7 13 1 6Z" fill="var(--gem)" /></svg>{lf.gem.toLocaleString()}</span>
    <span class="pill" aria-label="서술 조각 {lf.scroll}개"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="2" fill="var(--scroll)" /></svg>{lf.scroll}</span>
  </header>

  <div class="body">
    <button type="button" class="top" bind:this={topEl} onclick={openHeroes} aria-label="용사 바꾸기">
      <span class="pic"><HeroSprite id={look.hero} play aura={lv} />{#if lv}<b class="enh">+{lv}</b>{/if}</span>
      <span class="who">
        <span class="nm">{#if ttl}<em class="tt {TIER_CLS[ttl.tier]}">{ttl.name}</em>{/if}<b>{me.nick}</b>{#if me.test}<i class="tester">테스터</i>{/if}</span>
        <span class="sub">{info.name} · {info.job} · {fam.name} · Lv.{xp.lv}</span>
        <span class="chg">용사 바꾸기 ›{#if dots.hero}<i class="bdot" aria-label="살 수 있는 용사 있음"></i>{/if}</span>
      </span>
    </button>

    <div class="htabs" role="tablist">
      {#each [['enh', '🔨 강화'], ['sk', '⚔ 스킬'], ['rec', '🏅 기록']] as const as [k, n] (k)}
        <button type="button" role="tab" aria-selected={tab === k} class:on={tab === k} onclick={() => openTab(k)}>{n}{#if (k === 'enh' && dots.enh) || (k === 'sk' && dots.sk)}<i class="bdot" aria-label="살 수 있는 것 있음"></i>{/if}</button>
      {/each}
    </div>

    {#if tab === 'enh'}
      <div class="enhbox">
        <div class="enhrow">
          <span class="esp"><HeroSprite id={look.hero} play aura={lv} /><b>+{lv}</b></span>
          {#if nx}<span class="arrow" aria-hidden="true">→</span><span class="esp next"><HeroSprite id={look.hero} play aura={lv + 1} /><b>+{lv + 1}</b></span>{/if}
        </div>
        <p class="aname">{nx ? `다음 오라 · ${AURA_NAMES[lv + 1]}` : `🌈 최고 단계 +${lv} · ${AURA_NAMES[lv]}`}</p>
        <p class="muted">가진 용사 모두에게 함께 · 실패 없음{P.enh ? ` · 고름 +${L0.enh} → +${lv}` : ''}</p>
      </div>
    {:else if tab === 'sk'}
      {#if tip96}<p class="tip">이제 용사마다 자기 속성 스킬만 · 다른 속성은 그 용사로</p>{/if}
      {#if prev}
        {#key prev.n}
          <div class="prev" role="status"><HeroSprite id={look.hero} row={2} play aura={lv} /><span><b>{skillName(prev.id)}</b><small>{verdict(prev.tier)}</small></span></div>
        {/key}
      {/if}
      <p class="lab">{fam.name} · 위 Ⅰ → 아래 Ⅳ</p>
      <div class="lad">
        {#each lad as id, i (id)}
          {@const s = skState(id, i)}
          <button type="button" class="lr {s.st}" onclick={() => tapSkill(id, i)} aria-label="{TN[i]} {skillName(id)} · {s.sub}">
            <b>{TN[i]}</b><span><strong>{skillName(id)}{i >= 2 ? ' ⚡' : ''}{i === 3 ? '🌟' : ''}</strong><small>{s.sub}</small></span>
            {#if s.st === 'buy'}<i class="bdot" aria-hidden="true"></i>{/if}
          </button>
        {/each}
      </div>
      <p class="rule">⚡ 필살기 = 내 속성 Ⅲ · Ⅳ + 첫 시도 퍼펙트 · 🌟 진필살기 = 3연속 퍼펙트 + 내 속성 Ⅳ</p>
    {:else}
      <div class="tiles">
        <div><small>🏆 업적</small><b>0 / {DATA.unlock[DATA.unlock.length - 1]}</b></div>
        <div><small>📚 도감</small><b>0 / {CARD_TOTAL}</b></div>
        <div><small>🧑 용사</small><b>{mine.length} / {HEROES.length}</b></div>
        <div><small>🎖 메달</small><b>0</b></div>
      </div>
      <div class="stats">{#each STATS as st (st.id)}<span>{st.ic} {st.name}<b>0</b></span>{/each}</div>
      <button type="button" class="row" onclick={() => (ttlSheet = true)}><span>🏅 호칭 고르기</span><em class={ttl ? TIER_CLS[ttl.tier] : ''}>{ttl ? ttl.name : '달지 않음'}</em><span aria-hidden="true">›</span></button>
      <p class="muted">다음 업적 · {nextAch}</p>
    {/if}
  </div>

  <!-- 아래 = 할 일 (#121 시안 ⑪ ①~③): 바뀐 것이 있으면 「바뀐 것 2줄 + ↺ 되돌리기(48)」 + 💾 저장(56) · 없으면 탭마다 주요 단추 하나 · 저장 = ✔ 1초 -->
  {#if isDirty}
    <BottomAction dock={false} text="💾 저장{c.g || c.s ? ` · 💎 ${c.g}${c.s ? ` · 📜 ${c.s}` : ''}` : ''}" onmain={trySave} mainLabel="저장">
      {#snippet aux()}<div class="savebar">
        <span class="chg2">바뀐 것 · <b>{changes.join(' · ')}</b>{c.g ? ` · 💎 −${c.g}` : ''}{c.s ? ` · 📜 −${c.s}` : ''}<small>저장하기 전까진 되돌릴 수 있어요</small></span>
        <button type="button" class="btn2 undo" onclick={undo}>↺ 되돌리기</button>
      </div>{/snippet}
    </BottomAction>
  {:else if savedFlash}
    <BottomAction dock={false} text="✔ 저장했어요" />
  {:else if tab === 'enh'}
    <BottomAction dock={false} disabled={!nx} onmain={enh} text={nx ? `+${lv + 1}으로 강화 · 💎 ${nx.g}${nx.s ? ` · 📜 ${nx.s}` : ''}` : '🌈 최고 단계'} mainLabel="강화" />
  {:else}
    <BottomAction dock={false} text={tab === 'sk' ? '스킬 칸을 눌러 고르세요' : '호칭 · 기록 보기'} />
  {/if}
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
</div>

{#if heroSheet}
  <!-- 🧑 용사 바꾸기 (#121 시안 ⑪ ④): 맨 위 내 용사 카드 아래까지 덮는 아래 시트 · 위 = 고른 용사 상세 · 아래 = 4칸 격자(격자만 넘김) · 출전 · 사기 = 「고름」 → 저장해야 바뀜(#98) -->
  <div class="swbg" role="presentation" onclick={() => (heroSheet = false)} style:top="{swTop}px"></div>
  <div class="hsw" role="dialog" aria-modal="true" aria-label="용사 바꾸기" style:top="{swTop}px">
    <div class="grab"><i></i></div>
    <div class="hswh"><b>용사 바꾸기</b><span>가진 용사 {mine.length} · 모두 {HEROES.length}</span><button type="button" aria-label="닫기" onclick={() => (heroSheet = false)}>✕</button></div>
    <div class="swd">
      <span class="swbig" class:dim={!ownsPick}><HeroSprite id={pickH} play={ownsPick} dim={!ownsPick} aura={ownsPick ? lv : 0} />{#if ownsPick && lv}<b>+{lv}</b>{/if}</span>
      <span class="swtx">
        <b>{pick.name} <small>· {pick.job}</small></b>
        <span class="tg">{famName(pickH)} · 「{pick.nick}」</span>
        <span class="st">{ownsPick ? pick.a : pick.cond ? `🔓 ${pick.cond}` : pick.a}</span>
        <span class="skr" aria-label="스킬">{#each ownedSk(pickH) as o, k (k)}<i class:on={o}>{TN[k]}</i>{/each}</span>
      </span>
    </div>
    <div class="swg">
      {#each allHeroes as h (h.id)}
        {@const own = ownsHero(W, P, h.id)}
        <button type="button" class="swc" class:cur={h.id === look.hero} class:sel={h.id === pickH && h.id !== look.hero} class:lk={!own} onclick={() => (pickH = h.id)} aria-label="{h.name} · {h.job}{h.id === look.hero ? ' · 출전 중' : ''}{own ? '' : ' · 잠김'}">
          <span class="swi"><HeroSprite id={h.id} dim={!own} /></span><b>{h.name}</b><small>{own ? `${famName(h.id).split(' ')[0]}${topTier(h.id) ? ` 스킬 ${topTier(h.id)}` : ''}` : h.price != null ? `🔒 💎 ${h.price}` : '🔒 조건'}</small>
          {#if h.id === look.hero}<em>출전 중</em>{:else if P.heroes.includes(h.id)}<em class="pend">고름</em>{/if}
        </button>
      {/each}
    </div>
    {#if ownsPick}
      <BottomAction dock={false} disabled={pickH === look.hero} onmain={useHero} mainLabel="출전">{#snippet main()}{pickH === look.hero ? '✔ 지금 출전 중' : `⚔ ${pick.name}${ro(pick.name)} 출전`}{#if pickH !== look.hero}<small> · 고름 · 저장하면 바뀜</small>{/if}{/snippet}</BottomAction>
    {:else if pick.price != null}
      <BottomAction dock={false} disabled={lf.gem < pick.price} onmain={buyHero} mainLabel="사기">{#snippet main()}💎 {pick.price} 사기{#if lf.gem < pick.price}<small> · 💎 {pick.price - lf.gem} 모자람</small>{/if}{/snippet}</BottomAction>
    {:else}
      <BottomAction dock={false} text="🔒 조건으로 열어요" />
    {/if}
  </div>
{/if}

{#if ttlSheet}
  <Sheet onclose={() => (ttlSheet = false)} tall>
    {#snippet title()}🏅 호칭 고르기{/snippet}
    <div class="ttls">
      {#each TITLES.filter((t) => earned.includes(t.id)) as t (t.id)}
        <button type="button" class="tp {TIER_CLS[t.tier]}" class:on={t.id === look.title} onclick={() => { look.title = t.id; ttlSheet = false; }}>{t.name}{#if t.id === look.title} ✔{/if}</button>
      {/each}
      {#each TITLES.filter((t) => !earned.includes(t.id)) as t (t.id)}
        <span class="tp lock">{t.name}<small>{t.cond}</small></span>
      {/each}
    </div>
  </Sheet>
{/if}

{#if confirm}
  <div class="ask" role="alertdialog" aria-modal="true" aria-label="저장 확인">
    <div class="askbox">
      <b>정말 저장할까요?</b>
      <p>💎 {c.g}개{c.s ? ` · 📜 ${c.s}개` : ''}를 써요 · 저장하면 돌려받지 않아요</p>
      <div class="row2"><button type="button" class="btn2" onclick={() => (confirm = false)}>취소</button><button type="button" class="btn" onclick={commit}>💾 저장</button></div>
    </div>
  </div>
{/if}
{#if ask}
  <div class="ask" role="alertdialog" aria-modal="true" aria-label="저장 안 한 것">
    <div class="askbox">
      <b>저장 안 한 것이 있어요</b>
      <p>{changes.join(' · ')}</p>
      <div class="row2"><button type="button" class="btn2" onclick={() => { ask = false; onclose(); }}>버리기</button><button type="button" class="btn" onclick={() => { ask = false; trySave(); }}>💾 저장</button></div>
    </div>
  </div>
{/if}

<style>
  .mh { position: fixed; inset: 0; z-index: 15; max-width: 430px; margin: 0 auto; background: var(--bg); display: flex; flex-direction: column; }
  .bar { flex: none; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s2); }
  .back { width: var(--tap); height: var(--tap); border: 0; background: none; color: var(--text); display: grid; place-items: center; }
  .t { flex: 1; font-size: var(--fs-title); }
  .pill { display: flex; align-items: center; gap: var(--s1); height: 32px; padding: 0 10px; border-radius: 16px; background: var(--surface); font-size: var(--fs-small); font-weight: 700; font-variant-numeric: tabular-nums; }
  .body { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4) var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .top { display: flex; align-items: center; gap: var(--s3); padding: var(--s3); border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font-family: var(--font); text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .top:active { transform: translateY(2px); box-shadow: none; }
  .pic { position: relative; flex: none; width: 88px; height: 72px; border-radius: 12px; background: var(--surface-2); display: grid; place-items: center; }
  .enh { position: absolute; right: -6px; bottom: -6px; height: 22px; padding: 0 7px; border-radius: 11px; background: var(--accent); color: var(--on-accent); font-size: var(--fs-small); display: grid; place-items: center; box-shadow: 0 2px 0 var(--accent-sh); }
  .who { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .nm { display: flex; align-items: center; gap: var(--s1); flex-wrap: wrap; }
  .nm b { font-size: 17px; }
  .tt { font-style: normal; font-size: var(--fs-small); padding: 1px 6px; border-radius: 8px; background: var(--surface-2); }
  .tester { font-style: normal; font-size: 11px; padding: 1px 6px; border-radius: 8px; border: 1px solid var(--line); color: var(--text-3); font-weight: 700; }
  .sub { font-size: var(--fs-small); color: var(--text-2); overflow-wrap: anywhere; }
  .chg { position: relative; align-self: flex-start; min-height: var(--tap, 48px); display: inline-flex; align-items: center; font-size: var(--fs-small); font-weight: 700; color: var(--text); padding: 0 14px; border-radius: 18px; background: var(--surface-2); }
  .bdot { position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; border-radius: 5px; background: var(--gem); box-shadow: 0 0 0 2px var(--bg); }
  .htabs { display: grid; width: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .htabs button { position: relative; min-height: var(--tab-h); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 16px var(--font); }
  .htabs button.on { border: 2px solid var(--accent); color: var(--text); background: var(--surface-2); }
  .enhbox { border-radius: 16px; background: var(--surface); border: 1px solid var(--line); padding: var(--s4); display: flex; flex-direction: column; gap: var(--s2); align-items: center; }
  .enhrow { display: flex; align-items: center; gap: var(--s4); }
  .esp { position: relative; width: 104px; height: 96px; border-radius: 16px; background: var(--surface-2); display: grid; place-items: center; }
  .esp b { position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); height: 24px; padding: 0 9px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); font-size: var(--fs-small); display: grid; place-items: center; }
  .esp.next b { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .arrow { font-size: 24px; color: var(--text-3); }
  .aname { margin: var(--s2) 0 0; font-weight: 700; }
  .muted { margin: 0; font-size: var(--fs-small); color: var(--text-2); text-align: center; }
  .wide { width: 100%; }
  .row2 { align-items: center; }
  .row2 .btn { flex: 1; }
  .btn2.undo { min-height: var(--tab-h); }
  .btn { min-height: var(--btn-h); flex: none; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 var(--btn-fs) var(--font); box-shadow: 0 3px 0 var(--accent-sh); padding: 0 var(--s3); }
  .btn2 { min-height: var(--btn-h); border-radius: 14px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); padding: 0 var(--s3); }
  .btn:active, .btn2:active { transform: translateY(2px); box-shadow: none; }
  .tip { margin: 0; font-size: var(--fs-small); color: var(--gem); padding: var(--s2) var(--s3); border-radius: 12px; border: 1px dashed var(--gem); }
  .prev { display: flex; align-items: center; gap: var(--s3); padding: var(--s2) var(--s3); border-radius: 12px; background: var(--surface-2); animation: pop 0.2s ease-out; }
  .prev span { display: flex; flex-direction: column; }
  .prev small { font-size: var(--fs-small); color: var(--text-2); }
  @keyframes pop { from { opacity: 0; transform: translateY(-6px); } }
  .lab { margin: 0; font-size: var(--fs-small); font-weight: 700; color: var(--text-2); }
  .lad { display: flex; flex-direction: column; gap: 6px; }
  .lr { position: relative; display: flex; align-items: center; gap: var(--s3); min-height: 56px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; text-align: left; width: 100%; }
  .lr > b { width: 24px; font-size: 18px; color: var(--text-2); }
  .lr span { display: flex; flex-direction: column; min-width: 0; }
  .lr strong { font-size: 15px; }
  .lr small { font-size: var(--fs-small); color: var(--text-2); }
  .lr.equip { border: 2px solid var(--accent); background: var(--surface-2); }
  .lr.equip small { color: var(--accent); font-weight: 700; }
  .lr.own small { color: var(--ok); }
  .lr.buy { border: 2px dashed var(--gem); }
  .lr.buy small { color: var(--gem); }
  .lr.pick { border: 2px solid var(--gem); background: color-mix(in srgb, var(--gem) 14%, var(--surface)); }
  .lr.pick small { color: var(--gem); font-weight: 700; }
  .lr.lock { opacity: 0.5; }
  .lr .bdot { top: 8px; right: 8px; }
  .rule { margin: 0; font-size: var(--fs-small); color: var(--text-2); padding: var(--s2) var(--s3); border-radius: 12px; background: var(--surface); border: 1px solid var(--line); }
  .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .tiles div { min-height: 52px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; padding: 0 14px; }
  .tiles small { font-size: var(--fs-small); color: var(--text-2); }
  .tiles b { font-size: 17px; color: var(--accent); }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .stats span { min-height: 40px; border-radius: 10px; background: var(--surface); display: flex; align-items: center; justify-content: space-between; padding: 0 10px; font-size: var(--fs-small); color: var(--text-2); }
  .stats b { color: var(--text); }
  .row { display: flex; align-items: center; gap: var(--s2); min-height: var(--tap); padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); text-align: left; }
  .row span:first-child { flex: 1; }
  .row em { font-style: normal; font-size: var(--fs-small); }
  .savebar { flex: 1; min-width: 0; }
  .btn:disabled { opacity: 0.45; box-shadow: none; }
  .savebar { display: flex; align-items: center; gap: var(--s2); }
  .chg2 { flex: 1; min-width: 0; margin: 0; font-size: 13px; color: var(--text-2); overflow: hidden; }
  .chg2 b { color: var(--text); }
  .chg2 small { display: block; font-size: 12px; color: var(--text-3); white-space: nowrap; }
  .swbg { position: fixed; left: 0; right: 0; bottom: 0; z-index: 16; max-width: 430px; margin: 0 auto; background: rgba(0, 0, 0, 0.45); }
  .hsw { position: fixed; left: 0; right: 0; bottom: 0; z-index: 17; max-width: 430px; margin: 0 auto; background: var(--surface); border-radius: 20px 20px 0 0; box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.55); padding: 0 var(--s4); display: flex; flex-direction: column; gap: 10px; }
  .hsw > :global(.act) { margin: 0 calc(-1 * var(--s4)); background: var(--surface); }
  .grab { height: 14px; display: grid; place-items: center; } .grab i { width: 40px; height: 4px; border-radius: 2px; background: var(--line); display: block; }
  .hswh { display: flex; align-items: center; gap: var(--s2); } .hswh b { font-size: 18px; } .hswh span { flex: 1; font-size: 13px; color: var(--text-2); }
  .hswh button { width: var(--tap); height: var(--tap); border: 0; background: none; color: var(--text-2); font-size: 18px; }
  .swd { display: flex; gap: var(--s3); align-items: center; padding: 10px; border-radius: 14px; background: var(--surface-2); }
  .swbig { position: relative; flex: none; width: 96px; height: 96px; border-radius: 14px; background: var(--bg); display: grid; place-items: center; }
  .swbig b { position: absolute; right: -6px; bottom: -6px; height: 22px; padding: 0 7px; border-radius: 11px; background: var(--accent); color: var(--on-accent); font-size: 13px; display: grid; place-items: center; }
  .swtx { display: flex; flex-direction: column; gap: 3px; min-width: 0; text-align: left; }
  .swtx > b { font-size: 18px; } .swtx > b small { font-size: 13px; color: var(--text-2); }
  .swtx .tg { font-size: 13px; color: var(--accent); font-weight: 700; }
  .swtx .st { font-size: 13px; color: var(--text-2); }
  .skr { display: flex; gap: 4px; }
  .skr i { font-style: normal; width: 28px; height: 24px; border-radius: 6px; background: var(--bg); color: var(--text-3); font-size: 12px; font-weight: 700; display: grid; place-items: center; }
  .skr i.on { background: color-mix(in srgb, var(--accent) 25%, var(--bg)); color: var(--accent); }
  .swg { flex: 1; min-height: 0; overflow: auto; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; align-content: start; padding-top: 8px; }
  .swc { position: relative; min-height: 96px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); padding: 6px 2px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; color: var(--text); font-family: var(--font); }
  .swi { width: 64px; height: 52px; display: grid; place-items: center; overflow: visible; }
  .swi :global(.hs) { scale: 0.8; }
  .swc b { font-size: 13px; } .swc small { font-size: 11px; color: var(--text-2); white-space: nowrap; }
  .swc.cur { border: 2px solid var(--accent); }
  .swc.sel { border: 2px solid #6cc6ff; box-shadow: 0 0 0 3px rgba(108, 198, 255, 0.25); }
  .swc.lk { opacity: 0.75; }
  .swc em { position: absolute; top: -7px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 10px; font-weight: 700; padding: 0 6px; border-radius: 8px; background: var(--accent); color: var(--on-accent); white-space: nowrap; }
  .swc em.pend { background: var(--gem); color: #04131f; }
  .row2 { display: flex; gap: var(--s2); }
  .row2 .btn { flex: 1; }
  .toast { position: fixed; left: 50%; bottom: 120px; transform: translateX(-50%); z-index: 30; margin: 0; padding: var(--s2) var(--s3); border-radius: 12px; background: var(--surface-2); color: var(--text); font-size: var(--fs-small); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); max-width: 90vw; text-align: center; }
  .ttls { display: flex; flex-direction: column; gap: 6px; }
  .tp { min-height: var(--tap); display: flex; flex-direction: column; justify-content: center; padding: 4px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); text-align: left; }
  .tp.on { border: 2px solid var(--accent); }
  .tp.lock { opacity: 0.5; font-weight: 500; }
  .tp small { font-size: var(--fs-small); color: var(--text-2); }
  .t-b { color: var(--gem); }
  .t-p { color: var(--scroll); }
  .t-o { color: var(--accent); }
  .ask { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, 0.6); display: grid; place-items: center; padding: var(--s4); }
  .askbox { width: 100%; max-width: 340px; border-radius: var(--r-lg); background: var(--surface); padding: var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .askbox b { font-size: var(--fs-title); }
  .askbox p { margin: 0; color: var(--text-2); font-size: var(--fs-small); }
  @media (prefers-reduced-motion: reduce) { .prev { animation: none; } }
</style>
