<script lang="ts">
  import { setSubmit, submit } from './submit.svelte';
  // 📝 위 막대 글자 스위치 「게임 | 제출」 (어느 학생 화면에서나 · 이 기기 기억 · 진행 그대로 · 2026-11-14 제출 모드 v2)
  const { dark = false }: { dark?: boolean } = $props();
</script>

<span class="ms" class:dark role="group" aria-label="게임 · 제출 모드" data-k="modesw">
  <button type="button" class:on={!submit.on} aria-pressed={!submit.on} onclick={() => setSubmit(false)}>게임</button>
  <button type="button" class:on={submit.on} aria-pressed={submit.on} onclick={() => setSubmit(true)}>제출</button>
</span>

<style>
  .ms { display: inline-flex; flex: none; border: 1px solid rgba(255, 255, 255, 0.45); border-radius: 8px; overflow: hidden; background: rgba(0, 0, 0, 0.35); }
  .ms button { min-width: 44px; min-height: 30px; padding: 0 10px; border: 0; background: transparent; color: #fff; font: 700 13px var(--font); cursor: pointer; }
  .ms button.on { background: #fff; color: #111; }
  .ms.dark { border-color: #b9b7ae; background: #fff; }
  .ms.dark button { color: #555; } .ms.dark button.on { background: #1d1d1f; color: #fff; }
</style>
