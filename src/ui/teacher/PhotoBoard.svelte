<script lang="ts">
  // 📷 서술형 결과 (정식 photo.js board 그대로 · 대시보드 「서술형」 아래): AI 채점 결과 (성적 아님) · 확인할 것 = ⏳ 확신 낮음 · 🙋 이의 신청
  //   보기만 (📜 2026-11-15 머리 🔨): ✔ 처치 인정 / ✖ 그대로 = 소식 탭 📷 · 학생 시트 (PhotoCheck 같은 부품) · 사진은 저장되지 않아 글자만
  import type { Store } from '../../model/types';
  import { roster } from '../../school/school';
  import { allRows, needs, usage } from '../../school/photo';
  import PhotoCheck from './PhotoCheck.svelte';
  import { liveValue } from '../room.svelte';
  import { onDestroy, untrack } from 'svelte';
  const { S, cls = '' }: { S: Store; /** 비우면 모든 반 */ cls?: string } = $props();
  const lv = untrack(() => liveValue(S, 'photo')); onDestroy(lv.stop);
  let filt = $state<'need' | 'all'>('need');
  const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
  const rows = $derived.by(() => { void lv.v.val; return allRows(S).filter((x) => !cls || x.c === ck(cls)); });
  const shown = $derived(rows.filter((x) => (filt === 'need' ? needs(x) : true)));
  const U = $derived.by(() => { void lv.v.val; return usage(S); });
  const tin = $derived(rows.reduce((a, x) => a + (x.tok?.in || 0), 0)), tout = $derived(rows.reduce((a, x) => a + (x.tok?.out || 0), 0)), won = $derived(Math.round(((tin * 0.1 + tout * 0.5) / 1e6) * 1400));
</script>

<div class="pb" data-k="photo-board">
  {#if U.today || U.month || U.warn}<p class="use" class:warn={U.warn}>{#if U.warn}<b>⚠ 사용량 경고</b> {U.why} — 학생 하루 장 수를 줄이거나 잠깐 꺼 둘 수 있어요<br />{/if}📈 오늘 학교 전체 <b>{U.today}</b>장 · 이번 달 <b>{U.month}</b>장 ≈ <b>{U.won.toLocaleString()}</b>원</p>{/if}
  <p class="muted">AI 채점 결과 (성적 아님) · ⏳ 확인 필요 = 확신 낮음 · 사진 속 지시 · 다른 문제 등 · 🙋 = 학생 이의 신청 · 사진은 저장되지 않아 글자만 보여요</p>
  <div class="tabs" role="tablist">
    <button type="button" role="tab" class:on={filt === 'need'} aria-selected={filt === 'need'} data-pf="need" onclick={() => (filt = 'need')}>확인할 것 {rows.filter(needs).length}</button>
    <button type="button" role="tab" class:on={filt === 'all'} aria-selected={filt === 'all'} data-pf="all" onclick={() => (filt = 'all')}>전체 {rows.length}</button>
  </div>
  <p class="muted sm">통과 {rows.filter((x) => x.status === 'pass').length} · 재도전 {rows.filter((x) => x.status === 'retry').length} · 토큰 {tin.toLocaleString()} / {tout.toLocaleString()} ≈ {won.toLocaleString()}원</p>
  <p class="muted sm" data-k="photo-where">✔ 처치 인정 · ✖ 그대로 = 🔔 소식 탭 「📷 사진」 · 학생 시트에서 해요 (여기는 보기만)</p>
  {#each shown as x (`${x.c}|${x.n}|${x.k}|${x.id}`)}
    <PhotoCheck {S} {x} readonly />
  {:else}
    <p class="muted">확인할 것이 없어요.</p>
  {/each}
</div>

<style>
  .pb { display: flex; flex-direction: column; gap: var(--s2); }
  .pb p { margin: 0; overflow-wrap: anywhere; line-height: 1.5; }
  .muted { color: var(--text-2); font-size: 14px; }
  .sm { font-size: 13px; }
  .use { padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface-2); font-size: 14px; }
  .use.warn { box-shadow: inset 0 0 0 2px var(--bad); }
  .tabs { display: flex; gap: var(--s2); }
  .tabs button { min-height: 40px; padding: 0 14px; border-radius: 20px; border: 1px solid var(--line, #2f3440); background: none; color: var(--text-2); font: 700 14px var(--font); }
  .tabs button.on { background: var(--accent); color: var(--on-accent, #1a1400); border-color: var(--accent); }
</style>
