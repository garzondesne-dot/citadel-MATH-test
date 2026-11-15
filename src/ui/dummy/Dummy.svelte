<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { PACKS } from '../../engine/packs';
  import { SUBJ } from '../../engine/subject';
  import { PROFILES } from '../../model/profiles';
  import { memoryStore } from '../../store/device';
  import { earnDaily } from '../../model/wallet';
  import { GEM, kstDay, boardPack, stepDone } from '../../board/board';
  import { nextStep, openRoom, roomPath } from '../../raid/actions';
  import { answerOf, BOSS_ID, bossState, chainRecord, isChain, isEnd, isLobby, itemsFor, plainRecord } from '../../raid/raid';
  import { TEST_ADDR } from '../../channel';
  import { bonusBase } from '../../school/castle';
  import { meBound } from '../../store/meSync';
  import { DUMMY_G, dummyReward, fieldIds, noteOf, OPEN, type Bon, type Rec } from '../../school/dummy';
  import { seals } from '../../model/titles';
  import { lastClass, lastTest } from '../../school/school';
  import { NOTE_ICON } from '../manifest';
  import { liveRoom } from '../room.svelte';
  import Student from '../Student.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import Vid from '../q/Vid.svelte';
  import PrepImg from '../q/PrepImg.svelte';
  import { busy } from '../busy.svelte';

  // 🎯 복습 허수아비 = 옛 정식 그대로 (📜 2026-11-15 선생님 「A」 · 머리 🔨 · 정식 js/raid/bonus.js renderTrain · fight · win · note.js)
  //   차시 카드마다: 「🎯 복습! n차시 · 제목」 + ❗ 남은 문제 n / ✔ 복습 완료 · 🏆 업적 도장 · 📚 개념 다시 보기 · ⚒ 이 차시 카드 · 📕 수업 · 형성평가 칩 줄
  //   칸마다: 상태 아이콘 + 이유(틀림 · 안 풂 · 맞힘 · 고침 · 보충) · ❗ · 💎 꼬리표 · 「⚔ 풀기」(틀림 · 안 풂 · 👑 = 주요) — 틀림 · 안 풂이 위 → 👑 → 나머지
  //   맨 위: 「n 남은 복습 문제 ▶ 바로 풀기」 · 보상 줄(💎 +3 오늘 n번 남음 · 👑 +14 · 🏆 +12 · 📕 +7 · 🎁 +4) · 기록이 없으면 「선생님이 수업을 열면…」
  //   한 판 = 문제 하나(정식 1:1) · 기회 4번(레이드와 같음) · 수업 문제 = 처음부터 숫자 바꿈 · 👑 첫 도전 = 학습지 숫자 · 레이드 학생 화면(Student) 그대로
  //   보상 · 기록 = school/dummy.ts (정식 키 · 서버 bonus · gem log) · ✏ 친구가 낸 문제 = v1.0 출제 공방이 아직 없어 칸 없음(정식도 문제가 없으면 안 보임)
  const { S, me, save, uid, num, cls, onclose, onforge }: { S: Store; me: Me; save: () => void; uid: string; num: number; cls: string; onclose: () => void; /** ⚒ 이 차시 카드 → 모루 */ onforge?: () => void } = $props();
  const recs = untrack(() => (cls && num ? S.get<Record<string, Rec>>(`records/${cls}/${num}`) : null) || {});
  const reach = Math.max(0, ...Object.keys(recs).map((id) => PACKS.find((p) => p.id === id)?.no ?? 0), Number(untrack(() => (cls ? lastClass(S, cls)?.no : 0))) || 0, Number(untrack(() => (cls ? lastTest(S, cls)?.no : 0))) || 0);
  const LESSONS = PACKS.filter((p) => p.steps.some((s) => s.kind === 'monster') || p.boss);
  const recOf = (p: LessonPack): Rec | undefined => recs[p.id] ?? (p.partOf ? recs[p.partOf] : undefined);
  const isOpen = (p: LessonPack) => !cls || !!recOf(p) || p.no <= reach;
  const WHY: Record<string, string> = { x: '틀림 (기회를 다 씀)', '-': '안 풂 (먼저 나감 · 늦게 옴)', n: '안 풂 (수업 시간 부족)', a: '안 풂 (불참)', o: '한 번에 맞힘', f: '재도전으로 고침', p: '보충 완료' };

  // 서버 칸: 묶인 학생 = 서버(정식 키) · 묶이지 않은 폰(교사 · 시험 · 이 기기) = 이 폰에만(같은 규칙 · 같은 키)
  const LOGK = 'citadel-v1-dummy-log', BONK = 'citadel-v1-dummy-bonus';
  const bnd = untrack(() => meBound()), RS = bnd?.S ?? S, base = bnd ? bonusBase(bnd.cls, bnd.num) : '', gemLogP = bnd ? `gem/${bnd.cls}/${bnd.num}/log` : '';
  const readLocal = <T,>(k: string): T => { try { return JSON.parse(localStorage.getItem(k) || '{}') as T; } catch { return {} as T; } };
  let ver = $state(0); // 한 판 뒤 다시 그림
  const bonAll = (): Record<string, Bon> => (void ver, (base ? RS.get<Record<string, Bon>>(base) : readLocal<Record<string, Bon>>(BONK)) || {});
  const logNow = (): Record<string, unknown> => (void ver, (gemLogP ? RS.get<Record<string, unknown>>(gemLogP) : readLocal<Record<string, unknown>>(LOGK)) || {});
  const today = () => kstDay(S.now());

  // ── 목록 (정식 renderTrain) ──
  type Row = { id: string; title: string; st: string | null; need: boolean; bossNeed: boolean; clear: boolean };
  type Card = { L: LessonPack; x: ReturnType<typeof noteOf>; sealed: boolean; rows: Row[]; cards: [number, number] };
  const view = $derived.by(() => {
    const all = bonAll(), log = logNow(), sl = seals(all as Parameters<typeof seals>[0]);
    const cardsOf = (L: LessonPack): [number, number] => { const cs = (SUBJ.forge?.unit.CARDS || []).filter((c) => (c as { no?: number }).no === L.no); return [cs.filter((c) => (me.cards || {})[c.id]).length, cs.length]; };
    const cards: Card[] = LESSONS.filter(isOpen).map((L) => {
      const bon = all[L.id] || {}, x = noteOf(L, recOf(L), bon), ids = [...fieldIds(L), ...(L.boss ? [BOSS_ID] : [])];
      const stOf = (id: string) => (id === BOSS_ID || x.none ? null : x.mons[x.ids.indexOf(id)] ?? null);
      const rows: Row[] = ids.map((id) => { const st = stOf(id); return { id, title: id === BOSS_ID ? '형성평가 재대결' : (L.steps.find((s) => s.id === id)?.title ?? id).split(' · ').pop() ?? id, st, need: !!st && OPEN.has(st), bossNeed: id === BOSS_ID && !bon[BOSS_ID]?.clear, clear: !!bon[id]?.clear }; });
      const o = (r: Row) => (r.need ? 0 : r.id === BOSS_ID ? 1 : 2);
      return { L, x, sealed: sl.includes(L.id), rows: rows.slice().sort((a, b) => o(a) - o(b)), cards: cardsOf(L) };
    }).sort((a, b) => (b.x.left ? 1 : 0) - (a.x.left ? 1 : 0) || b.L.no - a.L.no);
    const left = cards.reduce((t, c) => t + (c.x.none ? 0 : c.x.left), 0);
    const reviewLeft = Math.max(0, DUMMY_G.reviewDay - Object.keys(log).filter((k) => k.startsWith(`review_${today()}_`)).length);
    const c0 = cards.find((c) => !c.x.none && c.x.left), go0 = c0 ? (c0.rows.find((r) => r.need)?.id ?? BOSS_ID) : null;
    return { cards, left, reviewLeft, log, seals: sl.length, go: c0 && go0 ? { L: c0.L, mid: go0 } : null };
  });

  // ── 한 판 = 문제 하나 (정식 fight) ──
  type Run = { L0: LessonPack; L: LessonPack; mid: string; S: Store; code: string };
  let run = $state<Run | null>(null), res = $state<{ L: LessonPack; title: string; clear: boolean; got: number; xp: number; why: string[]; sealed: boolean } | null>(null), shelf = $state<LessonPack | null>(null);
  function fight(L0: LessonPack, mid: string) {
    const BL = boardPack(L0), L = { ...BL, steps: BL.steps.filter((s) => (mid === BOSS_ID ? s.kind === 'boss' : s.id === mid)) };
    if (!L.steps.length) return;
    const S2: Store = { ...memoryStore(), kind: 'memory' as const }, code = `D${Date.now() % 1e6}`, b0 = bonAll()[L0.id]?.[mid];
    openRoom(S2, L, code, PROFILES.board);
    const first = !b0?.tries && !b0?.clear; // 정식: 수업 문제 = 처음부터 숫자 바꿈 · 👑 첫 도전 = 학습지 숫자
    S2.set(`${roomPath(code)}/meta/fresh`, { [mid]: mid !== BOSS_ID || !first });
    S2.set(`${roomPath(code)}/meta/dummy`, true);
    S2.set(`${roomPath(code)}/meta/retries`, 3); S2.set(`${roomPath(code)}/meta/bossTries`, 3); S2.set(`${roomPath(code)}/meta/think`, 0); S2.set(`${roomPath(code)}/meta/solve`, 0);
    run = { L0, L, mid, S: S2, code }; res = null;
    // 🧪 시험 고리(시험 주소만 · 출시 막는 것 9): 이 판의 몬스터를 첫 시도에 다 맞힘으로 (e2e 가 서버 기록 · 보상을 확인)
    if (TEST_ADDR) (globalThis as { __dummyPerfect?: (mid: string) => void }).__dummyPerfect = (m) => { const RR = S2.get<Room>(roomPath(code)); if (RR) S2.set(`${roomPath(code)}/subs/${m}/${uid}/0`, itemsFor(L, RR, m, uid, 0).map(answerOf)); };
  }
  let lr: ReturnType<typeof liveRoom> | null = null, drive: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    const r = run; if (!r) return;
    untrack(() => busy.n++); // 진행 중 = 새 판 저절로 새로 고침 안 함 (#38)
    untrack(() => {
      lr = liveRoom(r.S, r.code);
      drive = setInterval(() => {
        const RR = r.S.get<Room>(roomPath(r.code)); if (!RR) return;
        if (isLobby(RR) || (!isEnd(r.L, RR) && stepDone(r.L, RR, uid))) { nextStep(r.S, r.L, r.code); return; }
        if (isEnd(r.L, RR)) finish(r, RR);
      }, 300);
    });
    return () => { untrack(() => busy.n--); if (drive) clearInterval(drive); lr?.stop(); };
  });
  /** 이번 판에 처치했나 · 낸 답이 있나 */
  function outcome(r: Run, RR: Room): { clear: boolean; tried: boolean } {
    if (r.mid === BOSS_ID) { const st = bossState(r.L, RR, uid); return { clear: st.length > 0 && st.every((x) => x.ok), tried: !!RR.subs?.[BOSS_ID]?.[uid] }; }
    if (isChain(r.L, RR, r.mid)) { const c = chainRecord(r.L, RR, r.mid, uid); return { clear: !!c.done, tried: !!c.done || !!c.fail || c.nextK > 0 }; }
    const p = plainRecord(r.L, RR, r.mid, uid); return { clear: p.perfect, tried: p.tries.length > 0 };
  }
  function credit(r: Run, RR: Room) {
    const o = outcome(r, RR), L0 = r.L0, day = today(), at = S.now(), bonL = { ...(bonAll()[L0.id] || {}) }, old = bonL[r.mid] || {};
    if (!o.tried) return null;
    const sealedBefore = !!bonL[BOSS_ID]?.clear;
    // 기록 (정식 bonus.js: 판마다 tries +1 · 처치 = clear)
    const rec = { ...old, tries: (Number(old.tries) || 0) + 1, at, ...(o.clear || old.clear ? { clear: true } : {}) };
    if (base) RS.set(`${base}/${L0.id}/${r.mid}`, rec);
    else { const all = readLocal<Record<string, Bon>>(BONK); all[L0.id] = { ...(all[L0.id] || {}), [r.mid]: rec }; try { localStorage.setItem(BONK, JSON.stringify(all)); } catch { /* 무시 */ } }
    const why: string[] = []; let got = 0, xp = 0;
    if (o.clear) {
      const log = logNow(), rw = dummyReward(L0, recOf(L0), bonL, [r.mid], log, day), localLog = gemLogP ? null : { ...log };
      for (const g of rw.gems) {
        const n = g.free ? ((me.wallet.gem += g.n), g.n) : earnDaily(me.wallet, g.n, day, GEM.dayCap);
        if (!n) continue; got += n; why.push(`💎 +${n} ${g.why}`);
        if (gemLogP) RS.set(`${gemLogP}/${g.key}`, { g: n, at, why: g.why }); else localLog![g.key] = { g: n, at, why: g.why };
      }
      if (localLog) try { localStorage.setItem(LOGK, JSON.stringify(localLog)); } catch { /* 무시 */ }
      xp = rw.xp; me.xp += xp; save();
    }
    ver++;
    const title = r.mid === BOSS_ID ? '👑 형성평가 재대결' : (r.L.steps[0]?.title ?? r.mid);
    return { L: L0, title, clear: o.clear, got, xp, why, sealed: o.clear && r.mid === BOSS_ID && !sealedBefore };
  }
  function finish(r: Run, RR: Room) { if (drive) clearInterval(drive); drive = null; res = credit(r, RR); run = null; }
  /** ‹ 그만하기 = 낸 답이 있으면 한 판으로 셈 (정식: 판마다 기록) */
  function quit() { const r = run; if (!r) return; const RR = r.S.get<Room>(roomPath(r.code)); const c = RR ? credit(r, RR) : null; run = null; if (c?.clear) res = c; }
  onDestroy(() => { if (drive) clearInterval(drive); lr?.stop(); });

  const icon = (k: string) => { const i = NOTE_ICON.idx[k] ?? 2; return `background-image:url(${NOTE_ICON.src});background-size:${NOTE_ICON.n * 100}% 100%;background-position:${(i / (NOTE_ICON.n - 1)) * 100}% 0`; };
  const stepTitle = (L: LessonPack, id: string) => (L.steps.find((s) => s.id === id)?.title ?? id);
  const concepts = (L: LessonPack) => L.steps.filter((s) => s.kind === 'concept');
  let shelfOn = $state('');
