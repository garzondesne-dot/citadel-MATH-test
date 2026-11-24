<script lang="ts">
  import { onDestroy } from 'svelte';
  import { PET_BY, PET_COS_BY, PET_SLOT, petCosOf, stageOf, type Pet } from '../../model/pets';
  // 🐾 펫 그림 하나 (📜 2026-11-25 둥지): 시트 = 2칸(숨쉬기) × 3줄(알 · 새끼 · 다 큼) · 칸 128 · 0.7초마다 숨쉬기 · 다 큰 펫 = 꾸미기(머리 · 목)
  //   캠프 · 용사 카드 · 모닥불 친구 · 게시판 대기 · 종합실 대기 명단이 같은 부품 · 문제 · 레이드 · 전투 화면에는 쓰지 않음
  const { pet, size = 48, hop = 0, still = false }: { pet: Pick<Pet, 'kind' | 'food' | 'cos'>; size?: number; /** 바뀔 때마다 한 번 폴짝 */ hop?: number; still?: boolean } = $props();
  const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let f = $state(0); const t = still || RM ? null : setInterval(() => (f = 1 - f), 700); onDestroy(() => { if (t) clearInterval(t); });
  const st = $derived(stageOf(pet.food)), src = $derived(PET_BY[pet.kind]?.src ?? ''), slot = $derived(PET_SLOT[pet.kind]);
  const cos = $derived(st === 2 ? petCosOf(pet) : []);
</script>

<span class="pet" style:width="{size}px" style:height="{size}px" data-k="pet" data-kind={pet.kind} data-stage={st}>
  {#key hop}<i class="img" class:hop={hop > 0} style="background-image:url({src});background-position:{f * 100}% {st * 50}%" aria-hidden="true"></i>{/key}
  {#each cos as c (c)}{@const d = PET_COS_BY[c]}{#if d && slot}{@const at = d.slot === 'head' ? slot.head : slot.neck}<img class="pc" src={d.src} alt="" aria-hidden="true" style="left:{at[0]}%;top:{at[1]}%;width:{at[2]}%" data-k="pet-cos" />{/if}{/each}
</span>

<style>
  .pet { position: relative; display: inline-block; flex: none; }
  .img { position: absolute; inset: 0; background-size: 200% 300%; background-repeat: no-repeat; image-rendering: pixelated; }
  .img.hop { animation: hop 0.5s cubic-bezier(0.2, 1.4, 0.4, 1); }
  .pc { position: absolute; transform: translateX(-50%); image-rendering: pixelated; pointer-events: none; }
  @keyframes hop { 0% { transform: translateY(0); } 40% { transform: translateY(-28%); } 100% { transform: translateY(0); } }
</style>
