<script lang="ts">
  // 📷 서술형 한 장 (📜 2026-11-15 머리 🔨 「사진 승인 = 소식 탭 📷 칩」): 결과 · AI 가 읽은 답 · 단계 · 💬 · 🙋 이의 신청 + ✔ 처치 인정 / ✖ 그대로
  //   소식 탭 📷 · 학생 시트 = 단추 있음 / 대시보드 「서술형」 = 보기만(readonly) · 같은 부품 하나
  import type { Store } from '../../model/types';
  import { roster } from '../../school/school';
  import { markPhoto, roomTitle, type PhotoRow } from '../../school/photo';
  const { S, x, readonly = false, who = true, ondone }: { S: Store; x: PhotoRow; readonly?: boolean; who?: boolean; ondone?: (ok: boolean, saved: boolean) => void } = $props();
  const ST: Record<string, string> = { pass: '✅ 통과', retry: '✏ 재도전', check: '⏳ 확인 필요' };
  const when = (t?: number) => { const d = new Date(Number(t) + 9 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  const nm = $derived(roster(x.c, S).find((p) => p.num === Number(x.n))?.name ?? '');
  let busy = $state(false);
  async function mark(ok: boolean) { busy = true; const saved = await markPhoto(S, x, ok); busy = false; ondone?.(ok, saved); }
</script>

<div class="pc" class:new={x.ok == null && (x.status === 'check' || !!x.appeal)} data-photo={x.id}>
  <p class="meta"><b>{ST[x.status] ?? x.status}{x.ok === true ? ' → ✔ 인정' : x.ok === false ? ' → ✖ 그대로' : ''}</b>{#if who} · {x.c}반 {x.n}번 {nm}{/if} · {roomTitle(S, x.k)} · <b>{x.score} / {x.total}</b> (통과 {x.pass}) · 확신 {x.conf || ''} · {when(x.at)}</p>
  <p class="tx">📝 {x.ask || ''}<br />정답 {x.right || ''} · AI 가 읽은 답 {x.ans || '-'}<br />단계 {x.steps.map((s) => `${s.id} ${s.earned}/${s.pts}${s.note ? ` (${s.note})` : ''}`).join(' · ')}<br />💬 {x.fb || ''}{#if x.appeal}<br /><b>🙋 이의 신청:</b> {x.appeal.t || ''}{/if}{#if x.flags.length}<br />⚠ {x.flags.join(' · ')}{/if}</p>
  {#if !readonly && x.ok == null}<div class="row"><button type="button" class="pri" data-ok="1" disabled={busy} onclick={() => mark(true)}>✔ 처치 인정</button><button type="button" data-ok="0" disabled={busy} onclick={() => mark(false)}>✖ 그대로 (다시 풀기)</button></div>{/if}
</div>

<style>
  .pc { padding: var(--s3); border-radius: var(--r); background: var(--surface); display: flex; flex-direction: column; gap: 6px; border-left: 3px solid transparent; }
  .pc.new { border-left-color: var(--bad); }
  .pc p { margin: 0; overflow-wrap: anywhere; line-height: 1.5; }
  .meta { font-size: 14px; } .tx { font-size: 14px; color: var(--text-2); }
  .row { display: flex; gap: var(--s2); }
  .row button { flex: 1; min-height: var(--tap); border-radius: 12px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .row .pri { background: var(--accent); color: var(--on-accent, #1a1400); border-color: var(--accent); }
</style>
