<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { busy } from '../busy.svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { memoryStore } from '../../store/device';
  import { bossSubmit, chainSubmit, nextStep, openRoom, roomPath, submit } from '../../raid/actions';
  import { activeIds, answerOf, bossItem, bossState, chainRecord, isChain, isEnd, isLobby, itemsFor, plainRecord, resultOf, stepOf } from '../../raid/raid';
  import { boardPack, firstTry, freshAll, gradeOf, itemCount, SEC_PER_ITEM, stepDone } from '../../board/board';
  import { bMeta, bPause, helpOn, hintKey, hintOf, pauseMax, pauseOff, pauseOn, pausesLeft, sendHint, solvedStep, stuckItem, thinkUsed, timeLeft, type Role } from '../../board/team';
  import { liveRoom } from '../room.svelte';
  import Student from '../Student.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import { clock } from '../clock.svelte';
  import { CAMP_PORTAL } from '../manifest';
  import { sfx } from '../sound.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';

  // 📋 게시판 던전 전투 (#143 ⑨ ⑨-1 ⑨-2 ⑩): 레이드 학생 전투 화면(Student) 그대로 + 위 시간 선 · 팀 줄 · 도구(⏸ · 💡 · 🙋) · 덮개
  //   1인 = 이 폰 안(메모리) 방 · 끊겨도 계속 / 팀 = 서버 방 rooms/T… · 진행(다음 · 끝 · 멈춤 2분)은 글 올린 폰이 맡음
  //   🛡 수호자 = ⏸ 설명 2번(2분) · 💡 힌트(그 문제를 먼저 다 맞힌 뒤 · 친구마다 문제당 1번) / 🌱 도전자 = 🙋 도와줘 / 수호자 없는 팀 · 1인 = 길잡이(💡 자동 1번 + ⏸ 생각 1분 1번)
  type End = { drv: boolean; right: number; total: number; f: ReturnType<typeof firstTry>; tf: ReturnType<typeof firstTry>; grade: string; clear: boolean; sec: number; hints: number; R: Room; L: LessonPack };
  const { L0, uid, num, nick, cls, team = null, onend, onquit, hero = 0 }: {
    L0: LessonPack; uid: string; num: number; nick: string; cls: string; hero?: number;
    team?: { S: Store; code: string; host: boolean; roles: Record<string, Role>; names: Record<string, string> } | null;
    onend: (r: End) => void; onquit: () => void;
  } = $props();
  const L = untrack(() => boardPack(L0));
  const solo = untrack(() => !team);
  const S: Store = untrack(() => team?.S ?? { ...memoryStore(), kind: 'memory' as const });
  const code = untrack(() => team?.code ?? `B${Date.now() % 1e6}`);
  // 🔁 진행 맡기 (#147 · 교사 폰 → TV 이어받기와 같은 꼴): rooms/{코드}/bdrv/{uid} = { at, since, from } · 맡은 폰이 1초마다 at
  //   맡은 폰 = 소식이 10초 안인 칸 중 since 가 가장 늦은 칸(가장 최근에 이어받은 폰) → 끊겼다 되살아난 폰이 밀린 소식을 써도 뺏지 못함
  //   아무도 없으면 남은 팀원 중 차례대로(2초씩 늦게) 이어받음 · 처음 = 글 올린 폰 · 다시 들어온 폰 = 그대로 팀원 · 끊긴 폰은 맡지 않음
  const LEASE = 10000;
  const online = () => (S as Store & { net?: { connected: boolean } }).net?.connected !== false;
  type Lease = { at: number; since: number; from?: string };
  const leases = (RR: Room | null) => ((RR as unknown as { bdrv?: Record<string, Lease> } | null)?.bdrv) || {};
  function leader(RR: Room | null, t: number): { u: string; l: Lease } | null {
    const fresh = Object.entries(leases(RR)).filter(([, l]) => l && t - l.at <= LEASE).sort((a, b) => b[1].since - a[1].since || (a[0] < b[0] ? -1 : 1));
    return fresh[0] ? { u: fresh[0][0], l: fresh[0][1] } : null;
  }
  let leaseAt = 0;
  function amDrv(RR: Room): boolean {
    if (solo) return true;
    if (!online()) return false;
    const t = S.now(), L0 = leader(RR, t), all = leases(RR);
    if (L0?.u === uid) { if (t - leaseAt > 1000) { leaseAt = t; S.set(`${roomPath(code)}/bdrv/${uid}`, { ...L0.l, at: t }); } return true; }
    if (L0) return false;
    const last = Object.entries(all).sort((a, b) => b[1].at - a[1].at)[0];
    if (!last) { if (!team?.host) return false; S.set(`${roomPath(code)}/bdrv/${uid}`, { at: t, since: t }); leaseAt = t; return true; }
    const live = activeIds(RR, t).filter((u) => ids.includes(u) && u !== last[0]).sort(), rank = live.indexOf(uid);
    if (rank < 0 || t - last[1].at <= LEASE + rank * 2000) return false;
    S.set(`${roomPath(code)}/bdrv/${uid}`, { at: t, since: t, from: last[0] }); leaseAt = t; return true;
  }  const sec = () => Number((globalThis as { __BOARD_SEC?: number }).__BOARD_SEC) || SEC_PER_ITEM; // __BOARD_SEC = 화면 시험만
  if (solo) untrack(() => {
    openRoom(S, L, code, PROFILES.board);
    S.set(`${roomPath(code)}/meta/fresh`, freshAll(L));
    S.set(`${roomPath(code)}/meta/board`, { t0: S.now(), limit: 0, n: 1, guard: false });
  });
  const lr = untrack(() => liveRoom(S, code));
  const R = $derived(lr.v.room as Room | null);
  const now = $derived(clock.now);
  const roles = untrack(() => team?.roles ?? { [uid]: 'c' as Role });
  const myRole = roles[uid] ?? 'c';
  const guardTeam = Object.values(roles).includes('g');
  const ids = Object.keys(roles);
  let ended = false;
  // ── 진행 (맡은 폰) ──
  const drive = setInterval(() => {
    const RR = S.get<Room>(roomPath(code)); if (!RR || !amDrv(RR)) return;
    const m = bMeta(RR);
    if (isLobby(RR)) {
      const here = activeIds(RR, S.now());
      if (ids.every((u) => here.includes(u)) || (team && m && S.now() > m.t0 + 8000)) { nextStep(S, L, code); if (m && !m.limit) { S.set(`${roomPath(code)}/meta/board/limit`, itemCount(L, RR) * sec() * 1000); S.set(`${roomPath(code)}/meta/board/t0`, S.now()); } }
      return;
    }
    const bp = bPause(RR); if (bp && S.now() - bp.at > pauseMax(bp)) { pauseOff(S, code, RR); return; }
    if ((RR.state as unknown as { bend?: unknown }).bend) return;
    const over = !!m?.limit && timeLeft(RR, S.now()) <= 0 && !bp;
    const here = activeIds(RR, S.now()), who = ids.filter((u) => here.includes(u));
    if (!isEnd(L, RR) && !over && (who.length ? who : [uid]).every((u) => stepDone(L, RR, u))) { nextStep(S, L, code); return; }
    if (isEnd(L, RR) || over) S.set(`${roomPath(code)}/state/bend`, { at: S.now(), clear: !over });
  }, 300);
  // ── 끝 (모든 폰) ──
  $effect(() => {
    const RR = R, be = RR && (RR.state as unknown as { bend?: { clear: boolean } }).bend; if (!RR || !be || ended) return;
    ended = true;
    untrack(() => {
      const f = firstTry(L, RR, uid), res = resultOf(L, RR, uid), tf = ids.reduce((a, u) => { const x = firstTry(L, RR, u); return { ok: a.ok + x.ok, bad: a.bad + x.bad, none: a.none + x.none, total: a.total + x.total }; }, { ok: 0, bad: 0, none: 0, total: 0 });
      const hints = Object.values((RR as unknown as { bh?: Record<string, Record<string, { from: string }>> }).bh || {}).reduce((a, o) => a + Object.values(o || {}).length, 0);
      onend({ drv: amDrvNow(RR), right: res.right, total: res.total, f, tf, grade: gradeOf(tf), clear: be.clear, sec: Math.round(Math.min(elapsedOf(RR), bMeta(RR)?.limit || 1e12) / 1000), hints, R: RR, L });
    });
  });
  const amDrvNow = (RR: Room) => solo || leader(RR, S.now())?.u === uid;
  const elapsedOf = (RR: Room) => { const m = bMeta(RR); return m ? (m.limit || 0) - timeLeft(RR, S.now()) : 0; };
  // 🧪 화면 시험만: 지금 단계를 다 맞히기 · 다 틀리기 (e2e team.cjs · 답 입력 화면 자체는 레이드 e2e 가 시험)
  const hook = {
    solve: () => { const RR = S.get<Room>(roomPath(code)); if (!RR) return; const s = stepOf(L, RR); if (!s) return;
      if (s.kind === 'boss') bossState(L, RR, uid).forEach((x, i) => { if (!x.ok && x.left > 0) bossSubmit(S, L, code, uid, i, answerOf(bossItem(L, RR, uid, i, x.next)!)); });
      else if (isChain(L, RR, s.id)) { for (let k = 0; k < 12; k++) { const r = chainRecord(L, S.get<Room>(roomPath(code))!, s.id, uid); if (r.done || r.fail || r.locked) break; chainSubmit(S, L, code, s.id, uid, r.stage, 0, answerOf(r.items[r.stage]!)); } }
      else { const r = plainRecord(L, RR, s.id, uid); if (!r.perfect && (r.canRetry || !r.submitted)) submit(S, L, code, s.id, uid, itemsFor(L, RR, s.id, uid, r.nextAttempt).map(answerOf)); } },
    miss: () => { const RR = S.get<Room>(roomPath(code)); if (!RR) return; const s = stepOf(L, RR); if (!s || s.kind !== 'monster' || isChain(L, RR, s.id)) return; const r = plainRecord(L, RR, s.id, uid); if (r.canRetry || !r.submitted) submit(S, L, code, s.id, uid, itemsFor(L, RR, s.id, uid, r.nextAttempt).map((q) => (q.type === 'multi' ? [] : -999)) as never); },
  };
  (globalThis as unknown as { __board?: typeof hook }).__board = hook;
  // 🌀 출발 = 파란 포털이 확 열림(0.6 → 1.0 · 0.4초 · 소용돌이 · 바닥 빛 고리 · 「쉬잉」) → 용사가 뛰어듦 → 게시판 던전 (1.1초 · 동작 줄이기 = 크기만)
  let warp = $state(true); sfx('wind', 0.8); setTimeout(() => (warp = false), 1100);
  untrack(() => busy.n++); // 진행 중 = 새 판 저절로 새로 고침 안 함 (#38)
  onDestroy(() => { untrack(() => busy.n--); clearInterval(drive); lr.stop(); });
  // ── 시간 · 멈춤 ──
  const meta = $derived(R ? bMeta(R) : null);
  const bp = $derived(R ? bPause(R) : null);
  const leftMs = $derived(R && meta?.limit ? timeLeft(R, now) : 0);
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const bpLeft = $derived(bp ? Math.max(0, pauseMax(bp) - (now - bp.at)) : 0);
  // ── 팀 줄 (✔ 냄 · ✏ 푸는 중 · 🙋 도와줘 · 💡 힌트 받음) ──
  const help = $derived(((R as unknown as { help?: Record<string, number> })?.help) || {});
  const bh = $derived(((R as unknown as { bh?: Record<string, Record<string, { from: string; at: number }>> })?.bh) || {});
  const statusOf = (u: string) => (!R || isLobby(R) ? '…' : stepDone(L, R, u) ? '✔' : help[u] ? '🙋' : '✏');
  // ── 💡 힌트 ──
  const stuck = $derived(R && !isLobby(R) && !isEnd(L, R) ? stuckItem(L, R, uid) : null);
  const gotHint = $derived(stuck && bh[uid]?.[hintKey(stuck.mid, stuck.k)] ? hintOf(stuck.q) : '');
  let autoHint = $state(''), autoUsed = false, hintOpen = $state(true);
  $effect(() => { // 길잡이: 수호자 없는 팀 · 1인 = 처음 틀렸을 때 💡 한 번 저절로
    if (guardTeam || autoUsed || !R || !stuck) return;
    const tried = (R.subs?.[stuck.mid]?.[uid] && Object.keys(R.subs[stuck.mid]![uid]!).length) || 0;
    if (tried >= 1) { autoUsed = true; autoHint = hintOf(stuck.q); hintOpen = true; }
  });
  $effect(() => { void gotHint; hintOpen = true; });
  const canHint = $derived(!!R && myRole === 'g' && !isLobby(R) && solvedStep(L, R, uid));
  let hintSheet = $state(false), toast = $state('');
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 2000); };
  const others = $derived(ids.filter((u) => u !== uid).sort((a, b) => Number(!!help[b]) - Number(!!help[a])));
  // 「🔁 진행을 ○○가 이어받았어요」 한 줄 (3초)
  let took = $state(''), tookFor = '';
  $effect(() => { const L1 = leader(R, now), d = L1 ? { u: L1.u, from: L1.l.from } : null; if (!d || !d.from) return; const k = `${d.u}|${d.from}`; if (k === tookFor) return; tookFor = k; untrack(() => { took = `🔁 진행을 ${d.u === uid ? '내가' : `${name(d.u)}가`} 이어받았어요`; setTimeout(() => (took = ''), 3500); }); });
  const name = (u: string) => team?.names[u] ?? (u === uid ? nick : u);
