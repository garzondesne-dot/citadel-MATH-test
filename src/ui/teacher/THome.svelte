<script lang="ts">
  import { XCLS } from '../../channel';
  import { upTag } from '../../engine/packs';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { CLASSES, isBeta, lastClass, lastTest, week, type Live } from '../../school/school';
  import { BELLS, DOW, kst, PERIODS, periodNow } from '../../school/bells';
  import { isLobby, isEnd, stepOf } from '../../raid/raid';
  import { roomPath } from '../../raid/actions';
  import { short } from './flow';
  import { LESSON_LIST } from '../../school/dash';
  import Sheet from '../battle/Sheet.svelte';
  import SchedEdit from './SchedEdit.svelte';
  import { feat, schoolInfo, type FeatId } from '../../school/features.svelte';
  import { CARRY_AT, carryMin, carryOffer, type Carry, type CarryAt } from '../../school/carry';
  import { estimate, LIMIT, ltimePath, timeSig } from '../../school/ltime';

  // ⑫ 교사 첫 화면 = 「수업 열기」 (#119 · DECISIONS 「📱 ⑫ 교사 첫 화면 컨펌」)
  //   ① 반 = 오늘 시간표 칸(지금 교시 금빛 테두리 · 누를 때만 골라짐) · 「다른 반 ›」 · 비어 있으면 「시간표 넣기 ›」 · 고른 반 마지막 수업 한 줄
  //   ② 차시 칸(「지난」) · 「이어서」(끝나지 않은 수업이 있을 때) · 금빛 「▶ 반 · 차시 수업 열기」(둘 다 골라야 켜짐)
  //   📅 시간표 스위치(📜 2026-11-13 밤 · 기본 끔): 끔 = ① 반 칸(반 목록) → ② 차시 → 「▶ 수업 열기」 수동 · 켬 = 오늘 시간표 칸 + 🕘 추천 한 줄(「지금 n교시 · 반 · 다음 k차시」 누르면 고르기만 · 저절로 안 열림) + 「시간표 · 교시 시각 ›」
  //   ＋ 목록에 있지만 차시 팩이 안 된 차시 = 점선 칸 + 가운데 ＋ + 「n차시 · 준비 안 됨」 · 누르면 ⑰ 준비 탭 그 차시 (고르기는 안 됨 · #130 ③)
  const { S, packs, now, live, liveRoom, onopen, onresume, ontest, onprep }: {
    S: Store; packs: LessonPack[]; now: number; live: Live | null; liveRoom: Room | null;
    onopen: (cls: string, L: LessonPack, from?: { step: number; fresh: string | null }, carry?: Carry | null) => void; onresume: () => void; ontest: (L: LessonPack, cls?: string, from?: { step: number; fresh: string | null }, carry?: Carry | null) => void; onprep: (id: string) => void;
  } = $props();
  const cells = $derived([...packs.map((p) => ({ id: p.id, no: p.no, title: p.title, p })), ...LESSON_LIST.filter((l) => !packs.some((p) => p.id === l.id || p.no === l.no)).map((l) => ({ id: l.id, no: l.no, title: l.title, p: null }))].sort((a, b) => a.no - b.no));
  let cls = $state('');
  let lessonId = $state('');
  let sheet = $state<'' | 'cls' | 'sched'>('');
  let openAsk = $state(false); // 📜 2026-11-16 선생님 b3 「차시를 잘못 열어 모두 다시 들어옴」 = 열기 전 반 · 차시 · 학습지 제목 크게 확인
  let ver = $state(0); // 시간표 고친 뒤 다시 읽기
  const k = $derived(kst(now));
  const W = $derived.by(() => { void ver; return week(S); });
  const today = $derived(W[String(k.dow)] || {});
  const empty = $derived(!Object.values(W).some((d) => Object.values(d || {}).some(Boolean)));
  const pNow = $derived(periodNow(now));
  const schedOn = $derived(feat('schedule'));
  const periods = $derived.by(() => { void schoolInfo.ver; void ver; const n = Math.max(1, ...Object.values(PERIODS).map((x) => Math.max(0, ...(x || [])))); return Array.from({ length: n }, (_, i) => i + 1); });
  // 🕘 추천 한 줄 = 지금(또는 다음) 교시 칸의 반 · 그 반 다음 차시 (진도 맞추기 school/prog · 없으면 지난 차시 + 1)
  const nextNo = (c: string) => Number(S.get<number>(`school/prog/${c}`)) || (lastClass(S, c)?.no ?? 0) + 1;
  const rec = $derived.by(() => {
    if (!schedOn) return null; void ver;
    const ps = PERIODS[k.dow] || [], p = pNow || ps.find((x) => { const b = BELLS[x]; return b && Number(b[0].replace(':', '')) > Math.floor(k.hm / 60) * 100 + (k.hm % 60); }) || 0;
    const c = p ? today[String(p)] : ''; if (!c) return null;
    const n = nextNo(c), Lp = packs.find((x) => x.no === n) ?? packs.find((x) => x.no > n) ?? null;
    return { p, c, L: Lp, now: p === pNow };
  });
  // 📅 시간표 켜짐 = 추천(지금 · 다음 교시)을 기본 선택으로 채워 둠 · 반 · 차시 칩으로 바꿀 수 있음 (📜 2026-11-15 「시간표 선택해도 수동으로 열 수 있게」)
  let prefilled = false;
  $effect(() => { const r = rec; if (prefilled || !r) return; prefilled = true; if (!cls) cls = r.c; if (!lessonId && r.L) lessonId = r.L.id; });
  const L = $derived(packs.find((p) => p.id === lessonId) ?? null);
  const last = $derived(cls ? lastClass(S, cls) : null);
  const md = (t: number) => { const x = kst(t); return `${x.m}/${x.d}`; };
  // 이어서 = 이 폰이 열어 둔 수업이 아직 안 끝났을 때 (그 반)
  const resume = $derived(live && liveRoom && !liveRoom.state.closed ? { live, room: liveRoom } : null);
  // ⏯ 이어서 (#119 덧붙임 2): 고른 반의 지난 수업이 닫힌 그때 자리(방 state.stop) · 다 끝났으면 없음
  //   🧪 테스트로 연 수업도 같은 규칙(#133) · 실제 반 기록과 따로 저장 · 둘 다 있으면 나중 것
  const savedOf = (lc: typeof last, test: boolean) => { if (!lc || lc.done) return null; const Rl = S.get<Room>(roomPath(lc.code)); const st = Rl?.state.stop; const Lp = packs.find((p) => p.id === lc.lesson); return st && !st.done && Lp ? { L: Lp, st, test, at: lc.at } : null; };
  const saved = $derived.by(() => { void now; if (!cls) return null; const a = savedOf(last, false), b = savedOf(lastTest(S, cls), true); return a && b ? (b.at > a.at ? b : a) : a || b; });
  // 📦 B 지난 차시에서 넘어온 몬스터 (📜 2026-11-16 · 기본 = 안 함 → 허수아비 A 그대로)
  const offer = $derived.by(() => { void now; return cls && L && !resume ? carryOffer(S, cls, L, packs) : null; });
  let carryAt = $state<CarryAt | 'none'>('none');
  const offerKey = $derived(offer ? `${cls}|${lessonId}|${offer.from}|${offer.ids.join(',')}` : '');
  $effect(() => { void offerKey; carryAt = 'none'; }); // 반 · 차시 · 넘어온 것이 바뀔 때만 처음으로 (now 마다 아님)
  const carry = $derived<Carry | null>(offer && carryAt !== 'none' ? { from: offer.from, ids: offer.ids, at: carryAt } : null);
  const cvMin = $derived.by(() => { const P = offer ? packs.find((p) => p.id === offer.from) : null; return P && offer ? carryMin(P, offer.ids) : 0; });
  const cvEst = $derived.by(() => { if (!offer || !L) return null; const on = (id: string) => feat(id as FeatId); const e = estimate(L, on, S.get<Record<string, number>>(ltimePath(L.id, timeSig(on)))); const tot = Math.round((e.total + (carry ? cvMin : 0)) * 10) / 10; return { base: e.total, tot, over: tot > LIMIT }; });
  const resumeText = $derived.by(() => {
    if (!resume) return '';
    const Lr = packs.find((p) => p.id === resume.live.lesson), st = Lr ? stepOf(Lr, resume.room) : null;
    return `${resume.live.cls}반 · ${Lr?.no ?? ''}차시 · ${isLobby(resume.room) ? '대기실' : Lr && isEnd(Lr, resume.room) ? '마무리' : `${short(st)}부터`} 이어서`;
  });
