<script lang="ts">
  import { untrack } from 'svelte';
  import { dungeonOf, monBody, spriteOf } from '../manifest';
  import { attack, preload as atkPreload } from '../fx/attack';
  import HeroSprite from './HeroSprite.svelte';
  import type { HPose } from '../manifest';
  // 🎬 스킬 미리보기 (📜 2026-11-14 선생님 「스킬 고를 때 스킬 이펙트 볼 수 있게 해 줘」): 내 용사 「⚔ 스킬」 탭 위 작은 장면
  //   용사(왼쪽) → 연습 몬스터(오른쪽) · 스킬 줄을 누를 때마다(n) 전투와 같은 공격 연출(attack · 돌진 · 탄 · 띠 그림 · 맞는 순간 겹) · 데미지 숫자 없음
  //   ▶ = 다시 보기 · 학생 · 교사 「나」 · TV 교사 캠프 같은 창 · 동작 줄이기 = 연출 쪽 규칙 그대로
  const { hero, enh = 0, fx, n = 0, name = '', sub = '' }: { hero: number; enh?: number; fx: string; n?: number; name?: string; sub?: string } = $props();
  const sp = spriteOf('new0:0'), MON = 88;
  const bb = monBody(sp.sheet.src, sp.row, sp.sheet.poses.idle, sp.sheet.cell);
  let stage = $state<HTMLDivElement | null>(null), heroBox = $state<HTMLSpanElement | null>(null), monEl = $state<HTMLElement | null>(null), busy = $state(false), k = $state(0), pz = $state<HPose>('idle');
  function play() {
    if (!stage || !heroBox || !monEl || busy) return; busy = true; atkPreload(hero, fx);
    void attack(stage, { heroBox, monBox: monEl, hero, fx, noDmg: true, rest: 'idle', pose: (p) => (pz = p) }).finally(() => { pz = 'idle'; setTimeout(() => (busy = false), 250); }); // 🎞 걷기 · 공격 줄 4칸 (전투와 같은 줄)
  }
  $effect(() => { void n; void fx; if (n > 0) untrack(play); });
</script>

<div class="skp" bind:this={stage} style:background-image="url({dungeonOf('02-deep-forest')})" data-k="skp">
  <span class="hb" bind:this={heroBox}><HeroSprite id={hero} aura={enh} scale={1.5} pose={pz} /></span>
  <i class="mon art monster" bind:this={monEl} data-bb={bb} style="background-image:url({sp.url});background-size:{sp.sheet.cols * MON}px {sp.sheet.rows * MON}px;background-position:-{sp.sheet.poses.idle * MON}px -{sp.row * MON}px;width:{MON}px;height:{MON}px"></i>
  <div class="cap">{#if name}<b>{name}</b>{#if sub}<small>{sub}</small>{/if}{:else}<small>스킬을 누르면 이펙트가 나와요</small>{/if}</div>
  <button type="button" class="again" aria-label="이펙트 다시 보기" disabled={busy || !n} onclick={() => { k++; play(); }}>▶</button>
</div>

<style>
  .skp { position: relative; flex: none; height: 132px; border-radius: 12px; overflow: hidden; background-size: cover; background-position: center 62%; image-rendering: pixelated; }
  .skp::after { content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(8, 10, 14, 0) 40%, rgba(8, 10, 14, 0.55)); pointer-events: none; }
  .hb { position: absolute; left: 18px; bottom: 26px; z-index: 1; display: block; }
  .mon { position: absolute; right: 22px; bottom: 22px; z-index: 1; display: block; image-rendering: pixelated; background-repeat: no-repeat; }
  .cap { position: absolute; left: 10px; top: 8px; z-index: 2; display: flex; flex-direction: column; color: #fff; text-shadow: 0 1px 2px #000; }
  .cap b { font-size: 15px; } .cap small { font-size: 12.5px; opacity: 0.9; }
  .again { position: absolute; right: 8px; top: 8px; z-index: 2; width: 40px; height: 40px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.35); background: rgba(8, 10, 14, 0.55); color: #fff; font-size: 15px; }
  .again:disabled { opacity: 0.4; }
</style>
