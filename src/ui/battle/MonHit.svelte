<script lang="ts">
  import { onMount } from 'svelte';
  import { MHIT, MHIT_FLIP, MHIT_NOGROW, mhitUrl, type MhitKind } from '../manifest';
  // 👹 몬스터 공격 효과 (📜 2026-11-24 「표 그대로 진행」 · manifest mhitOf) — 6칸 0.48초 한 번 · 맞는 용사 몸 가운데 · 끝나면 사라짐 · 누르기 막지 않음
  //   크기 = 용사 칸 높이 × 0.8 (보스 1.5배 · 번개 · 광선은 키우지 않음) · 날아가는 5종 = 좌우 반전(몬스터 → 용사 쪽)
  //   최대 칸(3번째 · 160ms) = 맞는 용사 하얗게 번쩍 + 살짝 흔들림 (용사 그림 = 부모 안 .hero.art · .spr · .art 를 찾음 · 없으면 효과만)
  const { kind, size, x = 0, y = 0, boss = false, z = 9, left = true, target }: {
    kind: MhitKind; /** 맞는 용사 칸 높이 px */ size: number; /** 가운데 자리 px (부모 기준) */ x?: number | string; y?: number | string; boss?: boolean; /** 겹 순서 (TV DOM 용사 z = 발 y) */ z?: number;
    /** 용사가 몬스터 왼쪽에 있음 (기본) · 오른쪽이면 반전하지 않음 */ left?: boolean; /** 번쩍일 용사 그림 (안 주면 부모 안에서 찾음 · null = 번쩍 없음) */ target?: HTMLElement | null;
  } = $props();
  const s = $derived(Math.round(size * MHIT.size * (boss && !MHIT_NOGROW.has(kind) ? MHIT.boss : 1)));
  const flip = $derived(MHIT_FLIP.has(kind) === left);
  let el = $state<HTMLElement>();
  onMount(() => {
    const p = el?.parentElement;
    const t = target === undefined ? p?.querySelector<HTMLElement>('.hero.art, .spr, .art') : target;
    if (!t?.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const o = { delay: MHIT.peak, duration: 200, easing: 'ease-out' } as const;
    const a = t.animate([{ filter: 'brightness(0) invert(1)' }, { filter: 'brightness(0) invert(1)', offset: 0.35 }, { filter: 'none' }], o);
    const b = t.animate([{ translate: '0 0' }, { translate: '3px 0' }, { translate: '-3px 0' }, { translate: '2px 0' }, { translate: '0 0' }], { ...o, duration: 240 });
    return () => { a.cancel(); b.cancel(); };
  });
</script>

<i class="mhit" bind:this={el} class:flip data-k="mhit" data-kind={kind} aria-hidden="true"
  style:left={typeof x === 'number' ? `${x}px` : x} style:top={typeof y === 'number' ? `${y}px` : y} style:width="{s}px" style:height="{s}px"
  style:z-index={z} style:background-image="url({mhitUrl(kind)})" style:--ms="{MHIT.ms}ms"></i>

<style>
  .mhit { position: absolute; transform: translate(-50%, -50%); pointer-events: none; background-repeat: no-repeat; background-size: 600% 100%; background-position: 0 0; image-rendering: pixelated; animation: mhit-run var(--ms) steps(6, jump-none) forwards; }
  .mhit.flip { transform: translate(-50%, -50%) scaleX(-1); }
  @keyframes mhit-run { from { background-position-x: 0%; } to { background-position-x: 100%; } }
</style>
