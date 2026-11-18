<script lang="ts">
  import { questRight, type QPlay } from '../../school/quest';
  import { sfx } from '../sound.svelte';
  // ✏ #75 친구 문제 · 🏛 전당 문제 1:1 풀기 (아래 시트 안 · 객관식 = 번호 5 · 주관식 = 입력) · 틀리면 💡 힌트 → 다시 · 맞히면 풀이 단계
  const { q, mine = false, onsolved }: { q: QPlay; mine?: boolean; onsolved: () => void } = $props();
  let pick = $state(''), typed = $state(''), res = $state<'' | 'ok' | 'no'>(''), tries = $state(0);
  const NUMS = ['①', '②', '③', '④', '⑤'];
  function check() {
    const g = q.type === 'obj' ? pick : typed; if (!g.trim()) return;
    tries++; if (questRight(q, g)) { res = 'ok'; sfx('correct', 0.7); if (!mine) onsolved(); } else { res = 'no'; sfx('block', 0.5); }
  }
</script>

<div class="qp" data-k="quest-play">
  {#if q.monster}<p class="mon">👾 {q.monster}</p>{/if}
  <p class="pb">{q.problem}</p>
  {#if q.type === 'obj'}
    <div class="ch" role="radiogroup" aria-label="보기">{#each (q.choices || []).slice(0, 5) as c, i (i)}<button type="button" role="radio" aria-checked={pick === String(i + 1)} class:on={pick === String(i + 1)} disabled={res === 'ok'} onclick={() => { pick = String(i + 1); res = ''; }}><b>{NUMS[i]}</b> {c}</button>{/each}</div>
  {:else}
    <input class="in" type="text" maxlength="40" placeholder="답" aria-label="답" bind:value={typed} disabled={res === 'ok'} oninput={() => (res = '')} />
  {/if}
  {#if res === 'ok'}
    <p class="ok" role="status">⭕ 맞았어요!{mine ? ' (내 문제 · 보상 없음)' : ''}</p>
    {#if q.steps?.length}<ol class="st">{#each q.steps as s, i (i)}<li>{s}</li>{/each}</ol>{/if}
  {:else}
    {#if res === 'no'}<p class="no" role="alert">❌ 다시 생각해 봐요{q.hint ? ` · 💡 ${q.hint}` : ''}</p>{/if}
    <button type="button" class="go" data-k="quest-check" disabled={q.type === 'obj' ? !pick : !typed.trim()} onclick={check}>{tries ? '다시 확인' : '확인'}</button>
  {/if}
</div>

<style>
  .qp { display: flex; flex-direction: column; gap: 10px; }
  .mon { margin: 0; font: 700 13px var(--font); color: var(--text-2); }
  .pb { margin: 0; padding: 12px; border-radius: 12px; background: var(--surface-2); font: 600 16px/1.55 var(--font); white-space: pre-wrap; }
  .ch { display: flex; flex-direction: column; gap: 6px; }
  .ch button { min-height: 48px; text-align: left; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 600 15px var(--font); }
  .ch button.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, var(--surface)); }
  .in { min-height: 48px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 600 16px var(--font); }
  .go { min-height: 48px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 16px var(--font); box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 55%, #000); }
  .go:disabled { opacity: 0.45; box-shadow: none; }
  .ok { margin: 0; color: var(--ok); font: 800 16px var(--font); } .no { margin: 0; color: var(--bad); font: 700 14px var(--font); }
  .st { margin: 0; padding-left: 20px; font-size: 14px; color: var(--text-2); display: flex; flex-direction: column; gap: 4px; }
</style>
