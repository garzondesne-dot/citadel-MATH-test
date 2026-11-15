<script lang="ts">
  // 💡 도움 3단 시트 (📜 2026-11-15 · school/help.ts): 단계 표시 ①②③ · 1단 개념 한 줄 → 2단 빈칸 하나 남긴 첫 줄(있을 때) → 3단 비슷한 예제 + 풀이
  //   무료(칼 · 힐 · 보상 안 씀) · 연 단계만 기록 · 주 단추 「학습지에 써 보고 돌아가기」 · 마지막 단계 뒤 「✋ 손들어 선생님께」
  import type { Help, Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import SymText from './SymText.svelte';
  import { noteHelp, raiseHand } from '../../school/help';
  const { S, code, uid, mid, i, help, hand = false, onclose }: { S: Store; code: string; uid: string; mid: string; i: number; help: Help; /** 이미 손든 상태 */ hand?: boolean; onclose: () => void } = $props();
  const steps = $derived([{ k: 1, t: '개념', has: true }, { k: 2, t: '첫 줄', has: !!help.first }, { k: 3, t: '예제', has: !!help.example }].filter((x) => x.has));
  let at = $state(0), raised = $state(false);
  const cur = $derived(steps[at]!);
  $effect(() => { const k = cur.k; noteHelp(S, code, uid, mid, i, k); });
  const last = $derived(at >= steps.length - 1);
</script>

<Sheet {onclose} mainText="✍ 학습지에 써 보고 돌아가기" onmain={onclose} tall>
  {#snippet title()}💡 도움 {at + 1} / {steps.length}{/snippet}
  <div class="help" data-k="help" data-stage={cur.k}>
    <ol class="dots" aria-label="도움 단계">{#each steps as s, k (s.k)}<li class:on={k <= at} class:now={k === at}><b>{k + 1}</b><small>{s.t}</small></li>{/each}</ol>
    {#if cur.k === 1}
      <p class="lab">📘 이 문제에 쓰는 개념</p>
      <p class="big"><SymText text={help.concept} /></p>
    {:else if cur.k === 2}
      <p class="lab">✏ 풀이 첫 줄 · 빈칸 하나만 채워 봐요</p>
      <p class="big line"><SymText text={typeof help.first === 'string' ? help.first : ''} /></p>
    {:else if help.example}
      <p class="lab">📝 비슷한 예제</p>
      <p class="ex"><SymText text={help.example.q} /></p>
      <p class="lab">풀이</p>
      {#if Array.isArray(help.example.sol)}<ol class="sol">{#each help.example.sol as ln, k (k)}<li><SymText text={ln} /></li>{/each}</ol>{:else}<p class="sol"><SymText text={help.example.sol} /></p>{/if}
    {/if}
    {#if !last}<button type="button" class="next" data-k="help-next" onclick={() => (at += 1)}>💡 다음 도움 ({at + 2}단 · {steps[at + 1]?.t})</button>
    {:else if hand || raised}<p class="raised" role="status">✋ 손을 들었어요 · 선생님이 곧 와요</p>
    {:else}<button type="button" class="next hand" data-k="help-hand" onclick={() => { raiseHand(S, code, uid, mid); raised = true; }}>✋ 손들어 선생님께</button>{/if}
    <p class="muted small">도움은 무료예요 · 칼 · 보상은 그대로</p>
  </div>
</Sheet>

<style>
  .help { display: flex; flex-direction: column; gap: var(--s3); }
  .dots { display: flex; gap: var(--s2); margin: 0; padding: 0; list-style: none; }
  .dots li { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; border-radius: var(--r-sm); background: var(--surface-2); color: var(--text-3); }
  .dots li b { font-size: 16px; } .dots li small { font-size: 12px; }
  .dots li.on { color: var(--text); } .dots li.now { background: color-mix(in srgb, var(--accent) 24%, var(--surface-2)); box-shadow: inset 0 0 0 2px var(--accent); }
  .lab { margin: 0; font-weight: 800; color: var(--accent); }
  .big { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.5; }
  .line { padding: 10px 12px; border-radius: var(--r); background: var(--surface-2); border: 2px dashed var(--line); }
  .ex, .sol { margin: 0; font-size: 17px; line-height: 1.6; }
  ol.sol { margin: 0; padding: 10px 12px 10px 30px; display: flex; flex-direction: column; gap: 4px; }
  .sol { padding: 10px 12px; border-radius: var(--r); background: var(--surface-2); }
  .next { min-height: var(--tap); border-radius: var(--r); border: 2px solid var(--accent); background: var(--surface-2); color: var(--text); font: 800 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .next.hand { border-color: var(--bad); }
  .raised { margin: 0; padding: 10px; border-radius: var(--r); background: color-mix(in srgb, var(--bad) 16%, var(--surface-2)); font-weight: 700; text-align: center; }
  .small { font-size: 13px; margin: 0; }
</style>
