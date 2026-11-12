<script lang="ts">
  import { segments } from '../../engine/symtalk';
  import { openSym, symState } from '../battle/symsheet.svelte';
  // 📖 문제 글 + 기호 톡 (2-1절): 기호 = 금빛 형광펜 · 본 기호 = 회색 · 누르는 칸은 기호 둘레로 넓힘 · 답 칸(칩 · 보기) 안에는 붙이지 않음
  //   글 흐름을 깨지 않게 글자 그대로의 span (role=button · 키보드 Enter/Space)
  import { richParts } from '../../engine/venn';
  import Venn from './Venn.svelte';
  const { text, on = true }: { text: string; on?: boolean } = $props();
  // 🟣 [[venn:이름|원소]] = 그림 (#132 · 정식 DS.UI.rich) · 나머지 글 = 기호 톡
  const parts = $derived(richParts(text).map((p) => ('venn' in p ? p : { segs: on ? segments(p.text) : [{ text: p.text }] })));
  const key = (e: KeyboardEvent, id: string) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSym(id); } };
</script>

{#each parts as p, j (j)}{#if 'venn' in p}<span class="vq"><Venn venn={p.venn} /></span>{:else}{#each p.segs as s, k (k)}{#if 'id' in s && s.id}{@const id = s.id}<span role="button" tabindex="0" class="sy" class:seen={!!symState.seen[id]} aria-label="{s.text} 뜻 보기" onclick={() => openSym(id)} onkeydown={(e) => key(e, id)}>{s.text}</span>{:else}{s.text}{/if}{/each}{/if}{/each}

<style>
  .vq { display: block; margin: var(--s2) 0; }
  .sy { position: relative; cursor: pointer; border-radius: 3px; padding: 0 1px;
    background: linear-gradient(transparent 55%, rgba(245, 184, 74, 0.45) 55%, rgba(245, 184, 74, 0.45) 95%, transparent 95%); }
  .sy::before { content: ''; position: absolute; left: -8px; right: -8px; top: -12px; bottom: -12px; }
  .sy.seen { background: linear-gradient(transparent 60%, rgba(140, 150, 170, 0.35) 60%, rgba(140, 150, 170, 0.35) 92%, transparent 92%); }
</style>
