<script lang="ts">
  import type { Given, LessonPack, Question, Step } from '../model/types';
  import { bossItem, chainItems, items } from '../engine/lessons';
  import { grade } from '../engine/grade';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../engine/input';
  import { answerOf } from '../raid/raid';
  import QItem from './q/QItem.svelte';
  import ChainStage from './q/ChainStage.svelte';

  // 🎮 선생님 시연 (🪞 선생님이 보는 문제 = 학생이 보는 문제): 학생 화면과 같은 부품 · 같은 문제 꼴 · 같은 숫자 규칙
  //   다른 점 = 데미지 · 기록 없음(저장소에 쓰지 않음) + 💡 정답 펼치기뿐
  const { L, step, code, onclose }: { L: LessonPack; step: Step; code: string; onclose: () => void } = $props();
  const seed = $derived(`${code}|demo`);
  const chain = $derived(step.kind === 'monster' && !!L.monsters[step.id]?.chain);
  let round = $state(0); // 🔄 숫자 바꿔 다시 (판 번호)
  let reveal = $state(false);
  let msg = $state('');
  // 일반 몬스터
  const mItems = $derived(step.kind === 'monster' && !chain ? items(L, step.id, seed, round) : []);
  let mGiven = $state<Given[]>([]);
  let marks = $state<boolean[] | null>(null);
  // 소레이드
  const cItems = $derived(chain ? chainItems(L, step.id, seed, round) : []);
  let cStage = $state(0), cSays = $state<string[]>([]), cGiven = $state<Given>(null), cWrong = $state(false);
  // 보스
  let bi = $state(0);
  const bQ = $derived(step.kind === 'boss' && L.boss ? bossItem(L, seed, bi, round) : null);
  let bGiven = $state<Given>(null);
  let k0 = '';
  $effect(() => {
    const k = `${step.id}|${round}|${bi}`;
    if (k === k0) return; k0 = k;
    mGiven = mItems.map((q) => emptyOf(q)); marks = null;
    cStage = 0; cSays = []; cWrong = false; cGiven = cItems[0] ? emptyOf(cItems[0]) : null;
    bGiven = bQ ? emptyOf(bQ) : null; msg = '';
  });
  const ansText = (q: Question, i: number) => { const l = penLine(q, answerOf(q), i); return l ? stripNo(l) : q.solution || ''; };
  function mGo() { marks = mItems.map((q, i) => grade(q, finalOf(q, mGiven[i] ?? null))); msg = `${marks.filter(Boolean).length} / ${marks.length} 맞힘 (시연 · 데미지 없음)`; }
  function cGo() {
    const q = cItems[cStage]; if (!q) return;
    if (grade(q, finalOf(q, cGiven))) { cSays = [...cSays, q.say || '', ...(q.why ? [q.why.text] : [])]; cStage += 1; cWrong = false; cGiven = cItems[cStage] ? emptyOf(cItems[cStage] as Question) : null; msg = cStage >= cItems.length ? '👑 대장 처치! (시연)' : '✔ 졸개 처치!'; }
    else { cWrong = true; cGiven = emptyOf(q); msg = '✘ 다시 — 같은 문제 · 빈칸으로 (시연은 기회를 세지 않음)'; }
  }
  function bGo() { if (!bQ) return; msg = grade(bQ, finalOf(bQ, bGiven)) ? `✔ ${bi + 1}번 정답 (시연)` : `✘ ${bi + 1}번 아직 (시연)`; }
</script>

<div class="demo" role="dialog" aria-label="선생님 시연">
  <div class="bar">
    <b>🎮 시연 · {step.kind === 'boss' ? L.boss?.title : step.title}</b>
    <span class="tag">데미지 · 기록 없음</span>
    <button onclick={() => (reveal = !reveal)}>💡 정답 {reveal ? '접기' : '펼치기'}</button>
    <button onclick={() => (round += 1)}>🔄 숫자 바꿔 다시</button>
    <button onclick={onclose}>✕ 닫기</button>
  </div>
  {#if step.kind === 'boss' && L.boss}
    <div class="tabs">{#each Array.from({ length: L.boss.items }) as _, i (i)}<button class:on={i === bi} onclick={() => (bi = i)}>{i + 1}번</button>{/each}</div>
    {#if bQ}
      <QItem q={bQ} i={bi} value={bGiven} runeLen={4} showNo={false} onchange={(v) => (bGiven = v)} />
      {#if reveal}<p class="reveal">💡 {ansText(bQ, bi)} <small>{bQ.solution}</small></p>{/if}
      <button class="go" disabled={!filled(bQ, bGiven)} onclick={bGo}>⚔ {bi + 1}번 내기 (시연)</button>
    {/if}
  {:else if chain}
    <ChainStage items={cItems} stage={cStage} says={cSays} title={step.title} value={cGiven} lastWrong={cWrong} prac={round > 0} onchange={(v) => (cGiven = v)} />
    {#if reveal && cItems[cStage]}<p class="reveal">💡 {ansText(cItems[cStage] as Question, 0)}</p>{/if}
    {#if cStage < cItems.length}<button class="go" disabled={!filled(cItems[cStage] as Question, cGiven)} onclick={cGo}>⚔ 공격 (시연)</button>{/if}
  {:else}
    {#each mItems as q, i (`${round}|${i}`)}
      <QItem {q} {i} value={mGiven[i] ?? null} wasWrong={!!marks && !marks[i]} onchange={(v) => { mGiven[i] = v; marks = null; }} />
      {#if reveal}<p class="reveal">💡 {ansText(q, i)} <small>{q.solution}</small></p>{/if}
    {/each}
    <button class="go" disabled={!mItems.every((q, i) => filled(q, mGiven[i] ?? null))} onclick={mGo}>⚔ 공격 (시연)</button>
  {/if}
  {#if msg}<p class="msg">{msg}</p>{/if}
</div>

<style>
  .demo { position: fixed; inset: 0; z-index: 10; overflow: auto; background: var(--bg); padding: 12px 16px 24px; text-align: left; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; position: sticky; top: -12px; background: var(--bg); padding: 6px 0; border-bottom: 1px solid var(--muted); }
  .tag { font-size: 0.8rem; color: var(--sub); }
  .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .tabs .on { border-color: var(--accent); color: var(--accent); font-weight: 700; }
  .reveal { background: var(--muted); border-radius: 8px; padding: 6px 8px; overflow-wrap: anywhere; }
  .reveal small { display: block; color: var(--sub); }
  .go { width: 100%; min-height: 48px; margin-top: 10px; font-weight: 700; border-color: var(--accent); }
  .msg { font-weight: 700; text-align: center; }
  .demo :global(*) { max-width: 760px; }
</style>
