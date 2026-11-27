<script lang="ts">
  import DiffAsk from './battle/DiffAsk.svelte';
  import { TRIAL } from '../channel';
  import KeyGate from './q/KeyGate.svelte';
  import KeyChest from './q/KeyChest.svelte';
  import { serverNow } from './clock.svelte';
  import { holdWake } from './wake.svelte';
  import { keepScroll } from './keepScroll';
  import { gaugeView } from './battle/gauge';
  import BossForm from './q/BossForm.svelte';
  import { HIDE_GRACE, V4, isDummy } from '../raid/raid';
  import { noteHelp } from '../school/help';
  import { feat } from '../school/features.svelte';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Store } from '../model/types';
  import { PROFILES } from '../model/profiles';
  import { atkClock, atkTrack, bossHp, chainDown, chainRecord, gameNow, isChain, isEnd, isLobby, monsterHp, resultOf, solveLock, stepIdx, stepOf } from '../raid/raid';
  import { heartbeat, leave, sayWords, scoutReady } from '../raid/actions';
  import { liveRoom, liveValue } from './room.svelte';
  import { clock, useClock } from './clock.svelte';
  import Scene from './battle/Scene.svelte';
  import type { Mate, MateHit } from './board/mates';
  import ModeSwitch from './ModeSwitch.svelte';
  import { paperOn } from './submit.svelte';
  import BottomAction from './battle/BottomAction.svelte';
  import SymSheet from './battle/SymSheet.svelte';
  import MonsterForm from './q/MonsterForm.svelte';
  import ChainView from './q/ChainView.svelte';
  import BossCard from './q/BossCard.svelte';
  import SymText from './q/SymText.svelte';
  import { fx, heroPose } from './battle/fx.svelte';
  import AttackFx from './battle/AttackFx.svelte';
  import { attackDef, attackMs, attackOf, attackStrong, type AttackDef } from '../raid/attacks';
  import { holyArmed, holyCan, holyOn, pracHitsAll, stone, BOSS_ID as BID, plainRecord, unlocksOf, healsGiven } from '../raid/raid';
  import { holyArm, holyUse } from '../raid/actions';
  import { guardQ } from './battle/fx.svelte';
  import { atkSfx, sfx, soundPref } from './sound.svelte';
  import { actx } from './webaudio';
  import { symState } from './battle/symsheet.svelte';
  import Sheet from './battle/Sheet.svelte';
  import PrepImg from './q/PrepImg.svelte';
  import Vid from './q/Vid.svelte';
  import { vidOf, vidsAt } from '../school/video';
  import Loot from './result/Loot.svelte';
  import ConceptCheckCard from './q/ConceptCheckCard.svelte';
  import { ccRan } from '../school/cc';
  import { conceptOf } from '../school/prep';
  import { carryStates, summaryOf } from '../school/records';
  import { carryRecords } from '../school/carry';
  import { rewardOf, settle } from '../school/reward';
  import { SUBJ } from '../engine/subject';
  import { kstDay } from '../board/board';
  import { BUILD } from '../build';
  import { petFeedNow, savedCos, savedLook, savedPet } from '../store/me.svelte';
  import { isExcluded } from '../school/school';
  import { mailLine, type Mail } from '../school/mail';
  import { meBound } from '../store/meSync';
  import { addTo, isReady, whenReady } from '../store/atomic';
  import { CHALS, chalState } from '../school/challenges';
  import { titleData } from '../model/titles';
  import { titleOf } from '../model/hero';
  import { expFrom, expLine, expOf, prepRecPath, EXP_MIN } from '../school/explore';
  import { bonusBase as bonusBaseX } from '../school/castle';
  import { shouldNudge } from '../school/idle';
  import { isSent } from '../school/sendReview';
  import { loadFunPhone } from './lazy'; // 📦 쉼터 놀이 = 따로 받는 묶음 (화면이 뜬 뒤 미리 받아 둠 · 쉼터가 열릴 때 멈칫 없음)
  import { submitWho } from './submit.svelte';
  import { daySolved, lastWeekOf, noteSolved, proofLine } from '../school/study';
  import { solvedN } from '../raid/raid';
  import { analyze } from '../raid/combo';
  import { petriToast } from './q/petriPop.svelte';
  import GatePhone from './gate/GatePhone.svelte';
  import { gateOf, isGatePack } from '../school/gate';

  // 📱 학생 폰 (탭 B) — ②B 틀: 장면 띠 → 카드(정찰 · 문제 · 결과 · 틀림이 같은 자리) → 주요 단추 1
  //   다시 그려도 스크롤 · 입력이 날아가지 않음: 화면 조각은 그대로 두고 바뀐 칸만 고침 (정식 paint() 원칙)
  const { S, L, code, uid, num, nick: nick0 = '', cls = '', board = false, cardOnly = false, mates, mateFeed, photoS = null, extWr = null }: { /** 🏰 성채 = 서술형 단추를 문제 칸 안에 (방이 사진을 따로 처리 · #56) */ extWr?: { label: string; sub: string; on: () => void } | null; /** 📷 🎯 허수아비 사진 = 서버 저장소 (#40) */ photoS?: Store | null; S: Store; L: LessonPack; code: string; uid: string; num: number; nick?: string; cls?: string; /** 📋 게시판 던전(#143) = 수업 기록(records)을 쓰지 않음 */ board?: boolean; /** 🎮 종합실 시연 (📜 2026-11-14 「전투 장면은 없애도 될 것 같아」) = 문제 카드부터 아래만 · 장면 띠 · 용사 · 몬스터 · 체력 · 💎 · 개념 · 게임/제출 스위치 없음 */ cardOnly?: boolean; /** 👥 게시판 팀 동료 · 동료 공격 사건 (📜 2026-11-14 · 없으면 수업 화면 그대로) */ mates?: Mate[]; mateFeed?: MateHit[] } = $props();
  const unwake = holdWake(); onDestroy(unwake); // 📱 수업 화면 = 화면 꺼짐 방지 (정식 WAKE_SCREENS screen-student) · 안내 띠 = 학생 앱 입구(App) 한 곳
  const nick = untrack(() => nick0 || `학생 ${String(num).padStart(2, '0')}`);
  // 🔄 들어온 판 (옛 판 확인 · 시험은 ?ver= 로 옛 판 흉내) · 선생님이 「새로 고침」을 보내면 다시 불러옴
  const ver = untrack(() => new URLSearchParams(location.search).get('ver') || BUILD);
  const loadedAt = serverNow(); // ⏱ 선물 at(서버 시각)과 같은 시계
  const live = untrack(() => {
    const x = untrack(() => !!cls && isExcluded(S, cls, num));
    const hb = () => heartbeat(S, code, uid, num, nick, { cls, ver, hero: savedLook().hero, base: savedLook().base, fx: savedLook().fx, enh: savedLook().enh, x });
    hb();
    const bye = () => leave(S, code, uid);
    addEventListener('pagehide', bye);
    // 👻 (📜 11/24 🔨 #9 ① 학교판 첫 수업 「튕긴 학생이 계속 접속 중 → 몬스터가 안 쓰러짐」 · ❓ #10 B 30초 유예 · DECISIONS c90bc05): 화면이 숨으면(화면 꺼짐 · 다른 앱 · 카메라로 QR · 탭 뒤로)
    //   30초(HIDE_GRACE)까지는 신호를 이어 「접속 중」(계산기 · 카메라 잠깐 = 표시 없음) → 넘으면 끊김(seen 0) · 신호 멈춤 · 다시 보이면 바로 신호 (아이폰은 숨는 순간 앱이 멈춰 8초 뒤 끊김 = 그대로)
    let hidAt: number | null = null, gone = false;
    const vis = () => { if (document.visibilityState === 'hidden') { hidAt ??= Date.now(); } else { hidAt = null; gone = false; hb(); } };
    const tick = () => { if (hidAt == null) { hb(); return; } if (Date.now() - hidAt < HIDE_GRACE) hb(); else if (!gone) { gone = true; bye(); } };
    document.addEventListener('visibilitychange', vis); addEventListener('freeze', bye);
    const beat = setInterval(tick, 3000);
    const lr = liveRoom(S, code);
    return { v: lr.v, stop: () => { clearInterval(beat); lr.stop(); removeEventListener('pagehide', bye); document.removeEventListener('visibilitychange', vis); removeEventListener('freeze', bye); } };
  });
  const stopClock = useClock();
  onDestroy(() => { live.stop(); stopClock(); });

  const R = $derived(live.v.room);
  $effect(() => { const t = R?.state.reload?.[uid]; if (t && t > loadedAt) location.reload(); });
  // 🎁 수업 중 선생님 선물 = 받은 학생 폰에만 한 줄 (지갑에는 캠프에서 들어감 · #119 덧붙임)
  const gv = untrack(() => liveValue<Record<string, { g: number; at: number; mail?: boolean; fun?: string }>>(S, `gifts/${uid}`));
  onDestroy(gv.stop);
  const giftNew = $derived(Object.values(gv.v.val || {}).filter((x) => x && !x.mail && !x.fun && x.at > loadedAt && clock.now - x.at < 4000));
  // ✉ 수업 중 선생님 메시지 · 답장 (#130) = 받은 학생 폰에만 한 줄 (💎 는 캠프에서 지갑에)
  const mv = untrack(() => liveValue<Record<string, Mail>>(S, `mail/${uid}`));
  onDestroy(mv.stop);
  const mailNew = $derived(Object.values(mv.v.val || {}).filter((x) => x && x.at > loadedAt && clock.now - x.at < 4000).sort((a, b) => b.at - a.at)[0] ?? null);
  const now = $derived(clock.now); // ① 수업 시계 = 접속 · 체력 머릿수 · (b8) 남은 수업 시간
  const gnow = $derived(R ? gameNow(R, now) : now); // ② 게임 시계 (#118) = 공격 멈춤 초 · 생각 시간 — 집중이면 멈춤
  const step = $derived(R ? stepOf(L, R) : null);
  const mid = $derived(step?.kind === 'monster' && L.monsters[step.id] ? step.id : null);
  const chain = $derived(!!R && !!mid && isChain(L, R, mid));
  const hp = $derived(R && mid ? monsterHp(L, R, mid, now) : null);
  const bhp = $derived(R && L.boss ? bossHp(L, R, now) : null);
  const down = $derived(!!hp && hp.max > 0 && hp.left <= 0);
  const pracAll = $derived(down && R && step?.kind === 'monster' ? pracHitsAll(L, R, step.id) : 0); // 🔥 처치 결과 한 줄
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const gem = $derived(R ? (() => { const w = (R.meta as { wallet?: unknown }).wallet; if (typeof w === 'number') return w; const g = PROFILES[R.meta.profile]?.reward.gem; return typeof g === 'number' ? g : 0; })() : 0); // 👩‍🏫 체험판 = meta.wallet (#60-1)
  const crec = $derived(R && mid && chain ? chainRecord(L, R, mid, uid) : null);
  const downs = $derived(R && mid && chain ? chainDown(L, R, mid, now) : []);
  // 🎞 용사 모션 (📜 2026-11-14 머리 🔨): ❤ 0 잠김 = 쓰러짐 줄 · 받은 힐 + 풀어주기가 늘면 힐 받음 줄 · 내가 ⚡ 쓰면(힐 · 묶기 · 🌟) 힐 시전 줄
  const myRec = $derived(R && mid && L.monsters[mid] ? (crec ?? plainRecord(L, R, mid, uid)) : null);
  const slump = $derived(!!myRec && (!!myRec.locked || ((myRec as { fail?: boolean }).fail ?? (!myRec.perfect && myRec.submitted && myRec.left <= 0 && !myRec.canRetry))));
  const healN = $derived(myRec && R && mid ? myRec.healed + unlocksOf(R, mid, uid) : 0);
  const gaveN = $derived(R && mid ? healsGiven(R, mid, uid) : 0);
  let gave0 = -1;
  $effect(() => { const g = gaveN; untrack(() => { if (gave0 >= 0 && g > gave0) heroPose('heal', 1400); gave0 = g; }); });
  // 🔊 2차 🔥 반 콤보 10 · 20 · 30 (정식 student.js thrillWatch → tierNote · 처음 본 단계는 기억만 · 단계마다 한 번)
  let tierSeen: Set<string> | null = null;
  $effect(() => {
    const r = R; if (!r) return;
    const ks = analyze(L, r).binds.filter((b) => b.why.startsWith('tier')).map((b) => `${b.at}|${b.why}`);
    untrack(() => { const first = !tierSeen; tierSeen ??= new Set(); let snd = false; for (const k of ks) if (!tierSeen.has(k)) { tierSeen.add(k); if (!first) snd = true; } if (snd) sfx('combo', 0.85); });
  });
  // 졸개 체력(정식 chainDown: 넘어야 할 학생 수 − 넘은 학생) · 대장 = 공동 체력
  const sceneHp = $derived.by(() => {
    if (step?.kind === 'boss' && bhp) return { hp: { left: bhp.left, max: bhp.max }, label: L.boss?.title.split(' · ').pop() ?? '보스' };
    if (crec && !crec.done && crec.stage < crec.n - 1) { const d = downs[crec.stage]; if (d) return { hp: { left: d.left, max: d.max }, label: `졸개 ${'①②③④⑤⑥'[crec.stage]}` }; }
    return hp ? { hp: { left: hp.left, max: hp.max }, label: chain ? '대장' : '' } : null;
  });

  // 👾 몬스터 공격: 모든 기기가 같은 시계로 같은 순간에 맞음 → 문제 화면이면 lock 초 동안 공격 효과 (정식 monsterStrike · #152 공격 종류 = 차시 팩 attack)
  //   멈춤 · 파지직 = 입력 막힘 / 안개 · 얼음 · 화염 = 손풀기로 일찍 풀림 / 강타 = 흔들기만 · 모두 lock 초 지나면 저절로
  //   #161 세기 = 몬스터(보스) 체력 50% 아래면 강(분노 · 효과 조금 길게 · 소리 · 장면 붉게 · 멈춤 시간 상한 안) · 속성 소리
  let atk = $state<{ def: AttackDef; at: number; until: number; strong: boolean } | null>(null);
  const memo = {};
  function strike(def: AttackDef, ms: number, strong = false) {
    if (cardOnly) return; // 🎮 시연 = 몬스터 공격 · 효과 · 소리 없음 (📜 2026-11-14 「교사용 시연에 전투 모션도 나와」)
    atk = { def, at: gnow, until: gnow + ms, strong }; iceEnd = 'melt';
    fx.ice = def.id === 'ice' ? 4 : 0; fx.fire = def.id === 'fire'; fx.bind = def.id === 'bind'; fx.chain = { cut: 0, broken: false, open: false };
    sfx(atkSfx(def)); // 🔊 2차: 혼란 = 어질 · 어둠 = 먹물 · 독 = 거품 · 수면 = 하품 · 파지직 = 지지직 (속박 = 사슬 철컥은 사슬 그림이 냄) if (strong) setTimeout(() => sfx('hurt', 0.5), 180);
  }
  $effect(() => {
    if (!R) return;
    const c = atkClock(L, R, now);
    if (!c || c.paused || !feat('mon-attack')) return; // 🧩 💥 몬스터 공격 꺼짐 = 반격 없음
    if (atkTrack(memo, c, `${c.kind}|${c.mid}`).strike && !symState.open) untrack(() => {
      // 🛡 홀리 방패 (정식 student.js 395): 켜 둔 +10 용사가 있으면 반 전체 안 멈춤 · 내가 켰으면 막은 기록(→ 🗿 석화 10초) + 날개 · 방패
      const hg = holyArmed(R, c.mid, now, c.per); if (hg.length) { guardStrike(hg, c.mid); return; }
      const d = attackOf(L, step, c.k), st = attackStrong(sceneHp?.hp); strike(d, attackMs(d, c.lock, st), st);
    });
  });
  let gtoast = $state('');
  let readyAsk = $state(''); // 📝 준비 완료 = 「학습지 빈칸을 모두 채웠나요?」 확인 (📜 2026-11-16 선생님 d4)
  // 🤝 손 놓은 학생 (📜 2026-11-16 · 🌊 ① · school/idle.ts): 공격 단계 · 아직 다 못 맞힘 · 90초 입력 없음 → 「🤝 첫 줄만 같이 볼까?」 + 리모컨 노랑 · 입력하면 풀림 · 몬스터마다 한 번
  let idleLast = $state(0), idleMid = $state<string | null>(null);
  const idleAsked = new Set<string>();
  const idleAttack = $derived(!!(R && mid && !scout?.on && !R.state.rest && !R.state.focus && !R.state.holdAt && !R.state.closed && !paperOn()));
  const idleDone = $derived(!R || !mid ? true : chain ? !!chainRecord(L, R, mid, uid).done : !!plainRecord(L, R, mid, uid).perfect);
  // 🔥 #67 탐사대: 이 차시를 배움터 예습에서 몬스터 2개 이상 처치 → 수업 방 내 칸에 exp (TV 횃불 · 🔥 · 점수 0) · 한 번만
  let expDone = false;
  // 🎨 옷장 (📜 11/25): 내가 입은 것 = 방 명단 내 칸에 id 만 (TV 공격 색 · 이름표) · 바뀔 때만
  let cosSent = ''; $effect(() => { if (board || !R?.players?.[uid]) return; const pt = savedPet(), c = { ...savedCos(), ...(pt ? { pet: `${pt.kind}|${pt.food}|${pt.cos ?? ''}` } : {}) }, j = JSON.stringify(c); if (j === cosSent || j === JSON.stringify((R.players[uid] as { cos?: unknown }).cos ?? {})) { cosSent = j; return; } cosSent = j; untrack(() => S.set(`rooms/${code}/players/${uid}/cos`, Object.keys(c).length ? c : null)); });
  $effect(() => { const b = meBound(); if (expDone || board || !R || !b || !R.players?.[uid]) return; expDone = true; untrack(() => { if ((R.players?.[uid] as { exp?: unknown } | undefined)?.exp) return; const e = expFrom(b.S.get(prepRecPath(bonusBaseX(b.cls, b.num), L.id))); if (e.n >= EXP_MIN) S.set(`rooms/${code}/players/${uid}/exp`, e); }); });
  // 🏆 #73 📺 전설 도전과제: 수업이 끝나면(결과 화면) 아직 캠프에서 못 본 👑 전설 달성 = 방 내 칸 ach 에 한 번 (TV 마무리 화면 한 줄 · 캠프 연출은 그대로)
  let achDone = false;
  $effect(() => { const b = meBound(); if (achDone || board || !R || !result || !b || !R.players?.[uid]) return; achDone = true; untrack(() => { try {
    const c = { d: titleData(b.S, b.cls, b.num) }, seen = (b.S.get<Record<string, unknown>>(`${bonusBaseX(b.cls, b.num)}/ach`) || {}) as Record<string, unknown>;
    const legs = CHALS.filter((ch) => ch.tier === 'leg' && !ch.hide?.(c) && chalState(ch, c).done && !seen[ch.id] && !(c.d.gem?.log as Record<string, unknown> | undefined)?.[`chal_${ch.id}`]).map((ch) => ({ id: ch.id, name: ch.name, title: ch.reward.title ? titleOf(ch.reward.title)?.name ?? '' : '' }));
    if (legs.length) S.set(`rooms/${code}/players/${uid}/ach`, legs);
  } catch { /* 셈 실패 = 줄 없음 */ } }); });
  function idleClear() { if (idleMid) { S.set(`rooms/${code}/players/${uid}/idle`, null); idleMid = null; } }
  function poke() { idleLast = S.now(); idleClear(); }
  $effect(() => { const on = (e: Event) => { if ((e.target as Element | null)?.closest?.('[data-k="idle"]')) return; poke(); }; const o = { capture: true, passive: true }; /* 🤝 띠 안 누름 = 단추가 처리(먼저 지우면 누르기 전에 사라짐) */ for (const e of ['pointerdown', 'keydown', 'input']) window.addEventListener(e, on, o); return () => { for (const e of ['pointerdown', 'keydown', 'input']) window.removeEventListener(e, on, o); }; });
  $effect(() => { void mid; const a = idleAttack; untrack(() => { idleLast = S.now(); if (!a) idleClear(); }); }); // 공격 단계가 시작 · 멈춤이 끝나면 그때부터 셈
  $effect(() => { const t = now, a = idleAttack, d = idleDone, m = mid; untrack(() => {
    if (idleMid && (d || idleMid !== m)) idleClear();
    if (m && shouldNudge({ attack: a, done: d, asked: idleAsked.has(m), now: t, last: idleLast })) { idleAsked.add(m); idleMid = m; S.set(`rooms/${code}/players/${uid}/idle`, { mid: m, at: t }); }
  }); });
  // ✅ 도장 📜 (📜 2026-11-16 · 🌊 ⑤): 선생님이 리모컨에서 도장을 찍으면 그 자리에서 한 번 · 📜 는 캠프에 오면 받음(gifts)
  let stampSeen: number | null | undefined = undefined;
  $effect(() => { const v = R?.stamp?.[uid] ?? null; untrack(() => { if (stampSeen === undefined) { stampSeen = v; return; } if (v && v !== stampSeen) { gtoast = '✅ 도장! 📜 +1'; sfx('star', 0.7); setTimeout(() => (gtoast = ''), 2600); } stampSeen = v; }); });
  function guardStrike(us: string[], mid: string) {
    const mine = us.includes(uid), names = us.filter((u) => u !== uid).map((u) => R?.players?.[u]?.nick || '친구');
    if (mine) { holyUse(S, code, uid, mid); guardQ.v += 1; }
    const tell = () => { gtoast = `🛡 ${mine ? `내${names.length ? ' · ' + names.join(' · ') : ''}` : names.join(' · ') + '의'} 홀리 방패! 안 멈춰요`; sfx('correct', 0.75); setTimeout(() => (gtoast = ''), 1600); };
    setTimeout(tell, mine ? 1120 : 200);
  }
  // 🛡 켤 수 있음 · 켜 둠 (장면 띠 왼쪽 위 단추) · 🗿 석화 남은 초
  const holyMid = $derived(step?.kind === 'boss' ? BID : mid);
  const holyState = $derived(!R || !holyMid ? '' : holyOn(R, holyMid, uid) ? 'on' : holyCan(L, R, uid, now) ? 'can' : '');
  const stoneNow = $derived(R && holyMid ? stone(R, holyMid) : null);
  const stoneLeft = $derived(stoneNow ? Math.max(0, Math.ceil((stoneNow.until - now) / 1000)) : 0);
  function toggleHoly() { if (!R || !holyMid) return; const on = holyState !== 'on'; holyArm(S, code, uid, holyMid, on); sfx(on ? 'holy-on' : 'click', 0.8); }
  const atkOn = $derived(!!atk && atk.until > gnow && !scout?.on);
  const stunned = $derived(atkOn && !!atk?.def.lockInput);
  // 손풀기로 풀림 (얼음 4번 · 화염 꾹 1초) · 시간이 지나면 저절로
  let iceEnd = $state<'shatter' | 'melt'>('melt'); // 🧊 얼음이 톡 4번으로 끝났나(깨짐) · 시간으로 끝났나(녹음)
  $effect(() => { if (atk && atk.until > gnow && atk.def.id === 'ice' && fx.ice === 0) untrack(() => (iceEnd = 'shatter')); });
  $effect(() => { if (atk && atk.until > gnow && ((atk.def.id === 'ice' && fx.ice === 0) || (atk.def.id === 'fire' && !fx.fire))) untrack(() => { if (atk) atk = { ...atk, until: gnow }; }); });
  $effect(() => { if (!atkOn) untrack(() => { fx.ice = 0; fx.fire = false; fx.bind = false; }); });
  // 화면 시험 고리(#151 · #152 · 학생 화면엔 안 보임 · 출시 전 메모 5): 지금 몬스터 공격을 한 번 맞음 (종류 = 등록 표 id)
  (globalThis as { __strike?: (ms?: number, id?: string, strong?: boolean) => void }).__strike = (ms = 3000, id = 'pause', strong = false) => strike(attackDef(id), ms, strong);
  $effect(() => { fx.block = stunned; }); onDestroy(() => { fx.block = false; fx.ice = 0; fx.fire = false; fx.bind = false; }); // ⛓ 입력 막힘이 바뀔 때마다 사슬 표시를 지우지 않게 (정리는 화면을 떠날 때만) // 💥 주요 단추 = 같은 자리 「⏳ 막는 중…」(#151)
  const locked = $derived(!!scout?.on || stunned);
  const result = $derived(R && isEnd(L, R) ? resultOf(L, R, uid) : null);
  // 📚 수업 끝 기록 = 시험 서버 records/{반}/{번호}/{차시} = 정식 꼴 (#141 · 그 학생으로 로그인한 폰만 · 한 수업에 한 번 · 다시 끝나면 덮어씀)
  const closedMid = $derived(!!R && !!R.state.closed && !isLobby(R) && !isEnd(L, R)); // 🎯 수업을 중간에 닫음 = 기록도 남김(남은 몬스터 = 복습으로 · 📜 2026-11-16)
  // 🐞 11/20 ① 받기 전 빈 값: 내 기록 · 지갑 · EXP · held 칸을 받기 전에 쓰면 = 옛 기록을 null 로 · 받은 보상을 다시 · 💎 total 을 「0 + 보상」으로 덮어씀 → 받은 뒤에 씀
  const gatePack = untrack(() => isGatePack(L)); // 🌀 차원문 차시 = 수업 기록 · 수업 보상 · 펫 먹이 없음 (보상 = 답안지 통과 한 번 · 성채 그대로)
  $effect(() => { const b = meBound(); if (!(result || closedMid) || !b || board || !R || gatePack) return; const go = () => untrack(() => { if (!R) return; const path = `records/${b.cls}/${b.num}/${L.id}`; const before = b.S.get<Record<string, { code?: string; firstXp?: number } | null>>(`records/${b.cls}/${b.num}`) || {}; b.S.set(path, summaryOf(L, R, uid, code, S.now(), b.S.get(path))); if (L.carryOf) carryRecords(L, carryStates(L, R, uid, S.now()), `records/${b.cls}/${b.num}`, (p) => b.S.get(p), (p, v) => b.S.set(p, v)); feedLesson(); /* 🐾 수업 한 차시 끝까지 = 펫 먹이 +5 (차시마다 한 번 · 📜 11/25) · 🐞 11/26 보상 앞에 · 따로 */ payReward(b, before); }); const need = [`records/${b.cls}/${b.num}`, `gem/${b.cls}/${b.num}`, `xp/${b.cls}/${b.num}`, `held/${b.cls.replace(/[.#$/[\]]/g, '_')}`]; if (need.every((x) => isReady(b.S, x))) go(); else void whenReady(b.S, need, 120000).then((ok) => { if (ok) go(); else rewardLine = '⚠ 서버가 느려 기록을 아직 못 남겼어요 · 다시 들어오면 남겨요'; }); }); // 정식 꼴 (#163 ③ · school/records.ts)
  // 🐾 👩‍🏫 체험판 = 서버 기록이 없어도 수업 끝(결과)이면 펫 먹이 (📜 11/25 #둥지-1 B · 차시마다 한 번 · ×5 는 petFeedNow 안)
  $effect(() => { if (!TRIAL || !result || board) return; untrack(() => feedLesson()); });
  // 🐞 11/26 1-1반 「끝났는데 먹이 5 가 안 들어와요」: 먹이를 줘도 수업 끝 화면에 아무 표시가 없었음 + 보상 계산 뒤에 붙어 있어 앞에서 멈추면 같이 빠짐 → 따로 · 먼저 · 끝 화면에 한 줄
  let petLine = $state(''), petTried = false;
  function feedLesson() {
    if (petTried) return; petTried = true;
    try { const n = petFeedNow({ lesson: L.id }); petLine = n ? `🐾 펫 먹이 +${n}` : savedPet() ? '🐾 이 차시 먹이는 이미 받았어요' : ''; }
    catch (e) { petTried = false; console.warn('펫 먹이', e); }
  }
  // 💎 · 🌱 수업 보상 (📜 2026-11-15 출시 막는 것 3 · school/reward.ts · 정식 값 그대로) — 같은 수업은 늘어난 만큼만 · 서버 칸 = 정식 gem/log · xp/log
  let rewardLine = $state('');
  function payReward(b: NonNullable<ReturnType<typeof meBound>>, before: Record<string, { code?: string; firstXp?: number } | null>) {
    if (!R) return;
    const gp = `gem/${b.cls}/${b.num}`, xp = `xp/${b.cls}/${b.num}`, t = S.now();
    const gr = b.S.get<{ total?: number; day?: Record<string, number>; log?: Record<string, { g?: number }> }>(gp) || {}, xr = b.S.get<{ total?: number; log?: Record<string, { xp?: number }> }>(xp) || {};
    const held = b.S.get<Record<string, unknown>>(`held/${b.cls.replace(/[.#$/[\]]/g, '_')}`) || {}, recs = Object.fromEntries(Object.entries(before).filter(([, v]) => !!v)); // 🔁 연속 · 🎁 첫 출정 (정식 result.js)
    const rw = rewardOf(L, R, uid, code, t, { records: recs, held, lessons: SUBJ.lessonList, xpTotal: Number(xr.total) || 0 });
    if (rw.firstXp && !b.S.get(`records/${b.cls}/${b.num}/${L.id}/firstXp`)) b.S.set(`records/${b.cls}/${b.num}/${L.id}/firstXp`, rw.firstXp); // 정식 rec.firstXp
    const r = settle(rw, { gem: Number(gr.total) || 0, xp: Number(xr.total) || 0, day: gr.day, gemLog: gr.log || {}, xpLog: xr.log || {} }, kstDay(t), t);
    if (!r.gem && !r.xp) return;
    for (const [k, v] of Object.entries(r.writes)) b.S.set(`${k.startsWith('gem/') ? gp : xp}/${k.slice(k.indexOf('/') + 1)}`, v);
    if (r.gem) { addTo(b.S, `${gp}/total`, r.gem); for (const [d, n] of Object.entries(r.day)) if (n !== gr.day?.[d]) addTo(b.S, `${gp}/day/${d}`, n - (Number(gr.day?.[d]) || 0)); } // 🐞 ② 더하기 (다른 기기 · 캠프 저장과 안 지움)
    if (r.xp) addTo(b.S, `${xp}/total`, r.xp);
    rewardLine = r.lines.join(' · ');
  }
  // 💬 마지막 한마디 (📜 2026-11-15 선생님 「A 되살림」 · 정식 그대로: 마무리에 20자 · 처음 + 고치기 1번 · 처음 남길 때 EXP +2(정식 XP.words))
  let wtext = $state(''), werr = $state(''), wedit = $state(false);
  const myWord = $derived(R?.words?.[uid] ?? null);
  function saveWord() {
    const first = !myWord, e = sayWords(S, code, uid, wtext); werr = e; if (e) return;
    wedit = false; wtext = '';
    const b = meBound(); if (first && b) { const k = `xp/${b.cls}/${b.num}`, key = `words_${code}`; if (isReady(b.S, k) && !b.S.get(`${k}/log/${key}`)) { b.S.set(`${k}/log/${key}`, { xp: 2, why: '마지막 한마디', at: S.now() }); addTo(b.S, `${k}/total`, 2); } } // 🐞 ① 받기 전 = 안 줌(이중 지급 · 0+2 덮어쓰기 막음) · ② 더하기
  }
  const readyNow = $derived(!!(R && scout && R.ready?.[scout.id]?.[uid]));
  const probNo = $derived(step ? (step.kind === 'boss' ? '형성평가' : (/문제 \d+/.exec(step.title) || [step.title])[0]) : '');
  // 📘 이 문제의 개념 (#158): 이 문제 바로 앞 개념 단계의 학습지 칸 그림 (없으면 그 개념 글)
  let cpt = $state(false), vidOn = $state(''), campArm = $state(false), armT: ReturnType<typeof setTimeout> | undefined;
  // 🏕 (📜 2026-11-17 #8 「수업 끝나면 선생님이 수업끝 누르기 전까지 아무것도 못함 → 바로 캠프로」): 마무리(결과) 화면에 들어온 뒤 1.5초부터 「🏕 내 캠프로」 · 선생님이 닫을 때 단추가 바뀌지 않음(갑자기 넘어감 막음 그대로)
  // ⚠ 집중 켜지는 순간 (11/17 #6): 경고음 두 번(옛 정식 Sound.warn) + 진동 · 재생 중인 영상 멈춤 · 전체 화면이면 나옴
  const focusOn = $derived(!!R && !R.state.closed && !!R.state.focus && !board && !cardOnly);
  $effect(() => { if (!focusOn) return; untrack(() => {
    try { document.querySelectorAll('video').forEach((v) => v.pause()); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); } catch { /* 무시 */ }
    vidOn = ''; cpt = false;
    try { navigator.vibrate?.([80, 60, 80]); } catch { /* 무시 */ }
    if (soundPref.sfx) { const a = actx(); if (a) [0, 0.28].forEach((d) => { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + d; o.type = 'square'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(660, t + 0.2); g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.22); }); }
  }); });
  const inEnd = $derived(!!result); // 값이 바뀔 때만 (결과 객체는 R 이 바뀔 때마다 새로 만들어져 타이머가 밀리지 않게)
  $effect(() => { const c = inEnd; untrack(() => { clearTimeout(armT); if (c) armT = setTimeout(() => (campArm = true), 1500); else campArm = false; }); });
  const gate = $derived(step ? gateOf(step) : null); // 🌀 차원문 단계 = 「TV 를 봐요」 대신 그 화면
  const talk = $derived(!!R && !isLobby(R) && !result && !R.state.closed && !!step && (step.kind === 'concept' || step.kind === 'intro') && !paperOn() && !gate);
  $effect(() => { void step?.id; vidOn = ''; });
  const cptId = $derived(step && (step.kind === 'monster' || step.kind === 'boss') ? conceptOf(L, step.id) : null);
  // 📝 공부 증거 한 줄 (B · 2026-11-14): 수업 끝 = 이 수업에서 낸 소문제 수를 그날 칸에 적고 「오늘 푼 문제 n개 · 지난주보다 +k」
  const whoKey = untrack(() => (cls ? `${cls}-${num}` : uid));
  if (!untrack(() => board)) submitWho({ who: untrack(() => whoKey), cls: untrack(() => cls) || undefined, num: untrack(() => num) });
  const proof = $derived.by(() => { if (!result || !R) return ''; const t = S.now(); noteSolved(whoKey, code, solvedN(L, R, uid), t); return proofLine(daySolved(whoKey, t) ?? 0, lastWeekOf(whoKey, t)); });
  const battle = $derived(!!R && !isLobby(R) && !result && !!step && (step.kind === 'boss' || !!mid));
