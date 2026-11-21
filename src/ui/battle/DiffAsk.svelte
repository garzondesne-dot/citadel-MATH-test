<script lang="ts">
  import type { Store } from '../../model/types';
  import { DIFF, rateDiff } from '../../school/feedback';
  import { sfx } from '../sound.svelte';
  // 📊 #98 몬스터를 쓰러뜨린 뒤 「쉬움 · 알맞음 · 어려움」 한 번 (넘어가도 됨) — 고르거나 넘기면 이 몬스터엔 다시 안 뜸(이 기기 기억)
  //   trial = 체험판(저장 안 함) · 저장 = diff/{차시}/{몬스터}/{학생}
  const { S, lid, mon, pid, trial = false }: { S: Store; lid: string; mon: string; pid: string; trial?: boolean } = $props();
  const key = $derived(`citadel-v1-diff-${lid}-${mon}`);
  let gone = $state(false), thanks = $state('');
  $effect(() => { try { gone = !!localStorage.getItem(key); } catch { gone = false; } thanks = ''; });
  const mark = () => { try { localStorage.setItem(key, '1'); } catch { /* 사생활 창 */ } };
  async function pick(v: 1 | 2 | 3) {
    sfx('click', 0.4); mark(); thanks = trial ? '체험판에서는 저장 안 돼요' : '고마워요! 문제를 고칠 때 써요';
    if (!trial) try { await rateDiff(S, lid, mon, pid, v); } catch { /* 끊김 = 그냥 넘어감 */ }
    setTimeout(() => (gone = true), 1400);
  }
  function skip() { mark(); gone = true; }
</script>

{#if !gone}
  <div class="da" data-k="diff-ask" role="group" aria-label="이 문제 난이도">
    {#if thanks}<p class="ty">📊 {thanks}</p>
    {:else}
      <span class="q">📊 이 몬스터 문제 어땠어요?</span>
      <div class="row">
        {#each DIFF as d (d.v)}<button type="button" data-k="diff-{d.v}" onclick={() => pick(d.v)}>{d.t}</button>{/each}
        <button type="button" class="skip" data-k="diff-skip" onclick={skip}>넘어가기</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .da { margin: 8px 16px 0; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); display: flex; flex-direction: column; gap: 8px; }
  .q { color: var(--text-2); font: 600 14px var(--font); }
  .row { display: flex; gap: 6px; flex-wrap: wrap; }
  .row button { flex: 1; min-width: 64px; min-height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .row button:active { transform: translateY(2px); box-shadow: none; }
  .row .skip { flex: 0 0 auto; background: none; box-shadow: none; color: var(--text-3); border-color: transparent; }
  .ty { margin: 0; color: var(--ok); font-weight: 700; }
</style>
