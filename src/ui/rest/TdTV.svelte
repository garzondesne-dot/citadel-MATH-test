<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { onDestroy, untrack } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import { heroOf } from '../../model/hero';
  import { activeIds } from '../../raid/raid';
  import { roomPath } from '../../raid/actions';
  import { stopFun } from '../../rest/run';
  import * as TD from '../../rest/td';
  import { artUrl, TD_ART } from '../manifest';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import Cutin from './Cutin.svelte';

  // 🏰 교실 TV = 디펜스 계산 + 그림 (#142-2 · 정식 td.js hall · 이 기기 하나가 맡음)
  //   자리 고르기 40초(폰 선착순 · 안 고른 학생 = 빈 자리에 무작위) → 난이도 맞추기(calibrate) → 3초 뒤 웨이브 5 → 결과 → 60초 뒤 쉼터로
  //   🔴 집중 = 계산 멈춤(풀면 그 자리에서) · 판 안 업그레이드 = 저절로 · 기술 = 폰 tdt · 🛡 방패 · ✨ 응원 = 교사 폰
  const { S, code, R, now, nameOf }: { S: Store; code: string; R: Room; now: number; nameOf: (u: string) => string } = $props();
  const P = (x: string) => `${roomPath(code)}/${x}`;
  const f = $derived((R as any).fun as any);
  const map = $derived(TD.mapGet(f?.map ?? 'forest'));
  const picks = $derived((((R as any).tdp || {})[f?.g] || {}) as Record<string, string>);
  const studs = $derived(activeIds(R, now));
  const tdm = $derived((((R as any).tdm || {})[f?.g] || {}) as Record<string, { sw?: string; no?: string; hero?: number; swd?: number }>);
  const heroOf2 = (u: string) => (tdm[u]?.hero != null ? Number(tdm[u]!.hero) : Number(R.players?.[u]?.hero) || 0);
  // 🔁 자리 교환 (정식 pickHall): 둘이 서로 신청 = TV 가 두 자리를 맞바꿈
  const swDone: Record<string, 1> = {};
  $effect(() => {
    if (f?.phase !== 'pick') return;
    const slotOf = (u: string) => Object.keys(picks).find((k) => picks[k] === u);
    Object.keys(tdm).forEach((a) => { const b = tdm[a]?.sw; if (!b || a >= b || tdm[b]?.sw !== a) return; const sa = slotOf(a), sb = slotOf(b), key = `${a}|${b}|${sa}|${sb}`; if (!sa || !sb || swDone[key]) return; swDone[key] = 1;
      untrack(() => { const t = S.now(); S.set(P(`tdp/${f.g}/${sa}`), b); S.set(P(`tdp/${f.g}/${sb}`), a); S.set(P(`tdm/${f.g}/${a}/sw`), null); S.set(P(`tdm/${f.g}/${b}/sw`), null); S.set(P(`tdm/${f.g}/${a}/swd`), t); S.set(P(`tdm/${f.g}/${b}/swd`), t); }); });
  });
  const left = $derived(f?.phase === 'pick' ? Math.max(0, Math.ceil((f.to - now) / 1000)) : 0);
  const teacherHero = 17;

  // ── 자리 고르기 끝 → 판 시작 (한 번) ──
  let starting = 0;
  $effect(() => {
    if (!f || f.phase !== 'pick' || now < f.to || starting === f.g) return;
    starting = f.g;
    untrack(() => {
      const as: Record<string, number> = {}, all = TD.slots(map).map((s) => s.no);
      Object.keys(picks).map(Number).sort((a, b) => a - b).forEach((no) => { const u = picks[no]!; if (studs.includes(u) && !as[u]) as[u] = no; });
      const free = all.filter((no) => !Object.values(as).includes(no)), Rr = TD.rng(f.g);
      studs.filter((u) => !as[u]).forEach((u) => { if (!free.length) return; as[u] = free.splice(Math.floor(Rr() * free.length), 1)[0]!; });
      const tw = studs.filter((u) => as[u]).map((u) => { const hero = heroOf2(u); return { u, s: as[u]!, hero, r: heroOf(hero).ranged ? 1 : 0 }; });
      tw.push({ u: 'T', s: 0, hero: teacherHero, r: heroOf(teacherHero).ranged ? 1 : 0, T: 1 } as any);
      const hp0 = TD.calibrate({ map, seed: f.g, towers: toTowers(tw) });
      S.set(P('fun'), { ...f, phase: 'play', t0: S.now() + 3000, tw, hp0 });
    });
  });
  const toTowers = (tw: any[]): TD.TowerIn[] => tw.map((t) => ({ uid: t.u, slot: t.s, teacher: !!t.T, ranged: !!t.r }));

  // ── 놀이: 계산 (rAF) ──
  let sim: any = null, simG = 0, simAt = 0, raf = 0, liveAt = 0, ended = 0, applied = { t: {} as Record<string, 1>, sh: false, ch: {} as Record<string, 1> }, pend: Record<string, number> = {};
  let cut = $state<{ hero: number; name: string; gold: boolean } | null>(null), cutQ: { hero: number; name: string; gold: boolean }[] = [], cutT: ReturnType<typeof setTimeout> | null = null;
  const nextCut = () => { cut = cutQ.shift() ?? null; if (cut) cutT = setTimeout(nextCut, cut.gold ? 2100 : 1600); };
  const queueCut = (c: { hero: number; name: string; gold: boolean }) => { if (cutQ.length > 2) return; cutQ.push(c); if (!cut) nextCut(); };
  let tick = $state(0), simT = $state(0), banner = $state(''), bannerT: ReturnType<typeof setTimeout> | null = null;
  const say = (t: string) => { banner = t; if (bannerT) clearTimeout(bannerT); bannerT = setTimeout(() => (banner = ''), 2600); };
  function loop() {
    raf = requestAnimationFrame(loop);
    const ff = untrack(() => f), RR = untrack(() => R);
    if (!ff || ff.kind !== 'td' || ff.phase !== 'play' || !ff.tw) return;
    if (!sim || simG !== ff.g) { sim = TD.create({ map: TD.mapGet(ff.map), seed: ff.g, towers: toTowers(Array.isArray(ff.tw) ? ff.tw : Object.values(ff.tw)), hp0: ff.hp0 }); simG = ff.g; simAt = performance.now(); applied = { t: {}, sh: false, ch: {} }; pend = {}; ended = 0; }
    const t = performance.now(), sp = Number((globalThis as any).__TD_SPEED) || 1, dt = Math.min(0.25, (t - simAt) / 1000) * sp; simAt = t; // __TD_SPEED = 화면 시험만(정식 DS_TD.speed)
    const live = S.now() >= ff.t0 && !RR.state.focus; // 🔴 집중 = 멈춤
    if (live && !sim.done) {
      const goal = sim.t + dt, Tt = ((RR as any).tdt || {})[ff.g] || {}, Uu = ((RR as any).tdu || {})[ff.g] || {};
      let n = 0;
      while (sim.t < goal && !sim.done && n++ < 4000) {
        sim.towers.forEach((T: any) => {
          const mine = (Uu[T.uid] || {}) as Record<string, string>;
          while (TD.pending(T) > 0 && mine[T.ups.length]) TD.upgrade(sim, T.uid, mine[T.ups.length]!); // ⬆ 폰이 고른 것 (n 번째 칸 = n 번째 업그레이드)
          if (TD.pending(T) > 0) { pend[T.uid] = pend[T.uid] || sim.t; if (T.teacher || sim.t - pend[T.uid]! > 12) { TD.upgrade(sim, T.uid, TD.auto(T, sim.R)); pend[T.uid] = 0; } } else pend[T.uid] = 0; // 12초 안 고르면 저절로 (선생님 타워 = 바로)
          if (Tt[T.uid] && !applied.t[T.uid]) { applied.t[T.uid] = 1; const k = TD.skill(sim, T.uid); if (k === 'ult' || k === 'true') { const tw0 = (Array.isArray(ff.tw) ? ff.tw : Object.values(ff.tw)).find((x: any) => x.u === T.uid) as any; queueCut({ hero: Number(tw0?.hero) || 0, name: `${k === 'true' ? '진필살기 · ' : ''}${nameOf(T.uid)}!`, gold: k === 'true' }); } }
        });
        if (ff.sh && !applied.sh) { applied.sh = true; TD.shieldOn(sim); say('🛡 선생님의 수호 방패! 성에 닿는 몬스터 3마리를 막아요'); }
        if ((ff.ch || {})[sim.wave] && !applied.ch[sim.wave]) { applied.ch[sim.wave] = 1; TD.cheer(sim); say('✨ 선생님의 응원! 5초 동안 공격 속도 +20%'); }
        const w0 = sim.wave; TD.step(sim); if (sim.wave !== w0) say(sim.wave === 5 ? '👑 마지막 웨이브 — 보스 등장!' : `🌊 웨이브 ${sim.wave}`);
      }
    }
    draw();
    const nw = S.now();
    if (nw - liveAt > 1000 || (sim.done && !ended)) { liveAt = nw; const o: any = { t: Math.round(sim.t), wave: sim.wave, life: sim.life, shield: sim.shield, kills: {}, used: {}, stars: {}, got: {}, ups: {}, tier: {} }; sim.towers.forEach((T: any) => { if (T.teacher) return; o.kills[T.uid] = T.kills; o.stars[T.uid] = T.stars; o.got[T.uid] = T.upGot; o.ups[T.uid] = T.ups.join(''); o.tier[T.uid] = T.tier; if (T.used) o.used[T.uid] = 1; }); S.set(P(`tdl/${ff.g}`), o); tick++; simT = Math.round(sim.t); }
    if (sim.done && !ended) { ended = ff.g; const top = sim.towers.filter((T: any) => !T.teacher).sort((a: any, b: any) => b.kills - a.kills).slice(0, 3).map((T: any) => [T.uid, T.kills]); S.set(P('fun'), { ...ff, phase: 'end', endAt: S.now(), res: { win: sim.win, life: sim.life, top, t: Math.round(sim.t) } }); }
  }
  raf = requestAnimationFrame(loop);
  onDestroy(() => { cancelAnimationFrame(raf); if (bannerT) clearTimeout(bannerT); if (cutT) clearTimeout(cutT); });
  // 결과 60초 뒤 쉼터로 (정식 endHall)
  $effect(() => { if (f?.phase === 'end' && now - (f.endAt || now) > 60000) untrack(() => stopFun(S, code)); });

  // ── 그림 (캔버스 하나 · 지도 그림 + 자리 · 몬스터 · 효과) ──
  let cv: HTMLCanvasElement | undefined = $state(), box: HTMLDivElement | undefined = $state();
  let U = $state(60);
  const img = typeof Image !== 'undefined' ? new Image() : null;
  let imgFor = '';
  const MON: Record<string, string> = { n: '👾', f: '🐺', t: '🪨', v: '🦇', m: '👹', b: '🐲' };
  const FAMC: Record<string, string> = { fire: '#ff7a1a', cut: '#e8eef8' };
  function fit() { if (!box || !cv) return; const w = Math.min(box.clientWidth, (box.clientHeight * 16) / 9); U = w / 16; cv.width = Math.round(w); cv.height = Math.round((w * 9) / 16); }
  function draw() {
    if (!cv) return; const g = cv.getContext('2d'); if (!g) return;
    const m = untrack(() => map), Wd = cv.width, Hh = cv.height, u = Wd / 16;
    const src = TD_ART[m.id]; if (img && src && imgFor !== src) { imgFor = src; img.src = artUrl(src); }
    if (img && img.complete && img.naturalWidth) g.drawImage(img, 0, 0, Wd, Hh);
    else { const gr = g.createLinearGradient(0, 0, Wd, Hh); gr.addColorStop(0, m.theme.bg[0]); gr.addColorStop(1, m.theme.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, Wd, Hh); g.lineJoin = 'round'; g.lineCap = 'round'; m.paths.forEach((p) => { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u))); g.strokeStyle = m.theme.edge; g.lineWidth = u * 0.86; g.stroke(); g.strokeStyle = m.theme.path; g.lineWidth = u * 0.7; g.stroke(); }); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const ff = untrack(() => f);
    if (ff?.phase === 'pick') TD.slots(m).forEach((p) => { g.beginPath(); g.arc(p.x * u, p.y * u, u * (p.star ? 0.36 : 0.3), 0, 7); g.fillStyle = '#0008'; g.fill(); g.strokeStyle = p.star ? '#ffd25a' : '#ffffff88'; g.lineWidth = u * (p.star ? 0.06 : 0.035); g.stroke(); g.fillStyle = p.star ? '#ffd25a' : '#fff'; g.font = `bold ${u * 0.26}px sans-serif`; g.fillText(p.star ? `★${p.no}` : String(p.no), p.x * u, p.y * u + 1); });
    if (!sim || ff?.phase === 'pick') return;
    sim.mons.forEach((mo: any) => { const x = mo.x * u, y = mo.y * u, big = TD.TYPES[mo.ty]!.boss ? 1.6 : TD.TYPES[mo.ty]!.heavy ? 1.2 : 1; g.globalAlpha = mo.dead ? 0.3 : 1; g.font = `${u * 0.55 * big}px serif`; g.fillText(MON[mo.ty] ?? '👾', x, y); if (!mo.dead) { g.fillStyle = '#000a'; g.fillRect(x - u * 0.3, y - u * 0.45 * big, u * 0.6, u * 0.08); g.fillStyle = '#e5484d'; g.fillRect(x - u * 0.3, y - u * 0.45 * big, u * 0.6 * Math.max(0, mo.hp / mo.max), u * 0.08); } });
    g.globalAlpha = 1;
    sim.fx.forEach((e: any) => { const a = sim.t - e.t;
      if (e.k === 'shot' && a < 0.18) { g.globalAlpha = 1 - a / 0.18; g.strokeStyle = FAMC[e.fam] ?? '#fff'; g.lineWidth = u * 0.07; g.beginPath(); g.moveTo(e.x0 * u, e.y0 * u); g.lineTo(e.x1 * u, e.y1 * u); g.stroke(); }
      else if (e.k === 'dmg' && a < 0.6) { g.globalAlpha = a < 0.42 ? 1 : 1 - (a - 0.42) / 0.18; g.font = `bold ${u * 0.32}px sans-serif`; g.lineWidth = u * 0.06; g.strokeStyle = '#000'; g.strokeText(String(e.v), e.x * u, (e.y - 0.55 - a * 0.8) * u); g.fillStyle = '#fff'; g.fillText(String(e.v), e.x * u, (e.y - 0.55 - a * 0.8) * u); }
      else if ((e.k === 'skill' || e.k === 'ult' || e.k === 'true') && a < 0.8) { g.globalAlpha = 1 - a / 0.8; g.strokeStyle = e.k === 'ult' ? '#ff7a1a' : '#9ef0ff'; g.lineWidth = u * 0.12; g.beginPath(); g.arc(e.x * u, e.y * u, u * (0.4 + a * 2.4), 0, 7); g.stroke(); } });
    g.globalAlpha = 1;
  }
  $effect(() => { void f?.phase; void map; untrack(() => { fit(); draw(); }); });
  $effect(() => { if (!box) return; const ro = new ResizeObserver(() => { fit(); draw(); }); ro.observe(box); return () => ro.disconnect(); });
  $effect(() => { if (f?.phase === 'pick') { void picks; void now; untrack(draw); } });

  // ── 머리판 ──
  const L = $derived((((R as any).tdl || {})[f?.g] || {}) as any);
  const tws = $derived(f?.tw ? ((Array.isArray(f.tw) ? f.tw : Object.values(f.tw)) as any[]) : []);
  const cd = $derived(f?.phase === 'play' ? Math.ceil((f.t0 - now) / 1000) : 0);
  const slotOf = (no: number) => TD.slots(map)[no - 1];
  const twPos = (t: any) => (t.T ? (() => { const e = TD.end(map); return { x: e[0] - 0.9 * Math.sign(e[0] - 8 || 1), y: e[1] + (e[1] > 4.5 ? -1 : 1) }; })() : slotOf(t.s));
  const hs = $derived(Math.max(1, Math.round(U / 64)));
