<script lang="ts">
  import type { Given, Question } from '../../model/types';
  import { needNeg, normFor, penLine, stripNo } from '../../engine/input';
  import RunePad from './RunePad.svelte';
  import Chips from './Chips.svelte';
  import Choices from './Choices.svelte';
  import SubsetBuilder from './SubsetBuilder.svelte';

  // 문항 하나 = 문제 글 + 그 꼴의 답 칸 + 「✍ 나의 답」 한 줄 (꼴 하나 = 부품 하나 · 학생 · 성채 · 허수아비 · 선생님 시연이 같이 씀)
  //   runeLen: 몬스터 · 소레이드 = 2 (0~99) · 문제 창 꼴(형성평가 등) = 4 (#97)
  const { q, i = 0, value: raw, wasWrong = false, disabled = false, runeLen = 2, showNo = true, onchange }:
    { q: Question; i?: number; value: Given; wasWrong?: boolean; disabled?: boolean; runeLen?: number; showNo?: boolean; onchange: (v: Given) => void } = $props();
  const value = $derived(normFor(q, raw));
  const qno = $derived(/^\s*\(\d+\)/.test(q.question) || /^\d+\.\s/.test(q.question) ? null : `(${i + 1})`);
  const line = $derived(penLine(q, value, i));
</script>

<div class="item">
  {#if wasWrong}<span class="was">✘ 지난번</span>{/if}
  {#if q.type === 'blanks'}
    {#if q.question}<p class="qt">{q.question}</p>{/if}
    <p class="qt math">{q.items[0]?.left} <b class="box">{(value as string[] | null)?.[0] ?? '□'}</b> {q.items[0]?.right}</p>
    <Choices opts={q.options} value={q.options.indexOf((value as string[] | null)?.[0] ?? '')} {disabled} onpick={(k) => onchange([q.options[k] as string])} />
  {:else}
    <p class="qt">{#if showNo && qno}<b class="no">{qno}</b> {/if}{q.question}</p>
    {#if q.type === 'multi'}
      <Chips {q} value={(value as number[]) || []} {disabled} onchange={(v) => onchange(v)} />
    {:else if q.type === 'choice'}
      <Choices opts={q.choices} value={value as number | null} col {disabled} onpick={(k) => onchange(k)} />
    {:else if q.type === 'ox'}
      <Choices opts={['O', 'X']} value={value === true ? 0 : value === false ? 1 : null} {disabled} onpick={(k) => onchange(k === 0)} />
    {:else if q.type === 'number'}
      <RunePad value={value as number | string | null} len={runeLen} neg={needNeg(q)} {disabled} onchange={(v) => onchange(v)} />
    {:else if q.type === 'subsets'}
      <SubsetBuilder base={q.base} value={(value as number[][]) || []} {disabled} onchange={(v) => onchange(v)} />
    {:else if q.type === 'text'}
      <input class="txt" maxlength="40" placeholder="답을 입력하세요" autocomplete="off" value={String(value ?? '')} {disabled} oninput={(e) => onchange((e.currentTarget as HTMLInputElement).value)} />
    {/if}
  {/if}
  <div class="ans" class:empty={!line}><b>✍</b> {#if line}{stripNo(line)}{:else}<span class="ph">고르면 여기에 적혀요</span>{/if}</div>
</div>

<style>
  .item { padding: 10px 0; border-bottom: 1px dashed var(--muted); min-width: 0; }
  .qt { margin: 0 0 8px; line-height: 1.55; overflow-wrap: anywhere; }
  .no { color: var(--accent); }
  .was { display: inline-block; font-size: 0.8rem; color: var(--hp); font-weight: 700; margin-bottom: 4px; }
  .box { display: inline-block; min-width: 2em; text-align: center; border: 2px solid var(--accent); border-radius: 6px; }
  .ans { margin-top: 8px; font-size: 0.9rem; color: var(--fg); overflow-wrap: anywhere; font-style: italic; }
  .ans.empty .ph { color: var(--sub); }
  .txt { width: 100%; box-sizing: border-box; min-height: 44px; font-size: 1.05rem; border-radius: 10px; border: 2px solid var(--muted); background: var(--card); color: var(--fg); padding: 0 10px; }
</style>
