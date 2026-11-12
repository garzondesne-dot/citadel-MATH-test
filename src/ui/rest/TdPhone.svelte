<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { untrack } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import { HEROES, heroOf } from '../../model/hero';
  import { emptyPlan, ownsHero } from '../../model/draft';
  import { useMe } from '../../store/me.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import Cutin from './Cutin.svelte';
  import { payTd, tdAccept, tdHero, tdPick, tdReject, tdSkill, tdSwap, tdUp } from '../../rest/run';
  import * as TD from '../../rest/td';
  import { artUrl, TD_ART } from '../manifest';

  // 📱 학생 폰 · 🏰 디펜스 (#142-2): 폰 = 자리 고르기(선착순 · 한 번) · 기술 단추(한 판 한 번)만 · 계산 · 그림은 교실 TV
  //   타워 힘 = 모두 같음(레벨 · 강화 · 스킬 · 속성 안 셈) · 근접 / 원거리 = 내 용사 모양 · 판 안 업그레이드 = 저절로
  const { S, R, code, uid, now }: { S: Store; R: Room; code: string; uid: string; now: number } = $props();
  const f = $derived((R as any).fun as any);
  const map = $derived(TD.mapGet(f?.map ?? 'forest'));
  const sl = $derived(TD.slots(map));
  const picks = $derived((((R as any).tdp || {})[f?.g] || {}) as Record<string, string>);
  const mine = $derived(Object.keys(picks).find((k) => picks[k] === uid));
  const left = $derived(f?.phase === 'pick' ? Math.max(0, Math.ceil((f.to - now) / 1000)) : 0);
  const L = $derived((((R as any).tdl || {})[f?.g] || {}) as any);
  const tw = $derived((f?.tw ? (Array.isArray(f.tw) ? f.tw : Object.values(f.tw)) : []).find((t: any) => t.u === uid) as any);
  const used = $derived(!!((R as any).tdt || {})[f?.g]?.[uid] || !!L.used?.[uid]);
  const cd = $derived(f?.phase === 'play' ? Math.ceil((f.t0 - now) / 1000) : 0);
  const tdm = $derived((((R as any).tdm || {})[f?.g] || {}) as Record<string, { sw?: string; no?: string; hero?: number; swd?: number }>);
  const myHero = $derived(tdm[uid]?.hero != null ? Number(tdm[uid]!.hero) : Number(R.players?.[uid]?.hero) || 0);
  const ranged = $derived(!!heroOf(myHero).ranged);
  // 🔁 자리 교환 (정식 1:1): 내 자리가 있으면 친구 자리를 눌러 신청 · 받은 신청 = 수락 / 거절
  const my = $derived(tdm[uid] || {});
  const slotOf = (u: string) => Object.keys(picks).find((k) => picks[k] === u);
  const nick = (u: string) => (R.players?.[u]?.nick ?? '친구').split(' ').at(-1) ?? '친구';
  const inc = $derived(Object.keys(tdm).filter((u) => u !== uid && tdm[u]?.sw === uid && my.sw !== u && my.no !== u && slotOf(u)));
  let seenNo = '', seenSwd = 0;
  $effect(() => { if (my.sw && tdm[my.sw]?.no === uid && seenNo !== my.sw) { seenNo = my.sw; msg = `🙅 ${nick(my.sw)} 친구가 교환을 거절했어요`; untrack(() => tdSwap(S, code, f.g, uid, null)); } });
  $effect(() => { const d = Number(my.swd) || 0; if (d && d !== seenSwd) { if (seenSwd || d > now - 5000) msg = '🔁 자리를 바꿨어요!'; seenSwd = d; } });
  // ⚙ 용사 바꾸기 (자리 고르기 동안만 · 모양 · 근접/원거리만 · 힘은 모두 같음)
  const ME = useMe(0, 0);
  const owned = $derived(HEROES.filter((h) => ownsHero(ME.me.wallet, emptyPlan(), h.id)));
  let heroSheet = $state(false);
  // ⬆ 판 안 업그레이드 (정식: ⭐ 모으면 한 칸 · 12초 안 안 고르면 저절로)
  const UPN: Record<string, string> = { a: '⚔ 공격 +25%', b: '⚡ 속도 +20%', c: '✨ 특기 한 단계' };
  const mineUp = $derived(Object.keys((((R as any).tdu || {})[f?.g] || {})[uid] || {}).reduce((a, k) => Math.max(a, Number(k) + 1), 0));
  const upsTxt = $derived(String(L.ups?.[uid] ?? ''));
  const need = $derived((Number(L.got?.[uid]) || 0) - Math.max(upsTxt.length, mineUp));
  const nextStar = $derived(TD.STARS_AT[Math.max(upsTxt.length, mineUp, Number(L.got?.[uid]) || 0)] ?? null);
  const tier = $derived(Number(L.tier?.[uid]) || 0);
  let cut = $state<{ name: string } | null>(null);
  function useSkill() { tdSkill(S, code, f.g, uid); if (tier >= 2) { cut = { name: '필살기!' }; setTimeout(() => (cut = null), 1600); } }
  let msg = $state('');
  function pick(no: number) {
    if (f?.phase !== 'pick') return;
    if (mine) { const o = picks[no]; if (!o || o === uid) { msg = o ? '내 자리예요' : '이미 자리를 골랐어요 · 친구 자리를 누르면 교환 신청'; return; } tdSwap(S, code, f.g, uid, my.sw === o ? null : o); msg = my.sw === o ? '교환 신청을 취소했어요' : `🔁 ${nick(o)}에게 교환 신청!`; return; }
    msg = tdPick(S, code, f.g, no, uid) ? '' : '다른 친구가 먼저 잡았어요!';
  }
  // 🎁 결과 = 하루 💎 최대 3 (이기면 3 · 지면 1)
  let paid = $state(0), paidFor = 0;
  $effect(() => { if (f?.phase === 'end' && f.res && tw && paidFor !== f.g) { paidFor = f.g; paid = untrack(() => payTd(S, uid, !!f.res.win, code)); } });
  const u = 22;
