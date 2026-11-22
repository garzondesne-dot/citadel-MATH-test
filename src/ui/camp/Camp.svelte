<script lang="ts">
  import { auraName } from '../fx/aura';
  import { clock, useClock } from '../clock.svelte';
  import { atbLessons } from '../../board/atb/lessons';
  import { doneNo } from '../../school/progress';
  import { isReady } from '../../store/atomic';
  import { loadAtbTrial, loadBoard, loadCastle, loadDummy, loadPrep, loadQuest } from '../lazy'; // 📦 허수아비 · 게시판 · 성채 = 따로 받는 묶음 (캠프가 뜬 뒤 미리 받아 둠)
  import { feat } from '../../school/features.svelte';
  import { earnDaily } from '../../model/wallet';
  import { GEM, kstDay } from '../../board/board';
  import SoundToggles from '../SoundToggles.svelte';
  import { sfx } from '../sound.svelte';
  import { bgm } from '../bgm';
  import { BUILD, REV } from '../../build';
  import { BETA, CREDIT_NAME, showCredit } from '../../channel';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { AURA_NAMES, famOfHero, HERO_NAMES, awkFx, ladder, level, rungs, TIER_NAMES, titleOf } from '../../model/hero';
  import '../fx/fx.css'; // ⚡ #83 A2 각성 표시(.awk-name · .awk-shine)
  import { emptyPlan, equipOf, ownsSkill } from '../../model/draft';
  import HeroSprite from './HeroSprite.svelte';
  import { SUBJ } from '../../engine/subject';
  const wishLeft: (w: Record<string, true> | undefined, m: Record<string, true> | undefined) => number = SUBJ.cards?.wishLeft ?? (() => 0);
  import MyHero from './MyHero.svelte';
  import FirstHero from './FirstHero.svelte';
  import { isEnd } from '../../raid/raid';
  import { ANIM, CAMP, CAMP_BUDDY, CAMP_PORTAL, CAMP_PROPS, HERO, cellBg, heroGeo, heroNudge, heroUrl, propPos } from '../manifest';
  import { fly } from 'svelte/transition';
  import CampProp from './CampProp.svelte';
  import { portalOf } from './portal.svelte';
  import { meLookId, setTeacherSink, useMe } from '../../store/me.svelte';
  import { liveRoom, liveValue } from '../room.svelte';
  import { mailLine, type Mail } from '../../school/mail';
  import BottomAction from '../battle/BottomAction.svelte';
  import { changePw, saveLogin, type Pupil } from '../../school/school';
  import Sheet from '../battle/Sheet.svelte';
  import EarnSheet from './EarnSheet.svelte';
  import CampFriends from './CampFriends.svelte';
  import WarBar from '../board/WarBar.svelte';
  import ThemePicker from '../ThemePicker.svelte';
  import Anvil from '../forge/Anvil.svelte';
  import ModeSwitch from '../ModeSwitch.svelte';
  import { paperOn, submitWho } from '../submit.svelte';
  import { featsOf, isTheme, savedTheme, setTheme, type Theme } from '../../theme/theme';
  import { meBound, unbindMe } from '../../store/meSync';
  import { manualOf, bonusBase, castleState, floorName, progressOf, spanOf, withLegacy, type CastleRec } from '../../school/castle';
  import { visibleCastles } from '../../school/castles.svelte';
  import SurveySheet from './SurveySheet.svelte';
  import FeedbackSheet from './FeedbackSheet.svelte';
  import { adoptLog } from '../../school/feedback';
  import { deviceStore } from '../../store/device';
  import { donePath, pendingNo, REWARD, statePath } from '../../school/survey';
  import { isExcluded } from '../../school/school';
  import MailBox from './MailBox.svelte';
  import { PACKS } from '../../engine/packs';
  import { reviewTodo, type Bon, type Rec } from '../../school/dummy';
  import { prepOpenList } from '../../school/prepopen';
  import RecordRoom from './RecordRoom.svelte';
  import AchievePop from './AchievePop.svelte';
  import AwakenPop from './AwakenPop.svelte';
  import { awkSeen, markAwkSeen } from '../../school/awakenSeen';
  import EggFx from './EggFx.svelte';
  import TeacherPanel from './TeacherPanel.svelte';
  import { questNeeds } from '../../school/quest';
  import { photoNeeds } from '../../school/photo';
  import { inbox as tInbox } from '../../school/inbox';
  import { POSTS as T_POSTS, type Post as TPost } from '../../board/team';
  import { CLASSES as T_CLASSES } from '../../school/school';
  import { EGGS, eggHint, eggOf, fibTap, piMinute, stumpStep } from '../../school/eggs';
  import { CHALS, chalReady, chalState, claimOf, reviewPlaysOf, symN, type Chal, type ChalCtx } from '../../school/challenges';
  import { earnedTitles } from '../../model/draft';
  import { earnedFrom } from '../../model/titles';
  import { castles } from '../../school/castles.svelte';
  import { titleData } from '../../model/titles';
  import { heroUnlock } from '../../model/heroUnlock';
  import { visit as usageVisit } from '../../school/usage';
  import { chanOf, studentLines, studentNews, studentSeenPath, unseen } from '../../school/changes';
  import { claim as mailClaim, claimOnce, inbox as mailInbox, seenGet as mailSeenGet, unreadOf as mailUnread } from '../../school/mailbox';

  // 🏕 학생 캠프 (#111 · ①′ 물건 누르기 확정 · 스킬 ui-senior 2-1절 캠프 줄)
  //   위 = 장면(정식 캠프 그림 · 자리 그대로) + 「내 캠프 · 💎 · 📜」 / 아래 = 정보판(내 용사 · 사다리 4칸 · 다음 보상) + 주요 단추 「n차시 던전 입장」
  //   이름표 = 상황에 따라: 차시 던전 = 늘(열림 금빛 반짝 · 닫힘 흐림) · 새 소식 = 이름 + 빨간 숫자 · 모루 = ★n · 처음 = 흰 이름표 · 써 봤고 소식 없음 = 숨김 · 빈 땅 = 2초 모두
  const { S, L, code, pupil = null, trial = null }: { S: Store; L: LessonPack; code: string; pupil?: Pupil | null;
    /** 👩‍🏫 체험판 (📜 2026-11-17 #33 · CLAUDE.md 「👩‍🏫 체험판 규칙」): 이름 · 시작 💎 200 → 첫 차시를 끝내면 한 번 💎 620 · 📜 9 · 아래 단추 = 「⚔ 다른 차시로」 · 📋 게시판 · ✉ 우편함 · 출제 공방 숨김 · 성채 = 실은 층 방 모두 열림 */
    trial?: { nick: string; grant: boolean; ongate: () => void; /** 👩‍🏫 #55 체험판 게시판 = 체험판 차시 팩 */ packs?: LessonPack[] } | null } = $props();
  async function logout() {
    // 📮 #81 B 나가기 전에 못 보낸 기록부터 (📜 선생님 2026-11-21 「폰을 바꿔서 기록이 아예 날아가는 참사는 막아야지」)
    const ob = (S as Store & { outbox?: { count(): number; flush(ms?: number): Promise<number> } }).outbox;
    if (ob && ob.count()) { const left = await ob.flush(8000); if (left && !confirm(`⚠ 아직 안 올라간 기록 ${left}개\n지금 나가면 기록이 사라질 수 있어요 · 인터넷 연결 뒤 다시 해 주세요\n\n그래도 나갈까요?`)) return; }
    saveLogin(null); unbindMe();
    const A = (S as Store & { auth?: import('firebase/auth').Auth }).auth;
    if (A) { try { const fa = await import('firebase/auth'); await fa.signOut(A); } catch { /* 무시 */ } }
    location.replace(`${location.pathname}`);
  }
  const TRIAL_GEM = [200, 620] as const, TRIAL_SCROLL = 9; // 👩‍🏫 체험판 지갑 (CLAUDE.md 체험판 규칙 · 💎 · 📜 줄)
  const P = PROFILES.test; // 테스트 버전 = 테스트 모드 다른 점 표 값(💎 9,999 · 📜 30)
  const fromMe0 = typeof location !== 'undefined' && new URLSearchParams(location.search).get('from') === 'me'; // 👩‍🏫 교사 「나」 → 내 캠프 = 교사 기록(B안)
  if (fromMe0) setTeacherSink(untrack(() => S));
  // 👩‍🏫 #80 교사 캠프 (📜 2026-11-18 DECISIONS 「👩‍🏫 교사 캠프 리뉴얼」): 학생과 같은 캠프 + 물건 창마다 「👩‍🏫 선생님 칸」 · 이름표 숫자 = 선생님 할 일(금빛) · 반 칩 · 🧑‍🎓 학생 화면으로 보기
  //   📺 TV(?tv=1 · 종합실 ⚙ → ⛺) = 학생 화면과 같게(선생님 칸 · 교사 숫자 · 반 칩 없음)
  const tvMode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('tv') === '1';
  let asStu = $state(false), tCls = $state(''), tPanel = $state<'' | 'dummy' | 'tent' | 'review' | 'gate' | 'castle' | 'mail' | 'rec'>('');
  const teach = $derived(fromMe0 && !tvMode && !asStu);
  const T_SHEET: Record<string, 'dummy' | 'tent' | 'review' | 'gate' | 'castle' | 'mail' | 'rec'> = { dummy: 'dummy', tent: 'tent', review: 'review', gate: 'gate', prep: 'gate', castle: 'castle', mail: 'mail', rec: 'rec', chal: 'rec' };
  let tVer = $state(0); { const tt = setInterval(() => tVer++, 10000); onDestroy(() => clearInterval(tt)); }
  const tTodo = $derived.by<Record<string, number>>(() => { void tVer; void sheet; if (!fromMe0 || tvMode) return {} as Record<string, number>; const inC = (c: string) => !tCls || c === tCls.replace(/[.#$/[\]]/g, '_') || c === tCls;
    const cIds = new Set(castles.list.map((P) => P.id));
    return { tent: questNeeds(S, tCls).length, castle: photoNeeds(S, tCls).filter((x) => cIds.has(x.k.slice(0, x.k.indexOf('_')))).length, mail: tInbox(S).filter((x) => x.kind === 'idea' && x.from && !x.read && inC(x.from.cls)).length, dummy: Object.values(S.get<Record<string, TPost>>(T_POSTS) || {}).filter((p) => p && p.phase === 'wait' && (!tCls || Object.values(p.mem || {}).some((m) => m?.cls === tCls))).length };
  }); // 🧙 교사 캠프 = 교사 「내 용사」 서버 하나 (게시판 · 허수아비 · 성채도 같은 용사)
  // 🧑 실제 학생(서버 계정에 묶임 · 시험 반 · 시험 계정 아님) = 테스트 꼴 아님 (📜 2026-11-15 머리 「정식과 같게」: 테스터 표시 = 시험 반 · 테스트 계정만 · 호칭 = 얻은 것 · 새 계정 시작 💎 0)
  //   교사 캠프 · 🧪 시험 반 · 시험 계정 · 이 기기 체험 = 그대로 테스트 꼴(💎 9,999 · 📜 30 시작 · 호칭 모두)
  const realStu = untrack(() => !fromMe0 && !!pupil && !!meBound() && !isExcluded(S, pupil.cls, pupil.num));
  const M = realStu ? useMe(0, 0, false, false) : trial ? useMe(TRIAL_GEM[0], 0, false, false) : useMe(typeof P.reward.gem === 'number' ? P.reward.gem : 0, typeof P.reward.scroll === 'number' ? P.reward.scroll : 0, true, fromMe0);
  const me = M.me;
  // ⚡ #94 각성 해금 연출: 고른 용사의 각성 조건이 처음 다 채워지는 순간(강화 · 스킬 · 칭호 · 출전 바꿈 어느 화면이든 캠프 위에서) · 놓쳤으면 다음 앱 열 때 · 용사마다 한 번
  let awkPop = $state<number | null>(null);
  $effect(() => { const h = Number(me.hero) || 0; if (meLookId(me) === h) return; /* 각성 = 보이는 모습이 각성 id (장착 스킬은 socket → fx 로 바꿔 셈) */ untrack(() => { if (awkPop === null && !awkSeen(h)) awkPop = h; }); });
  // 👩‍🏫 체험판: 이름 = 첫 화면에 적은 이름 · 첫 차시를 끝내면 한 번 💎 620 · 📜 9 (10강 🛡 홀리 방패 + Ⅳ 🌟 진필살기를 써 볼 만큼 · 원래 수업은 풀어서 벌고 하루 한도 100)
  { const tr = untrack(() => trial); if (tr) { let ch = false; if (me.nick !== tr.nick) { me.nick = tr.nick; ch = true; } if (tr.grant && !me.seen['trial-grant']) { me.seen['trial-grant'] = true; me.wallet.gem = Math.max(me.wallet.gem, TRIAL_GEM[1]); me.wallet.scroll = Math.max(me.wallet.scroll, TRIAL_SCROLL); ch = true; } if (ch) M.save(); } }
  // 🎨 테마 (#144): 서버 accounts 에 고른 테마가 있으면(다른 폰에서 고름) 이 폰도 그 테마로
  let theme = $state<Theme>(untrack(() => (isTheme(me.theme) ? me.theme : savedTheme())));
  if (untrack(() => theme) !== savedTheme()) setTheme(untrack(() => theme));
  const feats = $derived.by(() => { const b = meBound(); return featsOf(b ? b.S.get(`records/${b.cls}/${b.num}`) : null, me.cards); });
  function pickTheme(t: Theme) { theme = t; me.theme = t; M.save(); setTheme(t); }
  { const p0 = untrack(() => pupil); if (p0) submitWho({ who: `${p0.cls}-${p0.num}`, cls: p0.cls, num: p0.num }); } // 📝 모드 바꾼 기록 = 누가
  // ⓪ 로그인한 학생 = 이름표 이름 (명단에서 · 학생이 쓰지 않음)
  if (untrack(() => pupil) && me.nick !== untrack(() => pupil)?.name) { me.nick = untrack(() => pupil)?.name ?? me.nick; M.save(); }
  // 🎁 선생님 선물 받기 (gifts/{uid} · 하루 한도 밖) — 캠프에 들어오면 아직 안 받은 것을 지갑에 넣고 한 줄 알림 (지급 = 기록 · 알림 = 보여 주기)
  $effect(() => useClock()); // ⏱ 예약 띠 · 남은 분 (1초 시계)
  // 🔔 📜 #73 예약 판 10분 전 ~ 30분 뒤 = 캠프 위 띠(누르면 게시판) · 게시판 물건 빛 · 푸시 없음 · 체험판 없음
  const resvSoon = $derived.by(() => { void clock.now; const u = pupil?.uid; if (!u || trial) return null; const now = S.now(); const ps = S.get<Record<string, { no: number; when?: number; phase: string; mem?: Record<string, unknown> }>>('school/board/posts') || {}; return Object.values(ps).find((p) => p && p.when && p.phase === 'wait' && p.mem?.[u] && now >= p.when - 10 * 60e3 && now < p.when + 30 * 60e3) ?? null; });
  let trialRun = $state<import('../../model/types').LessonPack | null>(null); // 👩‍🏫 #66-8 체험판 게시판에서 고른 차시
  const atbTrialIds = (packs: import('../../model/types').LessonPack[]) => atbLessons(packs, new Set()).map((p) => p.id);
  let feedTick = $state(0);
  let fbDev: Store | null = null; const fbLocal = () => (fbDev ??= deviceStore('citadel-v1-test-fbk')); // 🛠 #98 🧪 테스트 = 이 기기에만 (학생과 같은 화면)
  let giftToast = $state('');
  {
    const u = untrack(() => pupil)?.uid;
    const G = u ? untrack(() => S).get<Record<string, { g: number; x?: number; s?: number; fun?: string; got?: boolean; mail?: boolean; hold?: boolean }>>(`gifts/${u}`) || {} : {};
    const fresh0 = Object.entries(G).filter(([, x]) => x && !x.got && !x.mail && !x.hold); // 📮 hold = 우편함에서 학생이 「받기」로만 (📜 2026-11-19 선생님 「우편으로 돌려줘」) // ✉ 메시지에 붙은 💎 = 아래 메시지 알림이 받음
    // 🐞 11/20 ② 서버 = 선물마다 got 을 transaction 으로 먼저 (폰 두 대가 캠프를 같이 열어도 한 번만 받음) → 내가 받은 것만 지갑에
    const take = (fresh: typeof fresh0) => { if (u && fresh.length) {
      const sum = fresh.reduce((a, [, x]) => a + (Number(x.g) || 0), 0);
      const xp = fresh.reduce((a, [, x]) => a + (Number(x.x) || 0), 0), funOnly = fresh.every(([, x]) => !!x.fun); // 🏕 쉼터 놀이 보상(#142) = 같은 칸 · EXP 도
      // 🗿 석화 찬스 💎 = 하루 한도 안 (📜 2026-11-13 밤 · 정식 DAY_CAP 100 · 넘은 몫은 버림) · 나머지 선물 = 한도 밖 그대로
      const petri = fresh.filter(([k]) => k.startsWith('petri_')).reduce((a, [, x]) => a + (Number(x.g) || 0), 0), petriGot = earnDaily(me.wallet, petri, kstDay(untrack(() => S).now()), GEM.dayCap);
      const sc = fresh.reduce((a, [, x]) => a + (Number(x.s) || 0), 0); // 📜 ✍ 📸 서술형 통과 (정식 ult_{차시}_{몬스터} · 문제당 한 번)
      me.wallet.gem += sum - petri; me.wallet.scroll += sc; me.xp += xp; M.save();
      if (S.kind !== 'server') fresh.forEach(([k]) => S.set(`gifts/${u}/${k}/got`, true)); // 서버 = claimOnce 가 이미 씀
      const oneFun = new Set(fresh.map(([, x]) => x.fun || '')).size === 1 && fresh[0]![1].fun && fresh.every(([k]) => k.startsWith('sorry_')) ? fresh[0]![1].fun : ''; // 🎁 #45 사과 선물 = 그 이름 그대로
      giftToast = `${oneFun ? oneFun : fresh.every(([k]) => k.startsWith('stamp_')) ? '✅ 수업 도장' : funOnly ? (fresh.every(([k]) => k.startsWith('ult_')) ? '🌟 진필살기 서술' : '🏕 쉼터 놀이') : '🎁 선생님 선물'}${sum - petri + petriGot ? ` · 💎 +${sum - petri + petriGot}` : ''}${sc ? ` · 📜 +${sc}` : ''}${xp ? ` · EXP +${xp}` : ''}`;
      setTimeout(() => (giftToast = ''), 2600);
    } };
    if (u && fresh0.length) { const S0 = untrack(() => S); if (S0.kind === 'server') void Promise.all(fresh0.map(async ([k, x]) => { const c = await claimOnce(S0, u, k, () => take([[k, x]] as typeof fresh0)); return c && c !== 'later' ? ([k, x] as (typeof fresh0)[number]) : null; })).then((r) => take(r.filter((v): v is (typeof fresh0)[number] => !!v))); /* 🐞 #83-11 끊겨 늦게 받힌 선물 = 그때 지갑에 */ else take(fresh0); }
  }
  // ✉ 선생님 메시지 · 답장 (#130 · 테스트 판 = 학생 우편함 대신 폰 알림 한 줄) — 안 본 것을 읽음으로 · 붙은 💎 는 지갑에
  let mailToast = $state('');
  const mu = untrack(() => pupil)?.uid ?? '';
  const mv = untrack(() => liveValue<Record<string, Mail>>(S, mu ? `mail/${mu}` : 'mail/_none'));
  // 🌀 게시판 포털 (TV 교사 캠프와 같은 규칙 · portal.svelte.ts)
  const portal = untrack(() => portalOf(S)); onDestroy(portal.stop);
  if (typeof window !== 'undefined') (window as { __portalBurst?: () => void }).__portalBurst = () => portal.burst();
  onDestroy(mv.stop);
  $effect(() => {
    const fresh = Object.entries(mv.v.val || {}).filter(([, x]) => x && !x.got).sort((a, b) => a[1].at - b[1].at);
    if (!mu || !fresh.length) return;
    untrack(() => {
      let g = 0;
      for (const [k] of fresh) {
        S.set(`mail/${mu}/${k}/got`, true);
        const gf = S.get<{ g: number; got?: boolean }>(`gifts/${mu}/${k}m`);
        if (gf && !gf.got) { g += Number(gf.g) || 0; S.set(`gifts/${mu}/${k}m/got`, true); }
        const al = gf && pupil ? adoptLog(`${k}m`, S.now()) : null; if (al && pupil && !S.get(`gem/${pupil.cls}/${pupil.num}/log/${al.key}`)) S.set(`gem/${pupil.cls}/${pupil.num}/log/${al.key}`, al.row); // 🛠 #98 채택 = 칭호 「🛠 개선단」 근거 한 줄(💎 0 · 💎 는 위 선물)
      }
      if (g) { me.wallet.gem += g; M.save(); }
      const last = fresh[fresh.length - 1]![1];
      mailToast = mailLine(last, g) + (fresh.length > 1 ? ` 외 ${fresh.length - 1}` : ''); sfx('mail', 0.7); // 🔊 2차 📬 새 소식 (안 본 소식이 생길 때 한 번 · 읽음 표시로 다시 안 남)
      setTimeout(() => (mailToast = ''), 3200);
    });
  });
  // 📝 수업 설문 (정식 survey.js · 선생님이 반마다 열면 📝 단추 · 응답하면 사라짐) — 로그인한 학생 · 서버만 (🧪 테스트 · 👩‍🏫 체험판 = 없음)
  const svWho = untrack(() => (pupil && S.kind === 'server' && meBound() ? { cls: pupil.cls, num: pupil.num } : null));
  const svOpen = untrack(() => liveValue<unknown>(S, svWho ? statePath(svWho.cls) : 'survey/_none')), svDone = untrack(() => liveValue<unknown>(S, svWho ? donePath(svWho.cls, svWho.num) : 'surveyDone/_none/0'));
  onDestroy(svOpen.stop); onDestroy(svDone.stop);
  const svNo = $derived.by(() => { void svOpen.v.val; void svDone.v.val; return svWho && feat('survey') ? pendingNo(S, svWho.cls, svWho.num) : 0; });
  let svSent = $state(false);
  // 📝 설문이 열려 있으면 캠프 들어올 때 한 번 안내 띠 (📜 2026-11-16 선생님 b19 「하단에 크게 있긴 한데 못 찾았음」) · 설문(차시)마다 이 폰에서 한 번 · 6초 뒤 접힘
  const SVK = 'citadel-v1-svband';
  let svBand = $state(false);
  $effect(() => { const n = svNo; if (!n || svSent) return; untrack(() => { let seen = ''; try { seen = localStorage.getItem(SVK) || ''; } catch { /* 무시 */ } const k = `${svWho?.cls}|${n}`; if (seen === k) return; try { localStorage.setItem(SVK, k); } catch { /* 무시 */ } svBand = true; setTimeout(() => (svBand = false), 6000); }); });
  let pwCur = $state(''), pwNew = $state(''), pwNew2 = $state(''), pwMsg = $state(''), pwBusy = $state(false);
  async function pwGo() { if (!pupil || pwBusy) return; if (pwNew !== pwNew2) { pwMsg = '새 비밀번호 두 번이 달라요'; return; } pwBusy = true; const e = await changePw(S, pupil.cls, pupil.num, pwCur, pwNew); pwBusy = false; if (e) { pwMsg = e; return; } sheet = 'set'; giftToast = '🔑 비밀번호를 바꿨어요 · 다음부터 새 4자리'; setTimeout(() => (giftToast = ''), 2500); }
  function svPaid(g: number, x: number) { svSent = true; if (g || x) { me.wallet.gem += g; me.xp += x; M.save(); } giftToast = `📝 고마워요! 설문이 전달됐어요${g || x ? ` (+${x} EXP · 💎+${g})` : ''}`; setTimeout(() => (giftToast = ''), 3200); }
  const live = untrack(() => liveRoom(S, code));
  onDestroy(live.stop);
  const R = $derived(code ? (live.v.room as Room | null) : null); // 코드 없음 = 열린 수업 없음 (rooms/ 전체를 방으로 읽지 않게)
  const open = $derived(trial ? true : !!R && !isEnd(L, R)); // 👩‍🏫 체험판 = 차원문 늘 열림 (누르면 「⚔ 다른 차시로」)

  // 장면 움직임: 모닥불 8프레임(0.12초) · 앉은 용사 2프레임(0.8초) — 이 화면 안 시계 하나
  let frame = $state(0);
  const t = setInterval(() => { frame = (frame + 1) % 40; }, CAMP.fire.ms);
  onDestroy(() => clearInterval(t));
  const fireF = $derived(frame % CAMP.fire.frames);
  const sitF = $derived(Math.floor(frame / 7) % 2);

  // 소식 수 (#111 ②) — 성채 새 방 · 허수아비 복습 · 우편 안 읽음 = 그 기능이 생기는 판에서 · 모루 ★ = 찜
  // 📮 우편함 (정식 mail.js · 📜 2026-11-15 「우편 기능 활성화」): 안 읽음 = 마지막으로 연 뒤 온 소식 + 안 받은 선물 · 빨간 숫자
  const mbWho = untrack(() => (pupil && S.kind === 'server' ? { uid: pupil.uid, cls: pupil.cls, num: pupil.num } : null));
  const mbG = untrack(() => liveValue<unknown>(S, mbWho ? `gifts/${mbWho.uid}` : 'gifts/_none')), mbN = untrack(() => liveValue<unknown>(S, mbWho ? `school/notice/${mbWho.cls}` : 'school/notice/_none'));
  onDestroy(() => { mbG.stop(); mbN.stop(); });
  let mbSeen = $state(untrack(() => (mbWho ? mailSeenGet(mbWho.cls, mbWho.num, S) : 0))), mbVer = $state(0);
  const mailN = $derived.by(() => { void mbG.v.val; void mbN.v.val; void mv.v.val; void mbVer; return mbWho ? mailUnread(mailInbox(S, mbWho.uid, mbWho.cls), mbSeen) : 0; });
  async function mailTake(id: string): Promise<string> {
    if (!mbWho) return '';
    const put = (got: { g: number; s: number; x: number; petri: boolean }) => {
      const n = got.petri ? earnDaily(me.wallet, got.g, kstDay(S.now()), GEM.dayCap) : (me.wallet.gem += got.g, got.g); // 🗿 석화 = 하루 한도 안 (캠프 받기와 같음)
      me.wallet.scroll += got.s; me.xp += got.x; M.save(); mbVer++; sfx('mail', 0.6);
      return `🎁 받았어요${n ? ` · 💎 +${n}` : ''}${got.s ? ` · 📜 +${got.s}` : ''}${got.x ? ` · EXP +${got.x}` : ''}`;
    };
    const got = S.kind === 'server' ? await claimOnce(S, mbWho.uid, id, (c) => { mailToast = put(c); setTimeout(() => (mailToast = ''), 2600); }) : mailClaim(S, mbWho.uid, id); if (!got) return '이미 받은 선물이에요'; // 🐞 11/20 ② 서버 = transaction (폰 두 대 동시 = 한 번만)
    if (got === 'later') return '⏳ 인터넷이 이어지면 받아요 · 받으면 지갑에 저절로 들어가요'; // 🐞 #83-11
    return put(got);
  }
  // 🏕 캠프 A (📜 2026-11-15 선생님 「A안으로 하되 게시판 던전에서 방이 개설되면 포털 열려서 참여해 보도록 포털에 이펙트도 넣고 게시판 빛나고」 · DECISIONS 맨 아래)
  //   할 일 있는 물건만 금빛 숨쉬기 + 말풍선 + 별 하나 · 할 일 없는 물건 = 흐림(0.55) · 아무 할 일도 없으면 빛 · 말풍선 · 흐림 없음
  //   🏰 새 방(열렸는데 아직 못 깬 방) · 🎯 남은 복습 문제 · 오늘 💎 · 📮 안 읽은 소식 · ⚒ 찜한 카드 · 🚪 수업 열림 · 📋 모집 중 방 n/4 (실시간)
  let todoVer = $state(0);
  { const tv = setInterval(() => todoVer++, 8000); onDestroy(() => clearInterval(tv)); } // 다른 기기 · 선생님이 바꾼 것(새 방 · 기록)도 8초 안에
  const castleLeft = (): number => {
    const b = meBound(), RS = b?.S ?? S, base = b ? bonusBase(b.cls, b.num) : bonusBase(castleWho.cls, castleWho.num || castleWho.uid);
    const up = progressOf(S, castleWho.cls, (castleWho.cls && castleWho.num ? S.get<Record<string, unknown>>(`records/${castleWho.cls}/${castleWho.num}`) : null) || {}, fromMe0);
    return visibleCastles().reduce((a, P) => { const recs = withLegacy(P.id, RS.get<Record<string, CastleRec>>(`${base}/${P.id}`) || {}); return a + castleState(P, up, recs, false, manualOf(S, P.id, castleWho.cls)).open.filter((r) => !recs[r.id]?.clear).length; }, 0);
  };
  const reviewNow = () => {
    const b = meBound(); if (!b || !pupil) return { left: 0, gem: 0 };
    const recs = S.get<Record<string, Rec>>(`records/${pupil.cls}/${pupil.num}`) || {}, bon = b.S.get<Record<string, Bon>>(bonusBase(b.cls, b.num)) || {}, log = b.S.get<Record<string, unknown>>(`gem/${b.cls}/${b.num}/log`) || {};
    return reviewTodo(PACKS, recs, bon, log, kstDay(S.now()));
  };
  const todo = $derived.by<Record<string, string>>(() => {
    void todoVer; void sheet; void castleGo; void mailN; void wishN;
    const t: Record<string, string> = {}, rv = feat('scarecrow') ? reviewNow() : { left: 0, gem: 0 }, cn = feat('citadel') ? castleLeft() : 0, rc = feat('board') ? portal.recruit : null;
    if (rv.left > 0) t.scare = `복습 ${rv.left}${rv.gem ? ` · 💎+${rv.gem}` : ''}`;
    if (cn > 0) t.castle = `새 방 ${cn}`;
    if (mailN > 0) t.mail = `소식 ${mailN}`;
    if (feat('forge') && wishN > 0) t.anvil = `카드 ${wishN}`;
    if (open && !trial) t.gate = '⚔ 수업 열림 · 입장!'; // 👩‍🏫 체험판 = 차원문 = 「다른 차시」 이름표만
    if (rc) t.dummy = `⚔ 모집 중 ${rc.n}/${rc.max} · 참여!`;
    if (chalN > 0) t.tentdeco = `받을 도전과제 ${chalN}`;
    return t;
  });
  // 🏆 #68 도전과제 판: 기록 = 묶인 학생은 서버(gem log chal_) · 시험 · 체험 · 이 기기 = 이 폰에만(같은 키)
  const CHK = 'citadel-v1-chal';
  const chLocal = (): Record<string, unknown> => { try { return JSON.parse(localStorage.getItem(CHK) || '{}'); } catch { return {}; } };
  let chVer = $state(0);
  function chalCtx(): ChalCtx { const b = meBound(); if (b) return { d: titleData(b.S, b.cls, b.num), gifts: b.S.get<Record<string, unknown>>(`gifts/${pupil?.uid ?? ''}`), castles: castles.list }; return { d: { gem: { log: chLocal() } }, gifts: {}, castles: castles.list }; }
  function chalClaim(key: string, row: { g: number; s?: number; at: number; why: string }): boolean {
    const b = meBound();
    if (b) { const p = `gem/${b.cls}/${b.num}/log/${key}`; if (!isReady(b.S, p) || b.S.get(p)) return false; b.S.set(p, row); } // 🐞 ① 받기 전 = 안 줌 (두 번 받기 막음)
    else { const L0 = chLocal(); if (L0[key]) return false; L0[key] = row; try { localStorage.setItem(CHK, JSON.stringify(L0)); } catch { /* 무시 */ } }
    me.wallet.gem += row.g; if (row.s) me.wallet.scroll += row.s; M.save(); chVer++; return true;
  }
  const chalN = $derived.by(() => { void chVer; void sheet; void todoVer; try { return chalReady(chalCtx()); } catch { return 0; } });

  // 🏆 #73 달성 연출: 조건이 막 채워진 과제(학생마다 me.seen ach-{id} · 다시 안 띄움) · 캠프에 있고 창이 닫혔을 때 · 3개까지 하나씩 + 「+n 개 더」
  let achQ = $state<Chal[]>([]), achMore = $state(0);
  function achCheck() {
    if (achQ.length || paperOn() || castleGo != null || sheet) return;
    let c: ChalCtx; try { c = chalCtx(); } catch { return; }
    const b = meBound(), sv = (b ? b.S.get<Record<string, unknown>>(`${bonusBase(b.cls, b.num)}/ach`) : null) || {}; // 본 것 = 학생마다 서버(bonus/…/ach) · 묶이지 않음 = 이 기기(me.seen)
    const fresh = CHALS.filter((ch) => !ch.hide?.(c) && !me.seen[`ach-${ch.id}`] && !sv[ch.id] && chalState(ch, c).done);
    if (!fresh.length) return;
    for (const ch of fresh) { me.seen[`ach-${ch.id}`] = true; if (b) b.S.set(`${bonusBase(b.cls, b.num)}/ach/${ch.id}`, Date.now()); } M.save();
    const order = { leg: 0, adv: 1, seed: 2 } as const, list = [...fresh].sort((a, b) => order[a.tier] - order[b.tier]);
    achQ = list.slice(0, 3); achMore = list.length - achQ.length;
  }
  const achClaim = (ch: Chal): boolean => { const c = claimOf(ch, chalCtx(), Date.now()); const ok = !!c && chalClaim(c.key, c.row); if (ok) chVer++; return ok; };
  $effect(() => { if (sheet || castleGo != null) return; void chVer; const t = setTimeout(() => untrack(achCheck), 900); return () => clearTimeout(t); });
  /** 🏅 가진 칭호 (🧙 내 용사와 같은 셈) */
  function recEarned(): string[] { const b = meBound(); return me.test || !b ? earnedTitles(true, []) : earnedFrom(titleData(b.S, b.cls, b.num), []); }  // 📖 #66 배움터 예습: 열린 차시 중 안 열어 본 것 = 「📖 새 차시 열림」 작은 표시(금빛 아님 · 복습 금빛이 먼저)
  const prepAll = untrack(() => !!trial || !pupil || !!fromMe0); // 로그인한 학생(🧪 1-6 포함) = 실제 규칙 · 이 기기 · 교사 「나」 캠프 = 모두 · 체험판 = 📖 배움터 예습 모든 차시 열림 (원래 수업은 반이 수업한 다음 차시 하나 · 📜 #66 머리 「체험판 = 보여 주기용 · 진도 없음」)
  const prepNos = $derived.by(() => { void todoVer; void sheet; if (!feat('scarecrow') || trial) return ''; const P = prepOpenList(S, pupil?.cls ?? '', untrack(() => (pupil ? S.get<Record<string, unknown>>(`records/${pupil.cls}/${pupil.num}`) : null) || {}), prepAll).open; const ns = P.map((L) => L.no); return ns.length > 2 ? `${Math.min(...ns)}~${Math.max(...ns)}` : ns.join(' · '); }); // 🔥 #71 던전 문 창 「n차시 탐사(예습)」
  function prepGo() { const P = prepOpenList(S, pupil?.cls ?? '', (pupil ? S.get<Record<string, unknown>>(`records/${pupil.cls}/${pupil.num}`) : null) || {}, prepAll).open; let ch = false; for (const L of P) if (!me.seen[`prep-${L.id}`]) { me.seen[`prep-${L.id}`] = true; ch = true; } sheet = 'prep'; try { sessionStorage.setItem(SK, JSON.stringify({ s: 'prep', at: Date.now() })); } catch { /* 사생활 창 */ } if (ch) M.save(); } // 🐞 저장 = 캠프 다시 그림(App key bindVer) → 보던 시트(던전 문)로 되돌아가던 것: 새 시트를 먼저 적고 저장
  // 🏷 #72 할 일 숫자(빨간 배지) · 💎 얻을 양(금빛 칩) — todo 와 같은 출처
  const todoN = $derived.by<Record<string, { n: string; gem?: number }>>(() => {
    void todoVer; void sheet; void castleGo; void mailN; void wishN;
    const t: Record<string, { n: string; gem?: number }> = {}, rv = feat('scarecrow') ? reviewNow() : { left: 0, gem: 0 }, cn = feat('citadel') ? castleLeft() : 0, rc = feat('board') ? portal.recruit : null;
    if (rv.left > 0) t.scare = { n: String(rv.left), gem: rv.gem || undefined };
    if (cn > 0) t.castle = { n: String(cn) };
    if (mailN > 0) t.mail = { n: String(mailN) };
    if (feat('forge') && wishN > 0) t.anvil = { n: String(wishN) };
    if (rc) t.dummy = { n: `${rc.n}/${rc.max}` };
    if (chalN > 0) t.tentdeco = { n: String(chalN) }; // ⛺ #73 받을 도전과제
    return t;
  });
  // 🏷 #72 이름표 보이기: 할 일 있는 물건만 · 처음 3번 들어올 때 = 모두 · 교사 「나」 = 늘 · 누르면 0.8초 · (체험판 = 학생과 같게)
  const VK = untrack(() => `citadel-campvis-${pupil ? `${pupil.cls}-${pupil.num}` : trial ? 'trial' : 'me'}`);
  const visN = untrack(() => { try { const n = (Number(localStorage.getItem(VK)) || 0) + 1; localStorage.setItem(VK, String(n)); return n; } catch { return 1; } });
  const tagAll = untrack(() => !!fromMe0 || visN <= 3);
  let tagFlash = $state<Record<string, boolean>>({});
  const tagOn = (k: string) => !!todo[k] || tagAll || !!tagFlash[k] || showAll;
  const anyTodo = $derived(Object.keys(todo).length > 0);
  // 📜 2026-11-20 선생님 「왜 어둡나 · 원래 밝게 하고 누르면 이펙트」: 할 일 없는 물건 흐림(dim) 없앰 · 할 일 = 금빛 숨쉬기만
  const hl = (k: string): 'todo' | '' => (todo[k] ? 'todo' : '');
  // 👆 누를 때 이펙트: 0.15초 톡(눌렸다 1.08 로 튐) + 밝기 1.4 번쩍 + 둘레 반짝이 6개(0.5초 · 물건마다 색) · 동작 줄이기 = 번쩍만 · 창은 기다리지 않고 바로 열림
  const TCOL: Record<string, string> = { dummy: '#ffd25a', tent: '#7cd4ff', scare: '#6ee7a0', mail: '#ff9fc6', gate: '#ff7a5c' };
  let tapN = $state<Record<string, number>>({}), tapSeq = 0;
  function tapFx(k: string) { const n = ++tapSeq; tapN = { ...tapN, [k]: n }; setTimeout(() => { if (tapN[k] === n) { const { [k]: _, ...r } = tapN; void _; tapN = r; } }, 550); }
  let boardJoin = $state('');
  // 🆕 🎒 학생 새 소식 (📜 2026-11-15 · school/changes.ts): 정식에서만 · 실제 학생 · 캠프에서만(수업 화면 아님) · 마지막 본 판보다 새 판의 학생 줄 = 작은 창 한 번(최대 5줄) + 📮 「📢 새 소식」
  untrack(() => { if (realStu && pupil) usageVisit(S, pupil.cls, pupil.num); }); // 📈 활용 추이 🚪 접속 (하루 한 번 · 실제 학생만 · 정식 usage.js visit)
  let stuNews = $state<string[]>([]);
  untrack(() => {
    if (!(realStu && pupil && chanOf() === 'rel')) return;
    const P0 = pupil, S0 = S, sp = studentSeenPath(P0.cls, P0.num);
    const go = () => { const list = unseen(S0.get<string>(sp), BUILD), lines = studentLines(list); if (!list.length) return; studentNews(S0, P0.uid, list, S0.now()); mbVer++; if (lines.length) stuNews = lines; else S0.set(sp, BUILD); };
    if (S0.fetch) void S0.fetch(sp).then(go, go); else go();
  });
  function stuNewsOk() { if (pupil) S.set(studentSeenPath(pupil.cls, pupil.num), BUILD); stuNews = []; }
  const news = $derived<Record<string, number>>({ castle: 0, dummy: 0, mail: mailN });
  let showAll = $state(false);
  let allTimer: ReturnType<typeof setTimeout> | null = null;
  function ground() { showAll = true; if (allTimer) clearTimeout(allTimer); allTimer = setTimeout(() => (showAll = false), 2000); }
  const wishN = $derived(wishLeft(me.wishes, me.cards));
  const NAME: Record<string, string> = { tentdeco: '기록 텐트', gate: '던전 문', castle: '성채', tent: '출제 공방', anvil: '모루', dummy: '게시판', scare: '허수아비', mail: '우편함', hero: '내 용사' }; // 🏷 #72 이름표 = 2~4글자 · 아이콘 없음 (부제 「복습 n~m차시」 = 그 창 맨 위)
  const gateText = $derived(trial ? '다른 차시' : open ? `${L.no}차시 던전` : '차시 던전 · 닫힘');

  // 🔁 새로 고침돼도 보던 시트로 (📜 2026-11-14 모든 판 공통 화면 규칙 ①): 이 탭에서 10분 안 · 열린 시트 이름만 기억
  const SK = 'citadel-camp-sheet';
  let sheet = $state<string | null>((() => { try { const j = JSON.parse(sessionStorage.getItem(SK) || 'null') as { s: string; at: number } | null; return j && Date.now() - j.at < 10 * 60e3 ? j.s : null; } catch { return null; } })());
  $effect(() => { const s = sheet; try { if (s) sessionStorage.setItem(SK, JSON.stringify({ s, at: Date.now() })); else sessionStorage.removeItem(SK); } catch { /* 사생활 창 */ } });
  // 🧙 첫 용사 고르기 = 방금 가입한 폰의 첫 캠프에서 한 번 (App 이 가입 때 표시 · 📜 2026-11-13 밤 ❓#1 = A)
  let hero0 = $state((() => { try { return sessionStorage.getItem('citadel-hero0') === '1'; } catch { return false; } })());
  // 🏰 성채 새 방 (정식 camp.js · 이 기기에 지난 수 기억 · 늘면 한 번 안내) — 📜 2026-11-14 = 올린 성채 팩(보이는 층)에서 이 학생에게 열린 방 수 · 처음 본 수는 소리 없이 기억만
  const castleWho = untrack(() => ({ cls: pupil?.cls ?? '', num: pupil?.num ?? 0, uid: pupil?.uid ?? 'me' }));
  // 🎵 학생 폰 배경음 = 첫 화면 · 개인 캠프(⚒ 모루 창 포함)만 (DECISIONS 2026-11-11 · 📜 2026-11-14 되살림) — 🏰 성채 · 🎯 허수아비 · 📋 게시판 = 없음
  $effect(() => { bgm(castleGo == null && sheet !== 'review' && sheet !== 'prep' && sheet !== 'dummy' ? 'camp' : null, 'phone'); });
  onDestroy(() => bgm(null, 'phone'));
  const castleOpen = (): number => {
    const b = meBound(), RS = b?.S ?? S, base = b ? bonusBase(b.cls, b.num) : bonusBase(castleWho.cls, castleWho.num || castleWho.uid);
    const up = progressOf(S, castleWho.cls, (castleWho.cls && castleWho.num ? S.get<Record<string, unknown>>(`records/${castleWho.cls}/${castleWho.num}`) : null) || {}, fromMe0); // 👩‍🏫 교사 캠프 = 모든 방 열림 (정식 교사)
    return visibleCastles().reduce((a, P) => a + castleState(P, up, withLegacy(P.id, RS.get<Record<string, CastleRec>>(`${base}/${P.id}`) || {}), false, manualOf(S, P.id, castleWho.cls)).open.length, 0);
  };
  let castleGo = $state<string | null>(null); // 🏰 성채 화면 (층 id · '' = 층 고르기)
  {
    const fresh = untrack(castleOpen), nk = `citadel-castle-rooms-${untrack(() => pupil)?.uid ?? 'me'}`;
    let was: number | null = null; try { const v = localStorage.getItem(nk); was = v == null ? null : Number(v) || 0; localStorage.setItem(nk, String(fresh)); } catch { /* 사생활 창 */ }
    if (feat('citadel') && was != null && fresh > was && !untrack(() => hero0)) { giftToast = untrack(() => giftToast) || `🏰 성채던전에 새 방 ${fresh - was}개가 열렸어요!`; sfx('castle-open', 0.8); setTimeout(() => (giftToast = ''), 3200); } // 🔊 2차 🏰
  }
  // 🏕 B · D · E (📜 2026-11-15 선생님 「ABDE 까지 해 줘 · 베타판에서 해 보고 가려낼게」 · DECISIONS 맨 아래 · 손맛 = GAME-FEEL 짧게 · 소리 · 진동 25ms)
  //   B 만지면 반응: 물건마다 짧은 반응(허수아비 기우뚱 · 우편함 덜컹 · 성채 종 + 창 불 · 모루 불똥 · 텐트 펄럭 · 문 빛 · 게시판 통 · 모닥불 불꽃) + 숨은 반응 넷(나무 · 버섯 · 달 · 반딧불) · 보상 없음
  //   D 용사: 8~15초 가만히 두면 일어나 허수아비 · 모닥불로 걸어가 기웃(툭 · 손 쬐기) → 다시 앉음 · 물건을 누르면 그리로 걸어가서(0.6초) 들어감 · 다른 화면이 열리면 멈춤
  //   E 친구 흔적: 게시판 모집 중 방 친구(최대 3명)가 포털 앞에 서 있음 + 「○○님이 기다려요」(최근 전투 숨김 = 「친구가」) · 방이 차거나 닫히면 포털로 사라짐
  //   동작 줄이기 = 소리 · 진동 · 빛만(걷기 · 불똥 없음) · 움직임 = transform · opacity 만
  const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stageEl = $state<HTMLDivElement | null>(null), stW = $state(0), stH = $state(0);
  type Fx = { id: number; x: number; y: number; k: string };
  let fxs = $state<Fx[]>([]), poked = $state<Record<string, boolean>>({}), fxN = 0;
  const SND: Record<string, string> = { scare: 'dummy-hit', mail: 'mail', castle: 'castle-open', anvil: 'spark', dummy: 'board', tent: 'ink' /* 🔊 11/20 옛 'page' = 없는 이름이라 소리 없었음 */, tentdeco: 'wind', gate: 'magic', fire: 'fire', tree: 'wind', shroom: 'star', moon: 'star', fly: 'star' };
  const FXK: Record<string, string> = { fire: 'spark', anvil: 'spark', castle: 'bell', gate: 'glow', tree: 'leaf', shroom: 'glow', moon: 'twinkle', fly: 'fly' };
  const ptOf = (e?: Event): [number, number] | null => { const r = stageEl?.getBoundingClientRect(), m = e as MouseEvent | undefined; if (!r || !m || m.clientX == null || !r.width) return null; return [((m.clientX - r.left) / r.width) * 100, ((m.clientY - r.top) / r.height) * 100]; };
  function poke(k: string, e?: Event) {
    sfx(SND[k] ?? 'click', 0.6); try { navigator.vibrate?.(25); } catch { /* 무시 */ }
    poked = { ...poked, [k]: true }; setTimeout(() => { const p = { ...poked }; delete p[k]; poked = p; }, 650);
    tagFlash = { ...tagFlash, [k]: true }; setTimeout(() => { const f = { ...tagFlash }; delete f[k]; tagFlash = f; }, 800); // 🏷 #72
    const pt = ptOf(e); if (!RM && FXK[k] && pt) { const id = ++fxN; fxs = [...fxs, { id, x: pt[0], y: pt[1], k: FXK[k]! }]; setTimeout(() => (fxs = fxs.filter((f) => f.id !== id)), 1100); }
  }
  // D 용사 걷기 (자리 = 캠프 그림 % · 앉은 자리 CAMP.hero)
  const SEAT = { left: CAMP.hero.left, bottom: CAMP.hero.bottom };
  // 🐞 📜 2026-11-20 선생님 「용사가 자꾸 허수아비 뒤쪽으로 이동 · 앞쪽으로」: 서는 자리 = 물건 발밑(바닥 줄)보다 아래(화면 앞) · 용사 그림 = 물건 위 층(.hmove z 6)
  //   물건 바닥 줄(%) = 게시판 34.6 · 우편함 9.8 · 허수아비 42.1 · 책상 16.3 · 모루 46.6 (manifest CAMP_PROPS) · 성채 · 던전 문 · 텐트 = 배경이라 그 앞 물건(모루 · 허수아비 · 게시판)과 안 겹치는 자리
  const SPOT: Record<string, { left: number; bottom: number }> = { scare: { left: 50, bottom: 36 }, fire: { left: 38, bottom: 27 }, mail: { left: 28, bottom: 2 }, anvil: { left: 47, bottom: 41 }, dummy: { left: 30, bottom: 29 }, tent: { left: 70, bottom: 12 }, tentdeco: { left: 36, bottom: 32 }, castle: { left: 48, bottom: 42 }, gate: { left: 84, bottom: 38 } };
  type HP = 'sit' | 'walk' | 'attack' | 'idle';
  let hp = $state<{ left: number; bottom: number; pose: HP; flip: boolean; ms: number }>({ ...SEAT, pose: 'sit', flip: false, ms: 0 });
  let walkTok = 0, idleT: ReturnType<typeof setTimeout> | null = null;
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const TURN = 120; // 돌아서기 (ms)
  async function walkTo(to: { left: number; bottom: number }, ms: number, tok: number): Promise<boolean> {
    if (Math.abs(to.left - hp.left) + Math.abs(to.bottom - hp.bottom) < 0.5) return tok === walkTok;
    const f = to.left < hp.left; // 먼저 짧게 돌아서고(TURN) 그다음 걸음
    if (f !== hp.flip) { hp = { ...hp, flip: f, ms: 0 }; await wait(TURN); if (tok !== walkTok) return false; }
    hp = { ...hp, pose: 'walk', ms }; await wait(20); hp = { ...hp, left: to.left, bottom: to.bottom }; await wait(ms);
    return tok === walkTok;
  }
  const heroRow = (p: HP) => (p === 'sit' ? HERO.sitRow : ANIM[p][0]);
  const heroCol = $derived(hp.pose === 'sit' ? sitF : frame % ANIM[hp.pose][1]);
  function arm() { if (idleT) clearTimeout(idleT); if (RM) return; idleT = setTimeout(wander, 8000 + Math.random() * 7000); }
  async function wander() {
    if (sheet || castleGo != null || hp.pose !== 'sit') { arm(); return; }
    const tok = ++walkTok, tgt = Math.random() < 0.5 ? 'scare' : 'fire';
    if (!(await walkTo(SPOT[tgt]!, 1500, tok))) return;
    if (tgt === 'scare') { hp = { ...hp, pose: 'attack', flip: false }; await wait(240); if (tok !== walkTok) return; poked = { ...poked, scare: true }; sfx('dummy-hit', 0.35); setTimeout(() => { const p = { ...poked }; delete p.scare; poked = p; }, 650); await wait(500); }
    else { hp = { ...hp, pose: 'idle', flip: false }; await wait(1800); }
    if (tok !== walkTok) return;
    if (!(await walkTo(SEAT, 1500, tok))) return;
    hp = { ...hp, pose: 'sit', flip: false }; arm();
  }
  untrack(arm); onDestroy(() => { if (idleT) clearTimeout(idleT); walkTok++; });
  // 시트가 닫히면 자리로 돌아가 앉음
  $effect(() => { if (sheet || castleGo != null) return; untrack(() => { if (hp.pose === 'sit' && hp.left === SEAT.left) { arm(); return; } const tok = ++walkTok; void walkTo(SEAT, 900, tok).then((ok) => { if (ok) { hp = { ...hp, pose: 'sit', flip: false }; arm(); } }); }); });
  /** 물건 누름 = 반응 → 용사가 걸어가서(0.6초) → 들어감 (동작 줄이기 = 바로) */
  function go(k: string, e?: Event) {
    e?.stopPropagation(); tapFx(k); poke(k, e); arm();
    if (RM || !SPOT[k]) { tap(k); return; }
    const tok = ++walkTok;
    void walkTo(SPOT[k]!, 600, tok).then((ok) => { if (ok && !sheet && castleGo == null) { hp = { ...hp, pose: 'idle' }; tap(k); } }); // 🐞 걷는 동안 다른 창을 열었으면(예: 던전 문 → 예습) 늦게 도착한 걸음이 그 창을 덮지 않게
  }
  // 🥚 #74 이스터에그 (캠프에서만 · 수업 레이드 · TV 안 일어남): 찾음 = 학생마다 bonus/…/egg/{id} · 묶이지 않음 = 이 기기 · 한 번 찾은 것도 연출은 다시 · 칭호는 한 번
  const STUMPS: [number, number][] = [[39.4, 61.7], [60.6, 61.7], [64.8, 68], [35.5, 68]]; // 그루터기 = 뒤 왼 → 뒤 오른 → 앞 오른 → 앞 왼 (시계 방향)
  const SHROOMS: [number, number][] = [[2.1, 54.5], [95.2, 54.5], [2.1, 88.3], [95.2, 92.1], [99.4, 92.1]]; // 빛 버섯 (물건에 가리지 않는 것)
  let fibT: number[] = [], stumpSeq: number[] = [], shroomHit = $state<Record<number, true>>({});
  let eggFx = $state<{ kind: string; first: boolean; name: string; title: string } | null>(null);
  const eggNow = () => ((globalThis as { __eggNow?: number }).__eggNow ?? Date.now()); // 시험 고리 (원주율의 달 시각)
  function eggHave(id: string): boolean { const b = meBound(); return b ? !!b.S.get(`${bonusBase(b.cls, b.num)}/egg/${id}`) : !!me.seen[`egg-${id}`]; }
  function eggGo(id: string) {
    if (paperOn() || eggFx) return;
    const e = eggOf(id); if (!e) return;
    const first = !eggHave(id), b = meBound();
    if (first) { if (b) b.S.set(`${bonusBase(b.cls, b.num)}/egg/${id}`, Date.now()); else { me.seen[`egg-${id}`] = true; M.save(); } }
    eggFx = { kind: id, first, name: e.name, title: titleOf(e.title)?.name ?? '' }; chVer++;
  }
  // 🎬 8 = 첫 화면에서 찾은 표시(이 기기) → 캠프에 오면 학생 기록에 옮기고 「비밀 발견」 띠
  untrack(() => { try { if (localStorage.getItem('citadel-egg-e8')) { localStorage.removeItem('citadel-egg-e8'); if (!eggHave('e8')) setTimeout(() => eggGo('e8'), 1200); } } catch { /* 사생활 창 */ } });
  // 🎯 7 허수아비의 친구 = 복습 100판 → 캠프에 오면 한 번 털썩 · 그 뒤 반창고 🩹
  const e7Ready = $derived.by(() => { void chVer; try { return reviewPlaysOf(chalCtx()) >= 100; } catch { return false; } });
  $effect(() => { if (!e7Ready || sheet || castleGo != null || achQ.length) return; untrack(() => { if (!eggHave('e7')) setTimeout(() => eggGo('e7'), 600); }); });
  /** 모닥불 · 숨은 곳 = 반응만 */
  function poke0(k: string, e: Event) { e.stopPropagation(); poke(k, e); arm(); }
  // E 친구 흔적
  const friends = $derived.by(() => { const me0 = pupil?.uid ?? 'me'; return feat('board') ? portal.waiting.filter((m) => m.uid !== me0).slice(0, 3) : []; });
  const friendText = $derived.by(() => { const f = friends[0]; if (!f) return ''; const off = !!S.get(`accounts/${f.cls}/${f.num}/feedOff`); const who = off ? '친구가' : `${f.nick}님이`; return friends.length > 1 ? `${off ? '친구' : `${f.nick}님`} 외 ${friends.length - 1}명이 기다려요` : `${who} 기다려요`; });
  // 📋 게시판 옆 「같이 하자」 용사 (📜 2026-11-17 #9 「게시판던전 옆에 용사 한 명 배치해서 같이 하자고 유도」): 늘 서 있음(숨쉬기) + 말풍선 · 누르면 게시판(모집 중 방이면 바로 참여)
  //   진짜 친구가 모집 중 = 그 친구 용사 · 「○○님이 같이 하재요!」(feedOff = 「친구가」) / 아무도 없음 = 오늘의 용사(날마다 · 내 용사 빼고) · 말풍선 차례로 3줄 · ⚙ 게시판 꺼짐 · 수업 열림 = 안 보임
  const BUDDY_LINES = ['같이 도전할래? ⚔', '둘이 하면 💎 더!', '한 판만 하자!'];
  let buddyI = $state(0); { const bt = setInterval(() => (buddyI = (buddyI + 1) % BUDDY_LINES.length), 3200); onDestroy(() => clearInterval(bt)); }
  const buddy = $derived.by(() => {
    if (!feat('board') || open || trial) return null;
    const f = friends[0];
    if (f) { const off = !!S.get(`accounts/${f.cls}/${f.num}/feedOff`); return { hero: f.hero, line: `${off ? '친구가' : `${f.nick}님이`} 같이 하재요!`, real: true }; }
    const ids = Object.keys(HERO_NAMES).map(Number).filter((h) => h !== me.hero), day = Math.floor((Date.now() + 9 * 3600e3) / 86400e3);
    return ids.length ? { hero: ids[day % ids.length]!, line: BUDDY_LINES[buddyI]!, real: false } : null;
  });
  let questTab = $state<'up' | 'mine' | 'hall'>('up'); // ✏ #75 게시판 「친구 문제」 = 📜 탭으로
  function tap(id: string, e?: Event) {
    e?.stopPropagation();
    M.mark(id);
    if (id === 'gate' && trial) { trial.ongate(); return; }
    if (id === 'gate') { if (open) location.href = `?role=student&room=${encodeURIComponent(code)}`; else sheet = 'gate'; return; }
    if (id === 'scare') { sheet = 'review'; return; }
    if (id === 'tentdeco') { sheet = 'rec'; return; } // ⛺ #73 기록 텐트 // 🎯 #71 허수아비 = 복습만 (#66 배움터 두 단추 없앰)
    if (id === 'dummy') boardJoin = portal.recruit?.pid ?? ''; // 🌀 모집 중 방 = 그 방에 바로 참여 (캠프 A)
    sheet = id;
  }

  /** 🔊 📜 2026-11-20 소리 없던 곳: 용사 카드 · 사다리 칸 · 「… 열기」 단추 = 누름 소리 */
  let cfHi = $state(0); // 🔥 받은 인사 수 (용사 카드 옆 작은 표시)
  const heroTap = () => { sfx('click', 0.5); tap('hero'); };
  // 💎 얻는 길 빨간 점 = 지금 받을 수 있는 곳 (이름표 빨간 숫자와 같은 출처)
  const earnDots = $derived<Record<string, boolean>>({ chal: chalN > 0, scare: !!todoN.scare, castle: !!todoN.castle, board: !!todoN.dummy, raid: open && !trial, mail: mailN > 0 });
  const earnOff = $derived([...(feat('citadel') ? [] : ['castle']), ...(feat('scarecrow') && !trial ? [] : ['scare']), ...(feat('board') && !trial ? [] : ['board']), ...(trial ? ['mail', 'chest'] : [])]);
  // 정보판 (#111 ④)
  const lk = $derived(meLookId(me)); // 🌟 #29 보이는 모습 (각성한 로안이면 16)
  const fam = $derived(famOfHero(me.hero));
  const lv = $derived(level(me.xp));
  const fxGranted = $derived.by(() => { const b = meBound(); try { return me.test || !b ? [] : heroUnlock(titleData(b.S, b.cls, b.num)).fx; } catch { return []; } }); // 🏆 업적 이펙트 (🐞 11/19 ④)
  const ladderRows = $derived(rungs(me.hero, ladder(me.hero).filter((id) => ownsSkill(me.wallet, emptyPlan(), me.hero, id, fxGranted)), equipOf({ hero: me.hero, enh: me.enh, socket: me.socket, title: me.title }), me.wallet));
  const ttl = $derived(me.title && me.title !== 'none' ? titleOf(me.title) : null);
  const hero = $derived(HERO_NAMES[me.hero] ?? { name: '용사', job: '' });
  const nextBuy = $derived(ladderRows.find((r) => r.state === 'buy') ?? null);
  const nextLine = $derived.by(() => {
    const b = ladderRows.find((r) => r.state === 'buy');
    if (b) return `🪜 ${TIER_NAMES[b.tier]} ${b.name.replace(/^\S+ /, '')}를 열 수 있어요 · 💎 ${b.gem}${b.scroll ? ` + 📜 ${b.scroll}` : ''}`;
    return `⭐ Lv.${lv.lv + 1} 까지 EXP ${lv.next - lv.into}`;
  });
  const pct = (v: number, tot: number) => `${((100 * v) / tot).toFixed(2)}%`;
  const [W, H] = CAMP.size;
  const zoneStyle = (k: string) => { const z = CAMP.zones[k] as [number, number, number, number]; return `left:${pct(z[0], W)};top:${pct(z[1], H)};width:${pct(z[2] - z[0], W)};height:${pct(z[3] - z[1], H)}`; };
  const castleLit = $derived(feat('citadel') && visibleCastles().length > 0); // 🏰 #71 성채 열림 = 둘레 금빛 빛무리 (「성채 불 켜짐」 그림 전 임시)
  const tentF = $derived(poked.tentdeco ? 1 + (frame % 4) : 0); // ⛺ #71 텐트 누름 = 반응 4칸
  const HS = 1; // 정보판 용사 = 칸 80 × 64 그대로(정수 배율)
  // 🚪 코드로 들어가기 (#138 · 정식 codeGate): 6자리 · 열려 있는 방이어야 함
  let codeIn = $state(''), codeErr = $state('');
  async function enterCode() {
    const c = codeIn.trim();
    if (c === '1414' || c === '100') { codeIn = ''; sheet = null; eggGo(c === '1414' ? 'e1' : 'e2'); return; } // 🥚 #74 (방 코드 = 6자리라 겹치지 않음)
    if (!/^\d{6}$/.test(c)) { codeErr = '수업 코드 6자리를 넣어 주세요'; return; }
    const R0 = (S.fetch ? await S.fetch<Room>(`rooms/${c}`) : S.get<Room>(`rooms/${c}`)); // 🔐 #163-① 방은 필요할 때 받음 → 한 번 기다림
    if (!R0) { codeErr = '그 코드의 수업이 없어요 · 선생님께 다시 물어봐요'; return; }
    if (R0.state?.closed) { codeErr = '이미 끝난 수업이에요'; return; }
    location.href = `?role=student&room=${encodeURIComponent(c)}`;
  }
  // ⛺ 교사 「나」 → 내 캠프 (📜 2026-11-13 밤 🪞 「선생님이 보는 것 = 학생이 보는 것」): 학생 폰 캠프와 같은 화면 · 교사 지갑(테스트 값) · ‹ = 「나」 탭으로 · QR 은 리모컨 쪽에만
  const fromMe = typeof location !== 'undefined' && new URLSearchParams(location.search).get('from') === 'me';
</script>

<div class="camp" class:paper={paperOn()} style:--ar={W / H}>
  {#if paperOn()}
  <!-- 📝 제출 모드 v2 ⑦ 수업 밖 = 「오늘 할 일」 (학습 이름 + 통일 용어 괄호 한 번 · 그림 없음 · 💎 없음) -->
  <header class="ptop" data-k="ptop">{#if pupil}<button type="button" class="pback" aria-label="메뉴" onclick={() => (sheet = 'menu')}>‹</button>{:else if fromMe}<a class="pback" href="?role=teacher&tab=me" aria-label="나 탭으로">‹</a>{/if}<b>오늘 할 일</b><button type="button" class="pset" onclick={() => (sheet = 'set')}>설정</button><ModeSwitch dark /></header>
  <section class="ptodo" data-k="todo" aria-label="오늘 할 일">
    <p class="pwho">{fromMe ? '선생님' : me.nick} · {SUBJ.name}</p>
    <ul>
      <li><button type="button" data-todo="gate" onclick={() => tap('gate')}><span class="ck" aria-hidden="true">□</span><span class="tx"><b>{L.no}차시 수업</b><small>{open ? '지금 · 선생님과 함께' : '선생님이 수업을 열면 들어가요'}</small></span>{#if open}<em>지금</em>{/if}</button></li>
      {#if feat('scarecrow')}<li><button type="button" data-todo="scare" onclick={() => tap('scare')}><span class="ck" aria-hidden="true">□</span><span class="tx"><b>복습 (허수아비)</b><small>지난 차시 문제 · 숫자를 바꿔서</small></span></button></li>{/if}
      {#if feat('citadel')}<li><button type="button" data-todo="castle" onclick={() => tap('castle')}><span class="ck" aria-hidden="true">□</span><span class="tx"><b>{visibleCastles().length ? `${visibleCastles().map((f) => `${f.floor}층`).join(' · ')} 평가` : '평가'} (성채 던전)</b><small>방 하나 = 문항 하나</small></span></button></li>{/if}
      {#if feat('author')}<li><button type="button" data-todo="tent" onclick={() => tap('tent')}><span class="ck" aria-hidden="true">□</span><span class="tx"><b>문제 만들기 (출제 공방)</b><small>내가 만든 문제를 친구가 풀어요</small></span></button></li>{/if}
      {#if svNo && !svSent}<li><button type="button" data-todo="survey" onclick={() => (sheet = 'survey')}><span class="ck" aria-hidden="true">□</span><span class="tx"><b>수업 설문 ({svNo}차시)</b><small>3분 · 이름 없이 · +{REWARD.xp} EXP · 💎+{REWARD.gem}</small></span><em>지금</em></button></li>{/if}
      <li><button type="button" data-todo="mail" onclick={() => tap('mail')}><span class="ck" aria-hidden="true">□</span><span class="tx"><b>선생님 소식 (우편함)</b><small>선생님이 보낸 글</small></span></button></li>
    </ul>
  </section>
  {:else}
  <!-- #145 ② 짧은 화면(360 × 640 등): 장면만 비율 그대로 줄여 가운데 · 정보판 · 주요 단추는 늘 같은 자리(겹침 0) -->
  <div class="stagebox" style:--ar={W / H}>
  <div class="stage" role="presentation" bind:this={stageEl} bind:clientWidth={stW} bind:clientHeight={stH} onclick={(e) => { ground(); arm(); void e; }} style:aspect-ratio="{W} / {H}" style:background-image="url({CAMP.bg})">
    <!-- 🏕 새 캠프 (📜 2026-11-18 #71): 성채 · 텐트 · 던전 문 = 배경 · 열림 빛 = 코드 · 텐트 = 누를 때만 반응 그림 · 모닥불 = 그루터기 바닥 + 불꽃 -->
    <img class="obj castle" alt="" src={CAMP.castle.dark} style={propPos(CAMP.castle)} />
    {#if feat('citadel')}<img class="obj castle lit" class:on={castleLit || sheet === 'castle' || !!poked.castle} alt="" src={CAMP.castle.lit} style={propPos(CAMP.castle)} data-k="castle-lit" />{/if}
    <img class="obj gclosed" class:off={open && !trial} alt="" src={CAMP.gateClosed.src} style={propPos(CAMP.gateClosed)} data-k="gate-closed" data-state={open && !trial ? 'open' : prepNos ? 'explore' : 'closed'} />
    {#if !(open && !trial) && prepNos}<i class="gtorch" style="left:{CAMP.gateClosed.torch.left}%;top:{CAMP.gateClosed.torch.top}%" aria-hidden="true"></i><i class="gcrack" style="left:{CAMP.gateClosed.crack.left}%;top:{CAMP.gateClosed.crack.top}%;height:{CAMP.gateClosed.crack.height}%" aria-hidden="true" data-k="gate-explore"></i>{/if}
    <i class="glow gate" class:on={open} class:flash={!!poked.gate} style={zoneStyle('gate')} aria-hidden="true" data-k="gate-glow"></i>
    <i class="sp tentfx" class:on={!!poked.tentdeco} style="{propPos(CAMP.tentFx)};aspect-ratio:{CAMP.tentFx.aspect};{cellBg(CAMP.tentFx.src, CAMP.tentFx.cols, tentF)}" aria-hidden="true"></i>
    <i class="sp fire" style="{propPos(CAMP.fire)};aspect-ratio:{CAMP.fire.aspect};background-image:url({CAMP.fire.src});background-size:{CAMP.fire.cols * 100}% {CAMP.fire.rows * 100}%;background-position:{(fireF % CAMP.fire.cols) / (CAMP.fire.cols - 1) * 100}% {Math.floor(fireF / CAMP.fire.cols) * 100}%"></i>
    <!-- 🏕 (📜 2026-11-17 #10 「반전되는 과정이 어색」): 바깥 = 이동만(걷는 시간 동안) · 안 = 좌우 돌아서기만(0.12초 · 그림 가운데 기준) — 예전엔 한 transform 이라 걷는 내내 몸이 얇아졌다 펴짐 -->
    <span class="hmove" style="left:{CAMP.hero.left}%;bottom:{CAMP.hero.bottom}%;width:{heroGeo(lk).w}px;height:{heroGeo(lk).h}px;transform:translate({((hp.left - SEAT.left) / 100) * stW}px, {(-(hp.bottom - SEAT.bottom) / 100) * stH}px);transition:transform {hp.ms}ms linear"><i class="sp hero" class:walk={hp.pose === 'walk'} data-k="camp-hero" data-pose={hp.pose} data-flip={hp.flip ? '1' : '0'} style="translate:{heroNudge(lk, heroRow(hp.pose)).dx + heroGeo(lk).dx}px {heroNudge(lk, heroRow(hp.pose)).dy + heroGeo(lk).dy - HERO.h + heroGeo(lk).h}px;left:0;bottom:0;width:{heroGeo(lk).w}px;height:{heroGeo(lk).h}px;transform:scaleX({hp.flip ? -1 : 1});transition:transform {TURN}ms ease-out;background-image:url({heroUrl(lk)});background-size:{HERO.cols * 100}% {HERO.rows * 100}%;background-position:{(heroCol / (HERO.cols - 1)) * 100}% {(heroRow(hp.pose) / (HERO.rows - 1)) * 100}%"></i></span>
    <!-- 🏕 B 모닥불 · 숨은 반응 넷 (나무 · 버섯 · 달 · 반딧불) = 반응만 · 보상 없음 -->
    <button type="button" class="hot tentz" data-hot="tentdeco" data-k="rec-go" aria-label={chalN ? `기록 텐트 · 받을 것 ${chalN}` : '기록 텐트'} style={zoneStyle('tent')} onclick={(e) => go('tentdeco', e)}>{@render tag('tentdeco')}</button>
    <button type="button" class="hot" data-hot="fire" aria-label="모닥불" style="{propPos(CAMP.fire)};aspect-ratio:{CAMP.fire.aspect}" onclick={(e) => { poke0('fire', e); const r = fibTap(fibT, Date.now()); fibT = r.taps; if (r.hit) eggGo('e4'); }}></button>
    {#each STUMPS as st, i (i)}<button type="button" class="hot stump" data-hot="stump{i}" aria-label="그루터기" style="left:{st[0]}%;top:{st[1]}%" onclick={(e) => { poke0('fire', e); const r = stumpStep(stumpSeq, i); stumpSeq = r.seq; if (r.hit) eggGo('e5'); }}></button>{/each}
    {#each SHROOMS as m, i (i)}<button type="button" class="hot shroom" data-hot="shroom{i}" aria-label="빛 버섯" style="left:{m[0]}%;top:{m[1]}%" onclick={(e) => { poke0('shroom', e); shroomHit = { ...shroomHit, [i]: true }; if (Object.keys(shroomHit).length >= SHROOMS.length) { shroomHit = {}; eggGo('e6'); } }}></button>{/each}
    {#each [['tree', 'left:1%;top:18%;width:17%;height:26%'], ['tree', 'left:82%;top:16%;width:17%;height:26%'], ['moon', 'left:51%;top:6%;width:10%;height:8%'], ['fly', 'left:60%;top:46%;width:14%;height:9%']] as h, i (i)}<button type="button" class="hot hid" data-hot={h[0]} aria-label="숨은 곳" style={h[1]} onclick={(e) => { poke0(h[0]!, e); if (h[0] === 'moon' && piMinute(eggNow())) eggGo('e3'); }}></button>{/each}
    {#if eggFx}<EggFx kind={eggFx.kind} first={eggFx.first} name={eggFx.name} title={eggFx.title} ondone={() => (eggFx = null)} />{/if}<!-- 🥚 #74 -->
    {#each fxs as f (f.id)}<span class="cfx {f.k}" style="left:{f.x}%;top:{f.y}%" aria-hidden="true">{#each Array(f.k === 'bell' || f.k === 'glow' ? 1 : 6) as _, n (n)}<i style="--n:{n}"></i>{/each}{#if f.k === 'twinkle'}<b>✦</b>{/if}</span>{/each}
    <CampFriends {S} {pupil} enh={me.enh} bind:hiN={cfHi} /><!-- 🔥 모닥불 친구 (📜 2026-11-20) -->
    {#if buddy}<button type="button" class="buddy" style="left:{CAMP_BUDDY.left}%;bottom:{CAMP_BUDDY.bottom}%" aria-label="게시판 던전 같이 하기" data-k="board-buddy" data-real={buddy.real ? '1' : '0'} onclick={(e) => tap('dummy', e)}><span class="bbub" class:real={buddy.real}>{buddy.line}</span><HeroSprite id={buddy.hero} scale={0.8} play /></button>{/if}
    {#each friends.slice(1) as f, i (f.uid)}<span class="friend" style="left:{CAMP_PORTAL.left + 4 - i * 7}%;bottom:{CAMP_PORTAL.bottom - 9}%" in:fly={{ x: 24, duration: RM ? 0 : 400 }} out:fly={{ x: 30, duration: RM ? 0 : 450, opacity: 0 }} data-k="friend"><HeroSprite id={f.hero} scale={0.8} play /></span>{/each}
    {#if friendText && !buddy}<span class="fbub" style="left:{CAMP_PORTAL.left - 3}%;bottom:{CAMP_PORTAL.bottom - 13}%" data-k="friend-bub">{friendText}</span>{/if}

    {#snippet tag(k: string)}
      {@const gOpen = k === 'gate' && open && !trial}
      {@const td = todoN[k]}
      {#if tagOn(k) || gOpen}<span class="tag" class:todo={!!td || gOpen} data-k="tag-{k}"><b>{gOpen ? '입장!' : k === 'gate' && trial ? '다른 차시' : NAME[k]}</b>{#if teach && tTodo[k === 'tentdeco' ? '' : k]}<i class="cnt tc" data-k="tcnt-{k}" title="선생님 할 일">{tTodo[k]}</i>{:else if td}<i class="cnt" data-k="cnt-{k}">{td.n}</i>{/if}</span>{#if td?.gem}<span class="gchip" data-k="gem-{k}">💎+{td.gem}</span>{/if}{/if}
    {/snippet}
    {#each ['castle', 'gate'].filter((k) => k === 'gate' || feat('citadel')) as k (k)}
      <button type="button" class="zone {hl(k)}" class:tp={!!tapN[k]} class:rm={RM} data-zone={k} style={zoneStyle(k)} aria-label={k === 'gate' ? gateText : NAME[k]} onclick={(e) => go(k, e)}>
        {#if tapN[k]}{#key tapN[k]}<span class="tfx" class:rm={RM} style:--tc={TCOL[k] ?? '#ffd25a'} aria-hidden="true" data-k="tap-fx">{#if !RM}{#each [0, 1, 2, 3, 4, 5] as i (i)}<i style:--a="{i * 60 + 15}deg"></i>{/each}{/if}</span>{/key}{/if}
        {@render tag(k)}
      </button>
    {/each}
    {#each CAMP_PROPS.filter((p) => (trial ? p.k === 'dummy' || !p.feat || feat(p.feat) : !p.feat || feat(p.feat)) && !(trial && (p.k === 'mail' || p.k === 'tent'))) as p (p.k)}<!-- 👩‍🏫 #55 체험판 = 📋 게시판(봇 3 · 기록 없음) 보임 -->
      {@const k = p.k}
      <button type="button" class="prop {hl(k)}" style={propPos(p)} aria-label={todo[k] ? `${NAME[k]} · ${todo[k]}` : NAME[k]} data-prop={k} class:pk={!!poked[k]} class:tp={!!tapN[k]} class:rm={RM} onclick={(e) => go(k, e)}>
        <CampProp {p} phase={k === 'dummy' ? portal.phase : 'idle'} hit={!!poked[k]} on={(news[k] ?? 0) > 0} />
        {#if tapN[k]}{#key tapN[k]}<span class="tfx" class:rm={RM} style:--tc={TCOL[k] ?? '#ffd25a'} aria-hidden="true" data-k="tap-fx">{#if !RM}{#each [0, 1, 2, 3, 4, 5] as i (i)}<i style:--a="{i * 60 + 15}deg"></i>{/each}{/if}</span>{/key}{/if}
        {#if k === 'scare' && e7Ready && (eggFx?.kind === 'e7' || eggHave('e7'))}<span class="bandaid" class:flop={eggFx?.kind === 'e7'} aria-hidden="true" data-k="bandaid">🩹</span>{/if}
        {@render tag(k)}
      </button>
    {/each}

    <div class="top">
      {#if pupil}<button type="button" class="back" aria-label="메뉴" onclick={() => (sheet = 'menu')}>‹</button>{:else if fromMe}<a class="back" href="?role=teacher&tab=me" aria-label="나 탭으로">‹</a>{/if}<b class="ttl">내 캠프</b><span class="sp2"></span>
      <!-- 💎 · 📜 알약 (📜 2026-11-20 선생님 「마정석 누르면 … 마정석 구할 수 있는 루트 알려 주는 창」): 💎 = 💎 얻는 길 · 📜 = 📜 얻는 길 · 그림 = 우리 아이콘 글꼴(Dungeon Icons) · 내 용사 = 아래 카드 -->
      <span class="pill tap2" data-k="wallet"><button type="button" class="pv" data-k="wallet-gem" aria-label="마정석 {me.wallet.gem}개 · 얻는 길 보기" onclick={() => { sfx('star', 0.6); sheet = 'earn-gem'; }}><i class="wic" aria-hidden="true">💎</i>{me.wallet.gem.toLocaleString()}</button><i class="psep" aria-hidden="true"></i><button type="button" class="pv" data-k="wallet-scroll" aria-label="서술 조각 {me.wallet.scroll}개 · 얻는 길 보기" onclick={() => { sfx('scroll', 0.6); sheet = 'earn-scroll'; }}><i class="wic" aria-hidden="true">📜</i>{me.wallet.scroll}</button></span>
      <!-- 🏆 #73 위 막대 도전과제 단추 없앰 → ⛺ 기록 텐트 -->
      {#if fromMe0 && !tvMode}<button type="button" class="asstu" class:on={asStu} data-k="as-stu" aria-pressed={asStu} aria-label="학생 화면으로 보기" title="학생 화면으로 보기" onclick={() => { asStu = !asStu; tPanel = ''; }}>{asStu ? '👩‍🏫 교사' : '🧑‍🎓 학생'}</button>{/if}
      <button type="button" class="gear" aria-label="설정" onclick={() => (sheet = 'set')}>⚙</button>
    </div>
    {#if teach}<div class="tchips" role="group" aria-label="반" data-k="t-cls">{#each ['', ...T_CLASSES] as c (c)}<button type="button" class:on={tCls === c} aria-pressed={tCls === c} onclick={() => (tCls = c)}>{c || '전체'}</button>{/each}</div>{/if}
    {#if svBand && svNo && !svSent}<button type="button" class="svband" data-k="sv-band" onclick={() => { svBand = false; sheet = 'survey'; }}>📝 설문이 있어요 · {svNo}차시 · 눌러서 답하기 ›</button>{/if}
    {#if mailToast}<p class="gtoast mail" role="status">{mailToast}</p>{:else if giftToast}<p class="gtoast" role="status">{giftToast}</p>{/if}
    {#if resvSoon}<button type="button" class="resvb" data-k="resv-bell" onclick={() => (sheet = 'dummy')}>🔔 {resvSoon.no}차시 예약 판 {(resvSoon.when ?? 0) > clock.now ? `${Math.max(1, Math.ceil(((resvSoon.when ?? 0) - clock.now) / 60000))}분 전` : '지금 열렸어요'} · 게시판으로</button>{/if}
  </div>
  </div>

  <section class="info">
    {#if svNo && !svSent}<button type="button" class="svbtn" data-k="sv-open" onclick={() => (sheet = 'survey')}><span>📝</span><b>수업 설문 <small>· {svNo}차시 · 3분 · 이름 없이</small></b><em>+{REWARD.xp} EXP · 💎+{REWARD.gem}</em></button>{/if}
    {#if feat('hero')}<button type="button" class="card hero-card" class:awk-shine={awkFx(lk)} onclick={heroTap} aria-label="내 용사 보기">
      <span class="pic"><HeroSprite id={lk} scale={HS} aura={me.enh} play />{#if me.enh}<b class="enh">+{me.enh}</b>{/if}</span>
      <span class="who">
        <span class="nm">{#if ttl}<em class="tt">{ttl.name}</em>{/if}<b class:awk-name={awkFx(lk)}>{fromMe ? '선생님' : me.nick}</b>{#if cfHi && feat('campfire')}<i class="cfhi" data-k="cf-hi" title="모닥불에서 받은 인사">👋 {cfHi}</i>{/if}</span>
        <span class="sub">{hero.job} {hero.name} · {fam.name} · {me.enh ? auraName(me.enh, lk) : '오라 없음'}</span>
        <span class="lv"><b>Lv.{lv.lv}</b> <small>{lv.title}</small><i class="xp"><i style:width="{(lv.into / lv.next) * 100}%"></i></i><small>{lv.into}/{lv.next}</small></span>
      </span>
    </button>
    <div class="ladder" role="group" aria-label="스킬 사다리">
      {#each ladderRows as r (r.id)}
        <button type="button" class="rung {r.state}" onclick={heroTap} aria-label="{TIER_NAMES[r.tier]} {r.name} {r.state === 'equip' ? '장착' : r.state === 'own' ? '가짐' : r.state === 'buy' ? `살 수 있음 💎 ${r.gem}` : `잠김 ${r.why ?? ''}`}">
          <b>{(TIER_NAMES[r.tier] ?? '').split(' ')[0]}{#if r.state === 'lock'}<i class="rlk" aria-hidden="true">🔒</i>{/if}</b>
          <span>{r.name.replace(/^\S+ /, '')}</span>
          <small>{r.state === 'equip' ? '장착' : r.state === 'own' ? '✔' : `💎${r.gem}${r.scroll ? ` 📜${r.scroll}` : ''}`}</small>
          {#if r.state === 'buy'}<i class="bdot" aria-hidden="true"></i>{/if}
        </button>
      {/each}
    </div>
    {#if nextBuy}<button type="button" class="nextbtn" data-k="next-buy" onclick={heroTap}><b>{(TIER_NAMES[nextBuy.tier] ?? '').split(' ')[0]}</b> {nextBuy.name.replace(/^\S+ /, '')} 열기 <span class="nv">💎 {nextBuy.gem}{#if nextBuy.scroll} · 📜 {nextBuy.scroll}{/if}</span><i aria-hidden="true">›</i></button>{:else}<p class="next">{nextLine}</p>{/if}{/if}<!-- 📜 2026-11-20 시안: 살 수 있는 다음 칸 = 테두리 단추 (누르면 내 용사) -->
  </section>
  {/if}
  {#if S.kind !== 'memory' && !trial && pupil}<div class="warl"><WarBar {S} cls={pupil.cls} line /></div>{/if}<!-- ⚔ #51 토벌 주간 한 줄 -->
  <BottomAction dock={false} disabled={!open} why="" onmain={() => tap('gate')} mainLabel={trial ? '⚔ 다른 차시로' : `${L.no}차시 던전 입장`}>
    {#snippet right()}{#if !open}<button type="button" class="side codebtn" data-k="code-btn" onclick={() => { sfx('click', 0.5); sheet = 'gate'; }}>🚪 코드</button>{/if}{/snippet}<!-- 📜 #62 코드 = 입장 단추 옆 같은 줄(입장 넓게 · 코드 좁게 오른쪽 · 높이 같게) -->
    {#snippet main()}{#if !trial && !open}<span class="shut" data-k="gate-shut"><b>🔒 차시 던전</b><small>수업 대기</small></span>{:else}<span>{trial ? '⚔ 다른 차시로' : `${L.no}차시 던전 입장`}</span>{/if}{/snippet}<!-- 📜 2026-11-20 시안: 닫힘 = 「🔒 차시 던전 / 수업 대기」 두 줄 (옛 안내 줄 = 단추 안으로) -->
  </BottomAction>
</div>

{#if awkPop !== null}<AwakenPop hero={awkPop} onclose={() => { markAwkSeen(awkPop!, S); awkPop = null; }} />{/if}
{#if achQ.length}<AchievePop list={achQ} more={achMore} claim={achClaim} ondone={() => { achQ = []; achMore = 0; }} />{/if}<!-- 🏆 #73 -->
{#if castleGo != null}
  <!-- 🏰 성채 던전 (📜 2026-11-14 · 올린 성채 팩 · 방 = 몬스터 한 마리 · 학생 레이드 화면 그대로) -->
  {#await loadCastle() then K}<K.default {S} {me} save={M.save} all={fromMe0 || !!trial} uid={castleWho.uid} num={castleWho.num} cls={castleWho.cls} floor={castleGo} onclose={() => (castleGo = null)} />{/await}
{:else if sheet === 'survey' && svWho && svNo && !svSent}
  <SurveySheet {S} cls={svWho.cls} num={svWho.num} no={svNo} excluded={isExcluded(S, svWho.cls, svWho.num)} onpaid={svPaid} onclose={() => (sheet = null)} />
{:else if sheet === 'fb' || sheet === 'fb-board'}
  {@const fbS = pupil && meBound() ? S : fbLocal()}
  <FeedbackSheet S={fbS} cls={pupil?.cls ?? 'test'} num={pupil?.num ?? 0} pid={pupil?.uid ?? 'me'} trial={!!trial} tab0={sheet === 'fb' ? 'send' : 'board'} onclose={() => (sheet = 'mail')} />
{:else if sheet === 'mail' && mbWho}
  <MailBox {S} uid={mbWho.uid} cls={mbWho.cls} num={mbWho.num} gem={me.wallet.gem} survey={svNo && !svSent ? svNo : 0} onclaim={mailTake} onsurvey={() => (sheet = 'survey')} onfb={() => (sheet = 'fb')} onfbboard={() => (sheet = 'fb-board')} onclose={() => { sheet = null; mbSeen = mailSeenGet(mbWho.cls, mbWho.num, S); mbVer++; }} />
{:else if sheet === 'castle'}
  <!-- 🏰 성채 시트 = 올린 성채 팩 중 보이는 층 (층 순서 · 📜 2026-11-14) · 층을 누르면 그 층 방 목록 -->
  <Sheet onclose={() => (sheet = null)} mainText={visibleCastles().length ? '🏰 성채 들어가기' : '닫기'} onmain={visibleCastles().length ? () => { castleGo = visibleCastles().length === 1 ? visibleCastles()[0]!.id : ''; sheet = null; } : undefined}>
    {#snippet title()}🏰 성채 던전{/snippet}
    {#each visibleCastles() as f (f.id)}<button type="button" class="floor" data-floor={f.id} onclick={() => { castleGo = f.id; sheet = null; }}><span class="no">{f.floor}</span><span><b>{floorName(f)}</b><span>방 {f.rooms.length}개 · 열림 {spanOf(f)}</span></span></button>{:else}<div class="empty"><span class="ic" aria-hidden="true">🏰</span><p>아직 열린 층이 없어요 · 선생님이 성채 팩을 올리면 열려요</p></div>{/each}
  </Sheet>
{:else if sheet === 'menu'}
  <!-- ‹ 메뉴 (#172 · 정식 「◀ 메뉴화면」 자리 · ui-senior TopBar = 왼쪽 위 ‹) — 내 캠프 · 교사 폰 · 교실 TV · 로그아웃 -->
  <Sheet onclose={() => (sheet = null)} mainText="🏕 내 캠프로">
    {#snippet title()}메뉴{/snippet}
    <div class="menu">
      <a class="mi" href="?role=teacher"><span>📱</span><b>교사 폰</b><small>수업 열기 · 리모컨</small></a>
      <a class="mi" href="?role=hall"><span>🖥</span><b>교실 TV</b><small>종합실 · 교사 캠프</small></a>
      <button type="button" class="mi" disabled={open} onclick={() => (sheet = 'out')}><span>🚪</span><b>처음 화면으로</b><small>{open ? '수업 중엔 못 나가요 · 수업이 끝나면' : pupil ? `${pupil.cls}반 ${pupil.num}번 · 기록은 그대로` : '로그인 화면으로'}</small></button>
    </div>
  </Sheet>
{:else if sheet === 'set'}
  <Sheet onclose={() => (sheet = null)} mainText="다 했어요">
    {#snippet title()}⚙ 설정{/snippet}
    {#if feat('theme')}<span class="slab">🎨 테마</span>
    <ThemePicker now={theme} {feats} onpick={pickTheme} paper sub />{:else}<span class="slab">🎨 테마</span>
    <ThemePicker now={theme} feats={null} basic onpick={pickTheme} paper sub />{/if}
    <span class="slab">🔊 소리</span>
    <SoundToggles />
    {#if pupil && meBound()}{@const off = !!S.get(`accounts/${pupil.cls}/${pupil.num}/feedOff`)}
      <!-- 📣 게시판 「최근 전투」에 내 판 공개 (📜 DECISIONS 2026-11-14 · 기본 켬 · 꺼도 내 기록 · 랭킹은 남음) -->
      <span class="slab">📋 게시판 던전</span>
      <button type="button" class="fsw" class:on={!off} role="switch" aria-checked={!off} data-k="feed-switch" onclick={() => { S.set(`accounts/${pupil.cls}/${pupil.num}/feedOff`, off ? null : true); feedTick++; }}>{#key feedTick}<span>📣</span><b>내 전투 결과 공개</b><span class="st">{off ? '꺼짐' : '켜짐'}</span><i class="kn" aria-hidden="true"></i>{/key}</button>
      <small class="fnote">익명(반 · 용사)으로 「최근 전투」에 한 줄 · 꺼도 내 기록 · 랭킹은 남아요</small>
    {/if}
    <!-- 🛠 #136 개선단(의견 보내기 · 게시판) = 📮 우편함 맨 위로 옮김 (선생님 2026-11-22) -->
    {#if pupil}<button type="button" class="out" data-k="pw-open" onclick={() => { pwCur = ''; pwNew = ''; pwNew2 = ''; pwMsg = ''; sheet = 'pw'; }}>🔑 비밀번호 바꾸기</button>{/if}
    <!-- ↪ #171 로그아웃 = 첫 화면(반 · 번호 · 「교사 · 종합실 ›」)으로 · 이 폰의 로그인 기억 지움 · 시험 서버 로그인도 끝냄 -->
    <button type="button" class="out" disabled={open} onclick={() => (sheet = 'out')}>🚪 처음 화면으로 <small>{open ? '수업 중엔 못 나가요' : pupil ? `${pupil.cls}반 ${pupil.num}번` : ''}</small></button>
    <p class="build">판 {BUILD}{REV ? ` · ${REV}` : ""}{(S as Store & { auth?: unknown }).auth ? (BETA ? ' · 시험 서버' : ' · 서버') : ' · 이 기기'}</p>
    {#if showCredit}<p class="build" data-k="credit">만든 이 · {CREDIT_NAME}</p>{/if}
  </Sheet>
{:else if sheet === 'pw' && pupil}
  <!-- 🔑 비밀번호 바꾸기 (📜 2026-11-16 · 학생 스스로 · 잊었으면 선생님 🔑 0000) -->
  <Sheet onclose={() => (sheet = 'set')} mainText={pwBusy ? '바꾸는 중…' : '바꾸기'} mainDisabled={pwBusy || pwCur.length !== 4 || pwNew.length !== 4 || pwNew2.length !== 4} why={pwNew && pwNew2 && pwNew !== pwNew2 ? '새 비밀번호 두 번이 달라요' : ''} onmain={pwGo}>
    {#snippet title()}🔑 비밀번호 바꾸기{/snippet}
    <label class="pwl">지금 비밀번호<input class="pwi" data-k="pw-cur" type="password" inputmode="numeric" maxlength="4" autocomplete="current-password" bind:value={pwCur} /></label>
    <label class="pwl">새 비밀번호 (숫자 4자리)<input class="pwi" data-k="pw-new" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" bind:value={pwNew} /></label>
    <label class="pwl">새 비밀번호 한 번 더<input class="pwi" data-k="pw-new2" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" bind:value={pwNew2} /></label>
    {#if pwMsg}<p class="pwm" role="alert" data-k="pw-msg">{pwMsg}</p>{/if}
    <p class="outq">잊었으면 선생님께 「0000 으로 바꿔 주세요」라고 말해요</p>
  </Sheet>
{:else if sheet === 'out'}
  <!-- 🚪 처음 화면으로 (📜 2026-11-13 밤 · 로그아웃 = 로그인 정보만 지움 · 이 기기 테스트 · 체험 저장은 그대로) -->
  <Sheet onclose={() => (sheet = null)} mainText="🚪 처음 화면으로" onmain={logout}>
    {#snippet title()}처음 화면으로 갈까요?{/snippet}
    <p class="outq">다른 반 · 번호로 다시 들어가요 · 내 기록 · 💎 는 그대로예요</p>
  </Sheet>
{:else if sheet === 'anvil'}
  <!-- ⚒ 모루 (#148 · 정식 모루 그대로 · 캠프 모루에서만) -->
  <Anvil {me} save={M.save} reach={pupil ? doneNo(S, pupil.cls) : 0} who={pupil ? `${pupil.cls.replace(/[.#$/[\]]/g, '_')}-${pupil.num}` : 'me'} onclose={() => (sheet = null)} />
{:else if sheet === 'chal' || sheet === 'rec'}
  <!-- ⛺ #73 텐트 = 🏆 나의 기록 방 (도전과제 · 칭호 · 도감) -->
  {#snippet eggTab()}
    {@const hl = pupil ? Number(S.get(`school/eggHint/${pupil.cls}`)) || 0 : 0}
    {@const got = EGGS.filter((e) => eggHave(e.id)).length}
    <p class="eggcap" data-k="egg-cnt">🥚 찾은 비밀 <b>{got}</b> / {EGGS.length} · 보상 = 칭호만</p>
    <div class="eggs" data-k="egg-book">
      {#each EGGS as e (e.id)}
        {@const ok = eggHave(e.id)}
        <div class="egg" class:ok data-egg={e.id}><span class="eic" aria-hidden="true">{ok ? e.ic : '🥚'}</span><span class="etx"><b>{ok ? e.name : '???'}</b><small>{ok ? `칭호 「${titleOf(e.title)?.name ?? ''}」 · ${e.how}` : eggHint(e, hl)}</small></span></div>
      {/each}
    </div>
  {/snippet}
  <RecordRoom extra={[{ id: 'egg', label: '🥚 비밀', body: eggTab }]} {me} ctx={chalCtx} claim={chalClaim} earned={recEarned()} symSeen={(() => { try { return symN(chalCtx()); } catch { return 0; } })()} onanvil={() => (sheet = 'anvil')} onclose={() => (sheet = null)} />
{:else if sheet === 'prep'}
  {#await loadPrep() then K}<K.default {S} {me} uid={pupil?.uid ?? 'me'} num={pupil?.num ?? 0} cls={pupil?.cls ?? ''} all={prepAll} onclose={() => (sheet = null)} />{/await}
{:else if sheet === 'review'}
  <!-- 🎯 허수아비 = 혼자 복습 (📜 2026-11-13 밤 쪼갬 · #66 배움터 안 「복습하기」) -->
  {#await loadDummy() then K}<K.default {S} {me} save={M.save} uid={pupil?.uid ?? 'me'} num={pupil?.num ?? 0} cls={pupil?.cls ?? ''} onclose={() => (sheet = null)} onforge={() => (sheet = 'anvil')} />{/await}
{:else if sheet === 'dummy' && trial}
  <!-- 👩‍🏫 #55 체험판 게시판 던전 = 봇 3 · 서버 안 닿음 · 기록 없음 -->
  <!-- 📜 #66-8 체험판도 같은 게시판 화면(탭 · 지도 · 차시 카드) · 「⚔ n차시 혼자 도전」 = 봇 3 · 기록 없음 · 팀 모집 · 기사단 없음 -->
  {#await loadBoard() then K}<K.default {S} {me} save={M.save} uid="me" num={0} cls="" open={false} trial={{ ids: atbTrialIds(trial.packs ?? []), onsolo: (L) => (trialRun = L) }} onclose={() => (sheet = null)} />{/await}
  {#if trialRun}{#await loadAtbTrial() then K}<K.default packs={trial.packs ?? []} hero={me.hero} xp={me.xp} enh={me.enh} fx0={me.socket?.[me.hero] ?? ''} nick={trial.nick} start={trialRun} onclose={() => (trialRun = null)} />{/await}{/if}
{:else if sheet === 'dummy'}
  <!-- 📋 게시판 던전 (#143 · 허수아비 자리 · 허수아비 화면은 없앰) -->
  {#await loadBoard() then K}<K.default {S} {me} save={M.save} uid={pupil?.uid ?? 'me'} num={pupil?.num ?? 0} cls={pupil?.cls ?? ''} {open} joinPid={boardJoin} onquest={feat('author') ? () => { questTab = 'mine'; sheet = 'tent'; } : undefined} onclose={() => { sheet = null; boardJoin = ''; }} />{/await}
{:else if sheet === 'tent' && feat('author')}
  <!-- ✏ #75 출제 공방 (책상) -->
  {#await loadQuest() then K}<K.default {S} {me} cls={pupil?.cls ?? ''} num={pupil?.num ?? 0} uid={pupil?.uid ?? 'me'} test={me.test || !pupil} tab={questTab} claim={chalClaim} onclose={() => { sheet = null; questTab = 'up'; }} />{/await}
{:else if sheet === 'earn-gem' || sheet === 'earn-scroll'}
  <EarnSheet kind={sheet === 'earn-gem' ? 'gem' : 'scroll'} have={sheet === 'earn-gem' ? me.wallet.gem : me.wallet.scroll} today={Number(me.wallet.day?.[kstDay(Date.now())]) || 0} dots={earnDots} off={earnOff} onpick={(go) => { sfx(SND[go] ?? 'click', 0.6); sheet = null; tap(go); }} onclose={() => { sfx('click', 0.4); sheet = null; }} />
{:else if sheet === 'hero'}
  <MyHero {me} persist={M.save} onclose={() => (sheet = null)} teacher={fromMe0} onreset={fromMe0 ? M.reset : undefined} vS={pupil && meBound() ? S : fbLocal()} vPid={pupil?.uid ?? 'me'} vTrial={!!trial} />
{:else if sheet}
  <Sheet onclose={() => (sheet = null)} mainText="닫기">
    {#snippet title()}{sheet === 'gate' ? '차시 던전' : NAME[sheet ?? '']}{/snippet}
    {#if sheet === 'gate'}
      <!-- 🚪 코드로 들어가기 (#138 · 정식 camp.js codeGate 그대로: 수업 코드 6자리 → 던전 대기실) -->
      <p class="cg">아직 문이 닫혀 있어요. 선생님이 알려 준 <b>수업 코드 6자리</b>를 넣으면 던전 대기실로 넘어가요.</p>
      <input class="cin" inputmode="numeric" maxlength="6" placeholder="6자리" autocomplete="off" aria-label="수업 코드 6자리" bind:value={codeIn} oninput={() => (codeErr = '')} />
      {#if codeErr}<p class="cerr" role="alert">{codeErr}</p>{/if}
      <button type="button" class="cgo" onclick={enterCode}>⚔ 던전으로</button>
      {#if prepNos}<button type="button" class="prepln" data-k="gate-prep" onclick={prepGo}>🔥 {prepNos}차시 탐사(예습)<small>연습용 · 보상 없어요</small></button>{/if}<!-- 🔥 #71 예습 입구 = 던전 문 창 한 줄 (임시 · 예습 자리 컨펌 #69 전) -->
    {:else if sheet === 'mail'}
      <!-- 🛠 #136 서버 학생이 아닐 때(🧪 테스트 · 이 기기) = 소식 없이 개선단 두 줄만 (테스트 = 이 기기 저장 · 같은 화면) -->
      <button type="button" class="out" data-k="fb-open" onclick={() => (sheet = 'fb')}>💬 의견 보내기 <small>버그 · 새 기능 · 그림 · 난이도</small></button>
      <button type="button" class="out" data-k="fb-board-open" onclick={() => (sheet = 'fb-board')}>🛠 개선단 게시판 <small>친구 의견에 👍</small></button>
      <div class="empty"><span class="ic" aria-hidden="true">📮</span><p>선생님 소식은 반 계정으로 들어오면 여기에 와요</p></div>
    {:else}
    <div class="empty"><span class="ic" aria-hidden="true">{sheet === 'gate' ? '🌀' : sheet === 'dummy' ? '🎯' : sheet === 'mail' ? '📮' : sheet === 'tent' ? '✏' : sheet === 'anvil' ? '⚒' : '🧙'}</span>
      <p>{sheet === 'gate' ? '지금은 닫혀 있어요 · 선생님이 수업을 열면 빛이 들어와요' : '다음 판에서 열려요'}</p></div>
    {/if}
  </Sheet>
{/if}

{#if stuNews.length && !sheet && !(hero0 && !me.seen['hero0'])}
  <Sheet onclose={stuNewsOk} mainText="알았어요" onmain={stuNewsOk}>
    {#snippet title()}🆕 새 소식{/snippet}
    <ul class="snews" data-k="stu-news">{#each stuNews as t, i (i)}<li>{t}</li>{/each}</ul>
  </Sheet>
{/if}
{#if hero0 && !me.seen['hero0'] && !fromMe0}<FirstHero {me} persist={M.save} ondone={() => { hero0 = false; try { sessionStorage.removeItem('citadel-hero0'); } catch { /* 무시 */ } }} />{/if}

{#if teach && sheet && T_SHEET[sheet] && !tPanel}<button type="button" class="tpbtn" data-k="t-panel" onclick={() => (tPanel = T_SHEET[sheet ?? ''] ?? '')}>👩‍🏫 선생님 칸{#if tTodo[T_SHEET[sheet] ?? '']}<i>{tTodo[T_SHEET[sheet] ?? '']}</i>{/if}</button>{/if}
{#if teach && tPanel}<TeacherPanel {S} kind={tPanel} cls={tCls} onclose={() => (tPanel = '')} />{/if}

<style>
  /* 👩‍🏫 #80 교사 캠프 */
  .cnt.tc { background: var(--accent); color: var(--on-accent, #1d1406); }
  .asstu { min-height: 36px; padding: 0 10px; border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.35); background: rgba(8, 9, 12, 0.55); color: #fff; font: 700 12px var(--font); white-space: nowrap; }
  .asstu.on { background: var(--accent); color: var(--on-accent, #1d1406); border-color: var(--accent); }
  .tchips { position: absolute; top: var(--bar-top); left: 0; right: 0; z-index: 9; display: flex; gap: 6px; overflow-x: auto; padding: 2px 12px 0; }
  .tchips button { flex: none; min-height: 32px; padding: 0 12px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(8, 9, 12, 0.55); color: #fff; font: 700 13px var(--font); }
  .tchips button.on { background: var(--accent); color: var(--on-accent, #1d1406); border-color: var(--accent); }
  .tpbtn { position: fixed; right: max(12px, calc(50% - 203px)); bottom: calc(env(safe-area-inset-bottom, 0px) + 156px); z-index: 44; /* 🐞 #66-6 제목(맨 위) 덮지 않게 = 오른쪽 아래 · 아래 단추 위 */ min-height: 44px; padding: 0 14px; border-radius: 22px; border: 0; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 14px var(--font); box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 55%, #000), 0 6px 16px rgba(0, 0, 0, 0.45); }
  .tpbtn i { margin-left: 6px; font-style: normal; padding: 0 6px; border-radius: 9px; background: var(--bad); color: #fff; font-size: 12px; }
  /* 📝 제출 모드 v2 ⑦ 오늘 할 일 */
  .camp.paper { background: transparent; }
  .ptop { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 8px; min-height: 56px; padding: 0 12px; background: #f7f6f1; border-bottom: 1.5px solid #1d1d1f; }
  .ptop b { flex: 1; min-width: 0; font: 700 18px var(--serif); color: #1d1d1f; }
  .pback { min-width: 44px; min-height: 44px; display: grid; place-items: center; border: 0; background: none; color: #1d1d1f; font: 700 24px var(--font); text-decoration: none; }
  .pset { min-height: 32px; padding: 0 10px; border: 1px solid #1d1d1f; border-radius: 4px; background: #fff; color: #1d1d1f; font: 700 13px var(--font); }
  .ptodo { flex: 1; padding: 12px 16px 16px; }
  .pwho { margin: 4px 0 10px; font: 500 14px var(--font); color: #4a4a4f; }
  .ptodo ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .ptodo li button { width: 100%; min-height: 52px; display: flex; align-items: center; gap: 10px; padding: 6px 2px; border: 0; border-bottom: 1px solid #c9c6bc; background: none; color: #1d1d1f; text-align: left; font: inherit; cursor: pointer; }
  .ptodo .ck { flex: none; font: 400 22px var(--serif); color: #1d1d1f; width: 22px; }
  .ptodo .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .ptodo .tx b { font: 700 16px var(--serif); } .ptodo .tx small { font-size: 13px; color: #6d6d73; }
  .ptodo em { font-style: normal; font: 700 13px var(--font); color: #c8312b; border: 1.5px solid #c8312b; border-radius: 3px; padding: 1px 6px; }
  /* 📋 게시판 던전 = 파란 포털 빛 (게시판 그림이 오기 전 자리 · 평소 불씨) */
  .outq { margin: 0; font-size: 16px; color: var(--text-2); }
  .out:disabled, .mi:disabled { opacity: 0.45; }
  .back { flex: none; width: 40px; height: var(--tap); margin-left: -8px; border: 0; background: none; color: #fff; font-size: 30px; line-height: 1; text-shadow: 0 1px 2px #000; cursor: pointer; display: grid; place-items: center; text-decoration: none; }
  .menu { display: flex; flex-direction: column; gap: var(--s2); }
  .mi { display: grid; grid-template-columns: 40px 1fr; grid-template-rows: auto auto; align-items: center; column-gap: var(--s2); min-height: 56px; padding: var(--s2) var(--s3); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); text-decoration: none; font: inherit; text-align: left; }
  .mi span { grid-row: span 2; font-size: 24px; text-align: center; } .mi b { font-size: 16px; } .mi small { color: var(--text-3); font-size: 13px; }
  .build { margin: var(--s2) 0 0; text-align: center; font-size: 13px; color: var(--text-3); }
  .out { margin-top: var(--s3); min-height: var(--tap); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); display: flex; align-items: center; justify-content: center; gap: var(--s2); }
  .out small { color: var(--text-3); font-weight: 500; }
  .codebtn { width: 128px; padding: 0 var(--s2); font-size: 18px !important; flex-direction: row !important; gap: 4px !important; background: var(--surface) !important; }
  .cg { margin: 0; font-size: 15px; line-height: 1.5; color: var(--text-2); } .cg b { color: var(--text); }
  .cin { width: 100%; box-sizing: border-box; height: 56px; border-radius: var(--r); border: 2px solid var(--line); background: var(--bg); color: var(--text); font: 700 26px var(--font); letter-spacing: 6px; text-align: center; }
  .cin:focus { border-color: var(--accent); outline: none; }
  .cerr { margin: 0; color: var(--bad); font-size: 14px; font-weight: 700; }
  .cgo { min-height: 52px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font: 700 17px var(--font); box-shadow: 0 3px 0 var(--accent-sh); }
  .camp { max-width: 430px; margin: 0 auto; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
  /* 🐞 b206 (📜 2026-11-15 선생님 「클래식 모드 내 캠프 테두리 · 밑에 네모칸 크기 · 태블릿도」): 캠프 바탕 = 캠프 폭 그대로(클래식의 430 기둥 바탕이 태블릿 640~720 캠프와 어긋나던 것)
     낮은 폰(브라우저 주소창 · 640 높이 안팎) = 장면이 좁은 기둥으로 줄며 위 막대(💎 · ⚙)가 잘리던 것 → 장면은 폭 그대로 · 모자라면 캠프만 세로 스크롤 */
  .camp:not(.paper) { background: var(--bg); }
  @media (max-width: 699px), (orientation: landscape) and (max-width: 899px) { .camp:not(.paper) { overflow-y: auto; overscroll-behavior: contain; padding-bottom: env(safe-area-inset-bottom); } .camp:not(.paper) .stagebox { min-height: calc(min(100vw, 330px) / var(--ar)); } /* 330 = 위 막대(‹ · 제목 · 💎 📜 · ⚙)가 다 들어가는 폭 */ }
  .stagebox { flex: 1 1 auto; min-height: 0; container-type: size; display: flex; justify-content: center; align-items: flex-start; }
  /* 📜 #62 (2026-11-18 선생님 캡처): 장면 좌우 끝 = 아래 카드 줄과 같은 선(양옆 16) · 비율 · 물건 자리 그대로 · 모자라는 높이는 캠프 세로 스크롤 (가로 PC = 장면 | 카드 두 칸이라 그대로) */
  @media not ((min-width: 900px) and (orientation: landscape)) { .camp:not(.paper) { overflow-y: auto; overscroll-behavior: contain; } .camp:not(.paper) .stagebox { flex: none; min-height: 0; container-type: inline-size; padding: 0; } /* 📜 2026-11-20 시안 「꽉 찬 화면」 = 폰 양끝까지 */ .camp:not(.paper) .stage { width: 100%; } .camp:not(.paper) > :global(.act) { margin-top: auto; position: sticky; bottom: 0; z-index: 6; } } /* 🐞 짧은 화면(360 × 640): 장면 · 정보판은 스크롤 · 주요 단추는 늘 아래에 보이게 (#151 · #62 뒤 단추가 화면 밖으로 밀렸음) */
  .camp > :global(.act) { flex: none; }
  .info { flex: none; }
  .stage { position: relative; width: min(100cqw, 100cqh * var(--ar)); flex: none; background-size: 100% 100%; overflow: hidden; }
  .stage::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 40px; background: linear-gradient(transparent, var(--bg)); pointer-events: none; z-index: 4; }
  .obj { position: absolute; z-index: 1; pointer-events: none; }
  /* 🏕 #71 빛: 성채 열림 = 둘레 금빛 빛무리 · 던전 문 열림 = 아치 안 파란 빛 맥박 (그림 전 임시 · transform · opacity 만) */
  .glow { position: absolute; z-index: 1; pointer-events: none; border-radius: 50%; opacity: 0; transition: opacity 0.6s; }
  .obj.castle { display: block; }
  .obj.castle.lit { opacity: 0; transition: opacity 0.5s; }
  .obj.castle.lit.on { opacity: 1; }
  .obj.gclosed { display: block; transition: opacity 0.8s; }
  .obj.gclosed.off { opacity: 0; }
  /* 🔥 탐사 가능 = 닫힌 문 + 횃불 크게 일렁 + 문틈 주황 빛 (#71 덧 · 머리 시안) */
  .gtorch { position: absolute; z-index: 1; width: 17%; mix-blend-mode: screen; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; pointer-events: none; background: radial-gradient(closest-side, rgba(255, 200, 90, 0.95), rgba(255, 130, 30, 0.45) 45%, transparent); animation: torchF 0.7s ease-in-out infinite alternate; }
  .gcrack { position: absolute; z-index: 1; width: 1.1%; mix-blend-mode: screen; transform: translateX(-50%); pointer-events: none; border-radius: 2px; background: linear-gradient(rgba(255, 170, 60, 0), rgba(255, 170, 60, 0.95) 30%, rgba(255, 140, 40, 0.9) 70%, rgba(255, 140, 40, 0)); box-shadow: 0 0 14px 7px rgba(255, 140, 40, 0.7), 0 0 34px 14px rgba(255, 120, 30, 0.35); animation: torchF 1.4s ease-in-out infinite alternate; }
  @keyframes torchF { 0% { opacity: 0.65; transform: translate(-50%, -50%) scale(0.92); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); } }
  .glow.gate { background: radial-gradient(closest-side, rgba(130, 200, 255, 0.55), rgba(90, 150, 255, 0.2) 55%, transparent); }
  .glow.gate.on { opacity: 1; animation: glowB 1.8s ease-in-out infinite; }
  .glow.gate.flash { opacity: 1; animation: pkFlash 0.6s ease-out; }
  @keyframes glowB { 50% { opacity: 0.55; transform: scale(1.06); } }
  .eggcap { margin: 0; font-size: 13px; color: var(--text-2); }
  .eggs { display: grid; grid-template-columns: 1fr; gap: 6px; }
  .egg { display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 6px 10px; border-radius: 12px; background: var(--surface); border: 1px dashed var(--line, #3a3f4c); }
  .egg.ok { border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--surface)); }
  .eic { font-size: 24px; width: 30px; text-align: center; } .etx { display: flex; flex-direction: column; gap: 2px; min-width: 0; } .etx b { font-size: 15px; } .etx small { font-size: 12px; color: var(--text-2); }
  .hot.stump { width: 8%; height: 6%; min-width: 0; min-height: 0; transform: translate(-50%, -50%); z-index: 5; }
  .hot.shroom { width: 7%; height: 5%; min-width: 0; min-height: 0; transform: translate(-50%, -50%); }
  .bandaid { position: absolute; left: 22%; top: 8%; font-size: clamp(12px, 3.6cqw, 22px); pointer-events: none; transform: rotate(-20deg); }
  .bandaid.flop { animation: flop 0.6s 0.2s cubic-bezier(0.3, 1.4, 0.5, 1) both; }
  @keyframes flop { from { transform: rotate(-20deg) scale(0); } to { transform: rotate(-20deg) scale(1); } }
  .tentfx { position: absolute; z-index: 1; pointer-events: none; display: block; background-repeat: no-repeat; opacity: 0; }
  .tentfx.on { opacity: 1; }
  .prepln { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; min-height: 56px; margin-top: var(--s3); border-radius: 12px; border: 1px solid var(--line, #3a3f4c); background: var(--surface-2); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .prepln small { font: 500 13px var(--font); color: var(--text-2); }
  .prepln:active { transform: translateY(2px); box-shadow: none; }
  .sp { position: absolute; z-index: 2; display: block; background-repeat: no-repeat; image-rendering: pixelated; pointer-events: none; }
  .fire { filter: drop-shadow(0 0 18px #ff9a2a); }
  .zone { position: absolute; z-index: 5; background: none; border: 0; padding: 0; }
  .prop { position: absolute; z-index: 5; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
  .prop:active :global(.img) { transform: scale(1.06); } /* 누른 느낌 = 물건이 살짝 커졌다 돌아옴 (0.12초 · 파란 네모 대신) */
  /* 🏷 #72 이름표 = 물건 아래 작은 둥근 띠 · 글씨 정가운데 · 반투명 어두운 바탕 · 할 일 = 금빛 테두리 + 빨간 숫자 배지 · 💎 칩 = 바로 아래 */
  .tag { position: absolute; left: 50%; bottom: 0; transform: translate(-50%, 100%); z-index: 5; min-width: 52px; height: 24px; padding: 0 10px; box-sizing: border-box; border-radius: 12px; display: flex; align-items: center; justify-content: center; white-space: nowrap; background: rgba(12, 14, 20, 0.62); border: 1px solid rgba(255, 255, 255, 0.14); color: #f2f3f5; font: 700 13px/1 var(--font); text-align: center; pointer-events: none; }
  .tag b { font: inherit; line-height: 1; }
  .tag.todo { border: 2px solid var(--accent); color: #ffe7b0; box-shadow: 0 0 10px rgba(245, 184, 74, 0.45); }
  .cnt { position: absolute; right: -8px; top: -9px; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; background: var(--bad); color: #fff; font: 800 11px/18px var(--font); font-style: normal; text-align: center; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
  .gchip { position: absolute; left: 50%; bottom: 0; transform: translate(-50%, calc(100% + 26px)); z-index: 5; height: 18px; padding: 0 7px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(40, 30, 6, 0.8); border: 1px solid var(--accent); color: #ffd98a; font: 800 11px/1 var(--font); white-space: nowrap; pointer-events: none; }
  .zone .tag { bottom: 4px; transform: translate(-50%, 0); }
  .zone .gchip { transform: translate(-50%, 0); bottom: -22px; }
  .zone::before, .prop::before { content: ''; position: absolute; inset: -8px; } /* 🏷 #72 누르는 곳 = 그림 상자 + 여유 8px + 이름표 */
  .gtoast.mail { border-color: var(--accent); }
  .gtoast { position: absolute; top: 60px; left: var(--s4); right: var(--s4); z-index: 7; margin: 0; padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--gem); color: var(--text); font-weight: 700; text-align: center; }
  .top { position: absolute; top: 0; left: 0; right: 0; z-index: 9; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s4); }
  .ttl { color: #fff; font-size: var(--fs-title); text-shadow: 0 1px 2px #000, 0 0 6px rgba(0, 0, 0, 0.8); white-space: nowrap; flex: none; }
  .sp2 { flex: 1; }
  .gear { width: 40px; height: 40px; margin: 0 -4px 0 0; position: relative; border: 0; border-radius: 20px; background: rgba(8, 9, 12, 0.55); color: #fff; font-size: 18px; display: grid; place-items: center; }
  .gear::before { content: ''; position: absolute; inset: -4px; }
  .slab { font-size: var(--fs-small); font-weight: 700; color: var(--text-2); }
  .pill { display: flex; align-items: center; gap: var(--s1); height: 32px; padding: 0 10px; border-radius: 16px; background: rgba(8, 9, 12, 0.55); color: #fff; font-size: var(--fs-small); font-weight: 700; font-variant-numeric: tabular-nums; }
  .info { padding: var(--s2) var(--s4) 0; display: flex; flex-direction: column; gap: var(--s3); }
  /* 💎 · 📜 = 누를 수 있는 알약 (테두리 · › · 칼각 그림자 · 눌림) */
  .pill.tap { border: 1px solid rgba(255, 255, 255, 0.35); font-family: var(--font); gap: 6px; padding: 0 8px 0 10px; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.6); cursor: pointer; position: relative; }
  .pill.tap::before { content: ''; position: absolute; inset: -8px -2px; }
  .pill.tap:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  .pill.tap:disabled { cursor: default; box-shadow: none; }
  .pv { display: flex; align-items: center; gap: var(--s1); }
  /* 💎 · 📜 = 두 단추 한 알약 (📜 2026-11-20 얻는 길) · 그림 = Dungeon Icons 글꼴 */
  .pill.tap2 { padding: 0 4px; border: 1px solid rgba(255, 255, 255, 0.35); box-shadow: 0 2px 0 rgba(0, 0, 0, 0.6); }
  .tap2 .pv { position: relative; height: 100%; padding: 0 8px; border: 0; background: none; color: #fff; font: 700 var(--fs-small) var(--font); font-variant-numeric: tabular-nums; cursor: pointer; }
  .tap2 .pv::before { content: ''; position: absolute; inset: -8px 0; }
  .tap2 .pv:active { transform: translateY(2px); }
  .wic { font-style: normal; font-size: 16px; line-height: 1; font-family: var(--font); }
  .psep { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.3); }
  .chev { font-size: 16px; line-height: 1; color: rgba(255, 255, 255, 0.8); margin-left: -1px; }
  /* 이름표가 그림 밖으로 잘리지 않게: 차시 던전(오른쪽 끝) = 오른쪽에 붙임 · 모루(아래 끝) = 오른쪽 옆 */
  .zone[data-zone='gate'] .tag { left: 50%; right: auto; bottom: 4px; top: auto; transform: translate(-50%, 0); } /* 📜 2026-11-20 시안 = 던전 문 이름표 문 아래 (옛 #71 = 아치 위) */
  .prop[data-prop='anvil'] .tag { left: 100%; top: 50%; bottom: auto; transform: translate(2px, -50%); }
  /* 📐 태블릿 · PC (📜 2026-11-15 선생님 「태블릿 모드 비율 조정 · 스마트폰은 잘 나와」): 폰은 그대로
     세로 태블릿 = 기둥 640 · 가로(≥ 900) = 왼쪽 장면(화면 높이 가득 · 비율 유지) + 오른쪽 카드 · 단추 400 */
  @media (min-width: 700px) and (orientation: portrait) { .camp:not(.paper) { max-width: max(430px, min(720px, calc((100dvh - 400px) * var(--ar)))); } } /* 장면 + 카드 · 단추(약 400)가 한 화면에 꼭 차게 */
  @media (min-width: 900px) and (orientation: landscape) {
    .camp:not(.paper) { max-width: 1280px; display: grid; grid-template-columns: minmax(0, 1fr) 400px; grid-template-rows: minmax(0, 1fr) auto; column-gap: var(--s5); padding: 0 var(--s5); box-sizing: border-box; }
    .camp:not(.paper) .stagebox { grid-column: 1; grid-row: 1 / span 2; align-items: center; }
    .camp:not(.paper) .info { grid-column: 2; grid-row: 1; align-self: end; padding: 0; }
    .camp:not(.paper) > :global(.act) { grid-column: 2; grid-row: 2; padding-left: 0; padding-right: 0; }
  }
  .card { display: flex; gap: var(--s3); align-items: center; text-align: left; padding: var(--s3); border-radius: 14px; border: 0; background: var(--surface); color: var(--text); font-family: var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .card:active { transform: translateY(2px); box-shadow: none; }
  .pic { position: relative; flex: none; display: grid; place-items: center; width: 96px; height: 80px; }
  .hsp { display: block; image-rendering: pixelated; background-repeat: no-repeat; }
  .enh { position: absolute; right: 0; top: 0; padding: 0 6px; border-radius: 10px; background: var(--accent); color: var(--on-accent); font-size: var(--fs-small); }
  .who { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .nm { display: flex; gap: var(--s1); align-items: baseline; flex-wrap: wrap; }
  .nm b { font-size: 17px; }
  .tt { font-style: normal; font-size: var(--fs-small); color: var(--accent); }
  .sub { font-size: var(--fs-small); color: var(--text-2); overflow-wrap: anywhere; }
  .lv { display: flex; align-items: center; gap: var(--s1); font-size: var(--fs-small); }
  .lv small { color: var(--text-2); }
  .xp { flex: 1; min-width: 40px; height: 8px; border-radius: 4px; background: var(--surface-2); display: block; }
  .xp i { display: block; height: 8px; border-radius: 4px; background: var(--accent); }
  .ladder { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .rung { position: relative; min-height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: var(--s1); border-radius: var(--r); border: 2px solid var(--surface-2); background: var(--surface); color: var(--text); font-family: var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .rung b { font-size: var(--fs-small); color: var(--text-2); }
  .rung span { font-size: var(--fs-small); font-weight: 700; text-align: center; overflow-wrap: anywhere; }
  .rung small { font-size: var(--fs-small); color: var(--text-2); }
  .rung.equip { border-color: var(--accent); }
  .rung.equip small { color: var(--accent); font-weight: 700; }
  .rung.own small { color: var(--ok); }
  .rung.buy { border-style: dashed; border-color: var(--gem); }
  .rung.lock { opacity: 0.45; box-shadow: none; }
  .shut { display: flex; flex-direction: column; align-items: center; line-height: 1.15; } .shut b { font-size: 17px; } .shut small { font-size: 14px; font-weight: 600; opacity: 0.85; }
  .cfhi { margin-left: 6px; padding: 0 6px; border-radius: 9px; background: color-mix(in srgb, var(--accent) 22%, var(--surface-2)); color: var(--text); font: 700 var(--fs-small) var(--font); font-style: normal; }
  .rlk { font-style: normal; margin-left: 4px; font-size: 12px; }
  .nextbtn { min-height: var(--tap); display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 var(--s3); border-radius: var(--r); border: 1.5px solid var(--gem); background: color-mix(in srgb, var(--gem) 8%, var(--surface)); color: var(--text); font: 700 var(--fs-body) var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .nextbtn b { color: var(--gem); }
  .nextbtn .nv { color: var(--text-2); font-variant-numeric: tabular-nums; }
  .nextbtn i { font-style: normal; color: var(--text-2); }
  .nextbtn:active { transform: translateY(2px); box-shadow: none; }
  .bdot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 4px; background: var(--gem); }
  .svband { position: absolute; left: 50%; top: 64px; transform: translateX(-50%); z-index: 30; min-height: 48px; padding: 0 18px; border-radius: 999px; border: 0; background: var(--accent); color: var(--on-accent); font: 800 16px var(--font); box-shadow: 0 3px 0 var(--accent-sh); white-space: nowrap; animation: svin 0.2s ease-out; } @keyframes svin { from { transform: translate(-50%, -8px); opacity: 0; } }
  .pwl { display: flex; flex-direction: column; gap: 4px; font: 600 14px var(--font); color: var(--text-2); margin-bottom: 10px; } .pwi { min-height: 48px; border-radius: var(--r); border: 2px solid var(--line); background: var(--surface-2); color: var(--text); font: 800 22px var(--font); letter-spacing: 0.4em; text-align: center; } .pwm { color: var(--bad); font-weight: 700; }
  .svbtn { display: flex; align-items: center; gap: var(--s3); min-height: var(--tap); padding: var(--s2) var(--s3); border-radius: var(--r); border: 2px solid var(--accent); background: var(--surface); color: var(--text); font: inherit; text-align: left; box-shadow: 0 3px 0 var(--press-sh); }
  .svbtn:active { transform: translateY(2px); box-shadow: none; }
  .svbtn > span { font-size: 22px; }
  .svbtn b { flex: 1; font-size: 16px; }
  .svbtn small { font-weight: 500; color: var(--text-2); font-size: 14px; }
  .svbtn em { font-style: normal; font-size: 14px; color: var(--accent); font-weight: 700; }
  .next { margin: 0; font-size: var(--fs-small); color: var(--text-2); text-align: center; }
  .floor { min-height: 64px; border-radius: var(--r); background: var(--surface-2); display: flex; align-items: center; gap: var(--s3); padding: 0 14px; border: 0; color: var(--text); font: inherit; text-align: left; width: 100%; box-shadow: 0 3px 0 var(--press-sh); }
  .floor:active { transform: translateY(2px); box-shadow: none; }
  .floor.off { opacity: 0.55; }
  .floor .no { width: 38px; height: 38px; border-radius: 10px; background: var(--bg); display: grid; place-items: center; font-weight: 700; flex: none; }
  .floor b { display: block; }
  .floor span span { font-size: var(--fs-small); color: var(--text-2); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: var(--s2); padding: var(--s5) 0; color: var(--text-2); }
  .empty .ic { font-size: 40px; }
  .empty p { margin: 0; }
  .fsw { display: flex; align-items: center; gap: var(--s2); width: 100%; min-height: var(--tap); padding: 0 var(--s3); border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); text-align: left; }
  .fsw b { flex: 1; } .fsw .st { font-size: 13px; color: var(--text-3); font-weight: 500; }
  .fsw .kn { width: 40px; height: 24px; border-radius: 12px; background: var(--surface-2); position: relative; flex: none; }
  .fsw .kn::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--text-3); transition: transform var(--t); }
  .fsw.on .kn { background: var(--accent); } .fsw.on .kn::after { transform: translateX(16px); background: #fff; }
  .fnote { display: block; font-size: 13px; color: var(--text-3); margin: 4px 0 var(--s2); }

  /* 🏕 캠프 A (📜 2026-11-15): 할 일 = 금빛 숨쉬기(1.8초 · 빛 + 밝기) · 말풍선(통통 · 꼬리) · 별 하나가 둘레를 돎 / 할 일 없는 물건 = 흐림 0.55 / 동작 줄이기 = 빛 · 말풍선만 */
  .prop.todo::after { content: ''; position: absolute; left: 15%; right: 15%; bottom: -2%; height: 14%; border-radius: 50%; pointer-events: none; z-index: -1; background: radial-gradient(closest-side, rgba(255, 214, 120, 0.55), transparent); animation: todoHalo 1.8s ease-in-out infinite; } /* 🏷 #72 발밑 은은한 금빛 */
  /* 👆 누를 때 (📜 2026-11-20): 버튼 자체 = scale · translate 속성(물건 그림의 transform · 숨쉬기 filter 와 겹치지 않음) */
  .prop.tp, .zone.tp { animation: tapPop 0.15s ease-out; } .prop.tp.rm, .zone.tp.rm { animation: tapFlash 0.15s ease-out; }
  @keyframes tapPop { 0% { scale: 1; translate: 0 0; filter: brightness(1); } 35% { scale: 0.97; translate: 0 3px; filter: brightness(1.4); } 70% { scale: 1.08; translate: 0 -2px; filter: brightness(1.2); } 100% { scale: 1; translate: 0 0; filter: brightness(1); } }
  @keyframes tapFlash { 0%, 100% { filter: brightness(1); } 40% { filter: brightness(1.4); } }
  .tfx { position: absolute; left: 50%; top: 45%; width: 0; height: 0; pointer-events: none; z-index: 6; }
  .tfx i { position: absolute; left: -5px; top: -5px; width: 10px; height: 10px; background: var(--tc); clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); filter: drop-shadow(0 0 3px var(--tc)); animation: tfx 0.5s ease-out forwards; }
  @keyframes tfx { 0% { opacity: 0; transform: rotate(var(--a)) translateY(-10px) scale(0.6); } 25% { opacity: 1; } 100% { opacity: 0; transform: rotate(var(--a)) translateY(-46px) scale(1.1); } }
  @keyframes todoGlow { 0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 214, 120, 0.5)) brightness(1); } 50% { filter: drop-shadow(0 0 9px rgba(255, 214, 120, 1)) brightness(1.25); } }
  .zone.todo { box-shadow: none; }
  .zone.todo::after { content: ''; position: absolute; inset: 10%; border-radius: 50%; pointer-events: none; background: radial-gradient(closest-side, rgba(255, 214, 120, 0.35), transparent); animation: todoHalo 1.8s ease-in-out infinite; }
  @keyframes todoHalo { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
  @keyframes bob { 50% { transform: translate(-50%, -4px); } }
  @keyframes orbit { from { transform: rotate(0) translateX(var(--orb, 26px)); } to { transform: rotate(360deg) translateX(var(--orb, 26px)); } }
  /* 누르는 칸 최소 48 × 48 (그림 가운데 기준) · 위 막대 빈 곳은 그 아래 물건으로 통과 */
  .prop::before { inset: auto; left: 50%; top: 50%; width: max(calc(100% + 12px), 48px); height: max(calc(100% + 12px), 48px); transform: translate(-50%, -50%); }
  .top { pointer-events: none; } .top > :global(*) { pointer-events: auto; } .top > .sp2, .top > .ttl { pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .prop.todo :global(.img) { animation: none; filter: drop-shadow(0 0 7px rgba(255, 214, 120, 0.95)) brightness(1.15); } .zone.todo::after, .prop.todo::after { animation: none; } }
  .snews { margin: 0; padding: 0 0 0 1.1em; display: flex; flex-direction: column; gap: 8px; font-size: 15px; line-height: 1.5; }

  /* 🏕 B 만지면 반응 · D 걷기 · E 친구 (transform · opacity 만) */
  .hot { position: absolute; z-index: 4; background: none; border: 0; padding: 0; min-width: 48px; min-height: 48px; }
  .prop[data-prop='anvil'].pk :global(.img) { animation: pkBounce 0.45s ease-out; } /* 🏕 #71 그 밖 물건 = 반응 그림 4칸 (CampProp) */
  @keyframes pkBounce { 30% { transform: translateY(-8%) scale(1.04); } 60% { transform: translateY(0) scale(0.98); } }
  @keyframes pkWobble { 20% { transform: rotate(-14deg); } 45% { transform: rotate(10deg); } 70% { transform: rotate(-5deg); } }
  @keyframes pkShake { 20%, 60% { transform: translateX(-6%); } 40%, 80% { transform: translateX(6%); } }
  @keyframes pkFlash { 40% { opacity: 1; filter: brightness(1.5); } }
  .cfx { position: absolute; z-index: 8; width: 0; height: 0; pointer-events: none; }
  .cfx i { position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; }
  .cfx.spark i { background: #ffd27a; box-shadow: 0 0 6px 2px #ff9a3c; animation: fxSpark 0.7s ease-out forwards; }
  @keyframes fxSpark { to { transform: rotate(calc(var(--n) * 60deg - 150deg)) translateX(34px); opacity: 0; } }
  .cfx.leaf i { width: 7px; height: 4px; border-radius: 4px 0; background: #7fcf6a; animation: fxLeaf 1s ease-in forwards; }
  @keyframes fxLeaf { from { transform: translate(calc((var(--n) - 2.5) * 10px), -6px) rotate(0); } to { transform: translate(calc((var(--n) - 2.5) * 16px), 46px) rotate(220deg); opacity: 0; } }
  .cfx.fly i { width: 5px; height: 5px; background: #f6ff9e; box-shadow: 0 0 8px 3px rgba(220, 255, 120, 0.9); animation: fxFly 1s ease-out forwards; }
  @keyframes fxFly { from { transform: translate(calc((var(--n) - 2.5) * 6px), 0); } to { transform: translate(calc((var(--n) - 2.5) * 14px), -60px); opacity: 0; } }
  .cfx.bell i, .cfx.glow i { left: -24px; top: -24px; width: 48px; height: 48px; border: 3px solid rgba(255, 220, 120, 0.95); background: none; animation: fxRing 0.8s ease-out forwards; }
  .cfx.glow i { border-color: rgba(120, 230, 255, 0.95); box-shadow: 0 0 14px rgba(120, 230, 255, 0.8); }
  @keyframes fxRing { from { transform: scale(0.3); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }
  .cfx.twinkle i { display: none; } .cfx.twinkle b { position: absolute; left: -12px; top: -14px; font-size: 24px; color: #fff7c2; text-shadow: 0 0 10px #ffe27a; animation: fxTw 0.9s ease-out forwards; }
  @keyframes fxTw { 0% { transform: scale(0.3) rotate(0); } 40% { transform: scale(1.3) rotate(25deg); } 100% { transform: scale(0.6) rotate(60deg); opacity: 0; } }
  .hmove { position: absolute; z-index: 6; /* 📜 11/20 용사 = 물건 위 */ display: block; pointer-events: none; will-change: transform; }
  .sp.hero { will-change: transform; pointer-events: none; } /* 걷는 용사가 물건 누름을 가리지 않게 */
  .friend { position: absolute; z-index: 5; pointer-events: none; transform: translateX(-50%); }
  .buddy { position: absolute; z-index: 6; transform: translateX(-50%); border: 0; padding: 0; background: none; cursor: pointer; min-width: 48px; min-height: 48px; }
  .bbub { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); white-space: nowrap; font: 800 12px/1 var(--font); color: #2a1d05; background: #fff3cf; border: 2px solid #e3a92d; border-radius: 12px; padding: 5px 9px; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35); animation: bobB 2.4s ease-in-out infinite; pointer-events: none; }
  @keyframes bobB { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -3px); } }
  .bbub::after { content: ''; position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #e3a92d; border-bottom: 0; }
  .bbub.real { background: #dff3ff; border-color: #5ab0ff; color: #0d2a44; } .bbub.real::after { border-top-color: #5ab0ff; }
  .fbub { position: absolute; z-index: 7; transform: translateX(-50%); white-space: nowrap; font: 800 11px/1 var(--font); color: #e8f7ff; background: rgba(20, 40, 70, 0.85); border: 1.5px solid rgba(120, 200, 255, 0.9); border-radius: 10px; padding: 5px 8px; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .prop.pk :global(.img), .glow { animation: none !important; } .cfx { display: none; } }
  .trophy { position: relative; } .tdot { position: absolute; top: 2px; right: 2px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px; background: var(--bad); color: #fff; font: 800 11px var(--font); display: grid; place-items: center; } /* 🏆 #68 */
  .warl { padding: 4px 16px 0; }
  .resvb { position: fixed; z-index: 30; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 64px); transform: translateX(-50%); max-width: 398px; width: calc(100% - 32px); min-height: 48px; padding: 0 16px; border-radius: 24px; border: 0; background: var(--accent); color: var(--on-accent, #1d1406); font: 800 15px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.5); animation: resvp 1.6s ease-in-out infinite; }
  @keyframes resvp { 50% { filter: brightness(1.15); } }
</style>
