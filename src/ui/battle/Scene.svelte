<script lang="ts">
  import { ANIM, artUrl, dungeonOf, ELEM_FX, HERO, type HPose, poseCol, runeAt, type MonPose, heroGeo, heroHead, heroNudge, heroUrl, spriteOf, STATUS, IDLE8_HD, idle8HdOf, idle8HdReady } from '../manifest';
  import { heroOf } from '../../model/hero';
  import { savedLook } from '../../store/me.svelte';
  import { fx } from './fx.svelte';
  import IceBlock from './IceBlock.svelte';
  import ModeSwitch from '../ModeSwitch.svelte';
  import { atkQ, guardQ } from './fx.svelte';
  import { guard } from '../fx/aura';
  import { attack, canUlt, preload as atkPreload, type Pose } from '../fx/attack';
  import { monBody } from '../manifest';
  import { aura as auraAct } from '../fx/aura';
  import { untrack } from 'svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { queueHits, type Mate, type MateHit } from '../board/mates';
  // 🎬 장면 띠 (②B · 2-1절): 폰 맨 위부터 양끝까지 · 높이 280 · 아래 56px 페이드
  //   위 = ‹ 뒤로 + 💎 (흰 글씨 + 그림자 · 검은 띠 없음) · 남은 시간 칩 = 마지막 5분부터
  //   몬스터 체력 = 오른쪽 위 · 상태 칩 = 왼쪽 위(이 몬스터에서만 켜지는 효과) · 용사 = 왼쪽 바닥 · 몬스터 = 오른쪽
  //   정찰 = 몬스터 그림자 · 소레이드 = 졸개 줄(지금 칠 졸개 테두리) + 대장
  type Chip = { text: string; on?: boolean };
  const { explore = '', noMon = false, gauge = null, theme, sprite, hp = null, hpLabel: hpL = '', shadow = false, down = false, chips = [], minions = null, gem = 0, timeLeftMs = null, backHref = '?', pose = 'idle', hit = false, hitTag = '', note = '', onconcept, elem = '', atkId = '', rage = false, hitKey = 0, ice = false, iceEnd = 'melt', holy = '', onholy, stoneSec = 0, stoneHoly = false, slump = false, healN = 0, lift = false, mates = [], mateFeed = [] }:
    { /** 🔥 #67 탐사대 한 줄 (정찰 · 내가 탐사대일 때만) */ explore?: string; /** 📣 도입 · 개념 = 몬스터 없이 배경 + 내 용사만 (📜 2026-11-15) */ noMon?: boolean; /** ⏱ 공격 게이지 (11/17 #3 · battle/gauge.ts = TV 와 같은 함수) */ gauge?: import('./gauge').GaugeView | null; theme?: string; sprite: string; hp?: { left: number; max: number } | null; hpLabel?: string; shadow?: boolean; down?: boolean; chips?: Chip[];
      minions?: { n: number; stage: number; downs: number[] } | null; gem?: number; timeLeftMs?: number | null; backHref?: string; pose?: 'idle' | 'attack' | 'miss' | 'heal' | 'healed' | 'win'; hit?: boolean; hitTag?: string; note?: string; onconcept?: () => void; elem?: string; /** 💥 몬스터 공격 id (🌀 혼란 = 소용돌이 그림 대신 머리 위 도는 별) */ atkId?: string; rage?: boolean; hitKey?: number; ice?: boolean; iceEnd?: 'shatter' | 'melt'; holy?: '' | 'can' | 'on'; onholy?: () => void; stoneSec?: number; stoneHoly?: boolean; /** 😞 ❤ 0 잠김 = 쓰러짐 줄 */ slump?: boolean; /** 💚 받은 힐 + 풀어주기 수 (늘면 1.6초 힐 받음 줄) */ healN?: number;
      /** 📋 게시판 = 장면 낮게 · 용사 · 몬스터 위로 (📜 2026-11-14 「너무 아래에 있음」) */ lift?: boolean; /** 👥 게시판 팀 동료 (없으면 수업 그대로) */ mates?: Mate[]; /** 👥 동료 공격 사건 (k 순서 · 늘기만 함) */ mateFeed?: MateHit[] } = $props();
  // 📋 lift (📜 2026-11-14 머리 🔨 게시판 동료): 장면 높이 −56 · 용사 −68 · 몬스터 −44 · 체력 −12 → SE(375 × 667)에서 답 단추가 스크롤 없이 · 동료가 있으면 내 용사 = 앞 오른쪽(+120)
  const LH = $derived(lift ? 56 : 0), HY = $derived(lift ? 68 : 0), MY = $derived(lift ? 44 : 0), MH = $derived(lift ? 12 : 0), HX = $derived(lift && mates.length ? 120 : 0);
  // 👥 동료 자리 (칸 120 × 96 = 1.5배 · 몸 폭 ≈ 52): 0 = 내 옆 · 1 = 맨 왼쪽 · 2 = 내 용사 뒤 · 서로 안 겹침 · 머리 = 팀 줄(위 왼쪽 52~92) 아래 · 이름 폭 64 안
  const MS = 1.5, SLOT: [number, number][] = [[40, 100], [-26, 88], [106, 86]];

  // 🧊 얼음(2026-11-13): 용사를 덮는 얼음 덩어리 · 톡마다 금 · 4번 = 깨져 흩어짐 · 시간 끝 = 녹음 (0.6초 뒤 사라짐)
  let iceMode = $state<'off' | 'on' | 'shatter' | 'melt'>('off'), iceTaps = $state(0);
  $effect(() => { if (ice) { iceMode = 'on'; iceTaps = Math.max(0, Math.min(4, 4 - fx.ice)); } else if (iceMode === 'on') { iceMode = iceEnd; if (iceEnd === 'shatter') iceTaps = 4; setTimeout(() => (iceMode = 'off'), 650); } });
  // 💫 #161 속성: 몬스터 → 용사 = 빛 구슬(0.25초) → 용사 자리 속성 이펙트 띠(정식 pfx) · 용사 머리 위 상태 그림(정식 status · 맞는 동안) · 분노 = 장면 붉게
  const efx = $derived(atkId === 'wind' ? ELEM_FX.gale : elem && atkId !== 'confuse' ? ELEM_FX[elem] : null); // 🌀 혼란 = 차원문(소용돌이) 그림 뺌 (📜 2026-11-13 밤 「혼란한 느낌 아님」)
  const srow = $derived(Math.max(0, STATUS.kinds.indexOf(elem as (typeof STATUS.kinds)[number])));
  // 💥 hit = 몬스터 공격(#151): 장면 띠 안에서만 — 빨간 번쩍 0.15초 · 「💥 몬스터 공격!」 꼬리표 · 용사 붉게 (문제 카드는 움직이지 않음)
  //   note = 장면 안 알림 꼬리표(쓰러짐 · 승리) — 문제 위 알림 띠 대신
  // ⚔ 정식 DS.Attack.play (🔨 용사 fx · 2026-11-13): 장면 = .edge · heroBox = .hb · monBox = .mon(보이는 몸통 data-bb) · 자세 = 정식 anims 줄(idle 0 · walk 1 · attack 2 · win 4 · think 10)
  let edge = $state<HTMLDivElement | null>(null), heroBox = $state<HTMLSpanElement | null>(null), monEl = $state<HTMLElement | null>(null), apose = $state<Pose | ''>('');
  // 🎞 용사 모션 (📜 2026-11-14 머리 🔨 모션 점검 · 정식 student.js pose2 순서): 공격 연출 줄 → 맞음 0.4초 → 헐떡(공격 받는 동안) → 잠깐 모션(틀림 = 맞음 줄 · 힐 시전 · 힐 받음 · 기쁨)
  //   → 힐 받음 1.6초 → ❤0 잠김 = 쓰러짐(한 번) → 처치 · 승리 = 기쁨 → 정찰 = 생각 → 대기 · 줄마다 칸을 돌림(정식 anims 칸 수 · 초)
  let hitPh = $state<'' | 'hit' | 'pant'>(''), hitT: ReturnType<typeof setTimeout> | undefined;
  $effect(() => { const h = hit; untrack(() => { clearTimeout(hitT); if (h) { hitPh = 'hit'; hitT = setTimeout(() => (hitPh = 'pant'), 400); } else hitPh = ''; }); });
  let lastHeal = -1, healing = $state(false), healT: ReturnType<typeof setTimeout> | undefined;
  $effect(() => { const n = healN; untrack(() => { if (lastHeal >= 0 && n > lastHeal) { healing = true; clearTimeout(healT); healT = setTimeout(() => (healing = false), 1600); } lastHeal = n; }); });
  let flash = $state<HPose | ''>(''), flashT: ReturnType<typeof setTimeout> | undefined;
  const after = (p: HPose, ms: number) => { flash = p; clearTimeout(flashT); flashT = setTimeout(() => (flash = ''), ms); }; // 공격 연출 끝 = 틀림 → 맞음 줄 · 다 맞힘 → 기쁨 줄
  const hpose = $derived<HPose>(apose ? apose : hitPh ? hitPh : flash ? flash : pose === 'miss' ? 'hit' : pose !== 'idle' ? pose : healing ? 'healed' : slump ? 'fall' : down ? 'win' : shadow ? 'think' : 'idle');
  // 🫁 #63 대기 = 세밀화 숨쉬기 8장 띠 (받은 뒤에만 · 못 받으면 v5 시트 4칸)
  const hd8u = $derived(hpose === 'idle' ? idle8HdOf(savedLook().hero) : null);
  let hd8ok = $state('');
  $effect(() => { const u = hd8u; if (!u) return; void idle8HdReady(u).then((ok) => { if (ok && hd8u === u) hd8ok = u; }); });
  const use8 = $derived(hd8u && hd8ok === hd8u ? hd8u : null);
  const anim = $derived<[number, number, number, boolean?]>(use8 ? [0, IDLE8_HD.frames, IDLE8_HD.ms / 1000] : ANIM[hpose]);
  // 🐞 2026-11-15 「개념 단계 뒤 다음 몬스터에서 필살기 · 공격이 다시 재생」(학생 폰 · TV 시연 폰 · 교사 시연): 장면이 새로 열리면 그 전 공격(atkQ 에 남은 마지막 값)은 이미 본 것
  //   + 3초 넘은 사건은 틀지 않음 (몬스터 · 단계가 바뀐 뒤 늦게 닿은 것)
  let lastAtk = atkQ.v?.id ?? 0, lastGuard = guardQ.v;
  // 🛡 홀리 방패 막기 = 내 용사 날개 · 방패 (정식 Aura.guard · 장면 높이 안)
  $effect(() => { const g = guardQ.v; if (g === lastGuard || !heroBox || !edge) return; lastGuard = g; untrack(() => guard(heroBox, undefined, edge!.getBoundingClientRect().height, monEl)); });
  $effect(() => {
    const a = atkQ.v; if (!a || a.id === lastAtk || !edge) return; lastAtk = a.id; if (a.at && Date.now() - a.at > 3000) return; const gp = globalThis as { __atkPlays?: number }; gp.__atkPlays = (gp.__atkPlays || 0) + 1;
    untrack(() => { const L = savedLook(); atkPreload(L.hero, L.fx); void attack(edge, { heroBox, monBox: monEl, hero: L.hero, fx: L.fx, miss: a.miss, hits: a.hits, ultimate: !!a.ult && canUlt(L.fx, L.hero), finish: a.finish, noDmg: a.noDmg, prac: a.prac, rest: a.win ? 'win' : 'idle', pose: (p) => (apose = p === 'idle' ? '' : p), onHit: a.miss ? undefined : () => monFlash('hit', 360) }).finally(() => { apose = ''; if (a.miss) after('hit', 600); else if (a.win) after('win', 1400); }); });
  });
  // 👥 동료 공격 (📜 2026-11-14): 정식 attack(동료 칸 · 동료 스킬 · TV 와 같은 사건) · 줄 세워 하나씩 · 소리 작게(0.45)
  //   맞음 = 돌진 · 이펙트 · −1 / 틀림 = 튕겨냄 「팅!」 · 정답 · 오답 글자는 없음
  const mbox: Record<string, HTMLElement | null> = {};
  let matePose = $state<Record<string, HPose>>({}), mact = $state(''), mq: MateHit[] = [], mlast = untrack(() => Math.max(0, ...(mateFeed || []).map((h) => h.k))), mbusy = false; // 🐞 새로 열린 장면 = 그 전 동료 공격 안 틂
  $effect(() => { const f = mateFeed; untrack(() => { const add = f.filter((h) => h.k > mlast); if (!add.length) return; mlast = Math.max(...add.map((h) => h.k)); mq = queueHits(mq, add); void mpump(); }); });
  async function mpump() { if (mbusy) return; mbusy = true; try { while (mq.length) await mplay(mq.shift()!); } finally { mbusy = false; } }
  const mset = (u: string, p: HPose) => (matePose = { ...matePose, [u]: p });
  async function mplay(h: MateHit) {
    const m = mates.find((x) => x.uid === h.u), el = mbox[h.u]; if (!m || !el || !edge || !monEl || !el.isConnected) return;
    const f = m.fx || 'flame', miss = h.kind === 'miss'; atkPreload(m.hero, f); mact = m.uid;
    try { await attack(edge, { heroBox: el, monBox: monEl, hero: m.hero, fx: f, miss, noDmg: h.kind === 'practice', hits: Math.max(1, h.dmg), rest: 'idle', vol: 0.45, pose: (p) => mset(m.uid, p), onHit: miss ? undefined : () => monFlash('hit', 360) }); } catch { /* 장면이 닫힘 */ }
    mact = '';
    if (miss) { mset(m.uid, 'hit'); await new Promise((r) => setTimeout(r, 400)); mset(m.uid, 'idle'); }
    else if (h.perfect) { mset(m.uid, 'win'); setTimeout(() => mset(m.uid, 'idle'), 1200); }
  }
  const sp = $derived(spriteOf(sprite));
  // 🎲 몬스터 자세 (5칸 시트): 몬스터 공격 = 공격 칸 0.6초 · 용사에게 맞음 = 맞음 칸(움찔) · 대기 = A ↔ B 숨쉬기 · 쓰러짐
  let mflash = $state<'' | 'hit' | 'attack'>(''), mT: ReturnType<typeof setTimeout> | undefined;
  const monFlash = (p: 'hit' | 'attack', ms: number) => { mflash = p; clearTimeout(mT); mT = setTimeout(() => (mflash = ''), ms); };
  let lastHitKey = 0;
  $effect(() => { const on = hit, k = hitKey; untrack(() => { if (on && k !== lastHitKey) { lastHitKey = k; monFlash('attack', 600); } }); });
  const mpose = $derived<MonPose>(down ? 'down' : mflash || 'idle');
  const mrune = $derived(sp.rune && !shadow ? runeAt(sp.sheet, sp.row, poseCol(sp.sheet, mpose)) : null);
  const monBB = $derived(monBody(sp.sheet.src, sp.row, sp.sheet.poses[down ? 'down' : 'idle'], sp.sheet.cell));
  const breath = $derived(mpose === 'idle' && sp.sheet.poses.idleB != null && !shadow && !stoneSec);
  const hpLabel = $derived(hpL || sp.sheet.names[sp.row] || '몬스터');
  const MON = 128; // 몬스터 칸 256 → 정확히 ½
  const HS = 2;
  const hg = $derived(heroGeo(savedLook().hero)); // 새 화풍(세밀 시트) = 같은 자리에서 위 · 옆으로 넘쳐 그림 // 용사 칸 80 × 64 → 정수 2배
  const mm = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const monBg = (size: number, pose: MonPose) => { const f = [sp.hue ? `hue-rotate(${sp.hue}deg)` : '', shadow ? 'brightness(0)' : '', sp.elite && !shadow ? 'drop-shadow(0 0 2px #ffd25a) drop-shadow(0 0 6px #e8a81f)' : ''].filter(Boolean).join(' '); return `background-image:url(${sp.url});background-size:${sp.sheet.cols * size}px ${sp.sheet.rows * size}px;background-position:-${poseCol(sp.sheet, pose) * size}px -${sp.row * size}px;width:${size}px;height:${size}px;--s:${size}px;--y:-${sp.row * size}px;${f ? `filter:${f};` : ''}${shadow && !sp.hue ? 'opacity:.85;' : ''}`; };
  // 👑 +10 후광 = 머리 뒤 중앙: 이 장면은 그림 상자(.art)가 heroNudge 만큼 밀려 있음 → 머리 자리에서 밀림을 뺌(가로) · 더함(높이)
  const bodyIn = (id: number): [number, number] => { const n = heroNudge(id, 0); return [-n.dx, n.dy]; };
  const headIn = (id: number): [number, number] => { const h = heroHead(id), n = heroNudge(id, 0); return [h[0] - n.dx, h[1] + n.dy]; };
