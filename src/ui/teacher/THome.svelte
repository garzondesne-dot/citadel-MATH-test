<script lang="ts">
  import { untrack } from 'svelte';
  import { upTag } from '../../engine/packs';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { CLASSES, HALLKEY, lastClass, lastTest, type Live } from '../../school/school';
  import { kst } from '../../school/bells';
  import { isLobby, isEnd, stepOf } from '../../raid/raid';
  import { roomPath } from '../../raid/actions';
  import { BOT_MAX } from '../../raid/bots';
  import { hiddenCls, short, testCls, TEST_MODES, type TestMode } from './flow';
  import { LESSON_LIST } from '../../school/dash';
  import Sheet from '../battle/Sheet.svelte';
  import { feat, schoolInfo, type FeatId } from '../../school/features.svelte';
  import { CARRY_AT, carryMin, carryOffer, type Carry, type CarryAt } from '../../school/carry';
  import { estimate, LIMIT, ltimePath, timeSig } from '../../school/ltime';
  import { fixedKey, KEYMODE, keyModeOf, type KeyMode } from '../../school/openLesson';
  import TToday from './TToday.svelte';

  // ⚔ 수업 탭 수동 열기 (📜 2026-11-17 #21 · 시안 Uj7jgeePofh2x9fmKzjqGZ ① · DECISIONS 「⚔ 교사 수업 탭 정리」): 펼침 창 없이 위에서 아래로 한 칸씩
  //   ① 반 단추(실제 반 · 테스트 전용 반 1-6 숨김) + 맨 끝 보라 「🧪 테스트」 · 🟢 = 지금 수업 중 → 「▶ 이어서 진행 · ⏹ 닫기」 · 반을 바꾸면 차시 · 키 다시
  //   ② 차시 단추 · ⭐ = 그 반 다음 차시 · 📦 넘어온 몬스터 한 줄
  //   ③ 실제 반 = 종합실 키 [🎲 수업마다 새로 · 📌 고정] / 🧪 = 테스트 모드 3개 + 🤖 봇 0~30(기본 5) · 📱 리모컨만일 때만 종합실 키
  //   → 요약 한 줄 → ▶ 수업 열기(🧪 = 보라 「🧪 테스트 열기」) → 확인 창
  const { S, packs, now, live, liveRoom, onopen, onresume, onstop, ontest, onprep }: {
    S: Store; packs: LessonPack[]; now: number; live: Live | null; liveRoom: Room | null;
    onopen: (cls: string, L: LessonPack, from?: { step: number; fresh: string | null }, carry?: Carry | null, keyMode?: KeyMode) => void; onresume: () => void; onstop: () => void;
    ontest: (L: LessonPack, mode: TestMode, bots: number, from?: { step: number; fresh: string | null }, carry?: Carry | null, keyMode?: KeyMode) => void; onprep: (id: string) => void;
  } = $props();
  const TEST = '🧪';
  const cells = $derived([...packs.map((p) => ({ id: p.id, no: p.no, title: p.title, p })), ...LESSON_LIST.filter((l) => !packs.some((p) => p.id === l.id || p.no === l.no)).map((l) => ({ id: l.id, no: l.no, title: l.title, p: null }))].sort((a, b) => a.no - b.no));
  const shown = $derived.by(() => { void schoolInfo.ver; return CLASSES.filter((c) => !hiddenCls(S, c)); });
  let cls = $state('');
  let lessonId = $state('');
  let tmode = $state<TestMode | ''>('');
  let botN = $state(5);
  let ver = $state(0);
  let keyPick = $state<KeyMode>(untrack(() => keyModeOf(S)));
  let keyEdit = $state(false), keyIn = $state('');
  let flash = $state(''), flashT: ReturnType<typeof setTimeout> | undefined;
  let openAsk = $state(false), stopAsk = $state(false); // 📜 2026-11-16 b3 「차시를 잘못 열어 모두 다시 들어옴」 = 열기 전 반 · 차시 크게 확인
  const isTest = $derived(cls === TEST);
  const realCls = $derived(isTest ? testCls(S) : cls);
  const fk = $derived.by(() => { void ver; return fixedKey(S); });
  // 🟢 지금 열린 수업 (이 폰이 열었든 아니든 school/live)
  const openNow = $derived(live && liveRoom && !liveRoom.state.closed ? live : null);
  const isOpen = (c: string) => !!openNow && (c === TEST ? !!openNow.test : !openNow.test && openNow.cls === c);
  const nextNo = (c: string) => Number(S.get<number>(`school/prog/${c}`)) || (lastClass(S, c)?.no ?? 0) + 1;
  const star = $derived.by(() => { if (!cls || isTest) return 0; const n = nextNo(cls); return [...packs].sort((a, b) => a.no - b.no).find((p) => p.no >= n)?.no ?? 0; }); // ⭐ = 진도 맞추기(school/prog) · 없으면 지난 차시 + 1 · 팩이 없으면 그다음 있는 차시
  function pickCls(c: string) {
    if (c === cls) return;
    const had = !!(lessonId || tmode || keyEdit);
    cls = c; lessonId = ''; tmode = ''; keyEdit = false; keyPick = keyModeOf(S); carryAt = 'none';
    if (had) { flash = '반 바뀜 → 차시 · 키 다시'; clearTimeout(flashT); flashT = setTimeout(() => (flash = ''), 1800); }
  }
  function reset() { cls = ''; lessonId = ''; tmode = ''; keyEdit = false; keyPick = keyModeOf(S); carryAt = 'none'; botN = 5; flash = ''; }
  function setMode(m: KeyMode) { keyPick = m; S.set(KEYMODE, m); if (m === 'fixed' && !fk) { keyIn = ''; keyEdit = true; } else keyEdit = false; }
  function saveKey() { if (!/^\d{4}$/.test(keyIn)) return; S.set(HALLKEY, keyIn); S.set(KEYMODE, 'fixed'); keyPick = 'fixed'; keyEdit = false; ver++; }
  const L = $derived(packs.find((p) => p.id === lessonId) ?? null);
  const last = $derived(cls && !isTest ? lastClass(S, cls) : null);
  const md = (t: number) => { const x = kst(t); return `${x.m}/${x.d}`; };
  // ⏯ 이어서 (#119 덧붙임 2 · #133): 고른 반의 지난 수업이 닫힌 그때 자리(방 state.stop) · 🧪 = 테스트 기록(따로 저장)
  const savedOf = (lc: ReturnType<typeof lastClass> | null, test: boolean) => { if (!lc || lc.done) return null; const Rl = S.get<Room>(roomPath(lc.code)); const st = Rl?.state.stop; const Lp = packs.find((p) => p.id === lc.lesson); return st && !st.done && Lp ? { L: Lp, st, test, at: lc.at } : null; };
  const saved = $derived.by(() => { void now; if (!cls || openNow) return null; return isTest ? savedOf(lastTest(S, realCls), true) : savedOf(last, false); });
  // 📦 B 지난 차시에서 넘어온 몬스터 (📜 2026-11-16 · 기본 = 안 함 → 허수아비 A 그대로) · 🧪 테스트는 없음
  const offer = $derived.by(() => { void now; return cls && !isTest && L && !openNow ? carryOffer(S, cls, L, packs) : null; });
  let carryAt = $state<CarryAt | 'none'>('none');
  const offerKey = $derived(offer ? `${cls}|${lessonId}|${offer.from}|${offer.ids.join(',')}` : '');
  $effect(() => { void offerKey; carryAt = 'none'; });
  const carry = $derived<Carry | null>(offer && carryAt !== 'none' ? { from: offer.from, ids: offer.ids, at: carryAt } : null);
  const cvMin = $derived.by(() => { const P = offer ? packs.find((p) => p.id === offer.from) : null; return P && offer ? carryMin(P, offer.ids) : 0; });
  const cvEst = $derived.by(() => { if (!offer || !L) return null; const on = (id: string) => feat(id as FeatId); const e = estimate(L, on, S.get<Record<string, number>>(ltimePath(L.id, timeSig(on)))); const tot = Math.round((e.total + (carry ? cvMin : 0)) * 10) / 10; return { base: e.total, tot, over: tot > LIMIT }; });
  const openText = $derived.by(() => {
    if (!openNow) return '';
    const Lr = packs.find((p) => p.id === openNow.lesson), R = liveRoom!, st = Lr ? stepOf(Lr, R) : null;
    return `${openNow.test ? '🧪 테스트' : `${openNow.cls}반`} · ${Lr?.no ?? ''}차시 · ${isLobby(R) ? '대기실' : Lr && isEnd(Lr, R) ? '마무리' : `${short(st)}`}`;
  });
  const needKey = $derived(!isTest || tmode === 'remote');
  const keyOk = $derived(!needKey || keyPick === 'new' || !!fk);
  const ready = $derived(!!cls && !!L && (!isTest || !!tmode) && keyOk && !keyEdit);
  const modeOf = (m: TestMode | '') => TEST_MODES.find((x) => x.k === m);
  const summary = $derived(!ready || !L ? '' : isTest ? `🧪 ${L.no}차시 · ${modeOf(tmode)?.ic} ${modeOf(tmode)?.t} · 🤖 ${botN}명${tmode === 'remote' ? ` · 🔑 ${keyPick === 'fixed' ? fk : '새로'}` : ''}` : `${cls}반 · ${L.no}차시${carry ? ` · 📦 ${carry.ids.length}` : ''} · 🔑 ${keyPick === 'fixed' ? `${fk} 고정` : '수업마다 새로'}`);
  // ⬇ 새 칸이 열리면 그 칸까지 저절로 내려감 (위에서 아래로 한 칸씩 · 작은 폰에서 아래 칸이 화면 밖에 열리지 않게)
  $effect(() => { const k = `${cls}|${lessonId}|${tmode}|${keyEdit}`; if (!cls) return; void k; requestAnimationFrame(() => { const el = document.querySelector(lessonId ? '[data-k="summary"], [data-k="step3"]' : '.pk3'); el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); });
  function go() { if (!L) return; openAsk = false; if (isTest) ontest(L, tmode as TestMode, botN, undefined, null, keyPick); else onopen(cls, L, undefined, carry, keyPick); }
</script>

<div class="tbar"><div class="t">수업 열기</div>{#if cls}<button type="button" class="tlink" data-k="reset" onclick={reset}>↺ 처음부터</button>{/if}</div>
<div class="mid scroll">
  {#if feat('schedule')}<TToday {S} {packs} {now} {live} {liveRoom} {onopen} />{/if}
  <div class="card">
    <span class="lab">① 반</span>
    <div class="grid4" role="group" aria-label="반" data-k="cls-row">
      {#each shown as c (c)}<button type="button" class="pk" class:on={cls === c} aria-pressed={cls === c} data-cls={c} onclick={() => pickCls(c)}><b>{isOpen(c) ? '🟢 ' : ''}{c}</b></button>{/each}
      <button type="button" class="pk tst" class:on={isTest} aria-pressed={isTest} data-cls="test" data-k="cls-test" onclick={() => pickCls(TEST)}><b>{isOpen(TEST) ? '🟢 ' : ''}🧪 테스트</b></button>
    </div>
    {#if flash}<p class="flash" role="status" data-k="flash">{flash}</p>{:else if cls && !isTest}<p class="hint">{cls}반 마지막 수업 · {#if last}<b>{last.no}차시</b> ({md(last.at)} · {last.done ? '끝까지' : '이어서 남음'}){:else}아직 없음{/if}</p>{:else if isTest}<p class="hint">기록 · 💎 안 남아요 · 어느 차시든</p>{/if}
  </div>
  {#if cls && isOpen(cls)}
    <div class="card live1" data-k="open-now">
      <span class="lab">🟢 지금 수업 중 · {openText}</span>
      <div class="oarow"><button type="button" class="btn" data-k="go-resume" onclick={onresume}>▶ 이어서 진행</button><button type="button" class="btn2" data-k="go-stop" onclick={() => (stopAsk = true)}>⏹ 닫기</button></div>
    </div>
  {:else if cls}
    <div class="card">
      <span class="lab">② 차시{#if star}<small> · ⭐ = {cls}반 다음 차시</small>{/if}</span>
      <div class="pk3" class:five={cells.length > 6} role="group" aria-label="차시">
        {#each cells as p (p.id)}
          {#if p.p}
            <button type="button" class="pk" class:on={lessonId === p.id} class:last={last?.lesson === p.id} aria-pressed={lessonId === p.id} data-no={p.no} onclick={() => (lessonId = p.id)}><b>{star === p.no ? '⭐' : ''}{p.no}차시</b><small>{p.title.split(' · ')[0]}{upTag(p.id, p.no)}</small></button>
          {:else}
            <button type="button" class="pk add" aria-label="{p.no}차시 준비 안 됨 · 차시 준비로" onclick={() => onprep(p.id)}><b>＋</b><small>{p.no}차시 · 준비 안 됨</small></button>
          {/if}
        {/each}
      </div>
      {#if saved}<button type="button" class="item rs" data-k="saved" onclick={() => (saved.test ? ontest(saved.L, 'remote', botN, saved.st) : onopen(cls, saved.L, saved.st, null, keyPick))}><span class="ic">⏯</span><span class="tx"><b>{saved.test ? '🧪 ' : ''}{saved.L.no}차시 · {short(saved.L.steps[saved.st.step])}부터 이어서</b><small>{saved.test ? '테스트' : `${cls}반 지난 수업`}{saved.st.fresh ? ' · 숫자 바꾼 판' : ''}</small></span></button>{/if}
    </div>
    {#if offer && cvEst}
    <div class="card cv" data-k="carry">
      <span class="lab">📦 지난 {offer.no}차시에서 넘어온 몬스터 {offer.ids.length}마리</span>
      <p class="hint">{offer.names.join(' · ')}</p>
      <div class="grid3" role="group" aria-label="넘어온 몬스터">{#each ['intro', 'mid', 'none'] as const as a (a)}<button type="button" class="pk" class:on={carryAt === a} aria-pressed={carryAt === a} data-at={a} onclick={() => (carryAt = a)}><b>{CARRY_AT[a]}</b></button>{/each}</div>
      <p class="hint" class:over={cvEst.over} data-k="carry-est">⏱ 이 차시 {cvEst.base}분{#if carry} + {cvMin}분(넘어온 몬스터) = <b>{cvEst.tot}분</b>{/if} / {LIMIT}분{#if carry && cvEst.over}<br />⚠ 50분을 넘어요 · 「안 함」= 🎯 허수아비 복습으로 두기를 권해요{:else if !carry}<br />안 함 = 🎯 허수아비 「📚 수업에서 넘어온 문제」 그대로{/if}</p>
    </div>
    {/if}
    {#if L}
      <div class="card" data-k="step3">
        {#if isTest}
          <span class="lab">③ 테스트 모드</span>
          <div class="tm" role="group" aria-label="테스트 모드">{#each TEST_MODES as m (m.k)}<button type="button" class="pk tmb" class:on={tmode === m.k} aria-pressed={tmode === m.k} data-mode={m.k} onclick={() => (tmode = m.k)}><b>{m.ic} {m.t}</b><small>{m.sub}</small></button>{/each}</div>
          <div class="bots" role="group" aria-label="봇 수" data-k="bots-pick"><span>🤖 봇</span><button type="button" class="bst" aria-label="봇 줄이기" disabled={botN <= 0} onclick={() => (botN = botN > 5 ? Math.max(5, botN - 5) : botN - 1)}>−</button><b data-k="bot-n">{botN}명</b><button type="button" class="bst" aria-label="봇 늘리기" disabled={botN >= BOT_MAX} onclick={() => (botN = Math.min(BOT_MAX, botN >= 5 ? botN + 5 : botN + 1))}>＋</button><small>테스트 중에도 바꿔요</small></div>
        {/if}
        {#if needKey && (!isTest || tmode)}
          <span class="lab">{isTest ? '종합실 키 · 테스트 반 폰이 들어오려면' : '③ 종합실 키'}</span>
          <div class="grid2" role="group" aria-label="종합실 키">
            <button type="button" class="pk" class:on={keyPick === 'new'} aria-pressed={keyPick === 'new'} data-key="new" onclick={() => setMode('new')}><b>🎲 수업마다 새로</b></button>
            <button type="button" class="pk" class:on={keyPick === 'fixed'} aria-pressed={keyPick === 'fixed'} data-key="fixed" onclick={() => setMode('fixed')}><b>📌 고정</b></button>
          </div>
          {#if keyPick === 'fixed'}
            {#if keyEdit}
              <div class="kedit"><input class="kin" type="text" name="dungeon-fixed-key" inputmode="numeric" autocomplete="off" data-lpignore="true" data-1p-ignore maxlength="4" placeholder="숫자 4자리" data-k="key-in" bind:value={keyIn} /><button type="button" class="btn2" onclick={() => { keyEdit = false; if (!fk) keyPick = 'new'; }}>취소</button><button type="button" class="btn" data-k="key-save" disabled={!/^\d{4}$/.test(keyIn)} onclick={saveKey}>저장</button></div>
            {:else}
              <div class="kshow"><b data-k="key-big">{fk}</b><button type="button" class="btn2" data-k="key-edit" onclick={() => { keyIn = fk; keyEdit = true; }}>바꾸기</button></div>
            {/if}
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
  {#if summary}<p class="sum" data-k="summary">{summary}</p>{/if}
</div>
<div class="tact">
  {#if !(cls && isOpen(cls))}
  <button type="button" class="btn" class:tbtn={isTest} data-k="open-go" disabled={!ready || (!!openNow && !isTest) || (!!openNow && isTest && tmode === 'remote')} onclick={() => { if (L) openAsk = true; }}>
    {#if openNow && !(isTest && tmode !== 'remote')}수업이 열려 있어요<small>🟢 반을 눌러 이어서 · 닫기</small>{:else if ready && L}{isTest ? `🧪 테스트 열기 · ${L.no}차시` : `▶ ${cls}반 · ${L.no}차시 수업 열기`}{:else}{isTest ? '🧪 테스트 열기' : '▶ 수업 열기'}<small>{!cls ? '① 반' : !L ? '② 차시' : isTest && !tmode ? '③ 테스트 모드' : '③ 종합실 키'}를 골라요</small>{/if}
  </button>
  {/if}
</div>

{#if openAsk && L}
  <Sheet onclose={() => (openAsk = false)}>
    {#snippet title()}{isTest ? '이 테스트를 열까요?' : '이 수업을 열까요?'}{/snippet}
    {#snippet act()}<div class="oarow"><button type="button" class="btn2" onclick={() => (openAsk = false)}>아니요</button><button type="button" class="btn" class:tbtn={isTest} data-k="open-yes" onclick={go}>{isTest ? '🧪 열기' : '▶ 열기'}</button></div>{/snippet}
    <div class="oabox" data-k="open-ask"><b class="oacls">{isTest ? `🧪 테스트 · ${modeOf(tmode)?.ic} ${modeOf(tmode)?.t}` : `${cls}반`}</b><b class="oano">{L.no}차시</b><span class="oatt">{L.title}</span>{#if carry}<small>📦 지난 {offer?.no}차시 몬스터 {carry.ids.length}마리 · {CARRY_AT[carry.at]}</small>{/if}{#if isTest}<small>🤖 봇 {botN}명 · 기록 안 남음</small>{/if}</div>
  </Sheet>
{/if}
{#if stopAsk}
  <Sheet onclose={() => (stopAsk = false)}>
    {#snippet title()}정말 수업을 닫을까요?{/snippet}
    {#snippet act()}<div class="oarow"><button type="button" class="btn2" onclick={() => (stopAsk = false)}>아니요</button><button type="button" class="btn" data-k="stop-yes" onclick={() => { stopAsk = false; onstop(); }}>⏹ 닫기</button></div>{/snippet}
    <p class="hint">{openText} · 닫으면 학생들은 캠프로 돌아가요 · 다음에 「⏯ 이어서」로 그 자리부터</p>
  </Sheet>
{/if}

<style>
  .grid4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 6px 0; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pk3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .pk3.five { grid-template-columns: repeat(5, minmax(0, 1fr)); } /* 차시 7개 이상 = 5칸 2줄 (#132) */
  .pk3.five .pk { padding: 4px 1px; font-size: 13.5px; }
  .pk { position: relative; min-height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 4px 2px; box-shadow: 0 3px 0 var(--press-sh); }
  .pk:active { transform: translateY(2px); box-shadow: none; }
  .pk small { font-size: 11px; font-weight: 500; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .pk.on { border: 2px solid var(--accent); background: var(--surface); }
  .pk.tst { border-color: #8b5cf6; color: #c79bff; grid-column: span 2; }
  .pk.tst.on { border: 2px solid #8b5cf6; background: rgba(139, 92, 246, 0.18); }
  .pk.last::after { content: '지난'; position: absolute; top: -7px; right: -4px; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line); color: var(--text-2); }
  .pk.add { border: 2px dashed var(--line); background: none; box-shadow: none; gap: 0; }
  .pk.add b { color: var(--accent); font-size: 20px; line-height: 1; } .pk.add small { color: var(--text-3); }
  .tm { display: grid; grid-template-columns: 1fr; gap: 6px; } .tmb { flex-direction: row; justify-content: space-between; padding: 0 12px; } .tmb.on { border-color: #8b5cf6; }
  .bots { display: flex; align-items: center; gap: 8px; margin-top: 8px; } .bots > span { font-weight: 700; } .bots small { color: var(--text-3); font-size: 12px; }
  .bst { width: 44px; height: 44px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 800 18px var(--font); } .bst:disabled { opacity: 0.4; }
  .bots b { min-width: 48px; text-align: center; font-variant-numeric: tabular-nums; }
  .kshow { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; padding: 6px 6px 6px 16px; border-radius: var(--r); background: var(--surface-2); }
  .kshow b { font-size: 34px; letter-spacing: 8px; color: var(--accent); font-variant-numeric: tabular-nums; }
  .kshow .btn2, .kedit .btn2, .kedit .btn { min-height: 44px; flex: none; padding: 0 14px; width: auto; }
  .kedit { display: flex; gap: 6px; margin-top: 8px; } .kin { flex: 1; min-width: 0; height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--bg); color: var(--text); font: 700 22px var(--font); padding: 0 12px; letter-spacing: 6px; }
  .flash { margin: 6px 0 0; font-size: 14px; font-weight: 700; color: var(--accent); animation: fl 0.16s ease-out; } @keyframes fl { from { opacity: 0; transform: translateY(-3px); } }
  .sum { margin: 0; padding: 10px 12px; border-radius: var(--r); background: var(--surface); text-align: center; font-weight: 700; font-size: 15px; }
  .item.rs { margin-top: 8px; }
  .live1 { border: 2px solid var(--ok); }
  .oabox { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0 4px; text-align: center; } .oacls { font-size: 22px; color: var(--text-2); } .oano { font-size: 40px; color: var(--accent); line-height: 1.1; } .oatt { font-size: 18px; font-weight: 700; } .oabox small { color: var(--text-2); }
  .oarow { display: flex; gap: 8px; } .oarow button { flex: 1; min-height: 52px; }
  .btn.tbtn { background: #8b5cf6; color: #fff; }
  .hint.over { color: var(--bad); }
  .lab small { font-weight: 500; color: var(--text-3); }
  .lab { display: block; }
  .card + .card { margin-top: 0; }
</style>
