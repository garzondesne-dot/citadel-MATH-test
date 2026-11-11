<script lang="ts">
  // ♥ 도전 기회 = 공격 단추 안 하트 (2-1절): 남은 = 꽉 찬 빨강 · 쓴 = 테두리 · 반 칸(소레이드 졸개 오답 ½) = 반쪽
  const { total, left }: { total: number; left: number } = $props();
  const uid = $props.id();
  const cells = $derived(Array.from({ length: Math.max(0, Math.ceil(total)) }, (_, i) => Math.max(0, Math.min(1, left - i))));
</script>

<span class="bh" role="img" aria-label="도전 기회 {left}번 남음">
  {#each cells as f, i (i)}
    <svg width="18" height="16" viewBox="0 0 14 13" aria-hidden="true">
      <defs><clipPath id="{uid}-{i}"><rect x="0" y="0" width={14 * f} height="13" /></clipPath></defs>
      <path d="M7 12 1.5 6.8A3.2 3.2 0 0 1 7 2.6a3.2 3.2 0 0 1 5.5 4.2Z" fill="none" stroke="#7a1a14" stroke-width="1.3" />
      {#if f > 0}<path d="M7 12 1.5 6.8A3.2 3.2 0 0 1 7 2.6a3.2 3.2 0 0 1 5.5 4.2Z" fill="#d6332b" stroke="#7a1a14" stroke-width="1.3" clip-path="url(#{uid}-{i})" />{/if}
    </svg>
  {/each}
</span>

<style>
  .bh { display: inline-flex; gap: 1px; padding: 4px 6px; border-radius: 10px; background: rgba(255, 255, 255, 0.35); }
</style>