</script>

{#if warp}<div class="warp" aria-hidden="true" data-k="warp"><i class="wring"></i><i class="wp" style="background-image:url({CAMP_PORTAL.src})"></i><span class="whero"><HeroSprite id={hero} scale={2} pose="portal" /></span></div>{/if}
<div class="run">
  <div class="tline" aria-label="남은 시간 {mmss(leftMs)}"><i style:width="{meta?.limit ? (leftMs / meta.limit) * 100 : 100}%"></i></div>
  <button type="button" class="quit" aria-label="그만하기" onclick={onquit}>‹</button>
  <span class="tleft">⏱ {meta?.limit ? mmss(leftMs) : '—'}</span>
  {#if !solo}<div class="team" aria-label="팀">{#each ids as u (u)}<span class:me={u === uid}><b>{roles[u] === 'g' ? '🛡' : '🌱'}</b>{statusOf(u)}<small>{u === uid ? '나' : name(u)}</small></span>{/each}</div>{/if}
  <div class="tools">
    {#if myRole === 'g'}
      <button type="button" disabled={!R || !!bp || pausesLeft(R, uid) <= 0} onclick={() => R && pauseOn(S, code, R, uid)}>⏸ 설명 {R ? pausesLeft(R, uid) : 2}</button>
      <button type="button" disabled={!canHint} onclick={() => (hintSheet = true)}>💡 힌트</button>
    {:else}
      {#if !solo}<button type="button" class:on={!!help[uid]} onclick={() => helpOn(S, code, uid, !help[uid])}>🙋 {help[uid] ? '도움 요청 중' : '도와줘'}</button>{/if}
      {#if !guardTeam}<button type="button" disabled={!R || !!bp || thinkUsed(R)} onclick={() => R && pauseOn(S, code, R, uid, true)}>⏸ 생각 1분</button>{/if}
    {/if}
  </div>
  <Student {S} {L} {code} {uid} {num} {nick} {cls} board />
  {#if (gotHint || autoHint) && hintOpen && !bp}
    <div class="hcard" role="status"><b>{gotHint ? '🛡 수호자의 힌트' : '🧭 길잡이 힌트'}</b><p>{gotHint || autoHint}</p><button type="button" aria-label="힌트 닫기" onclick={() => (hintOpen = false)}>✕</button></div>
  {/if}
  {#if bp}
    <div class="cover" role="status"><span class="ic">{bp.think ? '⏸' : '🛡'}</span><b>{bp.think ? '생각 시간' : '수호자가 설명 중'}</b><em>{mmss(bpLeft)}</em><p>시간이 멈췄어요 · 같은 문제를 함께 봐요</p>
      {#if bp.by === uid}<BottomAction text="▶ 다시 시작" onmain={() => R && pauseOff(S, code, R)} />{:else}<BottomAction text="⏸ 멈춤 중" why="멈춘 친구가 다시 시작해요" />{/if}</div>
  {/if}
  {#if toast || took}<p class="toast2" role="status">{toast || took}</p>{/if}
</div>
{#if hintSheet}
  <Sheet onclose={() => (hintSheet = false)}>
    {#snippet title()}💡 힌트 보내기{/snippet}
    <p class="why2">차시 팩 풀이 한 줄을 그 친구의 숫자로 보내요 · 답은 안 보여요 · 친구마다 문제당 1번</p>
    <div class="who">{#each others as u (u)}{@const it = R ? stuckItem(L, R, u) : null}<button type="button" disabled={!it} onclick={() => { if (!R) return; const e = sendHint(S, code, R, L, uid, u); say(e ?? `💡 ${name(u)}에게 보냈어요`); hintSheet = false; }}><b>{help[u] ? '🙋 ' : ''}{name(u)}</b><small>{it ? (help[u] ? '도와줘 요청 · 막힌 문제 있음' : '푸는 중') : '막힌 문제 없음'}</small></button>{/each}</div>
  </Sheet>
{/if}

<style>
  .run { position: fixed; inset: 0; z-index: 18; background: var(--bg); overflow: auto; }
  /* 📝 제출 모드: 위 막대(‹ · 제목 · 게임 | 제출) 아래 한 줄 = 남은 시간 · 도구 (글자만 · 종이 꼴) */
  :global(:root[data-submit]) .quit { background: transparent; color: #1d1d1f; border-radius: 0; }
  :global(:root[data-submit]) .tline { top: 56px; background: #d9dde3; } :global(:root[data-submit]) .tline i { background: #1d1d1f; }
  :global(:root[data-submit]) .tleft { top: 64px; background: transparent; color: #1d1d1f; padding: 0; }
  :global(:root[data-submit]) .tools { top: 62px; right: auto; left: max(16px, calc(50% - 199px)); }
  :global(:root[data-submit]) .tools button { background: #fff; color: #1d1d1f; border: 1px solid #1d1d1f; border-radius: 4px; }
  :global(:root[data-submit]) .team { top: 100px; } :global(:root[data-submit]) .team span { background: #fff; color: #1d1d1f; border: 1px solid #b9b7ae; }
  .tline { position: fixed; left: 0; right: 0; top: 0; height: 3px; z-index: 30; background: rgba(255, 255, 255, 0.12); max-width: 430px; margin: 0 auto; }
  .tline i { display: block; height: 3px; background: var(--accent); transition: width 0.3s linear; }
  .quit { position: fixed; top: 6px; left: max(4px, calc(50% - 211px)); z-index: 30; width: 44px; height: 44px; border: 0; border-radius: 22px; background: rgba(8, 9, 12, 0.55); color: #fff; font-size: 22px; }
  .tleft { position: fixed; top: 14px; right: max(12px, calc(50% - 203px)); z-index: 30; height: 28px; padding: 0 10px; border-radius: 14px; background: rgba(8, 9, 12, 0.6); color: #fff; font: 700 13px var(--font); display: flex; align-items: center; font-variant-numeric: tabular-nums; }
  .team { position: fixed; top: 52px; left: max(8px, calc(50% - 207px)); z-index: 30; display: flex; gap: 4px; }
  .team span { display: flex; flex-direction: column; align-items: center; min-width: 40px; padding: 2px 4px; border-radius: 10px; background: rgba(8, 9, 12, 0.6); color: #fff; font-size: 13px; line-height: 1.2; }
  .team span.me { box-shadow: 0 0 0 2px var(--accent); } .team small { font-size: 10.5px; max-width: 48px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tools { position: fixed; top: 10px; right: max(96px, calc(50% - 119px)); z-index: 30; display: flex; flex-direction: row; gap: 6px; align-items: center; }
  .tools button { height: 32px; padding: 0 10px; border-radius: 16px; white-space: nowrap; border: 1px solid rgba(255, 255, 255, 0.25); background: rgba(8, 9, 12, 0.7); color: #fff; font: 700 13px var(--font); position: relative; }
  .tools button::before { content: ''; position: absolute; inset: -8px -2px; }
  .tools button.on { background: var(--accent); color: var(--on-accent); }
  .tools button:disabled { opacity: 0.45; }
  .hcard { position: fixed; left: max(12px, calc(50% - 203px)); right: max(12px, calc(50% - 203px)); bottom: 104px; z-index: 29; padding: 10px 40px 10px 12px; border-radius: var(--r); background: var(--surface-2); border-left: 4px solid var(--accent); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45); }
  .hcard b { font-size: 13px; color: var(--accent); } .hcard p { margin: 4px 0 0; font-size: 15px; line-height: 1.5; }
  .hcard button { position: absolute; top: 4px; right: 4px; width: 36px; height: 36px; border: 0; background: none; color: var(--text-2); font-size: 16px; }
  .cover { position: fixed; inset: 0; z-index: 32; background: rgba(8, 9, 12, 0.82); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 24px; color: #fff; }
  .cover .ic { font-size: 40px; } .cover b { font-size: 22px; } .cover em { font-style: normal; font-size: 40px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; } .cover p { margin: 0; color: #cfd3db; }
  .toast2 { position: fixed; top: 64px; left: 50%; transform: translateX(-50%); z-index: 33; margin: 0; padding: 8px 14px; border-radius: 12px; background: var(--surface); font-weight: 700; white-space: nowrap; }
  .why2 { margin: 0; font-size: 13px; color: var(--text-2); }
  .who { display: flex; flex-direction: column; gap: 6px; }
  .who button { min-height: 56px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: inherit; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 0 14px; }
  .who button:disabled { opacity: 0.45; } .who small { font-size: 12.5px; color: var(--text-2); }
  .warp { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; background: radial-gradient(circle at 50% 55%, rgba(30, 60, 140, 0.55), rgba(5, 8, 20, 0.92) 70%); animation: wfade 1.1s ease-in forwards; pointer-events: none; }
  .wp { grid-area: 1 / 1; width: 46vmin; aspect-ratio: 200 / 300; background-size: 100% 100%; image-rendering: pixelated; animation: wopen 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both, wspin 0.7s 0.4s linear; filter: drop-shadow(0 0 18px rgba(110, 190, 255, 0.9)); }
  .wring { grid-area: 1 / 1; align-self: start; margin-top: calc(50vh + 27vmin); width: 52vmin; aspect-ratio: 3 / 1; border-radius: 50%; border: 4px solid rgba(130, 205, 255, 0.95); box-shadow: 0 0 18px rgba(130, 205, 255, 0.9); animation: wring 0.8s ease-out both; }
  .whero { grid-area: 1 / 1; align-self: start; margin-top: calc(50vh + 30vmin); animation: wjump 0.7s 0.35s cubic-bezier(0.5, 0, 0.8, 0.4) both; }
  @keyframes wopen { from { transform: scale(0.6) rotate(-50deg); } to { transform: scale(1) rotate(0); } }
  @keyframes wspin { 50% { transform: scale(1.06) rotate(6deg); } }
  @keyframes wring { from { transform: translateY(-50%) scale(0.2); opacity: 1; } to { transform: translateY(-50%) scale(1.3); opacity: 0; } }
  @keyframes wjump { 0% { transform: none; opacity: 1; } 40% { transform: translateY(-18vmin) scale(1.05); } 100% { transform: translateY(-34vmin) scale(0.15); opacity: 0; } }
  @keyframes wfade { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .wp, .wring, .whero { animation: none; } .wring { display: none; } }
</style>
