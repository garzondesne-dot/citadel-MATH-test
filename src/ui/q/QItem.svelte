<script lang="ts">
  import type { Given, Question } from '../../model/types';
  import { untrack } from 'svelte';
  import { needNeg, normFor, penLine, stripNo } from '../../engine/input';
  import RuneKeypad from './RuneKeypad.svelte';
  import Chip from './Chip.svelte';
  import Choices from './Choices.svelte';
  import { SUBJ } from '../../engine/subject';
  import SymText from './SymText.svelte';
  import { firstWrong, marksOf } from './multiFb';
  import { paperOn } from '../submit.svelte';

  // 문항 하나 = 문제 글 + 그 꼴의 답 칸 + 「✍ 나의 답」 한 줄 (꼴 하나 = 부품 하나 · 학생 · 성채 · 허수아비 · 선생님 시연이 같이 씀)
  //   runeLen: 몬스터 · 소레이드 = 2 (0~99) · 문제 창 꼴(형성평가 등) = 4 (#97)
  const { q, i = 0, value: raw, wasWrong = false, disabled = false, runeLen = 2, showNo = true, ansLabel = '내 답', sym = true, onchange, prev = undefined, prevQ = null, hintKey = '', prevAt = 0 }:
    { q: Question; i?: number; value: Given; wasWrong?: boolean; disabled?: boolean; runeLen?: number; showNo?: boolean; ansLabel?: string; sym?: boolean; onchange: (v: Given) => void;
      /** ☑ 지난번 틀린 답(같은 판) · 그때 문항 · 처음 틀림 기억 열쇠(그 문항) — multiFb.ts */ prev?: Given; prevQ?: Question | null; hintKey?: string; /** 몇 번째 시도 뒤인가 (같은 오답을 또 내도 새 틀림으로) */ prevAt?: number } = $props();
  // ☑ 모두 고르기 (📜 2026-11-15): 고른 정답 ✔ · 고른 오답 ✘ · 처음 틀렸을 때 한 번만 큰 띠 + 「모두」 깜빡 + ☐ 체크 상자 모양
  const marks = $derived(marksOf(q, prev, prevQ));
  let fresh = $state(false), shrink = $state(false), fT: ReturnType<typeof setTimeout>[] = [];
  const mSig = $derived(marks ? `${hintKey}|${prevAt}|${JSON.stringify(prev)}|${JSON.stringify(marks)}` : '');
  // 🐞 2026-11-15 (정식 작업 사본 수업 길 시험): marks 는 시계가 돌 때마다 새 객체 → 효과가 다시 돌아 띠가 꺼졌음 = 글자 열쇠(mSig)가 바뀔 때만
  let lastSig = '';
  $effect(() => { const sig = mSig; untrack(() => { if (sig === lastSig) return; lastSig = sig; const m = marks, k = hintKey; fT.forEach(clearTimeout); fresh = false; shrink = false; if (!m || !k || !firstWrong(k)) return; fT = [setTimeout(() => (fresh = true), 700), setTimeout(() => (shrink = true), 2200)]; }); }); // 두 번째 틀림부터 = 띠 없음
  $effect(() => () => fT.forEach(clearTimeout));
  const allBits = (t: string) => t.split(/(모두)/);
  // 문제 글: 「… 일 때」 앞부분(조건) = 작은 글 · 묻는 부분 = 큰 글 (②B q1 · q2)
  const parts = $derived.by(() => { const t0 = q.question, t = showNo ? t0 : t0.replace(/^\s*\(\d+\)\s*/, ''), k = t.lastIndexOf(' 일 때 '); return k > 0 ? [t.slice(0, k + 4), t.slice(k + 5)] : ['', t]; });
  const value = $derived(normFor(q, raw));
  const qno = $derived(/^\s*\(\d+\)/.test(q.question) || /^\d+\.\s/.test(q.question) ? null : `(${i + 1})`);
  const line = $derived(penLine(q, value, i));
</script>

