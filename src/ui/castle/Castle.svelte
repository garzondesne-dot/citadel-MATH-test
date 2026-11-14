<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Room, Store } from '../../model/types';
  import type { Me } from '../../store/me.svelte';
  import { PROFILES } from '../../model/profiles';
  import { memoryStore } from '../../store/device';
  import { nextStep, openRoom, roomPath } from '../../raid/actions';
  import { chainRecord, isChain, plainRecord } from '../../raid/raid';
  import { stepDone } from '../../board/board';
  import { meBound } from '../../store/meSync';
  import { baseVer, bonusBase, castleState, floorName, progressOf, roomPack, spanOf, type CastlePack, type CastleRec, type CastleRoom } from '../../school/castle';
  import { castles, visibleCastles } from '../../school/castles.svelte';
  import { spriteOf } from '../manifest';
  import { busy } from '../busy.svelte';
  import { sfx } from '../sound.svelte';
  import Student from '../Student.svelte';
  import BottomAction from '../battle/BottomAction.svelte';

  // 🏰 성채 던전 (📜 2026-11-14 · DECISIONS 「🏰 성채던전 팩 · ➕ 추가 팩 관리」 · 정식 js/raid/bonus.js)
  //   층 목록 → 방 목록 → 방 하나 = 몬스터 한 마리(1:1 · 혼자) · 전투 = 학생 레이드 화면(Student · MonsterForm · ChainView · 룬 키패드) 그대로 🪞
  //   열림 = 반 진도 ≥ 방 no · 👑 = 열린 방 60%(올림) 처치 · 기회 4 · 틀린 소문제만 다음 판 숫자 · 실패 = 💧 벌 없음
  //   preview = 👁 선생님 미리 보기: 모든 방 열림 · 기록 · 데미지 없음 · 처치 기록 = bonus/{반}/{번호}/{팩}/{방}
  const { S, me = null, uid, num = 0, cls = '', preview = false, floor = '', onclose }: { S: Store; me?: Me | null; uid: string; num?: number; cls?: string; preview?: boolean; floor?: string; onclose: () => void } = $props();
  const floors = $derived(preview ? castles.list : visibleCastles());
  // 🧑 기록 자리 = 그 학생으로 로그인한 폰이면 서버 정식 경로 · 아니면 이 기기(테스트 · 체험)
  const RS = untrack(() => meBound()?.S ?? S);
  const base = untrack(() => { const b = meBound(); return b ? bonusBase(b.cls, b.num) : bonusBase(cls, num || uid); });
  let ver = $state(0);
  const recsOf = (P: CastlePack): Record<string, CastleRec> => { void ver; return preview ? {} : RS.get<Record<string, CastleRec>>(`${base}/${P.id}`) || {}; };
  const upto = untrack(() => (preview ? 99 : progressOf(S, cls, (cls && num ? S.get<Record<string, unknown>>(`records/${cls}/${num}`) : null) || {})));
  let fid = $state(untrack(() => floor || (floors.length === 1 ? floors[0]!.id : '')));
  let pickF = $state(untrack(() => floor || floors[floors.length - 1]?.id || ''));
  const P = $derived(floors.find((f) => f.id === fid) ?? null);
  const recs = $derived(P ? recsOf(P) : {});
  const st = $derived(P ? castleState(P, upto, recs, preview) : null);
  let pickR = $state('');
  $effect(() => { const p = P, s = st; if (!p || !s) return; untrack(() => { if (!p.rooms.some((r) => r.id === pickR && s.isOpen(r))) pickR = (s.open.find((r) => !recs[r.id]?.clear) ?? s.open[0])?.id ?? ''; }); });
  const room = $derived(P?.rooms.find((r) => r.id === pickR) ?? null);
  const safe = (ref: string) => { try { spriteOf(ref); return ref; } catch { return 'base0:0'; } };
  const nn = (r: CastleRoom) => (/^\D*(\d+)/.exec(r.id)?.[1] ?? '').padStart(2, '0');
  function lineOf(r: CastleRoom): string {
    if (!st) return '';
    if (r.boss && !st.bossOpen) return r.no > upto && !preview ? `🔒 ${r.no}차시를 배우면 · 열린 방 ${st.need}개 처치` : `🔒 열린 방 ${st.cleared} / ${st.need} 처치하면 열려요`;
    if (!st.isOpen(r)) return `🔒 ${r.no}차시를 배우면 열려요`;
    return [r.chain ? '⚔ 소레이드' : `소문제 ${r.vers[0]?.length ?? 0}`, r.photo ? '📷 답 확인만' : '', `${r.no}차시`].filter(Boolean).join(' · ');
  }
  const badge = (r: CastleRoom) => (!st?.isOpen(r) ? '🔒' : recs[r.id]?.clear ? '✔' : recs[r.id]?.runs ? '💧' : 'NEW');

  // ── 방 하나 = 메모리 방 하나 (허수아비 · 게시판과 같은 길) ──
  let run = $state<{ L: ReturnType<typeof roomPack>; S: Store; code: string; r: CastleRoom; P: CastlePack } | null>(null);
  let res = $state<{ clear: boolean; r: CastleRoom; first: boolean; bossNew: boolean } | null>(null);
  let toast = $state('');
  function start() {
    const p = P, r = room; if (!p || !r || !st?.isOpen(r)) return;
    const L = roomPack(p, r, safe(r.sprite)), S2: Store = { ...memoryStore(), kind: 'memory' as const }, code = `C${Date.now() % 1e6}`;
    openRoom(S2, L, code, PROFILES.board);
    const M = `${roomPath(code)}/meta`;
    S2.set(`${M}/castle`, true); S2.set(`${M}/fresh`, { [r.id]: preview ? 0 : baseVer(recs[r.id]) });
    S2.set(`${M}/retries`, 3); S2.set(`${M}/healMax`, 0); S2.set(`${M}/solve`, 0); S2.set(`${M}/pct`, 100);
    nextStep(S2, L, code);
    sfx(r.boss ? 'mon-appear-boss' : 'mon-appear', 0.8);
    run = { L, S: S2, code, r, P: p }; res = null;
  }
  let drive: ReturnType<typeof setInterval> | null = null, doneAt = 0;
  $effect(() => {
    const x = run; if (!x) return;
    untrack(() => busy.n++); // 진행 중 = 새 판 저절로 새로 고침 안 함
    doneAt = 0;
    untrack(() => { drive = setInterval(() => { const RR = x.S.get<Room>(roomPath(x.code)); if (!RR) return; if (!doneAt && stepDone(x.L, RR, uid)) doneAt = Date.now(); if (doneAt && Date.now() - doneAt > 2200) finish(x, RR); }, 250); }); // 채점표 · 처치 연출을 본 뒤 결과
    return () => { untrack(() => busy.n--); if (drive) clearInterval(drive); drive = null; };
  });
  onDestroy(() => { if (drive) clearInterval(drive); });
  /** 처치 · 💧 판정 + 기록 (미리 보기 = 기록 없음) */
  function outcome(x: NonNullable<typeof run>, RR: Room) {
    const mid = x.r.id;
    if (isChain(x.L, RR, mid)) { const c = chainRecord(x.L, RR, mid, uid); return { clear: c.done, n: c.nextK }; }
    const p = plainRecord(x.L, RR, mid, uid); return { clear: p.perfect, n: p.tries.length };
  }
  function save(x: NonNullable<typeof run>, clear: boolean, n: number) {
    if (preview || !n) return { first: false, bossNew: false };
    const path = `${base}/${x.P.id}/${x.r.id}`, old = RS.get<CastleRec>(path) || {};
    const before = castleState(x.P, upto, recsOf(x.P)).bossOpen;
    RS.set(path, { ...old, tries: (Number(old.tries) || 0) + n, runs: (Number(old.runs) || 0) + 1, at: S.now(), ...(clear || old.clear ? { clear: true } : {}) });
    ver++;
    return { first: clear && !old.clear, bossNew: !before && castleState(x.P, upto, recsOf(x.P)).bossOpen };
  }
  function finish(x: NonNullable<typeof run>, RR: Room) {
    if (drive) clearInterval(drive); drive = null;
    const o = outcome(x, RR), s = save(x, o.clear, o.n);
    sfx(o.clear ? 'game-ok' : 'game-no', 0.8);
    res = { clear: o.clear, r: x.r, ...s }; run = null;
    if (s.bossNew) { toast = '👑 보스 방이 열렸어요!'; sfx('castle-open', 0.8); setTimeout(() => (toast = ''), 3000); }
  }
  /** ‹ 그만하기 = 낸 답이 있으면 💧 한 번으로 셈 (정식: 판마다 기록) */
  function quit() { const x = run; if (!x) return; const RR = x.S.get<Room>(roomPath(x.code)); if (RR) { const o = outcome(x, RR); save(x, o.clear, o.n); } run = null; }
  function back() { if (res) { res = null; return; } if (fid && !floor && floors.length > 1) { fid = ''; return; } onclose(); }
  const title = $derived(P ? `🏰 ${floorName(P)}` : '🏰 성채 던전');
  (globalThis as { __castle?: unknown }).__castle = { upto, base }; // 화면 시험 고리 (학생 화면엔 안 보임)
