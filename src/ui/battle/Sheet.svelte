<script lang="ts">
  import type { Snippet } from 'svelte';
  // Sheet (3절 · 2-1절 「알림 · 팝업 = 모두 아래 시트」): 위 손잡이 · 바깥 누르면 닫힘 · 아래 주요 단추 1
  const { title, children, onclose, mainText = '닫기' }: { title: Snippet; children: Snippet; onclose: () => void; mainText?: string } = $props();
</script>

<div class="bg" role="presentation" onclick={onclose}></div>
<div class="sheet" role="dialog" aria-modal="true">
  <div class="grab"><i></i></div>
  <div class="bar"><div class="t">{@render title()}</div><button type="button" class="x" aria-label="닫기" onclick={onclose}>✕</button></div>
  <div class="body">{@render children()}</div>
  <div class="act"><button type="button" class="btn" onclick={onclose}>{mainText}</button></div>
</div>

<style>
  .bg { position: fixed; inset: 0; z-index: 20; background: rgba(0, 0, 0, 0.6); }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 21; max-width: 430px; margin: 0 auto; border-radius: var(--r-lg) var(--r-lg) 0 0; background: var(--surface); display: flex; flex-direction: column; max-height: 80vh; }
  .grab { height: 18px; display: grid; place-items: center; }
  .grab i { width: 40px; height: 4px; border-radius: 2px; background: var(--line); display: block; }
  .bar { min-height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s4); }
  .t { flex: 1; min-width: 0; font-size: var(--fs-title); font-weight: 700; }
  .x { width: var(--tap); height: var(--tap); border: 0; background: none; color: var(--text-2); font-size: 18px; }
  .body { padding: 0 var(--s4); overflow: auto; display: flex; flex-direction: column; gap: var(--s3); }
  .act { padding: var(--s3) var(--s4) calc(var(--s4) + env(safe-area-inset-bottom, 0px)); }
  .btn { width: 100%; min-height: 52px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 17px var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .btn:active { transform: translateY(2px); box-shadow: none; }
</style>
