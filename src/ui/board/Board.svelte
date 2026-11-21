<script lang="ts">
  import { FAME, fameLv, fameOf, MAP_PTS, mapLessons, nextFame, noteLeftByNo, starTotal, starsByNo, STAR_TITLES, legendOf, type BoardRec } from '../../board/goals';
  import { QBOARD } from '../../school/quest';
  import { SUBJ } from '../../engine/subject';
  const questOf = (no: number) => SUBJ.quests?.[no] ?? null;
  type Btab = 'go' | 'war' | 'rec';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { meLookId, type Me } from '../../store/me.svelte';
  import { PACKS } from '../../engine/packs';
  import { heroOf } from '../../model/hero';
  import { earnDaily } from '../../model/wallet';
  import { END_MS, GEM, gradeOf, kstDay, TEAM_X, type firstTry, BOARD_DAY, BOARD_FULL, boardDayUsed, boardTake } from '../../board/board';
  import { bonusOf, RESCUE, canJoin, canStart, createPost, overCap, hasGuard, joinLocked, joinPost, leavePost, myPin, MAX, membersOf, POSTS, roleOf, setReady, startTeam, beat, sweepAll, sweepOf, LIFE, type Post, type Role } from '../../board/team';
  import { addRun, growList, growOf, guardList, rowsOf, semOf, viewOf, GS, type Agg } from '../../board/ladder';
  import { liveValue } from '../room.svelte';
  import { isBeta, uidOf } from '../../school/school';
  import { doneNo } from '../../school/progress';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import BoardRun from './BoardRun.svelte';
  import WarBar from './WarBar.svelte';
  import AtbNet from './atb/AtbNet.svelte';
  import { atbOnline, isAtb, prevStars, saveAtbResult, startAtb, type AtbEnd, type Grow } from '../../board/atbLink';
  import { knightOf, payOn, standings, weekOf } from '../../board/war';
  import { josa } from '../../board/josa';
  import { resvDays, resvLabel } from '../../board/resv';
  import { RESV, resvWaiting } from '../../board/team';
  import { isAwakened, ladder } from '../../model/hero';
  import { levelOf } from '../../school/reward';
  import { tierOf } from '../../board/atb/heroes';
  import RuneKeypad from '../q/RuneKeypad.svelte';
  import { sfx } from '../sound.svelte';
  import { clock } from '../clock.svelte';

  // 📋 게시판 던전 (#143 ⑥ ⑥-1 ⑦ ⑧ ⑪ ⑫ ⑬ · 허수아비 자리): 전체 게시판 하나 · 차시 칩 = 내가 거르기 · 진도 전 = 🔒 · 모집 글 = 「n차시 · k / 4」 + 반 꼬리표 + 🛡 있음 / 🌱 도전자만(이름 · 번호 없음)
  //   ⚔ 혼자 시작 › · ＋ 모집 글 → 차시 고르기 시트 · 내 반 수업 중 = 모집 · 합류만 막힘 · 다른 반도 합류(그 차시 진도를 나간 학생만) · 서버가 끊기면 팀 단추만 흐림
  const { S, me, save, uid, num, cls, open, onclose, joinPid = '', onquest, trial = null }: { S: Store; me: Me; save: () => void; uid: string; num: number; cls: string; open: boolean; onclose: () => void; /** 👩‍🏫 #66-8 체험판 = 같은 화면 · 체험 차시만 열림 · 혼자 도전(봇 3 · 기록 없음)만 · 팀 모집 · 기사단 없음 */ trial?: { ids: string[]; onsolo: (L: LessonPack) => void } | null; /** ✏ #75 친구 문제 → 출제 공방 「📜」 */ onquest?: () => void; /** 🌀 캠프 포털 · 게시판 말풍선에서 = 그 모집 방에 바로 참여 (📜 2026-11-15 캠프 A) */ joinPid?: string } = $props();
  const qN = $derived(Object.keys((cls ? S.get<Record<string, unknown>>(QBOARD(cls)) : null) || {}).length); // ✏ #75
  const KEY = 'citadel-v1-board-chip';
  let chip = $state<number | 'all'>(untrack(() => { try { const v = localStorage.getItem(KEY); return v && v !== 'all' ? Number(v) : 'all'; } catch { return 'all'; } }));
  const setChip = (c: number | 'all') => { chip = c; try { localStorage.setItem(KEY, String(c)); } catch { /* 무시 */ } };
  // 진도: 그 차시 수업 기록이 있거나 · 기록이 있는 가장 뒤 차시까지 (반이 없는 기기 = 모두)
  const recs = untrack(() => (cls && num ? S.get<Record<string, { right?: number; total?: number; boss?: number | { ok?: number; items?: number }; bossN?: number; mons?: Record<string, unknown> }>>(`records/${cls}/${num}`) : null)) || {};
  // 반 진도 = 그 반이 마지막으로 연 차시(school/last · held · 🧪 테스트는 안 셈 #30) · 내 수업 기록 중 큰 것
  const reach = Math.max(0, ...Object.keys(recs).map((id) => PACKS.find((p) => p.id === id)?.no ?? 0), untrack(() => doneNo(S, cls))); // 📚 #25 진행한 최대 차시 · #30 🧪 테스트로 연 차시는 안 셈
  const LESSONS = PACKS.filter((p) => (p.steps.some((s) => s.kind === 'monster') || p.boss));
  // 나눈 차시(7차시)는 정식 기록이 원래 차시 칸에 있음(정식 6차시 기록의 u4 ~ u7 = v1.0 7차시 · 출시 전 메모 10)
  const recOf = (p: LessonPack) => recs[p.id] ?? (p.partOf && Object.keys(recs[p.partOf]?.mons || {}).some((k) => p.steps.some((s) => s.id === k)) ? recs[p.partOf] : undefined);
  const isOpen = (p: LessonPack | null | undefined) => !!p && (trial ? trial.ids.includes(p.id) : !cls || !!recOf(p) || p.no <= reach);
  // 🗺 #66 탭 3 · 고른 차시 = 지난번 고른 차시(이 기기 기억) · 없으면 진도 맨 끝
  const BTABS: [Btab, string][] = [['go', '🗺 출정'], ['war', '🏆 기사단'], ['rec', '📜 기록']];
  let btab = $state<Btab>('go');
  const sel = $derived(LESSONS.find((p) => p.no === chip) ?? LESSONS.filter(isOpen).at(-1) ?? LESSONS[0] ?? null);
  const lessonOf = (id: string) => PACKS.find((p) => p.id === id) ?? null;
  // ⑬ 서버 연결 (시험 서버 = .info/connected · 이 기기 = 늘 됨)
  let online = $state(true);
  const netOff = untrack(() => { const s = S as Store & { onNet?: (fn: (n: { connected: boolean }) => void) => () => void }; return s.onNet ? s.onNet((n) => (online = n.connected)) : () => {}; });
  onDestroy(netOff);
  const pv = untrack(() => liveValue<Record<string, Post>>(S, POSTS));
  onDestroy(pv.stop);
  // ⏱ #76 저절로 닫기: 30초마다 이 폰이 살펴 정리(해산 · 방장 넘김 · 손 놓은 판 끝 · 끝난 글 하루 뒤 지움) · 정리될 글은 목록에서 바로 뺌
  let tick = $state(0);
  const swT = setInterval(() => { tick++; if (online) sweepAll(S, untrack(() => pv.v.val), S.now()); }, LIFE.sweep); onDestroy(() => clearInterval(swT));
  queueMicrotask(() => { if (untrack(() => online)) sweepAll(S, untrack(() => pv.v.val), S.now()); });
  const posts = $derived.by(() => { void tick; const now = S.now(); return Object.values(pv.v.val || {}).filter((p) => p && p.mem && p.phase !== 'done' && !(sweepOf(p, now)?.kind === 'dissolve' || sweepOf(p, now)?.kind === 'end')).sort((a, b) => b.at - a.at); });
  const shown = $derived(posts.filter((p) => p.phase === 'wait' && !p.solo && (!sel || p.no === sel.no)));
  // 📡 #48 판이 끝나 글이 done 이 되어도 내 결과를 아직 못 봤으면 그 글 그대로 (한 폰이 먼저 「게시판으로」 눌러도 다른 폰 결과 화면이 사라지지 않게)
  const mine = $derived(posts.find((p) => !!p.mem?.[uid] && !resvWaiting(p, S.now())) /* 📅 #73 예약 판 = 시각 전엔 목록에만 */ ?? Object.values(pv.v.val || {}).find((p) => p && p.phase === 'done' && isAtb(p) && !!p.mem?.[uid] && !seen.includes(p.pid)) ?? null);
  // 🐞 #47 동시에 눌러 정원을 넘었으면 늦게 온 나부터 빠짐 (모든 기기가 같은 줄 · 규칙 바꿈 없음)
  $effect(() => { const p = mine; if (!p || !overCap(p, uid)) return; untrack(() => { S.set(`${POSTS}/${p.pid}/mem/${uid}`, null); say('방이 꽉 찼어요 · 다른 방을 골라요'); }); });
  // ⏱ #76 내 숨: 대기 · 진행 중 20초마다 (방장이 1분 끊기면 다른 팀원에게 넘어감)
  const mineB = $derived(mine && (mine.phase === 'wait' || mine.phase === 'play') ? mine.pid : '');
  $effect(() => { const pid = mineB; if (!pid) return; const go = () => { const p = untrack(() => pv.v.val?.[pid]); if (p) beat(S, p, uid); }; go(); const t = setInterval(go, LIFE.beat); return () => clearInterval(t); });
  // 🔊 2차 📋 새 모집 글 (베타만): 처음 받은 글은 기억만 · 그 뒤 남의 새 모집 글이 생기면 한 번
  let seenPid: Set<string> | null = untrack(() => (pv.v.val != null ? new Set(Object.keys(pv.v.val)) : null));
  const t0 = Date.now();
  $effect(() => {
    const val = pv.v.val, wait = posts.filter((p) => p.phase === 'wait' && !p.solo && !p.mem?.[uid]).map((p) => p.pid);
    untrack(() => {
      if (!seenPid) { if (val != null || Date.now() - t0 > 2000) seenPid = new Set(Object.keys(val || {})); return; } // 서버 첫 값 = 기억만
      const nw = wait.filter((id) => !seenPid!.has(id)); Object.keys(val || {}).forEach((id) => seenPid!.add(id));
      if (nw.length) sfx('board', 0.8);
    });
  });
  const lkB = $derived(meLookId(me)); // 🌟 #29 보이는 모습 (각성한 로안 16) — 동료 · 게시글 · 달리기 화면
  // 🧙 #48 판에 들고 가는 내 용사 (ATB 메타 = 레벨 · 강화 · 장착 스킬 등급 · 각성) — 글 mem/{uid}/g
  const growM = $derived.by((): Grow => { const h = me.hero, fx = me.socket?.[h] || (ladder(h)[0] as string | undefined); return { h, lv: levelOf(me.xp || 0), enh: me.enh || 0, tier: tierOf(h, fx), ...(fx ? { fx } : {}), ...(isAwakened(me as never) ? { awk: true } : {}) }; });
  const meM = $derived({ uid, cls: cls || (S.kind === 'server' ? '선생님' : '이 기기'), num, nick: me.nick, hero: lkB, fame: fameNow(), g: growM });
  function fameNow() { return cls && num ? fameOf(S.get(`bonus/${cls}/${num}/board`) as Record<string, BoardRec> | null) : 0; }
  let sheet = $state<'' | 'solo' | 'post' | 'pin' | 'resv'>(''), lockOn = $state(false), pin = $state(''), pinErr = $state(''), pinPost = $state<Post | null>(null), busy = $state(false), pick = $state<LessonPack | null>(null), run = $state<LessonPack | null>(null), toast = $state('');
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 2200); };
  // 📅 📜 #73 예약 모집 (선생님 2026-11-21): 차시 · 날짜 · 시각 → 글 when · 「🙋 참여 예약」 · 한 학생 예약 동시 1개 · 시각 = 방 열림 · +5분 출발(안 온 자리 = 봇) · +30분 해산
  let rDay = $state(''), rAt = $state(0);
  const rFree = $derived(!cls || isBeta(S, cls)); // 📜 #78 🧪 테스트 반 · 교사 = 예약 시간 제한 없음
  const rDays = $derived(sheet === 'resv' ? resvDays(S.now(), undefined, rFree) : []);
  const rDay0 = $derived(rDays.find((d) => d.times.length)?.key ?? ''); // 처음 고른 날 = 시각이 있는 첫 날
  const myResv = $derived(posts.filter((p) => p.when && p.phase === 'wait' && !!p.mem?.[uid]));
  function openResv() { if (!sel) return; if (myResv.length) { say(`📅 예약은 한 번에 하나 · ${resvLabel(myResv[0]!.when!)} 예약이 있어요`); return; } rDay = ''; rAt = 0; sheet = 'resv'; }
  function postResv() { if (!sel || !rAt || !online) return; const only = sel.partOf && !recs[sel.id] ? sel.steps.map((x) => x.id) : undefined; createPost(S, sel, meM, recOf(sel) ?? null, only, false, undefined, false, rAt); sheet = ''; say(`📅 ${resvLabel(rAt)} · ${sel.no}차시 예약 모집을 올렸어요`); }
  function joinResv(p: Post) { if (myResv.length) { say(`📅 예약은 한 번에 하나 · ${resvLabel(myResv[0]!.when!)} 예약이 있어요`); return; } join(p); }
  // 시각이 되면: 방장 폰이 +5분(또는 4명이 다 들어오면 바로) 출발 · 안 온 자리 = 봇 이어받기
  $effect(() => { void tick; const p = mine; if (!p || !p.when || p.phase !== 'wait' || p.host !== uid) return; untrack(() => {
    const now = S.now(), here = membersOf(p).filter((m) => Number(m.seen) >= p.when! - 60e3).length;
    if (now >= p.when! + RESV.startAfter || here >= MAX) { const L = lessonOf(p.lesson); if (L && atbOnline(S, p)) { say('📅 예약 판 출발! 안 온 자리는 봇이 함께해요'); startAtb(S, L, p); } }
  }); });
  // 📜 #70 공통 문구 (STORY-LINES-v1 3절) — 처음 열 때 이야기 두 줄(이 기기 한 번) · 새 토벌 주간(주마다 한 번) · 우리 기사단 순위 오름 · 내림 · 선두(지난번 본 순위와 견줌)
  const STORY_K = 'citadel-v1-board-story', WK_K = 'citadel-v1-board-week';
  let story = $state(untrack(() => { try { return !localStorage.getItem(STORY_K); } catch { return false; } }));
  const storyDone = () => { story = false; try { localStorage.setItem(STORY_K, '1'); } catch { /* 무시 */ } };
  $effect(() => { if (S.kind === 'memory' || !cls) return; untrack(() => {
    const w = weekOf(S.now()); let last: { w?: string; rank?: number } = {}; try { last = JSON.parse(localStorage.getItem(WK_K) || '{}'); } catch { /* 무시 */ }
    const me0 = standings(S, w).find((r) => r.cls === cls);
    if (last.w !== w) say('⚔ 새 토벌 주간이 시작됐다! 균열이 다시 열렸다.');
    else if (me0 && last.rank && me0.pts > 0 && me0.rank !== last.rank) say(me0.rank === 1 ? '🚩 우리 기사단이 선두에 섰다!' : me0.rank < last.rank ? `🚩 우리 기사단 ${me0.rank}위로 올라섰다!` : `🚩 ${me0.rank}위로 밀렸다. 한 판만 더!`);
    try { localStorage.setItem(WK_K, JSON.stringify({ w, rank: me0?.rank })); } catch { /* 무시 */ }
  }); });
  const RK2 = 'school/board/rk2', FEED = 'school/board/feed';
  const rkv = untrack(() => liveValue<Record<string, Record<string, Agg>>>(S, RK2));
  const MYFEED = 'citadel-board-myfeed';
  let myFeeds = $state<string[]>((() => { try { return JSON.parse(localStorage.getItem(MYFEED) || '[]') as string[]; } catch { return []; } })());
  const myFeed = (k: string) => { myFeeds = [...myFeeds, k].slice(-50); try { localStorage.setItem(MYFEED, JSON.stringify(myFeeds)); } catch { /* 사생활 창 */ } };
  onDestroy(rkv.stop);
  type Res = { L: LessonPack; right: number; total: number; f: ReturnType<typeof firstTry>; tf: ReturnType<typeof firstTry>; grade: string; clear: boolean; sec: number; n: number; role: Role; mult: number; bonus: number; base: number; total2: number; got: number; rescueGot?: number; rescue?: { g: number; c: number; full?: number }; rank: { sem: string; role: 'g' | 'c'; lid: string; up: boolean } | null };
  let res = $state<Res | null>(null);
  const shortOf = (p: LessonPack) => (p.title.split(' · ')[0] ?? p.title).replace(/^\d+차시\s*/, '').slice(0, 7);
  function go() {
    if (!pick) return;
    const only = pick.partOf && !recs[pick.id] ? pick.steps.map((x) => x.id) : undefined;
    if (sheet === 'post') { if (!online) { say('서버와 끊겼어요'); return; } if (open) { say('수업 중엔 모집 글을 못 올려요'); return; } createPost(S, pick, meM, recOf(pick) ?? null, only); /* 📜 #65-2 (2026-11-21) 팀 방 암호 없앰 · 차시 고르면 바로 */ sheet = ''; lockOn = false; pin = ''; return; }
    // ⚔ 📜 #65-1 혼자 도전 = 새 전투(나 + 봇 3) · 서버 판(기록 · ⭐ · 공적 · 💎 규칙 그대로 · 🧪 테스트 반 = 기록 없음) · 이 기기 연습방만 옛 길
    if (S.kind !== 'memory') { if (!online) { say('서버와 끊겼어요'); return; } const L0 = pick, pid = createPost(S, L0, meM, recOf(L0) ?? null, only, false, undefined, true); const p0 = S.get<Post>(`${POSTS}/${pid}`); if (p0) startAtb(S, L0, p0); sheet = ''; res = null; return; }
    sheet = ''; run = pick; res = null;
  }
  const tag = (p: Post) => [...new Set(membersOf(p).map((m) => m.cls))];
  // 🔒 암호 글 = 암호 시트 → 맞으면 대기실 · 틀리면 「암호가 달라요」 · 3번 틀리면 1분
  async function joinPin() {
    const p = pinPost; if (!p || busy) return; const L0 = lessonOf(p.lesson); busy = true;
    pinErr = await joinLocked(S as Store & { trySet?: (path: string, v: unknown) => Promise<boolean> }, p, meM, (L0 && recOf(L0)) ?? null, L0?.partOf && !recs[L0.id] ? L0.steps.map((x) => x.id) : undefined, pin);
    busy = false; if (!pinErr) { sheet = ''; pin = ''; pinPost = null; } else pin = '';
  }
  function join(p: Post) { const why = canJoin(p, uid, { open: isOpen(lessonOf(p.lesson)), inClass: open, online }); if (why) { say(why); return; } if (p.lk && !p.mem?.[uid]) { pinPost = p; pin = ''; pinErr = ''; sheet = 'pin'; return; } { const L0 = lessonOf(p.lesson); joinPost(S, p, meM, (L0 && recOf(L0)) ?? null, L0?.partOf && !recs[L0.id] ? L0.steps.map((x) => x.id) : undefined); } }
  // 🌀 캠프에서 모집 방을 눌러 왔으면 = 그 방에 바로 참여(한 번 · 이미 멤버면 그대로 · 못 들어가면 이유 한 줄)
  let joined0 = false;
  $effect(() => { if (joined0 || !joinPid) return; const p = posts.find((x) => x.pid === joinPid); if (!p) return; joined0 = true; untrack(() => { if (!p.mem?.[uid]) join(p); }); });
  // ── 결과 (1인 · 팀 같은 꼴) ──
  function ended(r: { drv: boolean; right: number; total: number; f: ReturnType<typeof firstTry>; tf: ReturnType<typeof firstTry>; grade: string; clear: boolean; sec: number; hints: number; R: Room; L: LessonPack; rescue?: { g: number; c: number; full?: number }; stay?: boolean; nEnd?: number }, team: Post | null) {
    const L = lessonOf(r.L.id) ?? r.L; run = null;
    // 👋 팀 배수 = 끝날 때 남은 인원 · 끝까지 남은 사람만 💎 (나간 사람 = 맞힌 기록 · 📕 복습 완료 · 순위만) (📜 2026-11-14)
    const left = team ? r.stay === false : false, n = team ? Math.max(1, r.nEnd ?? membersOf(team).length) : 1, role: Role = team?.mem[uid]?.role ?? 'c', guard = team ? hasGuard(team) : false;
    const base = Math.min(GEM.itemMax, r.right * GEM.perItem) + (r.clear ? GEM.clear : 0), mult = TEAM_X[Math.max(1, Math.min(4, n))] ?? 1, bonus = bonusOf(role, n, guard, r.clear);
    const total2 = left ? 0 : Math.round(base * mult * (1 + bonus)), bLog0 = (cls && num && S.get<Record<string, unknown>>(`gem/${cls}/${num}/log`)) || {}, got = earnDaily(me.wallet, boardTake(bLog0, kstDay(S.now()), total2), kstDay(S.now()), GEM.dayCap); // 📜 게시판 하루 200
    // 🤝 구조 보상 (📜 DECISIONS 2026-11-14): 수호자 💎 +5(하루 3번) · 도전자 💎 +3 · 하루 한도 안 · 서버 log = rescue_{날짜}_{n} · rescued_{날짜}_{n}
    let rescueGot = 0;
    if (!left && r.rescue && (r.rescue.g || r.rescue.c) && S.kind !== 'memory') {
      const day = kstDay(S.now()), gp = cls && num ? `gem/${cls}/${num}` : '', log = (gp && S.get<Record<string, unknown>>(`${gp}/log`)) || {};
      const usedG = Object.keys(log).filter((k) => k.startsWith(`rescue_${day}_`)).length, usedC = Object.keys(log).filter((k) => k.startsWith(`rescued_${day}_`)).length;
      const nG = Math.max(0, Math.min(r.rescue.g, RESCUE.perDay - usedG));
      const nFull = Math.min(nG, r.rescue.full ?? 0); // 🤝 완전 구조 = 그 구조에 +5 더 (하루 3번 안 · 같은 칸)
      for (let i = 0; i < nG; i++) { const want = RESCUE.guard + (i < nFull ? RESCUE.guard : 0), g = earnDaily(me.wallet, boardTake(S.get<Record<string, unknown>>(`${gp}/log`), day, want, got), day, GEM.dayCap); rescueGot += g; if (gp && g) S.set(`${gp}/log/rescue_${day}_${usedG + i}`, { g, at: S.now(), why: i < nFull ? '🤝 완전 구조 (수호자)' : '🤝 구조 (수호자)' }); }
      for (let i = 0; i < r.rescue.c; i++) { const g = earnDaily(me.wallet, boardTake(S.get<Record<string, unknown>>(`${gp}/log`), day, RESCUE.chall, got), day, GEM.dayCap); rescueGot += g; if (gp && g) S.set(`${gp}/log/rescued_${day}_${usedC + i}`, { g, at: S.now(), why: '🤝 구조 받음' }); }
    }
    if (got && cls && num && S.kind !== 'memory') S.set(`gem/${cls}/${num}/log/board_${kstDay(S.now())}_${S.now().toString(36)}`, { g: got, at: S.now(), why: '📋 게시판 던전' }); // 💰 #65 누적 받은 💎 (한도 안 · board_)
    if (got || rescueGot) save();
    // 📕 「복습 완료」 기록 칸 (오답노트 화면은 ⛺ 텐트 시안 뒤 · bonus/{반}/{번호}/review/{차시}/{문제} = 시각)
    if (cls && num) r.L.steps.forEach((s) => { const m = (r.R.subs?.[s.kind === 'boss' ? 'boss' : s.id]?.[uid]); if (m) S.set(`bonus/${cls}/${num}/review/${L.id}/${s.kind === 'boss' ? 'boss' : s.id}`, S.now()); });
    // 🏆 · 📜 · 📣 (📜 DECISIONS 2026-11-14 · board/ladder.ts): 내 기록(나만) · 랭킹 줄(학기 · 익명) · 최근 전투 한 줄(익명 · 공개 스위치)
    const key = team ? team.pid : `s${uid.replace(/[.#$/[\]]/g, '_')}${S.now().toString(36)}`, t = S.now();
    let rank: Res['rank'] = null;
    const myGrade = gradeOf(r.f), myAcc = r.f.total ? r.f.ok / r.f.total : 0, pidMe = cls && num ? uidOf(cls, num) : '';
    if (S.kind !== 'memory' && pidMe) {
      const myRole: 'g' | 'c' = team ? role : roleOf(recOf(L) ?? null).role;
      S.set(`bonus/${cls}/${num}/board/${key}`, { at: t, lid: L.id, no: L.no, n, role: myRole, grade: myGrade, right: r.right, total: r.total, sec: r.sec, clear: r.clear, left: left || undefined });
      const cr = S.get<{ right?: number; total?: number }>(`records/${cls}/${num}/${L.id}`), base = cr && cr.total ? (cr.right ?? 0) / cr.total : null;
      const sem = semOf(t), rp = `${RK2}/${sem}/${pidMe}`, was = S.get<Agg>(rp) ?? { cls, hero: lkB, enh: me.enh };
      const ad = addRun({ ...was, cls, hero: lkB, enh: me.enh, x: isBeta(S, cls) || undefined, at: t }, { lid: L.id, role: myRole, grade: myGrade, acc: myAcc, sec: r.sec, base });
      if (r.rescue?.g) ad.agg.rz = (ad.agg.rz ?? 0) + r.rescue.g;
      S.set(rp, ad.agg);
      rank = { sem, role: myRole, lid: L.id, up: ad.up };
      if (ad.up) sfx('skill-unlock', 0.9);
    }
    if (S.kind !== 'memory' && (!team || r.drv)) { // 📣 판마다 한 줄 (팀 = 진행 맡은 폰이 · 공개를 끈 사람은 아이콘에서 빠짐 · 이름 · 번호 없음)
      const ms = team ? membersOf(team) : [{ uid, cls, num, hero: lkB }], open1 = ms.filter((m) => !S.get<boolean>(`accounts/${m.cls}/${m.num}/feedOff`));
      if (open1.length) { S.set(`${FEED}/${key}`, { at: t, no: L.no, n, grade: r.grade, sec: r.sec, clear: r.clear, who: open1.map((m) => ({ c: m.cls, h: m.hero })) }); myFeed(key); }
    }
    if (team && r.drv) S.set(`${POSTS}/${team.pid}/phase`, 'done');
    if (team) markSeen(team.pid);
    res = { ...r, L, n, role, mult, bonus, base, total2, got: got + rescueGot, rescueGot, rank }; stageGo(0);
  }
  // 📡 #48 ATB 판 끝 (결과 화면 「게시판으로」): 기록 · ⭐ · 반 공적 · 💎(지급 스위치 켜짐만 · 베타 = 끔 = 예상만) → 게시판
  function atbEnded(p: Post, r: AtbEnd | null) {
    const L = lessonOf(p.lesson);
    if (r && L && cls && num && !isBeta(S, cls)) { // 🧪 테스트 반 = 새 전투만 · 기록 · 💎 · 공적 없음 (#65-1)
      const sv = saveAtbResult(S, { cls, num, L, pid: p.pid, n: membersOf(p).length, role: p.mem?.[uid]?.role ?? 'c' }, r);
      let full = false;
      if (payOn(S) && r.gemSum > 0) { const day = kstDay(S.now()), want = boardTake(S.get<Record<string, unknown>>(`gem/${cls}/${num}/log`), day, r.gemSum), got = want ? earnDaily(me.wallet, want, day, GEM.dayCap) : 0; full = got < r.gemSum; if (got) { S.set(`gem/${cls}/${num}/log/board_${day}_${S.now().toString(36)}`, { g: got, at: S.now(), why: '📋 게시판 던전' }); save(); } } // 📜 게시판 하루 200 (넘친 몫 = 안 받음)
      { const others = tag(p).filter((c) => c !== cls), tail = full ? ` · ${BOARD_FULL}` : ''; if (r.win && others.length) say(`🤝 ${josa(knightOf(S, others[0]!).name, '과/와')} 함께 균열을 닫았다${tail}`); else if (sv.merit) say(`🚩 우리 기사단 +${sv.merit} 공적${tail}`); else if (full) say(`💎 ${BOARD_FULL}`); } // 📜 #70
      for (const mid of r.mids ?? []) if (L.monsters[mid]) S.set(`bonus/${cls}/${num}/review/${L.id}/${mid}`, S.now()); // 📕 #67 새 전투도 「복습 완료」 (옛 길과 같은 칸 · 맞힌 소문항이 있는 몬스터)
    }
    if (p.phase === 'play') S.set(`${POSTS}/${p.pid}/phase`, 'done');
    markSeen(p.pid);
  }
  /** 👥 #77 방 안 실명: 같은 반 = 이름 · 다른 반 = 「1-3 이름」 · 명단 없으면 용사 이름 */
  const atbNames = (p: Post) => Object.fromEntries(membersOf(p).map((m) => { const nm = realName(m) || heroOf(m.hero).name; return [m.uid, m.cls === cls ? nm : `${m.cls} ${nm}`]; }));
  // 🐞 결과 연출 (📜 2026-11-14 「결과 보는 게 너무 빨리 지나가」): 등급 도장 → 💎 올라감 → 다 보임 · 단계마다 최소 2초 · 화면을 누르면 다음 단계 · 결과 화면은 단추를 누를 때까지 그대로
  let stage = $state(2), gemShown = $state(0), stT: ReturnType<typeof setTimeout> | undefined, gemRaf = 0;
  function stageGo(k: number) {
    clearTimeout(stT); cancelAnimationFrame(gemRaf); stage = Math.min(2, k);
    if (stage === 1 && res) { const to = res.got, t0 = performance.now(), dur = END_MS * 0.6; gemShown = 0; const f = () => { const q = Math.min(1, (performance.now() - t0) / dur); gemShown = Math.round(to * q); if (q < 1) gemRaf = requestAnimationFrame(f); else sfx('game-ok', 0.6); }; gemRaf = requestAnimationFrame(f); }
    else if (res) gemShown = stage >= 2 ? res.got : 0;
    if (stage < 2) stT = setTimeout(() => stageGo(stage + 1), END_MS);
  }
  const skip = () => { if (stage < 2) stageGo(stage + 1); };
  onDestroy(() => { clearTimeout(stT); cancelAnimationFrame(gemRaf); });
  const pidMine = untrack(() => (cls && num ? uidOf(cls, num) : ''));
  // 🏆 랭킹 · 📜 내 기록 창 (탭 = 🛡 수호자 · 🌱 도전자 · 📜 내 기록 · 전체 / 차시 칩 · 학년 / 우리 반)
  let rkOpen = $state(false), rkTab = $state<'g' | 'c' | 'me'>('g'), rkChip = $state<string>('all'), rkMine = $state(false);
  const sem = $derived(semOf(clock.now));
  const board = $derived.by(() => { const rows = rowsOf(rkv.v.val?.[sem] ?? null, rkMine ? cls : undefined), lid = rkChip === 'all' ? undefined : rkChip; return rkTab === 'g' ? viewOf(guardList(rows, lid), pidMine) : rkTab === 'c' ? viewOf(growList(rows, lid), pidMine) : null; });
  const mineAgg = $derived(pidMine ? rkv.v.val?.[sem]?.[pidMine] ?? null : null);
  const lr2 = untrack(() => liveValue<Record<string, { at: number; lid: string; no: number; n: number; role: 'g' | 'c'; grade: string; right: number; total: number; sec: number; clear: boolean; left?: boolean }>>(S, cls && num ? `bonus/${cls}/${num}/board` : 'bonus/_none'));
  onDestroy(lr2.stop);
  const runs = $derived(Object.entries(lr2.v.val || {}).map(([k, v]) => ({ k, ...v })).filter((x) => x && x.at).sort((a, b) => b.at - a.at));
  // 🎯 #79 목표 3종: ⭐ 차시 정복 지도 · 📕 남은 오답 · 🛡 수호자 명성 (보상 = 칭호 · 배지 · 도장만)
  const MAPL = mapLessons(PACKS);
  const stars = $derived(starsByNo(lr2.v.val as Record<string, BoardRec> | null));
  const starN = $derived(starTotal(stars, MAPL)), starMax = MAPL.length * 3;
  const fame = $derived(fameOf(lr2.v.val as Record<string, BoardRec> | null));
  const notes = $derived.by(() => { void lr2.v.val; return cls && num ? noteLeftByNo(PACKS, (S.get(`records/${cls}/${num}`) || {}) as never, (S.get(`bonus/${cls}/${num}`) || {}) as never) : {}; });
  const noteN = $derived(Object.values(notes).reduce((a, x) => a + x.left, 0)), note0 = $derived(Object.values(notes).reduce((a, x) => a + (x.had ? 1 : 0), 0));
  const noteOk = $derived(Object.values(notes).filter((x) => x.had && x.left === 0).length);
  const nextStar = $derived(starN < STAR_TITLES.explore ? `⭐ ${STAR_TITLES.explore} = 「던전 탐험가」` : starN < STAR_TITLES.conquer ? `⭐ ${STAR_TITLES.conquer} = 「던전 정복자」` : legendOf(stars, MAPL) ? '🏆 게시판의 전설!' : '모든 차시 ⭐⭐⭐ = 「게시판의 전설」');
  const best = $derived.by(() => { const m: Record<string, (typeof runs)[number]> = {}; for (const r of runs) { const w = m[r.lid]; if (!w || (GS[r.grade] ?? 0) > (GS[w.grade] ?? 0) || ((GS[r.grade] ?? 0) === (GS[w.grade] ?? 0) && r.right / (r.total || 1) > w.right / (w.total || 1))) m[r.lid] = r; } return Object.values(m).sort((a, b) => a.no - b.no); });
  // 📣 최근 전투 (익명 · 판마다 한 줄 · 내 판 = 「나」)
  const lf2 = untrack(() => liveValue<Record<string, { at: number; no: number; n: number; grade: string; sec: number; clear: boolean; who?: { c: string; h: number }[] }>>(S, FEED)); onDestroy(lf2.stop);
  const feed = $derived(Object.entries(lf2.v.val || {}).map(([k, v]) => ({ k, ...v })).filter((x) => x && x.at && (chip === 'all' || x.no === chip)).sort((a, b) => b.at - a.at).slice(0, 8));
  const mmss2 = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const day2 = (t: number) => new Date(t + 9 * 3600e3).toISOString().slice(5, 10).replace('-', '/');
  const rk = $derived.by(() => { const r0 = res?.rank; if (!r0 || !pidMine) return null; const rows = rowsOf(rkv.v.val?.[r0.sem] ?? null), v = r0.role === 'g' ? viewOf(guardList(rows), pidMine) : viewOf(growList(rows), pidMine); return { pos: v.pos, n: v.n, role: r0.role, up: r0.up }; });
  const dayLeft = $derived.by(() => { void lr2.v.val; return BOARD_DAY - boardDayUsed(cls && num ? S.get<Record<string, unknown>>(`gem/${cls}/${num}/log`) : null, kstDay(S.now())); }); // 📜 게시판 하루 200
  // 🐞 (📜 2026-11-14) 이끄는 폰이 먼저 끝내 글이 'done' 이 되어도, 이 폰이 자기 결과를 아직 못 봤으면 전투를 닫지 않음 (예전 = 바로 닫혀 결과 없이 게시판으로)
  const SEEN = 'citadel-board-seen';
  let seen = $state<string[]>((() => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]') as string[]; } catch { return []; } })());
  const markSeen = (pid: string) => { seen = [...seen.filter((x) => x !== pid), pid].slice(-30); try { localStorage.setItem(SEEN, JSON.stringify(seen)); } catch { /* 사생활 창 */ } };
  // ⏱ 같은 판에 다시 들어오기 = 30초 안이면 제자리로(연결이 잠깐 끊김) · 그 뒤는 들어가지 못함 (📜 2026-11-14) — 판이 진행 중일 때 화면을 다시 연 순간 한 번만 봄
  const REJOIN_MS = 30000;
  let gone = $state<string[]>([]), okPid = $state<string[]>([]);
  const teamRun0 = $derived(mine && (mine.phase === 'play' || (mine.phase === 'done' && !seen.includes(mine.pid))) && mine.code && !res ? mine : null);
  $effect(() => { const t = teamRun0; if (!t || t.phase !== 'play' || gone.includes(t.pid) || okPid.includes(t.pid)) return; untrack(() => {
    const F = (S as Store & { fetch?: <T>(p: string) => Promise<T | null> }).fetch, path = `rooms/${t.code}/players/${uid}`;
    void (F ? F<{ seen?: number }>(path).catch(() => null) : Promise.resolve(S.get<{ seen?: number }>(path))).then((me0) => {
      if (me0?.seen && S.now() - me0.seen > REJOIN_MS) { gone = [...gone, t.pid]; leavePost(S, t, uid); say('⏱ 30초가 지나 이 판엔 다시 들어갈 수 없어요 · 남은 친구들이 이어서 해요'); }
      else okPid = [...okPid, t.pid];
    });
  }); });
  const teamRun = $derived(teamRun0 && !gone.includes(teamRun0.pid) && (teamRun0.phase !== 'play' || okPid.includes(teamRun0.pid)) ? teamRun0 : null);
  // 👤 #77 방 안(대기실 · 전투)에서만 실명 = 반 명단에서 반 · 번호로 찾음(글에 이름을 적지 않음) · 목록 · 랭킹 · 소식 = 그대로 익명 · 명단을 못 읽으면 용사 이름
  let rost = $state<Record<string, Record<string, string>>>({});
  const roomCls = $derived([...new Set([...(mine ? membersOf(mine) : []), ...(teamRun0 ? membersOf(teamRun0) : [])].map((m) => m.cls).filter(Boolean))].join(','));
  $effect(() => { for (const c of roomCls ? roomCls.split(',') : []) { if (untrack(() => rost[c])) continue; const k = c.replace(/[.#$/[\]]/g, '_'), got = S.get<Record<string, string>>(`roster/${k}`); if (got && Object.keys(got).length) { rost = { ...untrack(() => rost), [c]: got }; continue; } void (S.fetch ? S.fetch<Record<string, string>>(`roster/${k}`) : Promise.resolve(null)).then((v) => { if (v) rost = { ...rost, [c]: v as Record<string, string> }; }).catch(() => {}); } });
  const realName = (m: { cls: string; num: number }) => { const v = rost[m.cls]?.[String(m.num)]; return typeof v === 'string' && v ? v : ''; };
  const names = (p: Post) => Object.fromEntries(membersOf(p).map((m) => [m.uid, `${m.cls}반 ${realName(m) || heroOf(m.hero).name}`]));
</script>

<div class="bd" role="dialog" aria-label="게시판 던전" style="--gbadge:url({import.meta.env.BASE_URL}art/board/guard-badge-v1.webp)">
  <div class="bar"><button type="button" class="back" aria-label="캠프로" onclick={onclose}>‹</button><b class="t">{mine && mine.phase === 'wait' ? `📋 ${mine.no}차시 팀` : '📋 게시판 던전'}</b><span class="wal">💎 {me.wallet.gem.toLocaleString()}</span></div>
  {#if res}
    <!-- ⑪ ⑫ 결과 -->
    <!-- 🐞 결과 연출: 등급 도장 → 💎 올라감 → 순위 · 단계마다 최소 2초 · 누르면 다음 (단추는 늘 그대로) -->
    <div class="mid" role="button" tabindex="0" aria-label="결과 · 누르면 다음" data-k="board-res" data-stage={stage} onclick={skip} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') skip(); }}>
      <div class="card grade stamp" class:x={!res.clear}><b class="g">{res.clear ? res.grade : '✕'}</b><span><b>{res.clear ? `${res.L.no}차시 클리어 · ${res.n > 1 ? '팀 ' : ''}등급 ${res.grade}` : '⌛ 시간이 끝났어요 · 클리어 ✕'}</b><small>첫 시도 기준 · {res.tf.total}문항 중 틀림 + 미제출 {res.tf.bad + res.tf.none}개</small></span></div>
      <div class="stat"><span><b>{res.tf.ok}</b>⭕ 맞힘</span><span><b>{res.tf.bad}</b>❌ 틀림</span><span><b>{res.tf.none}</b>⏭ 미제출</span></div>
      {#if stage >= 2 && rk?.up}<div class="card up" data-k="board-up"><b>🛡 승급!</b><small>{res.L.no}차시 정답률 80% 넘김 · 다음 판부터 수호자로 들어갈 수 있어요</small></div>{/if}
      {#if stage >= 2 && rk && rk.pos}<button type="button" class="card rk" data-k="board-rank" onclick={(e) => { e.stopPropagation(); rkTab = rk.role; rkOpen = true; }}><small>익명 · 이번 학기 · 학년</small><div><span>{rk.role === 'g' ? '🛡 수호자 랭킹' : '🌱 도전자 랭킹'}</span><em>{rk.pos} / {rk.n}</em></div></button>{/if}
      {#if stage >= 1}<div class="card rw rise">
        <div><span>💎 맞힌 소문제 {res.right} (최대 {GEM.itemMax}){res.clear ? ` + ⏰ 클리어 ${GEM.clear}` : ''}</span><span>{res.base}</span></div>
        {#if res.n > 1}<div><span>👥 {res.n}인 팀 × {res.mult}</span><span>× {res.mult}</span></div>{/if}
        {#if res.bonus}<div><span>{res.role === 'g' ? `🛡 수호 보너스 +${Math.round(res.bonus * 100)}%` : '🌱 도전자만 클리어 +50%'}</span><span>+{Math.round(res.bonus * 100)}%</span></div>{/if}
        {#if res.rescueGot}<div data-k="board-rescue"><span>🤝 구조 보상</span><span>+{res.rescueGot}</span></div>{/if}
        <div class="tot"><span>받은 💎</span><span data-k="board-gem">{gemShown}{stage >= 2 && res.got - (res.rescueGot ?? 0) < res.total2 ? ` (오늘 한도 · ${res.total2 - res.got + (res.rescueGot ?? 0)} 못 받음)` : ''}</span></div>
      </div>{/if}
      {#if stage >= 2}<p class="why">벌은 없어요 · 한 번 더 = 숫자가 새로 바뀌어요</p>{:else}<p class="why tap">화면을 누르면 다음</p>{/if}
    </div>
    <!-- 📜 2026-11-14 선생님 「게시판던전 마지막 한번더랑 게시판으로 위치 바꿔줘」 = 자리만 맞바꿈(🔥 한 번 더 = 위 · 금빛 그대로 / 📋 게시판으로 = 아래 맨 끝 · 테두리 단추 그대로) · 1인 · 팀 같은 화면 -->
    <div class="endact" data-k="board-end"><button type="button" class="again" data-k="board-again" onclick={() => { pick = res!.L; sheet = 'solo'; go(); }}>🔥 한 번 더</button><button type="button" class="btn2 wide" data-k="board-back" onclick={() => (res = null)}>📋 게시판으로</button></div>
  {:else if mine && mine.phase === 'wait'}
    <!-- ⑧ 팀 대기실 -->
    {@const ms = membersOf(mine)}
    {@const host = mine.host === uid}
    <div class="mid">
      {#if mine.lk}{@const pn = host ? myPin(mine.pid) : ''}<div class="card pin" class:host><b>🔒 {host ? (pn ? `입장 암호 ${pn}` : '입장 암호 · 이 기기에 없어요') : '암호가 걸린 모집 글'}</b><small>{host ? (pn ? '친구에게 말로 알려 줘요 · 다른 화면엔 안 보여요' : '다른 폰에서 만든 글이에요 · 내리고 다시 모집해요') : '모집한 친구에게 암호를 듣고 들어왔어요'}</small></div>{/if}
      <div class="slots">{#each Array.from({ length: MAX }) as _, i (i)}{@const m = ms[i]}{#if m}<div class="slot" class:me={m.uid === uid}><HeroSprite id={m.hero} scale={1} /><b data-k="slot-name">{#if fameLv(Number(m.fame) || 0)}<i class="badge sm" style="background-position:{fameLv(Number(m.fame) || 0)!.cell * 50}% 0" title={fameLv(Number(m.fame) || 0)!.name}></i>{/if}{m.uid === uid ? `나 · ${m.cls}반` : `${m.cls}반 · ${realName(m) || heroOf(m.hero).name}`}</b><small>{m.role === 'g' ? '🛡 수호자' : '🌱 도전자'} · {m.uid === mine.host ? '모집' : m.ready ? '✔ 준비' : '기다림'}</small></div>{:else}<div class="slot empty">＋ 빈자리</div>{/if}{/each}</div>
      <p class="bub">{mine.mem[uid]?.why}</p>
      <div class="card row"><span>{mine.no}차시 · 개념 없이 문제 → 형성평가</span><span>{hasGuard(mine) ? '🛡 있음' : '🌱 도전자만 · 길잡이'}</span></div>
    </div>
    {#if host}
      <BottomAction dock={false} text="⚔ 출발 ({ms.length}명)" disabled={!canStart(mine) || !online} onmain={() => { const L = lessonOf(mine.lesson); if (L) { if (tag(mine).length > 1) say('🤝 연합 원정대 출발! 공적은 각자 자기 깃발에.'); if (atbOnline(S, mine)) startAtb(S, L, mine); else startTeam(S, L, mine, 0); } }}
        why={!online ? '서버와 끊겼어요' : canStart(mine) ? '함께할 친구를 기다리거나 바로 출발해요' : '친구가 「준비 완료」를 누르면 출발할 수 있어요'}>{#snippet aux()}<button type="button" class="btn2 wide" onclick={() => leavePost(S, mine, uid)}>모집 글 내리기</button>{/snippet}</BottomAction>
    {:else}
      <BottomAction dock={false} text={mine.mem[uid]?.ready ? '✔ 준비 완료 (누르면 취소)' : '준비 완료'} onmain={() => setReady(S, mine, uid, !mine.mem[uid]?.ready)}>{#snippet aux()}<button type="button" class="btn2 wide" onclick={() => leavePost(S, mine, uid)}>나가기</button>{/snippet}</BottomAction>
    {/if}
  {:else}
    <!-- ⑥ 게시판 = 탭 3 (📜 #66 선생님 선택창 2026-11-21) 🗺 출정(처음) · 🏆 기사단 · 📜 기록 -->
    <div class="btabs" role="tablist" aria-label="게시판 탭">{#each BTABS as [k, t] (k)}{#if k !== 'war' || (S.kind !== 'memory' && !trial)}<button type="button" role="tab" class:on={btab === k} aria-selected={btab === k} data-btab={k} onclick={() => (btab = k)}>{t}</button>{/if}{/each}</div>
    {#if !online}<p class="off">⚠ 서버와 끊겼어요 · 다시 잇는 중 · 혼자는 계속 돼요</p>{/if}
    <div class="mid">
      {#if btab === 'go'}
        {#if S.kind !== 'memory' && !trial}<button type="button" class="warln" data-k="war-chip" onclick={() => (btab = 'war')}><WarBar {S} {cls} line /><span class="chev" aria-hidden="true">›</span></button>{/if}
        <section class="gmap" data-k="board-map" aria-label="차시 정복 지도 · 칸을 눌러 차시 고르기">
          <div class="mapw"><img src="{import.meta.env.BASE_URL}art/board/board-map-v1.webp" alt="" />
            {#each MAP_PTS as pt, i (i)}{@const l = i < MAP_PTS.length - 1 ? MAPL[i] : null}{@const nt = l ? notes[l.no] : null}{@const lk = l ? !isOpen(LESSONS.find((p) => p.no === l.no)) : true}
              {#if i === MAP_PTS.length - 1}<span class="mp castle" style="left:{pt[0]}%;top:{pt[1]}%" aria-label="성채">🏰</span>
              {:else if l}<button type="button" class="mp" class:on={sel?.no === l.no} class:got={(stars[l.no] ?? 0) > 0} class:lockd={lk} style="left:{pt[0]}%;top:{pt[1]}%" data-map={l.no} aria-pressed={sel?.no === l.no} aria-label="{l.no}차시{lk ? ' · 진도 전' : ''} 별 {stars[l.no] ?? 0}" onclick={() => setChip(l.no)}>{#if lk}<b>🔒</b>{:else}<b>{l.no}</b><i class="st">{'★'.repeat(stars[l.no] ?? 0)}<em>{'★'.repeat(3 - (stars[l.no] ?? 0))}</em></i>{/if}{#if nt?.had && nt.left === 0}<img class="ok" src="{import.meta.env.BASE_URL}art/board/egg-stamp-v1.webp" alt="오답 정리" />{/if}</button>
              {:else}<span class="mp lockd" style="left:{pt[0]}%;top:{pt[1]}%" aria-label="다음 단원">🔒</span>{/if}
            {/each}
          </div>
        </section>
        {@const openN = LESSONS.filter((p) => isOpen(p) && !(stars[p.no] ?? 0)).length}{#if openN}<p class="rift" data-k="board-rifts">🌀 아직 열려 있는 균열 {openN}곳</p>{/if}
        {#if sel}{@const q = questOf(sel.no)}{@const st = stars[sel.no] ?? 0}
          <div class="qcard" data-k="board-pick" data-no={sel.no}><div class="qh"><b>{sel.no}차시{q ? ` · ${q.boss}` : ''}</b><span class="qs" aria-label="별 {st} / 3">{'★'.repeat(st)}<em>{'★'.repeat(3 - st)}</em> {st}/3</span></div>{#if q}<p>{q.line}</p>{/if}{#if !isOpen(sel)}<small>🔒 아직 진도 전이에요</small>{:else if st >= 3}<small data-k="board-full">⭐⭐⭐ 다 모음 → 다른 균열로! · 이 균열은 다 닫았어요 · 보상이 절반이에요</small>{/if}</div>
        {/if}
        {#if note0}<div class="gl note" data-k="board-note"><b>📕 남은 오답 {noteN}</b><i class="bar"><i style:width="{note0 ? Math.round((noteOk / note0) * 100) : 0}%"></i></i><small>✔ 오답 정리 {noteOk} / {note0}차시 · {noteN ? '게시판에서 다시 풀면 줄어요 → 0' : '모두 정리!'}</small></div>{/if}
        {#if open}<div class="card"><b>📢 지금 {cls}반 수업 중</b><small>팀 모집은 수업 뒤에 · 혼자는 지금도 돼요</small></div>{/if}
        {#if shown.length}
          <small class="lbl">{sel?.no}차시 · 모집 중 {shown.length} · 새 글 위로</small>
          {#each shown as p (p.pid)}
            {@const L = lessonOf(p.lesson)}
            {@const why = canJoin(p, uid, { open: isOpen(L), inClass: open, online })}
            <div class="post" class:resv={!!p.when} data-resv={p.when ? '1' : undefined}><span class="ic">{p.when ? '📅' : isOpen(L) ? (hasGuard(p) ? '🛡' : '🌱') : '🔒'}</span><span class="tx"><b>{p.when ? `${resvLabel(p.when)} · ` : ''}{p.no}차시 · {membersOf(p).length} / {MAX}</b><small>{#if p.lk}<i class="lk">🔒 암호</i>{/if}{#if tag(p).length > 1}<i class="ally" data-k="ally">🤝 연합 원정대</i>{/if}{#each tag(p) as c (c)}<i>{c}반</i>{/each}{isOpen(L) ? (hasGuard(p) ? '🛡 있음' : '🌱 도전자만') : '아직 진도 전이에요'}</small></span>{#if p.when && p.mem?.[uid]}<button type="button" class="go on" data-k="resv-cancel" onclick={() => leavePost(S, p, uid)}>✔ 예약함 · 취소</button>{:else if p.when}<button type="button" class="go" data-k="resv-join" disabled={!!why} title={why} onclick={() => joinResv(p)}>🙋 참여 예약</button>{:else}<button type="button" class="go" disabled={!!why} title={why} onclick={() => join(p)}>합류</button>{/if}</div>
          {/each}
        {:else}
          <div class="empty"><span>📭</span><b>{sel ? `${sel.no}차시 모집 글이 아직 없어요` : '모집 글이 아직 없어요'}</b><small>혼자 도전하거나 · 팀을 모집해요</small></div>
        {/if}
      {:else if btab === 'war'}
        <WarBar {S} {cls} />
      {:else}
        <section class="gmap rec" data-k="board-rec">
          <div class="gl"><b>⭐ {starN} / {starMax}</b><small>{nextStar}</small></div>
          <div class="gl fame" data-k="board-fame">{#if fameLv(fame)}{@const f = fameLv(fame)!}<i class="badge" style="background-position:{f.cell * 50}% 0" aria-hidden="true"></i><b>🛡 {f.name}</b>{:else}<b>🛡 수호자 명성</b>{/if}<small>도전자와 함께 클리어 {fame}판{nextFame(fame) ? ` · ${nextFame(fame)!.n}판 = 「${nextFame(fame)!.name}」` : ' · 최고 단계'}</small></div>
        </section>
        <button type="button" class="rkbtn" data-k="board-rank-open" onclick={() => { rkTab = 'g'; rkOpen = true; }}><span>📜 내 기록 · 지난 랭킹</span><small>익명 · 이번 학기</small></button>
        {#if onquest && qN}<button type="button" class="rkbtn" data-k="board-quest" onclick={onquest}><span>✏ 친구 문제 {qN}</span><small>우리 반 친구가 낸 문제 · 풀어 보기</small></button>{/if}<!-- ✏ #75 🔵 승인 = 반 친구 문제 -->
        {#if feed.length}<small class="lbl">📣 최근 전투 · 익명</small>
          <div class="feed" data-k="board-feed">{#each feed as f (f.k)}<div class="fl" class:me={myFeeds.includes(f.k)}><span class="fh">{#each (f.who || []).slice(0, 4) as w, i (i)}<HeroSprite id={w.h} scale={0.5} />{/each}</span><span class="ft"><b>{f.no}차시 · {f.n > 1 ? `${f.n}인` : '혼자'} · {f.clear ? f.grade : '✕'} · {mmss2(f.sec)} · {f.clear ? '클리어' : '시간 끝'}</b><small>{myFeeds.includes(f.k) ? '나 · ' : ''}{[...new Set((f.who || []).map((w) => `${w.c}반`))].join(' · ')}</small></span></div>{/each}</div>{:else}<div class="empty"><span>📣</span><b>아직 최근 전투가 없어요</b></div>{/if}
        {#if payOn(S) && cls && num && !isBeta(S, cls)}<p class="why" data-k="board-daycap">{dayLeft <= 0 ? BOARD_FULL : `오늘 받을 수 있는 💎 ${dayLeft} / ${BOARD_DAY}`}</p>{/if}
      {/if}
    </div>
    {#if btab === 'go'}
      <BottomAction dock={false} text={sel ? `⚔ ${sel.no}차시 혼자 도전` : '⚔ 혼자 도전'} disabled={!sel || !isOpen(sel)} onmain={() => { if (!sel) return; if (trial) { trial.onsolo(sel); return; } pick = sel; sheet = 'solo'; go(); }}
        why={!sel || !isOpen(sel) ? '진도를 나간 차시를 골라요' : open || !online ? (open ? '수업 중엔 팀 모집을 못 해요' : '서버와 끊겨서 팀은 잠깐 쉬어요') : ''}>{#snippet aux()}{#if !trial}<button type="button" class="btn2 wide" data-k="board-post" disabled={open || !online || !sel || !isOpen(sel)} onclick={() => { if (!sel) return; pick = sel; sheet = 'post'; go(); }}>👥 {sel ? `${sel.no}차시 ` : ''}팀 모집</button>{#if S.kind !== 'memory'}<button type="button" class="btn2 wide" data-k="board-resv" disabled={open || !online || !sel || !isOpen(sel)} onclick={openResv}>📅 예약 모집</button>{/if}{:else}<p class="why" data-k="trial-note">체험판 = 🤖 봇 3명과 · 기록 · 💎 · 공적은 남지 않아요 (원래 수업은 친구들과 팀)</p>{/if}{/snippet}</BottomAction>
    {/if}
  {/if}
  {#if rkOpen}
    <div class="rkp" role="dialog" aria-label="랭킹 · 내 기록" data-k="board-rank-panel">
      <div class="bar"><button type="button" class="back" aria-label="게시판으로" onclick={() => (rkOpen = false)}>‹</button><b class="t">🏆 랭킹 · {sem.replace('-', '년 ')}학기</b><span></span></div>
      <div class="tabs3" role="tablist">{#each [['g', '🛡 수호자'], ['c', '🌱 도전자'], ['me', '📜 내 기록']] as [k, t] (k)}<button type="button" role="tab" class:on={rkTab === k} aria-selected={rkTab === k} onclick={() => (rkTab = k as 'g' | 'c' | 'me')}>{t}</button>{/each}</div>
      {#if rkTab !== 'me'}
        <div class="chips" role="group" aria-label="차시"><button type="button" class:on={rkChip === 'all'} onclick={() => (rkChip = 'all')}>전체</button>{#each LESSONS as p (p.id)}<button type="button" class:on={rkChip === p.id} onclick={() => (rkChip = p.id)}>{p.no}차시</button>{/each}</div>
        <div class="seg2"><button type="button" class:on={!rkMine} onclick={() => (rkMine = false)}>학년 전체</button><button type="button" class:on={rkMine} onclick={() => (rkMine = true)}>우리 반만</button></div>
        <p class="mypos" data-k="board-mypos">{board && board.pos ? `내 순위 ${board.pos} / ${board.n}` : `아직 ${rkTab === 'g' ? '수호자로 한' : '도전자로 한'} 판이 없어요`}</p>
        <small class="lbl">{rkTab === 'g' ? '차시별 최고 등급 합(S4 A3 B2 C1) → 첫 시도 정답률 → 시간' : '수업 정답률보다 오른 만큼(차시마다 최대 +60%p) · 80% 넘기면 🛡 승급'}</small>
        <div class="rkl">{#each board?.rows ?? [] as r (r.id)}<div class="rr" class:me={r.id === pidMine}><b class="no">{r.rank}</b><HeroSprite id={r.a.hero} scale={0.5} aura={r.a.enh} /><span class="who">{r.id === pidMine ? `나 · ${r.a.cls}반` : `${r.a.cls}반`}{#if rkTab === 'g' && r.a.rz}<i> · 🤝 {r.a.rz}</i>{/if}</span><em>{rkTab === 'g' ? `${r.score}점` : `+${r.score}%p`}</em></div>{:else}<div class="empty"><span>🏆</span><b>아직 기록이 없어요</b><small>게시판 던전을 한 판 하면 올라가요</small></div>{/each}</div>
      {:else}
        <small class="lbl">차시별 최고 (나만 보여요)</small>
        <div class="rkl">{#each best as b (b.lid)}{@const c = mineAgg?.c?.[b.lid]}<div class="rr"><b class="no">{b.no}</b><span class="who">{b.no}차시 · 최고 {b.grade} · {b.right}/{b.total}</span><em>{c ? (c.up ? '🛡 승급' : `📈 +${growOf(c)}%p`) : ''}</em></div>{:else}<div class="empty"><span>📜</span><b>아직 판이 없어요</b></div>{/each}</div>
        <small class="lbl">지난 판</small>
        <div class="rkl" data-k="board-myruns">{#each runs.slice(0, 30) as r (r.k)}<div class="rr"><b class="no">{day2(r.at)}</b><span class="who">{r.no}차시 · {r.n > 1 ? `${r.n}인` : '혼자'} · {r.role === 'g' ? '🛡' : '🌱'} {r.grade} · {r.right}/{r.total} · {mmss2(r.sec)}</span><em>{r.left ? '👋' : r.clear ? '○' : '✕'}</em></div>{/each}</div>
      {/if}
    </div>
  {/if}
  {#if story && !res && !(mine && mine.phase === 'wait')}<button type="button" class="story" data-k="board-story" onclick={storyDone}><span>왕국 변두리에 균열이 열렸다. 학습지 속 몬스터가 쏟아져 나온다.</span><span>왕은 반마다 기사단을 세웠다. 균열을 닫는 것은 너희다.</span><small>누르면 닫혀요</small></button>{/if}
  {#if toast}<p class="toast3" role="status">{toast}</p>{/if}
</div>

{#if sheet === 'pin' && pinPost}
  <Sheet onclose={() => { sheet = ''; pinPost = null; }} mainText={busy ? '확인 중…' : '🔒 합류'} mainDisabled={busy || pin.length !== 4} onmain={joinPin}>
    {#snippet title()}🔒 {pinPost?.no}차시 · 입장 암호{/snippet}
    <p class="pinq">모집한 친구에게 들은 숫자 4자리</p>
    <RuneKeypad value={pin} len={4} onchange={(v) => { pin = v == null || v === '-' ? '' : String(v); pinErr = ''; }} />
    {#if pinErr}<p class="pinerr" role="alert">{pinErr}</p>{/if}
  </Sheet>
{:else if sheet === 'resv' && sel}
  <Sheet onclose={() => (sheet = '')} mainText={rAt ? `📅 ${resvLabel(rAt)} · ${sel.no}차시 예약 올리기` : '날짜와 시각을 골라요'} mainDisabled={!rAt || !online} onmain={postResv}>
    {#snippet title()}📅 {sel.no}차시 예약 모집{/snippet}
    <p class="pinq">7일 안 · 평일 오후 4시 ~ 9시 반 · 주말 오전 9시 ~ 9시 반 · 시각이 되면 방이 열리고 5분 뒤 출발해요</p>
    <div class="rdays" role="group" aria-label="날짜">{#each rDays as d (d.key)}<button type="button" class:on={(rDay || rDay0) === d.key} class:off={!d.times.length} data-day={d.key} aria-disabled={!d.times.length} onclick={() => { if (!d.times.length) { say('오늘은 마감 (21:30까지)'); return; } rDay = d.key; rAt = 0; }}>{d.label}</button>{/each}</div>
    <div class="rtimes" role="group" aria-label="시각">{#each rDays.find((d) => d.key === (rDay || rDay0))?.times ?? [] as t (t.at)}<button type="button" class:on={rAt === t.at} data-at={t.at} onclick={() => (rAt = t.at)}>{t.label}</button>{/each}</div>
  </Sheet>
{:else if sheet}
  <Sheet onclose={() => { sheet = ''; lockOn = false; pin = ''; }} mainText={pick ? (sheet === 'post' ? `＋ ${pick.no}차시 모집 글 올리기` : `⚔ ${pick.no}차시 팀 없이 도전`) : '차시를 골라요'} mainDisabled={!pick} onmain={go}>
    {#snippet title()}{sheet === 'post' ? '＋ 어느 차시로 모집할까요?' : '⚔ 어느 차시로 갈까요?'}{/snippet}
    <div class="lgrid">{#each LESSONS as p (p.id)}<button type="button" class="lg" class:on={pick?.id === p.id} class:lock={!isOpen(p)} disabled={!isOpen(p)} aria-pressed={pick?.id === p.id} onclick={() => (pick = p)}><b>{isOpen(p) ? p.no : '🔒'}</b><small>{isOpen(p) ? shortOf(p) : `${p.no} · 진도 전`}</small></button>{/each}</div>
  </Sheet>
{/if}
{#if run}<BoardRun L0={run} {uid} {num} hero={lkB} nick={me.nick} {cls} onend={(r) => ended(r, null)} onquit={() => (run = null)} />{/if}
{#if teamRun && isAtb(teamRun)}
  {@const L = lessonOf(teamRun.lesson)}
  <AtbNet {S} pid={teamRun.pid} {uid} names={atbNames(teamRun)} prevStars={L && cls && num ? prevStars(S, cls, num, L.id) : 0} mastery={L ? runs.filter((x) => x.lid === L.id && x.clear).length : 0} onend={(r, again) => { const L1 = lessonOf(teamRun!.lesson); atbEnded(teamRun!, r); if (again && L1) { pick = L1; sheet = 'solo'; go(); } }} />
{:else if teamRun}
  {@const L = lessonOf(teamRun.lesson)}
  {#if L}<BoardRun L0={L} {uid} {num} hero={lkB} nick={me.nick} {cls} team={{ S, code: teamRun.code!, host: teamRun.host === uid, roles: Object.fromEntries(membersOf(teamRun).map((m) => [m.uid, m.role])), names: names(teamRun), cmd: membersOf(teamRun).find((m) => m.role === 'g')?.uid === uid, heroes: Object.fromEntries(membersOf(teamRun).map((m) => [m.uid, m.hero])) }} onend={(r) => ended(r, teamRun)} onquit={() => leavePost(S, teamRun, uid)} />{/if}
{/if}

<style>
  /* 🎯 #79 차시 정복 지도 · 오답 막대 · 명성 */
  .gmap { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: var(--r); background: var(--surface-2); }
  .mapw { position: relative; width: 100%; aspect-ratio: 1672 / 941; border-radius: 10px; overflow: hidden; }
  .mapw > img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .mp { position: absolute; transform: translate(-50%, -62%); min-width: 34px; min-height: 34px; padding: 0 2px; border: 0; border-radius: 50%; background: rgba(20, 16, 10, 0.55); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; font: 800 13px/1 var(--font); }
  .mp::before { content: ''; position: absolute; inset: -7px; }
  .mp.on { box-shadow: 0 0 0 2px var(--accent); } .mp.got { background: rgba(60, 40, 5, 0.7); }
  .mp .st { font-style: normal; font-size: 9px; color: #ffd34d; letter-spacing: -1px; line-height: 1; } .mp .st em { font-style: normal; color: rgba(255, 255, 255, 0.35); }
  .mp .ok { position: absolute; right: -14px; top: -12px; width: 26px; height: auto; transform: rotate(-12deg); pointer-events: none; }
  .mp.castle, .mp.lockd { background: rgba(10, 10, 20, 0.5); font-size: 15px; } .mp.lockd { opacity: 0.6; font-size: 12px; }
  .gl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; } .gl b { font-size: 14px; } .gl small { font-size: 13px; color: var(--text-2); }
  .gl .bar { flex: 1; min-width: 80px; height: 8px; border-radius: 4px; background: var(--surface); overflow: hidden; display: block; } .gl .bar > i { display: block; height: 100%; background: var(--ok); }
  .badge { display: inline-block; width: 36px; height: 36px; flex: none; background: var(--gbadge) 0 0 / 300% 100% no-repeat; vertical-align: middle; image-rendering: auto; }
  .badge.sm { width: 18px; height: 18px; margin-right: 3px; }
  .bd { position: fixed; inset: 0; z-index: 15; background: var(--bg); display: flex; flex-direction: column; max-width: 430px; margin: 0 auto; }
  .bar { flex: none; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3); }
  .back { width: 44px; height: 48px; border: 0; background: none; color: var(--text); font-size: 26px; }
  .t { flex: 1; font-size: 18px; } .wal { height: 32px; padding: 0 10px; border-radius: 16px; background: var(--surface); display: flex; align-items: center; font: 700 14px var(--font); color: var(--gem); }
  .chips { flex: none; display: flex; gap: 8px; overflow-x: auto; padding: 0 var(--s4) var(--s2); scrollbar-width: none; }
  .chips button { flex: none; height: 40px; min-width: 48px; padding: 0 14px; border-radius: 20px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 15px var(--font); position: relative; }
  .chips button::before { content: ''; position: absolute; inset: -4px 0; }
  .chips button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .chips button.lock { border-style: dashed; color: var(--text-3); }
  .off { margin: 0 var(--s4) var(--s2); padding: 8px 12px; border-radius: var(--r); background: var(--bad-bg); font-size: 13.5px; font-weight: 700; }
  .mid { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .card { background: var(--surface); border-radius: var(--r); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .card small { font-size: 13px; color: var(--text-2); }
  .stamp { animation: stampin 0.32s cubic-bezier(.2,1.6,.4,1) both; } .rise { animation: risein 0.2s ease-out both; }
  @keyframes stampin { from { transform: scale(1.6) rotate(-6deg); opacity: 0; } } @keyframes risein { from { transform: translateY(8px); opacity: 0; } }
  .why.tap { color: var(--text-3); }
  .card.row { flex-direction: row; justify-content: space-between; font-size: 14px; }
  .lbl { font-size: 13px; color: var(--text-3); font-weight: 700; }
  .post { display: flex; align-items: center; gap: 12px; background: var(--surface); border-radius: var(--r); padding: 10px 12px; }
  .post .ic { width: 44px; height: 44px; flex: none; border-radius: 12px; background: var(--surface-2); display: grid; place-items: center; font-size: 22px; }
  .post .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; } .post .tx b { font-size: 16px; }
  .post .tx small { font-size: 12.5px; color: var(--text-2); display: flex; gap: 6px; flex-wrap: wrap; align-items: center; } .post i { font-style: normal; padding: 1px 8px; border-radius: 99px; background: var(--surface-2); font-weight: 700; }
  .post .go { flex: none; height: 44px; padding: 0 14px; border-radius: 10px; border: 0; background: var(--surface-2); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .post .go:disabled { color: var(--text-3); box-shadow: none; }
  .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-3); text-align: center; }
  .empty span { font-size: 48px; } .empty b { font-size: 15px; color: var(--text-2); } .empty small { font-size: 13px; }
  .why { margin: 0; text-align: center; font-size: 13px; color: var(--text-3); }
  .endact { flex: none; display: flex; flex-direction: column; gap: var(--s2); padding: var(--s2) var(--s4) calc(20px + env(safe-area-inset-bottom, 0px)); }
  .endact .btn2.wide { flex: none; }
  .endact .again { box-sizing: border-box; width: 100%; height: var(--btn-h); border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 var(--btn-fs) var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .endact .again:active { transform: translateY(2px); box-shadow: none; }
  .btn2 { min-height: 48px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .btn2.wide { flex: 1; }
  .btn2:disabled { color: var(--text-3); box-shadow: none; border-style: dashed; }
  .slots { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .slot { background: var(--surface); border-radius: var(--r); padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 120px; justify-content: center; text-align: center; }
  .slot b { font-size: 14px; } .slot small { font-size: 12.5px; color: var(--text-2); }
  .slot.me { box-shadow: 0 0 0 2px var(--accent); }
  .slot.empty { border: 2px dashed var(--line); background: transparent; color: var(--text-3); font-weight: 700; }
  .bub { margin: 0; background: var(--surface-2); border-radius: var(--r); padding: 10px 12px; font-size: 14px; color: var(--text-2); }
  .lgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .lg { height: 72px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; box-shadow: 0 3px 0 var(--press-sh); }
  .lg b { font-size: 22px; } .lg small { font-size: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .lg.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); } .lg.on small { color: var(--on-accent); }
  .lg.lock { opacity: 0.5; border-style: dashed; box-shadow: none; }
  .grade { flex-direction: row; align-items: center; gap: 14px; } .grade .g { width: 64px; height: 64px; flex: none; border-radius: 18px; background: var(--surface-2); display: grid; place-items: center; font-size: 38px; color: var(--accent); }
  .grade.x .g { color: var(--text-3); } .grade span { display: flex; flex-direction: column; gap: 2px; }
  .stat { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; } .stat span { background: var(--surface); border-radius: 10px; padding: 8px 0; text-align: center; display: flex; flex-direction: column; font-size: 12.5px; color: var(--text-2); } .stat b { font-size: 20px; color: var(--text); }
  .rk div { display: flex; justify-content: space-between; font-size: 14.5px; } .rk em { font-style: normal; font-weight: 700; color: var(--accent); }
  .rw div { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-2); padding: 2px 0; } .rw .tot { color: var(--text); font-weight: 700; font-size: 16px; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 6px; }
  .card.pin { border: 1px solid var(--line); } .card.pin.host { border-color: var(--accent); } .card.pin.host b { font-size: 20px; color: var(--accent); letter-spacing: 1px; }
  .post i.lk { background: var(--accent); color: var(--on-accent); }
  .lkt { margin-top: var(--s3); width: 100%; min-height: var(--tap); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); text-align: left; }
  .lkt span { flex: 1; } .lkt small { font-size: 13px; color: var(--text-3); font-weight: 500; }
  .lkt .kn { width: 40px; height: 24px; border-radius: 12px; background: var(--surface-2); position: relative; flex: none; }
  .lkt .kn::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--text-3); transition: transform var(--t); }
  .lkt.on .kn { background: var(--accent); } .lkt.on .kn::after { transform: translateX(16px); background: #fff; }
  .pinq { margin: 0 0 var(--s2); font-size: 14px; color: var(--text-2); text-align: center; }
  .pinerr { margin: var(--s2) 0 0; text-align: center; color: var(--bad); font-weight: 700; font-size: 15px; }
  .toast3 { position: fixed; left: 50%; bottom: 140px; transform: translateX(-50%); margin: 0; padding: 8px 14px; border-radius: 12px; background: var(--surface-2); font-weight: 700; white-space: nowrap; z-index: 25; }
  .rkbtn { display: flex; justify-content: space-between; align-items: center; width: 100%; min-height: var(--tap); padding: 0 var(--s4); border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .rkbtn small { color: var(--text-2); font-weight: 500; }
  .feed { display: flex; flex-direction: column; gap: 6px; }
  .fl { display: flex; align-items: center; gap: var(--s2); padding: 6px var(--s3); border-radius: var(--r); background: var(--surface); }
  .fl.me { box-shadow: inset 0 0 0 2px var(--accent); }
  .fh { display: flex; flex: none; } .ft { display: flex; flex-direction: column; min-width: 0; } .ft b { font-size: 14px; } .ft small { font-size: 13px; color: var(--text-2); }
  .rkp { position: absolute; inset: 0; z-index: 20; background: var(--bg); display: flex; flex-direction: column; overflow: auto; padding-bottom: var(--s5); }
  .tabs3 { display: flex; gap: 6px; padding: 0 var(--s4) var(--s2); }
  /* 🗺 #66 게시판 탭 3 · 출정 띠 · 고른 차시 카드 */
  .btabs { flex: none; display: flex; gap: 6px; padding: 0 var(--s4) var(--s2); }
  .btabs button { flex: 1; min-height: var(--tap); border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 15px var(--font); }
  .btabs button.on { background: var(--accent); color: var(--on-accent); border-color: transparent; box-shadow: 0 3px 0 var(--press-sh, #000); }
  .warln { display: flex; align-items: center; gap: 8px; width: 100%; min-height: var(--tap); padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: inherit; font: inherit; text-align: left; }
  .warln :global(.wl) { flex: 1; } .warln .chev { color: var(--text-3); font-size: 20px; }
  .qcard { display: grid; gap: 6px; padding: 12px 14px; border-radius: var(--r); background: var(--surface); border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); }
  .qcard .qh { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; } .qcard .qh b { font-size: 17px; color: var(--accent); }
  .qcard .qs { flex: none; font-size: 14px; color: #ffd25a; white-space: nowrap; } .qcard .qs em { font-style: normal; color: var(--text-3); }
  .qcard p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-2); } .qcard small { font-size: 13px; color: var(--text-3); }
  .gmap.rec { gap: 10px; }
  .tabs3 button { flex: 1; min-height: var(--tap); border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 14px var(--font); }
  .tabs3 button.on { background: var(--accent); color: var(--on-accent); border-color: transparent; }
  .seg2 { display: flex; gap: 6px; padding: var(--s2) var(--s4) 0; }
  .seg2 button { flex: 1; min-height: 40px; border-radius: var(--r-sm); border: 1px solid var(--line); background: transparent; color: var(--text-2); font: 700 14px var(--font); }
  .seg2 button.on { color: var(--text); border-color: var(--accent); }
  .mypos { margin: var(--s3) var(--s4) 0; font: 800 18px var(--font); color: var(--accent); }
  .rkp .lbl { display: block; padding: var(--s2) var(--s4) 0; }
  .rkl { display: flex; flex-direction: column; gap: 4px; padding: var(--s2) var(--s4) 0; }
  .rr { display: flex; align-items: center; gap: var(--s2); min-height: 44px; padding: 0 var(--s3); border-radius: var(--r-sm); background: var(--surface); }
  .rr.me { box-shadow: inset 0 0 0 2px var(--accent); }
  .rr .no { min-width: 40px; font-size: 14px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .rr .who { flex: 1; min-width: 0; font-size: 14px; } .rr .who i { font-style: normal; color: var(--text-2); }
  .rr em { font-style: normal; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
  .card.up { border: 2px solid var(--accent); text-align: center; } .card.up b { font-size: 22px; color: var(--accent); }
  button.card.rk { width: 100%; text-align: left; color: var(--text); font: inherit; }
  /* 📜 #70 */
  .rift { margin: 0; font-size: 14px; color: var(--text-2); }
  .post .ally { color: var(--accent); }
  .story { position: absolute; inset: auto 16px 96px; z-index: 6; display: grid; gap: 6px; padding: 16px; border-radius: var(--r-lg, 20px); border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); background: rgba(10, 8, 6, 0.94); color: var(--text); font: 500 15px/1.5 var(--font); text-align: left; box-shadow: 0 6px 24px #000a; }
  .story small { color: var(--text-3); font-size: 13px; }
  /* 📅 #73 예약 */
  .post.resv { border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); }
  .post .go.on { background: var(--surface-2); color: var(--accent); }
  .rdays, .rtimes { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
  .rdays button, .rtimes button { min-height: 44px; padding: 0 14px; border-radius: 22px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 15px var(--font); }
  .rdays button.off { opacity: 0.45; }
  .rdays button.on, .rtimes button.on { background: var(--accent); color: var(--on-accent); border-color: transparent; }
</style>
