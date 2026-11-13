<script lang="ts">
  import { artUrl, dungeonOf, ELEM_FX, HERO, heroGeo, heroNudge, heroUrl, spriteOf, STATUS } from '../manifest';
  import { heroOf } from '../../model/hero';
  import { savedLook } from '../../store/me.svelte';
  import { fx } from './fx.svelte';
  import IceBlock from './IceBlock.svelte';
  import { atkQ, guardQ } from './fx.svelte';
  import { guard } from '../fx/aura';
  import { attack, canUlt, preload as atkPreload, type Pose } from '../fx/attack';
  import { monBody } from '../manifest';
  import { aura as auraAct } from '../fx/aura';
  import { untrack } from 'svelte';
  // 🎬 장면 띠 (②B · 2-1절): 폰 맨 위부터 양끝까지 · 높이 280 · 아래 56px 페이드
  //   위 = ‹ 뒤로 + 💎 (흰 글씨 + 그림자 · 검은 띠 없음) · 남은 시간 칩 = 마지막 5분부터
  //   몬스터 체력 = 오른쪽 위 · 상태 칩 = 왼쪽 위(이 몬스터에서만 켜지는 효과) · 용사 = 왼쪽 바닥 · 몬스터 = 오른쪽
  //   정찰 = 몬스터 그림자 · 소레이드 = 졸개 줄(지금 칠 졸개 테두리) + 대장
  type Chip = { text: string; on?: boolean };
  const { theme, sprite, hp = null, hpLabel: hpL = '', shadow = false, down = false, chips = [], minions = null, gem = 0, timeLeftMs = null, backHref = '?', pose = 'idle', hit = false, hitTag = '', note = '', onconcept, elem = '', rage = false, hitKey = 0, ice = false, iceEnd = 'melt', holy = '', onholy, stoneSec = 0, stoneHoly = false }:
    { theme?: string; sprite: string; hp?: { left: number; max: number } | null; hpLabel?: string; shadow?: boolean; down?: boolean; chips?: Chip[];
      minions?: { n: number; stage: number; downs: number[] } | null; gem?: number; timeLeftMs?: number | null; backHref?: string; pose?: 'idle' | 'attack' | 'miss'; hit?: boolean; hitTag?: string; note?: string; onconcept?: () => void; elem?: string; rage?: boolean; hitKey?: number; ice?: boolean; iceEnd?: 'shatter' | 'melt'; holy?: '' | 'can' | 'on'; onholy?: () => void; stoneSec?: number; stoneHoly?: boolean } = $props();
  // 🧊 얼음(2026-11-13): 용사를 덮는 얼음 덩어리 · 톡마다 금 · 4번 = 깨져 흩어짐 · 시간 끝 = 녹음 (0.6초 뒤 사라짐)
  let iceMode = $state<'off' | 'on' | 'shatter' | 'melt'>('off'), iceTaps = $state(0);
  $effect(() => { if (ice) { iceMode = 'on'; iceTaps = Math.max(0, Math.min(4, 4 - fx.ice)); } else if (iceMode === 'on') { iceMode = iceEnd; if (iceEnd === 'shatter') iceTaps = 4; setTimeout(() => (iceMode = 'off'), 650); } });
  // 💫 #161 속성: 몬스터 → 용사 = 빛 구슬(0.25초) → 용사 자리 속성 이펙트 띠(정식 pfx) · 용사 머리 위 상태 그림(정식 status · 맞는 동안) · 분노 = 장면 붉게
  const efx = $derived(elem ? ELEM_FX[elem] : null);
  const srow = $derived(Math.max(0, STATUS.kinds.indexOf(elem as (typeof STATUS.kinds)[number])));
  // 💥 hit = 몬스터 공격(#151): 장면 띠 안에서만 — 빨간 번쩍 0.15초 · 「💥 몬스터 공격!」 꼬리표 · 용사 붉게 (문제 카드는 움직이지 않음)
  //   note = 장면 안 알림 꼬리표(쓰러짐 · 승리) — 문제 위 알림 띠 대신
  const ATK_ROW = 2; // 정식 heroesV2 anims.attack = 2줄
  // ⚔ 정식 DS.Attack.play (🔨 용사 fx · 2026-11-13): 장면 = .edge · heroBox = .hb · monBox = .mon(보이는 몸통 data-bb) · 자세 = 정식 anims 줄(idle 0 · walk 1 · attack 2 · win 4 · think 10)
  const ROW: Record<Pose, number> = { idle: 0, walk: 1, attack: 2, win: 4, think: 10 };
  let edge = $state<HTMLDivElement | null>(null), heroBox = $state<HTMLSpanElement | null>(null), monEl = $state<HTMLElement | null>(null), apose = $state<Pose | ''>('');
  const heroRow = $derived(apose ? ROW[apose] : pose === 'idle' ? HERO.idleRow : ATK_ROW), heroCol = $derived(apose ? (apose === 'attack' ? 2 : 0) : pose === 'idle' ? 0 : 2);
  let lastAtk = 0, lastGuard = guardQ.v;
  // 🛡 홀리 방패 막기 = 내 용사 날개 · 방패 (정식 Aura.guard · 장면 높이 안)
  $effect(() => { const g = guardQ.v; if (g === lastGuard || !heroBox || !edge) return; lastGuard = g; untrack(() => guard(heroBox, undefined, edge!.getBoundingClientRect().height, monEl)); });
  $effect(() => {
    const a = atkQ.v; if (!a || a.id === lastAtk || !edge) return; lastAtk = a.id;
    untrack(() => { const L = savedLook(); atkPreload(L.hero, L.fx); void attack(edge, { heroBox, monBox: monEl, hero: L.hero, fx: L.fx, miss: a.miss, hits: a.hits, ultimate: !!a.ult && canUlt(L.fx, L.hero), finish: a.finish, noDmg: a.noDmg, rest: a.win ? 'win' : 'idle', pose: (p) => (apose = p === 'idle' ? '' : p) }).finally(() => setTimeout(() => (apose = ''), 400)); });
  });
  const sp = $derived(spriteOf(sprite));
  const monBB = $derived(monBody(sp.sheet.src, sp.row, sp.sheet.poses[down ? 'down' : 'idle'], sp.sheet.cell));
  const hpLabel = $derived(hpL || sp.sheet.names[sp.row] || '몬스터');
  const MON = 128; // 몬스터 칸 256 → 정확히 ½
  const HS = 2;
  const hg = $derived(heroGeo(savedLook().hero)); // 새 화풍(세밀 시트) = 같은 자리에서 위 · 옆으로 넘쳐 그림 // 용사 칸 80 × 64 → 정수 2배
  const mm = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const monBg = (size: number, pose: 'idle' | 'down') => `background-image:url(${sp.url});background-size:${sp.sheet.cols * size}px ${sp.sheet.rows * size}px;background-position:-${sp.sheet.poses[pose] * size}px -${sp.row * size}px;width:${size}px;height:${size}px;${sp.hue ? `filter:hue-rotate(${sp.hue}deg)${shadow ? ' brightness(0)' : ''};` : shadow ? 'filter:brightness(0);opacity:.85;' : ''}`;
