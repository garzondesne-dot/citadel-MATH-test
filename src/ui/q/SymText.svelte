<script lang="ts">
  import { feat } from '../../school/features.svelte';
  import { SUBJ } from '../../engine/subject';
  import { openSym, symState } from '../battle/symsheet.svelte';
  // 📖 문제 글 + 기호 톡 (2-1절): 기호 = 금빛 형광펜 · 본 기호 = 회색 · 누르는 칸은 기호 둘레로 넓힘 · 답 칸(칩 · 보기) 안에는 붙이지 않음
  //   글 흐름을 깨지 않게 글자 그대로의 span (role=button · 키보드 Enter/Space)
  const { text, on = true }: { text: string; on?: boolean } = $props();
  // 그림 조각 = 과목 팩 SUBJ.rich (#132 · #136) · 나머지 글 = 기호 톡(SUBJ.symtalk · 없으면 글 그대로)
  const F = SUBJ.rich?.Figure;
  const segOf = (t: string) => (on && SUBJ.symtalk && feat('symtalk') ? SUBJ.symtalk.segments(t) : [{ text: t }]);
  const parts = $derived((SUBJ.rich ? SUBJ.rich.parts(text) : [{ text }]).map((p) => ('fig' in p ? p : { segs: segOf(p.text) })));
  const CIRC = '①②③④⑤⑥⑦⑧⑨';
  const key = (e: KeyboardEvent, id: string) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSym(id); } };
</script>

{#each parts as p, j (j)}{#if 'fig' in p}{#if F}<span class="vq"><F fig={p.fig} /></span>{/if}{:else}{#each p.segs as s, k (k)}{#if 'id' in s && s.id}{@const id = s.id}<span role="button" tabindex="0" class="sy" class:seen={!!symState.seen[id]} aria-label="{s.text} 뜻 보기" onclick={() => openSym(id)} onkeydown={(e) => key(e, id)}>{s.text}</span>{:else}{@render circ(s.text)}{/if}{/each}{/if}{/each}

<!-- 🔢 ①~⑨ (소문제 번호 「(3) ①」) = 동그라미 + 굵은 숫자 배지 (글꼴의 ① 은 작게 그려져 TV · 폰에서 「⊙」처럼 보임 · 2026-11-14 머리 🐞) -->
{#snippet circ(t: string)}{#each t.split(/([①-⑨])/) as c, i (i)}{#if i % 2}<span class="cn" aria-label="{CIRC.indexOf(c) + 1}번">{CIRC.indexOf(c) + 1}</span>{:else}{c}{/if}{/each}{/snippet}

<style>
  .vq { display: block; margin: var(--s2) 0; }
  .cn { display: inline-flex; align-items: center; justify-content: center; width: 1.25em; height: 1.25em; margin: 0 0.12em; border: 0.11em solid currentColor; border-radius: 50%; font-size: 0.82em; font-weight: 800; line-height: 1; vertical-align: 0.06em; font-variant-numeric: tabular-nums; }
  /* #160 형광펜 = 기호 글자는 그대로 밝게 · 아래 ⅓ 만 옅게 + 금빛 밑줄 (기호를 덮지 않음 · 정식 #105 밑줄 꼴) · 글자 크기 · 굵기 = 문제 글 그대로 */
  .sy { position: relative; cursor: pointer; padding: 0 1px; font: inherit; color: inherit;
    background: linear-gradient(transparent 72%, rgba(245, 184, 74, 0.22) 72%); text-decoration: underline 2px rgba(245, 184, 74, 0.9); text-underline-offset: 4px; }
  .sy::before { content: ''; position: absolute; left: -8px; right: -8px; top: -12px; bottom: -12px; }
  .sy.seen { background: linear-gradient(transparent 72%, rgba(140, 150, 170, 0.18) 72%); text-decoration-color: rgba(140, 150, 170, 0.7); }
</style>
