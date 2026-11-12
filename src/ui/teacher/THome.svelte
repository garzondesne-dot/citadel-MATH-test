<script lang="ts">
  import type { LessonPack, Room, Store } from '../../model/types';
  import { CLASSES, isBeta, lastClass, lastTest, setSlot, week, type Live } from '../../school/school';
  import { DOW, kst, PERIODS, periodNow } from '../../school/bells';
  import { isLobby, isEnd, stepOf } from '../../raid/raid';
  import { roomPath } from '../../raid/actions';
  import { short } from './flow';
  import { LESSON_LIST } from '../../school/dash';
  import Sheet from '../battle/Sheet.svelte';

  // ⑫ 교사 첫 화면 = 「수업 열기」 (#119 · DECISIONS 「📱 ⑫ 교사 첫 화면 컨펌」)
  //   ① 반 = 오늘 시간표 칸(지금 교시 금빛 테두리 · 누를 때만 골라짐) · 「다른 반 ›」 · 비어 있으면 「시간표 넣기 ›」 · 고른 반 마지막 수업 한 줄
  //   ② 차시 칸(「지난」) · 「이어서」(끝나지 않은 수업이 있을 때) · 금빛 「▶ 반 · 차시 수업 열기」(둘 다 골라야 켜짐)
  //   ＋ 목록에 있지만 차시 팩이 안 된 차시 = 점선 칸 + 가운데 ＋ + 「n차시 · 준비 안 됨」 · 누르면 ⑰ 준비 탭 그 차시 (고르기는 안 됨 · #130 ③)
  const { S, packs, now, live, liveRoom, onopen, onresume, ontest, onprep }: {
    S: Store; packs: LessonPack[]; now: number; live: Live | null; liveRoom: Room | null;
    onopen: (cls: string, L: LessonPack, from?: { step: number; fresh: string | null }) => void; onresume: () => void; ontest: (L: LessonPack, cls?: string, from?: { step: number; fresh: string | null }) => void; onprep: (id: string) => void;
  } = $props();
  const cells = $derived([...packs.map((p) => ({ id: p.id, no: p.no, title: p.title, p })), ...LESSON_LIST.filter((l) => !packs.some((p) => p.id === l.id)).map((l) => ({ id: l.id, no: l.no, title: l.title, p: null }))].sort((a, b) => a.no - b.no));
  let cls = $state('');
  let lessonId = $state('');
  let sheet = $state<'' | 'cls' | 'sched'>('');
  let ver = $state(0); // 시간표 고친 뒤 다시 읽기
  const k = $derived(kst(now));
  const W = $derived.by(() => { void ver; return week(S); });
  const today = $derived(W[String(k.dow)] || {});
  const empty = $derived(!Object.values(W).some((d) => Object.values(d || {}).some(Boolean)));
  const pNow = $derived(periodNow(now));
  const periods = [1, 2, 3, 4, 5, 6, 7];
  const L = $derived(packs.find((p) => p.id === lessonId) ?? null);
  const last = $derived(cls ? lastClass(S, cls) : null);
  const md = (t: number) => { const x = kst(t); return `${x.m}/${x.d}`; };
  // 이어서 = 이 폰이 열어 둔 수업이 아직 안 끝났을 때 (그 반)
  const resume = $derived(live && liveRoom && !liveRoom.state.closed ? { live, room: liveRoom } : null);
  // ⏯ 이어서 (#119 덧붙임 2): 고른 반의 지난 수업이 닫힌 그때 자리(방 state.stop) · 다 끝났으면 없음
  //   🧪 테스트로 연 수업도 같은 규칙(#133) · 실제 반 기록과 따로 저장 · 둘 다 있으면 나중 것
  const savedOf = (lc: typeof last, test: boolean) => { if (!lc || lc.done) return null; const Rl = S.get<Room>(roomPath(lc.code)); const st = Rl?.state.stop; const Lp = packs.find((p) => p.id === lc.lesson); return st && !st.done && Lp ? { L: Lp, st, test, at: lc.at } : null; };
  const saved = $derived.by(() => { void now; if (!cls) return null; const a = savedOf(last, false), b = savedOf(lastTest(S, cls), true); return a && b ? (b.at > a.at ? b : a) : a || b; });
  const resumeText = $derived.by(() => {
    if (!resume) return '';
    const Lr = packs.find((p) => p.id === resume.live.lesson), st = Lr ? stepOf(Lr, resume.room) : null;
    return `${resume.live.cls}반 · ${Lr?.no ?? ''}차시 · ${isLobby(resume.room) ? '대기실' : Lr && isEnd(Lr, resume.room) ? '마무리' : `${short(st)}부터`} 이어서`;
  });
  const DAYS = [1, 2, 3, 4, 5];
  function cycle(d: number, p: number) {
    const cur = W[String(d)]?.[String(p)] || '';
    const i = cur ? CLASSES.indexOf(cur) + 1 : 0;
    setSlot(S, d, p, i < CLASSES.length ? (CLASSES[i] as string) : null);
    ver++;
  }