</script>

<div class="tbar"><div class="t">수업 열기</div></div>
<div class="mid">
  {#if schedOn}
  <div class="card c1">
    <div class="hd"><span class="lab">① 반 · 오늘 시간표 {k.m}/{k.d} ({DOW[k.dow]})</span>
      <span class="links">{#if empty}<button type="button" class="tlink" onclick={() => (sheet = 'sched')}>시간표 넣기 ›</button>{/if}<button type="button" class="tlink" onclick={() => (sheet = 'cls')}>다른 반 ›</button></span>
    </div>
    <div class="tt7" style:grid-template-columns="repeat({periods.length}, minmax(0, 1fr))" role="group" aria-label="오늘 시간표">
      {#each periods as p (p)}
        {@const c = today[String(p)] || ''}
        {@const has = (PERIODS[k.dow] || []).includes(p)}
        <button type="button" class="tt" data-cls={c || null} class:empty={!c} class:now={pNow === p} class:on={!!c && c === cls} disabled={!c} aria-pressed={!!c && c === cls} onclick={() => (cls = c)}>
          <small>{p}교시</small><b>{c || (has ? '—' : '·')}{c && isBeta(S, c) ? '🧪' : ''}</b>
        </button>
      {/each}
    </div>
    {#if rec}<button type="button" class="rec" data-k="rec" disabled={!rec.L || !!resume} onclick={() => { if (rec.L && !resume) onopen(rec.c, rec.L); }}>📅 {rec.now ? '지금' : '다음'} {rec.p}교시 = <b>{rec.c}반</b> · {rec.L ? `${rec.L.no}차시` : '다음 차시 없음'} <small>{rec.L ? '바로 열기 ›' : ''}</small></button>{/if}
    <span class="lab sub">또는 반 직접 고르기 (시간표 밖 · 다른 반도)</span>
    <div class="grid4" role="group" aria-label="반" data-k="cls-manual">{#each CLASSES as c (c)}<button type="button" class="pk" class:on={cls === c} aria-pressed={cls === c} data-cls={c} onclick={() => (cls = c)}><b>{c}{isBeta(S, c) ? ' 🧪' : ''}</b></button>{/each}</div>
    <p class="hint">{#if cls}{cls}반 마지막 수업 · {#if last}<b>{last.no}차시</b> ({md(last.at)} · {last.done ? '끝까지' : '이어서 남음'}){:else}아직 없음{/if}{:else}칸을 눌러 반을 골라요{/if}</p>
  </div>
  {:else}
  <div class="card c1">
    <span class="lab">① 반</span>
    <div class="grid4" role="group" aria-label="반">{#each CLASSES as c (c)}<button type="button" class="pk" class:on={cls === c} aria-pressed={cls === c} data-cls={c} onclick={() => (cls = c)}><b>{c}{isBeta(S, c) ? ' 🧪' : ''}</b></button>{/each}</div>
    <p class="hint">{#if cls}{cls}반 마지막 수업 · {#if last}<b>{last.no}차시</b> ({md(last.at)} · {last.done ? '끝까지' : '이어서 남음'}){:else}아직 없음{/if}{:else}반을 골라요{/if}</p>
  </div>
  {/if}
  <div class="card">
    <span class="lab">② 차시</span>
    <div class="pk3" class:five={cells.length > 6} role="group" aria-label="차시">
      {#each cells as p (p.id)}
        {#if p.p}
          <button type="button" class="pk" class:on={lessonId === p.id} class:last={last?.lesson === p.id} aria-pressed={lessonId === p.id} onclick={() => (lessonId = p.id)}><b>{p.no}차시</b><small>{p.title.split(' · ')[0]}{upTag(p.id, p.no)}</small></button>
        {:else}
          <button type="button" class="pk add" aria-label="{p.no}차시 준비 안 됨 · 차시 준비로" onclick={() => onprep(p.id)}><b>＋</b><small>{p.no}차시 · 준비 안 됨</small></button>
        {/if}
      {/each}
    </div>
  </div>
  {#if offer && cvEst}
  <div class="card cv" data-k="carry">
    <span class="lab">📦 지난 {offer.no}차시에서 넘어온 몬스터 {offer.ids.length}마리</span>
    <p class="hint">{offer.names.join(' · ')}</p>
    <div class="grid3" role="group" aria-label="넘어온 몬스터">{#each ['intro', 'mid', 'none'] as const as a (a)}<button type="button" class="pk" class:on={carryAt === a} aria-pressed={carryAt === a} data-at={a} onclick={() => (carryAt = a)}><b>{CARRY_AT[a]}</b></button>{/each}</div>
    <p class="hint" class:over={cvEst.over} data-k="carry-est">⏱ 이 차시 {cvEst.base}분{#if carry} + {cvMin}분(넘어온 몬스터) = <b>{cvEst.tot}분</b>{/if} / {LIMIT}분{#if carry && cvEst.over}<br />⚠ 50분을 넘어요 · 「안 함」= 🎯 허수아비 복습으로 두기를 권해요{:else if !carry}<br />안 함 = 🎯 허수아비 「📚 수업에서 넘어온 문제」 그대로{/if}</p>
  </div>
  {/if}
  {#if resume}
    <button type="button" class="item" onclick={onresume}><span class="ic">▶</span><span class="tx"><b>{resumeText}</b><small>끝나지 않은 수업 · 누르면 그 자리로</small></span></button>
  {:else if saved}
    <button type="button" class="item" onclick={() => (saved.test ? ontest(saved.L, cls, saved.st) : onopen(cls, saved.L, saved.st))}><span class="ic">⏯</span><span class="tx"><b>{saved.test ? '🧪 ' : ''}{saved.L.no}차시 · {short(saved.L.steps[saved.st.step])}부터 이어서</b><small>{cls}반 {saved.test ? '테스트' : '지난 수업'}{saved.st.fresh ? ' · 숫자 바꾼 판' : ''}</small></span></button>
  {:else}
    <div class="item none fold"><span class="ic">이어</span><span class="tx"><b>끝나지 않은 수업 없음</b><small>있으면 여기에 「n차시 · 문제 4부터 이어서」</small></span></div>
  {/if}
  <div class="sub2">
    <button type="button" class="chipbtn" disabled={!L} onclick={() => L && ontest(L, cls, undefined, carry)}>🧪 테스트로 열기</button>
    <a class="chipbtn" href="?role=hall" target="_blank">🏛 교사 캠프 (TV)</a>
  </div>
</div>
<div class="tact">
  <button type="button" class="btn" disabled={!cls || !L || !!resume} onclick={() => { if (L) openAsk = true; }}>
    {#if resume}수업이 열려 있어요<small>위 「이어서」 · 아래 「수업 닫기」</small>{:else if cls && L}▶ {cls}반 · {L.no}차시 수업 열기{:else}▶ 수업 열기<small>{!cls ? '① 반' : '② 차시'}을 골라요</small>{/if}
  </button>
</div>

{#if openAsk && L}
  <Sheet onclose={() => (openAsk = false)}>
    {#snippet title()}이 수업을 열까요?{/snippet}
    {#snippet act()}<div class="oarow"><button type="button" class="btn2" onclick={() => (openAsk = false)}>아니요</button><button type="button" class="btn" data-k="open-yes" onclick={() => { openAsk = false; if (L) onopen(cls, L, undefined, carry); }}>▶ 열기</button></div>{/snippet}
    <div class="oabox" data-k="open-ask"><b class="oacls">{cls}반</b><b class="oano">{L.no}차시</b><span class="oatt">{L.title}</span>{#if carry}<small>📦 지난 {offer?.no}차시 몬스터 {carry.ids.length}마리 · {CARRY_AT[carry.at]}</small>{/if}</div>
  </Sheet>
{/if}
{#if sheet === 'cls'}
  <Sheet onclose={() => (sheet = '')}>
    {#snippet title()}다른 반{/snippet}
    <div class="grid4">{#each CLASSES as c (c)}<button type="button" class="pk" class:on={cls === c} onclick={() => { cls = c; sheet = ''; }}><b>{c}반{isBeta(S, c) ? ' 🧪' : ''}</b>{#if isBeta(S, c)}<small>{XCLS} · 통계 빠짐</small>{/if}</button>{/each}</div>
    {#if schedOn}<button type="button" class="tlink" onclick={() => (sheet = 'sched')}>시간표 · 교시 시각 고치기 ›</button>{/if}
  </Sheet>
{:else if sheet === 'sched'}
  <Sheet onclose={() => { sheet = ''; ver++; }} mainText="다 했어요">
    {#snippet title()}📅 시간표 · 교시 시각{/snippet}
    <SchedEdit {S} />
  </Sheet>
{/if}

<style>
  .links { display: flex; gap: var(--s3); }
  .rec { min-height: 44px; border-radius: 12px; border: 1px solid var(--accent); background: none; color: var(--text); font: 600 14px var(--font); display: flex; align-items: center; justify-content: center; gap: 4px; padding: 0 var(--s2); }
  .rec b { color: var(--accent); } .rec small { color: var(--text-3); font-size: 12px; margin-left: 4px; }
  .tt7 { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .tt { height: 48px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 0; box-shadow: 0 3px 0 var(--press-sh); }
  .tt small { font-size: 10.5px; font-weight: 500; color: var(--text-3); }
  .tt.empty { background: none; border-style: dashed; color: var(--text-3); box-shadow: none; }
  .tt.now { border: 2px solid var(--accent); }
  .tt.now small { color: var(--accent); }
  .tt.on { background: var(--accent); color: var(--on-accent); }
  .tt.on small { color: var(--on-accent); }
  .pk3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .pk3.five { grid-template-columns: repeat(5, minmax(0, 1fr)); } /* 차시 7개 이상 = 5칸 2줄 (#132 · 360 × 640 스크롤 0) */
  .pk3.five .pk { padding: 4px 1px; font-size: 13.5px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .oabox { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0 4px; text-align: center; } .oacls { font-size: 22px; color: var(--text-2); } .oano { font-size: 40px; color: var(--accent); line-height: 1.1; } .oatt { font-size: 18px; font-weight: 700; } .oabox small { color: var(--text-2); }
  .oarow { display: flex; gap: 8px; } .oarow button { flex: 1; min-height: 52px; }
  .grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 6px 0; }
  .hint.over { color: var(--bad); }
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
  .lab.sub { display: block; margin-top: var(--s3); font-size: 13px; color: var(--text-2); }
</style>
