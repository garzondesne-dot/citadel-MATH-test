<script lang="ts">
  // 🗺 게시판 던전 조우 · 정찰 (📜 요청 #69 · 선생님 2026-11-21 「느닷없이 시작 → 정찰 시간 · 조우 짧게」)
  //   meet = 어둡게 + 보스 이름 띠 + 등장 대사 · scout = 보스 카드(약점 · 공격 3종 → 막는 역할 · 내 임무 · 분노) + 남은 초 + 「⚔ 준비 완료」 · count = 3 · 2 · 1 · 전투 시작!
  import type { State } from '../../../board/atb/engine';
  import { missionOf } from '../../../board/atb/engine';
  import { ATK, ATK_SPECIAL, FAM_NAME, atkClass, atkName, bossOf, rage as RAGE, type AtkClass, type AtkKind } from '../../../board/atb/tune';
  import { bossLine } from '../../../board/atb/story';
  import FamShield from './FamShield.svelte';
  const { S, me, phase, left, short = false, ready = [], labels, onready }: {
    S: State; me: number; phase: 'meet' | 'scout' | 'count'; /** 남은 초 (정찰 · 셈) */ left: number; short?: boolean;
    /** 준비한 자리 (여럿이 · 봇 = 바로) */ ready?: number[]; labels?: Record<number, string>; onready: () => void;
  } = $props();
  const no = $derived(S.boss.no), name = $derived(bossOf(no).name), line = $derived(bossLine(no, 'enter'));
  const CLS: { c: AtkClass; ic: string; who: string; how: string }[] = [
    { c: 'single', ic: '🎯', who: '🛡 탱커', how: '막기' }, { c: 'aoe', ic: '💥', who: '🎵 서포터', how: '결계' }, { c: 'special', ic: '🌀', who: '⚔ 딜러', how: '끊기' },
  ];
  const clsOf = (k: AtkKind): AtkClass[] => (ATK[k].special === 'scale' ? ['single', 'aoe'] : ATK[k].aoe && ATK_SPECIAL.has(k) ? ['special'] : [atkClass(k, !!ATK[k].aoe)]);
  const atks = $derived(CLS.map((x) => ({ ...x, names: [...new Set(S.boss.cycle.filter((k) => clsOf(k).includes(x.c)).map((k) => atkName(S.boss, k)))] })));
  const mis = $derived(me >= 0 && S.heroes[me] ? missionOf(S, me) : null), role = $derived(me >= 0 ? S.heroes[me]?.s.role : undefined);
  const iReady = $derived(me >= 0 && ready.includes(me)), many = $derived(S.heroes.length > 1);
  const ROLE_NM = { tank: '탱커', dealer: '딜러', support: '서포터', healer: '힐러' } as const;
  const nm = (i: number) => labels?.[i] ?? S.heroes[i]?.s.name ?? '';
</script>

