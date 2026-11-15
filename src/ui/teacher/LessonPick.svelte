<script lang="ts">
  import Sheet from '../battle/Sheet.svelte';
  import { upTag, UPLOADED, packOf } from '../../engine/packs';
  import type { Store } from '../../model/types';
  import { estimate, estLine, cutLine, ltimePath, packTier, timeSig } from '../../school/ltime';
  import { feat, type FeatId } from '../../school/features.svelte';
  // 📚 차시 고르기 시트 (📜 2026-11-14 선생님 「목록이 좌르르 나와서 고르기 불편」): 맨 위 「최근」 3칸 · 아래 번호 격자(한 줄 4칸 · 56) · 누르면 바로 고르고 닫힘
  type Opt = { id: string; no: number; title: string; ready: boolean };
  const { S = null, opts, pick, recent, onpick, onclose }: { S?: Store | null; opts: Opt[]; pick: string; recent: string[]; onpick: (id: string) => void; onclose: () => void } = $props();
  // 📦 기본 팩 / 풀 팩 꼬리표 · ⏱ 이 차시 예상 (📜 2026-11-16 · 「차시 고르기」에도 같은 줄 · ⚙ 우리 학교 기능과 같은 셈)
  const on = (id: string) => feat(id as FeatId);
  const tier = (o: Opt) => (o.ready ? packTier(packOf(o.id)) : null);
  const est = $derived.by(() => { const L = packOf(pick); if (!L) return null; return estimate(L, on, S?.get<Record<string, number>>(ltimePath(L.id, timeSig(on))) ?? null); });
  const rec = $derived(recent.map((id) => opts.find((o) => o.id === id)).filter((o): o is Opt => !!o));
  const sub = (o: Opt) => (o.ready ? o.title.split(' · ')[0] : '준비 안 됨');
  const tag = (o: Opt) => (UPLOADED.has(o.id) ? (upTag(o.id, o.no) ? `📦 ${o.id}` : '📦') : '');
</script>

<Sheet {onclose}>
  {#snippet title()}📚 차시 고르기{/snippet}
  <div class="lp" data-k="lpick">
    {#if est}<p class="est" class:over={est.over} data-k="lp-est">⏱ {estLine(est)}{#if est.over}<br /><small>⚠ 50분을 넘어요{cutLine(est) ? ` · ${cutLine(est)}` : ''} · 「나」 → ⚙ 우리 학교 기능</small>{/if}</p>{/if}
    {#if rec.length}<p class="lab">최근</p>
      <div class="rec" data-k="lp-rec">{#each rec as o (o.id)}<button type="button" class="c r" class:on={o.id === pick} data-id={o.id} onclick={() => onpick(o.id)}><b>{o.no}</b><small>{sub(o)}</small>{#if tag(o)}<i>{tag(o)}</i>{/if}{#if tier(o) === 'full'}<u class="full" data-k="lp-full">풀 팩</u>{/if}{#if o.id === pick}<em>✓</em>{/if}</button>{/each}</div>{/if}
    <p class="lab">차시</p>
    <div class="grid" data-k="lp-grid">{#each opts as o (o.id)}<button type="button" class="c" class:on={o.id === pick} class:off={!o.ready} data-id={o.id} aria-label="{o.no}차시 {o.title}{tag(o) ? ` ${tag(o)}` : ''}" onclick={() => onpick(o.id)}><b>{o.no}</b><small>{sub(o)}</small>{#if tag(o)}<i>{tag(o)}</i>{/if}{#if tier(o) === 'full'}<u class="full" data-k="lp-full">풀 팩</u>{/if}{#if o.id === pick}<em>✓</em>{/if}</button>{/each}</div>
  </div>
</Sheet>

<style>
  .lp { display: flex; flex-direction: column; gap: 8px; max-height: min(62vh, 520px); overflow-y: auto; }
  .lab { margin: 0; font: 700 13px var(--font); color: var(--text-2); }
  .rec, .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .rec { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .c { position: relative; min-height: 56px; padding: 4px 6px; border-radius: var(--r-sm); border: 1.5px solid var(--line); background: var(--surface-2); color: var(--text); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; box-shadow: 0 3px 0 var(--surface); min-width: 0; }
  .c:active { transform: translateY(2px); box-shadow: none; }
  .c b { font: 800 20px/1.1 var(--font); font-variant-numeric: tabular-nums; }
  .c small { max-width: 100%; font-size: 13px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c i { position: absolute; top: 2px; left: 4px; font: 700 12px var(--font); font-style: normal; color: var(--text-3); max-width: calc(100% - 20px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .c em { position: absolute; top: 2px; right: 5px; font-style: normal; font-weight: 800; color: var(--accent); font-size: 13px; }
  .c.on { border-color: var(--accent); }
  .c u.full { position: absolute; bottom: 2px; right: 4px; text-decoration: none; font: 700 11px var(--font); color: var(--accent); }
  .est { margin: 0; padding: 8px 10px; border-radius: var(--r-sm); background: var(--surface-2); font: 700 14px var(--font); } .est small { font-weight: 500; font-size: 13px; }
  .est.over { color: var(--bad); border: 1.5px solid var(--bad); }
  .c.off { border-style: dashed; opacity: 0.75; }
</style>
