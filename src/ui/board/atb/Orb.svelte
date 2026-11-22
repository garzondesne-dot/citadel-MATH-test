<script lang="ts">
  // ⚡ 📜 #125 충전 = 번개 구슬 한 그림 (icons-v1 9 찬 구슬 · 10 반짝 = 막 참 · 11 빈 구슬) · 반 칸 = 빈 구슬 위에 찬 구슬 왼쪽 반
  //   아래 충전 칸 · 문제 카드 머리 · 스킬 메뉴 비용 · 변신 단추 비용 · 정찰 · 용사 고르기 = 모두 이 그림 (⚡ 이모지 · 맨 원 안 씀)
  import AtbIcon from './AtbIcon.svelte';
  const { st = 'full', size = 18 }: { st?: 'full' | 'half' | 'empty' | 'new'; size?: number } = $props();
</script>

<i class="orb {st}" style:width="{size}px" style:height="{size}px" data-k="orb" data-st={st} aria-hidden="true">
  {#if st === 'half'}<AtbIcon name="zap-empty" {size} /><i class="hf"><AtbIcon name="zap" {size} /></i>
  {:else}<AtbIcon name={st === 'full' ? 'zap' : st === 'new' ? 'zap-gold' : 'zap-empty'} {size} />{/if}
</i>

<style>
  .orb { position: relative; display: inline-block; flex: none; vertical-align: middle; font-style: normal; line-height: 0; }
  .orb .hf { position: absolute; inset: 0; clip-path: inset(0 50% 0 0); font-style: normal; }
  .orb.new { animation: orbnew 0.7s ease-out; }
  @keyframes orbnew { 0% { transform: scale(1.5); filter: brightness(1.6); } 100% { transform: none; filter: none; } }
  @media (prefers-reduced-motion: reduce) { .orb.new { animation: none; } }
</style>
