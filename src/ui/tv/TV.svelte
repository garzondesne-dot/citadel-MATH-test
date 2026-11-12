<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { activeIds, BOSS_ID, bossHp, bossState, chainRecord, isChain, isEnd, isLobby, monsterHp, nextIdx, plainRecord, solveLock, stepIdx, stepOf, timeLeft } from '../../raid/raid';
  import { doorStart, endClass, extendTime, hallLobby, nextStep, prevStep, setFocus, setRest, setSheet, setVideo } from '../../raid/actions';
  import { items, chainItems, bossItem } from '../../engine/lessons';
  import { clsLabel, isOld, roster, type Live } from '../../school/school';
  import { COLOR, kindOf, minOf, short } from '../teacher/flow';
  import { liveRoom } from '../room.svelte';
  import { CAMP, dungeonOf } from '../manifest';
  import { useMe } from '../../store/me.svelte';
  import Sprite from '../Sprite.svelte';
  import Demo from '../Demo.svelte';
  import QR from '../QR.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import MyHero from '../camp/MyHero.svelte';
  import SymText from '../q/SymText.svelte';
  import Ink from './Ink.svelte';

  // 🖥 교실 TV = 종합실 (#119 ⑮ · DECISIONS 「✅ ⑮ 교실 TV 컨펌」) — 정식 배치 그대로 + v1.0 색 · 글꼴
  //   위 막대 = 차시 · 단계 이름 · 단계 알약 · 시간 막대(👑 = 문 닫는 시각) · 🚪 코드 · 오른쪽 끝 🧙 · ⚙ 없음
  //   왼쪽 위 숫자 한 칸(같은 자리 · 같은 크기) · 오른쪽 위 정찰 상자 · 가운데 몬스터 + 체력 · 아래 용사 이름표 · 오른쪽 아래 조작 막대(3초 뒤 숨음 · 📌)
  //   정답 · 오답 글자 · 종합실 키는 TV 에 없음
  const { S, L, live, now }: { S: Store; L: LessonPack; live: Live | null; now: number } = $props();
  const code = untrack(() => live?.code ?? '');
  const lr = untrack(() => (code ? liveRoom(S, code) : null));
  onDestroy(() => lr?.stop());
  const R = $derived((lr?.v.room ?? null) as Room | null);
  const M = useMe(9999, 30, true); // 🧙 선생님 용사 (이 기기 · 학생 폰 「내 용사」와 같은 창)
  const pupils = $derived(live ? roster(live.cls, S) : []);
  const ids = $derived(R ? activeIds(R, now) : []);
  const inSet = $derived(new Set(ids));
  const absent = $derived(R?.absent || {});
  const expected = $derived(pupils.filter((p) => !absent[p.uid]));
  const step = $derived(R ? stepOf(L, R) : null);
  const i = $derived(R ? stepIdx(R) : -1);
  const mid = $derived(step?.kind === 'monster' && L.monsters[step.id] ? step.id : null);
  const chain = $derived(!!R && !!mid && isChain(L, R, mid));
  const hp = $derived(R && mid ? monsterHp(L, R, mid, now) : null);
  const bhp = $derived(R && L.boss ? bossHp(L, R, now) : null);
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const left = $derived(R ? timeLeft(R, now) : null);
  const closeAt = $derived(R?.state.deadline ? R.state.deadline + (Number(R.state.extend) || 0) * 60e3 : null);
  const started = $derived(R?.state.stepAt && !isLobby(R as Room) ? (R as Room).state.stepAt : null);
  const nameOf = (u: string) => { const p = pupils.find((x) => x.uid === u); return p ? `${p.num} ${p.name.slice(1)}` : R?.players?.[u]?.nick ?? u; };
  const submitted = (u: string) => !!R && !!step && (step.kind === 'boss' ? bossState(L, R, u).some((x) => x.n > 0) : mid ? (chain ? chainRecord(L, R, mid, u).submitted : plainRecord(L, R, mid, u).submitted) : false);
  const lost = $derived(R ? Object.keys(R.players || {}).filter((u) => !R.players?.[u]?.teacher && !inSet.has(u) && !absent[u]) : []);
  const oldIds = $derived(R ? ids.filter((u) => isOld(R.players?.[u]?.ver)) : []);

  // ── 어떤 장면인가 ──
  let campPeek = $state(false);
  const view = $derived(!R || R.state.closed ? 'camp' : campPeek ? 'camp' : isLobby(R) ? (R.state.hall === 'lobby' ? 'lobby' : 'camp') : isEnd(L, R) ? 'end' : step?.kind === 'concept' ? 'concept' : 'battle');
  let demo = $state(false);
  let ink = $state(false);
  let zoom = $state<0 | 1 | 2>(0);
  let hero = $state(false);
  $effect(() => { void i; untrack(() => { demo = false; zoom = 0; }); }); // 단계가 바뀌면 시연 · 크게 보기 닫힘 (필기는 Ink 가 지움)

  // ── 왼쪽 위 숫자 한 칸 ──
  const box = $derived.by(() => {
    if (!R || view === 'concept') return null;
    if (view === 'camp') return { ic: '📱', lab: '입장한 학생', n: ids.length, m: expected.length, sub: '' };
    if (view === 'lobby') return { ic: '⚔', lab: '들어온 학생', n: ids.length, m: expected.length, sub: [oldIds.length ? `🔄 옛 판 ${oldIds.map(nameOf).join(' · ')}` : '', expected.length > ids.length ? `⏳ ${expected.filter((p) => !inSet.has(p.uid)).map((p) => p.name.slice(1)).slice(0, 4).join(' · ')}${expected.length - ids.length > 4 ? ' …' : ''}` : ''].filter(Boolean).join('  ') };
    if (scout?.on) return { ic: '✋', lab: '준비 완료', n: Object.keys(R.ready?.[scout.id] || {}).length, m: ids.length, sub: '' };
    if (view === 'end') return { ic: '✔', lab: '참여', n: ids.length, m: expected.length, sub: '' };
    return { ic: '✔', lab: '제출', n: ids.filter(submitted).length, m: ids.length, sub: lost.length ? `📵 끊김 ${lost.map(nameOf).join(' · ')}` : '' };
  });

  // ── 정찰 +30초 1초 표시 ──
  let addFlash = $state(''), lastAdd = -1, flashT: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    const a = scout ? Number(R?.state.solveAdd?.[scout.id] || 0) : -1;
    if (lastAdd >= 0 && a !== lastAdd) { untrack(() => { addFlash = a > lastAdd ? '+30초' : '−30초'; if (flashT) clearTimeout(flashT); flashT = setTimeout(() => (addFlash = ''), 1000); }); }
    lastAdd = a;
  });

  // ── 👑 문 닫기 (정식 #68 A): 마감이 되면 장면 · +5분을 아직 안 썼으면 30초 묻기 · 지나면 수업 끝 ──
  $effect(() => { if (R && !R.state.closed && !isLobby(R) && left === 0 && !R.state.door) untrack(() => doorStart(S, code)); });
  const door = $derived(R?.state.door ?? null);
  const askLeft = $derived(door ? Math.max(0, 30 - Math.floor((now - door.at) / 1000)) : 0);
  $effect(() => { if (R && door && !R.state.closed && (door.ask ? askLeft <= 0 : now - door.at > 3000)) untrack(() => endClass(S, L, code)); });
  const extShow = $derived(!!R?.state.doorExt && now - Number(R.state.doorExt) < 3500);
  const giftShow = $derived(!!R?.state.gift && now - Number(R.state.gift.at) < 4000);

  // ── 조작 막대 (마우스 · 터치로 나타나고 3초 뒤 숨음 · 📌 고정) ──
  let dockAt = $state(Date.now()), pin = $state(false), mini = $state(false), sound = $state(true);
  const dockOn = $derived(pin || now - dockAt < 3000);
  const poke = () => (dockAt = Date.now());
  const goLabel = $derived(!R ? '' : view === 'camp' && isLobby(R) ? '⚔ 던전 입장' : isLobby(R) ? '▶ 수업 시작' : '앞으로 ▶');
  const goSub = $derived(!R ? '' : view === 'camp' && isLobby(R) ? '반 전체 던전 대기실로' : short(L.steps[R.meta.resumeFrom != null && isLobby(R) ? R.meta.resumeFrom : nextIdx(L, R)]) || '마무리');
  function go() {
    if (!R) return;
    campPeek = false;
    if (view === 'camp' && isLobby(R)) { hallLobby(S, code); return; }
    nextStep(S, L, code);
  }
  function full() { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); }
  // 📄 문제 창 · 📖 개념 오른쪽 = 학생 폰과 같은 함수(🪞) · 첫 판 숫자
  const nextMon = $derived(step ? L.steps.slice(i).find((s) => s.kind === 'monster' || s.kind === 'boss') ?? null : null);
  const qsOf = (id: string) => (id === BOSS_ID ? (L.boss ? Array.from({ length: L.boss.items }, (_, k) => bossItem(L, `${code}|tv`, k, 0)).filter((q): q is NonNullable<typeof q> => !!q) : []) : L.monsters[id]?.chain ? chainItems(L, id, `${code}|tv`, 0) : items(L, id, `${code}|tv`, 0));
  const sheetQs = $derived(R?.state.sheet ? (L.steps.find((s) => s.id === R.state.sheet)?.kind === 'concept' && nextMon ? qsOf(nextMon.kind === 'boss' ? BOSS_ID : nextMon.id) : qsOf(R.state.sheet)) : []);
  // 위 막대 흐름도 · 남은 시간 선 (#119 덧붙임 3 · 4 · 6)
  const topic = $derived(L.title.split(' · ')[0] ?? L.title);
  const flowSteps = $derived(L.steps.map((s, k) => ({ s, k })).filter((x) => !x.s.later));
  const tline = $derived(view !== 'camp' && view !== 'lobby' && started && closeAt && left != null ? { p: Math.max(0, Math.min(1, (now - started) / (closeAt - started))), red: !!door || left <= 5 * 60e3 } : null);
  const restLeft = $derived(R?.state.rest ? Math.max(0, R.state.rest.at + R.state.rest.min * 60e3 - now) : 0);
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  // 물건 이름표 (늘 보임 · 캠프 그림 안 % 자리) — 열린 것 한 줄 = 복습 유도
  const OBJ = $derived([['🏰 성채던전', '1층 · 단원 평가', 50, 21], ['🌀 차원문', R && !R.state.closed ? `${L.no}차시 던전 · 열림` : `${L.no}차시 던전`, 85, 50], ['📮 우편함', '', 42, 60], ['🎯 허수아비', `복습! ${L.no}차시`, 72, 72], ['⚒ 모루', '연성 54장', 16, 84], ['🔥 모닥불', '', 52, 78]] as const);
  let hk = $state(1);
  const fit = () => (hk = Math.min(1.3, (innerHeight * 0.86) / 760));
  const [CW, CH] = CAMP.size;
  const pct = (v: number, tot: number) => `${((100 * v) / tot).toFixed(2)}%`;
  const site = `${location.origin}${import.meta.env.BASE_URL}`;
