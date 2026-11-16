<script lang="ts">
  // 🎒 학생 폰 수업 결과 = 정식 js/raid/result.js show · lootHtml · lootPlay 그대로 옮김 (📜 2026-11-15 선생님 「너무 간단 허접 · 터치하다가 갑자기 넘어가」 · 머리 🔨 ⑦)
  //   위 = 그 차시 던전 배경 + 내 용사(오라 · 승리 자세 · 퍼펙트면 ⚡) + 띠(👑 보스 격파 · ⚡ 퍼펙트 · 🏁 수업 끝)
  //   🎒 오늘의 전리품 상자 열림 → 줄마다 차례로(0.65초) 숫자가 올라감 · ⭐ EXP 레벨 막대 · 🎉 레벨 업 · 💎(동전 소리) · 📜 · 🔓 새 호칭 · 🏰 새 성채 방 · 🎯 다음 목표
  //   📕 다시 볼 문제 → 🎯 허수아비 · 「자세히」 = 몬스터별 ✔🔁✖ · 개념별 첫 시도 · 복습 추천 · 📤 카톡 카드 2종 · ⚒ 오늘 카드 · 🎁 첫 출정 특전
  //   숫자 올라가는 중 탭 = 건너뛰기만 (화면은 넘어가지 않음) · 성적이 아니라 다음에 볼 것을 알려 주는 기록
  import { untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { lootRows, reviewN, gotSince, goalOf, gemGuess, DAY_CAP } from '../../school/loot';
  import { castles } from '../../school/castles.svelte';
  import { level, ENH } from '../../model/hero';
  import { earnedFrom, titleData } from '../../model/titles';
  import { TITLES } from '../../model/hero';
  import { savedLook } from '../../store/me.svelte';
  import { SUBJ } from '../../engine/subject';
  import { CHEST } from '../manifest';
  import { partsOf, xpOf } from '../../school/reward';
  import { kstDay } from '../../board/board';
  import { sfx } from '../sound.svelte';
  import PrepImg from '../q/PrepImg.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import { battleCard, mathCard, saveCanvas, shareCanvas } from './shareCard';

  const { S, L, R, uid, code, nick, me = null, gem = 0 }: { S: Store; L: LessonPack; R: Room; uid: string; code: string; nick: string; /** 서버 계정 (반 · 번호) — 없으면 이 기기(테스트 · 체험) */ me?: { S: Store; cls: string; num: number } | null; gem?: number } = $props();
  const now = untrack(() => S.now());
  const rows = $derived(lootRows(L, R, uid, now));
  // ── 전리품 숫자 (정식 lootOf) ──
  const look = untrack(() => savedLook());
  const lt = $derived.by(() => {
    const t0 = Number((R.meta as { created?: number }).created) || 0, p = partsOf(L, R, uid, now);
    const correct = p.parts.correct;
    let xp = xpOf(p.parts), xpTotal = 0, g = gemGuess(correct, p.perfects, !!p.parts.perfect), scroll = 0, day: number | null = null, gemTotal = gem, titles: string[] = [], first = false, raids = 1;
    if (me) {
      const xr = me.S.get<{ total?: number; log?: Record<string, { xp?: number }> }>(`xp/${me.cls}/${me.num}`) || {}, gr = me.S.get<{ total?: number; day?: Record<string, number>; log?: Record<string, { g?: number; s?: number; at?: number }> }>(`gem/${me.cls}/${me.num}`) || {};
      const lx = Number(xr.log?.[`raid_${code}`]?.xp); if (lx) xp = lx; xpTotal = Number(xr.total) || 0;
      const got = gotSince(gr.log, t0); if (gr.log) { g = got.gem; scroll = got.scroll; } day = Number(gr.day?.[kstDay(now)]) || 0; gemTotal = Number(gr.total) || 0;
      const recs = me.S.get<Record<string, { firstXp?: number; code?: string } | null>>(`records/${me.cls}/${me.num}`) || {}, mine = recs[L.id];
      raids = Object.values(recs).filter(Boolean).length || 1; first = !!mine?.firstXp && String(mine.code) === String(code) && raids <= 1;
      try { // 🔓 새 호칭 (정식: 캠프 「새 호칭」과 같은 기억 → 여기서 보면 캠프에서 다시 안 알림)
        const k = `citadel-ttl-seen-${me.cls}-${me.num}`, got2 = earnedFrom(titleData(me.S, me.cls, me.num)).filter((id) => !/^lv\d/.test(id)), seen = JSON.parse(localStorage.getItem(k) || 'null') as string[] | null;
        if (seen) titles = got2.filter((id) => !seen.includes(id)).map((id) => TITLES.find((t) => t.id === id)?.name ?? id);
        localStorage.setItem(k, JSON.stringify(got2));
      } catch { /* 무시 */ }
    } else xpTotal = xp;
    const lvA = level(xpTotal), lvB = level(Math.max(0, xpTotal - xp));
    const rooms = L.no ? castles.list.flatMap((P) => P.rooms.filter((rm) => rm.no === L.no && !rm.boss).map((rm) => rm.title || rm.id)) : [];
    const enh = Number(look.enh) || 0, nx = ENH[enh + 1];
    return { xp, gem: g, scroll, day, titles, rooms, goal: goalOf(enh, gemTotal, nx ? nx.g : null, rows), review: reviewN(rows), lv: lvA, up: !!me && lvA.lv > lvB.lv, first, raids };
  });
  const cards = $derived(SUBJ.forge ? SUBJ.forge.unit.CARDS.filter((c) => c.no === L.no).length : 0);
  // ── 상자 열림 · 줄마다 차례로 (정식 lootPlay · STEP 0.65초 · 숫자 0.52초) · 탭 = 건너뛰기만 ──
  const STEP = 650;
  let shown = $state(0), nums = $state<Record<string, number>>({}), done = $state(false), open = $state(false), cf = $state(0); // cf = 상자 칸 (0 닫힘 · 1 흔들림 · 2 열림)
  const keys = $derived(['xp', 'gem', 'scroll', ...(lt.titles.length ? ['ttl'] : []), ...(lt.rooms.length ? ['room'] : []), 'goal']);
  const to = (k: string) => (k === 'xp' ? lt.xp : k === 'gem' ? lt.gem : k === 'scroll' ? lt.scroll : 0);
  let timers: ReturnType<typeof setTimeout>[] = [];
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function finish() { if (done) return; done = true; cf = 2; timers.forEach(clearTimeout); shown = keys.length; nums = Object.fromEntries(keys.map((k) => [k, to(k)])); }
  $effect(() => {
    const ks = keys; untrack(() => {
      timers.forEach(clearTimeout); timers = []; open = true; cf = 0;
      if (reduce) { finish(); return; }
      [[120, 1], [240, 0], [360, 1], [480, 0], [600, 2]].forEach(([ms, f]) => timers.push(setTimeout(() => { if (!done) cf = f!; }, ms))); // 흔들림 2번 → 열림
      ks.forEach((k, i) => timers.push(setTimeout(() => {
        if (done) return; shown = i + 1; const T = to(k), t0 = performance.now();
        const tick = (t: number) => { if (done) return; const f = Math.min(1, (t - t0) / 520); nums = { ...nums, [k]: Math.round(T * f) }; if (f < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
        if (k === 'xp' && lt.up) setTimeout(() => sfx('skill-unlock', 0.8), 300);
        if (k === 'gem' && lt.gem) sfx('star', 0.6);
      }, 700 + i * STEP)));
      timers.push(setTimeout(finish, 700 + ks.length * STEP + 400));
    });
    return () => timers.forEach(clearTimeout);
  });
  const on = (k: string) => done || keys.indexOf(k) < shown;
  const n = (k: string) => (done ? to(k) : nums[k] ?? 0);
  const barW = $derived(on('xp') ? Math.round((100 * lt.lv.into) / lt.lv.next) : 0);
  // ── 자세히 ──
  const mark = (m: (typeof rows.mons)[number]) => m;
  const dots = (ok: number, total: number) => Array.from({ length: Math.min(total, 10) }, (_, i) => i < Math.round((ok / total) * Math.min(total, 10)));
  let imgFor = $state<string | null>(null);
  // ── 📤 카톡 카드 ──
  let card = $state<{ name: string; text: string; url: string; c: HTMLCanvasElement } | null>(null), making = $state('');
  const noT = $derived(L.no ? `${L.no}차시 ` : '');
  async function makeCard(kind: 'battle' | 'math') {
    making = kind;
    try {
      const c = kind === 'battle' ? await battleCard({ L, r: rows, name: nick, hero: look.hero, lv: lt.lv, gained: lt.xp, up: lt.up, first: lt.first, raids: lt.raids, words: String(R.words?.[uid]?.t ?? '') }) : await mathCard({ L, r: rows, subject: SUBJ.name });
      const name = kind === 'battle' ? `오늘의 전투 기록 · ${noT}${L.title}` : `오늘의 ${SUBJ.name} 노트 · ${noT}${L.title}`;
      const text = kind === 'battle' ? `⚔ 모두의 던전 ${noT}${L.title} 클리어! Lv.${lt.lv.lv} ${lt.lv.title}${lt.xp ? ` (+${lt.xp} EXP)` : ''}` : `📘 ${SUBJ.name} ${noT}${L.title} — 오늘 배운 것과 다음 수업`;
      card = { name, text, url: c.toDataURL('image/png'), c };
    } finally { making = ''; }
  }
</script>

<div class="bcard loot" class:done data-k="loot" role="button" aria-label="오늘의 전리품 (누르면 바로 보기)" onclick={finish} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') finish(); }} tabindex="0">
  <h2 class="lt-h">🎒 오늘의 전리품</h2>
  <p class="muted c">{noT}{L.title} · {nick}</p>
  <!-- 🎒 옛 정식 상자 그림 3칸 (11/17 #7): ① 닫힘 → ② 흔들림 2번 → ③ 열림 + 빛 → 줄마다 숫자 -->
  <div class="chest" class:open={cf === 2} class:shake={cf === 1} aria-hidden="true" data-k="loot-chest" data-f={cf}><i class="glow"></i><i class="cimg" style:background-image="url({CHEST.src})" style:background-position="{(cf / (CHEST.frames - 1)) * 100}% 0"></i></div>
  <div class="list">
    <div class="row" class:on={on('xp')} data-k="lt-xp"><span>⭐ EXP</span><b class="num">+{n('xp')}</b>
      <div class="lv" class:up={lt.up}><small>Lv.{lt.lv.lv} {lt.lv.title}{#if lt.up && on('xp')} <b class="upb">🎉 레벨 업!</b>{/if}</small><div class="bar"><i style:width="{barW}%"></i><span>{lt.lv.into} / {lt.lv.next}</span></div></div></div>
    <div class="row" class:on={on('gem')} data-k="lt-gem"><span>💎</span><b class="num">+{n('gem')}</b>{#if lt.day != null}<small class="muted">오늘 받은 💎 {lt.day} / {DAY_CAP}</small>{/if}</div>
    <div class="row" class:on={on('scroll')} data-k="lt-scroll"><span>📜 서술 조각</span>{#if lt.scroll}<b class="num">+{n('scroll')}</b>{:else}<small class="muted">✍ 서술형에 도전하면 📜!</small>{/if}</div>
    {#if lt.titles.length}<div class="row" class:on={on('ttl')}><span>🔓 새 호칭</span><b class="txt">{lt.titles.slice(0, 2).map((t) => `[${t}]`).join(' ')}{lt.titles.length > 2 ? ` 외 ${lt.titles.length - 2}개` : ''}</b></div>{/if}
    {#if lt.rooms.length}<div class="row" class:on={on('room')}><span>🏰 새 성채 방</span><b class="txt">{lt.rooms.length}개 <small>{lt.rooms.slice(0, 3).join(' · ')}{lt.rooms.length > 3 ? ` 외 ${lt.rooms.length - 3}개` : ''}</small></b></div>{/if}
    <div class="row goal" class:on={on('goal')}><span>🎯 다음 목표</span><b class="txt">{lt.goal}</b></div>
  </div>
  {#if lt.review}<p class="review" data-k="lt-review">📕 다시 볼 문제 <b>{lt.review}</b>개 → 수업이 끝나면 🎯 허수아비에서</p>{/if}
  {#if !done}<p class="skip muted">누르면 바로 보기</p>{/if}
</div>
<details class="bcard more" data-k="loot-more">
  <summary>자세히 ▸ <small class="muted">몬스터별 · 개념별 · 복습 추천 · 📤 카톡</small></summary>
  <p class="muted small">{L.title} — 성적이 아니라 다음에 볼 것을 알려 주는 기록이에요</p>
  {#if lt.first}<div class="perk"><b>🎁 첫 출정 특전!</b> 새 용사가 합류했어요 <span class="muted small">내 캠프 💎 상점에서 고를 수 있어요</span></div>{/if}
  <p class="sh">몬스터별</p>
  <table class="mt"><tbody>
    {#each rows.mons as m (m.id)}{@const x = mark(m)}<tr><td>{x.title}</td><td>{#if !x.tried}<span class="muted">— 안 함</span>{:else}{#if x.first}<span class="ok">✔ {x.first}</span>{/if} {#if x.fixed}<span class="fx">🔁 {x.fixed}</span>{/if} {#if x.miss}<span class="ng">✖ {x.miss}</span>{/if}{/if}</td></tr>{/each}
    {#if rows.boss}<tr><td>👑 형성평가</td><td>{#if rows.boss.tried}{rows.boss.mast.slice(0, rows.boss.hp).filter(Boolean).length} / {rows.boss.hp}{rows.boss.mast.length > rows.boss.hp && rows.boss.mast[rows.boss.hp] ? ' + 보너스 ✔' : ''}{:else}<span class="muted">— 안 함</span>{/if}</td></tr>{/if}
  </tbody></table>
  <p class="muted small">✔ 처음에 맞힘 · 🔁 재도전으로 고침 · ✖ 끝까지 못 맞힘</p>
  <p class="sh">개념별 (첫 시도)</p>
  {#each Object.entries(rows.conc) as [c, v] (c)}<div class="cc"><span>{rows.names[c] || c}</span><span class="dots">{#each dots(v[0], v[1]) as d, k (k)}<i class:on={d}></i>{/each}</span><span class="muted small">{v[0]} / {v[1]}</span></div>{/each}
  <p class="sh">복습 추천</p>
  {#if L.no}<p class="small">🔓 🎯 허수아비에서 <b>복습! {L.no}차시</b>가 열렸어요 — 수업 문제 · 👑 형성평가 재대결 <span class="muted">(내 캠프 · 혼자 도전)</span></p>{/if}
  {#if !rows.weak.length}<p class="ok">👍 오늘 개념을 고르게 잘 해냈어요! 🏰 성채던전 새 방에 도전해 보세요.</p>
  {:else}{#each rows.weak as c (c)}<div class="rec"><b>📌 {rows.names[c] || c}</b> <span class="muted small">첫 시도 {rows.conc[c]?.[0]} / {rows.conc[c]?.[1]}</span>
    <div class="rrow"><button type="button" class="mini" onclick={() => (imgFor = c)}>📄 학습지 개념 보기</button><span class="muted small">🎯 수업이 끝나면 허수아비에서 복습! {L.no}차시</span></div></div>{/each}{/if}
  <p class="sh">📤 카톡으로 보내기</p>
  <div class="rrow"><button type="button" class="mini" data-k="card-battle" disabled={!!making} onclick={() => makeCard('battle')}>{making === 'battle' ? '만드는 중…' : '⚔ 전투 기록 보내기'}</button><button type="button" class="mini" data-k="card-math" disabled={!!making} onclick={() => makeCard('math')}>{making === 'math' ? '만드는 중…' : `📘 ${SUBJ.name} 노트 보내기`}</button></div>
  {#if cards}<p class="small forge">⚒ 오늘 배운 개념 카드 <b>{cards}장</b>이 모루에서 기다려요</p>{/if}
</details>
{#if imgFor}
  <Sheet onclose={() => (imgFor = null)} mainText="닫기" tall>{#snippet title()}📄 {rows.names[imgFor!] || ''}{/snippet}<PrepImg {S} {L} id={imgFor} alt="학습지"><p class="muted">아직 이 개념의 학습지 그림이 없어요.</p></PrepImg></Sheet>
{/if}
{#if card}
  <Sheet onclose={() => (card = null)} mainText="💬 카카오톡으로 보내기" onmain={() => card && void shareCanvas(card.c, card.name, card.text)} tall>
    {#snippet title()}{card!.name}{/snippet}
    <img class="cimg" src={card.url} alt={card.name} />
    <button type="button" class="mini" onclick={() => card && saveCanvas(card.c, card.name)}>💾 이미지 저장</button>
    <p class="muted small">공유 창에서 <b>카카오톡 → 나와의 채팅</b>을 고르면 나에게 보낼 수 있어요.</p>
  </Sheet>
{/if}

<style>
  .loot { cursor: default; text-align: left; }
  .lt-h { margin: 0; text-align: center; font-size: 22px; color: var(--accent); }
  .c { text-align: center; margin: 0; }
  .chest { position: relative; width: 112px; height: 112px; margin: 0 auto; }
  .chest .cimg { position: absolute; inset: 0; background-size: 300% 100%; background-repeat: no-repeat; image-rendering: pixelated; }
  .chest.shake .cimg { animation: chestShake 0.12s steps(2) infinite; }
  @keyframes chestShake { 0% { transform: translateX(-3px) rotate(-3deg); } 100% { transform: translateX(3px) rotate(3deg); } }
  .chest .glow { position: absolute; left: 50%; top: 45%; width: 0; height: 0; border-radius: 50%; background: radial-gradient(#fff6c0, #ffcf5a00 70%); transform: translate(-50%, -50%); transition: width 0.5s, height 0.5s; }
  .chest.open .glow { width: 170px; height: 130px; }
  .list { display: flex; flex-direction: column; gap: var(--s2); margin-top: var(--s2); }
  .row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s2); padding: 10px 12px; border-radius: var(--r); background: var(--surface-2); opacity: 0; transform: translateY(8px); transition: opacity var(--t), transform var(--t); }
  .row.on { opacity: 1; transform: none; }
  .row > span { font-weight: 700; min-width: 5.5em; }
  .row .num { font-size: 22px; color: var(--accent); font-variant-numeric: tabular-nums; }
  .row .txt { font-size: 15px; }
  .row.goal { background: color-mix(in srgb, var(--accent) 16%, var(--surface-2)); }
  .lv { flex-basis: 100%; }
  .lv small { font-weight: 700; }
  .upb { color: #ff5a8a; }
  .bar { position: relative; height: 16px; border-radius: 8px; background: var(--surface); overflow: hidden; margin-top: 4px; }
  .bar i { position: absolute; inset: 0 auto 0 0; background: linear-gradient(90deg, #ffb000, #ffe48a); transition: width 0.8s ease-out; }
  .bar span { position: relative; display: block; text-align: center; font-size: 12px; line-height: 16px; font-weight: 700; color: var(--text); }
  .review { margin: var(--s2) 0 0; padding: 10px 12px; border-radius: var(--r); background: color-mix(in srgb, var(--bad) 14%, var(--surface-2)); }
  .skip { text-align: center; margin: var(--s2) 0 0; }
  .more summary { font-weight: 700; cursor: pointer; min-height: var(--tap); display: flex; align-items: center; gap: var(--s2); }
  .sh { margin: var(--s3) 0 var(--s1); font-weight: 800; color: var(--accent); }
  .mt { width: 100%; border-collapse: collapse; font-size: 15px; }
  .mt td { padding: 6px 4px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .mt td:last-child { white-space: nowrap; text-align: right; }
  .ok { color: var(--ok); font-weight: 700; } .fx { color: var(--accent); font-weight: 700; } .ng { color: var(--bad); font-weight: 700; }
  .cc { display: grid; grid-template-columns: 1fr auto auto; gap: var(--s2); align-items: center; padding: 4px 0; font-size: 15px; }
  .dots { display: flex; gap: 3px; } .dots i { width: 10px; height: 10px; border-radius: 5px; background: var(--surface-2); } .dots i.on { background: var(--ok); }
  .rec { padding: var(--s2) 0; border-bottom: 1px solid var(--line); }
  .rrow { display: flex; flex-wrap: wrap; gap: var(--s2); align-items: center; margin-top: 6px; }
  .mini { min-height: var(--tap); padding: 0 14px; border-radius: var(--r); border: 2px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .mini:disabled { opacity: 0.5; box-shadow: none; }
  .perk { padding: 10px 12px; border-radius: var(--r); background: color-mix(in srgb, var(--accent) 18%, var(--surface-2)); }
  .forge { margin-top: var(--s2); }
  .cimg { display: block; width: 100%; height: auto; border-radius: 8px; margin-bottom: var(--s2); }
  @media (prefers-reduced-motion: reduce) { .row, .chest .glow, .bar i { transition: none; } .chest.shake .cimg { animation: none; } }
</style>
