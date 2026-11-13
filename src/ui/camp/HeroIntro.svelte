<script lang="ts">
  import { heroOf, ladder, skillName, TN, famOfHero } from '../../model/hero';
  import { portraitOf } from '../manifest';
  import HeroSprite from './HeroSprite.svelte';
  // 🧙 용사 소개 카드 (🔨 2026-11-13 밤 선생님 「용사 몽타주 하나도 사용 안 되었어 · 용사 소개란」 · 정식 camp.js mh-sheet 꼴)
  //   몽타주(초상) · 이름 · 직업 · 🗡 근접 / 🏹 원거리 · 속성 · 「별명」 · 한 줄 이야기 · 스킬 단계 줄(Ⅰ → Ⅳ) · 잠김 = 몽타주 흐림 + 열림 조건 한 줄
  //   쓰는 곳 = 내 용사 「용사 바꾸기」(학생 · 교사 「나」 · TV 교사 캠프 같은 창) · 몽타주가 없는 용사 = 게임 속 모습
  const { id, owned = true, lv = 0, stage = 0 }: { id: number; owned?: boolean; lv?: number; stage?: number } = $props();
  const h = $derived(heroOf(id)), pt = $derived(portraitOf(id)), fam = $derived(famOfHero(id));
  const cond = $derived(owned ? '' : h.price != null ? `💎 ${h.price} 으로 열어요` : h.cond ? `🔓 ${h.cond}` : '🔓 조건으로 열어요');
</script>

<div class="hi" class:lock={!owned} data-hero={id}>
  <div class="port" class:dim={!owned}>
    {#if pt}<i class="pimg" style="background-image:url({pt.url});background-size:{pt.cols * 100}% {pt.rows * 100}%;background-position:{(pt.c[0] / Math.max(1, pt.cols - 1)) * 100}% {(pt.c[1] / Math.max(1, pt.rows - 1)) * 100}%" role="img" aria-label="{h.name} 몽타주"></i>{:else}<HeroSprite {id} dim={!owned} />{/if}
    {#if owned && lv}<b class="lv">+{lv}</b>{/if}
    {#if !owned}<b class="lk" aria-hidden="true">🔒</b>{/if}
  </div>
  <div class="tx">
    <b class="nm">{h.name}</b>
    <small class="sub">{h.job} · {h.ranged ? '🏹 원거리' : '🗡 근접'} · {fam.name}{owned && stage ? ` · 스킬 ${TN[stage - 1]}` : ''}</small>
    <em class="nick">「{h.nick}」</em>
    <p class="story">{h.a}</p>
    <p class="lad" aria-label="스킬 단계">{#each ladder(id) as k, i (k)}<span class:on={owned && i < stage}>{TN[i]} {skillName(k)}</span>{#if i < 3}<i>→</i>{/if}{/each}</p>
    {#if cond}<p class="cond">{cond}</p>{/if}
  </div>
</div>

<style>
  .hi { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: var(--s3); align-items: start; padding: 10px; border-radius: 14px; background: var(--surface-2); }
  .port { position: relative; width: 112px; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: radial-gradient(circle at 50% 35%, #2b3350, #12141b 75%); display: grid; place-items: center; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
  .pimg { position: absolute; inset: 0; background-repeat: no-repeat; image-rendering: pixelated; }
  .port.dim .pimg { filter: grayscale(0.85) brightness(0.45); }
  .lv { position: absolute; right: 4px; bottom: 4px; height: 22px; padding: 0 7px; border-radius: 11px; background: var(--accent); color: var(--on-accent); font-size: 13px; display: grid; place-items: center; }
  .lk { position: absolute; font-size: 28px; filter: drop-shadow(0 2px 2px #000); }
  .tx { display: flex; flex-direction: column; gap: 3px; min-width: 0; text-align: left; }
  .nm { font-size: 19px; }
  .sub { font-size: 13px; color: var(--text-2); }
  .nick { font-style: normal; font-size: 14px; font-weight: 700; color: var(--accent); }
  .story, .lad, .cond { padding: 0; text-indent: 0; }
  .story { margin: 0; font-size: 13px; color: var(--text-2); line-height: 1.45; }
  .lad { margin: 2px 0 0; display: flex; flex-wrap: wrap; gap: 2px 4px; font-size: 12px; color: var(--text-3); }
  .lad span.on { color: var(--text); font-weight: 700; } .lad i { font-style: normal; color: var(--text-3); }
  .cond { margin: 2px 0 0; font-size: 13px; font-weight: 700; color: var(--accent); }
  @media (min-width: 600px) { .hi { grid-template-columns: 160px minmax(0, 1fr); } .port { width: 160px; } }
</style>
