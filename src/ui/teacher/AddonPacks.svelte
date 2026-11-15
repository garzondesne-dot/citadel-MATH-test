<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import { CASTLE_PATH, castleZip, clearedBy, floorName, OFFICIAL, spanOf, type CastlePack, type CastleRec } from '../../school/castle';
  import { castles, removeCastle, setCastleHide } from '../../school/castles.svelte';
  import { CLASSES } from '../../school/school';
  import Castle from '../castle/Castle.svelte';
  import CastleUnlock from './CastleUnlock.svelte';
  import Sheet from '../battle/Sheet.svelte';

  // 📦 팩 탭 (📜 2026-11-15 DECISIONS f3e75f8 · 선생님 「A 추천대로」) — 준비 탭 [차시 준비 · 시간표 · 📦 팩 · 도구] 의 셋째
  //   맨 위 = 「📦 팩 올리기」 → 종류별 묶음 「🏰 성채 · n층 ▾」(접기 · 이 기기 기억) → 한 층 = 한 줄 「1층 (층 이름) · 12방 · 처치 n · 🔓1-1 ›」
  //   줄 누르면 아래 시트: 🔓 해금 관리 · 👁 미리 보기 · 👀 보임/숨김 · ⬇ 내려받기 · 🗑 지우기(정식 출신 eval-1~3 = 숨김만) · 「준비 중」 종류는 안 보임(그 종류 팩이 생기면 묶음이 생김)
  const { S, onup }: { S: Store; onup: () => void } = $props();
  type Tree = Record<string, Record<string, Record<string, Record<string, CastleRec>>>>;
  let tree = $state<Tree | null>(null);
  $effect(() => { void (S.fetch ? S.fetch<Tree>('bonus') : Promise.resolve(S.get<Tree>('bonus'))).then((t) => (tree = t ?? {})).catch(() => (tree = {})); });
  let busy = $state(''), ask = $state(false), note = $state(''), look = $state<CastlePack | null>(null), unl = $state<CastlePack | null>(null), act = $state<CastlePack | null>(null);
  const FK = 'citadel-addon-fold';
  let fold = $state<boolean>((() => { try { return localStorage.getItem(FK) === '1'; } catch { return false; } })());
  const setFold = (v: boolean) => { fold = v; try { localStorage.setItem(FK, v ? '1' : '0'); } catch { /* 이 기기만 */ } };
  let ver = $state(0);
  const stop = untrack(() => S.watch('school/castleOpen', () => ver++)); onDestroy(stop);
  /** 🔓 뒤 = 연 방이 있는 반들 (모든 반 = 「🔓전체」 · 없으면 안 씀 · 3반 넘으면 「🔓1-1 외 n」) */
  function openTag(P: CastlePack): string {
    void ver;
    const t = S.get<Record<string, Record<string, unknown>>>(`school/castleOpen/${P.id}`) || {};
    const cs = CLASSES.filter((c) => Object.values(t[c] || {}).some(Boolean));
    if (!cs.length) return '';
    if (cs.length === CLASSES.length) return '🔓전체';
    return cs.length > 3 ? `🔓${cs[0]} 외 ${cs.length - 1}` : `🔓${cs.join(' · ')}`;
  }
  const put = (p: string, x: unknown) => ((S as Store & { trySet?: (p: string, v: unknown) => Promise<boolean> }).trySet ? (S as Store & { trySet: (p: string, v: unknown) => Promise<boolean> }).trySet(p, x) : Promise.resolve((S.set(p, x), true)));
  async function toggle(P: CastlePack) {
    busy = P.id; const hide = !P.hide;
    if (await put(`${CASTLE_PATH}/${P.id}/hide`, hide ? true : null)) { setCastleHide(P.id, hide); act = act && act.id === P.id ? { ...act, hide } : act; note = `${floorName(P)} · ${hide ? '학생에게 숨김' : '학생에게 보임'}`; } else note = '바꾸지 못했어요 · 교사 로그인 · 인터넷을 확인해요';
    busy = '';
  }
  async function del(P: CastlePack) {
    if (OFFICIAL.test(P.id)) return;
    busy = P.id;
    if (await put(`${CASTLE_PATH}/${P.id}`, null)) { removeCastle(P.id); note = `「${P.id}」 팩을 지웠어요 · 학생 처치 기록은 남아요`; act = null; } else note = '지우지 못했어요 · 교사 로그인 · 인터넷을 확인해요';
    busy = ''; ask = false;
  }
  async function down(P: CastlePack) {
    const z = await castleZip(P);
    const u = URL.createObjectURL(new File([z.bytes as Uint8Array<ArrayBuffer>], z.name, { type: 'application/zip' }));
    const a = document.createElement('a'); a.href = u; a.download = z.name; a.rel = 'noopener'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    note = `⬇ ${z.name}`;
  }
</script>

