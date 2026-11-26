<script lang="ts">
  import type { LessonPack, Room, Store } from '../../model/types';
  import { chargeOf, useCharge } from '../../raid/actions';
  // ⚡ 충전된 진필살기 (📜 v0.9 #26 C 되살림 · 🐞 11/26): 서술형 📸 을 통과했는데 몬스터가 이미 쓰러졌을 때 쌓인 것 → 지금 몬스터에 🌟 진필살기(석화 · 파티 힐)
  const { S, L, R, code, uid }: { S: Store; L: LessonPack; R: Room; code: string; uid: string } = $props();
  const n = $derived(chargeOf(R, uid));
  let msg = $state('');
  function go() { const e = useCharge(S, L, code, uid); msg = e ?? '🌟 진필살기 발동! 몬스터가 돌로 굳어요'; setTimeout(() => (msg = ''), 3000); }
</script>

{#if n > 0}
  <div class="chg" data-k="charge">
    <button type="button" class="b" data-k="charge-use" onclick={go}>⚡ 충전된 진필살기 쓰기 <small>{n}</small></button>
    {#if msg}<p class="m" role="status">{msg}</p>{/if}
  </div>
{/if}

<style>
  .chg { display: grid; gap: 6px; margin: 8px 0; }
  .b { min-height: 48px; border-radius: 12px; border: 2px solid #f5b84a; background: linear-gradient(180deg, #4a3510, #2a1d08); color: #ffd25a; font: 800 15px var(--font); box-shadow: 0 3px 0 #1a1204; }
  .b small { margin-left: 6px; padding: 0 8px; border-radius: 999px; background: #ffd25a; color: #2a1d08; font-size: 13px; }
  .m { margin: 0; font: 700 14px var(--font); color: var(--accent); text-align: center; }
</style>