</script>

<div class="td" bind:this={box}>
  <div class="stage" style:width="{U * 16}px" style:height="{U * 9}px">
    <canvas bind:this={cv}></canvas>
    {#if f?.phase === 'pick'}
      {#each Object.entries(picks) as [no, u] (no)}{@const s = slotOf(Number(no))}{#if s}<div class="pk" style:left="{s.x * U}px" style:top="{s.y * U}px"><HeroSprite id={heroOf2(u)} scale={hs} /><b>{nameOf(u)}</b></div>{/if}{/each}
    {:else}
      {#each tws as t (t.u)}{@const p = twPos(t)}{#if p}<div class="tw" class:ranged={!!t.r} style:left="{p.x * U}px" style:top="{p.y * U}px"><HeroSprite id={t.hero} scale={hs} /><b>{t.T ? '🧙' : (nameOf(t.u).split(' ')[0] ?? '')}</b><em>⚔ {t.T ? '' : (L.kills?.[t.u] ?? 0)}{String(L.ups?.[t.u] ?? '').split('').map((k) => ({ a: '⚔', b: '⚡', c: '✨' } as Record<string, string>)[k]).join('')}</em></div>{/if}{/each}
    {/if}
    <div class="hud">
      <b>🏰 {map.name}</b>
      {#if f?.phase === 'pick'}<span>자리 고르기 <b class="sec">{left}</b>초</span><span>고른 사람 {studs.filter((u) => Object.values(picks).includes(u)).length} / {studs.length}</span>
      {:else if f?.phase === 'play'}<span>🌊 웨이브 <b>{L.wave ?? 1}</b> / 5</span><span>❤ <b>{L.life ?? TD.LIFE}</b> / {TD.LIFE}</span>{#if L.shield}<span>🛡 {L.shield}</span>{/if}{#if R.state.focus}<span class="fz">⏸ 집중 · 멈춤</span>{/if}{/if}
    </div>
    {#if f?.phase === 'pick'}<p class="desc">{map.desc} · 폰에서 칸을 눌러 자리를 잡아요 (선착순 · 한 번) · ★ = 명당</p>{/if}
    {#if f?.phase === 'play' && cd > 0}<div class="big"><b>{cd}</b></div>{/if}
    {#if f?.phase === 'end' && f.res}
      <div class="big end"><div class="res" class:win={f.res.win}><h2>{f.res.win ? '🏆 승리! 성을 지켜 냈어요' : '💥 아쉽게 성이 무너졌어요'}</h2><p>❤ 남은 생명 {f.res.life} · {f.res.t}초</p>
        <p class="top3">{#each (f.res.top || []) as x, i (i)}<span>{['🥇', '🥈', '🥉'][i]} {nameOf(x[0])} <b>{x[1]}</b>마리</span>{/each}</p><p class="m">참여한 모두 💎 {f.res.win ? 3 : 1} (오늘 첫 판)</p></div></div>
    {/if}
    {#if banner}<div class="banner">{banner}</div>{/if}
  </div>
  {#if cut}<Cutin hero={cut.hero} name={cut.name} gold={cut.gold} big />{/if}
  <span class="tick" hidden data-tick={tick} data-t={simT} data-frz={R.state.focus ? 1 : 0}></span>
</div>

<style>
  .td { position: absolute; inset: 0; display: grid; place-items: center; background: #0b0a08; }
  .stage { position: relative; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: auto; }
  .pk, .tw { position: absolute; transform: translate(-50%, -78%); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
  .pk b, .tw b { font-size: 1.6cqh; background: rgba(8, 9, 12, 0.75); color: #fff; border-radius: 99px; padding: 0 0.6cqw; white-space: nowrap; margin-top: -0.4cqh; }
  .tw em { font-style: normal; font-size: 1.4cqh; color: #ffd25a; text-shadow: 0 1px 0 #000; }
  .tw.ranged b { box-shadow: 0 0 0 2px #6aa3ff; } .tw:not(.ranged) b { box-shadow: 0 0 0 2px #e5484d; }
  .hud { position: absolute; left: 50%; top: 1.2cqh; transform: translateX(-50%); display: flex; gap: 1.6cqw; align-items: center; padding: 0.8cqh 1.6cqw; border-radius: 99px; background: rgba(8, 9, 12, 0.8); color: #fff; font-size: 2.4cqh; font-weight: 700; white-space: nowrap; }
  .hud b { color: #f5b84a; } .hud .sec { font-size: 3cqh; } .hud .fz { color: #ffb4ae; }
  .desc { position: absolute; left: 50%; bottom: 2cqh; transform: translateX(-50%); margin: 0; padding: 0.6cqh 1.6cqw; border-radius: 99px; background: rgba(8, 9, 12, 0.8); color: #fff; font-size: 2cqh; white-space: nowrap; }
  .big { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
  .big > b { font-size: 16cqh; color: #f5b84a; text-shadow: 0 0.6cqh 0 #000; }
  .big.end { background: rgba(5, 6, 10, 0.6); }
  .res { text-align: center; color: #fff; } .res h2 { margin: 0 0 1cqh; font-size: 5.5cqh; color: #ffb4ae; } .res.win h2 { color: #f5b84a; }
  .res p { margin: 0.6cqh 0; font-size: 2.6cqh; } .res .top3 { display: flex; gap: 2cqw; justify-content: center; } .res .m { color: #cfd3db; font-size: 2.2cqh; }
  .banner { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); padding: 1.2cqh 2.4cqw; border-radius: 1.6cqh; background: rgba(8, 9, 12, 0.85); color: #f5b84a; font-size: 3.4cqh; font-weight: 700; white-space: nowrap; }
</style>