<div class="item">
  {#if wasWrong}<span class="was">✘ 지난번</span>{/if}
  {#if q.type === 'blanks'}
    {#if q.question}<p class="qt"><SymText text={q.question} on={sym} /></p>{/if}
    <p class="qt math">{q.items[0]?.left} <b class="box">{(value as string[] | null)?.[0] ?? '□'}</b> {q.items[0]?.right}</p>
    <Choices opts={q.options} value={q.options.indexOf((value as string[] | null)?.[0] ?? '')} {disabled} onpick={(k) => onchange([q.options[k] as string])} />
  {:else}
    {#if parts[0]}<p class="q1"><SymText text={parts[0]} on={sym} /></p>{/if}
    <p class="q2">{#if showNo && qno}<b class="no">{qno}</b> {/if}{#if q.type === 'multi'}{#each allBits(parts[1] ?? '') as b, k (k)}{#if b === '모두'}<mark class="all" class:paper={paperOn()} class:blink={fresh} data-k="all">모두</mark>{:else if b}<SymText text={b} on={sym} />{/if}{/each}{:else}<SymText text={parts[1] ?? ''} on={sym} />{/if}</p>
    {#if q.type === 'multi'}
      {#if fresh}<div class="allband" class:small={shrink} role="status" data-k="allband">☑ 정답이 하나가 아닐 수 있어요 · 모두 고르세요!</div>{/if}
      <Chip {q} value={(value as number[]) || []} {disabled} {marks} box={fresh} onchange={(v) => onchange(v)} />
    {:else if q.type === 'choice'}
      <Choices opts={q.choices} value={value as number | null} col {disabled} onpick={(k) => onchange(k)} />
    {:else if q.type === 'ox'}
      <Choices opts={['O', 'X']} value={value === true ? 0 : value === false ? 1 : null} {disabled} onpick={(k) => onchange(k === 0)} />
    {:else if q.type === 'number'}
      <RuneKeypad value={value as number | string | null} len={runeLen} neg={needNeg(q)} {disabled} onchange={(v) => onchange(v)} />
    {:else if SUBJ.formats[q.type]}
      {@const W = SUBJ.formats[q.type]!.Widget}<W {q} {value} {disabled} onchange={(v) => onchange(v)} /> <!-- 과목 고유 꼴 (#136) -->
    {:else if q.type === 'text'}
      <input class="txt" maxlength="40" placeholder="답을 입력하세요" autocomplete="off" value={String(value ?? '')} {disabled} oninput={(e) => onchange((e.currentTarget as HTMLInputElement).value)} />
    {/if}
  {/if}
  <div class="ans" class:empty={!line}><small>{ansLabel}</small> {#if line}{stripNo(line)}{:else}<span class="ph">고르면 여기에 적혀요</span>{/if}</div>
</div>

<style>
  .item { display: flex; flex-direction: column; gap: var(--s3); min-width: 0; }
  .q1 { margin: 0; font-size: 15px; line-height: 1.6; color: var(--text); overflow-wrap: anywhere; }
  .q2, .qt { margin: 0; font-size: 19px; font-weight: 700; line-height: 1.45; overflow-wrap: anywhere; }
  .no { color: var(--accent); }
  .was { font-size: var(--fs-small); color: var(--bad); font-weight: 700; }
  .box { display: inline-block; min-width: 2em; text-align: center; border: 2px solid var(--accent); border-radius: 6px; }
  .ans { min-height: 46px; height: 46px; border-radius: var(--r); background: var(--surface-2); display: flex; align-items: center; gap: var(--s2); padding: 0 14px; font-size: 18px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } /* 📜 2026-11-16 「보기 누르면 규격이 바뀜」 = 답 줄 높이 고정(길면 … ) */
  .ans small { font-size: var(--fs-small); font-weight: 500; color: var(--text-2); flex: none; }
  .ans .ph { font-size: var(--fs-small); font-weight: 500; color: var(--text-3); }
  .all { background: #ffe066; color: #1b1408; font-weight: 800; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; border-radius: 4px; padding: 0 2px; }
  .all.paper { background: none; color: inherit; }
  .all.blink { animation: allblink 0.45s ease-in-out 3; }
  @keyframes allblink { 50% { background: var(--accent); transform: scale(1.12); } }
  .allband { text-align: center; padding: var(--s3) var(--s2); border-radius: var(--r); background: var(--accent); color: var(--on-accent); font: 800 19px var(--font); animation: bounce 0.5s ease-out 1; transition: font-size var(--t), padding var(--t); }
  .allband.small { font-size: 14px; padding: 6px var(--s2); }
  @keyframes bounce { 0% { transform: scale(0.6); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { .all.blink, .allband { animation: none; } }
  .txt { width: 100%; box-sizing: border-box; min-height: var(--tap); font-size: 17px; border-radius: var(--r); border: 2px solid var(--line); background: var(--surface-2); color: var(--text); padding: 0 10px; }
</style>