<div class="intro {phase}" data-k="atb-intro" data-phase={phase}>
  {#if phase !== 'count'}
    <div class="band" data-k="atb-intro-name"><small>{no}차시 던전 수호자</small><b>{name}</b></div>
    {#if line}<p class="say" data-k="atb-intro-line">「{line}」</p>{:else}<p class="say ph" data-k="atb-intro-line">…</p>{/if}
  {/if}
  {#if phase === 'scout'}
    <section class="card" data-k="atb-scout" aria-label="정찰">
      <div class="row weak"><span class="lb">약점</span>{#each S.boss.weak as f (f)}<span class="fam"><FamShield fam={f} size={16} /> {FAM_NAME[f]}</span>{/each}</div>
      <ul class="atks">{#each atks as a (a.c)}{#if a.names.length}<li data-cls={a.c}><b>{a.ic} {a.names.join(' · ')}</b><span>→ {a.who} {a.how}</span></li>{/if}{/each}</ul>
      {#if mis && role}<div class="row mine" data-k="atb-scout-mission">내 임무: {ROLE_NM[role]} = {mis.ic} {mis.txt} {mis.need}</div>{/if}
      <div class="row rage">😡 분노 = 체력 {Math.round(RAGE.at * 100)}% 아래</div>
      <div class="foot">
        <span class="left" data-k="atb-scout-left">⏳ {left}초</span>
        {#if many}<span class="rd" data-k="atb-scout-ready">{#each S.heroes as h (h.id)}<i class:on={ready.includes(h.id)}>{ready.includes(h.id) ? '✔' : '…'} {nm(h.id)}</i>{/each}</span>{/if}
        <button type="button" class="go" disabled={iReady} data-k="atb-scout-go" onclick={onready}>{iReady ? '✔ 준비됨 · 친구 기다리는 중' : short ? '⏭ 건너뛰기' : '⚔ 준비 완료'}</button>
      </div>
    </section>
  {:else if phase === 'count'}
    {#key left}<b class="cnt" data-k="atb-intro-count">{left > 0 ? left : '전투 시작!'}</b>{/key}
  {/if}
</div>

<style>
  .intro { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; pointer-events: auto; background: #08040ccc; animation: dim 0.4s ease-out; padding: 0 16px; }
  .intro.count { background: #08040c55; pointer-events: none; }
  @keyframes dim { from { background: #08040c00; } }
  .band { display: flex; flex-direction: column; align-items: center; padding: 4px 28px; background: linear-gradient(90deg, #0000, #5a1a1aee 15%, #5a1a1aee 85%, #0000); border-top: 2px solid #ffcf6a; border-bottom: 2px solid #ffcf6a; animation: band 0.5s ease-out 0.35s both; }
  .band small { font: 700 12px var(--font-plain); color: #ffd9a0; } .band b { font: 900 22px var(--font); color: #fff3d0; text-shadow: 0 2px 0 #000; }
  @keyframes band { from { transform: scaleX(0); opacity: 0; } }
  .say { margin: 0; max-width: 70%; padding: 4px 12px; border-radius: 10px; background: #fff8e6; color: #3a2614; font: 700 14px var(--font-plain); text-align: center; animation: band 0.4s ease-out 0.7s both; }
  .say.ph { opacity: 0.4; }
  .card { width: min(440px, 100%); padding: 8px 12px; border-radius: 12px; background: #f6e7c4; border: 2px solid #b88a4a; color: #3a2614; display: grid; gap: 4px; font: 700 13px var(--font-plain); animation: band 0.3s ease-out; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .lb { font-weight: 900; } .fam { display: inline-flex; align-items: center; gap: 3px; padding: 0 6px; border-radius: 8px; background: #fff3d6; }
  .atks { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; } .atks li { display: flex; justify-content: space-between; gap: 6px; } .atks span { color: #6a4a20; white-space: nowrap; }
  .mine { color: #1d5ac8; font-weight: 900; } .rage { color: #b3261e; }
  .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px; }
  .left { font: 900 15px var(--font); } .rd { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; } .rd i { font-style: normal; opacity: 0.55; } .rd i.on { opacity: 1; color: #1f7a3c; }
  .go { min-height: 40px; padding: 0 16px; border-radius: 10px; border: 2px solid #7a4e10; background: linear-gradient(#ffd35a, #e09a1e); color: #3a1e00; font: 900 15px var(--font); }
  .go:disabled { background: #d8c8a0; color: #6a5a3a; }
  .cnt { font: 900 72px/1 var(--font); color: #fff; text-shadow: 0 0 12px #ff1a1a, 0 0 3px #000, 0 4px 0 #000; animation: pop 0.9s ease-out both; }
  @keyframes pop { 0% { transform: scale(2.2); opacity: 0; } 25% { transform: scale(1); opacity: 1; } 100% { opacity: 0.85; } }
  @media (max-height: 430px) { .card { gap: 2px; padding: 6px 10px; font-size: 12px; } .band b { font-size: 18px; } .go { min-height: 34px; } }
  @media (prefers-reduced-motion: reduce) { .band, .say, .card, .cnt, .intro { animation: none; } }
</style>
