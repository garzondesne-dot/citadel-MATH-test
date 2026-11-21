<script lang="ts">
  import { MHIT, MHIT_LIGHT, mhitUrl, type MhitKind } from '../manifest';
  // 👹 몬스터 맞는 그림 (🔨 #26 · manifest mhitOf) — 6칸 0.42초 한 번 · 맞는 자리 위 · 끝나면 사라짐 · 누르기 막지 않음
  //   빛 그림(fire · ice · bolt · poison · beam) = 더하기 섞기(screen) · 작은 흔들림은 그림 자체(칸 사이 1px 떨림)
  const { kind, size, x = 0, y = 0, boss = false, z = 9 }: { kind: MhitKind; /** 한 변 px (보스 = 1.5배 곱하기 전) */ size: number; /** 가운데 자리 px (부모 기준) */ x?: number | string; y?: number | string; boss?: boolean; /** 겹 순서 (TV DOM 용사 z = 발 y) */ z?: number } = $props();
  const s = $derived(Math.round(size * (boss ? MHIT.boss : 1)));
</script>

<i class="mhit" class:light={MHIT_LIGHT.has(kind)} data-k="mhit" data-kind={kind} aria-hidden="true"
  style:left={typeof x === 'number' ? `${x}px` : x} style:top={typeof y === 'number' ? `${y}px` : y} style:width="{s}px" style:height="{s}px"
  style:z-index={z} style:background-image="url({mhitUrl(kind)})" style:--ms="{MHIT.ms}ms"></i>

<style>
  .mhit { position: absolute; transform: translate(-50%, -50%); pointer-events: none; background-repeat: no-repeat; background-size: 600% 100%; background-position: 0 0; image-rendering: auto; animation: mhit-run var(--ms) steps(6, jump-none) forwards, mhit-shake var(--ms) linear; }
  .mhit.light { mix-blend-mode: screen; }
  @keyframes mhit-run { from { background-position-x: 0%; } to { background-position-x: 100%; } }
  @keyframes mhit-shake { 0%, 100% { translate: 0 0; } 25% { translate: 3px -2px; } 50% { translate: -3px 2px; } 75% { translate: 2px 1px; } }
  @media (prefers-reduced-motion: reduce) { .mhit { animation: mhit-run var(--ms) steps(6, jump-none) forwards; } }
</style>