</script>

<div class="tdp">
  {#if f?.phase === 'pick'}
    <div class="card"><b class="h">🏰 자리 고르기 <em>{left}초</em></b><small>{map.name} · 선착순 · 한 번 · ★ = 명당</small></div>
    <svg viewBox="0 0 {16 * u} {9 * u}" class="mini" role="group" aria-label="지도">
      <rect width={16 * u} height={9 * u} fill={map.theme.bg[0]} />
      {#if TD_ART[map.id]}<image href={artUrl(TD_ART[map.id]!)} x="0" y="0" width={16 * u} height={9 * u} preserveAspectRatio="none" />{/if}
      {#each sl as p (p.no)}
        {@const who = picks[p.no]}
        <g class="slot" class:me={who === uid} class:taken={!!who && who !== uid} role="button" tabindex="0" aria-label="{p.no}번 자리{who ? (who === uid ? ' · 내 자리' : ' · 찼음') : ''}" onclick={() => pick(p.no)} onkeydown={(e) => e.key === 'Enter' && pick(p.no)}>
          <circle cx={p.x * u} cy={p.y * u} r="14" fill="transparent" />
          <circle cx={p.x * u} cy={p.y * u} r={p.star ? 10 : 8.5} fill={who === uid ? '#3c8a5a' : who ? '#444' : '#000a'} stroke={p.star ? '#ffd25a' : '#fff9'} stroke-width={p.star ? 2.5 : 1.4} />
          <text x={p.x * u} y={p.y * u + 3.5} font-size="9" text-anchor="middle" fill={p.star ? '#ffd25a' : '#fff'} font-weight="700">{who === uid ? '나' : who ? '✖' : p.no}</text>
        </g>
      {/each}
    </svg>
    <p class="me">{msg || (mine ? `✔ ${mine}번 자리를 잡았어요!` : ranged ? '🏹 원거리 = 어디든 좋아요 · 빈 칸을 눌러요' : '🗡 근접 = 길 가까운 칸이 좋아요 · 빈 칸을 눌러요')}</p>
    {#each inc as u (u)}<div class="swin">🔁 <b>{nick(u)}</b>({slotOf(u)}번) ↔ 내 {mine}번 <button type="button" class="ok" onclick={() => tdAccept(S, code, f.g, uid, u)}>수락</button><button type="button" onclick={() => tdReject(S, code, f.g, uid, u)}>거절</button></div>{/each}
    {#if mine && my.sw}<p class="why">⏳ {nick(my.sw)}({slotOf(my.sw) ?? '?'}번)에게 교환 신청 중 · 그 자리를 다시 누르면 취소</p>{:else if mine}<p class="why">🔁 친구 자리를 누르면 1:1 교환 신청</p>{:else}<p class="why">타워 힘은 모두 같아요 · 안 고르면 빈 자리에 저절로</p>{/if}
    <button type="button" class="hbtn" onclick={() => (heroSheet = true)}><HeroSprite id={myHero} scale={1} /><span>⚙ 용사 바꾸기 <small>{ranged ? '🏹 원거리' : '🗡 근접'} · 자리 고르기 동안만</small></span></button>
  {:else if f?.phase === 'play'}
    <div class="card"><b class="h">🏰 {map.name}</b><small>{cd > 0 ? `${cd}초 뒤 시작!` : `🌊 웨이브 ${L.wave ?? 1} / 5 · ❤ ${L.life ?? TD.LIFE}`}</small></div>
    {#if tw}
      <div class="stat"><span><b>{tw.s}번</b>자리</span><span><b>{L.kills?.[uid] ?? 0}</b>처치</span><span><b>⭐{L.stars?.[uid] ?? 0}</b>{nextStar ? `다음 ⭐${nextStar}` : '업그레이드 끝'}</span></div>
      {#if need > 0}<p class="me">⬆ 업그레이드! 하나를 골라요 <small>(12초 안에 안 고르면 저절로)</small></p><div class="ups">{#each ['a', 'b', 'c'] as const as k (k)}<button type="button" onclick={() => tdUp(S, code, f.g, uid, Math.max(upsTxt.length, mineUp), k)}>{UPN[k]}</button>{/each}</div>
      {:else if upsTxt}<p class="why">업그레이드: {upsTxt.split('').map((k) => UPN[k]?.split(' ')[0]).join(' ')}</p>{/if}
      <button type="button" class="btn sk" disabled={used || cd > 0 || !!R.state.focus} onclick={useSkill}>{used ? '⚡ 기술을 썼어요' : tier >= 2 ? '⚡ 필살기 (주변 광역 × 5)' : '💥 기술 (주변 광역 × 3)'}<small>{used ? '다음 판에 또!' : '한 판에 한 번 · 몬스터가 몰렸을 때!'}</small></button>
    {:else}
      <p class="me">👀 이번 판은 구경해요 — 다음 판에 함께!</p>
    {/if}
  {:else if f?.phase === 'end' && f.res}
    <div class="card end" class:win={f.res.win}><b class="h">{f.res.win ? '🏆 승리! 성을 지켰어요' : '💥 아쉽게 졌어요'}</b>{#if tw}<small>내 처치 {L.kills?.[uid] ?? 0}마리</small>{/if}</div>
    {#if tw}<p class="pay">{paid ? `💎 +${paid} · 캠프에서 받아요` : '💎 오늘 디펜스 보상은 다 받았어요'}</p>{/if}
  {:else}
    <p class="me">🏰 결과 계산 중…</p>
  {/if}
</div>
{#if heroSheet}
  <Sheet onclose={() => (heroSheet = false)} mainText="다 했어요">
    {#snippet title()}⚙ 이번 판 용사{/snippet}
    <p class="why">모양 · 근접 / 원거리만 바뀌어요 · 타워 힘은 모두 같아요</p>
    <div class="hgrid">{#each owned as h (h.id)}<button type="button" class:on={h.id === myHero} aria-pressed={h.id === myHero} onclick={() => { tdHero(S, code, f.g, uid, h.id); heroSheet = false; }}><HeroSprite id={h.id} scale={1} /><small>{h.name} · {h.ranged ? '🏹' : '🗡'}</small></button>{/each}</div>
  </Sheet>
{/if}
{#if cut}<Cutin hero={myHero} name={cut.name} />{/if}

<style>
  .swin { display: flex; align-items: center; gap: 6px; justify-content: center; font-size: 13.5px; background: var(--surface); border-radius: var(--r); padding: 6px 8px; }
  .swin button { height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
  .swin button.ok { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .hbtn { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .hbtn small { display: block; font-size: 12px; color: var(--text-2); font-weight: 500; }
  .ups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .ups button { min-height: 56px; border-radius: 12px; border: 2px solid var(--accent); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
  .hgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .hgrid button { display: flex; flex-direction: column; align-items: center; padding: 4px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); }
  .hgrid button.on { border: 2px solid var(--accent); } .hgrid small { font-size: 11.5px; }
  .tdp { width: 100%; display: flex; flex-direction: column; gap: var(--s3); align-items: stretch; text-align: center; }
  .card { background: var(--surface); border-radius: var(--r); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .card .h { font-size: 18px; } .card .h em { font-style: normal; color: var(--accent); } .card small { font-size: 13px; color: var(--text-2); }
  .card.end.win .h { color: var(--accent); }
  .mini { width: 100%; height: auto; border-radius: var(--r); display: block; }
  .slot { cursor: pointer; } .slot.taken { cursor: default; }
  .me { margin: 0; font-size: 15px; font-weight: 700; }
  .why { margin: 0; font-size: 13px; color: var(--text-3); }
  .stat { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .stat span { background: var(--surface); border-radius: 10px; padding: 8px 0; display: flex; flex-direction: column; font-size: 12.5px; color: var(--text-2); } .stat b { font-size: 20px; color: var(--text); }
  .btn.sk { min-height: 96px; border: 0; border-radius: 16px; background: var(--accent); color: var(--on-accent); font: 700 22px var(--font); box-shadow: 0 3px 0 var(--accent-sh); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
  .btn.sk small { font-size: 13px; font-weight: 700; opacity: 0.8; }
  .btn.sk:disabled { background: var(--surface-2); color: var(--text-3); box-shadow: none; }
  .btn.sk:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .pay { margin: 0; font-weight: 700; color: var(--gem); }
</style>
