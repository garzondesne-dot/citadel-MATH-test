<script lang="ts">
  // 🏆 쉼터 놀이 결과 시상대 (🎨 11/24 mg-o-podium 코덱스 그림 · 머리 🔨) — 1 · 2 · 3등 = 기둥 위에 용사 + 이름 · 점수 · 4등부터 = 아래 작은 줄
  //   그림 = 1156×782 를 1/4 로 줄인 도트(289×196) · 기둥 윗면 가운데 = x 0.18 · 0.50 · 0.82 / y 0.23 · 0.09 · 0.36 (그림 비율)
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { artUrl, PODIUM_ART } from '../manifest';
  type Row = { u: string; rank: number; name: string; pts: string; hero: number };
  const { rows }: { rows: Row[] } = $props();
  const SPOT = [{ x: 0.5, y: 0.09 }, { x: 0.18, y: 0.23 }, { x: 0.82, y: 0.36 }] as const; // 1 · 2 · 3등 자리
  const top = $derived(rows.filter((r) => r.rank <= 3).slice(0, 6));
  const rest = $derived(rows.filter((r) => r.rank > 3));
  // 같은 등수가 여럿이면 같은 기둥 위에 나란히
  const at = $derived(top.map((r) => { const same = top.filter((x) => x.rank === r.rank), k = same.indexOf(r); return { ...r, s: SPOT[Math.min(2, r.rank - 1)]!, dx: (k - (same.length - 1) / 2) * 9 }; }));
</script>

<div class="pod" data-k="podium">
  <div class="stage">
    <img class="art" src={artUrl(PODIUM_ART)} alt="" />
    {#each at as r (r.u)}
      <div class="who r{r.rank}" style:left="calc({r.s.x * 100}% + {r.dx}cqw)" style:top="{r.s.y * 100}%">
        <span class="hs"><HeroSprite id={r.hero} scale={r.rank === 1 ? 1.1 : 0.9} tv /></span>
        <b>{r.name}</b><em>{r.pts}</em>
      </div>
    {/each}
  </div>
  {#if rest.length}<ol class="rest">{#each rest as r (r.u)}<li><b>{r.rank}등</b> {r.name} · {r.pts}</li>{/each}</ol>{/if}
</div>

<style>
  .pod { margin: auto; display: grid; justify-items: center; gap: 1.6cqh; }
  .stage { position: relative; width: min(56cqw, 92cqh); aspect-ratio: 289 / 196; margin-top: 16cqh; }
  .art { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
  .who { position: absolute; transform: translate(-50%, -100%); display: grid; justify-items: center; gap: 0.2cqh; white-space: nowrap; text-shadow: 0 0.3cqh 0.6cqh #000; }
  .who b { font: 900 3.6cqh var(--font); color: #fff; padding: 0 1cqh; border-radius: 1cqh; background: rgba(0, 0, 0, 0.55); }
  .who em { font: 800 3cqh var(--font); font-style: normal; color: var(--accent); }
  .who.r1 b { font-size: 4.2cqh; color: #ffd34d; }
  .hs { display: block; }
  .rest { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6cqh 2.4cqw; font: 800 3.2cqh var(--font); } .rest b { color: var(--accent); }
</style>
