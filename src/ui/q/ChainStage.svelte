<script lang="ts">
  import type { Given, Question } from '../../model/types';
  import QItem from './QItem.svelte';
  // ⚔ 소레이드 한 단계 칸 (학생 · 선생님 시연 · 성채 · 게시판 던전이 같이 씀): 진행 칩 ①②③👑 · 📜 문제(한 판 더) · 📜 나의 풀이(늘 펼침 #93) · 지금 단계 문항
  const { items, stage, says, title, value, lastWrong = false, prac = false, disabled = false, downs = [], onchange }:
    { items: Question[]; stage: number; says: string[]; title: string; value: Given; lastWrong?: boolean; prac?: boolean; disabled?: boolean; downs?: number[]; onchange: (v: Given) => void } = $props();
  const q = $derived(items[Math.min(stage, items.length - 1)] as Question);
  const prob = $derived(prac ? items[0]?.problem : undefined);
  const stName = (i: number) => (i === items.length - 1 ? '👑' : '①②③④⑤⑥'[i]);
</script>

<div class="cr-chips" aria-label="단계">
  {#each items as _, i (i)}
    {#if i}<i>›</i>{/if}<span class="chip" class:ok={i < stage} class:now={i === stage} class:down={!prac && downs.includes(i)}>{!prac && downs.includes(i) ? '💀' : ''}{stName(i)}{i < stage ? '✔' : i === stage ? '⚔' : ''}</span>
  {/each}
</div>
{#if prob}<details class="prob" open={stage === 0}><summary>📜 문제 <small>(숫자가 바뀐 원문 · 눌러서 접기)</small></summary><p>{prob}</p></details>{/if}
{#if says.length}<div class="story"><b>📜 나의 풀이</b><ol>{#each says as t, k (k)}<li>{t}</li>{/each}</ol></div>{/if}
{#if stage < items.length}
  <div class="paper">
    <div class="paper-h"><b>{title} · {stage === items.length - 1 ? '👑 대장' : `졸개 ${'①②③④⑤⑥'[stage]}`}</b><small>{prac ? '연습 (숫자 바뀜 · 데미지 없음)' : '틀려도 숫자는 그대로'}</small></div>
    {#if lastWrong}<p class="note">✘ 다시 생각해 봐요 — 같은 문제예요</p>{/if}
    <QItem {q} i={0} {value} wasWrong={lastWrong} {disabled} showNo={false} {onchange} />
  </div>
{/if}

<style>
  .cr-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 6px 0; }
  .cr-chips i { color: var(--sub); font-style: normal; }
  .chip { padding: 2px 8px; border-radius: 10px; border: 1px solid var(--muted); font-size: 0.9rem; }
  .chip.ok { background: var(--muted); }
  .chip.now { border-color: var(--accent); color: var(--accent); font-weight: 700; }
  .chip.down { opacity: 0.6; }
  .prob, .story { background: var(--card); border: 1px solid var(--muted); border-radius: 10px; padding: 8px 10px; margin: 6px 0; overflow-wrap: anywhere; }
  .story ol { margin: 4px 0 0; padding-left: 1.3rem; }
  .story li { line-height: 1.5; }
  .story li:last-child { color: var(--hp); }
  .paper { background: var(--card); border: 1px solid var(--muted); border-radius: 12px; padding: 10px 12px; min-width: 0; }
  .paper-h { display: flex; flex-wrap: wrap; gap: 4px 8px; justify-content: space-between; align-items: baseline; }
  .paper-h small { color: var(--sub); }
  .note { font-size: 0.9rem; background: var(--muted); border-radius: 8px; padding: 6px 8px; }
</style>