</script>

<div class="edge" data-scene bind:this={edge} class:hit class:rage class:iced={ice} class:lift style:background-image="url({dungeonOf(theme)})" style:--lh={lift ? `${LH}px` : undefined} style:--hy={lift ? `${HY}px` : undefined} style:--my={lift ? `${MY}px` : undefined} style:--mh={lift ? `${MH}px` : undefined} style:--hx={HX ? `${HX}px` : undefined}>
  <div class="top">
    <a class="back" href={backHref} aria-label="뒤로">‹</a>
    {#if onconcept}<button type="button" class="pill cpt" onclick={onconcept}>📘 이 문제의 개념</button>{/if}
    <span class="sp"></span>
    <ModeSwitch /><!-- 📝 게임 | 제출 (2026-11-14) -->
    {#if timeLeftMs != null && timeLeftMs <= 5 * 60000}<span class="pill time" aria-label="남은 시간">⏱ {mm(Math.max(0, timeLeftMs))}</span>{/if}
    <span class="pill" aria-label="마정석 {gem}개"><i class="wic" aria-hidden="true">💎</i>{gem}</span>
  </div>
  {#if holy && onholy}<button type="button" class="holy-btn" class:on={holy === 'on'} onclick={onholy} aria-pressed={holy === 'on'}>🛡 <b>{holy === 'on' ? '방패 준비됨' : '홀리 방패'}</b><small>{holy === 'on' ? '끄기' : '켜기'}</small></button>{/if}
  {#if stoneSec > 0}<span class="stone-chip" role="status">🗿 {stoneHoly ? '홀리 방패' : '진필살기'} 석화 {stoneSec}초 · 지금 맞히면 💎</span>{/if}
  {#if chips.length}<div class="buffs">{#each chips as c, k (k)}<span class="buff" class:on={c.on}>{c.text}</span>{/each}</div>{/if}
  {#if hp && !shadow && !noMon}
    <div class="mhp"><span>{hpLabel} · 체력 {hp.left} / {hp.max}</span><div class="b"><i style:width="{hp.max ? (hp.left / hp.max) * 100 : 0}%"></i></div>{#if gauge}<div class="ag" class:hot={gauge.hot} class:blue={gauge.blue} data-k="atk-gauge"><i style:width="{Math.round(gauge.p * 100)}%"></i><span>{gauge.txt}</span></div>{/if}</div>
  {/if}
  {#if minions && !noMon}
    <div class="minions">
      {#each Array.from({ length: minions.n }) as _, k (k)}
        <i class="mini" class:dead={k < minions.stage || minions.downs.includes(k)} class:now={k === minions.stage} style={monBg(40, k < minions.stage ? 'down' : 'idle')} aria-label="졸개 {k + 1}"></i>
      {/each}
    </div>
  {/if}
  {#if shadow && !noMon}<i class="dk" aria-hidden="true"></i>{/if}<!-- 🌑 #67 정찰 암막 -->
  {#if !noMon}<i class="mon art monster" class:sc={shadow} class:stoned={stoneSec > 0} class:breath class:elite={sp.elite} bind:this={monEl} data-bb={monBB} data-pose={mpose} class:minboss={!!minions} style={monBg(minions ? 104 : MON, mpose)} aria-label={sp.sheet.names[sp.row]}>{#if mrune}<b class="rune" style:left="{mrune[0] * 100}%" style:top="{mrune[1] * 100}%" style:font-size="{mrune[2] * (minions ? 104 : MON) * 1.35}px">{sp.rune}</b>{/if}</i>{/if}
  {#if shadow && !noMon}{@const bb = (monBB || '0.2,0.2,0.8,0.95').split(',').map(Number)}{@const S0 = minions ? 104 : MON}{@const bw = (bb[2]! - bb[0]!) * S0}{@const bh = (bb[3]! - bb[1]!) * S0}{@const cx = ((bb[0]! + bb[2]!) / 2) * S0}{@const ey = (bb[1]! + (bb[3]! - bb[1]!) * 0.28) * S0}
    <span class="mbox" class:minboss={!!minions} style:width="{S0}px" style:height="{S0}px" aria-hidden="true">
      {#if explore}<i class="hole" style="{monBg(S0, mpose).replace('brightness(0)', '')};--hx:{cx}px;--hy:{(bb[1]! + (bb[3]! - bb[1]!) * 0.3) * S0}px;--hr:{Math.sqrt((0.18 * bw * bh) / Math.PI)}px"></i>{/if}<!-- 🔥 내 횃불 빛 구멍 하나 -->
      <i class="seye" style:left="{cx - bw * 0.075}px" style:top="{ey}px" style:--er="{Math.max(3, bw * 0.05)}px"></i><i class="seye" style:left="{cx + bw * 0.075}px" style:top="{ey}px" style:--er="{Math.max(3, bw * 0.05)}px"></i>
    </span>
  {/if}
  {#if explore}<p class="explore" data-k="explore-line">{explore}</p>{/if}
  {#if hit}<span class="tag hitTag" role="status">{hitTag || '💥 몬스터 공격!'}</span>{:else if note}<span class="tag" role="status">{note}</span>{/if}
  {#if pose === 'miss'}<span class="miss">헛스윙</span>{/if}
  {#if iceMode !== 'off'}
    <span class="icew" style:translate="{(heroNudge(savedLook().hero, 0).dx + hg.dx) * HS}px {(heroNudge(savedLook().hero, 0).dy + hg.dy) * HS}px">
      <IceBlock url={heroUrl()} size="{HERO.cols * hg.w * HS}px {HERO.rows * hg.h * HS}px" pos="-0px -{HERO.idleRow * hg.h * HS}px" w={hg.w * HS} h={hg.h * HS} taps={iceTaps} mode={iceMode === 'on' ? 'on' : iceMode} />
    </span>
  {/if}
  {#if hit && (efx || atkId === 'confuse')}
    {#key hitKey}
      <i class="orb e-{elem}" aria-hidden="true"></i>
      {#if !ice && efx}<i class="efx" aria-hidden="true" style:width="{efx.w}px" style:height="{efx.h}px" style:left="{80 + HX - efx.w / 2}px" style:top="{204 - HY - efx.h / 2}px" style:background-image="url({artUrl(efx.src)})" style:background-size="{efx.w * efx.n}px {efx.h}px" style:--n={efx.n} style:--fw="{efx.w * efx.n}px" style:animation-duration="{Math.round((efx.n / efx.fps) * 1000)}ms"></i>{/if}
    {/key}
    {#if atkId === 'confuse'}<span class="dizzy" aria-hidden="true" style:translate="{(heroNudge(savedLook().hero, 0).dx + hg.dx) * HS}px {(heroNudge(savedLook().hero, 0).dy + hg.dy) * HS}px"><i>★</i><i>★</i><i>★</i><i>✦</i></span>{/if}
    {#if !ice}<i class="status" data-elem={elem} aria-label="상태 {elem}" style:translate="{(heroNudge(savedLook().hero, 0).dx + hg.dx) * HS}px {(heroNudge(savedLook().hero, 0).dy + hg.dy) * HS}px" style:background-image="url({artUrl(STATUS.src)})" style:background-size="{STATUS.cols * STATUS.w * HS}px {STATUS.kinds.length * STATUS.h * HS}px" style:background-position-y="-{srow * STATUS.h * HS}px" style:width="{STATUS.w * HS}px" style:height="{STATUS.h * HS}px" style:--sw="{STATUS.cols * STATUS.w * HS}px"></i>{/if}
  {/if}
  {#each mates as m, k (m.uid)}{@const sl = SLOT[k]}{#if sl}
    <!-- 👥 동료 = 정식 heroBox 꼴(.mate 안 .art) · 내 용사 뒤 · 이름 = 팀 줄과 같은 이름 -->
    <span class="mate" class:on={mact === m.uid} data-u={m.uid} bind:this={mbox[m.uid]} style:left="{sl[0]}px" style:top="{sl[1]}px" style:width="{HERO.w * MS}px" style:height="{HERO.h * MS}px"><HeroSprite id={m.hero} scale={MS} aura={m.enh} pose={matePose[m.uid] ?? 'idle'} label="동료 {m.name}" /></span>
    <span class="mname" style:left="{sl[0] + (HERO.w * MS) / 2}px" style:top="{sl[1] + HERO.h * MS - 6}px">{m.name}</span>
  {/if}{/each}
  <!-- ⚔ 용사 = .hb(돌진 · 정식 heroBox) 안 .art(그림) · 공격 중엔 정식 자세(walk · attack) · 끝나면 prop 자세 -->
  <span class="hb" bind:this={heroBox} style:width="{hg.w * HS}px" style:height="{hg.h * HS}px"><i class="hero art" class:frozen={iceMode === 'on'} use:auraAct={{ lv: savedLook().enh, head: headIn(savedLook().hero), body: bodyIn(savedLook().hero), hero: savedLook().hero }} class:lunge={!apose && pose === 'attack'} class:whiff={!apose && pose === 'miss'} style:translate="{(heroNudge(savedLook().hero, 0).dx + hg.dx) * HS}px {(heroNudge(savedLook().hero, 0).dy + hg.dy) * HS}px" style:background-image="url({use8 ?? heroUrl()})" style:background-size={use8 ? `${IDLE8_HD.frames * hg.w * HS}px ${hg.h * HS}px` : `${HERO.cols * hg.w * HS}px ${HERO.rows * hg.h * HS}px`}
    data-pose={hpose} class:once={!!anim[3]} class:still={anim[1] < 2 || iceMode === 'on'} style:--fw="{hg.w * HS}px" style:--n={anim[1]} style:--dur="{anim[2]}s" style:--end="-{anim[1] * hg.w * HS}px" style:--end1="-{(anim[1] - 1) * hg.w * HS}px" style:--n1={Math.max(1, anim[1] - 1)}
    style:background-position-y="-{anim[0] * hg.h * HS}px" style:width="{hg.w * HS}px" style:height="{hg.h * HS}px" aria-label="내 용사 {heroOf(savedLook().hero).job}"></i>{#if explore}<span class="torch" aria-hidden="true"><i class="tg"></i><b>🔥</b></span>{/if}</span>
</div>

<style>
  .edge { position: relative; height: calc(280px - var(--lh, 0px)); background-size: cover; background-position: center 62%; image-rendering: pixelated; overflow: hidden; }
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
  .mhp { position: absolute; z-index: 2; top: calc(62px - var(--mh, 0px)); right: var(--s3); width: 170px; display: flex; flex-direction: column; gap: var(--s1); color: #fff; font-size: var(--fs-small); font-weight: 700; text-shadow: 0 1px 0 #000; text-align: right; }
  .mhp .b { height: 10px; border-radius: 5px; background: rgba(0, 0, 0, 0.55); border: 1px solid rgba(255, 255, 255, 0.25); }
  .mhp .b i { display: block; height: 8px; border-radius: 4px; background: var(--hp); transition: width 0.4s; }
  /* ⏱ 공격 게이지 (옛 정식 .atk-gauge + 남은 초) · 80% 빨강 깜빡 · 묶임 · 멈춤 파랑 */
  .mhp .ag { position: relative; height: 16px; border-radius: 4px; background: rgba(21, 18, 15, 0.85); border: 1px solid #6a4a1c; overflow: hidden; }
  .mhp .ag i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #ffd34a, #ff8a2a); }
  .mhp .ag span { position: relative; display: block; text-align: center; font-size: 12px; line-height: 14px; font-variant-numeric: tabular-nums; }
  .mhp .ag.hot i { background: linear-gradient(90deg, #ff8a2a, #ff2a3a); animation: agHot 0.3s steps(2) infinite; }
  .mhp .ag.blue { border-color: #5ab0ff; box-shadow: 0 0 6px #5ab0ff88; } .mhp .ag.blue i { background: linear-gradient(90deg, #5ab0ff, #8fd0ff); animation: none; }
  @keyframes agHot { 50% { filter: brightness(1.6); } }
  .mon { position: absolute; z-index: 1; right: 24px; top: calc(108px - var(--my, 0px)); display: block; image-rendering: pixelated; background-repeat: no-repeat; }
  /* ⚔ 소레이드 (#160 · 정식 소레이드 1단계 배치): 대장 = 오른쪽 뒤(조금 위) · 졸개 셋 = 대장 앞 한 줄(오른쪽 정렬 · 간격 8) · 용사 = 왼쪽 · 용사 칸(160)과 겹침 0 */
  .mon.minboss { right: 8px; top: calc(90px - var(--my, 0px)); }
  /* 🎲 5칸 시트: 대기 숨쉬기(A ↔ B 0.7초) · 대장 1.3배 · 몸 룬 기호 */
  .mon.breath { animation: mbreath 1.4s steps(1) infinite; }
  @keyframes mbreath { 0% { background-position: 0 var(--y); } 50% { background-position: calc(-1 * var(--s)) var(--y); } }
  .mon.elite { transform: scale(1.3); transform-origin: 50% 100%; }
  .mon .rune { position: absolute; transform: translate(-50%, -52%); color: #fff; font-style: normal; font-family: 'DejaVu Sans', system-ui, sans-serif; font-weight: 800; line-height: 1; text-shadow: 0 0 2px #0b3a52, 0 0 4px #0b3a52, 0 0 6px rgba(80, 230, 255, 0.8); pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .mon.breath { animation: none; } }
  .minions { position: absolute; z-index: 2; right: 16px; top: calc(194px - var(--my, 0px)); display: flex; gap: var(--s2); }
  .mini { display: block; image-rendering: pixelated; background-repeat: no-repeat; border-radius: var(--r-sm); }
  .mini { transition: transform 0.2s ease-out, opacity 0.2s; }
  .mini.dead { opacity: 0.3; transform: translateY(6px); }
  .mini.now { outline: 3px solid var(--accent); outline-offset: 2px; }
  .hero.lunge { transform: translateX(28px); }
  .hero.whiff { transform: translateX(14px); opacity: 0.75; }
  .miss { position: absolute; z-index: 2; left: calc(150px + var(--hx, 0px)); top: calc(150px - var(--hy, 0px)); color: #fff; font-weight: 700; font-size: var(--fs-small); text-shadow: 0 1px 2px #000; }
  .edge.hit::before { content: ''; position: absolute; inset: 0; z-index: 2; background: var(--bad); opacity: 0; animation: hitf 0.15s ease-out; pointer-events: none; }
  @keyframes hitf { from { opacity: 0.55; } to { opacity: 0; } }
  .edge.hit .hero { filter: sepia(1) saturate(6) hue-rotate(-40deg) brightness(0.9); }
  .tag { position: absolute; z-index: 3; left: 50%; transform: translateX(-50%); top: calc(216px - var(--lh, 0px)); height: 32px; padding: 0 12px; border-radius: 16px; background: rgba(8, 9, 12, 0.72); border: 1px solid var(--accent); color: #fff; font-size: var(--fs-small); font-weight: 700; display: flex; align-items: center; white-space: nowrap; }
  .tag.hitTag { border-color: var(--bad); background: rgba(120, 20, 20, 0.85); }
  /* 💫 #161 속성 이펙트 · 상태 그림 · 분노 */
  .orb { position: absolute; z-index: 2; left: 300px; top: calc(160px - var(--hy, 0px)); width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle, #fff, var(--oc, #ff6b6b) 55%, transparent 70%); animation: orb 0.25s ease-in forwards; pointer-events: none; }
  @keyframes orb { to { transform: translate(calc(-230px + var(--hx, 0px)), 36px); opacity: 0.2; } }
  .orb.e-freeze { --oc: #7fd6ff; } .orb.e-burn { --oc: #ff8a1c; } .orb.e-poison { --oc: #b06cff; } .orb.e-shock { --oc: #ffe14a; } .orb.e-bind { --oc: #c9c9d6; } .orb.e-confuse { --oc: #ff7ad9; } .orb.e-sleep { --oc: #9fb2ff; }
  .efx { position: absolute; z-index: 2; display: block; image-rendering: pixelated; background-repeat: no-repeat; opacity: 0; animation-name: efx; animation-timing-function: steps(var(--n)); animation-fill-mode: forwards; animation-delay: 0.22s; pointer-events: none; }
  @keyframes efx { 0% { opacity: 1; background-position-x: 0; } 99% { opacity: 1; } 100% { opacity: 0; background-position-x: calc(-1 * var(--fw)); } }
  /* 🌀 혼란 = 머리 위로 별 세 개 · 반짝이 하나가 빙글빙글 (타원 궤도 · 앞뒤 크기 차) */
  .dizzy { position: absolute; z-index: 3; left: calc(36px + var(--hx, 0px)); top: calc(146px - var(--hy, 0px)); width: 92px; height: 28px; pointer-events: none; }
  .dizzy i { position: absolute; left: 50%; top: 50%; font-style: normal; font-size: 18px; color: #ffe066; text-shadow: 0 0 6px #ff7ad9, 0 2px 0 #000; animation: orbit 0.9s linear infinite; }
  .dizzy i:nth-child(2) { animation-delay: -0.3s; color: #fff3a8; } .dizzy i:nth-child(3) { animation-delay: -0.6s; } .dizzy i:nth-child(4) { animation-delay: -0.45s; color: #ff9be6; font-size: 14px; }
  @keyframes orbit { 0% { transform: translate(-50%, -50%) translate(-38px, 0) scale(0.8); z-index: 1; } 25% { transform: translate(-50%, -50%) translate(0, 10px) scale(1.15); } 50% { transform: translate(-50%, -50%) translate(38px, 0) scale(0.8); } 75% { transform: translate(-50%, -50%) translate(0, -10px) scale(0.6); opacity: 0.6; } 100% { transform: translate(-50%, -50%) translate(-38px, 0) scale(0.8); } }
  .status { position: absolute; z-index: 2; left: var(--hx, 0px); top: calc(108px - var(--hy, 0px)); display: block; image-rendering: pixelated; background-repeat: no-repeat; animation: st 0.6s steps(6) infinite; pointer-events: none; }
  @keyframes st { from { background-position-x: 0; } to { background-position-x: calc(-1 * var(--sw)); } }
  .edge.hit.iced .hero { filter: saturate(0.6) brightness(1.1); }
  /* 🧊 용사 얼음 (📜 2026-11-14) = 그림이 푸르게 물듦 (얼굴 · 옷은 그대로 보임) · 녹으면 0.5초에 원래 색 */
  .hero { transition: filter 0.5s ease-out; } .hero.frozen, .edge.hit.iced .hero.frozen { filter: grayscale(0.2) sepia(1) hue-rotate(170deg) saturate(3.2) brightness(0.95) contrast(1.08); transition: filter 0.15s ease-out; }
  /* 🔧 화면 고침 2 (2026-11-13): 3줄 카드가 ‹ 뒤로를 덮음 → 한 줄 칩(높이 48 · 폭 절반 안) · 위 막대(z 5) 아래 자리 · 뒤로가 늘 위 */
  .holy-btn { position: absolute; z-index: 4; left: var(--s3); top: calc(var(--bar-top) + var(--s1)); display: flex; align-items: center; gap: 6px; max-width: calc(50% - var(--s4)); height: 40px; padding: 0 12px; border-radius: 20px; border: 2px solid #ffd25a; background: rgba(12, 20, 36, 0.85); color: #fff6c8; font: 700 14px var(--font); white-space: nowrap; box-shadow: 0 3px 0 #000; }
  .holy-btn::after { content: ''; position: absolute; inset: -4px 0; } /* 누르는 칸 48 */
  .holy-btn small { font-size: 13px; font-weight: 500; opacity: 0.8; padding-left: 6px; border-left: 1px solid rgba(255, 246, 200, 0.4); } .holy-btn.on { background: linear-gradient(135deg, #3a2a00, #6b4a00); box-shadow: 0 0 14px rgba(255, 210, 90, 0.8); }
  .stone-chip { position: absolute; z-index: 3; left: 50%; transform: translateX(-50%); top: calc(252px - var(--lh, 0px)); padding: 3px 10px; border-radius: 12px; background: rgba(40, 40, 46, 0.9); border: 1px solid #c9c9d6; color: #fff; font: 700 13px var(--font); white-space: nowrap; }
  .mon.stoned { filter: grayscale(1) brightness(0.85) contrast(1.1) !important; }
  .icew { position: absolute; z-index: 2; left: var(--hx, 0px); top: calc(140px - var(--hy, 0px)); display: block; }
  .edge.rage { box-shadow: inset 0 0 48px rgba(229, 72, 77, 0.75); }
  .edge.rage .mon { filter: drop-shadow(0 0 6px rgba(229, 72, 77, 0.9)); }
  @media (prefers-reduced-motion: reduce) { .orb, .efx { display: none; } .status, .dizzy i { animation: none; } }
  .hb { position: absolute; z-index: 1; left: var(--hx, 0px); top: calc(140px - var(--hy, 0px)); display: block; }
  /* 👥 동료 (📜 2026-11-14): 내 용사 뒤(z 같음 · 먼저 그림) · 공격 중 = 앞으로 · 이름 = 발밑 작은 알약(페이드 위) */
  .mate { position: absolute; z-index: 1; display: block; pointer-events: none; }
  .mate.on { z-index: 2; }
  .mname { position: absolute; z-index: 3; transform: translateX(-50%); max-width: 64px; padding: 0 5px; border-radius: 8px; background: rgba(8, 9, 12, 0.6); color: #fff; font: 700 10.5px/16px var(--font); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
  .hb .hero { top: 0; }
  .hb .hero[data-pose='fall'] { top: -44px; transition: top 0.2s ease-out; } /* 😞 누운 그림 = 아래 카드(페이드)에 가리지 않게 22 도트 올림 */
  /* 🎞 줄 돌리기 = 정식 anims (칸 수 · 초) · 한 번만 = 마지막 칸에서 멈춤 · 칸 1 · 얼음 = 멈춤 */
  .hero { background-position-x: 0; animation: hrow var(--dur) steps(var(--n)) infinite; }
  .hero.once { animation: hrow1 var(--dur) steps(var(--n1)) forwards; }
  .hero.still { animation: none; }
  @keyframes hrow { from { background-position-x: 0; } to { background-position-x: var(--end); } }
  @keyframes hrow1 { from { background-position-x: 0; } to { background-position-x: var(--end1); } }
  .hero { transition: transform 0.12s ease-out; position: absolute; z-index: 1; left: 0; top: 140px; display: block; image-rendering: pixelated; background-repeat: no-repeat; }
  /* 🌑 #67 정찰 = 암막 · 실루엣 속 붉은 눈(천천히 + 가끔 두 번 깜박) · 🔥 탐사대 = 내 용사 횃불 + 빛 구멍 하나 */
  .dk { position: absolute; inset: 0; z-index: 1; pointer-events: none; background: radial-gradient(ellipse at 60% 45%, rgba(5, 3, 10, 0.35), rgba(5, 3, 10, 0.82) 75%); animation: dkIn 0.7s ease-out both; }
  @keyframes dkIn { from { opacity: 0; } }
  .mon.art.monster.sc { z-index: 2; }
  .mbox { position: absolute; z-index: 3; right: 24px; top: calc(108px - var(--my, 0px)); pointer-events: none; } .mbox.minboss { right: 8px; top: calc(90px - var(--my, 0px)); }
  .seye { position: absolute; width: var(--er); height: calc(var(--er) * 0.8); margin: calc(var(--er) * -0.4) 0 0 calc(var(--er) * -0.5); border-radius: 50%; background: #ff3030; box-shadow: 0 0 6px 2px #ff2a2a, 0 0 14px 4px #ff2a2a88; animation: seye 5.2s linear infinite; }
  @keyframes seye { 0% { opacity: 0.45; } 30% { opacity: 1; } 60% { opacity: 0.5; } 88% { opacity: 1; } 89% { opacity: 0; } 90.5% { opacity: 1; } 92% { opacity: 0; } 93.5%, 100% { opacity: 0.6; } }
  .hole { position: absolute; inset: 0; z-index: 2; background-repeat: no-repeat; image-rendering: pixelated; clip-path: circle(0 at var(--hx) var(--hy)); animation: hole 7s 1.4s ease-out forwards, holeW 0.9s 8.4s ease-in-out infinite alternate; }
  @keyframes hole { to { clip-path: circle(var(--hr) at var(--hx) var(--hy)); } }
  @keyframes holeW { from { clip-path: circle(var(--hr) at var(--hx) var(--hy)); } to { clip-path: circle(calc(var(--hr) * 1.07) at var(--hx) var(--hy)); } }
  .torch { position: absolute; right: -6px; top: 18%; z-index: 3; pointer-events: none; } .torch b { position: relative; font-size: 22px; display: block; animation: tfl 0.18s steps(2) infinite alternate; }
  .torch .tg { position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 200, 110, 0.55), rgba(255, 140, 50, 0.15) 45%, transparent 70%); mix-blend-mode: screen; animation: tgl 0.9s ease-in-out infinite alternate; }
  @keyframes tfl { to { transform: scale(1, 1.12) translateY(-1px); } } @keyframes tgl { to { transform: scale(1.12); opacity: 0.8; } }
  .explore { position: absolute; z-index: 4; left: 50%; bottom: 10px; transform: translateX(-50%); margin: 0; max-width: calc(100% - 24px); padding: 4px 12px; border-radius: 14px; background: rgba(40, 22, 6, 0.85); border: 1px solid #ffb35a; color: #ffe2b0; font: 700 14px var(--font); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (prefers-reduced-motion: reduce) { .seye, .hole, .torch b, .torch .tg { animation: none; } .hole { clip-path: circle(var(--hr) at var(--hx) var(--hy)); } }
  .wic { font-style: normal; font-size: 15px; line-height: 1; font-family: var(--font); } /* 💎 · 📜 = 우리 아이콘 글꼴 (📜 2026-11-20) */
</style>
