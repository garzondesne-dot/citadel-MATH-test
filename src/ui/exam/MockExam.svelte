<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Given, LessonPack, Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import QItem from '../q/QItem.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import { EXAM_TXT } from '../../school/examEvent';
  import { EXAM_ART } from '../manifest';
  import { MOCK_GEM, MOCK_MS, MOCK_N, bankOf, drawMock, gradeMock, mergeMock, mockPath, type MockQ, type MockRec } from '../../school/mockExam';
  import { answerOf } from '../../raid/raid';
  import { earnDaily } from '../../model/wallet';
  import { GEM, kstDay } from '../../board/board';
  import { sfx } from '../sound.svelte';
  import { TEST_ADDR } from '../../channel';
  // 📄 모의 시험지 마왕전 (📜 2026-11-25 · 머리 🔨): 시작 화면(안내 고정 문구) → 시험지(흰 종이 · 번호 · 25:00 · 문항 사이 자유 이동 · 맨 끝 제출)
  //   → 한꺼번에 채점 → 마왕 체력이 맞힌 수만큼 깎임 · 10/10 = 쓰러짐 → 틀린 문항 = 정답 · 풀이 · 「그 차시 허수아비로」 → 🔥 다시 도전(새 숫자)
  //   힌트 · 근거 줄 · 기술 · 정찰 · 몬스터 공격 없음 · 기록 = 나만(base 가 있을 때 · bonus/…/mock) · 💎 = 허수아비 복습과 같은 값
  const { S, packs, reach, base = null, me, save, onclose, onreview }: { S: Store; packs: readonly LessonPack[]; reach: number; base?: string | null; me: Me; save: () => void; onclose: () => void; onreview: (lid: string) => void } = $props();
  const T = EXAM_TXT.mock, bank = untrack(() => bankOf(packs, reach)), byId = untrack(() => new Map(packs.map((L) => [L.id, L])));
  let phase = $state<'intro' | 'paper' | 'result'>('intro'), qs = $state<MockQ[]>([]), given = $state<Given[]>([]), t0 = $state(0), now = $state(Date.now()), ask = $state(false);
  let res = $state<{ ok: boolean[]; n: number; gem: number } | null>(null), hp = $state(1);
  let rec = $state<MockRec | null>(untrack(() => (base ? S.get<MockRec>(mockPath(base)) : null)));
  const tick = setInterval(() => (now = Date.now()), 500); onDestroy(() => clearInterval(tick));
  const left = $derived(Math.max(0, MOCK_MS - (now - t0))), over = $derived(phase === 'paper' && now - t0 >= MOCK_MS);
  const mmss = (ms: number) => `${String(Math.floor(ms / 60e3)).padStart(2, '0')}:${String(Math.floor((ms % 60e3) / 1e3)).padStart(2, '0')}`;
  const blanks = $derived(given.filter((g) => g == null || g === '' || (Array.isArray(g) && !g.length)).length);
  function start() { sfx('mon-appear-boss', 0.6); qs = drawMock(packs, bank, Math.random, MOCK_N, `m${Date.now().toString(36)}`); given = qs.map(() => null); t0 = Date.now(); now = t0; ask = false; res = null; hp = 1; phase = 'paper'; scrollTo?.({ top: 0 }); }
  function submit() {
    if (blanks && !ask) { ask = true; return; }
    const g = gradeMock(qs, given), at = Date.now();
    let gem = 0;
    if (base && g.n > 0) { const day = kstDay(at), log = S.get<Record<string, unknown>>(`${base.replace(/^bonus\//, 'gem/')}/log`) || {}, done = Object.keys(log).filter((k) => k.startsWith(`mock_${day}_`)).length; if (done < MOCK_GEM.dayMax) { gem = earnDaily(me.wallet, MOCK_GEM.per, day, GEM.dayCap); if (gem) { S.set(`${base.replace(/^bonus\//, 'gem/')}/log/mock_${day}_${done}`, { g: gem, at, why: '📄 모의 시험지' }); save(); } } }
    if (base) { const r = mergeMock(rec, g.n, g.wrongBy, at); S.set(mockPath(base), r); rec = r; } else rec = mergeMock(rec, g.n, g.wrongBy, at);
    res = { ok: g.ok, n: g.n, gem }; phase = 'result'; scrollTo?.({ top: 0 });
    hp = 1; setTimeout(() => { hp = 1 - g.n / qs.length; sfx(g.n === qs.length ? 'finish' : 'smash', 0.6); }, 500);
  }
  if (TEST_ADDR) (globalThis as { __mock?: unknown }).__mock = { fill: (n = MOCK_N) => { given = qs.map((m, i) => (i < n ? answerOf(m.q) : null)); } }; // 🧪 시험 주소만: 앞 n 문항 정답 채우기
  const jump = (i: number) => document.querySelector(`[data-k="mx-q"][data-i="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const lessonName = (lid: string) => { const L = byId.get(lid); return L ? `${L.no}차시 ${L.title}` : lid; };
  const frame = $derived(phase === 'result' && res && res.n === qs.length ? 3 : phase === 'result' && hp < 1 ? 2 : 0);
</script>

<div class="mx" data-k="mock-exam" data-phase={phase} style:--bg="url({EXAM_ART.bg})">
  <header class="top">
    <button type="button" class="back" aria-label="닫기" onclick={onclose}>‹</button>
    <b class="ttl">{T.name}</b>
    {#if phase === 'paper'}<span class="tm" class:over data-k="mx-time">{over ? T.timeUp : `⏱ ${mmss(left)}`}</span>{/if}
  </header>

  {#if phase === 'intro'}
    <section class="intro">
      <i class="boss" style="background-image:url({EXAM_ART.boss})" aria-hidden="true"></i>
      <p class="notice" data-k="mx-notice">{T.notice}</p>
      <p class="sub" data-k="mx-bank">{T.head(bank.length, Math.min(MOCK_N, bank.length))} · 25분 · 시간이 지나도 계속 풀 수 있어요</p>
      {#if rec?.tries}<p class="sub" data-k="mx-rec">내 기록 · 최고 {rec.best ?? 0} / {MOCK_N} · 도전 {rec.tries}번</p>{/if}
    </section>
    <BottomAction dock={false} mainLabel="📄 시험지 받기" text="📄 시험지 받기" disabled={bank.length < 1} why={bank.length < 1 ? '아직 문제 은행이 비어 있어요' : ''} onmain={start} />
  {:else if phase === 'paper'}
    <div class="paper" data-k="mx-paper">
      <p class="head" data-k="mx-head">{T.head(bank.length, qs.length)}</p>
      <nav class="nums" aria-label="문항으로 가기">{#each qs as _, i (i)}<button type="button" class:on={given[i] != null && given[i] !== ''} onclick={() => jump(i)}>{i + 1}</button>{/each}</nav>
      {#each qs as m, i (i)}
        <div class="q" data-k="mx-q" data-i={i}>
          <b class="no">{i + 1}.</b>
          <div class="qb">{#key m.q}<QItem q={m.q} {i} value={given[i] ?? null} runeLen={4} showNo={false} onchange={(v) => { given[i] = v; ask = false; }} />{/key}</div>
        </div>
      {/each}
    </div>
    <BottomAction dock={false} mainLabel={ask ? `빈칸 ${blanks}개 · 그래도 낼까요?` : '📝 제출'} text={ask ? `빈칸 ${blanks}개 · 그래도 낼까요?` : '📝 제출'} onmain={submit} />
  {:else if phase === 'result' && res}
    <section class="res" data-k="mx-result">
      <div class="bosswrap"><i class="boss big" class:down={frame === 3} style="background-image:url({EXAM_ART.boss});background-position:{(frame / 3) * 100}% 0" aria-hidden="true" data-k="mx-boss" data-frame={frame}></i>
        <div class="hpbar" aria-label="마왕 체력"><i style:width="{hp * 100}%"></i></div></div>
      <p class="score" data-k="mx-score"><b>{res.n}</b> / {qs.length}{#if res.n === qs.length}<em>{T.win}</em>{/if}</p>
      <p class="sub" data-k="mx-resline">{T.result}{#if res.gem} · 💎 +{res.gem}{/if}</p>
      {#if rec}<p class="sub">내 최고 {rec.best ?? 0} / {MOCK_N} · 도전 {rec.tries ?? 0}번</p>{/if}
      {#each qs as m, i (i)}{#if !res.ok[i]}
        <div class="wrong" data-k="mx-wrong">
          <p class="wt"><b>{i + 1}.</b> ❌ {lessonName(m.slot.lid)} · {m.slot.title}</p>
          <div class="ans" inert><QItem q={m.q} {i} value={answerOf(m.q)} runeLen={4} showNo={false} ansLabel="정답" onchange={() => {}} /></div>
          {#if (m.q as { solution?: string }).solution}<p class="sol">💡 {(m.q as { solution?: string }).solution}</p>{/if}
          <button type="button" class="go" data-k="mx-review" onclick={() => onreview(m.slot.lid)}>🎯 그 차시 허수아비로</button>
        </div>
      {/if}{/each}
    </section>
    <BottomAction dock={false} mainLabel="🔥 다시 도전 · 새 숫자" text="🔥 다시 도전 · 새 숫자" onmain={start} />
  {/if}
</div>

<style>
  .mx { position: fixed; inset: 0; z-index: 40; overflow-y: auto; background: #120a1c var(--bg) center top / cover no-repeat; color: var(--text); display: flex; flex-direction: column; max-width: 430px; margin: 0 auto; }
  .top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 12px; background: rgba(18, 10, 28, 0.92); }
  .back { width: 44px; height: 44px; border: 0; background: none; color: #fff; font-size: 28px; }
  .ttl { flex: 1; font: 800 18px var(--font); color: #fff; }
  .tm { font: 800 16px var(--font); color: #ffd25a; font-variant-numeric: tabular-nums; } .tm.over { color: #ff7a7a; font-size: 13px; }
  .intro, .res { padding: 16px; display: grid; gap: 12px; justify-items: center; }
  .boss { width: 180px; aspect-ratio: 543 / 724; background-size: 400% 100%; background-position: 0 0; image-rendering: pixelated; filter: drop-shadow(0 0 14px rgba(160, 40, 255, 0.7)); animation: fl 2s ease-in-out infinite; }
  .boss.big { width: 160px; transition: background-position 0s; }
  .boss.down { animation: none; filter: grayscale(0.3) drop-shadow(0 0 8px rgba(0, 0, 0, 0.6)); }
  @keyframes fl { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .notice { margin: 0; padding: 14px; border-radius: 14px; background: #fffbe8; color: #2a1d06; border: 3px solid #f5b84a; font: 800 16px/1.5 var(--font); box-shadow: 0 0 16px rgba(245, 184, 74, 0.45); }
  .sub { margin: 0; color: #e8e2f2; font: 600 14px var(--font); text-align: center; }
  .paper { margin: 12px; padding: 16px 14px 24px; border-radius: 8px; background: #fbfaf6; color: #1b1b1b; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45); display: grid; gap: 16px; --text: #1b1b1b; --text-2: #4a4a4a; --surface: #ffffff; --surface-2: #f1efe8; --line: #c9c4b6; }
  .head { margin: 0; padding-bottom: 8px; border-bottom: 2px solid #1b1b1b; font: 800 15px var(--font); text-align: center; }
  .nums { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  .nums button { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #1b1b1b; background: #fff; color: #1b1b1b; font: 800 14px var(--font); }
  .nums button.on { background: #1b1b1b; color: #fff; }
  .q { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 4px; padding-top: 12px; border-top: 1px dashed #c9c4b6; scroll-margin-top: 64px; }
  .no { font: 900 18px var(--font); }
  .bosswrap { display: grid; justify-items: center; gap: 8px; }
  .hpbar { width: 220px; height: 14px; border-radius: 999px; background: rgba(0, 0, 0, 0.5); border: 2px solid #ff8a8a; overflow: hidden; }
  .hpbar i { display: block; height: 100%; background: linear-gradient(90deg, #c8232a, #ff5b5b); transition: width 1.4s cubic-bezier(0.2, 0.8, 0.3, 1); }
  .score { margin: 0; font: 800 22px var(--font); color: #fff; display: grid; justify-items: center; } .score b { font-size: 44px; color: #ffd25a; } .score em { font-style: normal; color: #ffd25a; font-size: 18px; }
  .wrong { width: 100%; padding: 12px; border-radius: 12px; background: #fbfaf6; color: #1b1b1b; display: grid; gap: 8px; --text: #1b1b1b; --text-2: #4a4a4a; --surface: #ffffff; --surface-2: #f1efe8; --line: #c9c4b6; }
  .wt { margin: 0; font: 700 14px var(--font); }
  .sol { margin: 0; font: 500 14px/1.5 var(--font); color: #3a3a3a; }
  .go { min-height: 44px; border-radius: 12px; border: 2px solid #1b1b1b; background: #fff; color: #1b1b1b; font: 800 14px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3); }
</style>
