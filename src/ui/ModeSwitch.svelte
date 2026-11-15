<script lang="ts" module>
  // 창 상태 = 단추 밖 (학습지 ↔ 게임으로 바뀌면 머리줄이 바뀌어 단추가 다시 그려져도 창은 그대로) · 창은 살아 있는 단추 중 하나만 그림
  const ui = $state<{ open: boolean; owner: number }>({ open: false, owner: 0 });
  const live: number[] = [];
  let seq = 0;
  /** 창을 body 로 옮김 (단추가 숨은 머리줄 안에 있어도 보이게) */
  function portal(node: HTMLElement) { document.body.appendChild(node); return { destroy() { node.remove(); } }; }
</script>

<script lang="ts">
  // 🎨 테마 단추 (📜 2026-11-15 DECISIONS f196aae · 옛 「게임 | 제출」 스위치 자리 그대로 · 전투 · 소레이드 · 캠프 어디서나)
  //   누르면 🎨 테마 창(아래 시트) = 게임 테마 전부 + 「학습지」(= 제출 모드 v2 · 이름만 바꿈) · 누르면 바로 바뀜 · 화면 조각은 그대로(진행 · 입력 · 스크롤 유지)
  //   학습지 테마에서는 단추 글자 「테마」(이모지 없음) · 학생 테마 = 이 기기 + 서버 accounts(로그인한 학생) · 모드 기록 · 심리 대책 그대로(setSubmit)
  import { onDestroy, untrack } from 'svelte';
  import { paperOn, setSubmit } from './submit.svelte';
  import Sheet from './battle/Sheet.svelte';
  import ThemePicker from './ThemePicker.svelte';
  import { featsOf, savedTheme, setTheme, type Theme } from '../theme/theme';
  import { meBound } from '../store/meSync';
  import { feat } from '../school/features.svelte';
  const { dark = false }: { dark?: boolean } = $props();
  const me = ++seq; live.push(me);
  onDestroy(() => { live.splice(live.indexOf(me), 1); if (ui.owner === me) ui.owner = live[live.length - 1] ?? 0; }); // 창 주인이 사라지면(머리줄이 바뀜) 남은 단추가 이어 그림
  const host = $derived(ui.owner === me);
  let now = $state<Theme>(untrack(() => savedTheme()));
  const feats = $derived.by(() => { void ui.open; const b = meBound(); return featsOf(b ? b.S.get(`records/${b.cls}/${b.num}`) : null, b ? b.S.get(`cards/${b.cls}/${b.num}`) : null); });
  function pick(t: Theme) { now = t; setSubmit(false); setTheme(t); const b = meBound(); if (b) b.S.set(`accounts/${b.cls}/${b.num}/theme`, t); }
</script>

<button type="button" class="tb" class:dark data-k="themebtn" aria-label="테마" onclick={() => { now = savedTheme(); ui.owner = me; ui.open = true; }}>{paperOn() ? '테마' : '🎨'}</button>
{#if ui.open && host}
  <div use:portal class="thport"><Sheet onclose={() => (ui.open = false)} mainText="닫기">
    {#snippet title()}{paperOn() ? '테마' : '🎨 테마'}{/snippet}
    <div data-k="theme-sheet"><ThemePicker {now} feats={feat('theme') ? feats : null} basic={!feat('theme')} onpick={pick} paper sub /></div>
  </Sheet></div>
{/if}

<style>
  .tb { flex: none; min-width: 44px; min-height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.45); background: rgba(0, 0, 0, 0.35); color: #fff; font: 700 15px var(--font); cursor: pointer; }
  .tb.dark { border-color: #b9b7ae; background: #fff; color: #1d1d1f; }
  .tb:active { transform: translateY(1px); }
</style>