</script>

{#if run}
  <div class="drun" data-castle-run data-room={run.r.id}>
    <button type="button" class="quit" aria-label="그만하기" onclick={quit}>‹</button>
    {#if preview}<p class="pv" role="status">👁 미리 보기 · 기록 없음</p>{/if}
    <Student S={run.S} L={run.L} code={run.code} {uid} {num} nick={me?.nick ?? ''} {cls} board />
  </div>
{:else}
<div class="cs" role="dialog" aria-modal="true" aria-label="성채 던전" data-k="castle">
  <header class="bar">
    <button type="button" class="back" aria-label="뒤로" onclick={back}><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M14 4 7 11l7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
    <b class="t">{res ? (res.clear ? '⚔ 처치!' : '💧 이번엔 여기까지') : title}</b>
    {#if me && !preview}<span class="pill" aria-label="마정석 {me.wallet.gem}개"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1 13 6 7 13 1 6Z" fill="var(--gem)" /></svg>{me.wallet.gem.toLocaleString()}</span>
    <span class="pill" aria-label="서술 조각 {me.wallet.scroll}개"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="2" fill="var(--scroll)" /></svg>{me.wallet.scroll}</span>{:else if preview}<span class="pill pv2">👁 미리 보기</span>{/if}
  </header>
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
  <div class="body">
    {#if res}
      <div class="card res" data-k="castle-res" data-clear={res.clear ? '1' : '0'}>
        <span class="big" aria-hidden="true">{res.clear ? '⚔' : '💧'}</span>
        <b>{res.r.title}</b>
        <p>{res.clear ? (preview ? '미리 보기 · 기록하지 않았어요' : res.first ? '처음 처치했어요!' : '다시 처치했어요') : '벌은 없어요 · 다음엔 새 숫자로 다시 도전해요'}</p>
        {#if P && st && !preview}<p class="sub">처치 {st.cleared} / 열린 방 {st.plain.length}{st.boss ? ` · 👑 ${st.bossOpen ? '보스 방 열림' : `${st.need}방 처치하면 보스`}` : ''}</p>{/if}
      </div>
    {:else if !P}
      {#if !floors.length}
        <div class="empty"><span class="ic" aria-hidden="true">🏰</span><p>아직 열린 층이 없어요</p><small>선생님이 성채 팩을 올리면 열려요</small></div>
      {:else}
        <p class="lab">층 고르기</p>
        <div class="list" role="radiogroup" aria-label="층">
          {#each floors as f (f.id)}{@const s = castleState(f, upto, recsOf(f), preview)}
            <button type="button" role="radio" class="row" class:on={pickF === f.id} aria-checked={pickF === f.id} data-floor={f.id} onclick={() => (pickF = f.id)}>
              <span class="no">{f.floor}층</span><span class="tx"><b>{f.title}</b><small>열린 방 {s.open.length} / {f.rooms.length} · 처치 {s.cleared} · {spanOf(f)}</small></span>{#if f.hide}<em class="st">숨김</em>{/if}
            </button>
          {/each}
        </div>
      {/if}
    {:else if st}
      <p class="sum" data-k="castle-sum">처치 <b>{st.cleared}</b> / 열린 방 {st.plain.length} · {st.boss ? (st.bossOpen ? '👑 보스 방 열림' : `👑 ${st.need}방 처치하면 보스`) : ''}{preview ? '' : ` · 진도 ${upto}차시`}</p>
      <div class="list" role="radiogroup" aria-label="방">
        {#each P.rooms as r (r.id)}{@const on = st.isOpen(r)}
          <button type="button" role="radio" class="row" class:on={pickR === r.id} class:boss={!!r.boss} class:lock={!on} aria-checked={pickR === r.id} disabled={!on} data-room={r.id} data-open={on ? '1' : '0'} onclick={() => (pickR = r.id)}>
            <span class="no">{r.boss ? '👑' : nn(r)}</span><span class="tx"><b>{r.title.replace(/^👑\s*/, '').replace(/^\d+\s+/, '')}</b><small>{lineOf(r)}</small></span><em class="st" class:ok={badge(r) === '✔'} class:new={badge(r) === 'NEW'}>{badge(r)}</em>
          </button>
        {/each}
      </div>
      {#if room?.note}<p class="note">💡 {room.note}</p>{/if}
    {/if}
  </div>
  {#if res}
    <BottomAction dock={false} text="🏰 방 목록으로" mainLabel="방 목록으로" onmain={() => (res = null)} />
  {:else if !P}
    <BottomAction dock={false} disabled={!floors.length} why={floors.length ? '' : '선생님이 팩을 올리면 열려요'} text={pickF ? `🏰 ${floors.find((f) => f.id === pickF)?.floor ?? ''}층 들어가기` : '층을 골라요'} mainLabel="층 들어가기" onmain={() => (fid = pickF)} />
  {:else}
    <BottomAction dock={false} disabled={!room} why={room ? (room.photo ? '📷 사진 채점은 아직 · 답만 확인해요' : '') : '열린 방이 없어요'} text={room ? `⚔ ${room.boss ? '👑 보스 방' : `${nn(room)}번 방`} 도전` : '방을 골라요'} mainLabel="방 도전" onmain={start} />
  {/if}
</div>
{/if}

<style>
  .cs { position: fixed; inset: 0; z-index: 20; max-width: 430px; margin: 0 auto; background: var(--bg); display: flex; flex-direction: column; }
  .bar { flex: none; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s2); }
  .back { flex: none; width: var(--tap); height: var(--tap); border: 0; background: none; color: var(--text); display: grid; place-items: center; }
  .t { flex: 1; min-width: 0; font-size: var(--fs-title); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pill { flex: none; display: flex; align-items: center; gap: var(--s1); height: 32px; padding: 0 10px; border-radius: 16px; background: var(--surface); font-size: var(--fs-small); font-weight: 700; font-variant-numeric: tabular-nums; }
  .pv2 { color: var(--accent); }
  .body { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4) var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .lab { margin: 0; font-size: var(--fs-small); font-weight: 700; color: var(--text-2); }
  .sum { margin: 0; font-size: var(--fs-small); color: var(--text-2); }
  .sum b { color: var(--accent); font-size: 16px; }
  .list { display: flex; flex-direction: column; gap: var(--s2); }
  .row { display: flex; align-items: center; gap: var(--s3); min-height: 64px; padding: var(--s2) var(--s3); border-radius: var(--r); border: 2px solid transparent; background: var(--surface); color: var(--text); font: inherit; text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .row:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .row.on { border-color: var(--accent); }
  .row.lock { opacity: 0.5; box-shadow: none; }
  .row .no { flex: none; width: 44px; height: 44px; border-radius: var(--r-sm); background: var(--surface-2); display: grid; place-items: center; font-weight: 700; font-variant-numeric: tabular-nums; }
  .row.boss .no { font-size: 22px; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .tx b { font-size: 16px; overflow-wrap: anywhere; } .tx small { font-size: var(--fs-small); color: var(--text-2); }
  .st { flex: none; font-style: normal; font-size: var(--fs-small); font-weight: 700; color: var(--text-3); }
  .st.ok { color: var(--ok); } .st.new { color: var(--accent); }
  .note { margin: 0; font-size: 14px; color: var(--text-2); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: var(--s2); padding: var(--s6) 0; color: var(--text-2); text-align: center; }
  .empty .ic { font-size: 44px; } .empty p { margin: 0; font-weight: 700; color: var(--text); } .empty small { font-size: var(--fs-small); }
  .card.res { display: flex; flex-direction: column; align-items: center; gap: var(--s2); padding: var(--s5) var(--s4); border-radius: var(--r); background: var(--surface); text-align: center; }
  .res .big { font-size: 48px; } .res b { font-size: 18px; } .res p { margin: 0; color: var(--text-2); } .res .sub { font-size: var(--fs-small); }
  .toast { position: fixed; left: 50%; top: 64px; transform: translateX(-50%); z-index: 25; margin: 0; padding: var(--s2) var(--s4); border-radius: 20px; background: var(--surface-2); color: var(--accent); font-weight: 700; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); white-space: nowrap; }
  .drun { position: fixed; inset: 0; z-index: 20; background: var(--bg); overflow: auto; }
  .quit { position: fixed; z-index: 30; left: 4px; top: 4px; width: 44px; height: 44px; border: 0; background: none; color: #fff; font-size: 28px; text-shadow: 0 1px 2px #000; }
  .pv { position: fixed; z-index: 30; top: 10px; left: 50%; transform: translateX(-50%); margin: 0; padding: 2px 10px; border-radius: 12px; background: rgba(8, 9, 12, 0.6); color: var(--accent); font-size: var(--fs-small); font-weight: 700; }
</style>
