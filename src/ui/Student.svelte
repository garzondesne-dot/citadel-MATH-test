<script lang="ts">
  import BossForm from './q/BossForm.svelte';
  import { V4 } from '../raid/raid';
  import { feat } from '../school/features.svelte';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Store } from '../model/types';
  import { PROFILES } from '../model/profiles';
  import { atkClock, atkTrack, bossHp, chainDown, chainRecord, gameNow, isChain, isEnd, isLobby, monsterHp, resultOf, solveLock, stepIdx, stepOf } from '../raid/raid';
  import { heartbeat, leave, scoutReady } from '../raid/actions';
  import { liveRoom, liveValue } from './room.svelte';
  import { clock, useClock } from './clock.svelte';
  import Scene from './battle/Scene.svelte';
  import ModeSwitch from './ModeSwitch.svelte';
  import { paperOn } from './submit.svelte';
  import BottomAction from './battle/BottomAction.svelte';
  import SymSheet from './battle/SymSheet.svelte';
  import MonsterForm from './q/MonsterForm.svelte';
  import ChainView from './q/ChainView.svelte';
  import BossCard from './q/BossCard.svelte';
  import SymText from './q/SymText.svelte';
  import { fx, heroPose } from './battle/fx.svelte';
  import AttackFx from './battle/AttackFx.svelte';
  import { attackDef, attackMs, attackOf, attackStrong, type AttackDef } from '../raid/attacks';
  import { holyArmed, holyCan, holyOn, pracHitsAll, stone, BOSS_ID as BID, plainRecord, unlocksOf, healsGiven } from '../raid/raid';
  import { holyArm, holyUse } from '../raid/actions';
  import { guardQ } from './battle/fx.svelte';
  import { ELEM_FX } from './manifest';
  import { sfx } from './sound.svelte';
  import { symState } from './battle/symsheet.svelte';
  import Sheet from './battle/Sheet.svelte';
  import PrepImg from './q/PrepImg.svelte';
  import { conceptOf } from '../school/prep';
  import { summaryOf } from '../school/records';
  import { BUILD } from '../build';
  import { savedLook } from '../store/me.svelte';
  import { isExcluded } from '../school/school';
  import { mailLine, type Mail } from '../school/mail';
  import { meBound } from '../store/meSync';
  import FunPhone from './rest/FunPhone.svelte';

  // 📱 학생 폰 (탭 B) — ②B 틀: 장면 띠 → 카드(정찰 · 문제 · 결과 · 틀림이 같은 자리) → 주요 단추 1
  //   다시 그려도 스크롤 · 입력이 날아가지 않음: 화면 조각은 그대로 두고 바뀐 칸만 고침 (정식 paint() 원칙)
  const { S, L, code, uid, num, nick: nick0 = '', cls = '', board = false }: { S: Store; L: LessonPack; code: string; uid: string; num: number; nick?: string; cls?: string; /** 📋 게시판 던전(#143) = 수업 기록(records)을 쓰지 않음 */ board?: boolean } = $props();
  const nick = untrack(() => nick0 || `학생 ${String(num).padStart(2, '0')}`);
  // 🔄 들어온 판 (옛 판 확인 · 시험은 ?ver= 로 옛 판 흉내) · 선생님이 「새로 고침」을 보내면 다시 불러옴
  const ver = untrack(() => new URLSearchParams(location.search).get('ver') || BUILD);
  const loadedAt = Date.now();
  const live = untrack(() => {
    const x = untrack(() => !!cls && isExcluded(S, cls, num));
    const hb = () => heartbeat(S, code, uid, num, nick, { cls, ver, hero: savedLook().hero, fx: savedLook().fx, enh: savedLook().enh, x });
    hb();
    const beat = setInterval(hb, 3000);
    const bye = () => leave(S, code, uid);
    addEventListener('pagehide', bye);
    const lr = liveRoom(S, code);
    return { v: lr.v, stop: () => { clearInterval(beat); lr.stop(); removeEventListener('pagehide', bye); } };
  });
  const stopClock = useClock();
  onDestroy(() => { live.stop(); stopClock(); });

  const R = $derived(live.v.room);
  $effect(() => { const t = R?.state.reload?.[uid]; if (t && t > loadedAt) location.reload(); });
  // 🎁 수업 중 선생님 선물 = 받은 학생 폰에만 한 줄 (지갑에는 캠프에서 들어감 · #119 덧붙임)
  const gv = untrack(() => liveValue<Record<string, { g: number; at: number; mail?: boolean; fun?: string }>>(S, `gifts/${uid}`));
  onDestroy(gv.stop);
  const giftNew = $derived(Object.values(gv.v.val || {}).filter((x) => x && !x.mail && !x.fun && x.at > loadedAt && clock.now - x.at < 4000));
  // ✉ 수업 중 선생님 메시지 · 답장 (#130) = 받은 학생 폰에만 한 줄 (💎 는 캠프에서 지갑에)
  const mv = untrack(() => liveValue<Record<string, Mail>>(S, `mail/${uid}`));
  onDestroy(mv.stop);
  const mailNew = $derived(Object.values(mv.v.val || {}).filter((x) => x && x.at > loadedAt && clock.now - x.at < 4000).sort((a, b) => b.at - a.at)[0] ?? null);
  const now = $derived(clock.now); // ① 수업 시계 = 접속 · 체력 머릿수 · (b8) 남은 수업 시간
  const gnow = $derived(R ? gameNow(R, now) : now); // ② 게임 시계 (#118) = 공격 멈춤 초 · 생각 시간 — 집중이면 멈춤
  const step = $derived(R ? stepOf(L, R) : null);
  const mid = $derived(step?.kind === 'monster' && L.monsters[step.id] ? step.id : null);
  const chain = $derived(!!R && !!mid && isChain(L, R, mid));
  const hp = $derived(R && mid ? monsterHp(L, R, mid, now) : null);
  const bhp = $derived(R && L.boss ? bossHp(L, R, now) : null);
  const down = $derived(!!hp && hp.max > 0 && hp.left <= 0);
  const pracAll = $derived(down && R && step?.kind === 'monster' ? pracHitsAll(L, R, step.id) : 0); // 🔥 처치 결과 한 줄
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const gem = $derived(R ? (() => { const g = PROFILES[R.meta.profile]?.reward.gem; return typeof g === 'number' ? g : 0; })() : 0);
  const crec = $derived(R && mid && chain ? chainRecord(L, R, mid, uid) : null);
  const downs = $derived(R && mid && chain ? chainDown(L, R, mid, now) : []);
  // 🎞 용사 모션 (📜 2026-11-14 머리 🔨): ❤ 0 잠김 = 쓰러짐 줄 · 받은 힐 + 풀어주기가 늘면 힐 받음 줄 · 내가 ⚡ 쓰면(힐 · 묶기 · 🌟) 힐 시전 줄
  const myRec = $derived(R && mid && L.monsters[mid] ? (crec ?? plainRecord(L, R, mid, uid)) : null);
  const slump = $derived(!!myRec && (!!myRec.locked || ((myRec as { fail?: boolean }).fail ?? (!myRec.perfect && myRec.submitted && myRec.left <= 0 && !myRec.canRetry))));
  const healN = $derived(myRec && R && mid ? myRec.healed + unlocksOf(R, mid, uid) : 0);
  const gaveN = $derived(R && mid ? healsGiven(R, mid, uid) : 0);
  let gave0 = -1;
  $effect(() => { const g = gaveN; untrack(() => { if (gave0 >= 0 && g > gave0) heroPose('heal', 1400); gave0 = g; }); });
  // 졸개 체력(정식 chainDown: 넘어야 할 학생 수 − 넘은 학생) · 대장 = 공동 체력
  const sceneHp = $derived.by(() => {
    if (step?.kind === 'boss' && bhp) return { hp: { left: bhp.left, max: bhp.max }, label: L.boss?.title.split(' · ').pop() ?? '보스' };
    if (crec && !crec.done && crec.stage < crec.n - 1) { const d = downs[crec.stage]; if (d) return { hp: { left: d.left, max: d.max }, label: `졸개 ${'①②③④⑤⑥'[crec.stage]}` }; }
    return hp ? { hp: { left: hp.left, max: hp.max }, label: chain ? '대장' : '' } : null;
  });

  // 👾 몬스터 공격: 모든 기기가 같은 시계로 같은 순간에 맞음 → 문제 화면이면 lock 초 동안 공격 효과 (정식 monsterStrike · #152 공격 종류 = 차시 팩 attack)
  //   멈춤 · 파지직 = 입력 막힘 / 안개 · 얼음 · 화염 = 손풀기로 일찍 풀림 / 강타 = 흔들기만 · 모두 lock 초 지나면 저절로
  //   #161 세기 = 몬스터(보스) 체력 50% 아래면 강(분노 · 효과 조금 길게 · 소리 · 장면 붉게 · 멈춤 시간 상한 안) · 속성 소리
  let atk = $state<{ def: AttackDef; at: number; until: number; strong: boolean } | null>(null);
  const memo = {};
  function strike(def: AttackDef, ms: number, strong = false) {
    atk = { def, at: gnow, until: gnow + ms, strong }; iceEnd = 'melt';
    fx.ice = def.id === 'ice' ? 4 : 0; fx.fire = def.id === 'fire'; fx.bind = def.id === 'bind'; fx.chain = { cut: 0, broken: false, open: false };
    sfx((def.id === 'wind' ? ELEM_FX.gale : ELEM_FX[def.elem])?.sfx ?? 'smash'); if (strong) setTimeout(() => sfx('hurt', 0.5), 180);
  }
  $effect(() => {
    if (!R) return;
    const c = atkClock(L, R, now);
    if (!c || c.paused || !feat('mon-attack')) return; // 🧩 💥 몬스터 공격 꺼짐 = 반격 없음
    if (atkTrack(memo, c, `${c.kind}|${c.mid}`).strike && !symState.open) untrack(() => {
      // 🛡 홀리 방패 (정식 student.js 395): 켜 둔 +10 용사가 있으면 반 전체 안 멈춤 · 내가 켰으면 막은 기록(→ 🗿 석화 10초) + 날개 · 방패
      const hg = holyArmed(R, c.mid, now, c.per); if (hg.length) { guardStrike(hg, c.mid); return; }
      const d = attackOf(L, step, c.k), st = attackStrong(sceneHp?.hp); strike(d, attackMs(d, c.lock, st), st);
    });
  });
  let gtoast = $state('');
  function guardStrike(us: string[], mid: string) {
    const mine = us.includes(uid), names = us.filter((u) => u !== uid).map((u) => R?.players?.[u]?.nick || '친구');
    if (mine) { holyUse(S, code, uid, mid); guardQ.v += 1; }
    const tell = () => { gtoast = `🛡 ${mine ? `내${names.length ? ' · ' + names.join(' · ') : ''}` : names.join(' · ') + '의'} 홀리 방패! 안 멈춰요`; sfx('correct', 0.75); setTimeout(() => (gtoast = ''), 1600); };
    setTimeout(tell, mine ? 1120 : 200);
  }
  // 🛡 켤 수 있음 · 켜 둠 (장면 띠 왼쪽 위 단추) · 🗿 석화 남은 초
  const holyMid = $derived(step?.kind === 'boss' ? BID : mid);
  const holyState = $derived(!R || !holyMid ? '' : holyOn(R, holyMid, uid) ? 'on' : holyCan(L, R, uid, now) ? 'can' : '');
  const stoneNow = $derived(R && holyMid ? stone(R, holyMid) : null);
  const stoneLeft = $derived(stoneNow ? Math.max(0, Math.ceil((stoneNow.until - now) / 1000)) : 0);
  function toggleHoly() { if (!R || !holyMid) return; const on = holyState !== 'on'; holyArm(S, code, uid, holyMid, on); sfx(on ? 'holy' : 'click', 0.8); }
  const atkOn = $derived(!!atk && atk.until > gnow && !scout?.on);
  const stunned = $derived(atkOn && !!atk?.def.lockInput);
  // 손풀기로 풀림 (얼음 4번 · 화염 꾹 1초) · 시간이 지나면 저절로
  let iceEnd = $state<'shatter' | 'melt'>('melt'); // 🧊 얼음이 톡 4번으로 끝났나(깨짐) · 시간으로 끝났나(녹음)
  $effect(() => { if (atk && atk.until > gnow && atk.def.id === 'ice' && fx.ice === 0) untrack(() => (iceEnd = 'shatter')); });
  $effect(() => { if (atk && atk.until > gnow && ((atk.def.id === 'ice' && fx.ice === 0) || (atk.def.id === 'fire' && !fx.fire))) untrack(() => { if (atk) atk = { ...atk, until: gnow }; }); });
  $effect(() => { if (!atkOn) untrack(() => { fx.ice = 0; fx.fire = false; fx.bind = false; }); });
  // 화면 시험 고리(#151 · #152 · 학생 화면엔 안 보임 · 출시 전 메모 5): 지금 몬스터 공격을 한 번 맞음 (종류 = 등록 표 id)
  (globalThis as { __strike?: (ms?: number, id?: string, strong?: boolean) => void }).__strike = (ms = 3000, id = 'pause', strong = false) => strike(attackDef(id), ms, strong);
  $effect(() => { fx.block = stunned; }); onDestroy(() => { fx.block = false; fx.ice = 0; fx.fire = false; fx.bind = false; }); // ⛓ 입력 막힘이 바뀔 때마다 사슬 표시를 지우지 않게 (정리는 화면을 떠날 때만) // 💥 주요 단추 = 같은 자리 「⏳ 막는 중…」(#151)
  const locked = $derived(!!scout?.on || stunned);
  const result = $derived(R && isEnd(L, R) ? resultOf(L, R, uid) : null);
  // 📚 수업 끝 기록 = 시험 서버 records/{반}/{번호}/{차시} = 정식 꼴 (#141 · 그 학생으로 로그인한 폰만 · 한 수업에 한 번 · 다시 끝나면 덮어씀)
  $effect(() => { const b = meBound(); if (!result || !b || board || !R) return; untrack(() => { const path = `records/${b.cls}/${b.num}/${L.id}`; b.S.set(path, summaryOf(L, R, uid, code, S.now(), b.S.get(path))); }); }); // 정식 꼴 (#163 ③ · school/records.ts)
  const readyNow = $derived(!!(R && scout && R.ready?.[scout.id]?.[uid]));
  const probNo = $derived(step ? (step.kind === 'boss' ? '형성평가' : (/문제 \d+/.exec(step.title) || [step.title])[0]) : '');
  // 📘 이 문제의 개념 (#158): 이 문제 바로 앞 개념 단계의 학습지 칸 그림 (없으면 그 개념 글)
  let cpt = $state(false);
  const cptId = $derived(step && (step.kind === 'monster' || step.kind === 'boss') ? conceptOf(L, step.id) : null);
  const battle = $derived(!!R && !isLobby(R) && !result && !!step && (step.kind === 'boss' || !!mid));
