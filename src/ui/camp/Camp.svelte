<script lang="ts">
  import { loadBoard, loadCastle, loadDummy } from '../lazy'; // 📦 허수아비 · 게시판 · 성채 = 따로 받는 묶음 (캠프가 뜬 뒤 미리 받아 둠)
  import { feat } from '../../school/features.svelte';
  import { earnDaily } from '../../model/wallet';
  import { GEM, kstDay } from '../../board/board';
  import SoundToggles from '../SoundToggles.svelte';
  import { sfx } from '../sound.svelte';
  import { bgm } from '../bgm';
  import { BUILD } from '../../build';
  import { BETA, CREDIT_NAME, showCredit } from '../../channel';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { PROFILES } from '../../model/profiles';
  import { AURA_NAMES, famOfHero, HERO_NAMES, ladder, level, rungs, TIER_NAMES, titleOf } from '../../model/hero';
  import { emptyPlan, equipOf, ownsSkill } from '../../model/draft';
  import HeroSprite from './HeroSprite.svelte';
  import { SUBJ } from '../../engine/subject';
  const wishLeft: (w: Record<string, true> | undefined, m: Record<string, true> | undefined) => number = SUBJ.cards?.wishLeft ?? (() => 0);
  import MyHero from './MyHero.svelte';
  import FirstHero from './FirstHero.svelte';
  import { isEnd } from '../../raid/raid';
  import { ANIM, CAMP, CAMP_BUDDY, CAMP_PORTAL, CAMP_PROPS, HERO, heroGeo, heroNudge, heroUrl, propPos } from '../manifest';
  import { fly } from 'svelte/transition';
  import CampProp from './CampProp.svelte';
  import { portalOf } from './portal.svelte';
  import { setTeacherSink, useMe } from '../../store/me.svelte';
  import { liveRoom, liveValue } from '../room.svelte';
  import { mailLine, type Mail } from '../../school/mail';
  import BottomAction from '../battle/BottomAction.svelte';
  import { changePw, saveLogin, type Pupil } from '../../school/school';
  import Sheet from '../battle/Sheet.svelte';
  import ThemePicker from '../ThemePicker.svelte';
  import Anvil from '../forge/Anvil.svelte';
  import ModeSwitch from '../ModeSwitch.svelte';
  import { paperOn, submitWho } from '../submit.svelte';
  import { featsOf, isTheme, savedTheme, setTheme, type Theme } from '../../theme/theme';
  import { meBound, unbindMe } from '../../store/meSync';
  import { manualOf, bonusBase, castleState, floorName, progressOf, spanOf, withLegacy, type CastleRec } from '../../school/castle';
  import { visibleCastles } from '../../school/castles.svelte';
  import SurveySheet from './SurveySheet.svelte';
  import { donePath, pendingNo, REWARD, statePath } from '../../school/survey';
  import { isExcluded } from '../../school/school';
  import MailBox from './MailBox.svelte';
  import { PACKS } from '../../engine/packs';
  import { reviewTodo, type Bon, type Rec } from '../../school/dummy';
  import { visit as usageVisit } from '../../school/usage';
  import { chanOf, studentLines, studentNews, studentSeenPath, unseen } from '../../school/changes';
  import { claim as mailClaim, inbox as mailInbox, seenGet as mailSeenGet, unreadOf as mailUnread } from '../../school/mailbox';

  // 🏕 학생 캠프 (#111 · ①′ 물건 누르기 확정 · 스킬 ui-senior 2-1절 캠프 줄)
  //   위 = 장면(정식 캠프 그림 · 자리 그대로) + 「내 캠프 · 💎 · 📜」 / 아래 = 정보판(내 용사 · 사다리 4칸 · 다음 보상) + 주요 단추 「n차시 던전 입장」
  //   이름표 = 상황에 따라: 차시 던전 = 늘(열림 금빛 반짝 · 닫힘 흐림) · 새 소식 = 이름 + 빨간 숫자 · 모루 = ★n · 처음 = 흰 이름표 · 써 봤고 소식 없음 = 숨김 · 빈 땅 = 2초 모두
  const { S, L, code, pupil = null }: { S: Store; L: LessonPack; code: string; pupil?: Pupil | null } = $props();
  async function logout() {
    saveLogin(null); unbindMe();
    const A = (S as Store & { auth?: import('firebase/auth').Auth }).auth;
    if (A) { try { const fa = await import('firebase/auth'); await fa.signOut(A); } catch { /* 무시 */ } }
    location.replace(`${location.pathname}`);
  }
  const P = PROFILES.test; // 테스트 버전 = 테스트 모드 다른 점 표 값(💎 9,999 · 📜 30)
  const fromMe0 = typeof location !== 'undefined' && new URLSearchParams(location.search).get('from') === 'me'; // 👩‍🏫 교사 「나」 → 내 캠프 = 교사 기록(B안)
  if (fromMe0) setTeacherSink(untrack(() => S)); // 🧙 교사 캠프 = 교사 「내 용사」 서버 하나 (게시판 · 허수아비 · 성채도 같은 용사)
  // 🧑 실제 학생(서버 계정에 묶임 · 시험 반 · 시험 계정 아님) = 테스트 꼴 아님 (📜 2026-11-15 머리 「정식과 같게」: 테스터 표시 = 시험 반 · 테스트 계정만 · 호칭 = 얻은 것 · 새 계정 시작 💎 0)
  //   교사 캠프 · 🧪 시험 반 · 시험 계정 · 이 기기 체험 = 그대로 테스트 꼴(💎 9,999 · 📜 30 시작 · 호칭 모두)
  const realStu = untrack(() => !fromMe0 && !!pupil && !!meBound() && !isExcluded(S, pupil.cls, pupil.num));
  const M = realStu ? useMe(0, 0, false, false) : useMe(typeof P.reward.gem === 'number' ? P.reward.gem : 0, typeof P.reward.scroll === 'number' ? P.reward.scroll : 0, true, fromMe0);
  const me = M.me;
  // 🎨 테마 (#144): 서버 accounts 에 고른 테마가 있으면(다른 폰에서 고름) 이 폰도 그 테마로
  let theme = $state<Theme>(untrack(() => (isTheme(me.theme) ? me.theme : savedTheme())));
  if (untrack(() => theme) !== savedTheme()) setTheme(untrack(() => theme));
  const feats = $derived.by(() => { const b = meBound(); return featsOf(b ? b.S.get(`records/${b.cls}/${b.num}`) : null, me.cards); });
  function pickTheme(t: Theme) { theme = t; me.theme = t; M.save(); setTheme(t); }
  { const p0 = untrack(() => pupil); if (p0) submitWho({ who: `${p0.cls}-${p0.num}`, cls: p0.cls, num: p0.num }); } // 📝 모드 바꾼 기록 = 누가
  // ⓪ 로그인한 학생 = 이름표 이름 (명단에서 · 학생이 쓰지 않음)
  if (untrack(() => pupil) && me.nick !== untrack(() => pupil)?.name) { me.nick = untrack(() => pupil)?.name ?? me.nick; M.save(); }
  // 🎁 선생님 선물 받기 (gifts/{uid} · 하루 한도 밖) — 캠프에 들어오면 아직 안 받은 것을 지갑에 넣고 한 줄 알림 (지급 = 기록 · 알림 = 보여 주기)
  let feedTick = $state(0);
  let giftToast = $state('');
  {
    const u = untrack(() => pupil)?.uid;
    const G = u ? untrack(() => S).get<Record<string, { g: number; x?: number; s?: number; fun?: string; got?: boolean; mail?: boolean }>>(`gifts/${u}`) || {} : {};
    const fresh = Object.entries(G).filter(([, x]) => x && !x.got && !x.mail); // ✉ 메시지에 붙은 💎 = 아래 메시지 알림이 받음
    if (u && fresh.length) {
      const sum = fresh.reduce((a, [, x]) => a + (Number(x.g) || 0), 0);
      const xp = fresh.reduce((a, [, x]) => a + (Number(x.x) || 0), 0), funOnly = fresh.every(([, x]) => !!x.fun); // 🏕 쉼터 놀이 보상(#142) = 같은 칸 · EXP 도
      // 🗿 석화 찬스 💎 = 하루 한도 안 (📜 2026-11-13 밤 · 정식 DAY_CAP 100 · 넘은 몫은 버림) · 나머지 선물 = 한도 밖 그대로
      const petri = fresh.filter(([k]) => k.startsWith('petri_')).reduce((a, [, x]) => a + (Number(x.g) || 0), 0), petriGot = earnDaily(me.wallet, petri, kstDay(untrack(() => S).now()), GEM.dayCap);
      const sc = fresh.reduce((a, [, x]) => a + (Number(x.s) || 0), 0); // 📜 ✍ 📸 서술형 통과 (정식 ult_{차시}_{몬스터} · 문제당 한 번)
      me.wallet.gem += sum - petri; me.wallet.scroll += sc; me.xp += xp; M.save();
      fresh.forEach(([k]) => S.set(`gifts/${u}/${k}/got`, true));
      giftToast = `${fresh.every(([k]) => k.startsWith('stamp_')) ? '✅ 수업 도장' : funOnly ? (fresh.every(([k]) => k.startsWith('ult_')) ? '🌟 진필살기 서술' : '🏕 쉼터 놀이') : '🎁 선생님 선물'}${sum - petri + petriGot ? ` · 💎 +${sum - petri + petriGot}` : ''}${sc ? ` · 📜 +${sc}` : ''}${xp ? ` · EXP +${xp}` : ''}`;
      setTimeout(() => (giftToast = ''), 2600);
    }
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
  const open = $derived(!!R && !isEnd(L, R));

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
  function mailTake(id: string): string {
    if (!mbWho) return '';
    const got = mailClaim(S, mbWho.uid, id); if (!got) return '이미 받은 선물이에요';
    const n = got.petri ? earnDaily(me.wallet, got.g, kstDay(S.now()), GEM.dayCap) : (me.wallet.gem += got.g, got.g); // 🗿 석화 = 하루 한도 안 (캠프 받기와 같음)
    me.wallet.scroll += got.s; me.xp += got.x; M.save(); mbVer++; sfx('mail', 0.6);
    return `🎁 받았어요${n ? ` · 💎 +${n}` : ''}${got.s ? ` · 📜 +${got.s}` : ''}${got.x ? ` · EXP +${got.x}` : ''}`;
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
    if (open) t.gate = '⚔ 수업 열림 · 입장!';
    if (rc) t.dummy = `⚔ 모집 중 ${rc.n}/${rc.max} · 참여!`;
    return t;
  });
  const anyTodo = $derived(Object.keys(todo).length > 0);
  const hl = (k: string): 'todo' | 'dim' | '' => (todo[k] ? 'todo' : anyTodo ? 'dim' : '');
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
  type LabelState = 'gold' | 'dim' | 'news' | 'star' | 'new' | 'hide';
  function lab(id: string): LabelState {
    if (id === 'gate') return open ? 'gold' : 'dim';
    if ((news[id] ?? 0) > 0) return 'news';
    if (id === 'anvil' && wishN > 0) return 'star'; // ⭐ 아직 안 만든 찜 = 「소식 있음」 자리 · 처음 · 익숙 숨김보다 먼저 (#129 ②)
    if (!me.seen[id]) return 'new';
    return showAll ? 'new' : 'hide';
  }
  const NAME: Record<string, string> = { gate: '차시 던전', castle: '성채', tent: '출제 공방', anvil: '모루', dummy: '📋 게시판', scare: '🎯 허수아비', mail: '우편함', hero: '내 용사' };
  const gateText = $derived(open ? `${L.no}차시 던전` : '차시 던전 · 닫힘');

  // 🔁 새로 고침돼도 보던 시트로 (📜 2026-11-14 모든 판 공통 화면 규칙 ①): 이 탭에서 10분 안 · 열린 시트 이름만 기억
  const SK = 'citadel-camp-sheet';
  let sheet = $state<string | null>((() => { try { const j = JSON.parse(sessionStorage.getItem(SK) || 'null') as { s: string; at: number } | null; return j && Date.now() - j.at < 10 * 60e3 ? j.s : null; } catch { return null; } })());
  $effect(() => { const s = sheet; try { if (s) sessionStorage.setItem(SK, JSON.stringify({ s, at: Date.now() })); else sessionStorage.removeItem(SK); } catch { /* 사생활 창 */ } });
  // 🧙 첫 용사 고르기 = 방금 가입한 폰의 첫 캠프에서 한 번 (App 이 가입 때 표시 · 📜 2026-11-13 밤 ❓#1 = A)
  let hero0 = $state((() => { try { return sessionStorage.getItem('citadel-hero0') === '1'; } catch { return false; } })());
  // 🏰 성채 새 방 (정식 camp.js · 이 기기에 지난 수 기억 · 늘면 한 번 안내) — 📜 2026-11-14 = 올린 성채 팩(보이는 층)에서 이 학생에게 열린 방 수 · 처음 본 수는 소리 없이 기억만
  const castleWho = untrack(() => ({ cls: pupil?.cls ?? '', num: pupil?.num ?? 0, uid: pupil?.uid ?? 'me' }));
  // 🎵 학생 폰 배경음 = 첫 화면 · 개인 캠프(⚒ 모루 창 포함)만 (DECISIONS 2026-11-11 · 📜 2026-11-14 되살림) — 🏰 성채 · 🎯 허수아비 · 📋 게시판 = 없음
  $effect(() => { bgm(castleGo == null && sheet !== 'scare' && sheet !== 'dummy' ? 'camp' : null, 'phone'); });
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
  const SND: Record<string, string> = { scare: 'dummy-hit', mail: 'mail', castle: 'castle-open', anvil: 'spark', dummy: 'board', tent: 'wind', gate: 'magic', fire: 'fire', tree: 'wind', shroom: 'star', moon: 'star', fly: 'star' };
  const FXK: Record<string, string> = { fire: 'spark', anvil: 'spark', castle: 'bell', gate: 'glow', tree: 'leaf', shroom: 'glow', moon: 'twinkle', fly: 'fly' };
  const ptOf = (e?: Event): [number, number] | null => { const r = stageEl?.getBoundingClientRect(), m = e as MouseEvent | undefined; if (!r || !m || m.clientX == null || !r.width) return null; return [((m.clientX - r.left) / r.width) * 100, ((m.clientY - r.top) / r.height) * 100]; };
  function poke(k: string, e?: Event) {
    sfx(SND[k] ?? 'click', 0.6); try { navigator.vibrate?.(25); } catch { /* 무시 */ }
    poked = { ...poked, [k]: true }; setTimeout(() => { const p = { ...poked }; delete p[k]; poked = p; }, 650);
    const pt = ptOf(e); if (!RM && FXK[k] && pt) { const id = ++fxN; fxs = [...fxs, { id, x: pt[0], y: pt[1], k: FXK[k]! }]; setTimeout(() => (fxs = fxs.filter((f) => f.id !== id)), 1100); }
  }
  // D 용사 걷기 (자리 = 캠프 그림 % · 앉은 자리 CAMP.hero)
  const SEAT = { left: CAMP.hero.left, bottom: CAMP.hero.bottom };
  const SPOT: Record<string, { left: number; bottom: number }> = { scare: { left: 34, bottom: 27 }, fire: { left: 39, bottom: 16 }, mail: { left: 40, bottom: 28 }, anvil: { left: 24, bottom: 10 }, dummy: { left: 58, bottom: 18 }, tent: { left: 24, bottom: 22 }, castle: { left: 48, bottom: 30 }, gate: { left: 70, bottom: 22 } };
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
    e?.stopPropagation(); poke(k, e); arm();
    if (RM || !SPOT[k]) { tap(k); return; }
    const tok = ++walkTok;
    void walkTo(SPOT[k]!, 600, tok).then((ok) => { if (ok) { hp = { ...hp, pose: 'idle' }; tap(k); } });
  }
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
    if (!feat('board') || open) return null;
    const f = friends[0];
    if (f) { const off = !!S.get(`accounts/${f.cls}/${f.num}/feedOff`); return { hero: f.hero, line: `${off ? '친구가' : `${f.nick}님이`} 같이 하재요!`, real: true }; }
    const ids = Object.keys(HERO_NAMES).map(Number).filter((h) => h !== me.hero), day = Math.floor((Date.now() + 9 * 3600e3) / 86400e3);
    return ids.length ? { hero: ids[day % ids.length]!, line: BUDDY_LINES[buddyI]!, real: false } : null;
  });
  function tap(id: string, e?: Event) {
    e?.stopPropagation();
    M.mark(id);
    if (id === 'gate') { if (open) location.href = `?role=student&room=${encodeURIComponent(code)}`; else sheet = 'gate'; return; }
    if (id === 'dummy') boardJoin = portal.recruit?.pid ?? ''; // 🌀 모집 중 방 = 그 방에 바로 참여 (캠프 A)
    sheet = id;
  }

  // 정보판 (#111 ④)
  const fam = $derived(famOfHero(me.hero));
  const lv = $derived(level(me.xp));
  const ladderRows = $derived(rungs(me.hero, ladder(me.hero).filter((id) => ownsSkill(me.wallet, emptyPlan(), me.hero, id)), equipOf({ hero: me.hero, enh: me.enh, socket: me.socket, title: me.title }), me.wallet));
  const ttl = $derived(me.title && me.title !== 'none' ? titleOf(me.title) : null);
  const hero = $derived(HERO_NAMES[me.hero] ?? { name: '용사', job: '' });
  const nextLine = $derived.by(() => {
    const b = ladderRows.find((r) => r.state === 'buy');
    if (b) return `🪜 ${TIER_NAMES[b.tier]} ${b.name.replace(/^\S+ /, '')}를 열 수 있어요 · 💎 ${b.gem}${b.scroll ? ` + 📜 ${b.scroll}` : ''}`;
    return `⭐ Lv.${lv.lv + 1} 까지 EXP ${lv.next - lv.into}`;
  });
  const pct = (v: number, tot: number) => `${((100 * v) / tot).toFixed(2)}%`;
  const [W, H] = CAMP.size;
  const zoneStyle = (k: string) => { const z = CAMP.zones[k] as [number, number, number, number]; return `left:${pct(z[0], W)};top:${pct(z[1], H)};width:${pct(z[2] - z[0], W)};height:${pct(z[3] - z[1], H)}`; };
  const objStyle = (o: { x: number; y: number; w: number }) => `left:${pct(o.x, W)};top:${pct(o.y, H)};width:${pct(o.w, W)}`;
  const HS = 1; // 정보판 용사 = 칸 80 × 64 그대로(정수 배율)
  // 🚪 코드로 들어가기 (#138 · 정식 codeGate): 6자리 · 열려 있는 방이어야 함
  let codeIn = $state(''), codeErr = $state('');
  async function enterCode() {
    const c = codeIn.trim();
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
    <img class="obj {hl('castle')}" alt="" src={CAMP.castle.src} style={objStyle(CAMP.castle)} />
    <img class="obj lit" class:on={sheet === 'castle' || !!poked.castle} alt="" src={CAMP.castle.lit} style={objStyle(CAMP.castle)} />
    <img class="obj {anyTodo ? 'dim' : ''}" class:flap={!!poked.tent} alt="" src={CAMP.tent.src} style={objStyle(CAMP.tent)} />
    <img class="obj gate-on" class:on={open} class:flash={!!poked.gate} alt="" src={CAMP.gateOn.src} style={objStyle(CAMP.gateOn)} />
    <i class="sp fire" style="{propPos(CAMP.fire)};aspect-ratio:{CAMP.fire.aspect};background-image:url({CAMP.fire.src});background-size:{CAMP.fire.cols * 100}% {CAMP.fire.rows * 100}%;background-position:{(fireF % CAMP.fire.cols) / (CAMP.fire.cols - 1) * 100}% {Math.floor(fireF / CAMP.fire.cols) * 100}%"></i>
    <!-- 🏕 (📜 2026-11-17 #10 「반전되는 과정이 어색」): 바깥 = 이동만(걷는 시간 동안) · 안 = 좌우 돌아서기만(0.12초 · 그림 가운데 기준) — 예전엔 한 transform 이라 걷는 내내 몸이 얇아졌다 펴짐 -->
    <span class="hmove" style="left:{CAMP.hero.left}%;bottom:{CAMP.hero.bottom}%;width:{heroGeo(me.hero).w}px;height:{heroGeo(me.hero).h}px;transform:translate({((hp.left - SEAT.left) / 100) * stW}px, {(-(hp.bottom - SEAT.bottom) / 100) * stH}px);transition:transform {hp.ms}ms linear"><i class="sp hero" class:walk={hp.pose === 'walk'} data-k="camp-hero" data-pose={hp.pose} data-flip={hp.flip ? '1' : '0'} style="translate:{heroNudge(me.hero, heroRow(hp.pose)).dx + heroGeo(me.hero).dx}px {heroNudge(me.hero, heroRow(hp.pose)).dy + heroGeo(me.hero).dy - HERO.h + heroGeo(me.hero).h}px;left:0;bottom:0;width:{heroGeo(me.hero).w}px;height:{heroGeo(me.hero).h}px;transform:scaleX({hp.flip ? -1 : 1});transition:transform {TURN}ms ease-out;background-image:url({heroUrl(me.hero)});background-size:{HERO.cols * 100}% {HERO.rows * 100}%;background-position:{(heroCol / (HERO.cols - 1)) * 100}% {(heroRow(hp.pose) / (HERO.rows - 1)) * 100}%"></i></span>
    <!-- 🏕 B 모닥불 · 숨은 반응 넷 (나무 · 버섯 · 달 · 반딧불) = 반응만 · 보상 없음 -->
    <button type="button" class="hot" data-hot="fire" aria-label="모닥불" style="{propPos(CAMP.fire)};aspect-ratio:{CAMP.fire.aspect}" onclick={(e) => poke0('fire', e)}></button>
    {#each [['tree', 'left:1%;top:18%;width:17%;height:26%'], ['tree', 'left:82%;top:16%;width:17%;height:26%'], ['moon', 'left:51%;top:3%;width:12%;height:9%'], ['shroom', 'left:88%;bottom:2%;width:11%;height:9%'], ['fly', 'left:60%;top:46%;width:14%;height:9%']] as h, i (i)}<button type="button" class="hot hid" data-hot={h[0]} aria-label="숨은 곳" style={h[1]} onclick={(e) => poke0(h[0]!, e)}></button>{/each}
    {#each fxs as f (f.id)}<span class="cfx {f.k}" style="left:{f.x}%;top:{f.y}%" aria-hidden="true">{#each Array(f.k === 'bell' || f.k === 'glow' ? 1 : 6) as _, n (n)}<i style="--n:{n}"></i>{/each}{#if f.k === 'twinkle'}<b>✦</b>{/if}</span>{/each}
    {#if buddy}<button type="button" class="buddy" style="left:{CAMP_BUDDY.left}%;bottom:{CAMP_BUDDY.bottom}%" aria-label="게시판 던전 같이 하기" data-k="board-buddy" data-real={buddy.real ? '1' : '0'} onclick={(e) => tap('dummy', e)}><span class="bbub" class:real={buddy.real}>{buddy.line}</span><HeroSprite id={buddy.hero} scale={0.8} play /></button>{/if}
    {#each friends.slice(1) as f, i (f.uid)}<span class="friend" style="left:{CAMP_PORTAL.left + 4 - i * 7}%;bottom:{CAMP_PORTAL.bottom - 9}%" in:fly={{ x: 24, duration: RM ? 0 : 400 }} out:fly={{ x: 30, duration: RM ? 0 : 450, opacity: 0 }} data-k="friend"><HeroSprite id={f.hero} scale={0.8} play /></span>{/each}
    {#if friendText && !buddy}<span class="fbub" style="left:{CAMP_PORTAL.left - 3}%;bottom:{CAMP_PORTAL.bottom - 13}%" data-k="friend-bub">{friendText}</span>{/if}

    {#each ['castle', 'tent', 'gate'].filter((k) => k === 'gate' || feat(k === 'castle' ? 'citadel' : 'author')) as k (k)}
      {@const st = lab(k)}
      <button type="button" class="zone {hl(k)}" data-zone={k} style={zoneStyle(k)} aria-label={k === 'gate' ? gateText : NAME[k]} onclick={(e) => go(k, e)}>
        {#if todo[k]}<span class="bub" data-k="bub-{k}">{todo[k]}</span><i class="spark" aria-hidden="true"></i>{:else}<span class="label {st}">{k === 'gate' ? gateText : NAME[k]}{#if st === 'news'}<b class="dot">{news[k]}</b>{/if}</span>{/if}
      </button>
    {/each}
    {#each CAMP_PROPS.filter((p) => !p.feat || feat(p.feat)) as p (p.k)}
      {@const k = p.k}
      {@const st = lab(k)}
      <button type="button" class="prop {hl(k)}" style={propPos(p)} aria-label={todo[k] ? `${NAME[k]} · ${todo[k]}` : NAME[k]} data-prop={k} class:pk={!!poked[k]} onclick={(e) => go(k, e)}>
        <CampProp {p} phase={k === 'dummy' ? portal.phase : 'idle'} hit={!!poked[k]} />
        {#if todo[k]}<span class="bub" data-k="bub-{k}">{todo[k]}</span><i class="spark" aria-hidden="true"></i>{:else}<span class="label {st}">{NAME[k]}{#if st === 'news'}<b class="dot">{news[k]}</b>{:else if st === 'star'}<b class="star">★{wishN}</b>{/if}</span>{/if}
      </button>
    {/each}

    <div class="top">
      {#if pupil}<button type="button" class="back" aria-label="메뉴" onclick={() => (sheet = 'menu')}>‹</button>{:else if fromMe}<a class="back" href="?role=teacher&tab=me" aria-label="나 탭으로">‹</a>{/if}<b class="ttl">내 캠프</b><span class="sp2"></span>
      <!-- 💎 · 📜 알약 = 누르면 🧙 내 용사 (정식 동작 · 📜 2026-11-15 선생님 「누르면 뭐 나올 것처럼 · 내 용사 연결」) -->
      <button type="button" class="pill tap" data-k="wallet" disabled={!feat('hero')} aria-label="마정석 {me.wallet.gem}개 · 서술 조각 {me.wallet.scroll}개 · 내 용사 보기" onclick={() => tap('hero')}><span class="pv"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1 13 6 7 13 1 6Z" fill="var(--gem)" /></svg>{me.wallet.gem.toLocaleString()}</span><i class="psep" aria-hidden="true"></i><span class="pv"><svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="2" fill="var(--scroll)" /></svg>{me.wallet.scroll}</span>{#if feat('hero')}<b class="chev" aria-hidden="true">›</b>{/if}</button>
      <button type="button" class="gear" aria-label="설정" onclick={() => (sheet = 'set')}>⚙</button>
    </div>
    {#if svBand && svNo && !svSent}<button type="button" class="svband" data-k="sv-band" onclick={() => { svBand = false; sheet = 'survey'; }}>📝 설문이 있어요 · {svNo}차시 · 눌러서 답하기 ›</button>{/if}
    {#if mailToast}<p class="gtoast mail" role="status">{mailToast}</p>{:else if giftToast}<p class="gtoast" role="status">{giftToast}</p>{/if}
  </div>
  </div>

  <section class="info">
    {#if svNo && !svSent}<button type="button" class="svbtn" data-k="sv-open" onclick={() => (sheet = 'survey')}><span>📝</span><b>수업 설문 <small>· {svNo}차시 · 3분 · 이름 없이</small></b><em>+{REWARD.xp} EXP · 💎+{REWARD.gem}</em></button>{/if}
    {#if feat('hero')}<button type="button" class="card hero-card" onclick={() => tap('hero')} aria-label="내 용사 보기">
      <span class="pic"><HeroSprite id={me.hero} scale={HS} aura={me.enh} play />{#if me.enh}<b class="enh">+{me.enh}</b>{/if}</span>
      <span class="who">
        <span class="nm">{#if ttl}<em class="tt">{ttl.name}</em>{/if}<b>{fromMe ? '선생님' : me.nick}</b></span>
        <span class="sub">{hero.job} {hero.name} · {fam.name} · {me.enh ? AURA_NAMES[me.enh] : '오라 없음'}</span>
        <span class="lv"><b>Lv.{lv.lv}</b> <small>{lv.title}</small><i class="xp"><i style:width="{(lv.into / lv.next) * 100}%"></i></i><small>{lv.into}/{lv.next}</small></span>
      </span>
    </button>
    <div class="ladder" role="group" aria-label="스킬 사다리">
      {#each ladderRows as r (r.id)}
        <button type="button" class="rung {r.state}" onclick={() => tap('hero')} aria-label="{TIER_NAMES[r.tier]} {r.name} {r.state === 'equip' ? '장착' : r.state === 'own' ? '가짐' : r.state === 'buy' ? `살 수 있음 💎 ${r.gem}` : `잠김 ${r.why ?? ''}`}">
          <b>{(TIER_NAMES[r.tier] ?? '').split(' ')[0]}</b>
          <span>{r.name.replace(/^\S+ /, '')}</span>
          <small>{r.state === 'equip' ? '장착' : r.state === 'own' ? '✔' : `💎${r.gem}${r.scroll ? ` 📜${r.scroll}` : ''}`}</small>
          {#if r.state === 'buy'}<i class="bdot" aria-hidden="true"></i>{/if}
        </button>
      {/each}
    </div>
    <p class="next">{nextLine}</p>{/if}
  </section>
  {/if}
  <BottomAction dock={false} disabled={!open} why={open ? '' : '선생님이 수업을 열면 차원문에 빛이 들어와요'} onmain={() => tap('gate')} mainLabel="{L.no}차시 던전 입장">
    {#snippet aux()}{#if !open}<button type="button" class="codebtn" onclick={() => (sheet = 'gate')}>🚪 코드</button>{/if}{/snippet}
    {#snippet main()}<span>{open ? `${L.no}차시 던전 입장` : '차시 던전 · 닫힘'}</span>{/snippet}
  </BottomAction>
</div>

{#if castleGo != null}
  <!-- 🏰 성채 던전 (📜 2026-11-14 · 올린 성채 팩 · 방 = 몬스터 한 마리 · 학생 레이드 화면 그대로) -->
  {#await loadCastle() then K}<K.default {S} {me} save={M.save} all={fromMe0} uid={castleWho.uid} num={castleWho.num} cls={castleWho.cls} floor={castleGo} onclose={() => (castleGo = null)} />{/await}
{:else if sheet === 'survey' && svWho && svNo && !svSent}
  <SurveySheet {S} cls={svWho.cls} num={svWho.num} no={svNo} excluded={isExcluded(S, svWho.cls, svWho.num)} onpaid={svPaid} onclose={() => (sheet = null)} />
{:else if sheet === 'mail' && mbWho}
  <MailBox {S} uid={mbWho.uid} cls={mbWho.cls} num={mbWho.num} gem={me.wallet.gem} survey={svNo && !svSent ? svNo : 0} onclaim={mailTake} onsurvey={() => (sheet = 'survey')} onclose={() => { sheet = null; mbSeen = mailSeenGet(mbWho.cls, mbWho.num, S); mbVer++; }} />
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
    {#if pupil}<button type="button" class="out" data-k="pw-open" onclick={() => { pwCur = ''; pwNew = ''; pwNew2 = ''; pwMsg = ''; sheet = 'pw'; }}>🔑 비밀번호 바꾸기</button>{/if}
    <!-- ↪ #171 로그아웃 = 첫 화면(반 · 번호 · 「교사 · 종합실 ›」)으로 · 이 폰의 로그인 기억 지움 · 시험 서버 로그인도 끝냄 -->
    <button type="button" class="out" disabled={open} onclick={() => (sheet = 'out')}>🚪 처음 화면으로 <small>{open ? '수업 중엔 못 나가요' : pupil ? `${pupil.cls}반 ${pupil.num}번` : ''}</small></button>
    <p class="build">판 {BUILD}{(S as Store & { auth?: unknown }).auth ? (BETA ? ' · 시험 서버' : ' · 서버') : ' · 이 기기'}</p>
    {#if showCredit}<p class="build" data-k="credit">만든 이 · {CREDIT_NAME} ({SUBJ.name})</p>{/if}
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
  <Anvil {me} save={M.save} who={pupil ? `${pupil.cls.replace(/[.#$/[\]]/g, '_')}-${pupil.num}` : 'me'} onclose={() => (sheet = null)} />
{:else if sheet === 'scare'}
  <!-- 🎯 허수아비 = 혼자 복습 (📜 2026-11-13 밤 쪼갬) -->
  {#await loadDummy() then K}<K.default {S} {me} save={M.save} uid={pupil?.uid ?? 'me'} num={pupil?.num ?? 0} cls={pupil?.cls ?? ''} onclose={() => (sheet = null)} onforge={() => (sheet = 'anvil')} />{/await}
{:else if sheet === 'dummy'}
  <!-- 📋 게시판 던전 (#143 · 허수아비 자리 · 허수아비 화면은 없앰) -->
  {#await loadBoard() then K}<K.default {S} {me} save={M.save} uid={pupil?.uid ?? 'me'} num={pupil?.num ?? 0} cls={pupil?.cls ?? ''} {open} joinPid={boardJoin} onclose={() => { sheet = null; boardJoin = ''; }} />{/await}
{:else if sheet === 'hero'}
  <MyHero {me} persist={M.save} onclose={() => (sheet = null)} teacher={fromMe0} onreset={fromMe0 ? M.reset : undefined} />
{:else if sheet}
  <Sheet onclose={() => (sheet = null)} mainText="닫기">
    {#snippet title()}{sheet === 'gate' ? '차시 던전' : NAME[sheet ?? '']}{/snippet}
    {#if sheet === 'gate'}
      <!-- 🚪 코드로 들어가기 (#138 · 정식 camp.js codeGate 그대로: 수업 코드 6자리 → 던전 대기실) -->
      <p class="cg">아직 문이 닫혀 있어요. 선생님이 알려 준 <b>수업 코드 6자리</b>를 넣으면 던전 대기실로 넘어가요.</p>
      <input class="cin" inputmode="numeric" maxlength="6" placeholder="6자리" autocomplete="off" aria-label="수업 코드 6자리" bind:value={codeIn} oninput={() => (codeErr = '')} />
      {#if codeErr}<p class="cerr" role="alert">{codeErr}</p>{/if}
      <button type="button" class="cgo" onclick={enterCode}>⚔ 던전으로</button>
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

<style>
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
  .codebtn { flex: 1; min-height: var(--btn-h); padding: 0 var(--s3); border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
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
  .camp > :global(.act) { flex: none; }
  .info { flex: none; }
  .stage { position: relative; width: min(100cqw, 100cqh * var(--ar)); flex: none; background-size: 100% 100%; overflow: hidden; }
  .stage::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 40px; background: linear-gradient(transparent, var(--bg)); pointer-events: none; z-index: 4; }
  .obj { position: absolute; z-index: 1; pointer-events: none; }
  .obj.lit { opacity: 0; transition: opacity 0.4s; }
  .obj.lit.on { opacity: 1; }
  .obj.gate-on { opacity: 0; transition: opacity 1.2s; }
  .obj.gate-on.on { opacity: 1; }
  .sp { position: absolute; z-index: 2; display: block; background-repeat: no-repeat; image-rendering: pixelated; pointer-events: none; }
  .fire { filter: drop-shadow(0 0 18px #ff9a2a); }
  .zone { position: absolute; z-index: 5; background: none; border: 0; padding: 0; }
  .prop { position: absolute; z-index: 5; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
  .prop:active :global(.img) { transform: scale(1.06); } /* 누른 느낌 = 물건이 살짝 커졌다 돌아옴 (0.12초 · 파란 네모 대신) */
  .label { position: absolute; left: 50%; bottom: -6px; transform: translate(-50%, 100%); white-space: nowrap; height: 26px; padding: 0 9px; border-radius: 13px; background: var(--surface-2); color: var(--text); font: 700 var(--fs-small) var(--font); display: flex; align-items: center; gap: var(--s1); box-shadow: 0 3px 0 #000; z-index: 5; transition: opacity var(--t); }
  .zone .label { bottom: 4px; transform: translate(-50%, 0); }
  .zone[aria-label='출제 공방'] .label { bottom: auto; top: 0; transform: translate(-50%, -60%); } /* 출제 공방 이름표 = 텐트 위 (아래 빈 땅 = 🎯 허수아비 자리 · 캠프 자리표) */
  .label.new { background: #f2f3f5; color: #14161b; }
  .label.gold { background: var(--accent); color: var(--on-accent); animation: glow 1.6s ease-in-out infinite; }
  .label.dim { opacity: 0.7; color: var(--text-2); }
  .label.hide { opacity: 0; pointer-events: none; }
  .dot { min-width: 18px; height: 18px; border-radius: 9px; background: var(--bad); color: #fff; font-size: 12px; display: grid; place-items: center; padding: 0 4px; }
  .star { color: var(--accent); }
  @keyframes glow { 50% { box-shadow: 0 3px 0 #000, 0 0 0 4px rgba(245, 184, 74, 0.35); } }
  @media (prefers-reduced-motion: reduce) { .label.gold { animation: none; } }
  .zone::before, .prop::before { content: ''; position: absolute; inset: -6px; }
  .gtoast.mail { border-color: var(--accent); }
  .gtoast { position: absolute; top: 60px; left: var(--s4); right: var(--s4); z-index: 7; margin: 0; padding: var(--s2) var(--s3); border-radius: var(--r); background: var(--surface); border: 1px solid var(--gem); color: var(--text); font-weight: 700; text-align: center; }
  .top { position: absolute; top: 0; left: 0; right: 0; z-index: 6; height: var(--bar-top); display: flex; align-items: center; gap: var(--s2); padding: 0 var(--s3) 0 var(--s4); }
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
  .psep { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.3); }
  .chev { font-size: 16px; line-height: 1; color: rgba(255, 255, 255, 0.8); margin-left: -1px; }
  /* 이름표가 그림 밖으로 잘리지 않게: 차시 던전(오른쪽 끝) = 오른쪽에 붙임 · 모루(아래 끝) = 오른쪽 옆 */
  .zone[data-zone='gate'] .label { left: auto; right: 4px; transform: none; }
  .prop[data-prop='anvil'] .label { left: 100%; top: 50%; bottom: auto; transform: translate(2px, -50%); }
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
  .prop.todo :global(.img), img.obj.todo { animation: todoGlow 1.8s ease-in-out infinite; }
  .prop.dim :global(.img), img.obj.dim { filter: brightness(0.55) saturate(0.7); }
  @keyframes todoGlow { 0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 214, 120, 0.5)) brightness(1); } 50% { filter: drop-shadow(0 0 9px rgba(255, 214, 120, 1)) brightness(1.25); } }
  .zone.todo { box-shadow: none; }
  .zone.todo::after { content: ''; position: absolute; inset: 10%; border-radius: 50%; pointer-events: none; background: radial-gradient(closest-side, rgba(255, 214, 120, 0.35), transparent); animation: todoHalo 1.8s ease-in-out infinite; }
  @keyframes todoHalo { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
  .bub { position: absolute; left: 50%; bottom: calc(100% + 8px); z-index: 7; transform: translate(-50%, 0); white-space: nowrap; font: 800 12px/1 var(--font); color: #2a1d05; background: #fff3cf; border: 2px solid #e3a92d; border-radius: 12px; padding: 6px 9px; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4); pointer-events: none; animation: bob 1.4s ease-in-out infinite; }
  .bub::after { content: ''; position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #e3a92d; border-bottom: 0; }
  .zone .bub { bottom: auto; top: 0; transform: translate(-50%, -100%); animation-name: bobZ; }
  .zone[data-zone='gate'] .bub { left: 50%; top: 18%; }
  @keyframes bob { 50% { transform: translate(-50%, -4px); } }
  @keyframes bobZ { 0%, 100% { transform: translate(-50%, -100%); } 50% { transform: translate(-50%, calc(-100% - 4px)); } }
  .spark { position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: #fff7c2; box-shadow: 0 0 8px 3px #ffd863; pointer-events: none; z-index: 6; animation: orbit 2.2s linear infinite; }
  @keyframes orbit { from { transform: rotate(0) translateX(var(--orb, 26px)); } to { transform: rotate(360deg) translateX(var(--orb, 26px)); } }
  .zone .spark { --orb: 34px; }
  /* 누르는 칸 최소 48 × 48 (그림 가운데 기준) · 위 막대 빈 곳은 그 아래 물건으로 통과 */
  .prop::before { inset: auto; left: 50%; top: 50%; width: max(calc(100% + 12px), 48px); height: max(calc(100% + 12px), 48px); transform: translate(-50%, -50%); }
  .top { pointer-events: none; } .top > :global(*) { pointer-events: auto; } .top > .sp2, .top > .ttl { pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .prop.todo :global(.img), img.obj.todo { animation: none; filter: drop-shadow(0 0 7px rgba(255, 214, 120, 0.95)) brightness(1.15); } .zone.todo::after, .bub, .spark { animation: none; } .spark { display: none; } }
  .snews { margin: 0; padding: 0 0 0 1.1em; display: flex; flex-direction: column; gap: 8px; font-size: 15px; line-height: 1.5; }

  /* 🏕 B 만지면 반응 · D 걷기 · E 친구 (transform · opacity 만) */
  .hot { position: absolute; z-index: 4; background: none; border: 0; padding: 0; min-width: 48px; min-height: 48px; }
  .prop.pk :global(.img) { animation: pkBounce 0.45s ease-out; }
  .prop[data-prop='scare'].pk :global(.img) { animation: pkWobble 0.55s ease-out; transform-origin: 50% 100%; }
  .prop[data-prop='mail'].pk :global(.img) { animation: pkShake 0.4s linear; }
  @keyframes pkBounce { 30% { transform: translateY(-8%) scale(1.04); } 60% { transform: translateY(0) scale(0.98); } }
  @keyframes pkWobble { 20% { transform: rotate(-14deg); } 45% { transform: rotate(10deg); } 70% { transform: rotate(-5deg); } }
  @keyframes pkShake { 20%, 60% { transform: translateX(-6%); } 40%, 80% { transform: translateX(6%); } }
  img.obj.flap { animation: pkFlap 0.55s ease-out; transform-origin: 50% 100%; }
  @keyframes pkFlap { 25% { transform: skewX(-4deg) scaleY(1.02); } 55% { transform: skewX(3deg); } }
  img.obj.gate-on.flash { animation: pkFlash 0.6s ease-out; }
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
  .hmove { position: absolute; z-index: 2; display: block; pointer-events: none; will-change: transform; }
  .sp.hero { will-change: transform; pointer-events: none; } /* 걷는 용사가 물건 누름을 가리지 않게 */
  .friend { position: absolute; z-index: 5; pointer-events: none; transform: translateX(-50%); }
  .buddy { position: absolute; z-index: 6; transform: translateX(-50%); border: 0; padding: 0; background: none; cursor: pointer; min-width: 48px; min-height: 48px; }
  .bbub { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); white-space: nowrap; font: 800 12px/1 var(--font); color: #2a1d05; background: #fff3cf; border: 2px solid #e3a92d; border-radius: 12px; padding: 5px 9px; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35); animation: bobB 2.4s ease-in-out infinite; pointer-events: none; }
  @keyframes bobB { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -3px); } }
  .bbub::after { content: ''; position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #e3a92d; border-bottom: 0; }
  .bbub.real { background: #dff3ff; border-color: #5ab0ff; color: #0d2a44; } .bbub.real::after { border-top-color: #5ab0ff; }
  .fbub { position: absolute; z-index: 7; transform: translateX(-50%); white-space: nowrap; font: 800 11px/1 var(--font); color: #e8f7ff; background: rgba(20, 40, 70, 0.85); border: 1.5px solid rgba(120, 200, 255, 0.9); border-radius: 10px; padding: 5px 8px; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .prop.pk :global(.img), img.obj.flap, img.obj.gate-on.flash { animation: none; } .cfx { display: none; } }
</style>
