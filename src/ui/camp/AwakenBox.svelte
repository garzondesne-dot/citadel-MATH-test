<script lang="ts">
  import { awkId, heroOf } from '../../model/hero';
  import HeroSprite from './HeroSprite.svelte';
  // ⚡ 용사 카드 안 각성 칸 (📜 2026-11-20 선생님 · 메타인지 8 🔨 #83) — 조건 4칸 ✔ / ✕ · 다 맞기 전엔 실루엣 · 이 판에서 못 얻는 칭호 = 「이 판에서는 각성 없음」
  //   쓰는 곳 = 내 용사 「용사 바꾸기」 고른 용사 소개 카드 바로 아래 (옛 「???」 각성한 로안 칸을 로안 카드 안으로 옮김)
  const { hero, checks, blocked = false, prog = '' }: { hero: number; checks: { k: string; t: string; ok: boolean }[]; blocked?: boolean; /** 칭호 기록 진행 「👑 용기 3 / 7」 */ prog?: string } = $props();
  const all = $derived(!blocked && checks.every((c) => c.ok));
  const n = $derived(checks.filter((c) => c.ok).length);
</script>

<section class="awk" class:all class:off={blocked} data-k="awaken-box" data-hero={hero} aria-label="⚡ 각성 · 조건 {n} / {checks.length}">
  <span class="pic" class:sil={!all} aria-hidden="true"><HeroSprite id={awkId(hero)} play={all} /></span>
  <div class="tx">
    <b class="t">⚡ 각성 <span class:gold={all}>{all ? heroOf(awkId(hero)).name : '???'}</span> <small>{blocked ? '' : `${n} / ${checks.length}`}</small></b>
    {#if blocked}
      <p class="off" data-k="awaken-off">이 판에서는 각성 없음 <small>(칭호를 얻는 ⚒ 모루가 꺼져 있어요)</small></p>
    {:else}
      <ul>{#each checks as c (c.k)}<li class:ok={c.ok}>{c.ok ? '✔' : '✕'} {c.t}{#if c.k === 'title' && !c.ok && prog}<small> · {prog}</small>{/if}</li>{/each}</ul>
      <p class="note">{all ? '각성 모습 · 필살기 연출이 바뀌어요' : '모두 맞으면 각성 · 모습 · 필살기 연출만 바뀌어요'}</p>
    {/if}
  </div>
</section>

<style>
  .awk { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: var(--s3); align-items: center; margin-top: var(--s2); padding: 10px; border-radius: 14px; background: var(--surface-2); border: 1px dashed var(--text-3); }
  .awk.all { border: 1px solid var(--accent); box-shadow: 0 0 0 1px rgba(245, 184, 74, 0.25), 0 0 18px rgba(245, 184, 74, 0.18); }
  .awk.off { opacity: 0.75; }
  .pic { width: 72px; height: 64px; display: grid; place-items: center; overflow: visible; }
  .pic.sil { filter: brightness(0) drop-shadow(0 0 2px rgba(255, 255, 255, 0.35)); opacity: 0.7; }
  .tx { min-width: 0; display: flex; flex-direction: column; gap: 4px; text-align: left; }
  .t { font-size: 15px; } .t small { color: var(--text-3); font-weight: 600; margin-left: 4px; }
  .gold { color: var(--accent); text-shadow: 0 0 8px rgba(245, 184, 74, 0.45); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font-size: 14px; color: var(--bad); }
  li.ok { color: var(--ok); } li small { color: var(--text-3); }
  .note, p.off { margin: 0; font-size: 13px; color: var(--text-2); } p.off small { color: var(--text-3); }
</style>
