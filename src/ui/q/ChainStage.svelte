<script lang="ts">
  import { paperOn } from '../submit.svelte';
  import type { Given, Question } from '../../model/types';
  import QItem from './QItem.svelte';
  import SymText from './SymText.svelte';
  import AnswerRow, { type Cell } from './AnswerRow.svelte';
  import { penLine, stripNo } from '../../engine/input';
  import { answerOf } from '../../raid/raid';
  // ⚔ 소레이드 카드 (⑤ · 학생 · 시연 · 성채 · 게시판 던전이 같이 씀): 단계 줄 ① ✓ ② 지금 ③ 대장 · 📜 문제(한 판 더) · 📜 나의 풀이(늘 펼침 #93) · 지금 단계 문항
  //   #116: 낸 단계 칸만 뒤집힘(flip · 0.25초) · ✘ 단계는 빈칸으로 다시 · 연습 판 처음 = 칸 모두 빔 + 「새 숫자로 처음부터」
  const { items, stage, says, title, value, lastWrong = false, prac = false, disabled = false, flip = null, onchange, v4 = false, wrongText = null, prev = undefined, hintKey = '', prevAt = 0, fold = false }:
    { items: Question[]; stage: number; says: string[]; title: string; value: Given; lastWrong?: boolean; prac?: boolean; disabled?: boolean; downs?: number[]; flip?: { i: number; ok: boolean; text: string | null } | null; onchange: (v: Given) => void; /** v4: 틀렸을 때 배너 없음 · 📜 나의 풀이 이번 단계 줄 = 빨강 ✘ 줄 긋기 */ v4?: boolean; wrongText?: string | null; /** ☑ 지난번 틀린 답 · 처음 틀림 열쇠 (multiFb.ts) */ prev?: Given; /** 📜 #130 ② 게시판 카드 = 📜 나의 풀이를 한 줄로 접음(눌러서 펼침 · 마지막 줄만 보임) · 레이드는 안 넘김 = 예전 그대로 */ fold?: boolean; hintKey?: string; prevAt?: number } = $props();
  const q = $derived(items[Math.min(stage, items.length - 1)] as Question);
  const prob = $derived(prac && items[0]?.problem && !q.question?.startsWith(items[0].problem) ? items[0]?.problem : undefined); // 🔎 #126 단계 글에 문제가 이미 있으면 📜 문제 칸 안 띄움(두 번 보임)
  const stName = (i: number): string => (i === items.length - 1 && !paperOn() ? '대장' : '①②③④⑤⑥'[i] ?? String(i + 1));
  const no = $derived((/문제 \d+/.exec(title) || [title])[0]);
  // 🧾 답안 줄 = 단계 하나 = 칸 하나 (#108 ③ · 일반 몬스터와 같은 모양): 푼 단계 = ✔ 그 답 · 지금 = 고른 답 · 틀린 뒤 = 빨간 테두리
  const cells = $derived.by((): Cell[] => items.map((x, i) => {
    if (flip && flip.i === i) return { text: flip.text, state: flip.ok ? 'ok' : 'bad' };
    if (i < stage) { const l = penLine(x, answerOf(x), 0); return { text: l ? stripNo(l) : '✓', state: 'ok', lock: true }; }
    if (i === stage) { const l = penLine(x, value, 0); return { text: l ? stripNo(l) : null, state: lastWrong ? 'oldbad' : l ? 'filled' : 'empty' }; }
    return { text: null, state: 'empty' };
  }));
</script>

{#if lastWrong && !flip && !v4}<div class="bad" role="status"><b>✘ 다시 생각해 봐요 — 같은 문제 · 빈칸으로</b><span>졸개 오답은 칼 반 칸 · 대장 오답은 칼 하나</span></div>{:else if prac && stage === 0 && !says.length && !flip}<div class="bad" role="status" style="background:var(--surface-2)"><b>🆕 새 숫자로 처음부터</b><span>답안 칸을 모두 비웠어요 · 판마다 칼 4개 · 데미지 0</span></div>{/if}
<AnswerRow {cells} cur={stage < items.length ? stage : -1} label={stName} />
<div class="bcard" class:badline={lastWrong}>
  {#if prob}<details class="story" open={stage === 0}><summary><b>📜 문제 (숫자가 바뀐 원문)</b></summary><p><SymText text={prob} /></p></details>{/if}
  {#if fold && (says.length || (v4 && lastWrong && wrongText))}<details class="story fold" data-k="chain-fold"><summary><b>📜 나의 풀이 {says.length}줄</b> <span class="fl">{v4 && lastWrong && wrongText && !flip ? `✘ ${wrongText}` : says[says.length - 1] ?? ''}</span></summary><ol>{#each says as t, k (k)}<li>{t}</li>{/each}{#if v4 && lastWrong && wrongText && !flip}<li class="wr"><span class="x" aria-label="틀림">✘</span> <span>{wrongText}</span></li>{/if}</ol></details>
  {:else if says.length || (v4 && lastWrong && wrongText)}<div class="story"><b>📜 나의 풀이</b><ol>{#each says as t, k (k)}<li>{t}</li>{/each}{#if v4 && lastWrong && wrongText && !flip}<li class="wr"><span class="x" aria-label="틀림">✘</span> <span>{wrongText}</span></li>{/if}</ol></div>{/if}
  {#if stage < items.length}
    <span class="lab acc">{no} · {paperOn() ? `단계 ${stage + 1} / ${items.length}` : stage === items.length - 1 ? '👑 대장' : `졸개 ${'①②③④⑤⑥'[stage]}`}{prac ? ' · 연습' : ''}</span>
    <QItem {q} i={0} {value} {disabled} showNo={false} {onchange} prev={lastWrong ? prev : undefined} {hintKey} {prevAt} />
  {/if}
</div>

<style>
  /* 📜 #130 ② 접힌 나의 풀이 = 한 줄 (마지막 줄 말줄임) · 누르면 펼침 */
  .fold summary { display: flex; align-items: baseline; gap: 6px; min-height: 28px; cursor: pointer; list-style: none; }
  .fold summary::-webkit-details-marker { display: none; }
  .fold summary::after { content: '▸'; margin-left: auto; color: var(--text-2); } .fold[open] summary::after { content: '▾'; }
  .fold summary b { flex: none; }
  .fold .fl { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ok); }
  .fold[open] .fl { display: none; }
</style>