</script>

<div class="tbar"><div class="t">수업 열기</div></div>
<div class="mid">
  <div class="card c1">
    <div class="hd"><span class="lab">① 반 · 오늘 시간표 {k.m}/{k.d} ({DOW[k.dow]})</span>
      {#if empty}<button type="button" class="tlink" onclick={() => (sheet = 'sched')}>시간표 넣기 ›</button>{:else}<button type="button" class="tlink" onclick={() => (sheet = 'cls')}>다른 반 ›</button>{/if}
    </div>
    <div class="tt7" role="group" aria-label="오늘 시간표">
      {#each periods as p (p)}
        {@const c = today[String(p)] || ''}
        {@const has = (PERIODS[k.dow] || []).includes(p)}
        <button type="button" class="tt" class:empty={!c} class:now={pNow === p} class:on={!!c && c === cls} disabled={!c} aria-pressed={!!c && c === cls} onclick={() => (cls = c)}>
          <small>{p}교시</small><b>{c || (has ? '—' : '·')}{c && isBeta(S, c) ? '🧪' : ''}</b>
        </button>
      {/each}
    </div>
    <p class="hint">{#if cls}{cls}반 마지막 수업 · {#if last}<b>{last.no}차시</b> ({md(last.at)} · {last.done ? '끝까지' : '이어서 남음'}){:else}아직 없음{/if}{:else}칸을 눌러 반을 골라요{/if}</p>
  </div>
  <div class="card">
    <span class="lab">② 차시</span>
    <div class="pk3" role="group" aria-label="차시">
      {#each cells as p (p.id)}
        {#if p.p}
          <button type="button" class="pk" class:on={lessonId === p.id} class:last={last?.lesson === p.id} aria-pressed={lessonId === p.id} onclick={() => (lessonId = p.id)}><b>{p.no}차시</b><small>{p.title.split(' · ')[0]}</small></button>
        {:else}
          <button type="button" class="pk add" aria-label="{p.no}차시 준비 안 됨 · 차시 준비로" onclick={() => onprep(p.id)}><b>＋</b><small>{p.no}차시 · 준비 안 됨</small></button>
        {/if}
      {/each}
    </div>
  </div>
  {#if resume}
    <button type="button" class="item" onclick={onresume}><span class="ic">▶</span><span class="tx"><b>{resumeText}</b><small>끝나지 않은 수업 · 누르면 그 자리로</small></span></button>
  {:else if saved}
    <button type="button" class="item" onclick={() => (saved.test ? ontest(saved.L, cls, saved.st) : onopen(cls, saved.L, saved.st))}><span class="ic">⏯</span><span class="tx"><b>{saved.test ? '🧪 ' : ''}{saved.L.no}차시 · {short(saved.L.steps[saved.st.step])}부터 이어서</b><small>{cls}반 {saved.test ? '테스트' : '지난 수업'}{saved.st.fresh ? ' · 숫자 바꾼 판' : ''}</small></span></button>
  {:else}
    <div class="item none fold"><span class="ic">이어</span><span class="tx"><b>끝나지 않은 수업 없음</b><small>있으면 여기에 「n차시 · 문제 4부터 이어서」</small></span></div>
  {/if}
  <div class="sub2">
    <button type="button" class="chipbtn" disabled={!L} onclick={() => L && ontest(L, cls)}>🧪 테스트로 열기</button>
    <a class="chipbtn" href="?role=hall" target="_blank">🏛 교사 캠프 (TV)</a>
  </div>
</div>
<div class="tact">
  <button type="button" class="btn" disabled={!cls || !L || !!resume} onclick={() => L && onopen(cls, L)}>
    {#if resume}수업이 열려 있어요<small>위 「이어서」 · 아래 「수업 닫기」</small>{:else if cls && L}▶ {cls}반 · {L.no}차시 수업 열기{:else}▶ 수업 열기<small>{!cls ? '① 반' : '② 차시'}을 골라요</small>{/if}
  </button>
</div>

{#if sheet === 'cls'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}다른 반{/snippet}
    <div class="grid4">{#each CLASSES as c (c)}<button type="button" class="pk" class:on={cls === c} onclick={() => { cls = c; sheet = ''; }}><b>{c}반{isBeta(S, c) ? ' 🧪' : ''}</b>{#if isBeta(S, c)}<small>베타 · 통계 빠짐</small>{/if}</button>{/each}</div>
    <button type="button" class="tlink" onclick={() => (sheet = 'sched')}>시간표 고치기 ›</button>
  </Sheet>
{:else if sheet === 'sched'}
  <Sheet onclose={() => (sheet = '')} mainText="다 했어요">
    {#snippet title()}시간표 · 칸을 누르면 반이 바뀜{/snippet}
    <div class="sg" role="grid" aria-label="시간표">
      <span></span>{#each DAYS as d (d)}<b>{DOW[d]}</b>{/each}
      {#each periods as p (p)}
        <b>{p}</b>
        {#each DAYS as d (d)}
          {@const c = W[String(d)]?.[String(p)] || ''}
          <button type="button" class:on={!!c} disabled={!(PERIODS[d] || []).includes(p)} onclick={() => cycle(d, p)}>{c || '—'}</button>
        {/each}
      {/each}
    </div>
  </Sheet>
{/if}

<style>
  .tt7 { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .tt { height: 48px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 0; box-shadow: 0 3px 0 var(--press-sh); }
  .tt small { font-size: 10.5px; font-weight: 500; color: var(--text-3); }
  .tt.empty { background: none; border-style: dashed; color: var(--text-3); box-shadow: none; }
  .tt.now { border: 2px solid var(--accent); }
  .tt.now small { color: var(--accent); }
  .tt.on { background: var(--accent); color: var(--on-accent); }
  .tt.on small { color: var(--on-accent); }
  .pk3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .pk { position: relative; min-height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 4px 2px; box-shadow: 0 3px 0 var(--press-sh); }
  .pk small { font-size: 11px; font-weight: 500; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .pk.on { border: 2px solid var(--accent); background: var(--surface); }
  .pk.last::after { content: '지난'; position: absolute; top: -7px; right: -4px; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line); color: var(--text-2); }
  .pk.add { border: 2px dashed var(--line); background: none; box-shadow: none; gap: 0; }
  .pk.add b { color: var(--accent); font-size: 20px; line-height: 1; }
  .pk.add small { color: var(--text-3); }
  .pk.add:active { border-color: var(--accent); }
  .item.none { border: 1px dashed var(--line); background: none; box-shadow: none; color: var(--text-2); }
  .sub2 { display: flex; gap: var(--s2); }
  .sub2 .chipbtn { flex: 1; display: flex; align-items: center; justify-content: center; text-decoration: none; height: 40px; }
  .sub2 .chipbtn:disabled { opacity: 0.4; }
  .sg { display: grid; grid-template-columns: 24px repeat(5, minmax(0, 1fr)); gap: 4px; align-items: center; text-align: center; font-size: 13px; }
  .sg b { color: var(--text-2); }
  .sg button { height: 40px; border-radius: 8px; border: 1px dashed var(--line); background: none; color: var(--text-3); font: 700 13px var(--font); }
  .sg button.on { border: 1px solid var(--accent); background: var(--surface-2); color: var(--text); }
  .sg button:disabled { opacity: 0.25; }
</style>
