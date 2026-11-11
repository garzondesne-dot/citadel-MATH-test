<script lang="ts">
  import type { Given, Question } from '../../model/types';
  import QItem from './QItem.svelte';
  import SymText from './SymText.svelte';
  import AnswerRow, { type Cell } from './AnswerRow.svelte';
  import { penLine, stripNo } from '../../engine/input';
  import { answerOf } from '../../raid/raid';
  // ⚔ 소레이드 카드 (⑤ · 학생 · 시연 · 성채 · 게시판 던전이 같이 씀): 단계 줄 ① ✓ ② 지금 ③ 대장 · 📜 문제(한 판 더) · 📜 나의 풀이(늘 펼침 #93) · 지금 단계 문항
  const { items, stage, says, title, value, lastWrong = false, prac = false, disabled = false, onchange }:
    { items: Question[]; stage: number; says: string[]; title: string; value: Given; lastWrong?: boolean; prac?: boolean; disabled?: boolean; downs?: number[]; onchange: (v: Given) => void } = $props();
  const q = $derived(items[Math.min(stage, items.length - 1)] as Question);
  const prob = $derived(prac ? items[0]?.problem : undefined);
  const stName = (i: number): string => (i === items.length - 1 ? '대장' : '①②③④⑤⑥'[i] ?? String(i + 1));
  const no = $derived((/문제 \d+/.exec(title) || [title])[0]);
  // 🧾 답안 줄 = 단계 하나 = 칸 하나 (#108 ③ · 일반 몬스터와 같은 모양): 푼 단계 = ✔ 그 답 · 지금 = 고른 답 · 틀린 뒤 = 빨간 테두리
  const cells = $derived.by((): Cell[] => items.map((x, i) => {
    if (i < stage) { const l = penLine(x, answerOf(x), 0); return { text: l ? stripNo(l) : '✓', state: 'ok' }; }
    if (i === stage) { const l = penLine(x, value, 0); return { text: l ? stripNo(l) : null, state: lastWrong ? 'oldbad' : l ? 'filled' : 'empty' }; }
    return { text: null, state: 'empty' };
  }));
</script>

{#if lastWrong}<div class="bad" role="status"><b>✘ 다시 생각해 봐요 — 같은 문제예요</b><span>졸개 오답은 하트 반 칸 · 대장 오답은 한 칸</span></div>{/if}
<AnswerRow {cells} cur={stage < items.length ? stage : -1} label={stName} />
<div class="bcard" class:badline={lastWrong}>
  {#if prob}<details class="story" open={stage === 0}><summary><b>📜 문제 (숫자가 바뀐 원문)</b></summary><p><SymText text={prob} /></p></details>{/if}
  {#if says.length}<div class="story"><b>📜 나의 풀이</b><ol>{#each says as t, k (k)}<li>{t}</li>{/each}</ol></div>{/if}
  {#if stage < items.length}
    <span class="lab acc">{no} · {stage === items.length - 1 ? '👑 대장' : `졸개 ${'①②③④⑤⑥'[stage]}`}{prac ? ' · 연습' : ''}</span>
    <QItem {q} i={0} {value} {disabled} showNo={false} ansLabel={lastWrong ? '지난 답' : '내 답'} {onchange} />
  {/if}
</div>
