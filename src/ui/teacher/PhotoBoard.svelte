<script lang="ts">
  // 📷 서술형 결과 (정식 photo.js board 그대로 · 대시보드 「서술형」 아래): AI 채점 결과 (성적 아님) · 확인할 것 = ⏳ 확신 낮음 · 🙋 이의 신청
  //   ✔ 처치 인정 = 그 학생이 다음에 들어올 때 처치(소레이드 = 🌟 · 성채 = 방 처치) · ✖ 그대로 = 다시 풀기 · 사진은 저장되지 않아 글자만
  import type { Store } from '../../model/types';
  import { roster } from '../../school/school';
  import { allRows, codeRubrics, needs, usage, type PhotoRow } from '../../school/photo';
  import { liveValue } from '../room.svelte';
  import { onDestroy, untrack } from 'svelte';
  const { S, cls = '' }: { S: Store; /** 비우면 모든 반 */ cls?: string } = $props();
  const lv = untrack(() => liveValue(S, 'photo')); onDestroy(lv.stop);
  let filt = $state<'need' | 'all'>('need'), ver = $state(0), toast = $state('');
  const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
  const rows = $derived.by(() => { void lv.v.val; void ver; return allRows(S).filter((x) => !cls || x.c === ck(cls)); });
  const shown = $derived(rows.filter((x) => (filt === 'need' ? needs(x) : true)));
  const U = $derived.by(() => { void ver; return usage(S); });
  const tin = $derived(rows.reduce((a, x) => a + (x.tok?.in || 0), 0)), tout = $derived(rows.reduce((a, x) => a + (x.tok?.out || 0), 0)), won = $derived(Math.round(((tin * 0.1 + tout * 0.5) / 1e6) * 1400));
  const nm = (x: PhotoRow) => roster(x.c, S).find((p) => p.num === x.n)?.name ?? '';
  const roomT = (k: string) => { const i = k.indexOf('_'), l = k.slice(0, i), r = k.slice(i + 1), y = S.get<{ title?: string }>(`photo_rubric/${l}/${r}`) ?? codeRubrics()[l]?.[r]; return `${l.replace('eval-', '평가')} ${y?.title ?? r}`; };
  const when = (t?: number) => { const d = new Date(Number(t) + 9 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  const ST: Record<string, string> = { pass: '✅ 통과', retry: '✏ 재도전', check: '⏳ 확인 필요' };
  async function mark(x: PhotoRow, ok: boolean) {
    const p = `photo/${x.c}/${x.n}/${x.k}/${x.id}`, v = { ok, okAt: S.now() };
    const good = S.trySet ? (await S.trySet(`${p}/ok`, ok)) && (await S.trySet(`${p}/okAt`, v.okAt)) : (S.set(`${p}/ok`, ok), S.set(`${p}/okAt`, v.okAt), true);
    ver++; toast = good ? (ok ? '✔ 처치로 인정했어요' : '✖ 그대로 두었어요') : '저장하지 못했어요 — 교사 로그인을 확인해 주세요'; setTimeout(() => (toast = ''), 1800);
  }
</script>

<div class="pb" data-k="photo-board">
  {#if U.today || U.month || U.warn}<p class="use" class:warn={U.warn}>{#if U.warn}<b>⚠ 사용량 경고</b> {U.why} — 학생 하루 장 수를 줄이거나 잠깐 꺼 둘 수 있어요<br />{/if}📈 오늘 학교 전체 <b>{U.today}</b>장 · 이번 달 <b>{U.month}</b>장 ≈ <b>{U.won.toLocaleString()}</b>원</p>{/if}
  <p class="muted">AI 채점 결과 (성적 아님) · ⏳ 확인 필요 = 확신 낮음 · 사진 속 지시 · 다른 문제 등 · 🙋 = 학생 이의 신청 · 사진은 저장되지 않아 글자만 보여요</p>
  <div class="tabs" role="tablist">
    <button type="button" role="tab" class:on={filt === 'need'} aria-selected={filt === 'need'} data-pf="need" onclick={() => (filt = 'need')}>확인할 것 {rows.filter(needs).length}</button>
    <button type="button" role="tab" class:on={filt === 'all'} aria-selected={filt === 'all'} data-pf="all" onclick={() => (filt = 'all')}>전체 {rows.length}</button>
  </div>
  <p class="muted sm">통과 {rows.filter((x) => x.status === 'pass').length} · 재도전 {rows.filter((x) => x.status === 'retry').length} · 토큰 {tin.toLocaleString()} / {tout.toLocaleString()} ≈ {won.toLocaleString()}원</p>
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
  {#each shown as x (`${x.c}|${x.n}|${x.k}|${x.id}`)}
    <div class="it" class:new={needs(x)} data-photo={x.id}>
      <p class="meta"><b>{ST[x.status] ?? x.status}{x.ok === true ? ' → ✔ 인정' : x.ok === false ? ' → ✖ 그대로' : ''}</b> · {x.c}반 {x.n}번 {nm(x)} · {roomT(x.k)} · <b>{x.score} / {x.total}</b> (통과 {x.pass}) · 확신 {x.conf || ''} · {when(x.at)}{x.flags.length ? ` · 🚩 ${x.flags.join(', ')}` : ''}</p>
      <p class="tx">📝 {x.ask || ''}<br />정답 {x.right || ''} · AI 가 읽은 답 {x.ans || '-'}<br />단계 {x.steps.map((s) => `${s.id} ${s.earned}/${s.pts}${s.note ? ` (${s.note})` : ''}`).join(' · ')}<br />💬 {x.fb || ''}{#if x.appeal}<br /><b>🙋 이의 신청:</b> {x.appeal.t || ''}{/if}</p>
      {#if x.ok == null}<div class="row"><button type="button" class="pri" data-ok="1" onclick={() => mark(x, true)}>✔ 처치 인정</button><button type="button" data-ok="0" onclick={() => mark(x, false)}>✖ 그대로 (다시 풀기)</button></div>{/if}
    </div>
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
  .it { padding: var(--s3); border-radius: var(--r); background: var(--surface); display: flex; flex-direction: column; gap: 6px; border-left: 3px solid transparent; }
  .it.new { border-left-color: var(--bad); }
  .meta { font-size: 14px; }
  .tx { font-size: 14px; color: var(--text-2); }
  .row { display: flex; gap: var(--s2); }
  .row button { flex: 1; min-height: var(--tap); border-radius: 12px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .row .pri { background: var(--accent); color: var(--on-accent, #1a1400); border-color: var(--accent); }
  .toast { color: var(--ok); font-weight: 700; font-size: 14px; }
</style>
