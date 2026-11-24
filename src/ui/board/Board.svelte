<script lang="ts" module>
  /** 🐞 11/24 이 앱에서 이미 저장한 판 (Board 가 다시 열려도 기억) */
  const ATB_SAVED = new Set<string>();
</script>

<script lang="ts">
  import PetSprite from '../cos/PetSprite.svelte';
  import { activePet } from '../../model/pets';
  import NameTag from '../cos/NameTag.svelte';
  import CosAura from '../cos/CosAura.svelte';
  import { auraColorOf, cosClean } from '../../model/cosmetics';
  import { FAME, fameLv, fameHeld, fameOf, MAP_PTS, mapLessons, nextFame, noteLeftByNo, recMark, recStar, STAR_RULE_TEXT, starTotal, starsByNo, STAR_TITLES, legendOf, type BoardRec } from '../../board/goals';
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
  import { bonusOf, RESCUE, canJoin, canStart, createLockedPost, joinList, createPost, overCap, hasGuard, joinLocked, joinPost, leavePost, myPin, MAX, membersOf, POSTS, roleOf, setReady, startTeam, beat, sweepAll, sweepOf, LIFE, type Post, type Role } from '../../board/team';
  import { addRun, growOf, rowsOf, semOf, type Agg } from '../../board/ladder';
  import { liveValue } from '../room.svelte';
  import { isBeta, uidOf } from '../../school/school';
  import { testLoad, testSaveRun, testStar, testWho } from '../../board/testRecs';
  import { doneNo } from '../../school/progress';
  import Sheet from '../battle/Sheet.svelte';
  import BottomAction from '../battle/BottomAction.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import BoardRun from './BoardRun.svelte';
  import WarBar from './WarBar.svelte';
  import AtbNet from './atb/AtbNet.svelte';
  import { atbOnline, isAtb, prevStars, saveAtbResult, startAtb, type AtbEnd, type Grow, atbRec } from '../../board/atbLink';
  import { addGuardMerit, knightOf, payOn, standings, weekOf } from '../../board/war';
  import { josa } from '../../board/josa';
  import { HEROES, isAwakened, ladder } from '../../model/hero';
  import HeroSheet from './atb/HeroSheet.svelte';
  import FamShield from './atb/FamShield.svelte';
  import Sprite from '../Sprite.svelte';
  import { bossArt } from './atb/rdunBoss';
  import { bossOf, FAM_NAME, ROLE_NAME } from '../../board/atb/tune';
  import { emptyPlan, ownsHero } from '../../model/draft';
  import { levelOf } from '../../school/reward';
  import { famOf, roleOf as heroRole, tierOf } from '../../board/atb/heroes';
  import RuneKeypad from '../q/RuneKeypad.svelte';
  import { sfx } from '../sound.svelte';
  import { clock } from '../clock.svelte';

  // 📋 게시판 던전 (#143 ⑥ ⑥-1 ⑦ ⑧ ⑪ ⑫ ⑬ · 허수아비 자리): 전체 게시판 하나 · 차시 칩 = 내가 거르기 · 진도 전 = 🔒 · 모집 글 = 「n차시 · k / 4」 + 반 꼬리표 + 🛡 있음 / 🌱 도전자만(이름 · 번호 없음)
  //   ⚔ 혼자 시작 › · ＋ 모집 글 → 차시 고르기 시트 · 내 반 수업 중 = 모집 · 합류만 막힘 · 다른 반도 합류(그 차시 진도를 나간 학생만) · 서버가 끊기면 팀 단추만 흐림
  const { S, me, save, uid, num, cls, open, onclose, joinPid = '', onquest, trial = null, onteach, teachN = 0 }: { S: Store; me: Me; save: () => void; uid: string; num: number; cls: string; open: boolean; onclose: () => void; /** 👩‍🏫 교사 캠프 「선생님 칸」 = 위 막대 안 (🐞 11/25 떠 있는 단추가 카드 별 조건 줄을 가림) */ onteach?: () => void; teachN?: number; /** 👩‍🏫 #66-8 체험판 = 같은 화면 · 체험 차시만 열림 · 혼자 도전(봇 3 · 기록 없음)만 · 팀 모집 · 기사단 없음 */ trial?: { ids: string[]; onsolo: (L: LessonPack) => void } | null; /** ✏ #75 친구 문제 → 출제 공방 「📜」 */ onquest?: () => void; /** 🌀 캠프 포털 · 게시판 말풍선에서 = 그 모집 방에 바로 참여 (📜 2026-11-15 캠프 A) */ joinPid?: string } = $props();
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
  const posts = $derived.by(() => { void tick; const now = S.now(); return Object.values(pv.v.val || {}).filter((p) => p && p.mem && !p.when /* 📜 11/23 예약 모집 없앰 = 옛 예약 글은 조용히 안 보임 */ && p.phase !== 'done' && !(sweepOf(p, now)?.kind === 'dissolve' || sweepOf(p, now)?.kind === 'end')).sort((a, b) => b.at - a.at); });
  /** 👥 📜 11/23 팀 참가 = 모든 차시 모집 중 팀 (혼자 판 · 옛 예약 글 빼고 · 새 팀 위) */
  /* 📜 11/24 🔨 #8 ① 꽉 찬 팀(4/4) = 목록에서 숨김 (흐리게 → 숨김 · 내 팀은 보임) · 개수 · 필터 칩 · 묶음 모두 숨긴 뒤 셈 */
  const waitAll = $derived(joinList(posts).filter((p) => !(membersOf(p).length >= MAX && !p.mem?.[uid])));
  /* 📋 📜 11/24 출정 시안(board-join-1 ~ 4): 위 탭 = 👥 팀 참가(왼쪽 · 기본) / ➕ 팀 모집(오른쪽) · 팀 참가 = 열린 팀 전부 바로 목록 · 팀이 많으면(6 ~) 필터 칩 4 + 차시별 묶음 */
  let goTab = $state<'join' | 'make'>('join'), jf = $state<'all' | 'free' | 'guard' | 'nolock'>('all');
  const JMANY = 6;
  const jOk = (p: Post) => isOpen(lessonOf(p.lesson));
  const jFull = (p: Post) => membersOf(p).length >= MAX && !p.mem?.[uid];
  const jShown = $derived(waitAll.filter((p) => jf === 'all' || (jf === 'free' ? !jFull(p) : jf === 'guard' ? hasGuard(p) : !p.lk)));
  /** 묶음 = 배운 차시 번호순 → 안 배운 차시 맨 아래 */
  const jGroups = $derived.by(() => { const m = new Map<number, Post[]>(); for (const p of jShown) (m.get(p.no) ?? m.set(p.no, []).get(p.no)!).push(p); return [...m.entries()].sort((a, b) => (jOk(a[1][0]!) === jOk(b[1][0]!) ? a[0] - b[0] : jOk(a[1][0]!) ? -1 : 1)); });
  // 📡 #48 판이 끝나 글이 done 이 되어도 내 결과를 아직 못 봤으면 그 글 그대로 (한 폰이 먼저 「게시판으로」 눌러도 다른 폰 결과 화면이 사라지지 않게)
  const mine = $derived(posts.find((p) => !!p.mem?.[uid]) ?? Object.values(pv.v.val || {}).find((p) => p && p.phase === 'done' && isAtb(p) && !!p.mem?.[uid] && !seen.includes(p.pid)) ?? null);
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
  const growM = $derived.by((): Grow => { const h = me.hero, fx = me.socket?.[h] || (ladder(h)[0] as string | undefined); return { h, lv: levelOf(me.xp || 0), enh: me.enh || 0, tier: tierOf(h, fx), ...(fx ? { fx } : {}), ...(meLookId(me) !== h ? { awk: true } : {}) /* 🐞 #94 덧: 예전 isAwakened(me) = 장착 스킬(fx)을 못 읽어 늘 false → 게시판 판에 각성이 안 실렸음 */ }; });
  // 🧙 #93 게시판에서 용사 바꾸기 (📜 선생님 「추천대로」): 고른 차시 카드 → 손발 #2 HeroPick(교사 연습방 창) · 가진 용사만 · 보스 약점 「약점!」 · 고르면 캠프 출전 용사도(저장 한 곳 = me.hero)
  //   팀 · 예약 글에 들어가 있으면 출발 전까지 글 mem/{uid} 의 용사 · 판 들고 갈 값(g)도 같이 · 교사 = 모두 · 체험판 = 체험 지갑 그대로
  /* 🧙 📜 #135 용사 확인 시트 = 'go'(혼자 출정 · 늘 거침 · 「⚔ 이 용사로 출발」) · 'swap'(출정 카드 「🧙 바꾸기」) · 'room'(팀 대기실 · 「✔ 이 용사로」) */
  let pickHero = $state<'' | 'go' | 'swap' | 'room'>('');
  /** 👥 모집 목록 펼침 = 이 기기 기억 */
  const pickNo = $derived(mine && mine.phase === 'wait' && mine.mem?.[uid] ? mine.no : sel?.no);
  const heroIds = HEROES.map((h) => h.id);
  const ownH = (id: number) => !cls || ownsHero(me.wallet, emptyPlan(), id);
  function choseHero(id: number) {
    pickHero = ''; if (id === me.hero) return;
    me.hero = id; save();
    const p = mine; if (p && p.phase === 'wait' && p.mem?.[uid] && S.kind !== 'memory') { S.set(`${POSTS}/${p.pid}/mem/${uid}/hero`, meLookId(me)); S.set(`${POSTS}/${p.pid}/mem/${uid}/g`, growM); }
    say(`🧙 ${heroOf(id).name} 출전!`);
  }
  const meM = $derived({ uid, cls: cls || (S.kind === 'server' ? '선생님' : '이 기기'), num, nick: me.nick, hero: lkB, fame: fameNow(), g: growM });
  function fameNow() { return cls && num ? fameHeld(S.get(`bonus/${cls}/${num}/board`) as Record<string, BoardRec> | null) : 0; }
  let sheet = $state<'' | 'solo' | 'post' | 'pin' | 'join'>(''), lockOn = $state(false), pin = $state(''), pinErr = $state(''), pinPost = $state<Post | null>(null), busy = $state(false), pick = $state<LessonPack | null>(null), run = $state<LessonPack | null>(null), toast = $state('');
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 2200); };
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
    if (sheet === 'post') { if (!online) { say('서버와 끊겼어요'); return; } if (open) { say('수업 중엔 모집 글을 못 올려요'); return; } if (lockOn) { if (!/^\d{4}$/.test(pin)) { say('🔒 숫자 4자리를 넣어요'); return; } const L1 = pick; void createLockedPost(S, L1, meM, recOf(L1) ?? null, only, pin); } else createPost(S, pick, meM, recOf(pick) ?? null, only); /* 📜 11/23 암호 = 모집 때 고르는 선택 칸(기본 끔) */ sheet = ''; lockOn = false; pin = ''; return; }
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
  /** 🐞 11/24 판 결과 저장 = 판마다 한 번 (결과 화면이 뜰 때 · 단추 · 다시 열 때 되살리기 모두 이 함수 · 이 앱 안에서 기억 + 서버 기록 이름 「판id_」 으로 이중 저장 막음) */
  const hasRec = (pid: string) => Object.keys((S.get<Record<string, unknown>>(`bonus/${cls}/${num}/board`)) || {}).some((k) => k.startsWith(`${pid}_`));
  function atbEnded(p: Post, r: AtbEnd | null) {
    if (!ATB_SAVED.has(p.pid) && cls && num && !isBeta(S, cls) && hasRec(p.pid)) ATB_SAVED.add(p.pid); // 서버에 이미 이 판 기록 = 저장 안 함
    if (ATB_SAVED.has(p.pid)) { if (p.phase === 'play') S.set(`${POSTS}/${p.pid}/phase`, 'done'); markSeen(p.pid); return; }
    ATB_SAVED.add(p.pid);
    const L = lessonOf(p.lesson);
    if (r && L && testAcc) { // 🧪 #86 테스트 반 · 교사 = 판 기록 · ⭐ 만 이 기기에 (공적 · 💎 · 서버 기록 없음)
      testSaveRun(testWho(cls, num), `${p.pid}_${S.now().toString(36)}`, atbRec({ L, n: membersOf(p).length, role: p.mem?.[uid]?.role ?? 'c' }, r, S.now(), Math.max(0, Math.min(3, r.stars | 0)), 0)); tv++;
    }
    if (r && L && !cls && !trial && S.kind !== 'memory' && r.meritSum > 0) { const g = addGuardMerit(S, r.meritSum); if (g) say(`🛡 근위대 +${g} 공적`); } // 🛡 #105 교사 판 = 근위대 줄 (반 순위 밖)
    if (r && L && cls && num && !isBeta(S, cls)) { // 🧪 테스트 반 = 새 전투만 · 기록 · 💎 · 공적 없음 (#65-1)
      const sv = saveAtbResult(S, { cls, num, L, pid: p.pid, n: membersOf(p).length, role: p.mem?.[uid]?.role ?? 'c' }, r);
      let full = false;
      if (payOn(S) && r.gemSum > 0) { const day = kstDay(S.now()), want = boardTake(S.get<Record<string, unknown>>(`gem/${cls}/${num}/log`), day, r.gemSum), got = want ? earnDaily(me.wallet, want, day, GEM.dayCap) : 0; full = got < r.gemSum; if (got) { S.set(`gem/${cls}/${num}/log/board_${day}_${S.now().toString(36)}`, { g: got, at: S.now(), why: '📋 게시판 던전' }); save(); } } // 📜 게시판 하루 200 (넘친 몫 = 안 받음)
      { const others = tag(p).filter((c) => c !== cls), tail = full ? ` · ${BOARD_FULL}` : ''; if (r.win && others.length) say(`🤝 ${josa(knightOf(S, others[0]!).name, '과/와')} 함께 균열을 닫았다${tail}`); else if (sv.merit) say(`🚩 우리 기사단 +${sv.merit} 공적${tail}`); else if (full) say(`💎 ${BOARD_FULL}`); } // 📜 #70
      const rz = Number(r.acts?.rescue) || 0; // 🛡 #104 🤝 구조 성공 → 이번 학기 rk2 rz (🏆 기사단 탭 「수호 명성」)
      if (rz > 0) { const t = S.now(), rp = `${RK2}/${semOf(t)}/${uidOf(cls, num)}`, was = S.get<Agg>(rp) ?? { cls, hero: lkB, enh: me.enh }; S.set(rp, { ...was, cls, hero: lkB, enh: me.enh, at: t, rz: (Number(was.rz) || 0) + rz }); }
      for (const mid of r.mids ?? []) if (L.monsters[mid]) S.set(`bonus/${cls}/${num}/review/${L.id}/${mid}`, S.now()); // 📕 #67 새 전투도 「복습 완료」 (옛 길과 같은 칸 · 맞힌 소문항이 있는 몬스터)
    }
    if (p.phase === 'play') S.set(`${POSTS}/${p.pid}/phase`, 'done');
    markSeen(p.pid);
  }
  /** 🐞 11/24 되살리기 (B): 게시판을 열 때 · 판 끝 값(atb/{판}/end/{나})은 있는데 내 기록이 없는 판 = 한 번 저장 (결과 화면에서 앱을 닫은 학생) */
  let healed = false;
  $effect(() => {
    const all = pv.v.val; if (healed || !all || !cls || !num || isBeta(S, cls) || S.kind !== 'server' || !S.fetch || !online) return;
    healed = true;
    untrack(() => { void healAtb(Object.values(all).filter((p) => p && p.mem?.[uid] && p.phase !== 'wait' && !ATB_SAVED.has(p.pid))); });
  });
  async function healAtb(ps: Post[]) {
    if (!ps.length || !S.fetch) return;
    await S.fetch(`bonus/${cls}/${num}/board`).catch(() => null);
    for (const p of ps) {
      if (ATB_SAVED.has(p.pid) || hasRec(p.pid)) { ATB_SAVED.add(p.pid); continue; }
      const r = await S.fetch<AtbEnd>(`atb/${p.pid}/end/${uid}`).catch(() => null);
      if (!r || r.left || ATB_SAVED.has(p.pid) || hasRec(p.pid)) continue;
      atbEnded({ ...p, phase: 'done' }, r);
    }
  }
  /** 🚪 #113 ‹ 로 도중에 나감 = 맞힌 소문항 몫 💎만(기록 「나감」) · 글에서 내 이름 뺌 → 다시 들어와도 이 판으로 안 감 · 혼자 판 = 글 끝 */
  function atbLeft(p: Post, r: AtbEnd | null) {
    const L = lessonOf(p.lesson), solo1 = membersOf(p).length <= 1, first = !ATB_SAVED.has(p.pid); ATB_SAVED.add(p.pid);
    if (first && r && L && cls && num && !isBeta(S, cls)) {
      saveAtbResult(S, { cls, num, L, pid: p.pid, n: membersOf(p).length, role: p.mem?.[uid]?.role ?? 'c' }, r);
      if (payOn(S) && r.gemSum > 0) { const got = earnDaily(me.wallet, r.gemSum, kstDay(S.now()), GEM.dayCap); if (got) { S.set(`gem/${cls}/${num}/log/board_${kstDay(S.now())}_${S.now().toString(36)}`, { g: got, at: S.now(), why: '📋 게시판 던전 (나감)' }); save(); } }
    }
    if (solo1 && p.phase === 'play') S.set(`${POSTS}/${p.pid}/phase`, 'done');
    gone = [...gone, p.pid]; markSeen(p.pid); leavePost(S, p, uid);
    say(r && r.gemSum > 0 ? `🚪 전투에서 나왔어요 · 맞힌 문제 몫 💎 ${r.gemSum}` : '🚪 전투에서 나왔어요');
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
  // 📜 내 기록 창 (📜 #104 수호자 · 도전자 랭킹 탭 없앰 → 🛡 수호 명성 = 🏆 기사단 탭 · 🌱 내 성장 = 이 창)
  let rkOpen = $state(false);
  const sem = $derived(semOf(clock.now));
  // 🛡 #104 수호 명성 = 반 안 🤝 구조 성공(rz) 상위 10 + 나 · 익명(반 · 용사 그림만)
  const fameTop = $derived.by(() => { const xs = rowsOf(rkv.v.val?.[sem] ?? null, cls || undefined).filter((r) => (Number(r.a.rz) || 0) > 0).sort((p, q) => (q.a.rz ?? 0) - (p.a.rz ?? 0)).map((r, i) => ({ ...r, rank: i + 1 })); const top = xs.slice(0, 10), me1 = xs.find((r) => r.id === pidMine); return me1 && !top.includes(me1) ? [...top, me1] : top; });
  const mineAgg = $derived(pidMine ? rkv.v.val?.[sem]?.[pidMine] ?? null : null);
  const lr2 = untrack(() => liveValue<Record<string, { at: number; lid: string; no: number; n: number; role: 'g' | 'c'; grade: string; right: number; total: number; sec: number; clear: boolean; left?: boolean }>>(S, cls && num ? `bonus/${cls}/${num}/board` : 'bonus/_none'));
  onDestroy(lr2.stop);
  // 🧪 #86 테스트 반 · 교사 = 이 기기 테스트 저장소의 판 기록 · ⭐ 를 같이 (서버엔 안 씀)
  const testAcc = $derived(S.kind !== 'memory' && !trial && (!cls || !num || isBeta(S, cls)));
  let tv = $state(0);
  const recSrc = $derived.by(() => { void tv; const sv = (lr2.v.val || {}) as Record<string, unknown>; return testAcc ? { ...sv, ...testLoad(testWho(cls, num)).recs } : sv; });
  const myPrev = (lid: string) => (testAcc ? testStar(testWho(cls, num), lid) : cls && num ? prevStars(S, cls, num, lid) : 0);
  const runs = $derived(Object.entries(recSrc as Record<string, { at: number; lid: string; no: number; n: number; role: 'g' | 'c'; grade: string; right: number; total: number; sec: number; clear: boolean; left?: boolean }>).map(([k, v]) => ({ k, ...v })).filter((x) => x && x.at).sort((a, b) => b.at - a.at));
  // 🎯 #79 목표 3종: ⭐ 차시 정복 지도 · 📕 남은 오답 · 🛡 수호자 명성 (보상 = 칭호 · 배지 · 도장만)
  const MAPL = mapLessons(PACKS);
  const stars = $derived(starsByNo(recSrc as Record<string, BoardRec> | null));
  const starN = $derived(starTotal(stars, MAPL)), starMax = MAPL.length * 3;
  const fame = $derived(fameHeld(recSrc as Record<string, BoardRec> | null)), rescueN = $derived(fameOf(recSrc as Record<string, BoardRec> | null)); // 🛡 #104 단계 = 받은 것 유지 · 숫자 = 🤝 구조 성공만
  const notes = $derived.by(() => { void lr2.v.val; return cls && num ? noteLeftByNo(PACKS, (S.get(`records/${cls}/${num}`) || {}) as never, (S.get(`bonus/${cls}/${num}`) || {}) as never) : {}; });
  const noteN = $derived(Object.values(notes).reduce((a, x) => a + x.left, 0)), note0 = $derived(Object.values(notes).reduce((a, x) => a + (x.had ? 1 : 0), 0));
  const noteOk = $derived(Object.values(notes).filter((x) => x.had && x.left === 0).length);
  const nextStar = $derived(starN < STAR_TITLES.explore ? `⭐ ${STAR_TITLES.explore} = 「던전 탐험가」` : starN < STAR_TITLES.conquer ? `⭐ ${STAR_TITLES.conquer} = 「던전 정복자」` : legendOf(stars, MAPL) ? '🏆 게시판의 전설!' : '모든 차시 ⭐⭐⭐ = 「게시판의 전설」');
  const best = $derived.by(() => { const m: Record<string, (typeof runs)[number]> = {}; for (const r of runs) { const w = m[r.lid]; if (!w || recStar(r) > recStar(w) || (recStar(r) === recStar(w) && r.right / (r.total || 1) > w.right / (w.total || 1))) m[r.lid] = r; /* 🐞 #140 최고 = 별(옛 등급 · 새 전투 ⭐ 같은 셈) */ } return Object.values(m).sort((a, b) => a.no - b.no); });
  // 📣 최근 전투 (익명 · 판마다 한 줄 · 내 판 = 「나」)
  const lf2 = untrack(() => liveValue<Record<string, { at: number; no: number; n: number; grade: string; sec: number; clear: boolean; who?: { c: string; h: number }[] }>>(S, FEED)); onDestroy(lf2.stop);
  const feed = $derived(Object.entries(lf2.v.val || {}).map(([k, v]) => ({ k, ...v })).filter((x) => x && x.at && (chip === 'all' || x.no === chip)).sort((a, b) => b.at - a.at).slice(0, 8));
  const mmss2 = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const day2 = (t: number) => new Date(t + 9 * 3600e3).toISOString().slice(5, 10).replace('-', '/');
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
  <div class="bar"><button type="button" class="back" aria-label="캠프로" onclick={onclose}>‹</button><b class="t">{mine && mine.phase === 'wait' ? `📋 ${mine.no}차시 팀` : '📋 게시판 던전'}</b>{#if onteach}<button type="button" class="tbtn" data-k="t-panel" onclick={onteach}>👩‍🏫 선생님{#if teachN}<i>{teachN}</i>{/if}</button>{/if}<span class="wal">💎 {me.wallet.gem.toLocaleString()}</span></div>
  {#if res}
    <!-- ⑪ ⑫ 결과 -->
    <!-- 🐞 결과 연출: 등급 도장 → 💎 올라감 → 순위 · 단계마다 최소 2초 · 누르면 다음 (단추는 늘 그대로) -->
    <div class="mid" role="button" tabindex="0" aria-label="결과 · 누르면 다음" data-k="board-res" data-stage={stage} onclick={skip} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') skip(); }}>
      <div class="card grade stamp" class:x={!res.clear}><b class="g">{res.clear ? res.grade : '✕'}</b><span><b>{res.clear ? `${res.L.no}차시 클리어 · ${res.n > 1 ? '팀 ' : ''}등급 ${res.grade}` : '⌛ 시간이 끝났어요 · 클리어 ✕'}</b><small>첫 시도 기준 · {res.tf.total}문항 중 틀림 + 미제출 {res.tf.bad + res.tf.none}개</small></span></div>
      <div class="stat"><span><b>{res.tf.ok}</b>⭕ 맞힘</span><span><b>{res.tf.bad}</b>❌ 틀림</span><span><b>{res.tf.none}</b>⏭ 미제출</span></div>
      {#if stage >= 2 && res.rank?.up}<div class="card up" data-k="board-up"><b>🛡 승급!</b><small>{res.L.no}차시 정답률 80% 넘김 · 다음 판부터 수호자로 들어갈 수 있어요</small></div>{/if}
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
      <div class="slots">{#each Array.from({ length: MAX }) as _, i (i)}{@const m = ms[i]}{#if m}{@const mc = cosClean(S.get(`accounts/${m.cls}/${m.num}/cos`))}<div class="slot" class:me={m.uid === uid}><span class="slh"><CosAura color={auraColorOf(mc)} /><HeroSprite id={m.hero} scale={1} />{#if activePet(S.get(`accounts/${m.cls}/${m.num}/pet`))}<span class="slpet"><PetSprite pet={activePet(S.get(`accounts/${m.cls}/${m.num}/pet`))!} size={26} /></span>{/if}</span><b data-k="slot-name">{#if fameLv(Number(m.fame) || 0)}<i class="badge sm" style="background-position:{fameLv(Number(m.fame) || 0)!.cell * 50}% 0" title={fameLv(Number(m.fame) || 0)!.name}></i>{/if}<NameTag name={m.uid === uid ? `나 · ${m.cls}반` : `${m.cls}반 · ${realName(m) || heroOf(m.hero).name}`} on={mc} /></b><small>{m.role === 'g' ? '🛡 수호자' : '🌱 도전자'} · {m.uid === mine.host ? '모집' : m.ready ? '✔ 준비' : '기다림'}</small></div>{:else}<div class="slot empty">＋ 빈자리</div>{/if}{/each}</div>
      <p class="bub">{mine.mem[uid]?.why}</p>
      <div class="card row"><span>{mine.no}차시 · 개념 없이 문제 → 형성평가</span><span>{hasGuard(mine) ? '🛡 있음' : '🌱 도전자만 · 길잡이'}</span></div>
      {#if mine.phase === 'wait'}<div class="qhero" data-k="room-hero-row"><HeroSprite id={lkB} scale={0.6} /><span>{heroOf(me.hero).name}{bossOf(mine.no).weak.includes(famOf(me.hero)) ? ' · 약점!' : ''}</span><button type="button" class="btn2 sm" data-k="room-hero" onclick={() => (pickHero = 'room')}>🧙 용사 바꾸기</button></div>{/if}
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
        {#if !trial}<div class="seg" role="tablist" aria-label="출정" data-k="board-go-tabs"><button type="button" role="tab" class:on={goTab === 'join'} aria-selected={goTab === 'join'} data-k="board-tab-join" onclick={() => (goTab = 'join')}>👥 팀 참가 <b class="cnt">{waitAll.length}</b></button><button type="button" role="tab" class:on={goTab === 'make'} aria-selected={goTab === 'make'} data-k="board-tab-make" onclick={() => (goTab = 'make')}>➕ 팀 모집</button></div>{/if}
        {#if !trial && goTab === 'join'}
          <!-- 👥 📜 11/24 팀 참가 = 열린 팀 전부 바로 목록 (실시간) · 한 줄 = 방장 용사 · 차시 · 🛡 · 🔒 · 보스 · 방장 이름 · 인원 · [참가] / 「아직 안 배움」 / 「꽉 참」 -->
          {#if waitAll.length}
            <div class="jhead"><span>지금 열린 팀 {waitAll.length}</span><small>실시간</small></div>
            {#if waitAll.length >= JMANY}<div class="jchips" data-k="board-join-chips">{#each [['all', `전체 ${waitAll.length}`], ['free', '빈자리 있음'], ['guard', '🛡 수호자'], ['nolock', '🔒 빼기']] as [k, t] (k)}<button type="button" class="jc" class:on={jf === k} aria-pressed={jf === k} onclick={() => (jf = k as typeof jf)}>{jf === k ? '✓ ' : ''}{t}</button>{/each}</div>{/if}
            {#snippet jrow(p: Post)}{@const ok = jOk(p)}{@const mine = !!p.mem?.[uid]}{@const ms = membersOf(p)}{@const host = ms[0]}{@const q = questOf(p.no)}
              <div class="jcard" class:dim={!ok} data-k="board-join-row" data-no={p.no} data-lk={p.lk ? '1' : undefined}>
                <span class="face" aria-hidden="true"><span class="fin"><HeroSprite id={host?.hero ?? 0} scale={1.25} /></span></span>
                <span class="jt"><span class="tags"><i class="no">{p.no}차시</i>{#if hasGuard(p)}<i class="gd">🛡 수호자</i>{/if}{#if p.lk}<i class="lkg">🔒 암호</i>{/if}</span><b class="boss">{q?.boss ?? `${p.no}차시 보스`}</b><small class="who">{host?.nick ?? ''} <span class="dots" aria-label="인원 {ms.length} / {MAX}">{#each Array.from({ length: MAX }) as _, i (i)}<i class:f={i < ms.length}></i>{/each}</span> {ms.length}/{MAX}</small></span>
                {#if mine}<button type="button" class="jgo" data-k="board-join-go" onclick={() => join(p)}>내 팀</button>
                {:else if !ok}<span class="jno" data-k="board-join-notyet">아직<br />안 배움</span>
                {:else}<button type="button" class="jgo" data-k="board-join-go" onclick={() => join(p)}>참가</button>{/if}
              </div>
            {/snippet}
            <div class="jlist" data-k="board-join-list">
              {#if waitAll.length >= JMANY}{#each jGroups as [no, ps] (no)}<div class="jgrp" class:dim={!jOk(ps[0]!)}><span>{no}차시 · {ps.length}팀</span></div>{#each ps as p (p.pid)}{@render jrow(p)}{/each}{:else}<p class="empty1">고른 조건의 팀이 없어요</p>{/each}
              {:else}{#each jShown as p (p.pid)}{@render jrow(p)}{/each}{/if}
            </div>
          {:else}
            <div class="jempty" data-k="board-join-none"><span>📋</span><b>지금 열린 팀이 없어요</b><small>내가 모집하면 친구들이 여기서 봐요</small></div>
          {/if}
        {:else}
        <section class="gmap" data-k="board-map" aria-label="차시 정복 지도 · 칸을 눌러 차시 고르기">
          <div class="mapw"><img src="{import.meta.env.BASE_URL}art/board/board-map-v2.webp" alt="" />
            {#each MAP_PTS as pt, i (i)}{@const l = i < MAP_PTS.length - 1 ? (MAPL.find((x) => x.no === i + 2) ?? null) : null}{@const nt = l ? notes[l.no] : null}{@const lk = l ? !isOpen(LESSONS.find((p) => p.no === l.no)) : true}
              {#if i === MAP_PTS.length - 1}<span class="mp castle" style="left:{pt[0]}%;top:{pt[1]}%" aria-label="다음 단원 성문">🔒</span>
              {:else if l}<button type="button" class="mp" class:on={sel?.no === l.no} class:got={(stars[l.no] ?? 0) > 0} class:left={!lk && (stars[l.no] ?? 0) < 3} class:lockd={lk} style="left:{pt[0]}%;top:{pt[1]}%" data-map={l.no} aria-pressed={sel?.no === l.no} aria-label="{l.no}차시{lk ? ' · 진도 전' : ''} 별 {stars[l.no] ?? 0}" onclick={() => setChip(l.no)}>{#if lk}<b>🔒</b>{:else}<b>{l.no}</b><i class="st">{'★'.repeat(stars[l.no] ?? 0)}<em>{'★'.repeat(3 - (stars[l.no] ?? 0))}</em></i>{/if}{#if nt?.had && nt.left === 0}<img class="ok" src="{import.meta.env.BASE_URL}art/board/egg-stamp-v1.webp" alt="오답 정리" />{/if}</button>
              {:else}<span class="mp lockd" style="left:{pt[0]}%;top:{pt[1]}%" aria-label="다음 단원">🔒</span>{/if}
            {/each}
          </div>
        </section>
        <!-- ⚔ 📜 #135 ③ 출정 카드 하나: 보스 · 차시 · 단원 · ★ / 약점 / 내 용사 줄 + 「🧙 바꾸기」 / 다 모음 · 한 줄 -->
        {#if sel}{@const q = questOf(sel.no)}{@const st = stars[sel.no] ?? 0}{@const B = bossOf(sel.no)}{@const wk = B.weak.includes(famOf(me.hero))}{@const opn = isOpen(sel)}
          <div class="qcard v2" data-k="board-pick" data-no={sel.no}>
            <div class="gh"><span class="bimg" aria-hidden="true">{#if opn}<Sprite ref={bossArt(B, 'normal').sprite} pose="idle" size={48} />{:else}🔒{/if}</span><span class="t"><b>{sel.no}차시{q && opn ? ` · ${q.boss}` : ''}</b><small>{opn ? shortOf(sel) : '수업에서 배우면 열려요'}</small></span><span class="qs" aria-label="별 {st} / 3">{'★'.repeat(st)}<em>{'★'.repeat(3 - st)}</em></span></div>
            {#if opn}<p class="srule" data-k="board-star-rule">{STAR_RULE_TEXT}</p>{/if}
            {#if opn}
              <div class="wkr" data-k="board-weak">약점 {#each B.weak as f (f)}<span class="fam"><FamShield fam={f} size={18} /> {FAM_NAME[f]}</span>{/each}</div>
              <div class="hrow" data-k="board-hero-row"><span class="hs"><HeroSprite id={lkB} scale={0.6} /></span><span class="n"><b>{heroOf(me.hero).name}{#if wk}<i class="wk" data-k="board-hero-weak">약점!</i>{/if}</b><small>{ROLE_NAME[heroRole(me.hero)]} · {FAM_NAME[famOf(me.hero)]} · Lv {growM.lv}</small></span><button type="button" class="chg" data-k="board-hero" aria-label="용사 바꾸기 · 지금 {heroOf(me.hero).name}" onclick={() => (pickHero = 'swap')}>🧙 바꾸기</button></div>
              {#if st >= 3}<small data-k="board-full">⭐⭐⭐ 다 모음 · 이 균열은 보상이 절반이에요</small>{:else if q}<small class="ql">{q.line}</small>{/if}
            {/if}
          </div>
        {/if}
        {/if}
      {:else if btab === 'war'}
        <WarBar {S} {cls} test={testAcc} />
        <small class="lbl">🛡 수호 명성 · {cls ? `${cls}반` : '우리 반'} · 🤝 구조 성공</small>
        <div class="rkl" data-k="board-fame-list">{#each fameTop as r (r.id)}<div class="rr" class:me={r.id === pidMine}><b class="no">{r.rank}</b><HeroSprite id={r.a.hero} scale={0.5} aura={r.a.enh} /><span class="who">{r.id === pidMine ? `나 · ${r.a.cls}반` : `${r.a.cls}반`}</span><em>🤝 {r.a.rz}</em></div>{:else}<div class="empty"><span>🤝</span><b>아직 구조 기록이 없어요</b><small>쓰러지기 직전 친구를 살리면 올라가요</small></div>{/each}</div>
      {:else}
        {#if note0}<div class="gl note" data-k="board-note"><b>📕 남은 오답 {noteN}</b><i class="bar"><i style:width="{note0 ? Math.round((noteOk / note0) * 100) : 0}%"></i></i><small>✔ 오답 정리 {noteOk} / {note0}차시 · {noteN ? '게시판에서 다시 풀면 줄어요 → 0' : '모두 정리!'}</small></div>{/if}
        <section class="gmap rec" data-k="board-rec">
          <div class="gl"><b>⭐ {starN} / {starMax}</b><small>{nextStar}</small></div>
          <div class="gl fame" data-k="board-fame">{#if fameLv(fame)}{@const f = fameLv(fame)!}<i class="badge" style="background-position:{f.cell * 50}% 0" aria-hidden="true"></i><b>🛡 {f.name}</b>{:else}<b>🛡 수호자 명성</b>{/if}<small>🤝 구조 성공 {rescueN}번{nextFame(fame) ? ` · ${nextFame(fame)!.n}번 = 「${nextFame(fame)!.name}」` : ' · 최고 단계'}</small></div>
        </section>
        <button type="button" class="rkbtn" data-k="board-rank-open" onclick={() => (rkOpen = true)}><span>📜 내 기록 · 🌱 내 성장</span><small>나만 보여요 · 이번 학기</small></button>
        {#if onquest && qN}<button type="button" class="rkbtn" data-k="board-quest" onclick={onquest}><span>✏ 친구 문제 {qN}</span><small>우리 반 친구가 낸 문제 · 풀어 보기</small></button>{/if}<!-- ✏ #75 🔵 승인 = 반 친구 문제 -->
        {#if feed.length}<small class="lbl">📣 최근 전투 · 익명</small>
          <div class="feed" data-k="board-feed">{#each feed as f (f.k)}<div class="fl" class:me={myFeeds.includes(f.k)}><span class="fh">{#each (f.who || []).slice(0, 4) as w, i (i)}<HeroSprite id={w.h} scale={0.5} />{/each}</span><span class="ft"><b>{f.no}차시 · {f.n > 1 ? `${f.n}인` : '혼자'} · {f.clear ? f.grade : '✕'} · {mmss2(f.sec)} · {f.clear ? '클리어' : '시간 끝'}</b><small>{myFeeds.includes(f.k) ? '나 · ' : ''}{[...new Set((f.who || []).map((w) => `${w.c}반`))].join(' · ')}</small></span></div>{/each}</div>{:else}<div class="empty"><span>📣</span><b>아직 최근 전투가 없어요</b></div>{/if}
        {#if payOn(S) && cls && num && !isBeta(S, cls)}<p class="why" data-k="board-daycap">{dayLeft <= 0 ? BOARD_FULL : `오늘 받을 수 있는 💎 ${dayLeft} / ${BOARD_DAY}`}</p>{/if}
      {/if}
    </div>
    {#if btab === 'go' && !trial && goTab === 'join'}
      {#if waitAll.length}<div class="jbot"><button type="button" class="btn2 wide solo" data-k="board-solo" onclick={() => { pick = sel; sheet = 'solo'; }}>⚔ 혼자 도전 (봇 3명)</button></div>
      {:else}<BottomAction dock={false} text="➕ 내가 모집하기" disabled={open || !online} why={open ? `📢 지금 ${cls}반 수업 중 · 팀 모집은 수업 뒤에 · 혼자는 돼요` : !online ? '서버와 끊겨서 팀은 잠깐 쉬어요' : ''} onmain={() => { pick = sel; lockOn = false; pin = ''; sheet = 'post'; }}>{#snippet aux()}<button type="button" class="btn2 wide" data-k="board-solo" onclick={() => { pick = sel; sheet = 'solo'; }}>⚔ 혼자 도전 (봇 3명)</button>{/snippet}</BottomAction>{/if}
    {:else if btab === 'go' && !trial}
      <BottomAction dock={false} text={sel ? `➕ ${sel.no}차시 팀 모집` : '➕ 팀 모집'} disabled={open || !online || !sel || !isOpen(sel)} onmain={() => { if (!sel) return; pick = sel; lockOn = false; pin = ''; sheet = 'post'; }}
        why={!sel || !isOpen(sel) ? '🔒 진도를 나간 차시를 골라요' : open ? `📢 지금 ${cls}반 수업 중 · 팀 모집은 수업 뒤에 · 혼자는 돼요` : !online ? '서버와 끊겨서 팀은 잠깐 쉬어요' : ''}>{#snippet aux()}<button type="button" class="btn2 wide" data-k="board-solo" disabled={!sel || !isOpen(sel)} onclick={() => { if (sel) pickHero = 'go'; }}>⚔ {sel ? `${sel.no}차시 ` : ''}혼자 도전 (봇 3명)</button>{/snippet}</BottomAction>
    {:else if btab === 'go'}
      <BottomAction dock={false} text={sel ? `⚔ ${sel.no}차시 출정` : '⚔ 출정'} disabled={!sel || !isOpen(sel)} onmain={() => { if (sel) pickHero = 'go'; }} why={!sel || !isOpen(sel) ? '🔒 진도를 나간 차시를 골라요' : ''}>{#snippet aux()}<p class="why" data-k="trial-note">체험판 = 🤖 봇 3명과 · 기록 · 💎 · 공적은 남지 않아요 (원래 수업은 친구들과 팀)</p>{/snippet}</BottomAction>
    {/if}
  {/if}
  {#if rkOpen}
    <div class="rkp" role="dialog" aria-label="내 기록 · 내 성장" data-k="board-rank-panel">
      <div class="bar"><button type="button" class="back" aria-label="게시판으로" onclick={() => (rkOpen = false)}>‹</button><b class="t">📜 내 기록 · {sem.replace('-', '년 ')}학기</b><span></span></div>
        <small class="lbl">차시별 최고 (나만 보여요)</small>
        <div class="rkl">{#each best as b (b.lid)}{@const c = mineAgg?.c?.[b.lid]}<div class="rr"><b class="no">{b.no}</b><span class="who">{b.no}차시 · 최고 {recMark(b)} · {b.right}/{b.total}</span><em>{c ? (c.up ? '🛡 승급' : `📈 +${growOf(c)}%p`) : ''}</em></div>{:else}<div class="empty"><span>📜</span><b>아직 판이 없어요</b></div>{/each}</div>
        <small class="lbl">🌱 내 성장 (수업 정답률보다 오른 만큼 · 80% 넘기면 🛡 승급)</small>
        <div class="rkl" data-k="board-grow">{#each Object.entries(mineAgg?.c ?? {}) as [lid, c] (lid)}<div class="rr"><b class="no">{lessonOf(lid)?.no ?? '·'}</b><span class="who">{lessonOf(lid)?.no ?? ''}차시 · 수업 {Math.round(c.base * 100)}% → 최고 {Math.round(c.best * 100)}%</span><em>{c.up ? '🛡 승급' : `📈 +${growOf(c)}%p`}</em></div>{:else}<div class="empty"><span>🌱</span><b>아직 성장 기록이 없어요</b><small>🌱 도전자로 한 판 하면 생겨요</small></div>{/each}</div>
        <small class="lbl">지난 판</small>
        <div class="rkl" data-k="board-myruns">{#each runs.slice(0, 30) as r (r.k)}<div class="rr"><b class="no">{day2(r.at)}</b><span class="who">{r.no}차시 · {r.n > 1 ? `${r.n}인` : '혼자'} · {r.role === 'g' ? '🛡' : '🌱'} {recMark(r)} · {r.right}/{r.total} · {mmss2(r.sec)}</span><em>{r.left ? '👋' : r.clear ? '○' : '✕'}</em></div>{/each}</div>
    </div>
  {/if}
  {#if story && !res && !(mine && mine.phase === 'wait')}<button type="button" class="story" data-k="board-story" onclick={storyDone}><span>왕국 변두리에 균열이 열렸다. 학습지 속 몬스터가 쏟아져 나온다.</span><span>왕은 반마다 기사단을 세웠다. 균열을 닫는 것은 너희다.</span><small>누르면 닫혀요</small></button>{/if}
  {#if toast}<p class="toast3" role="status">{toast}</p>{/if}
</div>

{#if sheet === 'pin' && pinPost}
  <Sheet onclose={() => { sheet = ''; pinPost = null; }} mainText={busy ? '확인 중…' : '👥 참가'} mainDisabled={busy || pin.length !== 4} onmain={joinPin}>
    {#snippet title()}🔒 {pinPost?.no}차시 · 입장 암호{/snippet}
    <p class="pinq">모집한 친구에게 들은 숫자 4자리</p>
    <RuneKeypad value={pin} len={4} onchange={(v) => { pin = v == null || v === '-' ? '' : String(v); pinErr = ''; }} />
    {#if pinErr}<p class="pinerr" role="alert">{pinErr}</p>{/if}
  </Sheet>
{:else if sheet}
  <Sheet onclose={() => { sheet = ''; lockOn = false; pin = ''; }} mainText={pick ? (sheet === 'post' ? `＋ ${pick.no}차시 모집 글 올리기${lockOn ? ' 🔒' : ''}` : `⚔ ${pick.no}차시 혼자 도전`) : '차시를 골라요'} mainDisabled={!pick || (sheet === 'post' && lockOn && pin.length !== 4)} onmain={() => { if (sheet === 'post') { go(); return; } if (!pick) return; setChip(pick.no); sheet = ''; pickHero = 'go'; /* 📜 11/24 혼자 도전 = 차시 고르기 → 늘 용사 확인(#135) */ }}>
    {#snippet title()}{sheet === 'post' ? '＋ 어느 차시로 모집할까요?' : '⚔ 어느 차시로 갈까요?'}{/snippet}
    {#if sheet === 'post'}<label class="lkopt" data-k="board-lock-opt"><input type="checkbox" bind:checked={lockOn} onchange={() => (pin = '')} /> 🔒 암호 걸기 <small>(친구에게 숫자 4자리를 알려 줘요)</small></label>{#if lockOn}<RuneKeypad value={pin} len={4} onchange={(v) => { pin = v == null || v === '-' ? '' : String(v); }} />{/if}{/if}
    <div class="lgrid">{#each LESSONS as p (p.id)}<button type="button" class="lg" class:on={pick?.id === p.id} class:lock={!isOpen(p)} disabled={!isOpen(p)} aria-pressed={pick?.id === p.id} onclick={() => (pick = p)}><b>{isOpen(p) ? p.no : '🔒'}</b><small>{isOpen(p) ? shortOf(p) : `${p.no} · 진도 전`}</small></button>{/each}</div>
  </Sheet>
{/if}
{#if run}<BoardRun L0={run} {uid} {num} hero={lkB} nick={me.nick} {cls} onend={(r) => ended(r, null)} onquit={() => (run = null)} />{/if}
{#if teamRun && isAtb(teamRun)}
  {@const L = lessonOf(teamRun.lesson)}
  <AtbNet {S} pid={teamRun.pid} {uid} names={atbNames(teamRun)} prevStars={L ? myPrev(L.id) : 0} mastery={L ? runs.filter((x) => x.lid === L.id && x.clear).length : 0} onend={(r, again, gone1) => { if (gone1) { atbLeft(teamRun!, r); return; } const L1 = lessonOf(teamRun!.lesson); atbEnded(teamRun!, r); if (again && L1) { pick = L1; sheet = 'solo'; go(); } }} onresult={(r) => { const p0 = teamRun; if (p0) atbEnded({ ...p0, phase: 'wait' }, r); /* phase 는 단추 때 done */ }} />
{:else if teamRun}
  {@const L = lessonOf(teamRun.lesson)}
  {#if L}<BoardRun L0={L} {uid} {num} hero={lkB} nick={me.nick} {cls} team={{ S, code: teamRun.code!, host: teamRun.host === uid, roles: Object.fromEntries(membersOf(teamRun).map((m) => [m.uid, m.role])), names: names(teamRun), cmd: membersOf(teamRun).find((m) => m.role === 'g')?.uid === uid, heroes: Object.fromEntries(membersOf(teamRun).map((m) => [m.uid, m.hero])) }} onend={(r) => ended(r, teamRun)} onquit={() => leavePost(S, teamRun, uid)} />{/if}
{/if}

{#if pickHero && (pickNo ?? 0)}<HeroSheet ids={heroIds} owned={ownH} boss={bossOf(pickNo ?? 0)} no={pickNo ?? 0} cur={me.hero} lv={growM.lv} enh={growM.enh} awk={!!growM.awk} tierOf={(id) => tierOf(id, me.socket?.[id] || (ladder(id)[0] as string | undefined))}
  mainText={pickHero === 'go' ? '⚔ 이 용사로 출발' : '✔ 이 용사로'} onclose={() => (pickHero = '')}
  onpick={(id) => { const mode = pickHero; choseHero(id); if (mode === 'go' && sel && isOpen(sel)) { if (trial) { trial.onsolo(sel); return; } pick = sel; sheet = 'solo'; go(); } }} />{/if}
<style>
  .slh { position: relative; display: inline-grid; place-items: end center; } /* 🎨 발밑 빛 자리 */
  .slpet { position: absolute; right: -16px; bottom: 0; } /* 🐾 */
  .hchip { margin-left: auto; min-height: 36px; padding: 0 10px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 600 14px var(--font); white-space: nowrap; } .hchip.weak { border-color: var(--accent); }
  .qhero { display: flex; align-items: center; gap: 8px; margin-top: 8px; } .qhero span { flex: 1; font: 600 14px var(--font); color: var(--text); } .qhero .btn2.sm { min-height: 44px; }
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
  .tbtn { flex: none; margin-left: auto; min-height: 40px; padding: 0 10px; border-radius: 20px; border: 0; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 13px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); white-space: nowrap; } .tbtn:active { transform: translateY(2px); box-shadow: none; } .tbtn i { margin-left: 4px; font-style: normal; padding: 0 5px; border-radius: 8px; background: var(--bad); color: #fff; font-size: 12px; }
  .back { width: 44px; height: 48px; border: 0; background: none; color: var(--text); font-size: 26px; }
  .t { flex: 1; font-size: 18px; } .wal { height: 32px; padding: 0 10px; border-radius: 16px; background: var(--surface); display: flex; align-items: center; font: 700 14px var(--font); color: var(--gem); }
  .off { margin: 0 var(--s4) var(--s2); padding: 8px 12px; border-radius: var(--r); background: var(--bad-bg); font-size: 13.5px; font-weight: 700; }
  .mid { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
  .card { background: var(--surface); border-radius: var(--r); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .card small { font-size: 13px; color: var(--text-2); }
  .stamp { animation: stampin 0.32s cubic-bezier(.2,1.6,.4,1) both; } .rise { animation: risein 0.2s ease-out both; }
  @keyframes stampin { from { transform: scale(1.6) rotate(-6deg); opacity: 0; } } @keyframes risein { from { transform: translateY(8px); opacity: 0; } }
  .why.tap { color: var(--text-3); }
  .card.row { flex-direction: row; justify-content: space-between; font-size: 14px; }
  .lbl { font-size: 13px; color: var(--text-3); font-weight: 700; }
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
  @media (orientation: landscape) and (max-height: 520px) { .slots { grid-template-columns: repeat(4, 1fr); gap: 8px; } .slot { min-height: 96px; padding: 6px; } } /* 🐞 bughunt 01 가로 844 × 390 = 4칸 한 줄 (2 × 2 면 아래 2칸이 글 뒤로 잘림) */
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
  .rw div { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-2); padding: 2px 0; } .rw .tot { color: var(--text); font-weight: 700; font-size: 16px; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 6px; }
  .card.pin { border: 1px solid var(--line); } .card.pin.host { border-color: var(--accent); } .card.pin.host b { font-size: 20px; color: var(--accent); letter-spacing: 1px; }
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
  /* 🗺 #66 게시판 탭 3 · 출정 띠 · 고른 차시 카드 */
  .btabs { flex: none; display: flex; gap: 6px; padding: 0 var(--s4) var(--s2); }
  .btabs button { flex: 1; min-height: var(--tap); border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 15px var(--font); }
  .btabs button.on { background: var(--accent); color: var(--on-accent); border-color: transparent; box-shadow: 0 3px 0 var(--press-sh, #000); }
  .warln { display: flex; align-items: center; gap: 8px; width: 100%; min-height: var(--tap); padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: inherit; font: inherit; text-align: left; }
  .warln :global(.wl) { flex: 1; } .warln .chev { color: var(--text-3); font-size: 20px; }
  .qcard { display: grid; gap: 6px; padding: 12px 14px; border-radius: var(--r); background: var(--surface); border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); }
  .qcard .qh { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; } .qcard .qh b { font-size: 17px; color: var(--accent); }
  .qcard .srule { margin: -2px 0 0; font: 600 14px var(--font); color: var(--text-2); text-align: right; } /* ⭐ #140-2 별 기준 한 줄 */
  .qcard .qs { flex: none; font-size: 14px; color: #ffd25a; white-space: nowrap; } .qcard .qs em { font-style: normal; color: var(--text-3); }
  .qcard p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-2); } .qcard small { font-size: 13px; color: var(--text-3); }
  .gmap.rec { gap: 10px; }
  .rkp .lbl { display: block; padding: var(--s2) var(--s4) 0; }
  .rkl { display: flex; flex-direction: column; gap: 4px; padding: var(--s2) var(--s4) 0; }
  .rr { display: flex; align-items: center; gap: var(--s2); min-height: 44px; padding: 0 var(--s3); border-radius: var(--r-sm); background: var(--surface); }
  .rr.me { box-shadow: inset 0 0 0 2px var(--accent); }
  .rr .no { min-width: 40px; font-size: 14px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .rr .who { flex: 1; min-width: 0; font-size: 14px; } .rr .who i { font-style: normal; color: var(--text-2); }
  .rr em { font-style: normal; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
  .card.up { border: 2px solid var(--accent); text-align: center; } .card.up b { font-size: 22px; color: var(--accent); }
  /* 📜 #70 */
  .rift { margin: 0; font-size: 14px; color: var(--text-2); }
  .story { position: absolute; inset: auto 16px 96px; z-index: 6; display: grid; gap: 6px; padding: 16px; border-radius: var(--r-lg, 20px); border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); background: rgba(10, 8, 6, 0.94); color: var(--text); font: 500 15px/1.5 var(--font); text-align: left; box-shadow: 0 6px 24px #000a; }
  .story small { color: var(--text-3); font-size: 13px; }
  /* 📅 #73 예약 */
  .lkopt { display: flex; align-items: center; gap: 8px; min-height: 48px; font: 700 15px var(--font); } .lkopt input { width: 22px; height: 22px; } .lkopt small { color: var(--text-2); font-weight: 500; }
  .rdays, .rtimes { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
  .rdays button, .rtimes button { min-height: 44px; padding: 0 14px; border-radius: 22px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 15px var(--font); }
  .rdays button.off { opacity: 0.45; }
  .rdays button.on, .rtimes button.on { background: var(--accent); color: var(--on-accent); border-color: transparent; }

  /* ⚔ 📜 #135 출정 탭 (세로 360 ~ 430 기준) */
  .mp.left:not(.on) { box-shadow: 0 0 0 3px #f5b84a99, 0 0 12px #f5b84acc; animation: mpleft 1.6s ease-in-out infinite; } /* 별이 남은 열린 차시 = 금빛 테 (「균열 n곳」 글 대신) */
  @keyframes mpleft { 50% { box-shadow: 0 0 0 3px #ffd98a, 0 0 18px #f5b84a; } }
  .qcard.v2 { gap: 10px; padding: 12px; grid-template-columns: minmax(0, 1fr); min-width: 0; } .qcard.v2 > * { min-width: 0; }
  .qcard.v2 .gh { display: flex; align-items: center; gap: 10px; }
  .qcard.v2 .bimg { flex: none; width: 52px; height: 52px; border-radius: 12px; background: #2a1f33; display: grid; place-items: center; overflow: hidden; font-size: 24px; }
  .qcard.v2 .t { flex: 1; min-width: 0; } .qcard.v2 .t b { display: block; font: 900 17px var(--font); color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .qcard.v2 .t small { font-size: 14px; color: var(--text-2); }
  .qcard.v2 .wkr { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font: 700 14px var(--font); color: var(--text-2); }
  .qcard.v2 .fam { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 8px; border-radius: 14px; background: var(--surface-2); color: var(--text); }
  .qcard.v2 .hrow { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 12px; background: var(--surface-2); }
  .qcard.v2 .hs { flex: none; width: 48px; height: 48px; border-radius: 10px; display: grid; place-items: center; overflow: hidden; background: #2a2016; }
  .qcard.v2 .n { flex: 1; min-width: 0; } .qcard.v2 .n b { display: block; font: 800 15px var(--font); } .qcard.v2 .n small { font-size: 14px; color: var(--text-2); }
  .qcard.v2 .wk { display: inline-block; margin-left: 4px; padding: 0 6px; border-radius: 6px; background: var(--accent); color: #2a1c05; font: 900 14px/20px var(--font); font-style: normal; }
  .qcard.v2 .chg { flex: none; min-height: 48px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 14px var(--font); white-space: nowrap; box-shadow: 0 3px 0 #0b0c10; }
  .qcard.v2 .ql, .qcard.v2 [data-k='board-full'] { font-size: 14px; color: var(--text-3); }
  .empty1 { margin: 2px 0; font-size: 14px; color: var(--text-2); text-align: center; }
  @media (prefers-reduced-motion: reduce) { .mp.left { animation: none; } }
  /* 📋 📜 11/24 출정 시안 = 위 탭 2 · 팀 참가 목록 (ui-senior 토큰) */
  .seg { flex: none; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: var(--r); background: var(--surface); }
  .seg button { min-height: var(--tap); border: 0; border-radius: 10px; background: transparent; color: var(--text-2); font: 800 16px var(--font); display: flex; align-items: center; justify-content: center; gap: 6px; }
  .seg button.on { background: var(--accent); color: var(--on-accent); box-shadow: 0 3px 0 var(--press-sh); } .seg .cnt { min-width: 24px; padding: 0 7px; border-radius: 99px; background: rgba(0, 0, 0, 0.18); font: 800 13px/22px var(--font); }
  .jhead { flex: none; display: flex; justify-content: space-between; align-items: baseline; color: var(--text-2); font: 600 14px var(--font); } .jhead small { color: var(--text-3); }
  .jchips { flex: none; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; } .jc { flex: none; min-height: 40px; padding: 0 14px; border-radius: 99px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); font: 700 14px var(--font); } .jc.on { border-color: var(--accent); color: var(--accent); }
  .jlist { display: flex; flex-direction: column; gap: 8px; }
  .jgrp { display: flex; align-items: center; gap: 8px; margin-top: 6px; color: var(--text-2); font: 700 14px var(--font); } .jgrp.dim { opacity: 0.55; } .jgrp::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  .jcard { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--r); background: var(--surface); } .jcard.dim { opacity: 0.5; }
  .face { position: relative; width: 52px; height: 52px; flex: none; border-radius: 50%; overflow: hidden; background: var(--surface-2); box-shadow: inset 0 0 0 2px var(--line); }
  .face .fin { position: absolute; left: -24px; top: 4px; } /* 용사 칸 80 × 64 × 1.25 → 머리(가운데 위)가 동그라미 가운데 */
  .jt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; } .tags i { font: 700 12.5px/22px var(--font); font-style: normal; padding: 0 8px; border-radius: 6px; background: var(--surface-2); color: var(--text); } .tags .gd { color: var(--ok); } .tags .lkg { background: transparent; color: var(--text-2); padding: 0; }
  .boss { font: 800 16px var(--font); color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .who { display: flex; align-items: center; gap: 6px; font: 600 13.5px var(--font); color: var(--text-2); } .dots { display: inline-flex; gap: 3px; } .dots i { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--text-3); } .dots i.f { background: var(--ok); border-color: var(--ok); }
  .jgo { flex: none; min-width: 64px; min-height: var(--tap); padding: 0 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 800 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .jgo:active { transform: translateY(2px); box-shadow: none; }
  .jno { flex: none; min-width: 64px; text-align: center; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--line); color: var(--text-3); font: 700 13px/1.3 var(--font); }
  .jempty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 32px 12px; color: var(--text-2); text-align: center; } .jempty span { font-size: 44px; } .jempty b { font: 800 17px var(--font); color: var(--text); } .jempty small { font: 600 14px var(--font); color: var(--text-3); }
  .jbot { position: sticky; bottom: 0; padding: 8px 0 calc(8px + env(safe-area-inset-bottom)); background: linear-gradient(transparent, var(--bg) 30%); } .jbot .solo { width: 100%; min-height: 52px; font-size: 16px; }
</style>
