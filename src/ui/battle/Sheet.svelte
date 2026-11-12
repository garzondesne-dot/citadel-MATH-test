<script lang="ts">
  import type { Snippet } from 'svelte';
  import BottomAction from './BottomAction.svelte';
  // Sheet (3절 · 2-1절 「알림 · 팝업 = 모두 아래 시트」): 위 손잡이 · 바깥 누르면 닫힘 · 아래 주요 단추 1 (act 를 주면 그 단추 줄로 바꿈)
  //   학생 시트 주요 단추 = BottomAction(#151 · 폰 바닥에서 20 · 56) — onmain 이 없으면 「닫기」 · act = 교사 시트만(그 화면 단추 줄)
  const { title, children, onclose, mainText = '닫기', onmain, mainDisabled = false, why = '', act, tall = false }:
    { title: Snippet; children: Snippet; onclose: () => void; mainText?: string; onmain?: () => void; mainDisabled?: boolean; why?: string; act?: Snippet; tall?: boolean } = $props();
</script>

<div class="bg" role="presentation" onclick={onclose}></div>
<div class="sheet" class:tall role="dialog" aria-modal="true">
  <div class="grab"><i></i></div>
  <div class="bar"><div class="t">{@render title()}</div><button type="button" class="x" aria-label="닫기" onclick={onclose}>✕</button></div>
  <div class="body">{@render children()}</div>
  {#if act}<div class="act">{@render act()}</div>{:else}<BottomAction dock={false} text={mainText} disabled={mainDisabled} {why} onmain={onmain ?? onclose} mainLabel={mainText} />{/if}
</div>

<style>
  .bg { position: fixed; inset: 0; z-index: 20; background: rgba(0, 0, 0, 0.6); }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 21; max-width: 430px; margin: 0 auto; border-radius: var(--r-lg) var(--r-lg) 0 0; background: var(--surface); display: flex; flex-direction: column; max-height: 80vh; }
  .sheet.tall { height: 88vh; max-height: 88vh; }
  .act :global(.row) { display: flex; gap: var(--s2); }
  .act :global(.btn2) { min-height: var(--btn-h); min-width: 92px; padding: 0 var(--s3); border-radius: 14px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .act :global(.btn:disabled) { opacity: 0.4; box-shadow: none; }
  .grab { height: 18px; display: grid; place-items: center; }
  .grab i { width: 40px; height: 4px; border-radius: 2px; background: var(--line); display: block; }
  .bar { min-height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s4); }
  .t { flex: 1; min-width: 0; font-size: var(--fs-title); font-weight: 700; }
  .x { width: var(--tap); height: var(--tap); border: 0; background: none; color: var(--text-2); font-size: 18px; }
  .body { padding: 0 var(--s4); overflow: auto; display: flex; flex-direction: column; gap: var(--s3); }
  .act { padding: var(--s3) var(--s4) calc(var(--s4) + env(safe-area-inset-bottom, 0px)); }
  .act :global(.btn) { flex: 1; width: 100%; min-height: var(--btn-h); border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 var(--btn-fs) var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .act :global(.btn:active:not(:disabled)) { transform: translateY(2px); box-shadow: none; }
</style>
