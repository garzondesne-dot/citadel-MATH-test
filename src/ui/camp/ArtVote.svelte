<script lang="ts">
  import type { Store } from '../../model/types';
  import { artVote } from '../../school/feedback';
  import { sfx } from '../sound.svelte';
  // 🎨 #98 그림마다 👍 · 🔁 바꿈 (스킬 도감 「바꿈」과 같은 뜻 = 이 그림을 새로 그려 주면 좋겠다) · 한 사람 한 표(다시 누르면 취소)
  //   trial = 체험판(저장 안 함 · 눌러 볼 수만)
  const { S, pid, k, trial = false }: { S: Store; pid: string; k: string; trial?: boolean } = $props();
  let mine = $state(0), up = $state(0), swap = $state(0), note = $state('');
  async function load(key: string) {
    const v = (S.fetch ? await S.fetch<Record<string, number>>(`artvote/${key}`).catch(() => null) : S.get<Record<string, number>>(`artvote/${key}`)) || {};
    if (key !== k) return;
    const xs = Object.values(v); up = xs.filter((x) => x === 1).length; swap = xs.filter((x) => x === -1).length; mine = Number(v[pid]) || 0;
  }
  $effect(() => { const key = k; mine = 0; up = 0; swap = 0; note = ''; void load(key); });
  async function set(v: 1 | -1) {
    const next = mine === v ? 0 : v; sfx('click', 0.4);
    if (mine === 1) up--; else if (mine === -1) swap--;
    if (next === 1) up++; else if (next === -1) swap++;
    mine = next;
    if (trial) { note = '체험판에서는 저장 안 돼요'; return; }
    try { await artVote(S, k, pid, next as 1 | -1 | 0); note = next === -1 ? '🔁 바꿔 달라고 적었어요 · 선생님이 봐요' : ''; } catch { note = '저장하지 못했어요'; }
  }
</script>

<div class="av" data-k="art-vote">
  <span class="q">🎨 이 그림</span>
  <button type="button" class:on={mine === 1} aria-pressed={mine === 1} data-k="art-up" onclick={() => set(1)}>👍 {up}</button>
  <button type="button" class:on={mine === -1} aria-pressed={mine === -1} data-k="art-swap" onclick={() => set(-1)}>🔁 바꿈 {swap}</button>
  {#if note}<small>{note}</small>{/if}
</div>

<style>
  .av { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .q { color: var(--text-2); font: 600 14px var(--font); }
  button { min-height: 44px; min-width: 64px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); }
  button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent, #1d1406); }
  small { flex-basis: 100%; color: var(--text-3); font-size: 13px; }
</style>
