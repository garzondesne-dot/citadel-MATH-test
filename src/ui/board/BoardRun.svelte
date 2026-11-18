<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { busy } from '../busy.svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { memoryStore } from '../../store/device';
  import { bossSubmit, chainSubmit, nextStep, openRoom, roomPath, submit } from '../../raid/actions';
  import { SUBJ } from '../../engine/subject';
  import { MIS } from '../../school/dash';
  import { activeIds, answerOf, bossItem, bossState, chainRecord, isChain, isEnd, isLobby, itemsFor, plainRecord, resultOf, stepOf } from '../../raid/raid';
  import { boardPack, END_MS, firstTry, freshAll, gradeOf, itemCount, SEC_PER_ITEM, stepDone } from '../../board/board';
  import { bMeta, bPause, helpOn, hintKey, hintOf, itemSolved, markPauseHelp, pauseMax, pauseOff, pauseOn, pausesLeft, raiseStrong, rescuesOf, sendHint, seOf, solvedStep, strongOf, stuckItem, thinkUsed, timeLeft, type Role, type SeAlert } from '../../board/team';
  import { liveRoom } from '../room.svelte';
  import Student from '../Student.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import { clock } from '../clock.svelte';
  import { CAMP_PORTAL } from '../manifest';
  import { sfx } from '../sound.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import { mateHits, matesOf, mateSnaps, type MateHit } from './mates';

  // 📋 게시판 던전 전투 (#143 ⑨ ⑨-1 ⑨-2 ⑩): 레이드 학생 전투 화면(Student) 그대로 + 위 시간 선 · 팀 줄 · 도구(⏸ · 💡 · 🙋) · 덮개
  //   1인 = 이 폰 안(메모리) 방 · 끊겨도 계속 / 팀 = 서버 방 rooms/T… · 진행(다음 · 끝 · 멈춤 2분)은 글 올린 폰이 맡음
  //   🛡 수호자 = ⏸ 설명 2번(2분) · 💡 힌트(그 문제를 먼저 다 맞힌 뒤 · 친구마다 문제당 1번) / 🌱 도전자 = 🙋 도와줘 / 수호자 없는 팀 · 1인 = 길잡이(💡 자동 1번 + ⏸ 생각 1분 1번)
  type End = { /** 👋 끝까지 남았나 · 끝날 때 인원 */ stay: boolean; nEnd: number; drv: boolean; right: number; total: number; f: ReturnType<typeof firstTry>; tf: ReturnType<typeof firstTry>; grade: string; clear: boolean; sec: number; hints: number; R: Room; L: LessonPack; /** 🤝 구조 (수호자로 · 도전자로 · 완전 구조) */ rescue: { g: number; c: number; full: number } };
  const { L0, uid, num, nick, cls, team = null, onend, onquit, hero = 0 }: {
    L0: LessonPack; uid: string; num: number; nick: string; cls: string; hero?: number;
    team?: { S: Store; code: string; host: boolean; roles: Record<string, Role>; names: Record<string, string>; /** 🛡 #78 첫 수호자 = 지휘실 화면 */ cmd?: boolean; /** 👥 팀 글 용사 (방 소식이 오기 전) */ heroes?: Record<string, number> } | null;
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
  const guardTeam = Object.values(roles).includes('g'); // 처음부터 수호자가 있던 팀 (🌱 용기 보너스 판단 · 꼼수 막기)
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
    if (isEnd(L, RR) || over) S.set(`${roomPath(code)}/state/bend`, { at: S.now(), clear: !over, who: (who.length ? who : [uid]) }); // 👋 끝날 때 남은 사람 = 클리어 보상 · 팀 배수 (📜 2026-11-14 「파티원이 나가도 계속」)
  }, 300);
  // ── 끝 (모든 폰) ── 🐞 (📜 2026-11-14 「결과 보는 게 너무 빨리 지나가」): 끝 신호를 받으면 그 순간 기록을 붙잡아 두고
  //   ⚔ 처치! / ⌛ 시간 끝 장면을 2초 보여 준 뒤(누르면 바로) 결과로 — 팀 친구가 먼저 넘어가도 이 폰 결과는 붙잡은 기록 그대로
  let endShow = $state<{ clear: boolean } | null>(null), endT: ReturnType<typeof setTimeout> | undefined, endGo: (() => void) | null = null;
  $effect(() => {
    const RR = R, be = RR && (RR.state as unknown as { bend?: { clear: boolean; who?: string[] } }).bend; if (!RR || !be || ended) return;
    ended = true;
    untrack(() => {
      const f = firstTry(L, RR, uid), res = resultOf(L, RR, uid), tf = ids.reduce((a, u) => { const x = firstTry(L, RR, u); return { ok: a.ok + x.ok, bad: a.bad + x.bad, none: a.none + x.none, total: a.total + x.total }; }, { ok: 0, bad: 0, none: 0, total: 0 });
      const hints = Object.values((RR as unknown as { bh?: Record<string, Record<string, { from: string }>> }).bh || {}).reduce((a, o) => a + Object.values(o || {}).length, 0);
      const rz = solo ? [] : rescuesOf(L, RR, roles), rescue = { g: rz.filter((x) => x.g === uid).length, c: rz.filter((x) => x.c === uid).length, full: rz.filter((x) => x.g === uid && x.full).length };
      const stay = solo || !be.who || be.who.includes(uid), nEnd = solo ? 1 : (be.who?.length || ids.length);
      const out = { stay, nEnd, drv: amDrvNow(RR), right: res.right, total: res.total, f, tf, grade: gradeOf(tf), clear: be.clear, sec: Math.round(Math.min(elapsedOf(RR), bMeta(RR)?.limit || 1e12) / 1000), hints, R: RR, L, rescue };
      let done = false; endGo = () => { if (done) return; done = true; clearTimeout(endT); onend(out); };
      endShow = { clear: be.clear }; sfx(be.clear ? 'finish' : 'game-no', 0.8); endT = setTimeout(() => endGo?.(), END_MS);
    });
  });
  onDestroy(() => clearTimeout(endT));
  const amDrvNow = (RR: Room) => solo || leader(RR, S.now())?.u === uid;
  const elapsedOf = (RR: Room) => { const m = bMeta(RR); return m ? (m.limit || 0) - timeLeft(RR, S.now()) : 0; };
  // 🧪 화면 시험만: 지금 단계를 다 맞히기 · 다 틀리기 (e2e team.cjs · 답 입력 화면 자체는 레이드 e2e 가 시험)
  const myUid = untrack(() => uid);
  //   👥 u = 그 팀원 대신 (e2e boardmates.cjs · 동료 공격 연출 시험)
  const hook = {
    solve: (uid0?: string) => { const uid = uid0 || myUid; const RR = S.get<Room>(roomPath(code)); if (!RR) return; const s = stepOf(L, RR); if (!s) return;
      if (s.kind === 'boss') bossState(L, RR, uid).forEach((x, i) => { if (!x.ok && x.left > 0) bossSubmit(S, L, code, uid, i, answerOf(bossItem(L, RR, uid, i, x.next)!)); });
      else if (isChain(L, RR, s.id)) { for (let k = 0; k < 12; k++) { const r = chainRecord(L, S.get<Room>(roomPath(code))!, s.id, uid); if (r.done || r.fail || r.locked) break; chainSubmit(S, L, code, s.id, uid, r.stage, 0, answerOf(r.items[r.stage]!)); } }
      else { const r = plainRecord(L, RR, s.id, uid); if (!r.perfect && (r.canRetry || !r.submitted)) submit(S, L, code, s.id, uid, itemsFor(L, RR, s.id, uid, r.nextAttempt).map(answerOf)); } },
    miss: (uid0?: string) => { const uid = uid0 || myUid; const RR = S.get<Room>(roomPath(code)); if (!RR) return; const s = stepOf(L, RR); if (!s || s.kind !== 'monster' || isChain(L, RR, s.id)) return; const r = plainRecord(L, RR, s.id, uid); if (r.canRetry || !r.submitted) submit(S, L, code, s.id, uid, itemsFor(L, RR, s.id, uid, r.nextAttempt).map((q) => (q.type === 'multi' ? [] : -999)) as never); },
  };
  (globalThis as unknown as { __board?: typeof hook }).__board = hook;
  // 👥 동료 (📜 2026-11-14 선생님 「게시판 레이드 전투 화면에 동료들 표시 · 동료들 공격하는 장면」): 팀만 · 1인 = 나만(그대로)
  //   공격 사건 = TV 와 같은 snapOf · hitsOf (동료 기록이 늘 때) → 장면 띠가 줄 세워 하나씩 연출
  const mates = $derived(solo ? [] : matesOf(ids, uid, R, team?.names ?? {}, team?.heroes));
  let mateFeed = $state<MateHit[]>([]), mseen: ReturnType<typeof mateSnaps> = null, mk = 0;
  $effect(() => {
    const RR = R; if (solo || !RR) return;
    const now0 = mateSnaps(L, RR, ids.filter((u) => u !== uid));
    untrack(() => { if (!now0) { mseen = null; return; } const hs = mateHits(mseen, now0, mk); mseen = now0; if (hs.length) { mk = hs[hs.length - 1]!.k; mateFeed = [...mateFeed, ...hs].slice(-12); } });
  });
  // 🌀 출발 = 파란 포털이 확 열림(0.6 → 1.0 · 0.4초 · 소용돌이 · 바닥 빛 고리 · 「쉬잉」) → 용사가 뛰어듦 → 게시판 던전 (1.1초 · 동작 줄이기 = 크기만)
  let warp = $state(true); sfx('portal', 0.8); setTimeout(() => (warp = false), 1100);
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
    if (guardHere || autoUsed || !R || !stuck) return;
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
  // 👋 파티원이 나가도 계속 (📜 2026-11-14 선생님 「중간에 파티원이 나가면 저절로 나머지 파티원끼리 진행 · 혼자 남으면 혼자」): 진행은 이미 「지금 있는 사람」만 기다림
  //   남은 화면 = 「👋 ○○ 이(가) 나갔어요 · 남은 n명이 이어서」 한 줄 · 🛡 수호자가 다 나가면 = 🔮 길잡이(💡 자동 · ⏸ 생각) 열림
  const here = $derived(solo || !R ? ids : activeIds(R, now).filter((u) => ids.includes(u)));
  const guardHere = $derived(guardTeam && here.some((u) => roles[u] === 'g'));
  let wasHere = new Set<string>(), leftSeen = new Set<string>();
  $effect(() => { const h = here; if (solo || !R || isLobby(R)) return; untrack(() => {
    for (const u of wasHere) if (!h.includes(u) && u !== uid && !leftSeen.has(u)) { leftSeen.add(u); const n = h.length; say(n <= 1 ? `👋 ${iGa(name(u))} 나갔어요 · 혼자 이어서` : `👋 ${iGa(name(u))} 나갔어요 · 남은 ${n}명이 이어서`); }
    for (const u of h) { wasHere.add(u); leftSeen.delete(u); }
  }); });
  const iGa = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? `${w}${(c - 0xac00) % 28 ? '이' : '가'}` : `${w}이(가)`; };
  // 🚨 강적 출현 · 🤝 구조 (📜 DECISIONS 2026-11-14 · board/team.ts strongOf · rescuesOf)
  //   도전자 폰 = 막 뜬 소문제가 그 차시 · 몬스터 수업 기록이 없거나(A) 못 맞혔는데 복습 전(B)이면 알림 한 번(이유는 이 폰에만 · 서버엔 안 적음)
  //   팀 모두 = 그 몬스터 붉은 맥박 + 경보음 · 수호자 폰 = 진동 + 위 띠 「🚨 강적 출현! ○○ 를 도와주세요」 + 💡 · ⏸ 바로 단추
  /** 받침 있으면 「을」 · 없으면 「를」 (한글이 아니면 「을(를)」) */
  const eulReul = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? `${w}${(c - 0xac00) % 28 ? '을' : '를'}` : `${w}을(를)`; };
  const raised = new Set<string>();
  $effect(() => {
    const it = stuck, RR = R; if (solo || !guardHere || myRole === 'g' || !it || !RR || isLobby(RR)) return;
    untrack(() => {
      const key = hintKey(it.mid, it.k); if (raised.has(key) || seOf(RR)[uid]?.[key]) return; raised.add(key);
      const why = strongOf(S.get(`records/${cls}/${num}/${L0.id}`), S.get(`bonus/${cls}/${num}/review/${L0.id}`), it.mid, it.k);
      if (why) raiseStrong(S, code, uid, { mid: it.mid, k: it.k, at: S.now() });
    });
  });
  const se = $derived(seOf(R));
  const curMid = $derived(R && !isLobby(R) && !isEnd(L, R) ? (stepOf(L, R)?.kind === 'boss' ? 'boss' : stepOf(L, R)?.id ?? '') : '');
  const open = $derived(!R ? [] : Object.entries(se).flatMap(([c, list]) => Object.values(list || {}).filter((a): a is SeAlert => !!a && !itemSolved(L, R!, c, a.mid, a.k)).map((a) => ({ c, a }))));
  const pulse = $derived(open.some((x) => x.a.mid === curMid));
  const heard = new Set<string>();
  $effect(() => { const list = open; untrack(() => { for (const x of list) { const k = `${x.c}|${x.a.mid}_${x.a.k}`; if (heard.has(k)) continue; heard.add(k); sfx('mon-appear-boss', 0.9); if (myRole === 'g' && x.c !== uid) { try { navigator.vibrate?.([200, 100, 200]); } catch { /* 무시 */ } } } }); });
  let shut = $state<Record<string, true>>({});
  const alert = $derived(myRole === 'g' ? open.filter((x) => x.c !== uid && !shut[`${x.c}|${x.a.mid}_${x.a.k}`]).sort((p, q) => q.a.at - p.a.at)[0] ?? null : null);
  function helpHint(c: string) { if (!R) return; if (!canHint) { say('이 문제를 먼저 다 맞히면 힌트를 보낼 수 있어요'); return; } const e = sendHint(S, code, R, L, uid, c); say(e ?? `💡 ${name(c)}에게 보냈어요`); }
  // 🛡 #78 지휘실 (첫 수호자 폰만 · 📜 2026-11-18): 위 = 전투(약 45%) · 아래 = 도전자마다 지금 문제 · 상태 + ⏸ 설명 · 💡 힌트 · 🎬 시연(직접 풀기 → ↩ 지휘실)
  //   다른 팀원 화면 = 그대로 · 진행은 지금처럼 모두가 풀어야 넘어감 → 내 문제는 🎬 시연으로 풂
  let demo = $state(false);
  const cmdOn = $derived(!solo && !!team?.cmd && myRole === 'g' && !demo && !!R && !isLobby(R) && !isEnd(L, R));
  const chall = $derived(ids.filter((u) => u !== uid && roles[u] === 'c'));
  const triesOf = (u: string, it: { mid: string; k: number } | null) => { if (!R || !it) return 0; const v = (R.subs?.[it.mid]?.[u] || {}) as Record<string, unknown>; return Object.keys(v).length; };
  /** 남은 기회 · 마지막 오개념 (보통 몬스터만 · 소레이드 · 형성평가 = 시도 수만) */
  function cmdInfo(u: string, it: { mid: string; k: number; q: unknown } | null): { left: number | null; mis: string } {
    if (!R || !it || it.mid === 'boss' || !L.monsters[it.mid] || isChain(L, R, it.mid)) return { left: null, mis: '' };
    const r = plainRecord(L, R, it.mid, u), last = r.tries[r.tries.length - 1], ML = SUBJ.misLogic;
    let mis = '';
    if (ML && last && !last.marks[it.k]) { const q = itemsFor(L, R, it.mid, u, last.attempt)[it.k]; if (q) { const c = ML.classify(q, (last.given || [])[it.k])[0]; if (c) mis = `${c} ${MIS[c]?.name ?? ''}`.trim(); } }
    return { left: r.left, mis };
  }
  const qShort = (q: unknown) => String((q as { question?: string })?.question ?? '').replace(/\s+/g, ' ').slice(0, 90);
  function helpPause(c: string, a: SeAlert) { if (!R) return; if (bp || pausesLeft(R, uid) <= 0) { say('⏸ 설명을 더 쓸 수 없어요'); return; } markPauseHelp(S, code, uid, c, a); pauseOn(S, code, R, uid); }
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
      {#if !guardHere}<button type="button" disabled={!R || !!bp || thinkUsed(R)} onclick={() => R && pauseOn(S, code, R, uid, true)}>⏸ 생각 1분</button>{/if}
    {/if}
  </div>
  <Student {S} {L} {code} {uid} {num} {nick} {cls} board {mates} {mateFeed} />
  {#if cmdOn && R}
    <section class="cmd" data-k="cmd-room" aria-label="지휘실">
      <header><b>🛡 지휘실</b><small>도전자 {chall.length}명 · 내 문제는 🎬 시연으로</small></header>
      {#each chall as u (u)}{@const it = stuckItem(L, R, u)}{@const al = open.find((x) => x.c === u)}{@const ci = cmdInfo(u, it)}
        <div class="cc" class:sos2={!!al} class:hand={!!help[u]} data-k="cmd-card">
          <div class="ch"><b>{help[u] ? '🙋 ' : ''}{name(u)}</b><span>{statusOf(u)} {stepDone(L, R, u) ? '다 풂' : it ? (ci.left != null ? `남은 기회 ${ci.left}` : `시도 ${triesOf(u, it)}`) : '푸는 중'}{al ? ' · 🚨 강적' : ''}</span></div>
          <p class="cq">{it ? qShort(it.q) : stepDone(L, R, u) ? '✔ 이 단계 끝' : '…'}</p>
          {#if ci.mis}<p class="cm" data-k="cmd-mis">🔎 마지막 오개념 · {ci.mis}</p>{/if}
          <div class="cb"><button type="button" disabled={!!bp || pausesLeft(R, uid) <= 0} onclick={() => (al ? helpPause(u, al.a) : R && pauseOn(S, code, R, uid))}>⏸ 설명 {pausesLeft(R, uid)}</button><button type="button" disabled={!canHint || !it} onclick={() => helpHint(u)}>💡 힌트</button><button type="button" data-k="cmd-demo" onclick={() => (demo = true)}>🎬 시연</button></div>
        </div>
      {:else}<p class="cq">도전자가 없어요 · 🎬 시연으로 함께 풀어요</p>{/each}
    </section>
  {/if}
  {#if demo && !solo && team?.cmd}<button type="button" class="back2" data-k="cmd-back" onclick={() => (demo = false)}>↩ 지휘실</button>{/if}
  {#if pulse}<div class="rage" aria-hidden="true" data-k="strong-pulse"></div>{/if}
  {#if alert}<div class="sos" role="alert" data-k="strong-alert"><b>🚨 강적 출현! {eulReul(name(alert.c))} 도와주세요</b><span class="sb"><button type="button" onclick={() => helpHint(alert.c)}>💡 힌트 보내기</button><button type="button" onclick={() => helpPause(alert.c, alert.a)}>⏸ 설명 멈춤</button><button type="button" class="sx" aria-label="알림 닫기" onclick={() => (shut = { ...shut, [`${alert.c}|${alert.a.mid}_${alert.a.k}`]: true })}>✕</button></span></div>{/if}
  {#if (gotHint || autoHint) && hintOpen && !bp}
    <div class="hcard" role="status"><b>{gotHint ? '🛡 수호자의 힌트' : '🧭 길잡이 힌트'}</b><p>{gotHint || autoHint}</p><button type="button" aria-label="힌트 닫기" onclick={() => (hintOpen = false)}>✕</button></div>
  {/if}
  {#if bp}
    <div class="cover" role="status"><span class="ic">{bp.think ? '⏸' : '🛡'}</span><b>{bp.think ? '생각 시간' : '수호자가 설명 중'}</b><em>{mmss(bpLeft)}</em><p>시간이 멈췄어요 · 같은 문제를 함께 봐요</p>
      {#if bp.by === uid}<BottomAction text="▶ 다시 시작" onmain={() => R && pauseOff(S, code, R)} />{:else}<BottomAction text="⏸ 멈춤 중" why="멈춘 친구가 다시 시작해요" />{/if}</div>
  {/if}
  {#if toast || took}<p class="toast2" role="status">{toast || took}</p>{/if}
  {#if endShow}<button type="button" class="endov" class:x={!endShow.clear} data-k="board-endov" onclick={() => endGo?.()}><b>{endShow.clear ? '⚔ 처치!' : '⌛ 시간 끝'}</b><small>누르면 결과</small></button>{/if}
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
  .endov { position: fixed; inset: 0; z-index: 30; border: 0; background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--accent) 22%, var(--bg)) 0%, var(--bg) 62%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #fff; font-family: var(--font); animation: endin 0.18s ease-out; }
  .endov b { font-size: 40px; font-weight: 800; text-shadow: 0 3px 0 #000, 0 0 18px var(--accent); }
  .endov.x b { text-shadow: 0 3px 0 #000; }
  .endov small { font-size: 15px; font-weight: 700; opacity: 0.85; }
  @keyframes endin { from { opacity: 0; transform: scale(1.06); } }
  /* 🚨 강적 = 장면 띠(몬스터 자리) 붉은 맥박 · 누름은 막지 않음 */
  .rage { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: min(100%, 430px); height: 280px; z-index: 5; pointer-events: none; background: radial-gradient(ellipse at 70% 55%, rgba(240, 40, 40, 0.55), rgba(240, 40, 40, 0) 60%); animation: rage 1.1s ease-in-out infinite; }
  @keyframes rage { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .rage { animation: none; opacity: 0.6; } }
  .sos { position: fixed; top: 96px; left: max(8px, calc(50% - 207px)); right: max(8px, calc(50% - 207px)); z-index: 31; padding: 8px 10px; border-radius: var(--r); background: #4a1013; border: 2px solid var(--bad); color: #fff; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; gap: 6px; }
  .sos b { font-size: 15px; } .sos .sb { display: flex; gap: 6px; }
  .sos button { flex: 1; min-height: 44px; border-radius: var(--r-sm); border: 0; background: rgba(255, 255, 255, 0.14); color: #fff; font: 700 14px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45); }
  .sos button.sx { flex: none; width: 44px; background: transparent; box-shadow: none; }
  /* 🛡 #78 지휘실 = 아래 55% (위 45% = 전투 장면) */
  .cmd { position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: min(100%, 430px); height: 55vh; z-index: 28; overflow: auto; padding: 10px 12px calc(12px + env(safe-area-inset-bottom)); background: var(--surface); border-radius: 20px 20px 0 0; border-top: 2px solid var(--accent); box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; gap: 8px; }
  .cmd header { display: flex; align-items: baseline; gap: 8px; } .cmd header b { font-size: 16px; } .cmd header small { font-size: 13px; color: var(--text-2); }
  .cc { padding: 10px; border-radius: 12px; background: var(--surface-2); border-left: 4px solid var(--line); display: flex; flex-direction: column; gap: 6px; }
  .cc.hand { border-left-color: var(--accent); } .cc.sos2 { border-left-color: var(--bad); }
  .ch { display: flex; justify-content: space-between; gap: 8px; } .ch b { font-size: 15px; } .ch span { font-size: 13px; color: var(--text-2); }
  .cq { margin: 0; font-size: 14px; line-height: 1.45; color: var(--text); } .cm { margin: 0; font-size: 13px; color: var(--bad); }
  .cb { display: flex; gap: 6px; } .cb button { flex: 1; min-height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 14px var(--font); box-shadow: 0 3px 0 var(--line); }
  .cb button:disabled { opacity: 0.45; box-shadow: none; }
  .back2 { position: fixed; right: max(12px, calc(50% - 203px)); bottom: 96px; z-index: 31; min-height: 48px; padding: 0 16px; border-radius: 24px; border: 0; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 15px var(--font); box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 55%, #000); }
</style>
