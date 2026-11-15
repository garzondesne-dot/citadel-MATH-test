<script lang="ts">
  // 📷 사진 채점 설정 (정식 photo.js settings 그대로): 웹 앱 주소 · 켜기 · 장 수 · 쉬는 초 · 수업 소레이드 장 수 · 경고 기준 · 🔌 연결 확인 · 기준표 켜기 · 📤 기준표 올리기
  //   API 키는 Apps Script 스크립트 속성에만 (여기 넣지 않음) · 사진은 저장되지 않음 · 켠 방만 학생에게 열림
  import type { Store } from '../../model/types';
  import { cfgOf, codeRubrics, coolSec, daily, raidMax, roomMax, rubOf, usage, DAILY0, ROOM0, WARN_DAY0, WARN_MONTH0, type Rubric } from '../../school/photo';
  import { liveValue } from '../room.svelte';
  import { onDestroy, untrack } from 'svelte';
  const { S }: { S: Store } = $props();
  const lc = untrack(() => liveValue(S, 'gcfg/photo')), lr = untrack(() => liveValue(S, 'photo_rubric')); onDestroy(() => { lc.stop(); lr.stop(); });
  const c0 = untrack(() => cfgOf(S));
  let url = $state(c0.url || ''), on = $state(!!c0.on), dl = $state(daily(c0)), rm = $state(roomMax(c0)), cool = $state(coolSec(c0)), raid = $state(raidMax(c0)), wd = $state(Number(c0.warnDay) || WARN_DAY0), wm = $state(Number(c0.warnMonth) || WARN_MONTH0);
  let msg = $state(''), busy = $state(false), ask = $state(false);
  const say = (t: string) => { msg = t; setTimeout(() => (msg = ''), 3500); };
  const list = $derived.by(() => { void lr.v.val; const fb = rubOf(S); return Object.entries(codeRubrics()).flatMap(([l, rs]) => Object.entries(rs).map(([r, x]) => ({ l, r, x: x as Rubric, fb: fb[l]?.[r] }))); });
  const where = (l: string) => (l.startsWith('eval-') ? l.replace('eval-', '평가') : `⚔ ${l.replace('set-', '')}차시`);
  const up = $derived(list.filter((y) => y.fb).length);
  const U = $derived.by(() => { void lc.v.val; return usage(S); });
  const num = (v: number, lo: number, hi: number, d: number) => Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));
  const put = async (p: string, v: unknown) => (S.trySet ? S.trySet(p, v) : (S.set(p, v), Promise.resolve(true)));
  async function save() {
    const u = url.trim();
    if (u && !/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) { say('Apps Script 웹 앱 주소(https://script.google.com/…/exec)를 넣어 주세요.'); return; }
    if (on && !u) { say('주소를 먼저 넣어 주세요.'); return; }
    busy = true;
    const v = { url: u, on, daily: num(dl, 1, 20, DAILY0), room: num(rm, 1, 10, ROOM0), cool: Math.max(0, Math.min(600, Math.round(Number(cool) || 0))), raid: num(raid, 1, 5, 2), warnDay: num(wd, 10, 1000, WARN_DAY0), warnMonth: num(wm, 100, 50000, WARN_MONTH0) };
    const ok = await put('gcfg/photo', v); busy = false;
    say(!ok ? '저장하지 못했어요 — 교사 로그인을 확인해 주세요' : on ? '📷 켰어요 — 기준표를 켠 방이 학생에게 열려요' : '💾 저장했어요');
  }
  async function ping() {
    const u = url.trim(); if (!u) { say('주소를 먼저 넣어 주세요.'); return; }
    busy = true;
    try { const r = await (await fetch(u, { redirect: 'follow' })).json() as { alive?: boolean; on?: boolean }; say(r?.alive ? `✅ 연결됨 · 중계소 ${r.on ? '켜짐' : '꺼짐(ENABLED=0)'}` : '⚠ 응답이 이상해요'); }
    catch { say('❌ 연결 안 됨 — 웹 앱 배포(액세스: 모든 사용자)와 주소를 확인해 주세요'); }
    busy = false;
  }
  async function upload() {
    ask = false; busy = true; let bad = 0;
    for (const y of list) if (!(await put(`photo_rubric/${y.l}/${y.r}`, { ...y.x, on: y.fb ? !!y.fb.on : !!y.x.on }))) bad++;
    busy = false; say(bad ? `⚠ ${bad}개를 올리지 못했어요` : '📤 올렸어요');
  }
  async function toggle(l: string, r: string, v: boolean) { if (!(await put(`photo_rubric/${l}/${r}/on`, v))) say('저장하지 못했어요'); }
</script>

