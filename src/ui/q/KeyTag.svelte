<script lang="ts">
  import type { LessonPack, Room } from '../../model/types';
  import { hasKey, keyFor, keyRoom } from '../../school/keys';
  // 🔑 소문제 위 꼬리표 (📜 #59): 열쇠 있음 = 「🔑 이름」(금빛) · 없음 = 「🔒 이름」(회색 · 누르면 한 줄) · 열쇠 없는 칸 = 안 보임
  const { L, R, uid, at, n }: { L: LessonPack; R: Room; uid: string; at: string; n: number } = $props();
  const k = $derived(keyRoom(R) ? keyFor(L, at, n) : null);
  const have = $derived(!!k && hasKey(R, uid, k.id));
  let tip = $state(false);
</script>

{#if k}
  <button type="button" class="ktag" class:have data-k="key-tag" data-have={have ? '1' : '0'} onclick={() => (tip = !tip)}>{have ? '🔑' : '🔒'} {k.name}{#if tip}<small>{have ? ' · 첫 번에 맞히면 🎁 보물상자' : ' · 이 문제는 🔑 열쇠 내용이에요'}</small>{/if}</button>
{/if}

<style>
  .ktag { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px; margin: 0 0 4px; border-radius: 14px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text-3); font: 700 13px var(--font); }
  .ktag.have { color: #2a1d05; background: var(--accent); border-color: var(--accent); }
  .ktag small { font: 500 12px var(--font); }
</style>
