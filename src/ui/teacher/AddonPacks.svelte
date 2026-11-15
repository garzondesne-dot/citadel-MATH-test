<script lang="ts">
  import type { Store } from '../../model/types';
  import { CASTLE_PATH, castleZip, clearedBy, floorName, OFFICIAL, spanOf, type CastlePack, type CastleRec } from '../../school/castle';
  import { castles, removeCastle, setCastleHide } from '../../school/castles.svelte';
  import Castle from '../castle/Castle.svelte';
  import CastleUnlock from './CastleUnlock.svelte';

  // ➕ 추가 팩 (📜 2026-11-14 · 머리 확정 「차시팩 아니고 추가팩은 … 수업 준비 탭에서」 → 「추천대로」)
  //   종류별 묶음: 🏰 성채(지금) · ⭕ 쉼터 OX · ⚒ 모루 · 🎯 복습(자리만 · 준비 중)
  //   팩 한 줄 카드 = 「🏰 n층 제목 · 12방 · 열림 2~6차시 · 처치 n명」 + 👁 미리 보기 · 👀 보임/숨김 · ⬇ 내려받기 · 🗑 지우기(정식 출신 eval-1~3 = 숨김만)
  //   올리기 = 「📦 팩 올리기」 하나(파일 안 kind 로 가름)
  const { S, onup }: { S: Store; onup: () => void } = $props();
  type Tree = Record<string, Record<string, Record<string, Record<string, CastleRec>>>>;
  let tree = $state<Tree | null>(null);
  $effect(() => { void (S.fetch ? S.fetch<Tree>('bonus') : Promise.resolve(S.get<Tree>('bonus'))).then((t) => (tree = t ?? {})).catch(() => (tree = {})); });
  let busy = $state(''), ask = $state(''), note = $state(''), look = $state<CastlePack | null>(null), unl = $state<CastlePack | null>(null);
  const put = (p: string, x: unknown) => (S.trySet ? S.trySet(p, x) : Promise.resolve((S.set(p, x), true)));
  async function toggle(P: CastlePack) {
    busy = P.id; const hide = !P.hide;
    if (await put(`${CASTLE_PATH}/${P.id}/hide`, hide ? true : null)) { setCastleHide(P.id, hide); note = `${floorName(P)} · ${hide ? '학생에게 숨김' : '학생에게 보임'}`; } else note = '바꾸지 못했어요 · 교사 로그인 · 인터넷을 확인해요';
    busy = '';
  }
  async function del(P: CastlePack) {
    if (OFFICIAL.test(P.id)) return;
    busy = P.id;
    if (await put(`${CASTLE_PATH}/${P.id}`, null)) { removeCastle(P.id); note = `「${P.id}」 팩을 지웠어요 · 학생 처치 기록은 남아요`; } else note = '지우지 못했어요 · 교사 로그인 · 인터넷을 확인해요';
    busy = ''; ask = '';
  }
  async function down(P: CastlePack) {
    const z = await castleZip(P);
    const u = URL.createObjectURL(new File([z.bytes as Uint8Array<ArrayBuffer>], z.name, { type: 'application/zip' }));
    const a = document.createElement('a'); a.href = u; a.download = z.name; a.rel = 'noopener'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    note = `⬇ ${z.name}`;
  }
  const LATER: [string, string][] = [['⭕', '쉼터 OX'], ['⚒', '모루'], ['🎯', '복습']];
</script>

<section class="add" data-k="addons" aria-label="추가 팩">
  <p class="lab">➕ 추가 팩</p>
  <div class="grp"><b class="gt">🏰 성채</b>
    {#each castles.list as P (P.id)}
      <div class="card" class:off={!!P.hide} data-k="addon-card" data-id={P.id}>
        <p class="ln"><b>🏰 {floorName(P)}</b><small>{P.rooms.length}방 · 열림 {spanOf(P)} · 처치 {tree ? clearedBy(tree, P.id) : '…'}명{P.hide ? ' · 숨김' : ''}</small></p>
        {#if ask === P.id}
          <div class="cf" role="alertdialog"><em>이 팩을 지울까요? 학생 처치 기록은 남아요</em><button type="button" class="yes" data-k="addon-del-yes" onclick={() => del(P)}>예</button><button type="button" class="no" onclick={() => (ask = '')}>아니요</button></div>
        {:else}
          <div class="acts">
            <button type="button" data-k="addon-unlock" onclick={() => (unl = P)}>🔓 해금 관리</button>
            <button type="button" data-k="addon-look" onclick={() => (look = P)}>👁 미리 보기</button>
            <button type="button" data-k="addon-vis" role="switch" aria-checked={!P.hide} disabled={busy === P.id} onclick={() => toggle(P)}>{P.hide ? '🙈 숨김' : '👀 보임'}</button>
            <button type="button" data-k="addon-dl" onclick={() => down(P)}>⬇ 내려받기</button>
            {#if !OFFICIAL.test(P.id)}<button type="button" class="del" data-k="addon-del" disabled={busy === P.id} onclick={() => (ask = P.id)}>🗑 지우기</button>{/if}
          </div>
        {/if}
      </div>
    {:else}
      <p class="none">올린 성채 팩이 없어요 · 「📦 팩 올리기」에 kind: "castle" 파일</p>
    {/each}
  </div>
  {#each LATER as [ic, t] (t)}<div class="grp later"><b class="gt">{ic} {t}</b><small>준비 중</small></div>{/each}
  {#if note}<p class="note" role="status">{note}</p>{/if}
  <button type="button" class="item" data-k="addon-up" onclick={onup}><span class="ic">📦</span><span class="tx"><b>팩 올리기</b><small>차시 팩 · 🏰 성채 팩 · 종류는 파일이 알려 줘요</small></span></button>
</section>
{#if unl}<CastleUnlock {S} P={unl} onclose={() => (unl = null)} />{/if}
{#if look}<Castle {S} uid="teacher-preview" preview floor={look.id} onclose={() => (look = null)} />{/if}

<style>
  .add { display: flex; flex-direction: column; gap: var(--s2); margin-top: var(--s4); }
  .lab { margin: 0; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .grp { display: flex; flex-direction: column; gap: var(--s2); }
  .gt { font-size: 14px; }
  .grp.later { flex-direction: row; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 var(--s3); border-radius: var(--r); background: var(--surface); opacity: 0.6; }
  .grp.later small { font-size: 13px; color: var(--text-3); }
  .card { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); border-radius: var(--r); background: var(--surface); }
  .card.off .ln b { color: var(--text-3); }
  .ln { margin: 0; display: flex; flex-direction: column; gap: 2px; } .ln b { font-size: 15px; } .ln small { font-size: 13px; color: var(--text-2); }
  .acts { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 6px; }
  .acts button { min-height: 48px; padding: 0 6px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .acts button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .acts button[aria-checked='true'] { border-color: var(--ok); }
  .acts .del { border-color: var(--bad); color: var(--bad); }
  .cf { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; justify-content: flex-end; } .cf em { font-style: normal; font-size: 13px; color: var(--bad); width: 100%; }
  .cf button { min-height: 48px; padding: 0 14px; border-radius: var(--r-sm); border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); } .cf .yes { background: var(--bad); border-color: var(--bad); color: #fff; }
  .none, .note { margin: 0; font-size: 13px; color: var(--text-2); }
</style>