</script>

{#if paperOn() && R && !isLobby(R)}
  <!-- 📝 제출 모드 머리줄 (시안 ①~⑥): ‹ 뒤로 · n차시 · 문제 k · 게임 | 제출 -->
  <header class="ptop" class:pboard={board} data-k="ptop">{#if !board}<a class="pback" href="?" aria-label="뒤로">‹</a>{/if}<b>{L.no}차시 · {step ? (step.kind === 'boss' ? '형성평가' : step.kind === 'concept' ? (step.title.split(' · ')[0] ?? step.title) : probNo) : '수업'}</b><ModeSwitch dark /></header>{#if board}<div class="pgap" aria-hidden="true"></div>{/if}
{:else if battle && step && R}
  <Scene theme={L.theme} sprite={step.kind === 'boss' ? (L.boss?.sprite ?? '') : (L.monsters[mid ?? '']?.sprite ?? '')}
    hp={sceneHp?.hp ? { left: Math.min(sceneHp.hp.max, sceneHp.hp.left + fx.hold), max: sceneHp.hp.max } : null} pose={fx.poseUntil > now ? fx.pose : 'idle'} hpLabel={sceneHp?.label ?? ''} shadow={!!scout?.on} down={step.kind === 'boss' ? !!bhp?.won : down} {gem} hit={atkOn} hitTag={atk ? `${atk.strong ? '😡 분노 · ' : ''}${atk.def.tag}` : ''} elem={atkOn ? atk?.def.elem ?? '' : ''} atkId={atkOn ? atk?.def.id ?? '' : ''} rage={atkOn && !!atk?.strong} hitKey={atk?.at ?? 0} ice={atkOn && atk?.def.id === 'ice'} {iceEnd} holy={holyState} onholy={toggleHoly} stoneSec={stoneLeft} stoneHoly={!!stoneNow?.holy} {slump} {healN}
    onconcept={cptId ? () => (cpt = true) : undefined}
    note={scout?.on ? '' : step.kind === 'boss' && bhp?.won ? '🏆 승리! 남은 문항도 풀 수 있어요' : down ? `💥 쓰러짐! 그래도 공격할 수 있어요${pracAll ? ` · 🔥 연습 타격 ${pracAll}번` : ''}` : ''}
    minions={crec && !scout?.on ? { n: crec.n - 1, stage: crec.done ? crec.n : crec.stage, downs: downs.filter((d) => d.down).map((d) => d.k) } : null} />
{/if}
<section class="body" class:battle>
  {#if R?.state.closed && !result}
    <div class="bcard"><span class="lab acc">수업이 끝났어요</span><p class="muted">캠프로 돌아가요.</p></div>
    <BottomAction href="?" text="🏕 내 캠프로" mainLabel="내 캠프로" />
  {:else if !R}
    <div class="bcard"><span class="lab acc">기다리는 중</span><p class="muted">종합실이 아직 열리지 않았어요. 선생님 화면을 먼저 여세요.</p></div>
    <BottomAction href="?" text="🏕 내 캠프로" mainLabel="내 캠프로" />
  {:else if isLobby(R)}
    <div class="bcard"><span class="lab acc">{nick} · 입장 완료</span><p>선생님이 시작하면 바로 시작해요.</p></div>
    <BottomAction text="⏳ 시작을 기다려요" why="선생님이 시작하면 바로 시작해요" />
  {:else if result}
    <div class="bcard">
      <div class="okline"><span class="ic">{bhp?.won ? '🏆' : '🏁'}</span><span><b>{bhp?.won ? '승리!' : '수업 끝'}</b><span>{nick}</span></span></div>
      <p class="big">{result.right} <small class="muted">/ {result.total} 맞힘</small></p>
      <ul class="res">{#each result.mons as m (m.id)}<li>{m.title}: {m.best}/{m.total} {m.perfect ? '⭐' : ''}</li>{/each}{#if result.boss}<li>형성평가: {result.boss.ok}/{result.boss.items}</li>{/if}</ul>
    </div>
    {#if R.state.closed}<BottomAction href="?" text="🏕 내 캠프로" mainLabel="내 캠프로" />{:else}<BottomAction text="🏁 마무리 중" why="선생님이 수업을 닫으면 캠프로 가요" />{/if}
  {:else if step?.kind === 'concept'}
    <div class="bcard"><span class="lab acc">{step.title}</span><p class="say"><SymText text={step.say ?? ''} /></p></div>
    <BottomAction text="👂 선생님 설명 듣는 중" why="설명이 끝나면 몬스터가 나타나요" />
  {:else if battle && step}
    {#if scout?.on && paperOn()}
      <div class="pscout" data-k="pscout"><b class="ph1">학습지 {probNo} 을 먼저 풀어 두세요</b><p>{Math.ceil(scout.left / 1000)}초 뒤 답 칸이 열려요. 선생님이 일찍 열 수도 있어요.</p></div>
      <BottomAction disabled={readyNow} why={readyNow ? '준비 완료를 보냈어요' : ''} onmain={() => scout && scoutReady(S, code, scout.id, uid)} mainLabel="준비 완료">
        {#snippet main()}<span>준비 완료</span>{/snippet}
      </BottomAction>
    {:else if scout?.on}
      <div class="bcard">
        <span class="lab acc">{probNo} · 정찰</span>
        <div class="row"><span class="big">{Math.ceil(scout.left / 1000)}초</span><span class="muted">뒤에 몬스터가 나타나요</span></div>
        <p class="q2">학습지 「{probNo}」를 먼저 풀어 두세요</p>
        <p class="muted">선생님이 일찍 부를 수도 있어요</p>
      </div>
      <BottomAction disabled={readyNow} why={readyNow ? '✋ 준비 완료를 보냈어요' : ''} onmain={() => scout && scoutReady(S, code, scout.id, uid)} mainLabel="준비 완료">
        {#snippet main()}<span>{readyNow ? '✋ 준비 완료!' : '준비 완료'}</span>{/snippet}
      </BottomAction>
    {:else}
      <!-- 💥 피격 = 움직임 0 (#151): 알림은 장면 띠 안 · 문제 카드 위 덮개 + 줄어드는 원 · 고른 답 그대로 · 끝나면 덮개만 사라짐 -->
      <div class="qwrap">
      {#key `${stepIdx(R)}|${step.id}`}
        {#if step.kind === 'boss'}
          {#if V4(R)}<BossForm {S} {L} {R} {code} {uid} now={gnow} {locked} />{:else}<BossCard {S} {L} {R} {code} {uid} now={gnow} {locked} />{/if}
        {:else if mid && chain}
          <ChainView {S} {L} {R} {code} {mid} {uid} now={gnow} {locked} title={step.title} onhint={cptId ? () => (cpt = true) : undefined} />
        {:else if mid}
          <MonsterForm {S} {L} {R} {code} {mid} {uid} now={gnow} {locked} title={step.title} onhint={cptId ? () => (cpt = true) : undefined} />
        {/if}
      {/key}
      {#if atkOn && atk && paperOn()}
        <!-- 📝 제출 모드 = 효과 없이 글자 한 줄 (입력 멈춤 규칙은 그대로 · 시간이 지나면 저절로) -->
        <p class="patk" role="status">{atk.def.lockInput ? '잠깐 멈춤' : '잠깐'} · {Math.max(1, Math.ceil((atk.until - gnow) / 1000))}초</p>
      {:else if atkOn && atk}
        {#key atk.at}<AttackFx kind={atk.def.id} strong={atk.strong} len={atk.until - atk.at} left={atk.until - gnow} onclear={() => { if (atk) atk = { ...atk, until: gnow }; }} />{/key}
      {/if}
      </div>
    {/if}
  {/if}
</section>
{#if gtoast && !paperOn()}<div class="gtoast" role="status">{gtoast}</div>{/if}
<SymSheet />
{#if cpt && cptId}
  <Sheet onclose={() => (cpt = false)} mainText="문제로 돌아가기" tall>
    {#snippet title()}📘 이 문제의 개념{/snippet}
    <PrepImg {S} {L} id={cptId} alt="개념"><p class="say"><SymText text={L.steps.find((s) => s.id === cptId)?.say ?? ''} /></p></PrepImg>
  </Sheet>
{/if}
{#if paperOn()}<!-- 📝 제출 모드 = 💎 · 선물 알림 없음 (뒤에서 그대로 쌓임) -->{:else if mailNew}<p class="gift mail" role="status">{mailLine(mailNew, mailNew.g)}</p>{:else if giftNew.length}<p class="gift" role="status">🎁 선생님 선물 · 💎 +{giftNew.reduce((a, x) => a + x.g, 0)}</p>{/if}
{#if R && !R.state.closed && R.state.rest}<FunPhone {S} {R} {code} {uid} {now} />{/if}
{#if R && !R.state.closed && R.state.focus && !board}
  <!-- ⏸ 집중 · 🏕 쉼터 덮개 (#118 · #119): 게임 시계 멈춤 · 화면은 그대로 둔 채 위에 덮음(입력 · 스크롤 보존) -->
  <div class="cover" role="status" aria-live="polite">
    <b>📣 선생님에게 주목</b><p>{R.state.rest ? '놀이 시계도 멈춰 있어요' : '게임은 멈춰 있어요'} · 끝나면 그 자리에서 이어가요</p>
  </div>
{/if}

<style>
  .gtoast { position: fixed; left: 50%; top: 210px; transform: translateX(-50%); z-index: 40; padding: 10px 16px; border-radius: 14px; background: rgba(12, 24, 40, 0.92); border: 2px solid #ffd25a; color: #fff6c8; font: 700 16px var(--font); white-space: nowrap; box-shadow: 0 0 18px rgba(255, 210, 90, 0.6); }
  .ptop { position: sticky; top: 0; z-index: 5; max-width: 430px; margin: 0 auto; display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1.5px solid #1d1d1f; background: #f7f6f1; }
  .ptop.pboard { padding-left: 52px; } .pgap { height: 44px; }
  .ptop b { flex: 1; min-width: 0; font: 700 17px 'Noto Serif KR', 'Nanum Myeongjo', serif; color: #1d1d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pback { width: 32px; height: 32px; display: grid; place-items: center; color: #555; font-size: 22px; text-decoration: none; }
  .pscout { display: flex; flex-direction: column; gap: 8px; padding-top: 6px; }
  .pscout .ph1 { font: 700 17px 'Noto Serif KR', serif; color: #1d1d1f; border-bottom: 1.5px solid #1d1d1f; padding-bottom: 4px; }
  .pscout p { margin: 0; font-size: 14px; color: #6a6a6a; }
  .patk { position: absolute; left: 0; right: 0; top: 0; z-index: 6; margin: 0; padding: 8px 12px; background: #f7f6f1; border: 1px solid #1d1d1f; border-radius: 6px; font: 700 14px var(--font); color: #1d1d1f; text-align: center; }
  .body { max-width: 430px; margin: 0 auto; padding: var(--s4); display: flex; flex-direction: column; gap: var(--s3); min-width: 0; }
  .body.battle { padding-top: var(--s1); }
  .row { display: flex; align-items: baseline; gap: var(--s2); }
  .q2 { margin: 0; font-size: 17px; font-weight: 700; }
  .say { margin: 0; line-height: 1.6; overflow-wrap: anywhere; }
  .res { margin: 0; padding-left: 1.2rem; }
  .big small { font-size: var(--fs-small); }
  .gift.mail { border-color: var(--accent); }
  .gift { position: fixed; top: 64px; left: var(--s4); right: var(--s4); z-index: 25; margin: 0 auto; max-width: 398px; padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--gem); font-weight: 700; text-align: center; }
  .qwrap { position: relative; display: flex; flex-direction: column; gap: var(--s3); min-width: 0; }
  .cover { position: fixed; inset: 0; z-index: 30; background: rgba(8, 9, 12, 0.86); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s2); padding: var(--s5); text-align: center; }
  .cover b { font-size: 28px; color: var(--accent); }
  .cover p { margin: 0; color: var(--text-2); }
</style>
