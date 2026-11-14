<script lang="ts">
  import type { Store } from '../../model/types';
  import { isRtdb, videoSrc } from '../../school/video';
  // 🎬 영상 하나 (TV 🎬 · 교사 차시 준비 · 팩 미리 보기 같은 부품) — rtdb: 영상(zip 안 mp4)은 받아서 재생 · 받는 동안 한 줄
  const { S, url, autoplay = false, muted = false, k = '' }: { S: Store; url: string; autoplay?: boolean; muted?: boolean; k?: string } = $props();
  let src = $state<string | null>(null), done = $state(false);
  $effect(() => { const u = url; src = null; done = false; void videoSrc(S, u).then((x) => { if (u === url) { src = x; done = true; } }); });
</script>

{#if src}
  <!-- svelte-ignore a11y_media_has_caption -->
  <video {src} {autoplay} {muted} controls playsinline preload="metadata" data-k={k || undefined}></video>
{:else if done}<p class="vn" role="status">🎬 영상을 받지 못했어요 · 인터넷 · 교사 로그인을 확인해요</p>
{:else}<p class="vn" role="status">🎬 {isRtdb(url) ? '서버에서 영상 받는 중…' : '영상 여는 중…'}</p>{/if}

<style>
  video { display: block; width: 100%; max-height: 100%; background: #000; border-radius: 8px; }
  .vn { margin: 0; padding: 12px; color: var(--text-2); font: 600 14px var(--font); }
</style>
