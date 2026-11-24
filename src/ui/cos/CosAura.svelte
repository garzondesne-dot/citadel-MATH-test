<script lang="ts">
  // 🔆 발밑 빛 (📜 2026-11-25 옷장 1차): 용사 발밑 동그란 빛 — 용사를 감싼 칸(position: relative) 안 맨 아래에 둠 · 빛이 없으면 아무것도 안 그림
  const { color = '' }: { color?: string } = $props();
</script>

{#if color}<i class="ca" style:--c={color} aria-hidden="true" data-k="cos-aura"></i>{/if}

<style>
  .ca { position: absolute; left: 50%; bottom: -2%; width: 92%; aspect-ratio: 3 / 1; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(ellipse at center, var(--c) 0%, color-mix(in srgb, var(--c) 45%, transparent) 38%, transparent 70%); opacity: 0.85; pointer-events: none; z-index: 0; animation: pulse 2.2s ease-in-out infinite; mix-blend-mode: screen; }
  @keyframes pulse { 0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(0.92); } 50% { opacity: 0.95; transform: translateX(-50%) scale(1.04); } }
  @media (prefers-reduced-motion: reduce) { .ca { animation: none; } }
</style>
