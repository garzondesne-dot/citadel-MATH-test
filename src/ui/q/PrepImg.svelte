<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { prepImg } from '../../school/prep';
  // 📄 학습지 칸 그림 (#158): 서버의 칸 그림을 크게 · 누르면 화면 가득 · 그림이 없을 때만 글자(children)
  //   TV 📄 문제 창 · 📖 개념 2분할 · 학생 「📘 이 문제의 개념」 모두 이 하나
  const { S, L, id, alt = '', children, big = true }: { S: Store; L: LessonPack; id: string; alt?: string; children?: Snippet; big?: boolean } = $props();
  let src = $state<string | null>(null), done = $state(false), full = $state(false);
  $effect(() => { const k = id; src = null; done = false; void prepImg(S, L, k).then((x) => { if (k === id) { src = x; done = true; } }); });
</script>

{#if src}
  <button type="button" class="pi" class:big onclick={(e) => { e.stopPropagation(); full = true; }} aria-label="{alt} 크게 보기"><img {src} alt={alt} /></button>
  {#if full}<button type="button" class="full" onclick={(e) => { e.stopPropagation(); full = false; }} aria-label="닫기"><img {src} alt={alt} /></button>{/if}
{:else if done || !children}
  {@render children?.()}
{:else}
  <span class="ld" aria-hidden="true"></span>{@render children?.()}
{/if}

<style>
  .pi { display: block; width: 100%; padding: 0; border: 0; background: #fff; border-radius: 8px; overflow: hidden; cursor: zoom-in; }
  .pi img { display: block; width: 100%; height: auto; }
  .pi.big img { max-height: 100%; object-fit: contain; }
  .full { position: fixed; inset: 0; z-index: 60; border: 0; padding: 2vh 2vw; background: rgba(5, 6, 10, 0.92); display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
  .full img { max-width: 100%; max-height: 100%; object-fit: contain; background: #fff; border-radius: 8px; }
  .ld { display: none; }
</style>
