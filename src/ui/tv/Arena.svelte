<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import type { LessonPack, Room, Step } from '../../model/types';
  import { arenaBox, partyLayout } from './arena/layout';
  import { hitsOf, snapOf, xpOf, type Snap } from './arena/events';
  import type { Arena, ArenaState, Hero } from './arena/pixi';
  import Sprite from '../Sprite.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { atkClock, atkTrack, bossHp, monsterHp, isChain } from '../../raid/raid';
  import { attackMs, attackOf, attackStrong } from '../../raid/attacks';
  import { attack, canUlt, preload as atkPreload, preloadFaces, setForce, type Pose } from '../fx/attack';
  import { deco } from '../fx/aura';
  import { ladder } from '../../model/hero';
  import { bossState, plainRecord, holyArmed, stone, BOSS_ID } from '../../raid/raid';
  import { cutin } from '../fx/attack';
  import { place } from '../fx/fx';
  import { guard } from '../fx/aura';
  import { HERO, heroHead, heroUrl, monBody } from '../manifest';
  import { monVis, spriteOf } from '../manifest';
  // ⚔ TV 전투 장면 (#157): PixiJS 캔버스(TV 들어갈 때만 불러옴) · WebGL 이 안 되면(또는 ?dom) 같은 배치의 DOM 장면
  //   공격 사건 = 학생마다 공격 횟수 · 데미지 비교(정식 hall.js attacks) → 0.35초 간격으로 차례로 · 쓰러지면 「몬스터 격파!」 + 머리 위 +EXP
  const { L, R, step, now, ids, nameOf, submitted, lost, split, shadow }:
    { L: LessonPack; R: Room; step: Step | null; now: number; ids: string[]; nameOf: (u: string) => string; submitted: (u: string) => boolean; lost: Set<string>; split: boolean; shadow: boolean } = $props();
  let host: HTMLDivElement;
  let A = $state<Arena | null>(null), mode = $state<'wait' | 'pixi' | 'dom'>('wait');
  let W = $state(0), H = $state(0);
  // 수업이 끝나는 순간 step 이 먼저 비워질 수 있음(장면이 사라지기 직전) → 빈 단계 = 아무것도 그리지 않음
  const boss = $derived(step?.kind === 'boss');
  const hp = $derived.by(() => { void now; const x = boss ? (L.boss ? bossHpOf() : null) : monHpOf(); return x; });
  function bossHpOf() { const b = bossHp(L, R, now); return { left: b.left, max: b.max, down: b.won }; }
  function monHpOf() { if (!step || step.kind !== 'monster' || !L.monsters[step.id]) return null; const h = monsterHp(L, R, step.id, now); return { left: h.left, max: h.max, down: h.left <= 0 }; }
  const sprite = $derived(boss ? (L.boss?.sprite ?? '') : (L.monsters[step?.id ?? '']?.sprite ?? ''));
  const hpLabel = $derived(boss ? `👑 ${L.boss?.title.split(' · ').pop() ?? '보스'}` : `${step?.kind === 'monster' && isChain(L, R, step.id) ? '👑 대장 · ' : ''}${step?.title.split(' · ').pop() ?? ''}`);
  const heroes = $derived<Hero[]>(ids.map((u) => ({ u, hero: R.players?.[u]?.hero ?? 0, name: nameOf(u), ok: submitted(u), off: lost.has(u) })));
  const st = $derived<ArenaState>({ boss, split, sprite, hp: hp ? { left: hp.left, max: hp.max } : null, hpLabel, down: !!hp?.down, shadow, heroes });

  onMount(() => {
    const ro = new ResizeObserver(() => { W = host.clientWidth; H = host.clientHeight; }); ro.observe(host); W = host.clientWidth; H = host.clientHeight;
    const forceDom = new URLSearchParams(location.search).has('dom');
    if (forceDom) mode = 'dom';
    else void import('./arena/pixi').then(async (m) => {
      const font = getComputedStyle(host).fontFamily || 'sans-serif';
      const a = await m.createArena(host, font);
      if (!host.isConnected) { a?.destroy(); return; }
      if (a) { A = a; mode = 'pixi'; } else mode = 'dom';
    }).catch((e) => { console.warn('PixiJS 불러오기 실패 → DOM', e); mode = 'dom'; });
    return () => ro.disconnect();
  });
  onDestroy(() => { A?.destroy(); A = null; clearTimeout(qT); });
  $effect(() => { void W; void H; if (A && step) A.update(st); });

  // 🧊 몬스터 공격 = 폰과 같은 시계(atkClock) · 얼음이면 용사단 모두 얼음 덩어리 → 3초(분노 4초) 뒤 녹음 (TV 는 학생 톡을 모름 = 시간으로만)
  const amemo = {}; let iceDom = $state(0);
  $effect(() => {
    const c = atkClock(L, R, now); if (!c || c.paused || !step) return;
    if (!atkTrack(amemo, c, `${c.kind}|${c.mid}`).strike) return;
    untrack(() => { const hg = holyArmed(R, c.mid, now, c.per); if (hg.length) { void tvGuard(hg); return; } const d = attackOf(L, step, c.k); if (d.id !== 'ice') return; const ms = attackMs(d, c.lock, attackStrong(hp)); if (A) A.freeze(ms); else domFreeze(ms); });
  });
  (globalThis as { __tvFreeze?: (ms?: number) => void }).__tvFreeze = (ms = 3000) => { if (A) A.freeze(ms); else domFreeze(ms); }; // 화면 시험 고리
  function domFreeze(ms: number) { iceDom = 1; setTimeout(() => (iceDom = 2), ms); setTimeout(() => (iceDom = 0), ms + 650); }
  // ── 공격 사건 (단계가 바뀌면 지난 것은 다시 보이지 않음) ──
  let seen: Record<string, Snap> = {}, seenKey = '', wasDown = false, qT: ReturnType<typeof setTimeout> | undefined;
  const queue: { u: string; dmg: number; kind: 'hit' | 'miss' | 'practice'; fx?: string; ult?: boolean }[] = [];
  let domFx = $state<{ k: number; text: string; x: number; y: number; cls: string }[]>([]), domBan = $state(''), fk = 0, lunge = $state<Record<string, boolean>>({});
  function play() {
    if (qT) return;
    const h = queue.shift(); if (!h) return;
    if (fxLayer && W && tvAttack(h)) { /* ⚔ 정식 attack.js (DOM 층) */ }
    else if (A) A.hit(h.u, h.dmg, h.kind);
    else { lunge = { ...lunge, [h.u]: true }; setTimeout(() => (lunge = { ...lunge, [h.u]: false }), 380); const b = arenaBox(W, H, boss, split); domPop(h.kind === 'hit' ? `-${h.dmg}` : h.kind === 'practice' ? '연습' : 'MISS', b.mon.cx, b.mon.top + b.mon.size * 0.4, h.kind === 'hit' ? 'dmg' : 'miss'); }
    qT = setTimeout(() => { qT = undefined; play(); }, 350);
  }
  // ⚔ 🔨 용사 fx (정식 hall.js 606~618 · 학생 폰과 같은 attack()): Pixi = 캔버스 위 DOM 층에 그 용사 대역(같은 자리 · 같은 크기)을 두고 Pixi 용사는 잠깐 숨김
  //   몬스터 대역 = 보이는 몸통 상자(data-bb) · 맞는 순간 = Pixi 몬스터 깜빡 · 숫자 / DOM 장면 = 그 용사 칸(.art) 그대로 · ⚡ 필살기 = 첫 시도 퍼펙트 + 내 속성 Ⅲ↑(정식 hall.js 78)
  let fxLayer = $state<HTMLDivElement | null>(null), auraLayer = $state<HTMLDivElement | null>(null), hidden = $state<Record<string, boolean>>({});
  const ulSeen = new Set<string>(); let auraSig = '';
  // ⚔ 새 스킬 fx 시제품 (TV 만 · ?newfx 또는 이 기기 설정 · 지금은 ⚔ 베기 계열만 · 선생님 채택 전엔 기본 꺼짐)
  const NEWFX0 = typeof location !== 'undefined' && (/[?&]newfx\b/.test(location.search) || (() => { try { return localStorage.getItem('citadel-newfx') === '1'; } catch { return false; } })());
  let NEWFX = $state(NEWFX0);
  const famIdOf = (k: string) => (['cut', 'moon', 'slash', 'twin'].includes(k) ? 'cut' : '');
  const tierIdx = (k: string) => Math.max(0, ['cut', 'moon', 'slash', 'twin'].indexOf(k));
  setForce(true);
  function ultOf(u: string, fxk: string, hero: number): boolean {
    if (!step || !canUlt(fxk, hero)) return false;
    const key = `${R.state.step}|${step.id}|${u}`; if (ulSeen.has(key)) return false;
    let ok = false;
    if (step.kind === 'boss') { const st2 = bossState(L, R, u); ok = st2.length > 0 && st2.every((x) => x.first); }
    else if (step.kind === 'monster' && L.monsters[step.id] && !isChain(L, R, step.id)) { const r = plainRecord(L, R, step.id, u); ok = r.perfectAt === 0 && r.tries.length === 1; }
    if (ok) ulSeen.add(key); return ok;
  }
  function tvAttack(h: { u: string; dmg: number; kind: 'hit' | 'miss' | 'practice'; fx?: string; ult?: boolean }): boolean {
    const k = ids.indexOf(h.u), sl = slots[k], lay = fxLayer; if (!sl || !lay || !step) return false;
    const p = R.players?.[h.u], hero = p?.hero ?? 0, fxk = h.fx || p?.fx || ladder(hero)[0]!, ult = h.ult || (h.kind === 'hit' && ultOf(h.u, fxk, hero));
    atkPreload(hero, fxk); if (ult) preloadFaces();
    let heroBox: HTMLElement, monBox: HTMLElement, art: HTMLElement | null = null; const tmp: HTMLElement[] = [];
    const mb = document.createElement('div'); mb.className = 'tvm'; let bb = ''; try { const sp = spriteOf(sprite); bb = monBody(sp.sheet.src, sp.row, sp.sheet.poses.idle, sp.sheet.cell); } catch { /* 기본 몸통 */ }
    mb.style.cssText = `position:absolute;left:${box.mon.cx - box.mon.size / 2}px;top:${box.mon.top}px;width:${box.mon.size}px;height:${box.mon.size}px`; mb.dataset.bb = bb; lay.appendChild(mb); tmp.push(mb); monBox = mb;
    if (A) {
      const w = HERO.w * sl.s, hgt = HERO.h * sl.s, hb = document.createElement('div'); hb.className = 'tvh';
      hb.style.cssText = `position:absolute;left:${sl.x - w / 2}px;top:${sl.y - hgt}px;width:${w}px;height:${hgt}px`;
      art = document.createElement('i'); art.className = `art hero${sl.flip ? ' flip' : ''}`;
      art.style.cssText = `position:absolute;inset:0;background:url(${heroUrl(hero)}) 0 0/${HERO.cols * 100}% ${HERO.rows * 100}% no-repeat;image-rendering:pixelated;${sl.flip ? 'transform:scaleX(-1);' : ''}`;
      hb.appendChild(art); lay.appendChild(hb); tmp.push(hb); heroBox = hb; A.heroVisible(h.u, false);
    } else {
      const el = host.querySelector(`.hr[data-u="${CSS.escape(h.u)}"] .art`) as HTMLElement | null; if (!el) { tmp.forEach((e) => e.remove()); return false; }
      heroBox = el;
    }
    const ROWS: Record<Pose, number> = { idle: 0, walk: 1, attack: 2, win: 4, think: 10 };
    const pose = (q: Pose) => { if (art) art.style.backgroundPosition = `${q === 'attack' ? (2 / (HERO.cols - 1)) * 100 : 0}% ${(ROWS[q] / (HERO.rows - 1)) * 100}%`; };
    if (h.kind !== 'hit') setTimeout(() => { if (A) A.monHit(0, h.kind); else { const b = arenaBox(W, H, boss, split); domPop(h.kind === 'practice' ? '연습' : 'MISS', b.mon.cx, b.mon.top + b.mon.size * 0.4, 'miss'); } }, 420);
    const custom = NEWFX && A && famIdOf(fxk) ? (B: { cx: number; cy: number; w: number; h: number }, dir: number, q: { ult: boolean }) => A!.slash({ x: B.cx, y: B.cy, w: B.w, h: B.h, dir, tier: q.ult ? 3 : Math.min(2, tierIdx(fxk)), fam: 'cut', seed: (k + 1) * 97 }, () => void place(lay, fxk, { body: { x0: B.cx - B.w / 2, y0: B.cy - B.h / 2, x1: B.cx + B.w / 2, y1: B.cy + B.h / 2, ...B }, dir })) : undefined;
    void attack(lay, { custom, heroBox, monBox, hero, fx: fxk, miss: h.kind === 'miss', noDmg: true, rest: 'idle', hits: h.kind === 'practice' ? 1 : Math.max(1, h.dmg), ultimate: ult, pose,
      heroArt: (id) => `<i class="art hero" style="position:absolute;inset:0;background:url(${heroUrl(id)}) 0 0/${HERO.cols * 100}% ${HERO.rows * 100}% no-repeat;image-rendering:pixelated"></i>`,
      onHit: (q) => { if (h.kind !== 'hit') return; const last = !q || q.k === q.n - 1; if (A) A.monHit(last ? h.dmg : 0, 'hit'); else if (last) { const b = arenaBox(W, H, boss, split); domPop(`-${h.dmg}`, b.mon.cx, b.mon.top + b.mon.size * 0.4, 'dmg'); } } })
      .finally(() => { tmp.forEach((e) => e.remove()); A?.heroVisible(h.u, true); heroBox.style.translate = ''; });
    return true;
  }
  // ⏱ 성능 재기 (머리 📎 기준 · 교실 PC 에서 직접): 주소에 ?perf → 가상 용사 30명 → 지금 띠 30명 동시 4초 · 새 것 30명 동시 4초 → 평균 · 최저 fps · 최장 프레임 ms 를 화면에
  //   크롬 DevTools 「Performance → CPU 4x slowdown」을 켜고 같은 주소를 열면 기준(30명 · 50fps 이상) 확인 · GPU 없는 시험 상자에선 잴 수 없음(쉬는 장면도 2fps)
  let perfOut = $state('');
  async function bench() {
    const g = globalThis as { __tvFake?: (n: number) => void }; g.__tvFake?.(30); await new Promise((r) => setTimeout(r, 4000));
    const FXS = ['cut', 'moon', 'slash', 'twin'], rows: string[] = [];
    for (const mode of [false, true]) {
      NEWFX = mode; await new Promise((r) => setTimeout(r, 300));
      const m = new Promise<string>((res) => { const ts: number[] = []; let last = performance.now(); const t0 = last; const f = (t: number) => { ts.push(t - last); last = t; if (t - t0 < 4000) requestAnimationFrame(f); else { const d = ts.slice(2), avg = 1000 / (d.reduce((a, x) => a + x, 0) / d.length), st = A?.slashStats(); res(`${mode ? '새 것' : '지금 띠'} 30명: 평균 ${Math.round(avg)}fps · 최저 ${Math.round(1000 / Math.max(...d))}fps · 최장 ${Math.round(Math.max(...d))}ms${mode && st ? ` · 덜어 낸 단계 ${st.level}` : ''}`); } }; requestAnimationFrame(f); });
      ids.slice(0, 30).forEach((u, k) => tvAttack({ u, dmg: 2, kind: 'hit', fx: FXS[k % 4] }));
      rows.push(await m); await new Promise((r) => setTimeout(r, 3000));
    }
    NEWFX = NEWFX0; perfOut = rows.join('\n'); console.log(perfOut);
  }
  if (typeof location !== 'undefined' && /[?&]perf\b/.test(location.search)) setTimeout(() => void bench(), 3000);
  (globalThis as { __slash?: unknown }).__slash = { stats: () => A?.slashStats(), cfg: (c: { fancy?: boolean; level?: number | null }) => A?.slashCfg(c) };
  // 화면 시험 고리: __tvAtk(번째, 'hit' | 'miss' | 'practice', 데미지) = 그 용사가 한 번 공격 (학생 화면엔 없음)
  (globalThis as { __tvAtk?: (k: number, kind?: 'hit' | 'miss' | 'practice', dmg?: number, fx?: string, ult?: boolean, now?: boolean) => void }).__tvAtk = (k, kind = 'hit', dmg = 2, fx, ult, now) => { const u = ids[k]; if (!u) return; if (now) tvAttack({ u, dmg, kind, fx, ult }); else { queue.push({ u, dmg, kind, fx, ult }); play(); } };
  // 🛡 홀리 방패 막기 (정식 hall.js 545~567): HOLY GUARD 컷인 → 막은 용사마다 날개 · 방패 (Pixi = 같은 자리 대역) · 몬스터 공격 연출 없음
  let guardBusy = false;
  async function tvGuard(us: string[]) {
    if (guardBusy) return; guardBusy = true;
    const p0 = R.players?.[us[0]!]; await cutin(p0?.hero ?? 0, p0?.fx || 'twinkle', { guard: true }); guardBusy = false;
    const lay = fxLayer; if (!lay) return;
    us.forEach((u) => {
      const k = ids.indexOf(u), sl = slots[k]; if (!sl) return;
      if (A) {
        const w = HERO.w * sl.s, hgt = HERO.h * sl.s, hb = document.createElement('div'); hb.style.cssText = `position:absolute;left:${sl.x - w / 2}px;top:${sl.y - hgt}px;width:${w}px;height:${hgt}px`;
        const art = document.createElement('i'); art.className = 'art hero'; art.style.cssText = `position:absolute;inset:0;background:url(${heroUrl(R.players?.[u]?.hero ?? 0)}) 0 0/${HERO.cols * 100}% ${HERO.rows * 100}% no-repeat;image-rendering:pixelated`;
        hb.appendChild(art); lay.appendChild(hb); A.heroVisible(u, false); const mb = document.createElement('div'); mb.style.cssText = `position:absolute;left:${box.mon.cx - box.mon.size / 2}px;top:${box.mon.top}px;width:${box.mon.size}px;height:${box.mon.size}px`; lay.appendChild(mb); setTimeout(() => mb.remove(), 2650); guard(hb, undefined, 0, mb); setTimeout(() => { hb.remove(); A?.heroVisible(u, true); }, 2650);
      } else { const el = host.querySelector(`.hr[data-u="${CSS.escape(u)}"]`) as HTMLElement | null; if (el) guard(el, undefined, 0, host.querySelector('.mon')); }
    });
  }
  // 🗿 석화 (진필살기 20초 · 홀리 방패 10초): 몬스터 회색 돌 · 남은 초 (정식 hall.js 94)
  const stoneNow = $derived(step ? stone(R, step.kind === 'boss' ? BOSS_ID : step.id) : null);
  const stoneLeft = $derived(stoneNow ? Math.max(0, Math.ceil((stoneNow.until - now) / 1000)) : 0);
  $effect(() => { A?.stone(stoneLeft > 0); });
  // ✨ 오라 (정식 aura.js · TV = 입자 2개까지): Pixi = 캔버스 아래 층에 용사 자리마다 · DOM 장면 = HeroSprite 가 직접
  $effect(() => {
    const lay = auraLayer; if (!lay || mode !== 'pixi' || !W) return;
    const rows = heroes.map((h, k) => ({ sl: slots[k], lv: Number(R.players?.[h.u]?.enh) || 0, hero: h.hero })), sig = JSON.stringify(rows);
    if (sig === auraSig) return;
    untrack(() => {
      auraSig = sig; lay.replaceChildren();
      for (const { sl, lv, hero } of rows) { if (!sl || !lv) continue; const w = HERO.w * sl.s, hgt = HERO.h * sl.s, a = document.createElement('i'); a.className = 'art'; a.style.cssText = `position:absolute;left:${sl.x - w / 2}px;top:${sl.y - hgt}px;width:${w}px;height:${hgt}px`; lay.appendChild(a); deco(a, lv, true, heroHead(hero, true)); }
    });
  });
  function domPop(text: string, x: number, y: number, cls: string) { const k = ++fk; domFx = [...domFx, { k, text, x, y, cls }]; setTimeout(() => (domFx = domFx.filter((f) => f.k !== k)), 1300); }
  $effect(() => {
    if (!step) return;
    const st0 = step, key = `${R.state.step}|${st0.id}`, cur: Record<string, Snap> = {};
    for (const u of ids) cur[u] = snapOf(L, R, st0, u);
    untrack(() => {
      if (key !== seenKey) { seenKey = key; seen = cur; wasDown = !!hp?.down; queue.length = 0; if (A) A.banner(null); domBan = ''; return; }
      const hs = hitsOf(seen, cur); seen = cur;
      if (hs.length) { queue.push(...hs); play(); }
      const d = !!hp?.down;
      if (d && !wasDown) {
        const text = boss ? '🎉 보스 격파! 모두 함께 이겼다!' : '⚔ 몬스터 격파!';
        setTimeout(() => { if (A) A.banner(text); else domBan = text; }, 350 * (queue.length + 1));
        setTimeout(() => ids.forEach((u, k) => { const x = xpOf(L, R, st0, u); if (!x) return; setTimeout(() => { if (A) A.exp(u, `+${x} EXP`); else { const sl = partyLayout(ids.length, W, H, split)[k]; if (sl) domPop(`+${x} EXP`, sl.x, sl.y - 64 * sl.s, 'exp'); } }, (k % 6) * 120); }), 350 * (queue.length + 1) + 600);
      }
      wasDown = d;
    });
  });
  // 화면 시험 고리(TV 장면 · 학생 화면엔 없음): 지금 그리는 방식 · 배치
  $effect(() => { (globalThis as { __arena?: unknown }).__arena = { mode, W, H, hp: hp ? `${hp.left} / ${hp.max}` : '', box: arenaBox(W, H, boss, split, vis), party: partyLayout(heroes.length, W, H, split) }; });

  const slots = $derived(partyLayout(heroes.length, W, H, split));
  const vis = $derived.by(() => { try { const sp = spriteOf(sprite); return monVis(sp.sheet.src, sp.row, sp.sheet.poses.idle, sp.sheet.cell); } catch { return 1; } });
  const box = $derived(arenaBox(W, H, boss, split, vis));