</script>

{#if run}
  <div class="drun" data-dummy>
    <button type="button" class="quit" aria-label="그만하기" onclick={quit}>‹</button>
    <Student S={run.S} L={run.L} code={run.code} {uid} {num} nick={me.nick} {cls} board />
  </div>
{:else if res}
  <Sheet onclose={() => (res = null)} mainText="🎯 허수아비로" onmain={() => (res = null)}>
    {#snippet title()}{res?.clear ? '🎉 처치!' : '💧 이번엔 못 잡았어요'}{/snippet}
    <p class="rt">{res.L.no}차시 · {res.title}</p>
    {#if res.sealed}<p class="gold">🏆 {res.L.no}차시 업적을 달성했어요!</p>{/if}
    {#if res.clear}
      <ul class="got" data-k="dummy-got">{#if res.xp}<li class="xp">+{res.xp} EXP</li>{/if}{#each res.why as w (w)}<li>{w}</li>{/each}</ul>
      {#if !res.xp && !res.why.length}<p class="muted">이미 받은 보상이에요 · 💎 은 틀림 · 안 푼 문제를 해결하면 받아요</p>{/if}
    {:else}<p class="muted">벌은 없어요 · 다시 풀면 숫자가 바뀌어 나와요</p>{/if}
  </Sheet>
{:else if shelf}
  <Sheet onclose={() => (shelf = null)} tall mainText="허수아비로" onmain={() => (shelf = null)}>
    {#snippet title()}📚 {shelf?.no}차시 개념 다시 보기{/snippet}
    <div class="shelf" data-k="dummy-shelf">
      {#each concepts(shelf) as c (c.id)}
        <div class="cp"><b>{c.title}</b><span class="cpb">{#if shelf.videos?.[c.id]}<button type="button" class="mini" onclick={() => (shelfOn = shelfOn === `v${c.id}` ? '' : `v${c.id}`)}>🎬 영상</button>{/if}<button type="button" class="mini" onclick={() => (shelfOn = shelfOn === `i${c.id}` ? '' : `i${c.id}`)}>📄 학습지</button></span></div>
        {#if shelfOn === `v${c.id}` && shelf.videos?.[c.id]}<Vid {S} url={shelf.videos[c.id]!} autoplay />{/if}
        {#if shelfOn === `i${c.id}`}<PrepImg {S} L={shelf} id={c.id} alt={c.title}><p class="muted">아직 이 개념의 학습지 그림이 없어요</p></PrepImg>{/if}
      {:else}<p class="muted">이 차시에는 개념 칸이 없어요</p>{/each}
    </div>
  </Sheet>
{:else}
  <Sheet {onclose} tall mainText={view.go ? '▶ 바로 풀기' : '닫기'} onmain={view.go ? () => fight(view.go!.L, view.go!.mid) : onclose}>
    {#snippet title()}🎯 복습 허수아비 <span class="seal">🏆 업적 {view.seals}개</span>{/snippet}
    <div class="dl" data-k="dummy-list">
      <p class="fx">배운 차시의 <b>수업 문제를 숫자만 바꿔</b> 다시 풀어요. 틀림 · 안 푼 문제를 맞히면 📕 오답노트에 <b>복습 완료</b>! 👑 형성평가 재대결을 처치하면 🏆 업적.</p>
      {#if view.left && cls}<div class="todo" data-k="dummy-todo"><b>{view.left}</b><span>남은 복습 문제<small>틀림 · 안 푼 문제가 숫자를 바꿔서 나와요</small></span></div>{/if}
      <p class="gl" data-k="dummy-gems">💎 틀림 · 안 푼 문제를 맞히면 <b>+{DUMMY_G.review}</b> (오늘 <b>{view.reviewLeft}</b>번 남음) · 👑 재대결 <b>+{DUMMY_G.bossRe}</b> + 🏆 업적 <b>+{DUMMY_G.seal}</b> · 📕 차시 복습 완료 <b>+{DUMMY_G.note}</b>{#if !view.log.firstreview}{' · '}🎁 첫 복습 <b>+{DUMMY_G.first}</b> 더!{/if}</p>
      {#each view.cards as c (c.L.id)}
        <section class="card" class:left={c.x.left && !c.x.none} class:sealed={c.sealed} data-lesson={c.L.id}>
          <p class="h"><b>🎯 복습! {c.L.no}차시 · {c.L.title.replace(/^\d+차시\s*/, '')}</b>
            {#if !c.x.none}{#if c.x.left}<span class="cnt">❗ 남은 문제 {c.x.left}</span>{#if !view.log[`note_${c.L.id}`]}<em class="tag">💎 +{DUMMY_G.note} 다 풀면</em>{/if}{:else}<span class="cnt ok" data-k="dummy-done">✔ 복습 완료</span>{/if}{/if}
            {#if c.sealed}<span class="stamp">🏆 업적</span>{/if}</p>
          <div class="cpts"><button type="button" class="mini" onclick={() => { shelf = c.L; shelfOn = ''; }}>📚 개념 다시 보기 (🎬 · 📄)</button>{#if c.cards[1] && cls}<button type="button" class="mini" onclick={() => onforge?.()}>⚒ 이 차시 개념 카드 {c.cards[0]} / {c.cards[1]} · 모루로 ▶</button>{/if}</div>
          {#if !c.x.none}<div class="nt"><span>수업</span>{#each c.x.mons as st, i (i)}<i class="ni chip" class:blink={OPEN.has(st)} style={icon(st)} title="{stepTitle(c.L, c.x.ids[i] ?? '')} · {WHY[st] ?? ''}"></i>{/each}</div>
            {#if c.x.hp}<div class="nt"><span>형성평가</span>{#each c.x.boss as st, i (i)}{#if st}<i class="ni chip" class:blink={OPEN.has(st)} style={icon(st)} title="{i + 1}번 · {WHY[st] ?? '⭐ 도전 문항 맞힘'}"></i>{/if}{/each}</div>{/if}{/if}
          <ul class="rows">
            {#each c.rows as r (r.id)}
              <li class:open={r.need} class:clear={!r.need && (r.clear || !!r.st)} class:boss={r.id === BOSS_ID} data-mid={r.id}>
                {#if r.st}<i class="ni" class:blink={r.need} style={icon(r.st)} aria-hidden="true"></i>{:else}<span class="mi" aria-hidden="true">{r.id === BOSS_ID ? '👑' : r.clear ? '✔' : '🎯'}</span>{/if}
                <span class="tx">{#if r.need}<b class="ex">❗</b> {/if}{r.title}{#if r.st}<small> · {WHY[r.st] ?? ''}</small>{/if}
                  {#if r.need && view.reviewLeft}<em class="tag">💎 +{DUMMY_G.review}</em>{:else if r.bossNeed && !view.log[`bossre_${c.L.id}`]}<em class="tag">💎 +{DUMMY_G.bossRe + (c.sealed ? 0 : DUMMY_G.seal)}</em>{/if}{#if r.bossNeed && !c.sealed}<em class="tag seal">🏆 업적</em>{/if}</span>
                <button type="button" class="go" class:main={r.need || r.bossNeed} onclick={() => fight(c.L, r.id)}>{r.need || r.bossNeed ? '⚔ 풀기' : '다시'}</button>
              </li>
            {/each}
          </ul>
        </section>
      {:else}<p class="muted">선생님이 우리 반 수업을 열면 그 차시를 복습할 수 있어요.</p>{/each}
    </div>
  </Sheet>
{/if}

<style>
  .drun { position: fixed; inset: 0; z-index: 20; background: var(--bg); overflow: auto; }
  .quit { position: fixed; z-index: 30; left: 4px; top: 4px; width: 44px; height: 44px; border: 0; background: none; color: #fff; font-size: 28px; text-shadow: 0 1px 2px #000; }
  .seal { margin-left: 6px; font-size: 13px; color: var(--accent); font-weight: 700; }
  .dl { display: flex; flex-direction: column; gap: var(--s3); }
  .fx { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-2); } .fx b { color: var(--text); }
  .todo { display: flex; align-items: center; gap: var(--s3); padding: var(--s3); border-radius: var(--r); border: 2px solid var(--bad); background: color-mix(in srgb, var(--bad) 12%, var(--surface)); }
  .todo > b { font-size: 32px; font-weight: 900; color: var(--bad); min-width: 40px; text-align: center; }
  .todo span { display: flex; flex-direction: column; font: 700 16px var(--font); } .todo small { font-weight: 500; font-size: 13px; color: var(--text-2); }
  .gl { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-2); } .gl b { color: var(--gem); }
  .card { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--line, #2f3440); }
  .card.left { border-color: color-mix(in srgb, var(--bad) 60%, var(--line, #2f3440)); }
  .h { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; } .h > b { font-size: 15px; flex: 1 1 100%; }
  .cnt { font: 700 13px var(--font); color: var(--bad); } .cnt.ok { color: var(--ok); }
  .stamp { font: 700 12px var(--font); color: var(--accent); border: 1px solid var(--accent); border-radius: 10px; padding: 0 6px; }
  .tag { font-style: normal; font: 700 12px var(--font); color: var(--gem); border: 1px solid color-mix(in srgb, var(--gem) 50%, transparent); border-radius: 10px; padding: 0 6px; margin-left: 4px; white-space: nowrap; }
  .tag.seal { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 50%, transparent); }
  .cpts { display: flex; flex-wrap: wrap; gap: 6px; }
  .mini { min-height: 36px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
  .nt { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; } .nt span { font-size: 12px; color: var(--text-3); min-width: 52px; }
  .ni { display: inline-block; width: 28px; height: 28px; flex: none; image-rendering: pixelated; } .ni.chip { width: 22px; height: 22px; }
  .blink { animation: ntb 1.2s ease-in-out infinite alternate; } @keyframes ntb { to { opacity: 0.45; } }
  .rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .rows li { display: flex; align-items: center; gap: var(--s2); min-height: 52px; padding: 4px var(--s2); border-radius: 10px; background: var(--surface-2); }
  .rows li.open { border: 1px solid color-mix(in srgb, var(--bad) 55%, transparent); }
  .rows li.clear .tx { color: var(--text-2); }
  .mi { width: 28px; text-align: center; font-size: 18px; flex: none; }
  .tx { flex: 1; min-width: 0; font-size: 14px; line-height: 1.35; } .tx small { color: var(--text-3); font-size: 12px; } .ex { color: var(--bad); }
  .go { flex: none; min-height: 40px; min-width: 64px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--line, #2f3440); background: var(--surface); color: var(--text); font: 700 14px var(--font); }
  .go.main { background: var(--accent); color: var(--on-accent, #1d1406); border-color: var(--accent); box-shadow: 0 3px 0 var(--accent-sh, #9a6a10); }
  .rt { margin: 0; text-align: center; font: 700 16px var(--font); }
  .gold { margin: 0; text-align: center; color: var(--accent); font-weight: 700; }
  .got { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; align-items: center; } .got li { font: 700 15px var(--font); color: var(--gem); } .got li.xp { color: var(--accent); }
  .muted { margin: 0; color: var(--text-3); font-size: 14px; text-align: center; }
  .shelf { display: flex; flex-direction: column; gap: var(--s2); }
  .cp { display: flex; align-items: center; justify-content: space-between; gap: var(--s2); min-height: 48px; padding: 4px var(--s2); border-radius: 10px; background: var(--surface-2); } .cp b { font-size: 14px; } .cpb { display: flex; gap: 6px; flex: none; }
</style>
