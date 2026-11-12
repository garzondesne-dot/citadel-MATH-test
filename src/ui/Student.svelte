<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Store } from '../model/types';
  import { PROFILES } from '../model/profiles';
  import { atkClock, atkTrack, bossHp, chainDown, chainRecord, gameNow, isChain, isEnd, isLobby, monsterHp, resultOf, solveLock, stepIdx, stepOf } from '../raid/raid';
  import { heartbeat, leave, scoutReady } from '../raid/actions';
  import { liveRoom, liveValue } from './room.svelte';
  import { clock, useClock } from './clock.svelte';
  import Scene from './battle/Scene.svelte';
  import BottomAction from './battle/BottomAction.svelte';
  import SymSheet from './battle/SymSheet.svelte';
  import MonsterForm from './q/MonsterForm.svelte';
  import ChainView from './q/ChainView.svelte';
  import BossCard from './q/BossCard.svelte';
  import SymText from './q/SymText.svelte';
  import { fx } from './battle/fx.svelte';
  import { BUILD } from '../build';
  import { savedLook } from '../store/me.svelte';
  import { isExcluded } from '../school/school';
  import { mailLine, type Mail } from '../school/mail';

  // 📱 학생 폰 (탭 B) — ②B 틀: 장면 띠 → 카드(정찰 · 문제 · 결과 · 틀림이 같은 자리) → 주요 단추 1
  //   다시 그려도 스크롤 · 입력이 날아가지 않음: 화면 조각은 그대로 두고 바뀐 칸만 고침 (정식 paint() 원칙)
  const { S, L, code, uid, num, nick: nick0 = '', cls = '' }: { S: Store; L: LessonPack; code: string; uid: string; num: number; nick?: string; cls?: string } = $props();
  const nick = untrack(() => nick0 || `학생 ${String(num).padStart(2, '0')}`);
  // 🔄 들어온 판 (옛 판 확인 · 시험은 ?ver= 로 옛 판 흉내) · 선생님이 「새로 고침」을 보내면 다시 불러옴
  const ver = untrack(() => new URLSearchParams(location.search).get('ver') || BUILD);
  const loadedAt = Date.now();
  const live = untrack(() => {
    const x = untrack(() => !!cls && isExcluded(S, cls, num));
    const hb = () => heartbeat(S, code, uid, num, nick, { cls, ver, hero: savedLook().hero, x });
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
  const gv = untrack(() => liveValue<Record<string, { g: number; at: number; mail?: boolean }>>(S, `gifts/${uid}`));
  onDestroy(gv.stop);
  const giftNew = $derived(Object.values(gv.v.val || {}).filter((x) => x && !x.mail && x.at > loadedAt && clock.now - x.at < 4000));
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
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const gem = $derived(R ? (() => { const g = PROFILES[R.meta.profile]?.reward.gem; return typeof g === 'number' ? g : 0; })() : 0);
  const crec = $derived(R && mid && chain ? chainRecord(L, R, mid, uid) : null);
  const downs = $derived(R && mid && chain ? chainDown(L, R, mid, now) : []);
  // 졸개 체력(정식 chainDown: 넘어야 할 학생 수 − 넘은 학생) · 대장 = 공동 체력
  const sceneHp = $derived.by(() => {
    if (step?.kind === 'boss' && bhp) return { hp: { left: bhp.left, max: bhp.max }, label: L.boss?.title.split(' · ').pop() ?? '보스' };
    if (crec && !crec.done && crec.stage < crec.n - 1) { const d = downs[crec.stage]; if (d) return { hp: { left: d.left, max: d.max }, label: `졸개 ${'①②③④⑤⑥'[crec.stage]}` }; }
    return hp ? { hp: { left: hp.left, max: hp.max }, label: chain ? '대장' : '' } : null;
  });

  // 👾 몬스터 공격: 모든 기기가 같은 시계로 같은 순간에 맞음 → 문제 화면이면 lock 초 멈춤 (정식 monsterStrike)
  let stunUntil = $state(0);
  const memo = {};
  $effect(() => {
    if (!R) return;
    const c = atkClock(L, R, now);
    if (!c || c.paused) return;
    if (atkTrack(memo, c, `${c.kind}|${c.mid}`).strike) stunUntil = gnow + c.lock * 1000;
  });
  const stunned = $derived(stunUntil > gnow);
  const locked = $derived(!!scout?.on || stunned);
  const result = $derived(R && isEnd(L, R) ? resultOf(L, R, uid) : null);
  const readyNow = $derived(!!(R && scout && R.ready?.[scout.id]?.[uid]));
  const probNo = $derived(step ? (step.kind === 'boss' ? '형성평가' : (/문제 \d+/.exec(step.title) || [step.title])[0]) : '');
  const battle = $derived(!!R && !isLobby(R) && !result && !!step && (step.kind === 'boss' || !!mid));
</script>

{#if battle && step && R}
  <Scene theme={L.theme} sprite={step.kind === 'boss' ? (L.boss?.sprite ?? '') : (L.monsters[mid ?? '']?.sprite ?? '')}
    hp={sceneHp?.hp ? { left: Math.min(sceneHp.hp.max, sceneHp.hp.left + fx.hold), max: sceneHp.hp.max } : null} pose={fx.poseUntil > now ? fx.pose : 'idle'} hpLabel={sceneHp?.label ?? ''} shadow={!!scout?.on} down={step.kind === 'boss' ? !!bhp?.won : down} {gem}
    minions={crec && !scout?.on ? { n: crec.n - 1, stage: crec.done ? crec.n : crec.stage, downs: downs.filter((d) => d.down).map((d) => d.k) } : null} />
{/if}
<section class="body" class:battle>
  {#if R?.state.closed && !result}
    <div class="bcard"><span class="lab acc">수업이 끝났어요</span><p class="muted">캠프로 돌아가요.</p><a class="camp" href="?">🏕 내 캠프로</a></div>
  {:else if !R}
    <div class="bcard"><span class="lab acc">기다리는 중</span><p class="muted">종합실이 아직 열리지 않았어요. 선생님 화면을 먼저 여세요.</p></div>
  {:else if isLobby(R)}
    <div class="bcard"><span class="lab acc">{nick} · 입장 완료</span><p>선생님이 시작하면 바로 시작해요.</p></div>
  {:else if result}
    <div class="bcard">
      <div class="okline"><span class="ic">{bhp?.won ? '🏆' : '🏁'}</span><span><b>{bhp?.won ? '승리!' : '수업 끝'}</b><span>{nick}</span></span></div>
      <p class="big">{result.right} <small class="muted">/ {result.total} 맞힘</small></p>
      <ul class="res">{#each result.mons as m (m.id)}<li>{m.title}: {m.best}/{m.total} {m.perfect ? '⭐' : ''}</li>{/each}{#if result.boss}<li>형성평가: {result.boss.ok}/{result.boss.items}</li>{/if}</ul>
      {#if R.state.closed}<a class="camp" href="?">🏕 내 캠프로</a>{/if}
    </div>
  {:else if step?.kind === 'concept'}
    <div class="bcard"><span class="lab acc">{step.title}</span><p class="say"><SymText text={step.say ?? ''} /></p><p class="muted">선생님 설명을 들어요.</p></div>
  {:else if battle && step}
    {#if scout?.on}
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
      {#if stunned}<div class="bad" role="status"><b>💥 {step.kind === 'boss' ? '보스' : '몬스터'}의 공격! {Math.ceil((stunUntil - gnow) / 1000)}초 멈춤</b><span>잠깐 기다리면 다시 풀 수 있어요</span></div>{/if}
      {#if step.kind === 'boss' && bhp?.won}<p class="toast">🏆 승리! 남은 문항도 풀어 볼 수 있어요</p>{:else if down}<p class="toast">💥 몬스터는 쓰러졌어요! 그래도 풀어서 공격할 수 있어요</p>{/if}
      {#key `${stepIdx(R)}|${step.id}`}
        {#if step.kind === 'boss'}
          <BossCard {S} {L} {R} {code} {uid} now={gnow} {locked} />
        {:else if mid && chain}
          <ChainView {S} {L} {R} {code} {mid} {uid} now={gnow} {locked} title={step.title} />
        {:else if mid}
          <MonsterForm {S} {L} {R} {code} {mid} {uid} now={gnow} {locked} title={step.title} />
        {/if}
      {/key}
    {/if}
  {/if}
</section>
<SymSheet />
{#if mailNew}<p class="gift mail" role="status">{mailLine(mailNew, mailNew.g)}</p>{:else if giftNew.length}<p class="gift" role="status">🎁 선생님 선물 · 💎 +{giftNew.reduce((a, x) => a + x.g, 0)}</p>{/if}
{#if R && !R.state.closed && (R.state.focus || R.state.rest)}
  <!-- ⏸ 집중 · 🏕 쉼터 덮개 (#118 · #119): 게임 시계 멈춤 · 화면은 그대로 둔 채 위에 덮음(입력 · 스크롤 보존) -->
  <div class="cover" role="status" aria-live="polite">
    {#if R.state.focus}<b>📣 선생님에게 주목</b><p>게임은 멈춰 있어요 · 끝나면 그 자리에서 이어가요</p>{:else}<b>🏕 쉼터</b><p>잠깐 쉬어요 · 게임은 멈춰 있어요</p>{/if}
  </div>
{/if}

<style>
  .body { max-width: 430px; margin: 0 auto; padding: var(--s4); display: flex; flex-direction: column; gap: var(--s3); min-width: 0; }
  .body.battle { padding-top: var(--s1); }
  .row { display: flex; align-items: baseline; gap: var(--s2); }
  .q2 { margin: 0; font-size: 17px; font-weight: 700; }
  .say { margin: 0; line-height: 1.6; overflow-wrap: anywhere; }
  .res { margin: 0; padding-left: 1.2rem; }
  .big small { font-size: var(--fs-small); }
  .camp { display: flex; align-items: center; justify-content: center; min-height: var(--btn-h); font-size: var(--btn-fs); border-radius: 14px; background: var(--accent); color: var(--on-accent); font-weight: 700; text-decoration: none; box-shadow: 0 3px 0 var(--accent-sh); }
  .gift.mail { border-color: var(--accent); }
  .gift { position: fixed; top: 64px; left: var(--s4); right: var(--s4); z-index: 25; margin: 0 auto; max-width: 398px; padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--gem); font-weight: 700; text-align: center; }
  .cover { position: fixed; inset: 0; z-index: 30; background: rgba(8, 9, 12, 0.86); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s2); padding: var(--s5); text-align: center; }
  .cover b { font-size: 28px; color: var(--accent); }
  .cover p { margin: 0; color: var(--text-2); }
</style>