<div class="ps" data-k="photo-set">
  <p class="muted">API 키는 Apps Script 스크립트 속성에만 (여기 넣지 않아요) · 사진은 저장되지 않아요</p>
  <label class="fl">웹 앱 주소<input type="url" data-k="ph-url" placeholder="https://script.google.com/macros/s/…/exec" bind:value={url} /></label>
  <label class="ck"><input type="checkbox" data-k="ph-on" bind:checked={on} /> 학생에게 켜기 (끄면 서술형이 다시 「답 확인만」)</label>
  <div class="lim">
    <label>학생 하루 (장)<input type="number" min="1" max="20" bind:value={dl} /></label>
    <label>방 하나 하루 (장)<input type="number" min="1" max="10" bind:value={rm} /></label>
    <label>다음 사진까지 (초)<input type="number" min="0" max="600" bind:value={cool} /></label>
    <label>수업 소레이드 📸 (장)<input type="number" min="1" max="5" bind:value={raid} /></label>
    <label>⚠ 학교 전체 하루 (장)<input type="number" min="10" max="1000" bind:value={wd} /></label>
    <label>⚠ 이번 달 (장)<input type="number" min="100" max="50000" bind:value={wm} /></label>
  </div>
  <div class="row"><button type="button" class="pri" data-k="ph-save" disabled={busy} onclick={save}>💾 저장</button><button type="button" disabled={busy} onclick={ping}>🔌 연결 확인</button></div>
  {#if msg}<p class="msg" role="status">{msg}</p>{/if}
  <p class="use" class:warn={U.warn}>{#if U.warn}<b>⚠ 사용량 경고</b> {U.why}<br />{/if}📈 오늘 학교 전체 <b>{U.today}</b>장 · 이번 달 <b>{U.month}</b>장 ≈ <b>{U.won.toLocaleString()}</b>원</p>
  <h3>채점 기준표 <small>올림 {up} / {list.length} · 켠 방만 학생에게 열려요</small></h3>
  <table>
    <thead><tr><th>방</th><th>배점</th><th>서버</th><th>켜기</th></tr></thead>
    <tbody>
      {#each list as y (`${y.l}|${y.r}`)}
        <tr data-rub={`${y.l}|${y.r}`}><td>{where(y.l)} · {y.x.title}</td><td>{y.x.pass} / {y.x.total}</td><td>{y.fb ? '✔' : '—'}</td><td><input type="checkbox" checked={!!y.fb?.on} disabled={!y.fb || busy} onchange={(e) => toggle(y.l, y.r, e.currentTarget.checked)} aria-label="{y.x.title} 켜기" /></td></tr>
      {/each}
    </tbody>
  </table>
  {#if ask}
    <div class="ask"><p>기준표 {list.length}개를 서버에 올릴까요? (켜기 상태는 그대로 · 처음 올리는 방은 코드 기본값)</p><div class="row"><button type="button" class="pri" onclick={upload}>📤 올리기</button><button type="button" onclick={() => (ask = false)}>그만</button></div></div>
  {:else}
    <button type="button" class="wide" disabled={busy} onclick={() => (ask = true)}>📤 기준표 올리기 (코드의 기준표 → 서버 · 켜기는 그대로)</button>
  {/if}
</div>

<style>
  .ps { display: flex; flex-direction: column; gap: var(--s3); padding-bottom: var(--s3); }
  .ps p { margin: 0; line-height: 1.5; overflow-wrap: anywhere; }
  .muted { color: var(--text-2); font-size: 14px; }
  .fl { display: flex; flex-direction: column; gap: 6px; font: 700 14px var(--font); }
  .fl input, .lim input { min-height: var(--tap); padding: 0 var(--s3); border-radius: var(--r); border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 500 15px var(--font); box-sizing: border-box; }
  .lim { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s2); }
  .lim label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-2); }
  .lim input { width: 100%; }
  .ck { display: flex; align-items: center; gap: var(--s2); min-height: var(--tap); font: 700 15px var(--font); }
  .ck input, td input { width: 22px; height: 22px; }
  .row { display: flex; gap: var(--s2); }
  .row button, .wide { flex: 1; min-height: var(--tap); border-radius: 12px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); }
  .pri { background: var(--accent) !important; color: var(--on-accent, #1a1400) !important; border-color: var(--accent) !important; }
  button:disabled { opacity: 0.4; }
  .msg { color: var(--ok); font-weight: 700; }
  .use { padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface-2); font-size: 14px; }
  .use.warn { box-shadow: inset 0 0 0 2px var(--bad); }
  h3 { margin: 0; font-size: 16px; } h3 small { color: var(--text-2); font-weight: 500; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 8px 4px; border-bottom: 1px solid var(--line, #2f3440); text-align: left; }
  th { color: var(--text-2); font-weight: 700; font-size: 13px; }
  .ask { padding: var(--s3); border-radius: var(--r); background: var(--surface-2); display: flex; flex-direction: column; gap: var(--s2); }
</style>
