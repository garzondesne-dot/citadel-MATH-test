<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import Vid from '../q/Vid.svelte';
  import { isRtdb } from '../../school/video';
  // 🎬 차시 준비 「영상 n편」 → 칸별 목록 · 누르면 재생 (📜 2026-11-14 · TV 🎬 와 같은 영상 · 같은 부품 Vid)
  const { S, L, onclose }: { S: Store; L: LessonPack; onclose: () => void } = $props();
  const V = untrack(() => L); // 열 때 차시 그대로
  const rows = V.steps.filter((s) => V.videos?.[s.id]).map((s) => ({ id: s.id, title: s.title.split(' · ')[0] || s.id, sub: s.title.split(' · ').slice(1).join(' · '), url: V.videos![s.id]! }));
  const extra = Object.keys(V.videos ?? {}).filter((c) => !V.steps.some((s) => s.id === c));
  const files = new Set(Object.values(V.videos ?? {}));
  const fname = (u: string) => (isRtdb(u) ? `${u.replace(/^.*\//, '')} (팩 zip)` : u.replace(/^.*\//, ''));
  let on = $state('');
</script>

<Sheet {onclose} tall mainText="닫기" onmain={onclose}>
  {#snippet title()}🎬 {L.no}차시 영상 {files.size}편 · 칸 {rows.length}{/snippet}
  <div class="vl" data-k="vidlist">
    {#if !rows.length}<p class="no">이 차시에는 연결된 영상이 없어요</p>{/if}
    {#each rows as r (r.id)}
      <button type="button" class="row" class:on={on === r.id} aria-expanded={on === r.id} onclick={() => (on = on === r.id ? '' : r.id)} data-cell={r.id}><span class="ic">{on === r.id ? '⏸' : '▶'}</span><span class="tx"><b>{r.title}</b><small>{r.sub ? `${r.sub} · ` : ''}{fname(r.url)}</small></span></button>
      {#if on === r.id}<div class="pl"><Vid {S} url={r.url} autoplay k="prepvid" /></div>{/if}
    {/each}
    {#if extra.length}<p class="no">⚠ 단계에 없는 칸: {extra.join(' · ')} (TV 🎬 에 안 나와요)</p>{/if}
  </div>
</Sheet>

<style>
  .vl { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); text-align: left; box-shadow: 0 3px 0 var(--surface-2); }
  .row.on { border-color: var(--accent); }
  .row:active { transform: translateY(2px); box-shadow: none; }
  .ic { width: 32px; font-size: 18px; text-align: center; }
  .tx { display: flex; flex-direction: column; min-width: 0; } .tx b { font-size: 15px; } .tx small { color: var(--text-2); font-size: 13px; overflow-wrap: anywhere; }
  .pl { border-radius: var(--r-sm); overflow: hidden; }
  .no { margin: 0; color: var(--text-2); font-size: 14px; }
</style>
