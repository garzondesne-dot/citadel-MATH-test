<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Store } from '../model/types';
  import { PROFILES } from '../model/profiles';
  import { atkClock, atkTrack, bossHp, chainDown, chainRecord, isChain, isEnd, isLobby, monsterHp, resultOf, solveLock, stepIdx, stepOf } from '../raid/raid';
  import { heartbeat, leave, scoutReady } from '../raid/actions';
  import { liveRoom } from './room.svelte';
  import { clock, useClock } from './clock.svelte';
  import Scene from './battle/Scene.svelte';
  import BottomAction from './battle/BottomAction.svelte';
  import SymSheet from './battle/SymSheet.svelte';
  import MonsterForm from './q/MonsterForm.svelte';
  import ChainView from './q/ChainView.svelte';
  import BossCard from './q/BossCard.svelte';
  import SymText from './q/SymText.svelte';

  // 📱 학생 폰 (탭 B) — ②B 틀: 장면 띠 → 카드(정찰 · 문제 · 결과 · 틀림이 같은 자리) → 주요 단추 1
  //   다시 그려도 스크롤 · 입력이 날아가지 않음: 화면 조각은 그대로 두고 바뀐 칸만 고침 (정식 paint() 원칙)
  const { S, L, code, uid, num }: { S: Store; L: LessonPack; code: string; uid: string; num: number } = $props();
  const nick = untrack(() => `학생 ${String(num).padStart(2, '0')}`);
  const live = untrack(() => {
    heartbeat(S, code, uid, num, nick);
    const beat = setInterval(() => heartbeat(S, code, uid, num, nick), 3000);
    const bye = () => leave(S, code, uid);
    addEventListener('pagehide', bye);
    const lr = liveRoom(S, code);
    return { v: lr.v, stop: () => { clearInterval(beat); lr.stop(); removeEventListener('pagehide', bye); } };
  });
  const stopClock = useClock();
  onDestroy(() => { live.stop(); stopClock(); });

  const R = $derived(live.v.room);
  const now = $derived(clock.now);
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
    if (atkTrack(memo, c, `${c.kind}|${c.mid}`).strike) stunUntil = now + c.lock * 1000;
  });
  const stunned = $derived(stunUntil > now);
  const locked = $derived(!!scout?.on || stunned);
  const result = $derived(R && isEnd(L, R) ? resultOf(L, R, uid) : null);
  const readyNow = $derived(!!(R && scout && R.ready?.[scout.id]?.[uid]));
  const probNo = $derived(step ? (step.kind === 'boss' ? '형성평가' : (/문제 \d+/.exec(step.title) || [step.title])[0]) : '');
  const battle = $derived(!!R && !isLobby(R) && !result && !!step && (step.kind === 'boss' || !!mid));
</script>

{#if battle && step && R}
  <Scene theme={L.theme} sprite={step.kind === 'boss' ? (L.boss?.sprite ?? '') : (L.monsters[mid ?? '']?.sprite ?? '')}
    hp={sceneHp?.hp ?? null} hpLabel={sceneHp?.label ?? ''} shadow={!!scout?.on} down={step.kind === 'boss' ? !!bhp?.won : down} {gem}
    minions={crec && !scout?.on ? { n: crec.n - 1, stage: crec.done ? crec.n : crec.stage, downs: downs.filter((d) => d.down).map((d) => d.k) } : null} />
{/if}
<section class="body" class:battle>
  {#if !R}
    <div class="bcard"><span class="lab acc">기다리는 중</span><p class="muted">종합실이 아직 열리지 않았어요. 선생님 화면을 먼저 여세요.</p></div>
  {:else if isLobby(R)}
    <div class="bcard"><span class="lab acc">{nick} · 입장 완료</span><p>선생님이 시작하면 바로 시작해요.</p></div>
  {:else if result}
    <div class="bcard">
      <div class="okline"><span class="ic">{bhp?.won ? '🏆' : '🏁'}</span><span><b>{bhp?.won ? '승리!' : '수업 끝'}</b><span>{nick}</span></span></div>
      <p class="big">{result.right} <small class="muted">/ {result.total} 맞힘</small></p>
      <ul class="res">{#each result.mons as m (m.id)}<li>{m.title}: {m.best}/{m.total} {m.perfect ? '⭐' : ''}</li>{/each}{#if result.boss}<li>형성평가: {result.boss.ok}/{result.boss.items}</li>{/if}</ul>
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
      {#if stunned}<div class="bad" role="status"><b>💥 {step.kind === 'boss' ? '보스' : '몬스터'}의 공격! {Math.ceil((stunUntil - now) / 1000)}초 멈춤</b><span>잠깐 기다리면 다시 풀 수 있어요</span></div>{/if}
      {#if step.kind === 'boss' && bhp?.won}<p class="toast">🏆 승리! 남은 문항도 풀어 볼 수 있어요</p>{:else if down}<p class="toast">💥 몬스터는 쓰러졌어요! 그래도 풀어서 공격할 수 있어요</p>{/if}
      {#key `${stepIdx(R)}|${step.id}`}
        {#if step.kind === 'boss'}
          <BossCard {S} {L} {R} {code} {uid} {now} {locked} />
        {:else if mid && chain}
          <ChainView {S} {L} {R} {code} {mid} {uid} {now} {locked} title={step.title} />
        {:else if mid}
          <MonsterForm {S} {L} {R} {code} {mid} {uid} {now} {locked} title={step.title} />
        {/if}
      {/key}
    {/if}
  {/if}
</section>
<SymSheet />

<style>
  .body { max-width: 430px; margin: 0 auto; padding: var(--s4); display: flex; flex-direction: column; gap: var(--s3); min-width: 0; }
  .body.battle { padding-top: var(--s1); }
  .row { display: flex; align-items: baseline; gap: var(--s2); }
  .q2 { margin: 0; font-size: 17px; font-weight: 700; }
  .say { margin: 0; line-height: 1.6; overflow-wrap: anywhere; }
  .res { margin: 0; padding-left: 1.2rem; }
  .big small { font-size: var(--fs-small); }
</style>
