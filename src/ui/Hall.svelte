<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { DungeonProfile, LessonPack, Store } from '../model/types';
  import { activeIds, atkClock, bossHp, isEnd, isLobby, monsterHp, record, solveLock, stepIdx, stepOf, mastery } from '../raid/raid';
  import { appearNow, nextStep, openRoom, resetRoom } from '../raid/actions';
  import { liveRoom } from './room.svelte';
  import { clock, useClock } from './clock.svelte';
  import Sprite from './Sprite.svelte';

  // 🖥 종합실 (탭 A) — 단계 진행 「다음 ▶」 · 정답 글자는 띄우지 않음(수업 규칙)
  const { S, L, code, P }: { S: Store; L: LessonPack; code: string; P: DungeonProfile } = $props();
  const live = untrack(() => { openRoom(S, L, code, P); return liveRoom(S, code); });
  const stopClock = useClock();
  onDestroy(() => { live.stop(); stopClock(); });

  const R = $derived(live.v.room);
  const now = $derived(clock.now);
  const step = $derived(R ? stepOf(L, R) : null);
  const ids = $derived(R ? activeIds(R, now) : []);
  const hp = $derived(R && step?.kind === 'monster' && !step.later ? monsterHp(L, R, step.id, now) : null);
  const bhp = $derived(R && L.boss ? bossHp(L, R, now) : null);
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const atk = $derived(R ? atkClock(L, R, now) : null);
  const down = $derived(!!hp && hp.max > 0 && hp.left <= 0);
  const studentUrl = $derived(`?role=student&room=${encodeURIComponent(code)}`);
  const bar = (left: number, max: number) => (max ? (left / max) * 100 : 0);
</script>

<section class="hall">
  <p class="mode">{P.label} · {L.no}차시 {L.title}</p>
  {#if R}
    <ol class="steps">
      {#each L.steps as s, i (s.id)}
        <li class:now={stepIdx(R) === i} class:done={stepIdx(R) > i} class:later={s.later}>{s.title}{s.later ? ' · 다음 판에서' : ''}</li>
      {/each}
    </ol>

    {#if isLobby(R)}
      <h1>⚔ 입장</h1>
      <p>들어온 학생 {ids.length}명</p>
    {:else if isEnd(L, R)}
      <h1>{bhp?.won ? '🏆 승리' : '🏁 수업 끝'}</h1>
    {:else if step?.kind === 'concept'}
      <h1>{step.title}</h1>
      <p class="say">{step.say}</p>
    {:else if step?.kind === 'monster' && hp && L.monsters[step.id]}
      <h1>{step.title}</h1>
      <div class="stage" class:down><Sprite ref={L.monsters[step.id]?.sprite ?? ''} pose={down ? 'down' : 'idle'} size={180} /></div>
      {#if down}<p class="ko">💥 쓰러졌다!</p>{/if}
      <div class="bar" aria-label="공동 체력"><div class="fill" style:width="{bar(hp.left, hp.max)}%"></div><span>{hp.left} / {hp.max}</span></div>
      <p class="formula">체력 = ⌊인원 {ids.length || 1} × 소문제 {hp.items} × {hp.pct}%⌋ = {hp.max} · 데미지 {hp.dmg}</p>
    {:else if step?.kind === 'boss' && bhp && L.boss}
      <h1>👑 {L.boss.title}</h1>
      <div class="stage" class:down={bhp.won}><Sprite ref={L.boss.sprite} pose={bhp.won ? 'down' : 'idle'} size={220} /></div>
      {#if bhp.won}<p class="ko">🏆 승리!</p>{/if}
      <div class="bar" aria-label="보스 체력"><div class="fill" style:width="{bar(bhp.left, bhp.max)}%"></div><span>{bhp.left} / {bhp.max}</span></div>
      <p class="formula">체력 = ⌊인원 {ids.length || 1} × 문항 {L.boss.hpItems} × {bhp.pct}%⌋ = {bhp.max} · 도달 {bhp.dmg}</p>
    {/if}

    {#if scout?.on}
      <p class="scout">🌫 정찰 {Math.ceil(scout.left / 1000)}초 — 학습지에 먼저 풀어요 <button onclick={() => appearNow(S, L, code)}>⚔ 등장!</button></p>
    {:else if atk}
      <div class="atk" aria-label="몬스터 공격 게이지"><div class="fill" style:width="{atk.p * 100}%"></div><span>👾 공격까지 {Math.ceil(atk.per - atk.p * atk.per)}초 · 맞으면 {atk.lock}초 멈춤</span></div>
    {/if}

    {#if step?.kind === 'monster' || step?.kind === 'boss'}
      <ul class="who">
        {#each ids as u (u)}
          <li>
            {R.players?.[u]?.nick} ·
            {#if step.kind === 'boss'}도달 {mastery(L, R, u).filter(Boolean).length}/{L.boss?.items}{:else}{@const rec = record(L, R, step.id, u)}데미지 {rec.best}/{rec.total} {rec.perfect ? '⭐' : ''}{/if}
          </li>
        {/each}
      </ul>
    {/if}

    <p class="tools">
      {#if !isEnd(L, R)}<button class="next" onclick={() => nextStep(S, L, code)}>{isLobby(R) ? '▶ 시작' : '다음 ▶'}</button>{/if}
      <a href={studentUrl} target="_blank">➕ 학생 탭</a>
      <button onclick={() => resetRoom(S, L, code, P)}>↻ 처음부터</button>
    </p>
  {/if}
</section>

<style>
  .hall { max-width: 720px; margin: 0 auto; text-align: center; }
  .mode { color: var(--sub); margin: 0 0 8px; }
  .steps { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; list-style: none; padding: 0; margin: 0 0 12px; font-size: 0.8rem; }
  .steps li { padding: 2px 8px; border-radius: 10px; border: 1px solid var(--muted); }
  .steps li.done { opacity: 0.55; }
  .steps li.now { background: var(--accent); color: var(--card); border-color: var(--accent); }
  .steps li.later { border-style: dashed; color: var(--sub); }
  .say { font-size: 1.15rem; line-height: 1.6; text-align: left; }
  .stage { min-height: 200px; display: grid; place-items: center; }
  .stage.down :global(.sprite) { opacity: 0.6; }
  .ko { font-size: 1.4rem; font-weight: 700; color: var(--accent); margin: 0; }
  .bar, .atk { position: relative; height: 28px; border-radius: 14px; background: var(--muted); overflow: hidden; margin: 8px 0; }
  .atk { height: 20px; }
  .bar .fill { height: 100%; background: var(--hp); transition: width 0.4s; }
  .atk .fill { height: 100%; background: var(--accent); opacity: 0.5; }
  .bar span, .atk span { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 700; font-size: 0.85rem; }
  .formula { color: var(--sub); font-size: 0.9rem; }
  .scout { font-weight: 700; }
  .who { list-style: none; padding: 0; }
  .tools { display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap; }
  .next { font-size: 1.1rem; font-weight: 700; border-color: var(--accent); }
</style>
