<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Store } from '../model/types';
  import { atkClock, atkTrack, bossHp, isChain, isEnd, isLobby, monsterHp, resultOf, solveLock, stepOf } from '../raid/raid';
  import { heartbeat, leave } from '../raid/actions';
  import { liveRoom } from './room.svelte';
  import { clock, useClock } from './clock.svelte';
  import Sprite from './Sprite.svelte';
  import MonsterForm from './q/MonsterForm.svelte';
  import ChainView from './q/ChainView.svelte';
  import BossCard from './q/BossCard.svelte';

  // 📱 학생 폰 (탭 B) — 종합실이 정한 지금 단계를 따라감 · 문제 화면은 부품(q/)을 조합만
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
</script>

<section class="phone">
  <header>
    <b>{nick}</b>
    {#if hp}<span>👾 {hp.left}/{hp.max}</span>{:else if step?.kind === 'boss' && bhp}<span>👑 {bhp.left}/{bhp.max}</span>{/if}
  </header>

  {#if !R}
    <p>종합실이 아직 열리지 않았어요. 선생님 화면을 먼저 여세요.</p>
  {:else if isLobby(R)}
    <h2>⚔ 입장 완료</h2>
    <p>선생님이 시작하면 바로 시작해요.</p>
  {:else if result}
    <h2>{bhp?.won ? '🏆 승리!' : '🏁 수업 끝'}</h2>
    <p class="big">맞힌 수 <b>{result.right}</b> / {result.total}</p>
    <ul>
      {#each result.mons as m (m.id)}<li>{m.title}: {m.best}/{m.total} {m.perfect ? '⭐' : ''}</li>{/each}
      {#if result.boss}<li>형성평가: {result.boss.ok}/{result.boss.items}</li>{/if}
    </ul>
  {:else if step?.kind === 'concept'}
    <h2>{step.title}</h2>
    <p class="say">{step.say}</p>
    <p class="sub">선생님 설명을 들어요.</p>
  {:else if (mid || step?.kind === 'boss') && step}
    {@const sprite = step.kind === 'boss' ? (L.boss?.sprite ?? '') : (L.monsters[mid ?? '']?.sprite ?? '')}
    <div class="scene">
      <Sprite ref={sprite} pose={(step.kind === 'boss' ? bhp?.won : down) ? 'down' : 'idle'} size={64} />
      <b>{step.kind === 'boss' ? `👑 ${L.boss?.title}` : step.title}</b>
    </div>
    {#if scout?.on}<p class="banner">🌫 정찰 {Math.ceil(scout.left / 1000)}초 — 학습지에 먼저 풀어요</p>{/if}
    {#if stunned}<p class="banner hit">💥 {step.kind === 'boss' ? '보스' : '몬스터'}의 공격! {Math.ceil((stunUntil - now) / 1000)}초 멈춤</p>{/if}
    {#if step.kind === 'boss' && bhp?.won}<p class="ko">🏆 승리! 남은 문항도 풀어 볼 수 있어요.</p>{:else if down}<p class="ko">💥 몬스터는 쓰러졌어요! 그래도 풀어서 공격할 수 있어요.</p>{/if}
    {#key `${step.id}`}
      {#if step.kind === 'boss'}
        <BossCard {S} {L} {R} {code} {uid} {now} {locked} />
      {:else if mid && chain}
        <ChainView {S} {L} {R} {code} {mid} {uid} {now} {locked} title={step.title} />
      {:else if mid}
        <MonsterForm {S} {L} {R} {code} {mid} {uid} {now} {locked} title={step.title} />
      {/if}
    {/key}
  {/if}
</section>

<style>
  .phone { max-width: 440px; margin: 0 auto; min-width: 0; }
  header { display: flex; gap: 12px; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--muted); }
  .scene { display: flex; align-items: center; gap: 8px; margin: 6px 0; min-width: 0; overflow-wrap: anywhere; }
  .ko { color: var(--accent); font-weight: 700; }
  .banner { font-weight: 700; padding: 6px 10px; border-radius: 10px; background: var(--muted); }
  .banner.hit { background: var(--hp); color: var(--card); }
  .say { line-height: 1.6; overflow-wrap: anywhere; }
  .sub { color: var(--sub); }
  .big { font-size: 1.3rem; }
</style>