</script>

<div class="arena2" class:split bind:this={host} data-mode={mode}>
  <div class="tvaura" bind:this={auraLayer} aria-hidden="true"></div>
  {#if mode === 'dom' && W && step && sprite}
    <!-- DOM 장면 = 캔버스와 같은 배치 (WebGL 없는 기기) -->
    <i class="sh" style:left="{box.shadow.cx - box.shadow.w / 2}px" style:top="{box.shadow.y - H * 0.018}px" style:width="{box.shadow.w}px" style:height="{H * 0.036}px"></i>
    <div class="mon" class:shadow class:stoned={stoneLeft > 0} class:float={!hp?.down && !stoneLeft} style:left="{box.mon.cx - box.mon.size / 2}px" style:top="{box.mon.top}px"><Sprite ref={sprite} pose={hp?.down ? 'down' : 'idle'} size={box.mon.size} /></div>
    {#if hp && !shadow}
      <div class="hp" style:left="{box.hp.x}px" style:top="{box.hp.y}px" style:width="{box.hp.w}px" style:--h="{box.hp.h}px"><span class="lab">{hpLabel}</span><div class="b"><i style:width="{hp.max ? (Math.max(0, hp.left) / hp.max) * 100 : 0}%"></i><b>HP {hp.left} / {hp.max}</b></div></div>
    {/if}
    {#each heroes as h, k (h.u)}{@const sl = slots[k]}{#if sl}
      <div class="hr" data-u={h.u} class:off={h.off} class:lunge={lunge[h.u]} style:left="{sl.x}px" style:top="{sl.y}px" style:--dir={sl.flip ? -1 : 1} style:z-index={Math.round(sl.y)}>
        <span class="art" class:iced={iceDom > 0} style:transform="scaleX({sl.flip ? -1 : 1})"><HeroSprite id={h.hero} scale={sl.s} aura={Number(R.players?.[h.u]?.enh) || 0} tv />{#if iceDom > 0}<i class="iceb" class:melt={iceDom === 2}></i>{/if}</span>
        <span class="nm" class:ok={h.ok}>{h.ok ? '✓ ' : h.off ? '📵 ' : ''}{h.name}</span>
      </div>
    {/if}{/each}
    {#each domFx as f (f.k)}<b class="pop {f.cls}" style:left="{f.x}px" style:top="{f.y}px">{f.text}</b>{/each}
    {#if domBan}<div class="ban" style:left="{split ? W * 0.27 : W / 2}px">{domBan}</div>{/if}
  {/if}
  {#if stoneLeft > 0 && step}<div class="stonelab" style:left="{box.mon.cx}px" style:top="{box.mon.top + box.mon.size * 0.9}px">🗿 {stoneNow?.holy ? '홀리 방패' : '진필살기'} 석화 {stoneLeft}초</div>{/if}
  <div class="tvfx" bind:this={fxLayer} aria-hidden="true"></div>
  {#if perfOut}<pre class="perf">{perfOut}</pre>{/if}
</div>

<style>
  .arena2 { position: absolute; inset: 0; z-index: 1; overflow: hidden; }
  .mon.stoned { filter: grayscale(1) brightness(0.85) contrast(1.1); }
  .stonelab { position: absolute; z-index: 6; transform: translateX(-50%); padding: 0.5cqh 1.2cqw; border-radius: 99px; background: rgba(40, 40, 46, 0.9); border: 2px solid #c9c9d6; font-size: var(--tv-body); font-weight: 700; white-space: nowrap; }
  .perf { position: absolute; z-index: 3000; left: 2cqw; top: 12cqh; margin: 0; padding: 1cqh 1.4cqw; border-radius: 1cqh; background: rgba(0, 0, 0, 0.85); color: #fff; font-size: var(--tv-body); white-space: pre; }
  .tvaura { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
  .arena2 :global(canvas) { position: relative; z-index: 1; }
  .tvfx { position: absolute; inset: 0; z-index: 2000; pointer-events: none; overflow: hidden; }
  .sh { position: absolute; border-radius: 50%; background: radial-gradient(ellipse, rgba(0, 0, 0, 0.55), transparent 70%); }
  .mon { position: absolute; } .mon.shadow { filter: brightness(0.08); }
  .mon.float { animation: bob 2.6s steps(2, jump-none) infinite; } /* #164 계단 · 정수 px */
  @keyframes bob { 50% { transform: translateY(-4px); } }
  .hp { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 0.6cqh; font-size: var(--tv-body); font-weight: 700; text-shadow: 0 1px 2px #000; }
  .hp .lab { white-space: nowrap; }
  .hp .b { position: relative; width: 100%; height: var(--h); border-radius: 99px; background: #2a0d10; box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.7); overflow: hidden; display: grid; place-items: center; }
  .hp .b i { position: absolute; left: 0; top: 0; bottom: 0; background: #e5484d; transition: width 0.5s ease-out; }
  .hp .b b { position: relative; }
  .art { position: relative; display: block; }
  .art.iced :global(.hs) { filter: saturate(0.6) brightness(1.15) hue-rotate(160deg) sepia(0.15); }
  .iceb { position: absolute; left: 22%; right: 22%; top: 6%; bottom: 0; clip-path: polygon(18% 0, 62% 3%, 92% 14%, 100% 46%, 94% 82%, 70% 100%, 26% 98%, 4% 80%, 0 40%, 6% 12%); background: linear-gradient(135deg, rgba(225, 248, 255, 0.55), rgba(150, 210, 240, 0.35) 45%, rgba(190, 235, 255, 0.5)); box-shadow: inset 0 0 10px #fff; }
  .iceb.melt { animation: imelt 0.6s ease-in forwards; } @keyframes imelt { to { opacity: 0; transform: translateY(4px); } }
  .hr { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; transition: translate 0.18s ease-out; }
  .hr.lunge { translate: calc(var(--dir) * 4cqw) 0; }
  .hr.off { opacity: 0.45; }
  .art { display: block; line-height: 0; }
  .nm { margin-top: 0.4cqh; font-size: var(--tv-small); font-weight: 700; background: rgba(8, 9, 12, 0.72); padding: 0.1cqh 0.6cqw; border-radius: 99px; white-space: nowrap; }
  .nm.ok { color: var(--ok); }
  .pop { position: absolute; transform: translate(-50%, -100%); font-size: var(--tv-big); font-weight: 700; color: #ffd166; text-shadow: 0 3px 0 #000; animation: up 1.1s ease-out forwards; pointer-events: none; }
  .pop.miss { font-size: var(--tv-title); color: #cfd3db; } .pop.exp { font-size: var(--tv-body); color: #f5b84a; }
  @keyframes up { to { transform: translate(-50%, -180%); opacity: 0; } }
  .ban { position: absolute; top: 50%; transform: translate(-50%, -50%); font-size: var(--tv-big); font-weight: 700; color: #ffd166; padding: 1.6cqh 3cqw; border-radius: 2cqh; background: rgba(8, 9, 12, 0.78); border: 3px solid #f5b84a; white-space: nowrap; }
</style>
