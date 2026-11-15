<script lang="ts">
  // ✔ 개념 체크 학생 카드 (📜 2026-11-15 · school/cc.ts): 30초 막대 · OX 또는 선다 한 문제 · 낸 뒤 ✔ / ✘ · 틀리면 바로 💡 도움 1단(why)
  //   체력 · 데미지 · 보상 없음 · 한 번만(다시 내도 처음 답) · 닫힌 뒤에도 결과는 남음
  import type { Room, Step, Store } from '../../model/types';
  import Choices from './Choices.svelte';
  import SymText from './SymText.svelte';
  import { answerCC, ccOpen, myCC, CC_SEC } from '../../school/cc';
  import { sfx } from '../sound.svelte';
  const { S, R, code, uid, step, now }: { S: Store; R: Room; code: string; uid: string; step: Step; now: number } = $props();
  const c = $derived(step.check!);
  const mine = $derived(myCC(R, step, uid));
  const open = $derived(ccOpen(R, step, now));
  const left = $derived(R.state.cc ? Math.max(0, R.state.cc.end - now) : 0);
  const opts = $derived(c.type === 'ox' ? ['O', 'X'] : (c.ch ?? []));
  const picked = $derived(mine ? (c.type === 'ox' ? (mine.a ? 0 : 1) : Number(mine.a)) : null);
  function pick(k: number) { if (mine || !open) return; const ok = answerCC(S, code, uid, step, c.type === 'ox' ? k === 0 : k); sfx(ok ? 'correct' : 'hurt', 0.6); }
</script>

<div class="bcard cc" data-k="cc" class:done={!!mine}>
  <div class="head"><b>✔ 개념 체크</b>{#if open && !mine}<span class="sec">{Math.ceil(left / 1000)}초</span>{/if}</div>
  {#if open && !mine}<div class="bar" aria-hidden="true"><i style:width="{(100 * left) / (CC_SEC * 1000)}%"></i></div>{/if}
  <p class="q"><SymText text={c.q} /></p>
  <Choices {opts} value={picked} col={c.type === 'choice'} disabled={!!mine || !open} onpick={pick} />
  {#if mine}
    {#if mine.ok}<p class="ok" role="status">✔ 맞았어요!</p>
    {:else}<p class="ng" role="status">✘ 다시 볼까요?</p><div class="h1" data-k="cc-help"><b>💡 도움 1단</b><p><SymText text={c.why} /></p></div>{/if}
  {:else if !open}<p class="muted">체크가 끝났어요</p>{/if}
  <p class="muted small">체력 · 보상과 상관없어요</p>
</div>

<style>
  .cc { border: 2px solid var(--accent); }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .head b { color: var(--accent); font-size: 18px; }
  .sec { font: 800 18px var(--font); font-variant-numeric: tabular-nums; }
  .bar { height: 8px; border-radius: 4px; background: var(--surface-2); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--accent); transition: width 0.5s linear; }
  .q { margin: 0; font-size: 19px; font-weight: 700; line-height: 1.5; }
  .ok { margin: 0; color: var(--ok); font-weight: 800; font-size: 18px; }
  .ng { margin: 0; color: var(--bad); font-weight: 800; font-size: 18px; }
  .h1 { padding: 10px 12px; border-radius: var(--r); background: var(--surface-2); }
  .h1 b { color: var(--accent); } .h1 p { margin: 4px 0 0; font-size: 16px; }
  .small { font-size: 13px; margin: 0; }
</style>
