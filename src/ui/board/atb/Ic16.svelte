<script lang="ts" module>
  /** 🎨 📜 #145 ui-ic16 (4 × 4 · 칸 128) — 1줄 🎯 💥 🌀 👹 / 2줄 ☠ 💤 💫 ❄ / 3줄 ⛓ 🌑 💢 🐌 / 4줄 🔥 🌫 🪞 ↩ */
  export const IC16 = ['single', 'aoe', 'special', 'rage', 'poison', 'sleep', 'stun', 'ice', 'bind', 'dark', 'daze', 'slow', 'burn', 'fog', 'mirror', 'reverse'] as const;
  export type Ic16Name = (typeof IC16)[number];
  /** 그림을 못 불러올 때 = 이모지 */
  export const IC16_EMO: Record<Ic16Name, string> = { single: '🎯', aoe: '💥', special: '🌀', rage: '👹', poison: '☠️', sleep: '💤', stun: '💫', ice: '❄️', bind: '⛓', dark: '🌑', daze: '💢', slow: '🐌', burn: '🔥', fog: '🌫', mirror: '🪞', reverse: '↩' };
  /** 보스 공격 종류 → 상태 아이콘 (같은 칸 합침: 혼란 = 💫 · 🧊 = ❄ · ♨ = 🔥) */
  export const ATK_IC16: Record<string, Ic16Name> = { poison: 'poison', sleep: 'sleep', confuse: 'stun', frost: 'ice', ice: 'ice', bind: 'bind', dark: 'dark', darkHit: 'dark', fog: 'fog', tongue: 'slow', fire: 'burn', fire13: 'burn', steam: 'burn', mirror: 'mirror', reverse: 'reverse' };
</script>

<script lang="ts">
  const { name, size = 24, label = '' }: { name: Ic16Name; size?: number; label?: string } = $props();
  const URL = `${import.meta.env.BASE_URL}art/board-atb/ui-ic16-v1.webp`;
  let ok = $state(true);
  const i = $derived(IC16.indexOf(name));
  $effect(() => { const im = new Image(); im.onerror = () => (ok = false); im.src = URL; });
</script>

{#if ok}<i class="ic16" data-k="ic16" data-ic={name} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'} style:width="{size}px" style:height="{size}px" style:background-image="url({URL})" style:background-position="{(i % 4) * 33.3333}% {Math.floor(i / 4) * 33.3333}%"></i>{:else}<i class="emo" style:font-size="{Math.round(size * 0.85)}px" aria-label={label || undefined}>{IC16_EMO[name]}</i>{/if}

<style>
  .ic16 { display: inline-block; flex: none; vertical-align: middle; background-repeat: no-repeat; background-size: 400% 400%; image-rendering: auto; font-style: normal; }
  .emo { font-style: normal; line-height: 1; }
</style>