</script>

{#if cardOnly}
  <!-- 🎮 시연 = 문제 카드만 -->
{:else if paperOn() && R && !isLobby(R)}
  <!-- 📝 제출 모드 머리줄 (시안 ①~⑥): ‹ 뒤로 · n차시 · 문제 k · 게임 | 제출 -->
  <header class="ptop" class:pboard={board} data-k="ptop">{#if !board}<a class="pback" href="?" aria-label="뒤로">‹</a>{/if}<b>{L.no}차시 · {step ? (step.kind === 'boss' ? '형성평가' : step.kind === 'concept' ? (step.title.split(' · ')[0] ?? step.title) : probNo) : '수업'}</b><ModeSwitch dark /></header>{#if board}<div class="pgap" aria-hidden="true"></div>{/if}
{:else if battle && step && R}
  <Scene theme={L.theme} sprite={step.kind === 'boss' ? (L.boss?.sprite ?? '') : (L.monsters[mid ?? '']?.sprite ?? '')} gauge={cardOnly || !feat('mon-attack') || scout?.on ? null : gaugeView(L, R, now)}
    hp={sceneHp?.hp ? { left: Math.min(sceneHp.hp.max, sceneHp.hp.left + fx.hold), max: sceneHp.hp.max } : null} pose={fx.poseUntil > now ? fx.pose : 'idle'} hpLabel={sceneHp?.label ?? ''} shadow={!!scout?.on} down={step.kind === 'boss' ? !!bhp?.won : down} {gem} hit={atkOn} hitTag={atk ? `${atk.strong ? '😡 분노 · ' : ''}${atk.def.tag}` : ''} elem={atkOn ? atk?.def.elem ?? '' : ''} atkId={atkOn ? atk?.def.id ?? '' : ''} rage={atkOn && !!atk?.strong} hitKey={atk?.at ?? 0} ice={atkOn && atk?.def.id === 'ice'} {iceEnd} holy={holyState} onholy={toggleHoly} stoneSec={stoneLeft} stoneHoly={!!stoneNow?.holy} {slump} {healN} lift={board} {mates} {mateFeed} boss={step.kind === 'boss'}
    onconcept={cptId ? () => (cpt = true) : undefined}
    explore={scout?.on && !board ? expLine(expOf(R, uid), mid) : ''}
    note={scout?.on ? '' : step.kind === 'boss' && bhp?.won ? '🏆 승리! 남은 문항도 풀 수 있어요' : down ? `💥 쓰러짐! 그래도 공격할 수 있어요${pracAll ? ` · 🔥 연습 타격 ${pracAll}번` : ''}` : ''}
    minions={crec && !scout?.on ? { n: crec.n - 1, stage: crec.done ? crec.n : crec.stage, downs: downs.filter((d) => d.down).map((d) => d.k) } : null} />
  {#if down && step.kind === 'monster' && mid && !cardOnly && !board && !scout?.on}<DiffAsk {S} lid={L.id} mon={mid} pid={uid} trial={TRIAL} />{/if}<!-- 📊 #98 쓰러뜨린 뒤 난이도 한 번 -->
{:else if result && R && !board && !paperOn()}
  <!-- 🎒 수업 결과 위 = 던전 배경 + 내 용사 승리 자세(오라) + 띠 (📜 2026-11-15 ⑦) -->
  <Scene noMon theme={L.theme} sprite={Object.values(L.monsters).find((m) => m.sprite)?.sprite ?? L.boss?.sprite ?? ''} {gem} down note={bhp?.won ? '👑 보스 격파!' : result.mons.length && result.mons.every((m) => m.perfect) && (!result.boss || (result.boss.items > 0 && result.boss.ok >= result.boss.items)) ? '⚡ 퍼펙트!' : R.state.closed ? '🏁 수업이 끝났어요' : '🏁 수업 끝'} />
{:else if talk && R && !board}
  <!-- 📣 도입 · 개념 (📜 2026-11-15 선생님 「빈 화면 · 고장 난 것 같아」): 위 = 그 차시 던전 배경 + 내 용사(오라 · 숨쉬기) + 설명 중 띠 · 몬스터 단계와 같은 장면 부품 -->
  <Scene noMon theme={L.theme} sprite={Object.values(L.monsters).find((m) => m.sprite)?.sprite ?? L.boss?.sprite ?? ''} {gem} note="👩‍🏫 선생님 설명 중 · TV 를 봐요" />
{:else if R && !board && !gate}
  <div class="gtop"><ModeSwitch /></div><!-- 📝 장면이 없는 화면(대기 · 개념 · 결과)에도 「게임 | 제출」 -->
{/if}
<section class="body" class:battle use:keepScroll>
  {#if R?.state.closed && !result}
    <div class="bcard"><span class="lab acc">수업이 끝났어요</span><p class="muted">캠프로 돌아가요.</p></div>
    <BottomAction href="?" text="🏕 내 캠프로" mainLabel="내 캠프로" />
  {:else if !R}
    <div class="bcard"><span class="lab acc">기다리는 중</span><p class="muted">종합실이 아직 열리지 않았어요. 선생님 화면을 먼저 여세요.</p></div>
    <BottomAction href="?" text="🏕 내 캠프로" mainLabel="내 캠프로" />
  {:else if isLobby(R)}
    <div class="bcard"><span class="lab acc">{expOf(R, uid) ? '🔥 ' : ''}{nick} · 입장 완료</span><p>선생님이 시작하면 바로 시작해요.</p>{#if expOf(R, uid)}<p class="expok" data-k="lobby-explore">🔥 탐사대! 예습한 용사 · 정찰 때 횃불을 들어요</p>{/if}</div>
    <KeyGate {S} {L} {R} {code} {uid} /><!-- 🔑 #59 대기실 열쇠 얻기 -->
    {#if R.meta.profile === 'test'}<button type="button" class="tbtn" data-k="test-explore" disabled={!!expOf(R, uid)} onclick={() => S.set(`rooms/${code}/players/${uid}/exp`, { n: 2, m: {}, test: true })}>{(R.meta as { trial?: boolean }).trial ? (expOf(R, uid) ? '🔥 탐사대예요' : '✔ 탐사대로 보기') : expOf(R, uid) ? '🔥 탐사대예요 (테스트)' : '✔ 테스트: 탐사대로 보기'}</button>{/if}<!-- 🔥 #67 테스트 · 체험판 = 예습 없이 탐사대 -->
    <BottomAction text="⏳ 시작을 기다려요" why="선생님이 시작하면 바로 시작해요" />
  {:else if result && gatePack}
    <div class="bcard" data-k="gate-end"><span class="lab acc">🌀 마왕성 차원문</span><p>오늘 지은 차원문은 캠프 🌀 에서 다시 볼 수 있어요 · ⚡ 에너지는 캠프에서도 모을 수 있어요</p></div>
    {#if campArm}<BottomAction href="?" text="🏕 내 캠프로" mainLabel="내 캠프로" />{:else}<BottomAction text="🏁 마무리" why="잠시 뒤 캠프로 갈 수 있어요" />{/if}
  {:else if result}
    <Loot {S} {L} {R} {uid} {code} {nick} {gem} me={meBound()} />
    {#if proof || petLine}<div class="bcard">{#if proof}<p class="proof" data-k="proof">{proof}</p>{/if}{#if rewardLine}<p class="rwd" data-k="reward">{rewardLine}</p>{/if}{#if petLine}<p class="rwd" data-k="pet-feed">{petLine}</p>{/if}</div>{/if}
    {#if !R.state.closed}
      <div class="bcard words" data-k="last-words">
        <span class="lab acc">💬 마지막 한마디</span>
        {#if myWord && !wedit}<p class="said">「{myWord.t}」</p>{#if (myWord.n || 1) < 2}<button type="button" class="wedit" onclick={() => { wedit = true; wtext = myWord?.t ?? ''; }}>✏ 한 번 고치기</button>{:else}<small class="muted">고치기를 다 썼어요</small>{/if}
        {:else}<div class="wrow"><input type="text" maxlength="20" style="font-family: var(--font-plain)" bind:value={wtext} placeholder="오늘 수업 한마디 (20자)" aria-label="마지막 한마디" /><button type="button" class="wsend" disabled={!wtext.trim()} onclick={saveWord}>남기기</button></div><small class="muted">{wtext.length}/20 · 교실 TV 말풍선으로 보여요</small>{/if}
        {#if werr}<p class="werr" role="alert">{werr}</p>{/if}
      </div>
    {/if}
    <!-- 🐞 갑자기 넘어감 (📜 2026-11-15): 선생님이 수업을 닫는 순간 「마무리 중」(눌리지 않음) 자리가 「🏕 내 캠프로」 링크로 바뀌어 · 화면을 만지던 손가락이 그대로 눌러 캠프로 감
         → 닫혀도 결과 화면은 그대로 · 단추는 바뀐 뒤 1.5초 동안 눌리지 않음(🏁 수업이 끝났어요) · 그다음에만 캠프로 -->
    {#if campArm}<BottomAction href="?" text="🏕 내 캠프로" mainLabel="내 캠프로" why={R.state.closed ? '🏁 수업이 끝났어요' : '수업이 열려 있으면 캠프 🌀 차원문으로 다시 와요'} />{:else}<BottomAction text="🏁 마무리" why="잠시 뒤 캠프로 갈 수 있어요" />{/if}
  {:else if step && gate && !R.state.closed}
    <GatePhone {S} {R} {code} kind={gate} {cls} {num} {uid} /><!-- 🌀 마왕성 차원문 (📜 11/28) -->
  {:else if step && (step.kind === 'concept' || step.kind === 'intro')}
    <!-- 📣 정식 student.js 개념 단계(「📣 알림 · 선생님에게 주목하세요 · 단계 이름 · 말」) + 칸 그림 · 영상 · 도입 = 🔁 전시 확인 칸 그림 · 🐞 그 전엔 도입(intro) 단계를 그리지 않아 빈 화면 -->
    {#if step.kind === 'concept' && step.check && ccRan(R, step)}<ConceptCheckCard {S} {R} {code} {uid} {step} {now} />{/if}<!-- ✔ 개념 체크 (📜 2026-11-15 · 리모컨이 열 때만) -->
    <KeyGate {S} {L} {R} {code} {uid} band /><!-- 🔑 #59 대기실을 놓친 학생 = 첫 몬스터 전까지 -->
    <div class="bcard talk" data-k="talk">
      <span class="lab acc">📣 {step.kind === 'intro' ? '도입 · 수업을 시작해요' : '개념 설명'}</span>
      <b class="ttl">{step.title}</b>
      {#if step.say}<p class="say"><SymText text={step.say} /></p>{/if}
      <PrepImg {S} {L} id={step.img || step.id} fb={step.id} alt={step.title} />
      {#if vidsAt(L, step.id).length}<div class="vbtns">{#each vidsAt(L, step.id) as v (v.key)}<button type="button" class="vbtn" data-k="talk-vid" class:on={vidOn === v.key} onclick={() => (vidOn = vidOn === v.key ? '' : v.key)}>{vidOn === v.key ? '🎬 영상 닫기' : v.n ? `🎬 개념 영상 ${v.n}` : '🎬 개념 영상 보기'}</button>{/each}</div>{#if vidOn && vidOf(L, vidOn)}<Vid {S} url={vidOf(L, vidOn)!} autoplay />{/if}{/if}
      <p class="muted">학습지를 펴고 선생님 설명을 들어요.</p>
    </div>
    <BottomAction text="👂 선생님 설명 듣는 중" why="설명이 끝나면 몬스터가 나타나요" />
  {:else if battle && step}
    <KeyChest {L} {R} {uid} /><!-- 🔑 #59 🎁 열쇠 보물상자 -->
    {#if isSent(R, step)}<div class="bcard idleband" role="status" data-k="sent-band"><b>🎯 이 문제는 허수아비에서 만나요</b><span>수업이 끝나면 캠프의 🎯 허수아비 「📚 수업에서 넘어온 문제」</span></div>{/if}
    {#if idleMid && idleMid === mid}<div class="bcard idleband" role="status" data-k="idle"><b>🤝 첫 줄만 같이 볼까?</b><button type="button" data-k="idle-go" onclick={() => { poke(); window.dispatchEvent(new CustomEvent('citadel-idlehelp')); }}>💡 같이 보기</button></div>{/if}<!-- 🤝 손 놓은 학생 (📜 2026-11-16 · 🌊 ①) -->
    {#if R.state.review && R.state.review.mid === step.id}<div class="bcard revband" role="status" data-k="review-band">{#if R.state.review.i === -2}<b>📺 TV 를 봐요</b><span>📊 우리 반 고비를 함께 봐요 · 입력은 그대로예요</span>{:else}<b>🔎 TV 를 봐요</b><span>내 학습지와 비교해 고칠 곳을 표시해 봐요</span>{/if}</div>{/if}<!-- 🔎 익명 풀이 (📜 2026-11-15) -->
    {#if scout?.on && paperOn()}
      <div class="pscout" data-k="pscout"><b class="ph1">학습지 {probNo} 을 먼저 풀어 두세요</b><p>{Math.ceil(scout.left / 1000)}초 뒤 답 칸이 열려요. 선생님이 일찍 열 수도 있어요.</p></div>
      <BottomAction disabled={readyNow} why={readyNow ? '준비 완료를 보냈어요' : ''} onmain={() => { if (scout) readyAsk = scout.id; }} mainLabel="준비 완료">
        {#snippet main()}<span>준비 완료</span>{/snippet}
      </BottomAction>
    {:else if scout?.on}
      <div class="bcard">
        <span class="lab acc">{probNo} · 정찰</span>
        <div class="row"><span class="big">{Math.ceil(scout.left / 1000)}초</span><span class="muted">뒤에 몬스터가 나타나요</span></div>
        <p class="q2">학습지 「{probNo}」를 먼저 풀어 두세요</p>
        <p class="muted">선생님이 일찍 부를 수도 있어요</p>
      </div>
      <BottomAction disabled={readyNow} why={readyNow ? '✋ 준비 완료를 보냈어요' : ''} onmain={() => { if (scout) readyAsk = scout.id; }} mainLabel="준비 완료">
        {#snippet main()}<span>{readyNow ? '✋ 준비 완료!' : '준비 완료'}</span>{/snippet}
      </BottomAction>
    {:else if !isSent(R, step)}
      <!-- 💥 피격 = 움직임 0 (#151): 알림은 장면 띠 안 · 문제 카드 위 덮개 + 줄어드는 원 · 고른 답 그대로 · 끝나면 덮개만 사라짐 -->
      <div class="qwrap">
      {#key `${stepIdx(R)}|${step.id}`}
        {#if step.kind === 'boss'}
          {#if V4(R)}<BossForm {S} {L} {R} {code} {uid} now={gnow} {locked} />{:else}<BossCard {S} {L} {R} {code} {uid} now={gnow} {locked} />{/if}
        {:else if mid && chain}
          <ChainView {S} {L} {R} {code} {mid} {uid} now={gnow} {locked} title={step.title} {cls} {num} demo={cardOnly} photo={!board || isDummy(R)} {photoS} {extWr} onhint={cptId && !cardOnly ? () => { cpt = true; noteHelp(S, code, uid, mid, 'c', 1); } : undefined} />
        {:else if mid}
          <MonsterForm {S} {L} {R} {code} {mid} {uid} now={gnow} {locked} title={step.title} onhint={cptId && !cardOnly ? () => { cpt = true; noteHelp(S, code, uid, mid, 'c', 1); } : undefined} />
        {/if}
      {/key}
      {#if atkOn && atk && paperOn()}
        <!-- 📝 제출 모드 = 효과 없이 글자 한 줄 (입력 멈춤 규칙은 그대로 · 시간이 지나면 저절로) -->
        <p class="patk" role="status">{atk.def.lockInput ? '잠깐 멈춤' : '잠깐'} · {Math.max(1, Math.ceil((atk.until - gnow) / 1000))}초</p>
      {:else if atkOn && atk}
        {#key atk.at}<AttackFx kind={atk.def.id} strong={atk.strong} len={atk.until - atk.at} left={atk.until - gnow} onclear={() => { if (atk) atk = { ...atk, until: gnow }; }} />{/key}
      {/if}
      </div>
    {/if}
  {/if}
</section>
{#if gtoast && !paperOn()}<div class="gtoast" role="status">{gtoast}</div>{/if}
{#if petriToast.msg && !paperOn()}{#key petriToast.at}<div class="gtoast petri" role="status" data-k="petri-toast">{petriToast.msg}</div>{/key}{/if}<!-- 🗿 석화 중 맞힘 (📜 11/19) -->
<SymSheet />
{#if readyAsk}
<Sheet onclose={() => (readyAsk = '')}>
  {#snippet title()}📝 학습지 빈칸을 모두 채웠나요?{/snippet}
  {#snippet act()}<div class="rdyrow"><button type="button" class="btn2" data-k="ready-no" onclick={() => (readyAsk = '')}>아직</button><button type="button" class="btn" data-k="ready-yes" onclick={() => { scoutReady(S, code, readyAsk, uid); readyAsk = ''; }}>네 · 준비 완료</button></div>{/snippet}
  <p class="muted">준비 완료를 보내면 선생님 화면에 ✋ 가 떠요</p>
</Sheet>
{/if}
{#if cpt && cptId}
  <Sheet onclose={() => (cpt = false)} mainText="문제로 돌아가기" tall>
    {#snippet title()}📘 이 문제의 개념{/snippet}
    <PrepImg {S} {L} id={cptId} alt="개념"><p class="say"><SymText text={L.steps.find((s) => s.id === cptId)?.say ?? ''} /></p></PrepImg>
  </Sheet>
{/if}
{#if paperOn() || cardOnly}<!-- 📝 제출 모드 · 🎮 시연 = 💎 · 선물 알림 없음 -->{:else if mailNew}<p class="gift mail" role="status">{mailLine(mailNew, mailNew.g)}</p>{:else if giftNew.length}<p class="gift" role="status">🎁 선생님 선물 · 💎 +{giftNew.reduce((a, x) => a + x.g, 0)}</p>{/if}
{#if R && !R.state.closed && R.state.rest}{#await loadFunPhone() then K}<K.default {S} {R} {code} {uid} {now} />{/await}{/if}
{#if focusOn}
  <!-- ⚠ 집중 = 옛 정식 WARNING (📜 2026-11-17 #6 「설명 중에는 개념 영상 보는 것도 안 돼 · 옛 정식은 WARNING 띄우고 폰이 먹통되게」 · student.js focus · .focus-ov)
       모든 창 · 영상 · 크게 보기(z 60)보다 위(z 95) · 빨간 띠 깜빡 · 처음 한 번 경고음 + 진동 · 터치 전부 막음(💬 💎 ⚙ 포함) · 켜지는 순간 영상 멈춤 · 아래 화면(입력 · 스크롤)은 그대로(#118) -->
  <div class="fwarn" role="alertdialog" aria-modal="true" aria-label="선생님에게 주목하세요" data-k="focus-warn" tabindex="-1" onpointerdowncapture={(e) => e.preventDefault()} ontouchmove={(e) => e.preventDefault()} onwheel={(e) => e.preventDefault()}>
    <div class="ftop"><b>⚠ WARNING</b><span>선생님에게 주목하세요</span></div>
    <div class="fbody">{#if step}<p class="fstep">{step.title}</p>{#if step.say}<p class="fsay"><SymText text={step.say} /></p>{/if}{/if}<p class="fm">화면이 잠깐 멈췄어요 · 선생님이 풀어 주면 그 자리에서 이어서 해요</p></div>
  </div>
{/if}

<style>
  .rdyrow { display: flex; gap: 8px; } .rdyrow button { flex: 1; min-height: 52px; border-radius: var(--r); font: 800 16px var(--font); border: 0; } .rdyrow .btn { background: var(--accent); color: var(--on-accent); box-shadow: 0 3px 0 var(--accent-sh); } .rdyrow .btn2 { background: var(--surface-2); color: var(--text); }
  .idleband { display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 2px solid #f2c94c; background: color-mix(in srgb, #f2c94c 18%, var(--surface)); }
  .idleband b { font-size: 17px; } .idleband button { min-height: 48px; padding: 0 14px; border-radius: var(--r); border: 0; background: var(--accent); color: var(--on-accent); font: 800 15px var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .revband { display: flex; flex-direction: column; gap: 2px; border: 2px solid var(--accent); background: color-mix(in srgb, var(--accent) 16%, var(--surface)); }
  .revband b { font-size: 18px; } .revband span { font-size: 15px; color: var(--text-2); }
  .talk .ttl { font-size: 19px; line-height: 1.4; }
  .talk .vbtns { display: flex; gap: var(--s2); } .talk .vbtns .vbtn { flex: 1; min-width: 0; } .talk .vbtn.on { border-color: var(--accent); }
  .talk .vbtn { min-height: var(--tap); border-radius: var(--r); border: 2px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .gtoast { position: fixed; left: 50%; top: 210px; transform: translateX(-50%); z-index: 40; padding: 10px 16px; border-radius: 14px; background: rgba(12, 24, 40, 0.92); border: 2px solid #ffd25a; color: #fff6c8; font: 700 16px var(--font); white-space: nowrap; box-shadow: 0 0 18px rgba(255, 210, 90, 0.6); }
  .ptop { position: sticky; top: 0; z-index: 5; max-width: 430px; margin: 0 auto; display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1.5px solid #1d1d1f; background: #f7f6f1; }
  .gtop { display: flex; justify-content: flex-end; padding: 10px 16px 0; }
  .proof { margin: 4px 0 8px; font: 700 15px var(--font); color: var(--text); }
  .rwd { margin: 0 0 8px; font: 700 14px var(--font); color: var(--gem); }
  :global(:root[data-submit]) .rwd { display: none; } /* 📝 제출 모드 = 보상 숨김 */
  :global(:root[data-submit]) .proof { color: #1d1d1f; font-family: 'Noto Serif KR', 'Noto Serif CJK KR', serif; }
  .ptop.pboard { padding-left: 52px; } .pgap { height: 44px; }
  .ptop b { flex: 1; min-width: 0; font: 700 17px 'Noto Serif KR', 'Nanum Myeongjo', serif; color: #1d1d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pback { width: 32px; height: 32px; display: grid; place-items: center; color: #555; font-size: 22px; text-decoration: none; }
  .pscout { display: flex; flex-direction: column; gap: 8px; padding-top: 6px; }
  .pscout .ph1 { font: 700 17px 'Noto Serif KR', serif; color: #1d1d1f; border-bottom: 1.5px solid #1d1d1f; padding-bottom: 4px; }
  .pscout p { margin: 0; font-size: 14px; color: #6a6a6a; }
  .patk { position: absolute; left: 0; right: 0; top: 0; z-index: 6; margin: 0; padding: 8px 12px; background: #f7f6f1; border: 1px solid #1d1d1f; border-radius: 6px; font: 700 14px var(--font); color: #1d1d1f; text-align: center; }
  .body { max-width: 430px; margin: 0 auto; padding: var(--s4); display: flex; flex-direction: column; gap: var(--s3); min-width: 0; }
  .body.battle { padding-top: var(--s1); }
  .row { display: flex; align-items: baseline; gap: var(--s2); }
  .q2 { margin: 0; font-size: 17px; font-weight: 700; }
  .say { margin: 0; line-height: 1.6; overflow-wrap: anywhere; }
  .gift.mail { border-color: var(--accent); }
  .gift { position: fixed; top: 64px; left: var(--s4); right: var(--s4); z-index: 25; margin: 0 auto; max-width: 398px; padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--gem); font-weight: 700; text-align: center; }
  .qwrap { position: relative; display: flex; flex-direction: column; gap: var(--s3); min-width: 0; }
  .fwarn { position: fixed; inset: 0; z-index: 95; background: rgba(0, 0, 0, 0.62); display: flex; flex-direction: column; align-items: center; touch-action: none; overscroll-behavior: contain; user-select: none; -webkit-user-select: none; }
  .ftop { width: 100%; background: #b3140b; color: #fff; text-align: center; padding: calc(14px + env(safe-area-inset-top, 0px)) 8px 14px; border-bottom: 4px solid #ffcf5a; box-shadow: 0 0 30px #ff3b2e; animation: warnPulse 1s ease-in-out infinite; }
  .ftop b { display: block; font-size: 34px; letter-spacing: 3px; } .ftop span { font-size: 22px; font-weight: 700; }
  @keyframes warnPulse { 50% { background: #e0241a; } }
  .fbody { margin-top: 16vh; max-width: 90%; padding: 14px 18px; border: 2px solid #ff5a4a; border-radius: var(--r); background: rgba(26, 22, 18, 0.92); color: #fff; text-align: center; }
  .fstep { margin: 0 0 6px; font-size: 21px; font-weight: 800; color: var(--accent); } .fsay { margin: 0 0 8px; font-size: 16px; line-height: 1.5; } .fm { margin: 0; font-size: 14px; color: #c9ccd3; }
  .words { display: flex; flex-direction: column; gap: 8px; } .words .said { margin: 0; font-size: 17px; font-weight: 700; font-family: var(--font-plain); } /* 🎨 학생이 쓴 글 속 이모지 = 그대로 (11/17 #4) */
  .wrow { display: flex; gap: 8px; } .wrow input { flex: 1; min-width: 0; min-height: 48px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line, #2f3440); background: var(--surface-2); color: var(--text); font: 500 16px var(--font); }
  .wsend, .wedit { flex: none; min-height: 48px; padding: 0 16px; border-radius: 12px; border: 0; background: var(--accent); color: var(--on-accent, #1a1400); font: 700 15px var(--font); } .wedit { background: var(--surface-2); color: var(--text); align-self: flex-start; }
  .wsend:disabled { opacity: 0.45; } .werr { margin: 0; color: var(--bad); font-size: 14px; }
  .tbtn { display: block; width: 100%; min-height: var(--tap); margin-top: var(--s2); border-radius: var(--r); border: 2px dashed var(--accent); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); } /* 🔥 #67 테스트 단추 (MonsterForm 과 같음) */
  .expok { margin: 6px 0 0; font: 700 14px var(--font); color: #ffb35a; }
</style>
