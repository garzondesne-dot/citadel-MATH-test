<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Given, LessonPack, Store } from '../model/types';
  import { itemsFor, monsterHp, record } from '../raid/raid';
  import { ensureRoom, heartbeat, leave, submit } from '../raid/actions';
  import { liveRoom } from './room.svelte';
  import Sprite from './Sprite.svelte';

  // 📱 학생 폰 (탭 B) — 문제 · 답 · 내기 · 재도전 3 (정식 v3: 틀리면 같은 문제 · 다 맞히면 새 숫자)
  const { S, L, code, mid, uid, num }: { S: Store; L: LessonPack; code: string; mid: string; uid: string; num: number } = $props();
  // 방 · 접속 알림 · 구독은 처음 받은 값으로 한 번만 (탭 하나 = 학생 하나)
  const nick = untrack(() => `학생 ${String(num).padStart(2, '0')}`);
  const live = untrack(() => {
    ensureRoom(S, L, code);
    heartbeat(S, code, uid, num, nick);
    const beat = setInterval(() => heartbeat(S, code, uid, num, nick), 3000);
    const bye = () => leave(S, code, uid);
    addEventListener('pagehide', bye);
    const lr = liveRoom(S, code);
    return { v: lr.v, stop: () => { clearInterval(beat); lr.stop(); removeEventListener('pagehide', bye); } };
  });
  onDestroy(live.stop);

  const R = $derived(live.v.room);
  const rec = $derived(R ? record(L, R, mid, uid) : null);
  const hp = $derived(R ? monsterHp(L, R, mid, live.v.now) : null);
  const down = $derived(!!hp && hp.max > 0 && hp.left <= 0);
  /** 지금 풀 문제 = 다음 시도의 문항 */
  const qs = $derived(R && rec ? itemsFor(L, R, mid, uid, rec.nextAttempt) : []);
  const last = $derived(rec?.tries[rec.tries.length - 1] ?? null);
  const lastQs = $derived(R && last ? itemsFor(L, R, mid, uid, last.attempt) : []);
  const canAnswer = $derived(!!rec && (!rec.submitted || rec.canRetry));

  // 고른 원소 (문항마다 번호 배열) — 문제가 바뀌면 비움
  let picked = $state<number[][]>([]);
  let qKey = '';
  $effect(() => {
    const k = qs.map((q) => q.question).join('|');
    if (k !== qKey) { qKey = k; picked = qs.map(() => []); }
  });
  const toggle = (i: number, j: number) => {
    const cur = picked[i] || [];
    picked[i] = cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j].sort((a, b) => a - b);
  };
  let showLast = $state(false);
  function send() {
    if (submit(S, L, code, mid, uid, picked.map((p) => p.slice()) as Given[])) showLast = true;
  }
</script>

<section class="phone">
  <header>
    <b>{nick}</b>
    {#if hp}<span class="hp">👾 {hp.left}/{hp.max}</span>{/if}
    {#if rec}<span>기회 {rec.submitted ? rec.left : rec.slots}/{rec.slots}</span>{/if}
  </header>
  {#if R && rec && L.monsters[mid]}
    {@const mon = L.monsters[mid]}
    <div class="mon"><Sprite ref={mon.sprite} pose={down ? 'down' : 'idle'} size={96} /> <b>{mon.title}</b></div>
    {#if down}<p class="ko">💥 몬스터가 쓰러졌어요! (데미지 {rec.best})</p>{/if}

    {#if showLast && last}
      <div class="result">
        <p><b>{last.correct} / {last.total}</b> 맞힘 · 데미지(가장 많이 맞힌 수) {rec.best}</p>
        <ol>
          {#each lastQs as q, i (i)}
            <li class:ok={last.marks[i]}>{last.marks[i] ? '⭕' : '❌'} <small>{q.question.replace(/^.* 일 때 /, '')}</small></li>
          {/each}
        </ol>
        {#if rec.perfect && !rec.practice}<p>⭐ 다 맞혔어요! 남은 기회로 숫자 바뀐 문제를 연습할 수 있어요(데미지는 그대로).</p>{/if}
        {#if !rec.perfect && rec.left > 0}<p>같은 문제를 다시 풀어요 (남은 기회 {rec.left}).</p>{/if}
        {#if rec.left <= 0}<p>기회를 다 썼어요. 벌은 없어요.</p>{/if}
        {#if canAnswer}<button onclick={() => (showLast = false)}>🔁 다시 풀기</button>{/if}
      </div>
    {:else if canAnswer}
      {#each qs as q, i (i)}
        {#if q.type === 'multi'}
          <div class="q">
            <p>{q.question}</p>
            <div class="chips">
              {#each q.options as o, j (j)}
                <button class="chip" class:on={(picked[i] || []).includes(j)} onclick={() => toggle(i, j)}>{o}</button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
      <button class="go" onclick={send}>⚔ 공격 (답 내기)</button>
    {:else}
      <p>이 몬스터는 끝! 데미지 {rec.best}.</p>
    {/if}
  {/if}
</section>

<style>
  .phone { max-width: 420px; margin: 0 auto; }
  header { display: flex; gap: 12px; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--muted); }
  .mon { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
  .ko { color: var(--accent); font-weight: 700; }
  .q { margin: 12px 0; }
  .q p { margin: 0 0 6px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { min-width: 44px; min-height: 44px; border-radius: 22px; border: 2px solid var(--muted); background: var(--card); color: var(--fg); font-size: 1.1rem; }
  .chip.on { border-color: var(--accent); background: var(--accent); color: var(--card); }
  .go { width: 100%; min-height: 48px; margin-top: 12px; font-size: 1.1rem; }
  .result ol { padding-left: 1.2rem; }
  .result li small { color: var(--sub); display: block; }
</style>
