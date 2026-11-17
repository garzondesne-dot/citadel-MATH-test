<script lang="ts">
  import { untrack } from 'svelte';
  import type { Question, Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import PhotoSheet, { type PhotoOut } from './PhotoSheet.svelte';
  import { rewriteOf } from '../../school/photo';
  // 📜 #57 ✍ 실력 쓰기 · 📜 +1 (허수아비 · 성채 같은 부품): 학습지 숫자 📜 를 받은 문항 = 숫자 바꾼 판 한 번 더
  //   소레이드 단계 없이 그 판 문제 → 종이에 처음부터 손글씨 → 📸 · 불통과 = 같은 숫자로 다시 (사진 한도 = 지금 그대로)
  const { S, cls, num, lesson, room, title, items, trial = false, onpass, onpend, onclose }:
    { S: Store; cls: string; num: number; lesson: string; room: string; title: string; items: Question[]; trial?: boolean; onpass: (v: PhotoOut) => void; /** ⏳ 선생님 확인으로 넘어감 (성채 = 기다림 기록) */ onpend?: (v: PhotoOut) => void; onclose: () => void } = $props();
  const rw = untrack(() => rewriteOf(items));
  const mark = (t: string, i: number) => (/^[①-⑳👑]/u.test(t) ? t : `${'①②③④⑤⑥⑦⑧'[i] ?? i + 1} ${t}`);
  let shot = $state(false), note = $state('');
  function done(v: PhotoOut | null) {
    shot = false;
    if (v?.status === 'pass') { onpass(v); return; }
    if (v && (v.status === 'check' || v.status === 'appeal')) onpend?.(v);
    note = !v ? '' : v.status === 'check' || v.status === 'appeal' ? '⏳ 선생님이 직접 확인해요 · 인정되면 📜 +1 이 와요' : '✏ 아직이에요 · 같은 숫자로 고쳐 써서 다시 찍어요';
  }
</script>

{#if shot}
  <PhotoSheet {S} {cls} {num} {lesson} {room} {title} items={rw.ph} {trial} again onclose={done} />
{:else}
  <Sheet {onclose} tall mainText="📸 찍어서 채점" onmain={() => { note = ''; shot = true; }}>
    {#snippet title()}✍ 실력 쓰기 · 📜 +1{/snippet}
    <div class="rw" data-k="rewrite">
      <p class="rt">{title} · <span class="tag">🔁 숫자 바꾼 판</span></p>
      {#if rw.stem}<p class="wq" data-k="rw-stem">{rw.stem}</p>{/if}
      <ul class="ln">{#each rw.lines as t, i (i)}<li>{mark(t, i)}</li>{/each}</ul>
      <p class="hand">✍ 게임 풀이를 보지 말고 <b>종이에 처음부터 손으로</b> 풀어 쓰고 📸 찍어요 · 화면 · 인쇄 글은 통과 안 돼요</p>
      {#if note}<p class="nt" role="status" data-k="rw-note">{note}</p>{/if}
      <p class="muted">통과 = 📜 +1 (문항당 한 번) · 사진 한도는 서술형과 같아요</p>
    </div>
  </Sheet>
{/if}

<style>
  .rw { display: flex; flex-direction: column; gap: var(--s3); padding-bottom: var(--s3); }
  .rt { margin: 0; color: var(--text-2); font-size: 14px; font-weight: 700; }
  .tag { display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: 12px; background: var(--surface-2); color: var(--scroll); font: 700 13px var(--font); }
  .wq { margin: 0; font-size: 17px; font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
  .ln { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--s2); font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; }
  .hand { margin: 0; padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface-2); font-size: 15px; line-height: 1.5; }
  .nt { margin: 0; padding: var(--s2) var(--s3); border-radius: var(--r); border: 1px solid var(--accent); font-size: 15px; font-weight: 700; }
  .muted { margin: 0; color: var(--text-2); font-size: 14px; }
</style>