</script>

<div class="edge" bind:this={edge} class:hit class:rage class:iced={ice} style:background-image="url({dungeonOf(theme)})">
  <div class="top">
    <a class="back" href={backHref} aria-label="뒤로">‹</a>
    {#if onconcept}<button type="button" class="pill cpt" onclick={onconcept}>📘 이 문제의 개념</button>{/if}
    <span class="sp"></span>
    {#if timeLeftMs != null && timeLeftMs <= 5 * 60000}<span class="pill time" aria-label="남은 시간">⏱ {mm(Math.max(0, timeLeftMs))}</span>{/if}
    <span class="pill" aria-label="마정석 {gem}개"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1 13 6 7 13 1 6Z" fill="var(--gem)" /></svg>{gem}</span>
  </div>
  {#if holy && onholy}<button type="button" class="holy-btn" class:on={holy === 'on'} onclick={onholy} aria-pressed={holy === 'on'}>🛡 <b>{holy === 'on' ? '방패 준비됨' : '홀리 방패'}</b><small>{holy === 'on' ? '끄기' : '켜기'}</small></button>{/if}
  {#if stoneSec > 0}<span class="stone-chip" role="status">🗿 {stoneHoly ? '홀리 방패' : '진필살기'} 석화 {stoneSec}초 · 지금 맞히면 💎</span>{/if}
  {#if chips.length}<div class="buffs">{#each chips as c, k (k)}<span class="buff" class:on={c.on}>{c.text}</span>{/each}</div>{/if}
  {#if hp && !shadow}
    <div class="mhp"><span>{hpLabel} · 체력 {hp.left} / {hp.max}</span><div class="b"><i style:width="{hp.max ? (hp.left / hp.max) * 100 : 0}%"></i></div></div>
  {/if}
  {#if minions}
    <div class="minions">
      {#each Array.from({ length: minions.n }) as _, k (k)}
        <i class="mini" class:dead={k < minions.stage || minions.downs.includes(k)} class:now={k === minions.stage} style={monBg(40, k < minions.stage ? 'down' : 'idle')} aria-label="졸개 {k + 1}"></i>
      {/each}
    </div>
  {/if}
  <i class="mon art monster" class:stoned={stoneSec > 0} bind:this={monEl} data-bb={monBB} class:minboss={!!minions} style={monBg(minions ? 104 : MON, down ? 'down' : 'idle')} aria-label={sp.sheet.names[sp.row]}></i>
  {#if hit}<span class="tag hitTag" role="status">{hitTag || '💥 몬스터 공격!'}</span>{:else if note}<span class="tag" role="status">{note}</span>{/if}
  {#if pose === 'miss'}<span class="miss">헛스윙</span>{/if}
  {#if iceMode !== 'off'}
    <span class="icew" style:translate="{(heroNudge(savedLook().hero, 0).dx + hg.dx) * HS}px {(heroNudge(savedLook().hero, 0).dy + hg.dy) * HS}px">
      <IceBlock url={heroUrl()} size="{HERO.cols * hg.w * HS}px {HERO.rows * hg.h * HS}px" pos="-0px -{HERO.idleRow * hg.h * HS}px" w={hg.w * HS} h={hg.h * HS} taps={iceTaps} mode={iceMode === 'on' ? 'on' : iceMode} />
    </span>
  {/if}
  {#if hit && efx}
    {#key hitKey}
      <i class="orb e-{elem}" aria-hidden="true"></i>
      {#if !ice}<i class="efx" aria-hidden="true" style:width="{efx.w}px" style:height="{efx.h}px" style:left="{80 - efx.w / 2}px" style:top="{204 - efx.h / 2}px" style:background-image="url({artUrl(efx.src)})" style:background-size="{efx.w * efx.n}px {efx.h}px" style:--n={efx.n} style:--fw="{efx.w * efx.n}px" style:animation-duration="{Math.round((efx.n / efx.fps) * 1000)}ms"></i>{/if}
    {/key}
    {#if !ice}<i class="status" data-elem={elem} aria-label="상태 {elem}" style:translate="{(heroNudge(savedLook().hero, 0).dx + hg.dx) * HS}px {(heroNudge(savedLook().hero, 0).dy + hg.dy) * HS}px" style:background-image="url({artUrl(STATUS.src)})" style:background-size="{STATUS.cols * STATUS.w * HS}px {STATUS.kinds.length * STATUS.h * HS}px" style:background-position-y="-{srow * STATUS.h * HS}px" style:width="{STATUS.w * HS}px" style:height="{STATUS.h * HS}px" style:--sw="{STATUS.cols * STATUS.w * HS}px"></i>{/if}
  {/if}
  <!-- ⚔ 용사 = .hb(돌진 · 정식 heroBox) 안 .art(그림) · 공격 중엔 정식 자세(walk · attack) · 끝나면 prop 자세 -->
  <span class="hb" bind:this={heroBox} style:width="{hg.w * HS}px" style:height="{hg.h * HS}px"><i class="hero art" use:auraAct={{ lv: savedLook().enh }} class:lunge={!apose && pose === 'attack'} class:whiff={!apose && pose === 'miss'} style:translate="{(heroNudge(savedLook().hero, 0).dx + hg.dx) * HS}px {(heroNudge(savedLook().hero, 0).dy + hg.dy) * HS}px" style:background-image="url({heroUrl()})" style:background-size="{HERO.cols * hg.w * HS}px {HERO.rows * hg.h * HS}px"
    style:background-position="-{heroCol * hg.w * HS}px -{heroRow * hg.h * HS}px" style:width="{hg.w * HS}px" style:height="{hg.h * HS}px" aria-label="내 용사 {heroOf(savedLook().hero).job}"></i></span>
</div>

<style>
  .edge { position: relative; height: 280px; background-size: cover; background-position: center 62%; image-rendering: pixelated; overflow: hidden; }
  .edge::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 56px; background: linear-gradient(transparent, var(--bg)); z-index: 1; }
  .top { position: absolute; top: 0; left: 0; right: 0; z-index: 5; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s1); }
  .back { width: 44px; height: var(--tap); display: grid; place-items: center; color: #fff; font-size: 30px; text-decoration: none; text-shadow: 0 1px 2px #000, 0 0 6px rgba(0, 0, 0, 0.8); }
  .sp { flex: 1; }
  .pill { display: flex; align-items: center; gap: var(--s1); height: 32px; padding: 0 10px; border-radius: 16px; background: rgba(8, 9, 12, 0.55); color: #fff; font-size: var(--fs-small); font-weight: 700; font-variant-numeric: tabular-nums; }
  .pill.time { color: var(--accent); }
  .pill.cpt { border: 0; height: 36px; font: 700 var(--fs-small) var(--font); cursor: pointer; }
  .buffs { position: absolute; z-index: 2; left: var(--s3); top: 64px; display: flex; flex-direction: column; gap: 6px; }
  .buff { height: 28px; padding: 0 10px; border-radius: 14px; background: rgba(8, 9, 12, 0.72); border: 1px solid rgba(255, 255, 255, 0.18); color: #fff; font-size: var(--fs-small); font-weight: 700; display: flex; align-items: center; }
  .buff.on { border-color: var(--accent); color: var(--accent); }
  .mhp { position: absolute; z-index: 2; top: 62px; right: var(--s3); width: 170px; display: flex; flex-direction: column; gap: var(--s1); color: #fff; font-size: var(--fs-small); font-weight: 700; text-shadow: 0 1px 0 #000; text-align: right; }
  .mhp .b { height: 10px; border-radius: 5px; background: rgba(0, 0, 0, 0.55); border: 1px solid rgba(255, 255, 255, 0.25); }
  .mhp .b i { display: block; height: 8px; border-radius: 4px; background: var(--hp); transition: width 0.4s; }
  .mon { position: absolute; z-index: 1; right: 24px; top: 108px; display: block; image-rendering: pixelated; background-repeat: no-repeat; }
  /* ⚔ 소레이드 (#160 · 정식 소레이드 1단계 배치): 대장 = 오른쪽 뒤(조금 위) · 졸개 셋 = 대장 앞 한 줄(오른쪽 정렬 · 간격 8) · 용사 = 왼쪽 · 용사 칸(160)과 겹침 0 */
  .mon.minboss { right: 8px; top: 90px; }
  .minions { position: absolute; z-index: 2; right: 16px; top: 194px; display: flex; gap: var(--s2); }
  .mini { display: block; image-rendering: pixelated; background-repeat: no-repeat; border-radius: var(--r-sm); }
  .mini { transition: transform 0.2s ease-out, opacity 0.2s; }
  .mini.dead { opacity: 0.3; transform: translateY(6px); }
  .mini.now { outline: 3px solid var(--accent); outline-offset: 2px; }
  .hero.lunge { transform: translateX(28px); }
  .hero.whiff { transform: translateX(14px); opacity: 0.75; }
  .miss { position: absolute; z-index: 2; left: 150px; top: 150px; color: #fff; font-weight: 700; font-size: var(--fs-small); text-shadow: 0 1px 2px #000; }
  .edge.hit::before { content: ''; position: absolute; inset: 0; z-index: 2; background: var(--bad); opacity: 0; animation: hitf 0.15s ease-out; pointer-events: none; }
  @keyframes hitf { from { opacity: 0.55; } to { opacity: 0; } }
  .edge.hit .hero { filter: sepia(1) saturate(6) hue-rotate(-40deg) brightness(0.9); }
  .tag { position: absolute; z-index: 3; left: 50%; transform: translateX(-50%); top: 216px; height: 32px; padding: 0 12px; border-radius: 16px; background: rgba(8, 9, 12, 0.72); border: 1px solid var(--accent); color: #fff; font-size: var(--fs-small); font-weight: 700; display: flex; align-items: center; white-space: nowrap; }
  .tag.hitTag { border-color: var(--bad); background: rgba(120, 20, 20, 0.85); }
  /* 💫 #161 속성 이펙트 · 상태 그림 · 분노 */
  .orb { position: absolute; z-index: 2; left: 300px; top: 160px; width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle, #fff, var(--oc, #ff6b6b) 55%, transparent 70%); animation: orb 0.25s ease-in forwards; pointer-events: none; }
  @keyframes orb { to { transform: translate(-230px, 36px); opacity: 0.2; } }
  .orb.e-freeze { --oc: #7fd6ff; } .orb.e-burn { --oc: #ff8a1c; } .orb.e-poison { --oc: #b06cff; } .orb.e-shock { --oc: #ffe14a; } .orb.e-bind { --oc: #c9c9d6; } .orb.e-confuse { --oc: #ff7ad9; } .orb.e-sleep { --oc: #9fb2ff; }
  .efx { position: absolute; z-index: 2; display: block; image-rendering: pixelated; background-repeat: no-repeat; opacity: 0; animation-name: efx; animation-timing-function: steps(var(--n)); animation-fill-mode: forwards; animation-delay: 0.22s; pointer-events: none; }
  @keyframes efx { 0% { opacity: 1; background-position-x: 0; } 99% { opacity: 1; } 100% { opacity: 0; background-position-x: calc(-1 * var(--fw)); } }
  .status { position: absolute; z-index: 2; left: 0; top: 108px; display: block; image-rendering: pixelated; background-repeat: no-repeat; animation: st 0.6s steps(6) infinite; pointer-events: none; }
  @keyframes st { from { background-position-x: 0; } to { background-position-x: calc(-1 * var(--sw)); } }
  .edge.hit.iced .hero { filter: saturate(0.6) brightness(1.1); }
  /* 🔧 화면 고침 2 (2026-11-13): 3줄 카드가 ‹ 뒤로를 덮음 → 한 줄 칩(높이 48 · 폭 절반 안) · 위 막대(z 5) 아래 자리 · 뒤로가 늘 위 */
  .holy-btn { position: absolute; z-index: 4; left: var(--s3); top: calc(var(--bar-top) + var(--s1)); display: flex; align-items: center; gap: 6px; max-width: calc(50% - var(--s4)); height: 40px; padding: 0 12px; border-radius: 20px; border: 2px solid #ffd25a; background: rgba(12, 20, 36, 0.85); color: #fff6c8; font: 700 14px var(--font); white-space: nowrap; box-shadow: 0 3px 0 #000; }
  .holy-btn::after { content: ''; position: absolute; inset: -4px 0; } /* 누르는 칸 48 */
  .holy-btn small { font-size: 13px; font-weight: 500; opacity: 0.8; padding-left: 6px; border-left: 1px solid rgba(255, 246, 200, 0.4); } .holy-btn.on { background: linear-gradient(135deg, #3a2a00, #6b4a00); box-shadow: 0 0 14px rgba(255, 210, 90, 0.8); }
  .stone-chip { position: absolute; z-index: 3; left: 50%; transform: translateX(-50%); top: 252px; padding: 3px 10px; border-radius: 12px; background: rgba(40, 40, 46, 0.9); border: 1px solid #c9c9d6; color: #fff; font: 700 13px var(--font); white-space: nowrap; }
  .mon.stoned { filter: grayscale(1) brightness(0.85) contrast(1.1) !important; }
  .icew { position: absolute; z-index: 2; left: 0; top: 140px; display: block; }
  .edge.rage { box-shadow: inset 0 0 48px rgba(229, 72, 77, 0.75); }
  .edge.rage .mon { filter: drop-shadow(0 0 6px rgba(229, 72, 77, 0.9)); }
  @media (prefers-reduced-motion: reduce) { .orb, .efx { display: none; } .status { animation: none; } }
  .hb { position: absolute; z-index: 1; left: 0; top: 140px; display: block; }
  .hb .hero { top: 0; }
  .hero { transition: transform 0.12s ease-out; position: absolute; z-index: 1; left: 0; top: 140px; display: block; image-rendering: pixelated; background-repeat: no-repeat; }
</style>
