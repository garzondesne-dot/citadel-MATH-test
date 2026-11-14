<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { prepImg } from '../../school/prep';
  // 📄 학습지 칸 그림 (#158): 서버의 칸 그림을 크게 · 누르면 화면 가득 · 그림이 없을 때만 글자(children)
  //   TV 📄 문제 창 · 📖 개념 2분할 · 학생 「📘 이 문제의 개념」 모두 이 하나
  const { S, L, id, alt = '', children, big = true, zoom = true }: { S: Store; L: LessonPack; id: string; alt?: string; children?: Snippet; big?: boolean; /** 누르면 화면 가득(검은 바탕) — TV 카드는 false (카드가 커짐 · 🐞 2026-11-14 「좌우 전부 · 하얀 배경」) */ zoom?: boolean } = $props();
  let src = $state<string | null>(null), done = $state(false), full = $state(false);
  // 📺 TV 카드(fill) = 그림 전체를 칸 안에 맞춤(비율 유지 · 가운데) · 그림이 폭의 2.2배 넘게 길고 칸 높이의 2배를 넘을 때만 폭 가득 + 스크롤 + 「⬇ 더 보기」 (🐞 2026-11-15 「누르면 사진이 너무 커져 위쪽만 보임」)
  let box = $state<HTMLDivElement | null>(null), tall = $state(false), nat = $state<[number, number] | null>(null), more = $state(true);
  const fit = () => { const b = box; if (!b || !nat) return; const [w, h] = nat; tall = h / w > 2.2 && (h / w) * b.clientWidth > 2 * b.clientHeight; }; // 그림 자체가 폭의 2.2배 넘게 길고 · 폭에 맞추면 칸 높이 2배를 넘을 때만 스크롤 (크게 보기 = 넓은 칸이어도 보통 칸은 전체)
  $effect(() => { const b = box; if (!b || typeof ResizeObserver === 'undefined') return; const ro = new ResizeObserver(fit); ro.observe(b); return () => ro.disconnect(); });
  $effect(() => { const k = id; src = null; done = false; void prepImg(S, L, k).then((x) => { if (k === id) { src = x; done = true; } }); });
</script>

{#if src && !zoom}
  <div class="pi fill" class:tall bind:this={box} data-k="pi-fill" data-tall={tall} onscroll={(e) => { const x = e.currentTarget; more = x.scrollTop + x.clientHeight < x.scrollHeight - 4; }}><img {src} alt={alt} onload={(e) => { const im = e.currentTarget as HTMLImageElement; nat = [im.naturalWidth || 1, im.naturalHeight || 1]; fit(); }} />{#if tall && more}<span class="more" aria-hidden="true">⬇ 더 보기</span>{/if}</div>
{:else if src}
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
  .pi.fill { position: relative; background: #fff; border-radius: 8px; height: 100%; display: flex; align-items: center; justify-content: center; } /* TV 카드 = 칸 안에 그림 전체(가운데) · 흰 바탕 */
  .pi.fill img { width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain; }
  .pi.fill.tall { display: block; overflow-y: auto; scrollbar-width: thin; } .pi.fill.tall img { width: 100%; max-height: none; }
  .pi.fill .more { position: sticky; bottom: 0; display: block; width: 100%; padding: 1.2cqh 0; text-align: center; font-weight: 800; color: #7a4a10; background: linear-gradient(transparent, #fff 55%); pointer-events: none; }
  .pi.big img { max-height: 100%; object-fit: contain; }
  .full { position: fixed; inset: 0; z-index: 60; border: 0; padding: 2vh 2vw; background: rgba(5, 6, 10, 0.92); display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
  .full img { max-width: 100%; max-height: 100%; object-fit: contain; background: #fff; border-radius: 8px; }
  .ld { display: none; }
</style>
