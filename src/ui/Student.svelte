<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Given, LessonPack, Question, Store } from '../model/types';
  import { atkClock, atkTrack, bossHp, bossItem, bossState, isEnd, isLobby, itemsFor, monsterHp, record, resultOf, solveLock, stepOf } from '../raid/raid';
  import { bossSubmit, heartbeat, leave, submit } from '../raid/actions';
  import { liveRoom } from './room.svelte';
  import { clock, useClock } from './clock.svelte';
  import Sprite from './Sprite.svelte';
  import QuestionInput from './QuestionInput.svelte';

  // 📱 학생 폰 (탭 B) — 종합실이 정한 지금 단계를 따라감
  //   몬스터: 문제 · 답 · 내기 · 재도전(정식 v3: 틀리면 같은 문제 · 다 맞히면 새 숫자) / 보스: 문항마다 기회 · 맞히면 도달 / 끝: 맞힌 수
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
  const mid = $derived(step?.kind === 'monster' && !step.later && L.monsters[step.id] ? step.id : null);
  const rec = $derived(R && mid ? record(L, R, mid, uid) : null);
  const hp = $derived(R && mid ? monsterHp(L, R, mid, now) : null);
  const down = $derived(!!hp && hp.max > 0 && hp.left <= 0);
  const scout = $derived(R ? solveLock(L, R, now) : null);
  /** 지금 풀 문제 = 다음 시도의 문항 */
  const qs = $derived(R && rec && mid ? itemsFor(L, R, mid, uid, rec.nextAttempt) : []);
  const last = $derived(rec?.tries[rec.tries.length - 1] ?? null);
  const lastQs = $derived(R && last && mid ? itemsFor(L, R, mid, uid, last.attempt) : []);
  const canAnswer = $derived(!!rec && (!rec.submitted || rec.canRetry));
  const bst = $derived(R && step?.kind === 'boss' ? bossState(L, R, uid) : []);
  const bhp = $derived(R && L.boss ? bossHp(L, R, now) : null);

  // 👾 몬스터 공격: 모든 기기가 같은 시계로 같은 순간에 맞음 → 문제 화면이면 lock 초 멈춤 (정식 monsterStrike)
  let stunUntil = $state(0);
  const memo = {};
  $effect(() => {
    if (!R) return;
    const c = atkClock(L, R, now);
    if (!c || c.paused) return;
    const tr = atkTrack(memo, c, `${c.kind}|${c.mid}`);
    if (tr.strike) stunUntil = now + c.lock * 1000;
  });
  const stunned = $derived(stunUntil > now);
  const locked = $derived(!!scout?.on || stunned);

  // 몬스터 답 (문항마다) — 문제가 바뀌면 비움
  let given = $state<Given[]>([]);
  let qKey = '';
  $effect(() => {
    const k = qs.map((q) => q.question).join('|');
    if (k !== qKey) { qKey = k; given = qs.map(() => null); }
  });
  let showLast = $state(false);
  function send() {
    if (mid && submit(S, L, code, mid, uid, given.map((g) => (Array.isArray(g) ? g.slice() : g)) as Given[])) showLast = true;
  }
  // 보스 답 (문항마다)
  let bossGiven = $state<Record<number, Given>>({});
  const bossQ = (i: number): Question | null => (R ? bossItem(L, R, uid, i, bst[i]?.next ?? 0) : null);
  function bossSend(i: number) {
    if (bossSubmit(S, L, code, uid, i, bossGiven[i] ?? null)) bossGiven[i] = null;
  }
  const result = $derived(R && isEnd(L, R) ? resultOf(L, R, uid) : null);
</script>