</script>

<svelte:window onmousemove={poke} ontouchstart={poke} onkeydown={poke} onresize={fit} />
<div class="tv" class:dim={!!R?.state.focus}>
  <div class="bg" style:background-image="url({view === 'camp' ? CAMP.bg : dungeonOf(L.theme)})" class:campbg={view === 'camp'}></div>

  <!-- 위 막대 (#119 덧붙임 3 · 7 · 9): 반 칩 · n차시 + 소단원 주제 · 흐름도(리모컨 단계 막대와 같은 함수) · 🚪 코드 · ⛺ 내 캠프 / 아래 가장자리 = 남은 시간 선 -->
  <header class="top">
    <span class="ttl">{#if live}<span class="cls">{clsLabel(S, live.cls)}</span>{/if}{#if view === 'camp'}🏛 교사 캠프 · {/if}{L.no}차시 <b>{topic}</b></span>
    <div class="tflow" class:dim={view === 'lobby'} class:hide={view === 'camp'} aria-label="오늘 흐름">
      {#each flowSteps as x (x.s.id)}<span class="fs" class:ok={x.k < i} class:now={x.k === i} style:flex={Math.max(1, minOf(L, R, x.s))} style:--c={COLOR[kindOf(L, R, x.s)]}><i></i><em>{x.s.kind === 'boss' ? '👑 형성평가' : short(x.s)}</em></span>{/each}
    </div>
    {#if view !== 'camp'}<span class="code">🚪 코드<b>{code}</b></span>{/if}
    <button type="button" class="ib" class:on={view === 'camp'} aria-label="내 캠프" onclick={() => (campPeek = view !== 'camp')}>⛺</button>
    {#if tline}
      <div class="tline" class:red={!!door} style:--p="{tline.p * 100}%">
        <i></i><em class:still={!!R?.state.focus}>⏳</em>
        <span class="tlt" class:red={tline.red} class:edge={tline.p > 0.88} class:start={tline.p < 0.06}>남은 {mmss(left ?? 0)}</span>
        <b>👑</b>
      </div>
    {/if}
  </header>

  <!-- 왼쪽 위 숫자 한 칸 -->
  {#if box}
    <div class="nbox" aria-label="{box.lab} {box.n} / {box.m}"><small>{box.ic} {box.lab}</small><b>{box.n}<span> / {box.m}</span></b>{#if box.sub}<em>{box.sub}</em>{/if}</div>
  {/if}

  {#if view === 'camp'}
    <!-- 🏛 교사 캠프: 캠프 그림 통째 + 물건 이름표 늘 · 오른쪽 QR · 코드 -->
    <div class="campv" style:aspect-ratio="{CW} / {CH}">
      <img class="cl0" alt="" src={CAMP.bg} />
      <img class="obj" alt="" src={CAMP.castle.src} style="left:{pct(CAMP.castle.x, CW)};top:{pct(CAMP.castle.y, CH)};width:{pct(CAMP.castle.w, CW)}" />
      <img class="obj" alt="" src={CAMP.tent.src} style="left:{pct(CAMP.tent.x, CW)};top:{pct(CAMP.tent.y, CH)};width:{pct(CAMP.tent.w, CW)}" />
      <img class="obj gate" alt="" class:on={!!R && !R.state.closed} src={CAMP.gateOn.src} style="left:{pct(CAMP.gateOn.x, CW)};top:{pct(CAMP.gateOn.y, CH)};width:{pct(CAMP.gateOn.w, CW)}" />
      <span class="me" style:left="{CAMP.hero.left}%" style:bottom="{CAMP.hero.bottom}%"><HeroSprite id={M.me.hero} row={8} aura={M.me.enh} scale={2} /></span>
      {#each OBJ as [t, s, x, y] (t)}<span class="ob" style:left="{x}%" style:top="{y}%"><b>{t}</b>{#if s}<small>{s}</small>{/if}</span>{/each}
      <button type="button" class="ob me2" style:left="{CAMP.hero.left + 4}%" style:top="{100 - CAMP.hero.bottom - 2}%" onclick={() => { fit(); hero = true; }}><b>🧙 내 용사</b><small>용사 바꾸기</small></button>
    </div>
    <div class="campqr">
      {#if R && !R.state.closed}
        <QR text={site} size={220} />
        <small>📱 휴대폰 카메라로 QR 을 찍어요 · 반 · 번호로 로그인</small>
        <div class="cc">수업 코드 <b>{code}</b></div>
      {:else}
        <div class="cc wait">수업을 열면<br />QR · 코드가 나와요</div>
        <small>교사 폰 「수업 열기」</small>
      {/if}
    </div>
  {:else if view === 'lobby'}
    <!-- ⚔ 던전 대기실: 선생님 용사 둘레에 학생 용사 두 줄 · 선생님 말풍선 -->
    <div class="lring">
      <div class="tchr"><em class="bub">{R?.state.bubble || `${L.no}차시 던전에 온 걸 환영하네!`}</em><HeroSprite id={M.me.hero} scale={3} aura={M.me.enh} /><span>🧙 선생님</span></div>
      <div class="rows">{#each pupils.filter((p) => !absent[p.uid]) as p (p.uid)}<div class="h" class:nin={!inSet.has(p.uid)}><HeroSprite id={R?.players?.[p.uid]?.hero ?? 0} scale={1} dim={!inSet.has(p.uid)} /><span>{p.num} {p.name.slice(1)}</span></div>{/each}</div>
    </div>
  {:else if view === 'concept' && step}
    <!-- 📖 개념 = 2분할 (왼 개념 · 오른 문제 · 누르면 크게) -->
    <div class="split" class:z1={zoom === 1} class:z2={zoom === 2}>
      <button type="button" class="cpane" onclick={() => (zoom = zoom === 1 ? 0 : 1)}><span class="lab">{short(step)} · 개념</span><h4>{step.title.split(' · ').slice(1).join(' · ') || step.title}</h4><p><SymText text={step.say ?? ''} /></p><em class="zm">{zoom === 1 ? '⤡ 누르면 작게' : '⤢ 누르면 크게'}</em></button>
      {#if nextMon}
        {@const qs = qsOf(nextMon.kind === 'boss' ? BOSS_ID : nextMon.id)}
        <button type="button" class="cpane" onclick={() => (zoom = zoom === 2 ? 0 : 2)}><span class="lab">{short(nextMon)} · 문제</span>{#each qs.slice(0, 4) as q, k (k)}<p><SymText text={q.question} /></p>{/each}<em class="zm">{zoom === 2 ? '⤡ 누르면 작게' : '⤢ 누르면 크게'}</em></button>
      {/if}
    </div>
  {:else if view === 'end'}
    <div class="endv"><b>{bhp?.won ? '🏆 승리!' : '🏁 마무리'}</b><p>{ids.length}명이 함께했어요 · 결과는 학생 폰에</p></div>
  {:else if step && R}
    <!-- ⚔ 전투: 몬스터 + 머리 위 체력 · 아래 용사 이름표 -->
    <div class="arena" class:left={demo}>
      {#if step.kind === 'boss' && bhp && L.boss}
        <div class="hp"><span>{L.boss.title.split(' · ').pop()}</span><div class="b"><i style:width="{bhp.max ? (bhp.left / bhp.max) * 100 : 0}%"></i></div><span>{bhp.left} / {bhp.max}</span></div>
        <div class="mon" class:shadow={!!scout?.on}><Sprite ref={L.boss.sprite} pose={bhp.won ? 'down' : 'idle'} size={300} /></div>
      {:else if mid && hp}
        <div class="hp"><span>{step.title}</span><div class="b"><i style:width="{hp.max ? (hp.left / hp.max) * 100 : 0}%"></i></div><span>{hp.left} / {hp.max}</span></div>
        <div class="mon" class:shadow={!!scout?.on}><Sprite ref={L.monsters[mid]?.sprite ?? ''} pose={hp.left <= 0 ? 'down' : 'idle'} size={260} /></div>
      {/if}
      <div class="party">{#each ids as u (u)}<div class="h"><HeroSprite id={R.players?.[u]?.hero ?? 0} scale={1} /><span class:ok={submitted(u)}>{nameOf(u)}{submitted(u) ? ' ✔' : ''}</span></div>{/each}</div>
    </div>
    {#if scout?.on}
      <div class="sc"><div class="q">🌫 정찰 — 학습지 「{short(step)}」을 먼저 풀어요</div><div class="r">등장까지 <b>{Math.ceil(scout.left / 1000)}</b>초 {#if addFlash}<span class="adj">{addFlash}</span>{/if}</div></div>
    {/if}
    {#if demo}<div class="dpane"><Demo {L} {step} {code} onclose={() => (demo = false)} /></div>{/if}
  {/if}

  <!-- 덮개: 🔴 집중 · 🏕 쉼터 · 📄 문제 · 🎬 영상 · 👑 문 닫기 · 🎁 선물 -->
  {#if R?.state.sheet && sheetQs.length}<div class="ov sheet"><b>📄 {short(L.steps.find((s) => s.id === R.state.sheet))}</b>{#each sheetQs.slice(0, 6) as q, k (k)}<p><SymText text={q.question} /></p>{/each}</div>{/if}
  {#if R?.state.video && L.videos?.[R.state.video]}<div class="ov vid"><video src={L.videos[R.state.video]} autoplay controls muted={!sound}></video></div>{/if}
  {#if R?.state.rest}<div class="ov rest"><b>🏕 쉼터</b><p>{mmss(restLeft)} · 게임 시계는 멈춰 있어요</p></div>{/if}
  {#if R?.state.focus}<div class="ov fo"><b>⏸ 집중</b><p>선생님을 보세요 · 게임은 멈춰 있어요</p></div>{/if}
  {#if door && door.ask && !R?.state.closed}<div class="ov door"><div class="k">👑🚪</div><p>보스가 던전 문을 닫으려 한다!</p><small>⏰ 선생님, 5분 연장할까요? <b>{askLeft}</b></small><button type="button" class="ext" onclick={() => extendTime(S, code)}>⏰ +5분</button></div>
  {:else if door && !R?.state.closed}<div class="ov door"><div class="k">👑🚪</div><p>보스가 던전 문을 닫았다!</p></div>{/if}
  {#if extShow}<div class="ov door ext2"><div class="k">🧙🚪</div><p>선생님이 문을 밀어 열었다!</p><div class="plus">⏳ +5분!</div></div>{/if}
  {#if giftShow && R?.state.gift}<div class="gift" role="status">🎁 선생님 선물! 모두 💎 {R.state.gift.g}</div>{/if}
  {#if ink}<Ink step={i} onclose={() => (ink = false)} />{/if}

  <!-- 조작 막대 (#119 덧붙임 2): 🔊 · ⛶ | 🏕 · 🎬 · 📄 · 🎮 · ✏ | 🔴 집중 · « 뒤로 · 앞으로 ▶ · 📌 — 캠프 · 메뉴 · 수업 끝 단추 없음 (수업 닫기 = 교사 폰) -->
  <nav class="dock" class:on={dockOn} aria-label="조작 막대">
    <button type="button" class="t" class:off={!sound} aria-pressed={!sound} onclick={() => (sound = !sound)}>{sound ? '🔊' : '🔇'}<small>{sound ? '소리' : '꺼짐'}</small></button>
    <button type="button" class="t" onclick={full}>⛶<small>전체</small></button>
    {#if R && !isLobby(R) && !R.state.closed && view !== 'camp'}
      <span class="sep"></span>
      <button type="button" class="t" class:on={!!R.state.rest} onclick={() => setRest(S, code, !R.state.rest)}>🏕<small>쉼터</small></button>
      <button type="button" class="t" disabled={!step || !L.videos?.[step.id]} onclick={() => setVideo(S, code, R.state.video ? null : step?.id ?? null)}>🎬<small>영상</small></button>
      <button type="button" class="t" class:on={!!R.state.sheet} disabled={!mid && step?.kind !== 'concept'} onclick={() => setSheet(S, code, R.state.sheet ? null : step?.id ?? null)}>📄<small>문제</small></button>
      <button type="button" class="t" class:on={demo} disabled={!mid && step?.kind !== 'boss'} onclick={() => (demo = !demo)}>🎮<small>시연</small></button>
      <button type="button" class="t" class:on={ink} onclick={() => (ink = !ink)}>✏<small>필기</small></button>
    {/if}
    {#if R && !R.state.closed}
      <span class="sep"></span>
      {#if view !== 'camp' && !isLobby(R)}<button type="button" class="n fo" class:on={!!R.state.focus} aria-pressed={!!R.state.focus} onclick={() => setFocus(S, code, !R.state.focus)}>🔴 집중</button>
        <button type="button" class="n" disabled={i <= 0} onclick={() => prevStep(S, L, code)}>« 뒤로</button>{/if}
      {#if !isEnd(L, R)}<button type="button" class="n go" disabled={isLobby(R) && view === 'lobby' && !ids.length} onclick={go}>{goLabel}<small>{goSub}</small></button>{/if}
    {/if}
    <button type="button" class="t" class:on={pin} aria-pressed={pin} onclick={() => (pin = !pin)}>📌<small>고정</small></button>
  </nav>

  {#if hero}<div class="heroov"><div class="hk" style:transform="translateZ(0) scale({hk})"><MyHero me={M.me} persist={M.save} onclose={() => (hero = false)} /></div></div>{/if}
</div>

<style>
  .tv { position: fixed; inset: 0; container-type: size; overflow: hidden; color: #fff; font-family: var(--font); background: #0b0a08; }
  .bg { position: absolute; inset: 0; background: center 60% / cover no-repeat; image-rendering: pixelated; }
  .bg.campbg { filter: blur(14px) brightness(0.45); transform: scale(1.1); }
  .tv.dim .arena, .tv.dim .bg { filter: brightness(0.35); }
  /* 위 막대 = 테마 토큰 (#119 덧붙임 2 ①) · 장면 위 칩 · 덮개는 테마와 상관없이 어두운 칩 + 흰 글자 + 금빛(#f5b84a) */
  .top { position: absolute; left: 0; right: 0; top: 0; height: 5.4cqw; z-index: 6; display: flex; align-items: center; gap: 1cqw; padding: 0 1.2cqw; background: var(--bg); border-bottom: 1px solid var(--line); color: var(--text); }
  .ttl { flex: none; max-width: 30cqw; font-size: 1.5cqw; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ttl b { color: var(--accent); }
  .cls { display: inline-block; margin-right: 0.7cqw; padding: 0.1cqw 0.8cqw; border-radius: 0.6cqw; background: var(--accent); color: var(--on-accent); font-size: 1.3cqw; vertical-align: 0.1cqw; }
  .tflow { flex: 1; min-width: 0; display: flex; gap: 0.25cqw; align-items: flex-start; padding-top: 0.5cqw; }
  .tflow.hide { visibility: hidden; }
  .fs { display: flex; flex-direction: column; gap: 0.25cqw; min-width: 0; }
  .fs i { height: 0.7cqw; border-radius: 9px; background: color-mix(in srgb, var(--c) 40%, var(--surface-2)); }
  .fs em { font-style: normal; font-size: 0.85cqw; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: clip; text-align: center; }
  .fs.ok i { background: var(--ok); }
  .fs.now i { background: var(--accent); height: 1.1cqw; box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); }
  .fs.now em { color: var(--text); font-weight: 700; font-size: 1cqw; }
  .tflow.dim .fs i { background: color-mix(in srgb, var(--c) 40%, var(--surface-2)) !important; height: 0.7cqw !important; box-shadow: none !important; }
  .tflow.dim .fs em { color: var(--text-2) !important; font-weight: 400 !important; font-size: 0.85cqw !important; }
  .code { flex: none; font-size: 1.4cqw; font-weight: 700; white-space: nowrap; }
  .code b { margin-left: 0.5cqw; color: var(--text); font-size: 2cqw; letter-spacing: 0.1cqw; }
  .ib { flex: none; width: 3.6cqw; height: 3.6cqw; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); font-size: 1.8cqw; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
  .ib.on { border: 2px solid var(--accent); }
  .tline { position: absolute; left: 0; right: 0; bottom: -1px; height: 0.4cqw; background: color-mix(in srgb, var(--text) 10%, transparent); z-index: 7; pointer-events: none; }
  .tline > i { position: absolute; left: 0; top: 0; bottom: 0; width: var(--p); background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), var(--accent)); }
  .tline.red > i { background: linear-gradient(90deg, #e5484d88, #e5484d); }
  .tline em { position: absolute; left: var(--p); top: 50%; transform: translate(-50%, -50%); font-style: normal; font-size: 1.5cqw; line-height: 1; filter: drop-shadow(0 0 0.3cqw rgba(0, 0, 0, 0.7)); animation: hgs 2.4s ease-in-out infinite; }
  .tline em.still { animation: none; }
  @keyframes hgs { 0%, 80% { transform: translate(-50%, -50%) rotate(0); } 90%, 100% { transform: translate(-50%, -50%) rotate(180deg); } }
  .tline b { position: absolute; left: 97%; top: 50%; transform: translate(-50%, -50%); font-size: 1.1cqw; line-height: 1; }
  .tlt { position: absolute; left: var(--p); top: 100%; margin-top: 0.35cqw; transform: translateX(-50%); white-space: nowrap; font-size: 1.25cqw; font-weight: 700; color: #f2f3f5; background: rgba(15, 17, 21, 0.85); border: 1px solid color-mix(in srgb, #f5b84a 60%, transparent); border-radius: 99px; padding: 0.1cqw 0.8cqw; }
  .tlt.edge { transform: translateX(-90%); }
  .tlt.start { transform: translateX(-10%); }
  .tlt.red { border-color: #e5484d; color: #ffb3b0; }
  .nbox { position: absolute; left: 1.5cqw; top: 14cqh; z-index: 3; width: 17cqw; height: 15cqh; border-radius: 1.6cqh; background: rgba(8, 9, 12, 0.75); border: 1px solid rgba(255, 255, 255, 0.18); padding: 1.2cqh 1.2cqw; display: flex; flex-direction: column; gap: 0.4cqh; overflow: hidden; }
  .nbox small { font-size: 2cqh; font-weight: 700; color: #d6d9e0; }
  .nbox b { font-size: 6cqh; line-height: 1; color: var(--accent); }
  .nbox b span { font-size: 3cqh; color: #fff; }
  .nbox em { font-style: normal; font-size: 1.7cqh; color: #ffd7a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .campv { position: absolute; left: 22cqw; top: 11cqh; height: 85cqh; z-index: 1; }
  .campv img { position: absolute; image-rendering: pixelated; }
  .campv .cl0 { inset: 0; width: 100%; height: 100%; position: absolute; }
  .campv .obj.on { filter: brightness(1.3); }
  .campv .me { position: absolute; z-index: 1; transform: translateX(-50%); }
  .ob.me2 { cursor: pointer; border-color: #6cc6ff; color: #fff; font: inherit; } .ob.me2 small { color: #6cc6ff; }
  .campv .gate { opacity: 0; } .campv .gate.on { opacity: 1; }
  .ob { position: absolute; transform: translate(-50%, -50%); z-index: 2; display: flex; flex-direction: column; align-items: center; padding: 0.5cqh 0.9cqw; border-radius: 1.4cqh; background: rgba(10, 12, 18, 0.82); border: 1px solid rgba(255, 255, 255, 0.22); white-space: nowrap; box-shadow: 0 3px 0 #000; }
  .ob b { font-size: 2.2cqh; } .ob small { font-size: 1.6cqh; color: #d6d9e0; }
  .campqr { position: absolute; right: 3cqw; top: 16cqh; width: 26cqw; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 1.4cqh; padding: 2cqh 1.4cqw; border-radius: 2cqh; background: rgba(8, 9, 12, 0.8); border: 1px solid rgba(255, 255, 255, 0.18); text-align: center; }
  .campqr :global(svg) { width: 34cqh; height: 34cqh; border-radius: 1.2cqh; }
  .campqr small { font-size: 1.9cqh; color: #d6d9e0; }
  .cc { font-size: 2.6cqh; font-weight: 700; } .cc b { display: block; font-size: 8cqh; color: var(--accent); letter-spacing: 0.4cqw; line-height: 1.1; }
  .cc.wait { font-size: 3.2cqh; padding: 8cqh 0; color: #d6d9e0; }
  .lring { position: absolute; left: 20cqw; right: 2cqw; top: 13cqh; bottom: 16cqh; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 2cqh; }
  .tchr { display: flex; flex-direction: column; align-items: center; gap: 0.6cqh; }
  .tchr span { font-size: 2.2cqh; font-weight: 700; background: rgba(8, 9, 12, 0.72); padding: 0.3cqh 1cqw; border-radius: 999px; }
  .bub { font-style: normal; font-size: 3cqh; font-weight: 700; color: #1a1300; background: #fff7e0; padding: 1cqh 1.6cqw; border-radius: 2cqh; position: relative; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.5); }
  .bub::after { content: ''; position: absolute; left: 50%; bottom: -1.4cqh; margin-left: -1cqh; border: 1cqh solid transparent; border-top-color: #fff7e0; }
  .rows { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.2cqh 1.4cqw; max-width: 76cqw; }
  .h { display: flex; flex-direction: column; align-items: center; gap: 0.3cqh; }
  .h span { font-size: 1.8cqh; font-weight: 700; background: rgba(8, 9, 12, 0.72); padding: 0.2cqh 0.7cqw; border-radius: 999px; white-space: nowrap; }
  .h span.ok { color: var(--ok); }
  .h.nin { opacity: 0.4; }
  .split { position: absolute; left: 20cqw; right: 2cqw; top: 14cqh; bottom: 3cqh; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 1.4cqw; }
  .split.z1 { grid-template-columns: 1fr 0fr; } .split.z2 { grid-template-columns: 0fr 1fr; }
  .split.z1 .cpane:nth-child(2), .split.z2 .cpane:nth-child(1) { display: none; }
  .cpane { position: relative; text-align: left; border: 0; border-radius: 2cqh; background: #fbf8f1; color: #1b1a17; padding: 3cqh 2cqw; display: flex; flex-direction: column; gap: 1.4cqh; overflow: hidden; font: inherit; cursor: zoom-in; }
  .cpane .lab { font-size: 2.2cqh; font-weight: 700; color: #7a4a10; }
  .cpane h4 { margin: 0; font-size: 4cqh; }
  .cpane p { margin: 0; font-size: 3.2cqh; line-height: 1.5; }
  .split.z1 .cpane p, .split.z2 .cpane p { font-size: 4.4cqh; }
  .zm { position: absolute; right: 1.4cqw; bottom: 1.4cqh; font-style: normal; font-size: 1.8cqh; color: #7a6850; }
  .arena { position: absolute; inset: 0; z-index: 1; }
  .arena.left { right: 46cqw; }
  .arena .hp { position: absolute; left: 50%; top: 15cqh; transform: translateX(-50%); width: 40cqw; display: grid; grid-template-columns: auto 1fr auto; gap: 0.8cqw; align-items: center; font-size: 2.4cqh; font-weight: 700; text-shadow: 0 1px 2px #000; white-space: nowrap; }
  .arena.left .hp { width: 30cqw; }
  .arena .hp .b { height: 1.6cqh; border-radius: 1cqh; background: rgba(0, 0, 0, 0.6); overflow: hidden; }
  .arena .hp .b i { display: block; height: 100%; background: var(--hp); transition: width 0.5s ease-out; }
  .mon { position: absolute; left: 50%; top: 22cqh; transform: translateX(-50%); }
  .mon :global(*) { max-height: 50cqh; }
  .mon.shadow { filter: brightness(0.08); }
  .party { position: absolute; left: 3cqw; right: 3cqw; bottom: 13cqh; display: flex; flex-wrap: wrap; justify-content: center; gap: 1cqh 1.2cqw; }
  .sc { position: absolute; right: 2cqw; top: 14cqh; z-index: 3; padding: 1.4cqh 1.4cqw; border-radius: 1.6cqh; background: rgba(8, 9, 12, 0.78); border: 1px solid rgba(255, 255, 255, 0.2); display: flex; flex-direction: column; gap: 0.6cqh; align-items: flex-end; }
  .sc .q { font-size: 2.2cqh; font-weight: 700; }
  .sc .r { font-size: 2.4cqh; } .sc .r b { font-size: 5cqh; color: #9fc8ff; }
  .adj { margin-left: 0.6cqw; font-weight: 700; color: #9fc8ff; background: rgba(20, 34, 58, 0.85); border: 2px solid #6aa3ff; border-radius: 999px; padding: 0.3cqh 1cqw; }
  .dpane { position: absolute; right: 1.5cqw; top: 14cqh; bottom: 12cqh; width: 44cqw; z-index: 4; transform: translateZ(0); border-radius: 2cqh; overflow: hidden; border: 1px solid var(--line); }
  .endv { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqh; }
  .endv b { font-size: 10cqh; text-shadow: 0 4px 0 #000; } .endv p { font-size: 3cqh; margin: 0; }
  .ov { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.6cqh; text-align: center; background: rgba(5, 6, 10, 0.55); }
  .ov b { font-size: 9cqh; text-shadow: 0 4px 0 #000; }
  .ov p { margin: 0; font-size: 3.4cqh; font-weight: 700; }
  .ov small { font-size: 2.2cqh; color: #d6d9e0; }
  .ov.sheet { background: rgba(251, 248, 241, 0.97); color: #1b1a17; align-items: flex-start; justify-content: flex-start; padding: 12cqh 6cqw; text-align: left; }
  .ov.sheet b { font-size: 4cqh; text-shadow: none; }
  .ov.sheet p { font-size: 3.4cqh; font-weight: 500; }
  .ov.vid video { max-width: 80cqw; max-height: 80cqh; }
  .ov.door .k { font-size: 14cqh; }
  .ov.door small b { color: var(--accent); font-size: 4cqh; }
  .ext { height: 9cqh; padding: 0 3cqw; border: 0; border-radius: 2cqh; background: var(--accent); color: var(--on-accent); font: 700 3.6cqh var(--font); box-shadow: 0 4px 0 var(--accent-sh); cursor: pointer; }
  .plus { font-size: 7cqh; font-weight: 700; color: var(--accent); }
  .gift { position: absolute; left: 50%; top: 16cqh; transform: translateX(-50%); z-index: 7; font-size: 5cqh; font-weight: 700; padding: 1.4cqh 3cqw; border-radius: 999px; background: rgba(8, 9, 12, 0.85); border: 2px solid var(--gem); }
  .dock { position: absolute; right: 1.5cqw; bottom: 2cqh; z-index: 8; display: flex; align-items: center; gap: 0.5cqw; padding: 0.8cqh 0.8cqw; border-radius: 2cqh; background: rgba(8, 9, 12, 0.88); border: 1px solid rgba(255, 255, 255, 0.18); opacity: 0; transform: translateY(1cqh); transition: opacity var(--t), transform var(--t); pointer-events: none; max-width: 97cqw; }
  .dock.on { opacity: 1; transform: none; pointer-events: auto; }
  .dock button { cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.16); background: rgba(255, 255, 255, 0.06); color: #fff; border-radius: 1.4cqh; font: 700 2.6cqh var(--font); }
  .dock button:disabled { opacity: 0.35; cursor: default; }
  .dock .t { width: 7cqh; height: 7.6cqh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2cqh; padding: 0; }
  .dock .t small { font-size: 1.5cqh; color: #d6d9e0; }
  .dock .t.on { border: 2px solid var(--accent); }
  .dock .t.off { border: 2px solid var(--bad); }
  .dock .n { height: 7.6cqh; padding: 0 1.2cqw; font-size: 2.2cqh; display: flex; flex-direction: column; align-items: center; justify-content: center; white-space: nowrap; }
  .dock .n small { font-size: 1.5cqh; color: inherit; opacity: 0.8; }
  .dock .n.go { background: var(--accent); color: var(--on-accent); border-color: var(--accent); box-shadow: 0 3px 0 var(--accent-sh); }
  .dock .n.fo { border: 2px solid #e5484d; }
  .dock .n.fo.on { background: #e5484d; color: #fff; }
  .dock .sep { width: 1px; height: 6cqh; background: rgba(255, 255, 255, 0.2); margin: 0 0.3cqw; }
  .heroov { position: absolute; inset: 0; z-index: 12; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; }
  .hk { position: relative; flex: none; width: 430px; height: 760px; border-radius: 22px; overflow: hidden; color: var(--text); background: var(--bg); }
</style>
