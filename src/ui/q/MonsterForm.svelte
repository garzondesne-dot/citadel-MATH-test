<script lang="ts">
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../../engine/input';
  import { itemsFor, plainRecord } from '../../raid/raid';
  import { submit } from '../../raid/actions';
  import QItem from './QItem.svelte';

  // 📝 일반 몬스터 문제 화면 (정식 fightForm · v3): 다 풀고 ⚔ 공격 · 빈 칸이면 공격 잠김
  //   틀림 → 같은 문제 그대로 · 지난 답이 채워져 있고 ✘ 칸만 고침 · 다 맞힌 뒤 = 새 숫자(연습 · 데미지 그대로)
  const { S, L, R, code, mid, uid, now, locked, title }: { S: Store; L: LessonPack; R: Room; code: string; mid: string; uid: string; now: number; locked: boolean; title: string } = $props();
  const rec = $derived(plainRecord(L, R, mid, uid));
  const attempt = $derived(rec.nextAttempt);
  const items = $derived(itemsFor(L, R, mid, uid, attempt));
  const key = $derived(`${mid}|${attempt}`);
  let given = $state<Given[]>([]);
  let formKey = '';
  let retrying = $state('');
  let thinkUntil = $state(0);
  let seenTry: number | null = null;
  $effect(() => {
    if (key === formKey) return;
    formKey = key;
    const last = rec.tries[rec.tries.length - 1];
    const same = !!last && (!rec.perfect || rec.fix) && Array.isArray(last.given) && last.given.length === items.length;
    given = items.map((q, i) => (same && last.given[i] != null ? JSON.parse(JSON.stringify(last.given[i])) : emptyOf(q)));
  });
  // 틀린 결과가 새로 나오면 생각 시간 (정식 thinkUntil · meta.think 초)
  $effect(() => {
    const t = rec.tries.length - 1;
    if (t === seenTry) return;
    const first = seenTry === null; seenTry = t;
    const last = rec.tries[t];
    if (!first && last && last.correct < last.total && R.meta.think > 0) thinkUntil = Date.now() + R.meta.think * 1000;
  });
  const prevWrong = $derived(rec.tries.length ? (rec.tries[rec.tries.length - 1]?.marks || []).map((m) => !m) : []);
  const ready = $derived(items.length > 0 && items.every((q, i) => filled(q, given[i] ?? null)));
  const showForm = $derived(!rec.submitted || (retrying === key && rec.canRetry));
  const last = $derived(rec.tries[rec.tries.length - 1] ?? null);
  const lastItems = $derived(last ? itemsFor(L, R, mid, uid, last.attempt) : []);
  const thinkLeft = $derived(Math.max(0, Math.ceil((thinkUntil - now) / 1000)));
  function go() {
    if (!ready || locked) return;
    if (submit(S, L, code, mid, uid, items.map((q, i) => finalOf(q, given[i] ?? null)))) retrying = '';
  }
  const note = $derived(attempt
    ? rec.perfect ? (rec.fix ? '🔁 같은 문제 그대로예요 (고장 아님!) — 종이 풀이를 고쳐서 ✘ 칸을 다시 내요' : '🆕 새 문제 (숫자가 바뀌었어요) — 연습 공격 · 데미지는 그대로 · 틀리면 기회 −1')
      : '🔁 같은 문제 그대로예요 (고장 아님!) — 종이 풀이를 고쳐서 ✘ 칸만 다시 내요 · 지난 답은 채워져 있어요'
    : '');
</script>

{#if showForm}
  <div class="paper">
    <div class="paper-h"><b>{title}</b><small>{items.length > 1 ? `(1)~(${items.length}) 모두 풀고 공격` : '풀고 공격'}</small></div>
    {#if note}<p class="note">{note}</p>{/if}
    {#if L.monsters[mid]?.noteText}<p class="note">💡 {L.monsters[mid]?.noteText}</p>{/if}
    {#each items as q, i (`${key}|${i}`)}
      <QItem {q} {i} value={given[i] ?? null} wasWrong={!!prevWrong[i] && attempt > 0} disabled={locked} onchange={(v) => (given[i] = v)} />
    {/each}
  </div>
  <div class="dock"><span class="slots">기회 {rec.submitted ? rec.left : rec.slots}/{rec.slots}</span><button class="go" disabled={!ready || locked} onclick={go}>⚔ 공격!</button></div>
{:else if last}
  <div class="paper">
    <div class="paper-h"><b>📜 나의 답안</b><small>{last.correct} / {last.total} 맞힘 · 데미지(가장 많이 맞힌 수) {rec.best}</small></div>
    <ol class="res">
      {#each lastItems as q, i (i)}
        {@const line = penLine(q, (last.given || [])[i] ?? null, i)}
        <li class:ok={last.marks[i]}>{last.marks[i] ? '✔' : '✘'} {line ? stripNo(line) : '(빈 칸)'}</li>
      {/each}
    </ol>
    {#if rec.perfect && !rec.practice}<p>⭐ 다 맞혔어요! 남은 기회로 숫자 바뀐 문제를 연습할 수 있어요 (데미지는 그대로).</p>{/if}
    {#if !rec.perfect && rec.left > 0}<p>같은 문제를 다시 풀어요 (남은 기회 {rec.left}).</p>{/if}
    {#if rec.left <= 0}<p>기회를 다 썼어요. 벌은 없어요 — 학습지에 풀이를 정리해요.</p>{/if}
  </div>
  {#if rec.canRetry}
    <div class="dock"><span class="slots">기회 {rec.left}/{rec.slots}</span>
      <button class="go" disabled={thinkLeft > 0} onclick={() => (retrying = key)}>{thinkLeft > 0 ? `🤔 ${thinkLeft}초 생각하기` : rec.perfect ? '🔥 연습 공격' : '🔁 다시 풀기'}</button></div>
  {/if}
{/if}

<style>
  .paper { background: var(--card); border: 1px solid var(--muted); border-radius: 12px; padding: 10px 12px; min-width: 0; }
  .paper-h { display: flex; flex-wrap: wrap; gap: 4px 8px; justify-content: space-between; align-items: baseline; }
  .paper-h small { color: var(--sub); }
  .note { font-size: 0.9rem; background: var(--muted); border-radius: 8px; padding: 6px 8px; overflow-wrap: anywhere; }
  .res { padding-left: 1.2rem; }
  .res li { color: var(--hp); overflow-wrap: anywhere; }
  .res li.ok { color: var(--fg); }
  .dock { position: sticky; bottom: 0; display: flex; gap: 8px; align-items: center; padding: 8px 0; background: var(--bg); }
  .slots { color: var(--sub); font-size: 0.9rem; white-space: nowrap; }
  .go { flex: 1; min-height: 48px; font-size: 1.1rem; font-weight: 700; border-color: var(--accent); }
  .go:disabled { opacity: 0.5; }
</style>