<section class="phone">
  <header>
    <b>{nick}</b>
    {#if hp}<span>👾 {hp.left}/{hp.max}</span>{:else if step?.kind === 'boss' && bhp}<span>👑 {bhp.left}/{bhp.max}</span>{/if}
    {#if rec}<span>기회 {rec.submitted ? rec.left : rec.slots}/{rec.slots}</span>{/if}
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
  {:else if mid && rec}
    {@const mon = L.monsters[mid]}
    <div class="mon"><Sprite ref={mon?.sprite ?? ''} pose={down ? 'down' : 'idle'} size={96} /> <b>{step?.title}</b></div>
    {#if scout?.on}<p class="banner">🌫 정찰 {Math.ceil(scout.left / 1000)}초 — 학습지에 먼저 풀어요</p>{/if}
    {#if stunned}<p class="banner hit">💥 몬스터의 공격! {Math.ceil((stunUntil - now) / 1000)}초 멈춤</p>{/if}
    {#if down}<p class="ko">💥 몬스터가 쓰러졌어요! (데미지 {rec.best})</p>{/if}

    {#if showLast && last}
      <div class="result">
        <p><b>{last.correct} / {last.total}</b> 맞힘 · 데미지(가장 많이 맞힌 수) {rec.best}</p>
        <ol>
          {#each lastQs as q, i (i)}<li>{last.marks[i] ? '⭕' : '❌'} <small>{q.question.replace(/^.* 일 때 |^.*이다\. /, '')}</small></li>{/each}
        </ol>
        {#if rec.perfect && !rec.practice}<p>⭐ 다 맞혔어요! 남은 기회로 숫자 바뀐 문제를 연습할 수 있어요(데미지는 그대로).</p>{/if}
        {#if !rec.perfect && rec.left > 0}<p>같은 문제를 다시 풀어요 (남은 기회 {rec.left}).</p>{/if}
        {#if rec.left <= 0}<p>기회를 다 썼어요. 벌은 없어요.</p>{/if}
        {#if canAnswer}<button onclick={() => (showLast = false)}>🔁 다시 풀기</button>{/if}
      </div>
    {:else if canAnswer}
      {#each qs as q, i (i)}
        <QuestionInput {q} value={given[i] ?? null} disabled={locked} onchange={(v) => (given[i] = v)} />
      {/each}
      <button class="go" disabled={locked} onclick={send}>⚔ 공격 (답 내기)</button>
    {:else}
      <p>이 몬스터는 끝! 데미지 {rec.best}.</p>
    {/if}
  {:else if step?.kind === 'boss' && L.boss}
    <div class="mon"><Sprite ref={L.boss.sprite} pose={bhp?.won ? 'down' : 'idle'} size={96} /> <b>👑 {L.boss.title}</b></div>
    {#if scout?.on}<p class="banner">🌫 정찰 {Math.ceil(scout.left / 1000)}초 — 학습지에 먼저 풀어요</p>{/if}
    {#if stunned}<p class="banner hit">💥 보스의 공격! {Math.ceil((stunUntil - now) / 1000)}초 멈춤</p>{/if}
    {#if bhp?.won}<p class="ko">🏆 승리! 보스를 쓰러뜨렸어요.</p>{/if}
    {#each bst as s, i (i)}
      {@const q = bossQ(i)}
      <div class="bq" class:ok={s.ok}>
        {#if s.ok}
          <p>✅ {i + 1}번 도달 {s.first ? '(첫 시도)' : ''}</p>
        {:else if s.left <= 0}
          <p>{i + 1}번: 기회를 다 썼어요. 벌은 없어요.</p>
        {:else if q}
          {#if s.n > 0}<p class="sub">❌ 아직 · 숫자 바뀐 문제로 다시 (남은 기회 {s.left})</p>{/if}
          <QuestionInput {q} value={bossGiven[i] ?? null} disabled={locked} onchange={(v) => (bossGiven[i] = v)} />
          <button class="send" disabled={locked} onclick={() => bossSend(i)}>⚔ {i + 1}번 내기</button>
        {/if}
      </div>
    {/each}
  {/if}
</section>

<style>
  .phone { max-width: 440px; margin: 0 auto; }
  header { display: flex; gap: 12px; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--muted); }
  .mon { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
  .ko { color: var(--accent); font-weight: 700; }
  .banner { font-weight: 700; padding: 6px 10px; border-radius: 10px; background: var(--muted); }
  .banner.hit { background: var(--hp); color: var(--card); }
  .say { line-height: 1.6; }
  .sub { color: var(--sub); }
  .big { font-size: 1.3rem; }
  .go { width: 100%; min-height: 48px; margin-top: 12px; font-size: 1.1rem; }
  .result ol { padding-left: 1.2rem; }
  .result li small { color: var(--sub); display: block; }
  .bq { border-top: 1px solid var(--muted); padding: 8px 0; }
  .bq.ok { color: var(--sub); }
</style>