<section class="add" data-k="addons" aria-label="팩">
  <button type="button" class="item" data-k="addon-up" onclick={onup}><span class="ic">📦</span><span class="tx"><b>팩 올리기</b><small>차시 팩 · 🏰 성채 팩 · 종류는 파일이 알려 줘요</small></span></button>
  {#if castles.list.length}
    <div class="grp">
      <button type="button" class="gh" data-k="grp-castle" aria-expanded={!fold} onclick={() => setFold(!fold)}><b>🏰 성채 · {castles.list.length}층</b><i aria-hidden="true">{fold ? '▸' : '▾'}</i></button>
      {#if !fold}
        {#each castles.list as P (P.id)}
          {@const tag = openTag(P)}
          <button type="button" class="row" class:off={!!P.hide} data-k="addon-card" data-id={P.id} onclick={() => { act = P; ask = false; }}>
            <span class="nm"><b>{floorName(P)}</b><small>{P.rooms.length}방 · 처치 {tree ? clearedBy(tree, P.id) : '…'}{tag ? ` · ${tag}` : ''}{P.hide ? ' · 숨김' : ''}</small></span><i aria-hidden="true">›</i>
          </button>
        {/each}
      {/if}
    </div>
  {:else}
    <p class="none">올린 추가 팩이 없어요 · 🏰 성채 팩은 「📦 팩 올리기」에 kind: "castle" 파일</p>
  {/if}
  {#if note}<p class="note" role="status">{note}</p>{/if}
</section>
{#if act}
  {@const P = act}
  <Sheet onclose={() => (act = null)} mainText="닫기">
    {#snippet title()}🏰 {floorName(P)}{/snippet}
    <p class="meta">{P.rooms.length}방 · 열림 {spanOf(P)} · 처치 {tree ? clearedBy(tree, P.id) : '…'}명{P.hide ? ' · 학생에게 숨김' : ''}</p>
    <div class="acts">
      <button type="button" data-k="addon-unlock" onclick={() => { unl = P; act = null; }}><span>🔓</span><b>해금 관리</b><small>{openTag(P) || '연 방 없음 · 자동(진도)만'}</small></button>
      <button type="button" data-k="addon-look" onclick={() => { look = P; act = null; }}><span>👁</span><b>미리 보기</b><small>학생 화면 그대로 · 모든 방</small></button>
      <button type="button" data-k="addon-vis" role="switch" aria-checked={!P.hide} disabled={busy === P.id} onclick={() => toggle(P)}><span>{P.hide ? '🙈' : '👀'}</span><b>{P.hide ? '숨김' : '보임'}</b><small>{P.hide ? '누르면 학생에게 보여요' : '누르면 학생에게 숨겨요'}</small></button>
      <button type="button" data-k="addon-dl" onclick={() => down(P)}><span>⬇</span><b>내려받기</b><small>zip · 그대로 다시 올릴 수 있어요</small></button>
      {#if !OFFICIAL.test(P.id)}
        {#if ask}<div class="cf" role="alertdialog"><em>이 팩을 지울까요? 학생 처치 기록은 남아요</em><button type="button" class="yes" data-k="addon-del-yes" onclick={() => del(P)}>예</button><button type="button" class="no" onclick={() => (ask = false)}>아니요</button></div>
        {:else}<button type="button" class="del" data-k="addon-del" disabled={busy === P.id} onclick={() => (ask = true)}><span>🗑</span><b>지우기</b><small>학생 처치 기록은 남아요</small></button>{/if}
      {/if}
    </div>
  </Sheet>
{/if}
{#if unl}<CastleUnlock {S} P={unl} onclose={() => (unl = null)} />{/if}
{#if look}<Castle {S} uid="teacher-preview" preview floor={look.id} onclose={() => (look = null)} />{/if}

<style>
  .add { display: flex; flex-direction: column; gap: var(--s2); }
  .grp { display: flex; flex-direction: column; gap: 6px; }
  .gh { display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 var(--s2); border: 0; background: none; color: var(--text); font: 700 15px var(--font); }
  .gh i { font-style: normal; color: var(--text-2); }
  .row { display: flex; align-items: center; gap: var(--s2); min-height: 56px; padding: 6px var(--s3); border-radius: var(--r); border: 0; background: var(--surface); color: var(--text); text-align: left; font: inherit; box-shadow: 0 3px 0 var(--press-sh); }
  .row:active { transform: translateY(2px); box-shadow: none; }
  .row.off { opacity: 0.55; }
  .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; } .nm b { font-size: 15px; } .nm small { font-size: 13px; color: var(--text-2); }
  .row > i { font-style: normal; font-size: 20px; color: var(--text-3); }
  .meta { margin: 0; font-size: 14px; color: var(--text-2); }
  .acts { display: flex; flex-direction: column; gap: 6px; padding-bottom: var(--s3); }
  .acts > button { display: grid; grid-template-columns: 32px 1fr; grid-template-rows: auto auto; align-items: center; column-gap: var(--s2); min-height: 56px; padding: 6px var(--s3); border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); text-align: left; font: inherit; }
  .acts > button span { grid-row: span 2; font-size: 20px; text-align: center; } .acts > button b { font-size: 15px; } .acts > button small { font-size: 13px; color: var(--text-2); }
  .acts > button[aria-checked='true'] { border-color: var(--ok); }
  .acts .del { border-color: var(--bad); } .acts .del b { color: var(--bad); }
  .cf { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; justify-content: flex-end; } .cf em { font-style: normal; font-size: 13px; color: var(--bad); width: 100%; }
  .cf button { min-height: 48px; padding: 0 14px; border-radius: var(--r-sm); border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); } .cf .yes { background: var(--bad); border-color: var(--bad); color: #fff; }
  .none, .note { margin: 0; font-size: 13px; color: var(--text-2); }
</style>
