<script lang="ts">
  import WarBar from '../board/WarBar.svelte';
  import { explorers, expOf } from '../../school/explore';
  import { keyBoard, keysOf } from '../../school/keys';
  import { ccLabel, ccOpen, ccStats, ccTap } from '../../school/cc';
  import { reviewStep, stepReview } from '../../school/help';
  import { gobiCard } from '../../school/gobi';
  import GobiCardView from './GobiCard.svelte';
  import { reviewsOf } from '../../school/help';
  import { sentOf, isSent } from '../../school/sendReview';
  import { siteUrl } from '../../channel';
  import { holdWake } from '../wake.svelte';
  import { SUBJ } from '../../engine/subject';
  import { PACKS } from '../../engine/packs';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { activeIds, BOSS_ID, bossDrop, bossHp, bossState, chainRecord, isChain, isEnd, isLobby, monsterHp, nextIdx, plainRecord, solveLock, stepIdx, stepOf, timeLeft } from '../../raid/raid';
  import { appearNow, doorStart, endClass, setDemo, extendTime, hallLobby, nextStep, prevStep, setFocus, setRest, setReview, setSheet, setVideo, setQr } from '../../raid/actions';
  import { items, chainItems, bossItem } from '../../engine/lessons';
  import { clsLabel, isOld, maskName, roster, type Live } from '../../school/school';
  import { COLOR, kindOf, minOf, short } from '../teacher/flow';
  import { liveRoom, liveValue } from '../room.svelte';
  import { CAMP, CAMP_PROPS, dungeonOf, propPos } from '../manifest';
  import CampProp from '../camp/CampProp.svelte';
  import { portalOf } from '../camp/portal.svelte';
  import { feat } from '../../school/features.svelte';
  import { meLookId, useMe } from '../../store/me.svelte';
  import Sprite from '../Sprite.svelte';
  import DemoPhone from './DemoPhone.svelte';
  import QR from '../QR.svelte';
  import { AUTO_PC_NOTE, nextAuto, todaySlots } from '../../school/autoOpen';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import MyHero from '../camp/MyHero.svelte';
  import Anvil from '../forge/Anvil.svelte';
  import Dummy from '../dummy/Dummy.svelte';
  import Board from '../board/Board.svelte';
  import Castle from '../castle/Castle.svelte';
  import SymText from '../q/SymText.svelte';
  import PrepImg from '../q/PrepImg.svelte';
  import Vid from '../q/Vid.svelte';
  import { duck, hush, setMuteAll, sfx } from '../sound.svelte';
  import { setTeacherSink, teacherLook, TLOOK, type TLook } from '../../store/me.svelte';
  import { conceptParts, problemParts } from './cards';
  import Ink from './Ink.svelte';
  import Arena from './Arena.svelte';
  import { applyTheme, isTheme, type Theme } from '../../theme/theme';
  import ThemePicker from '../ThemePicker.svelte';
  import { driveFun, endRest, funOf, GAMES, gamesOn, startFun, stopFun, tvBeat, type Game } from '../../rest/run';
  import TdTV from '../rest/TdTV.svelte';
  import { bgm, bgmHold } from '../bgm';
  import { ladder } from '../../model/hero';
  import FunCrowd from '../rest/FunCrowd.svelte';
  import FunArena from '../rest/FunArena.svelte';
  import DrgTV from '../rest/DrgTV.svelte';
  import AjTV from '../rest/AjTV.svelte';
  import LgTV from '../rest/LgTV.svelte';
  import AkTV from '../rest/AkTV.svelte';
  import type { Lg } from '../../rest/landgrab';
  import type { Aj } from '../../rest/ajae';
  import type { Ak } from '../../rest/alkkagi';
  import type { Drg } from '../../rest/dragon';
  import FUNQ from '../../rest/funq.json';
  import { artUrl, FUN_BG } from '../manifest';
  import { balList, KIND, norm, QN, verdict, type Fun, type Kind } from '../../rest/fun';
  import { HINT as NUN_HINT, type Nun } from '../../rest/nunchi';

  // 🖥 교실 TV = 종합실 (#119 ⑮ · DECISIONS 「✅ ⑮ 교실 TV 컨펌」) — 정식 배치 그대로 + v1.0 색 · 글꼴
  //   위 막대 = 차시 · 단계 이름 · 단계 알약 · 시간 막대(👑 = 문 닫는 시각) · 🚪 코드 · 오른쪽 끝 🧙 · ⚙ 없음
  //   왼쪽 위 숫자 한 칸(같은 자리 · 같은 크기) · 오른쪽 위 정찰 상자 · 가운데 몬스터 + 체력 · 아래 용사 이름표 · 오른쪽 아래 조작 막대(3초 뒤 숨음 · 📌)
  //   정답 · 오답 글자 · 종합실 키는 TV 에 없음
  const { S, L, live, now, embed = false }: { S: Store; L: LessonPack; live: Live | null; now: number; /** 🖥 테스트 한 화면(교사 폰 위쪽 · 📜 2026-11-17 #21) = 화면 고정 대신 부모 폭 16:9 */ embed?: boolean } = $props();
  const unwake = holdWake(); onDestroy(unwake); // 📺 교실 TV = 화면 꺼짐 방지 (정식 screen-hall)
  const code = untrack(() => live?.code ?? '');
  const lr = untrack(() => (code ? liveRoom(S, code) : null));
  onDestroy(() => lr?.stop());
  const R = $derived((lr?.v.room ?? null) as Room | null);
  const stopDrive = untrack(() => (code ? driveFun(S, code, 'tv') : () => {})); // 🏕 놀이 시계는 TV 가 먼저 맡음 (#142)
  onDestroy(stopDrive);
  // 🏰 TV 가 켜져 있음 (디펜스 시작 조건 · 3초마다)
  const beatT = untrack(() => (code ? setInterval(() => tvBeat(S, code), 3000) : 0)); if (code) untrack(() => tvBeat(S, code));
  onDestroy(() => clearInterval(beatT));
  const M = useMe(9999, 30, true, true); // 👩‍🏫 교사 기록 = 따로 칸 (B안)
  // 👩‍🏫 교사 「내 용사」 = 서버 school/tlook (교사 폰 · 이 TV 교사 캠프 어디서 바꿔도 같음 · 📜 2026-11-14 🐞 「시연 캐릭터 ≠ 교사 모습」)
  setTeacherSink(S);
  let tlook = $state<TLook | null>(null);
  onDestroy(S.watch<TLook>(TLOOK, (v) => { tlook = v; if (v && v.hero != null) Object.assign(M.me, { hero: v.hero, enh: v.enh, socket: v.socket || {}, title: v.title || 'none' }); }));
  // 🎨 교실 TV 테마 = 이 TV 에서 따로 고름 (📜 2026-11-14 선생님 「TV 화면에서도 테마 설정 바꿀 수 있게 · TV 화면이랑 교사 폰이랑 테마 별개로」) · 이 TV 에 기억 · 색만(도트 테두리 · 바탕 그림 없음)
  const TVK = 'citadel-v1-tv-theme';
  let tvTheme = $state<Theme>((() => { try { const t = localStorage.getItem(TVK); return isTheme(t) ? t : 'gold'; } catch { return 'gold'; } })());
  let themeOpen = $state(false);
  $effect(() => { applyTheme(tvTheme, { tv: true }); });
  function pickTv(t: Theme) { tvTheme = t; try { localStorage.setItem(TVK, t); } catch { /* 무시 */ } themeOpen = false; }
  // 🧙 선생님 용사 (이 기기 · 학생 폰 「내 용사」와 같은 창)
  const pupils = $derived.by(() => { const nm = (R?.meta as { names?: Record<string, string> } | undefined)?.names || {}; const film = (R?.meta as { film?: boolean } | undefined)?.film === true; return live ? roster(live.cls, S).map((p) => { const n = nm[p.uid] ?? p.name; return { ...p, name: film ? maskName(n) : n }; }) : []; }); // 🎥 #150 촬영 모드 = 가린 이름 // 📜 2026-11-16 전체 이름 = 방 meta/names (교사가 열 때 적음)
  const ids = $derived(R ? activeIds(R, now) : []);
  const inSet = $derived(new Set(ids));
  const absent = $derived(R?.absent || {});
  const expected = $derived(pupils.filter((p) => !absent[p.uid]));
  // 「들어온 학생」 숫자 = 예전 그대로(봇 포함 · 📜 머리 정정 「20/1 은 버그 아님 · 가상 학생 봇」) · 대기실 줄에는 명단 밖 접속(봇)도 보임
  const tvWords = $derived(Object.entries(R?.words || {}).filter(([u, w]) => w && w.t && !w.bad && !R?.wordHide?.[u]).map(([u, w]) => ({ u, t: String(w!.t) })));
  const others = $derived(ids.filter((u) => !pupils.some((p) => p.uid === u)));
  let lobbyW = $state(0);
  const stuK = $derived(lobbyW ? Math.min(2.2, Math.max(1, lobbyW / 900)) : 1.3); // 학생 용사 = 대기실 폭에 맞춤 (1~2.2배)
  const tchK = $derived(stuK * 1.15); // 선생님 = 학생의 1.15배 (후광도 같이)
  const step = $derived(R ? stepOf(L, R) : null);
  const i = $derived(R ? stepIdx(R) : -1);
  const mid = $derived(step?.kind === 'monster' && L.monsters[step.id] ? step.id : null);
  let ccArm = $state(0);
  const ccOnTv = $derived(!!R && ccOpen(R, step, now)), rvTv = $derived(reviewStep(L, R, mid, now)); // ✔ · 🔎 막대 단추 (교사 폰과 같은 함수)
  const chain = $derived(!!R && !!mid && isChain(L, R, mid));
  const hp = $derived(R && mid ? monsterHp(L, R, mid, now) : null);
  const bhp = $derived(R && L.boss ? bossHp(L, R, now) : null);
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const left = $derived(R ? timeLeft(R, now) : null);
  const closeAt = $derived(R?.state.deadline ? R.state.deadline + (Number(R.state.extend) || 0) * 60e3 : null);
  const started = $derived(R?.state.stepAt && !isLobby(R as Room) ? (R as Room).state.stepAt : null);
  const nameOf = (u: string) => { const p = pupils.find((x) => x.uid === u); return p ? `${p.num} ${p.name}` : R?.players?.[u]?.nick ?? u; };
  const submitted = (u: string) => !!R && !!step && (step.kind === 'boss' ? bossState(L, R, u).some((x) => x.n > 0) : mid ? (chain ? chainRecord(L, R, mid, u).submitted : plainRecord(L, R, mid, u).submitted) : false);
  const lost = $derived(R ? Object.keys(R.players || {}).filter((u) => !R.players?.[u]?.teacher && !inSet.has(u) && !absent[u]) : []);
  const oldIds = $derived(R ? ids.filter((u) => isOld(R.players?.[u]?.ver)) : []);

  // ── 어떤 장면인가 ──
  let setOpen = $state(false), showRes = $state(false); // 🏫 학급 결과 = 끝난 수업의 마무리 화면 다시 (입장 대기 화면 단추)
  // 📅 입장 대기 화면: 다음 수업 · ⏰ 자동 열기 (📜 2026-11-17 #21 C · E)
  const nx = $derived(feat('schedule') ? todaySlots(S, now, PACKS).find((r) => r.next) ?? null : null);
  const nxa = $derived(feat('schedule') ? nextAuto(S, now, PACKS) : null);
  /** ⏰ 이 PC 가 교사 로그인인지 (now 따라 다시 봄 = 로그인하면 새로 고침 없이 바뀜) */
  const tvAdm = (_t: number) => S.kind !== 'server' || !!(S as Store & { isAdmin?: () => boolean }).isAdmin?.();
  const view = $derived(!R || R.state.closed ? (R && showRes ? 'end' : 'camp') : isLobby(R) ? (R.state.hall === 'lobby' ? 'lobby' : 'camp') : isEnd(L, R) ? 'end' : step?.kind === 'concept' || step?.kind === 'intro' ? 'concept' : 'battle'); // 📜 2026-11-16 도입 = 학습지 칸 그림(생각 열기 · 전시 확인)도 TV 에 (예전엔 배경 + 용사만)
  let demo = $state(false), tstrike = $state<{ ult: boolean; at: number; hero: number; fx: string; key?: string } | null>(null); // 🧑‍🏫 선생님 일격
  let ink = $state(false);
  // ✏ 판서 = 단계가 바뀌면(다음 ▶ · ◀ · 리모컨 · TV 어디서든) 저절로 꺼짐 (📜 11/17 선생님 「다음으로 누르면 필기 모드가 알아서 풀렸으면」 · ⓗ)
  let inkStep = -2;
  $effect(() => { const k = i; untrack(() => { if (inkStep !== -2 && k !== inkStep && ink) ink = false; inkStep = k; }); });
  let zoom = $state<0 | 1 | 2>(0);
  let hero = $state(false);
  (globalThis as { __tvStrikeSet?: (ult?: boolean) => void }).__tvStrikeSet = (ult = true) => { const lk = teacherLook(tlook); tstrike = { ult, at: Date.now(), hero: lk.hero, fx: lk.fx, key: `${R?.state.step}|${step?.id ?? ''}` }; }; // 화면 시험 고리 (시연 다 맞힘과 같은 길)
  $effect(() => { void i; untrack(() => { demo = false; zoom = 0; tstrike = null; }); }); // 단계가 바뀌면 시연 · 크게 보기 닫힘 · 🧑‍🏫 선생님 일격 비움(📜 2026-11-14 🐞 다음 몬스터에서 저절로 또 필살기 = 지난 일격이 남아 새 전투 장면이 다시 틈) (필기는 Ink 가 지움)
  // 🎮 시연 창 = 실제 전투(정찰 · 몬스터 공격 시계 · 학생 공격 연출) 멈춤 · 닫으면 그 자리에서 이어서 (📜 2026-11-14 선생님 「멈춤」 · 학생 풀기 · 제출 · 데미지는 그대로)
  $effect(() => { const d = demo, c = code; if (c) untrack(() => setDemo(S, c, d)); });

  // ── 🏕 쉼터 놀이 (#142 ⑤) ──
  const fun = $derived(funOf(R));
  const ff = $derived(fun && fun.kind !== 'nun' && (fun.kind as string) !== 'drg' && (fun.kind as string) !== 'aj' && (fun.kind as string) !== 'lg' && (fun.kind as string) !== 'ak' ? norm(fun as Fun) : null);
  const nn = $derived(fun && fun.kind === 'nun' ? (fun as unknown as Nun) : null);
  // 🔄 🙊 쉼터 무리(❓#2 B): 이름 = 번호 뺀 이름 · 번호 = 명단(없으면 방 기록) · TV 높이 1000 넘으면 용사 1.5배
  // 📵 끊긴 학생도 레이드 줄에 남김 (📜 2026-11-16 선생님 「접속이 끊기면 레이드 표시에서 사라진 점」) = 흐리게 + 📵 · 다시 들어오면 그대로 · 자리 = 번호 순(끊겨도 자리 안 바뀜)
  const arenaIds = $derived([...new Set([...ids, ...lost])].sort((a, b) => numOf(a) - numOf(b)));
  const nmOnly = (u: string) => { const p = pupils.find((x) => x.uid === u); return p ? p.name : R?.players?.[u]?.nick ?? u; };
  const numOf = (u: string) => pupils.find((x) => x.uid === u)?.num ?? Number((R?.players?.[u] as { num?: number } | undefined)?.num) ?? 0;
  let tvH = $state(720);
  const crowdK = $derived(tvH >= 1000 ? 1.5 : 1);
  // 🙊 정식 nunchi hall: 방금(1.8초) 일어난 일 = 용사 톡 · 말풍선 · 💥 동시 / ⌛ 마지막 큰 글 · 8초 넘게 조용하면 「⏳ 긴장감…」 · 응원 이모지가 떠오름
  const nnLast = $derived(nn ? (nn.ev || []).slice(-1)[0] ?? null : null);
  const nnFresh = $derived(nnLast && now - nnLast.at < 1800 ? { ...nnLast, u: Array.isArray(nnLast.u) ? nnLast.u : Object.values(nnLast.u || {}) as string[] } : null);
  const nnHint = $derived(!!nn && nn.phase === 'play' && now - (nn.lastAt || now) > NUN_HINT);
  const nnEmo = $derived(nn ? Object.values(((R as unknown as { nunE?: Record<string, Record<string, { e: string; at: number }>> } | null)?.nunE ?? {})[nn.g] ?? {}).slice(-12) : []);
  const nunPeople = $derived(nn && nn.phase !== 'end' && R ? [...Object.keys(nn.alive || {}), ...Object.keys(nn.out || {}).filter((u) => !(nn.alive || {})[u]), ...Object.keys(nn.zz || {}).filter((u) => !(nn.alive || {})[u] && !(nn.out || {})[u])].map((u) => ({ u, hero: R.players?.[u]?.hero ?? 0, num: numOf(u), name: nmOnly(u), st: ((nn.zz || {})[u] ? 'zz' : (nn.out || {})[u] ? 'out' : '') as '' | 'out' | 'zz', say: (nn.said || {})[u], ...(nnFresh && nnFresh.u.includes(u) ? { pop: nnFresh.k === 'say' ? `${nnFresh.n}!` : nnFresh.k === 'clash' ? '💥' : nnFresh.k === 'last' ? '⌛' : '⏳', popK: nnFresh.k } : {}) })).sort((a, b) => (a.st === 'out' ? 1 : 0) - (b.st === 'out' ? 1 : 0) || a.num - b.num) : []);
  const funZz = $derived(fun && fun.kind !== 'td' ? Object.keys((fun as { zz?: Record<string, number> }).zz || {}).length : 0); // 💤 관전 (정식 zzTag #57 ⑫)
  const fnow = $derived(fun?.frz != null ? Number(fun.frz) : now);
  const funSec = $derived(fun && fun.phase !== 'end' ? Math.max(0, Math.ceil(((fun.phase === 'show' ? (ff?.until ?? nn?.to ?? 0) : fun.to) - fnow) / 1000)) : 0);
  const funCat = $derived.by(() => { const k = ff && !ff.s && !ff.rps ? balList()[ff.qi]?.[2] ?? '' : ''; return k ? (FUNQ.cats as Record<string, string>)[k] ?? k : ''; }); // 폰과 같은 이름(🍜 음식)
  let funErr = $state(''), errT: ReturnType<typeof setTimeout> | null = null;
  // 🎵 TV 배경음 (#142-2): 🏕 쉼터 화면 · 놀이마다 곡 · 🔊 끄면 멈춤 · 쉼터 밖 = 없음(다른 장면 곡은 다음 판)
  // 🎵 종합실 배경음 (📜 2026-11-14 「배경음 전부 되살림」 · 정식 hall.js hallBgm 그대로): 대기실 lobby · 몬스터마다 raid-1 → 2 → 3 · 👑 보스 boss-1 / 2 (수업마다 번갈아)
  //   🎉 승리 win 한 번 · 🏕 쉼터 rest · 놀이 bal · rev · ox · nun · td · 개념 · 도입 · 수업 끝 = 없음 · 🎚 전투 음량 = 10% + 60% × (1 − 남은 체력)
  //   ⏸ 🎬 영상 · 📄 문제 창 = 멈춤 · 🔉 전투 중 🎮 시연 · 📄 문제 창 = 효과음 · 배경음 10% · 🔇 TV 소리 끔 · 이 기기 배경음 끔 = 곡 없음
  const bossAlt = (c: string) => { try { const key = 'citadel-boss-bgm', m = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>; if (m[c] == null) { m.n = (m.n || 0) + 1; m[c] = m.n % 2 ? 1 : 2; localStorage.setItem(key, JSON.stringify(m)); } return m[c]!; } catch { return 1; } };
  const tvSong = $derived.by((): { k: string | null; scale?: number } => {
    if (!R || R.state.closed) return { k: null };
    const sc = (h: { max: number; left: number } | null) => (h && h.max ? 0.1 + 0.6 * (1 - Math.max(0, h.left) / h.max) : 0.1);
    if (isLobby(R)) return { k: 'lobby' };
    if (R.state.rest) return { k: fun && fun.phase !== 'end' ? fun.kind : fun?.kind === 'td' ? 'td' : 'rest' };
    if (step?.kind === 'monster') { const n = L.steps.filter((x) => x.kind === 'monster').findIndex((x) => x.id === step.id); return { k: `raid-${(Math.max(0, n) % 3) + 1}`, scale: sc(hp) }; }
    if (step?.kind === 'boss') return bhp?.won ? { k: 'win' } : { k: `boss-${untrack(() => bossAlt(code || 'local'))}`, scale: sc(bhp) };
    if (isEnd(L, R) && bhp?.won) return { k: 'win' };
    return { k: null };
  });
  $effect(() => { setMuteAll(!sound); try { localStorage.setItem('tv-sound', sound ? '1' : '0'); } catch { /* 사생활 창 */ } return () => setMuteAll(false); }); // 🔇 TV 소리 끔 = 효과음도 전부 (#44 ⑤)
  $effect(() => { const t = tvSong; bgm(sound ? t.k : null, 'tv', t.scale != null ? { scale: t.scale } : {}); });
  $effect(() => { bgmHold('tv', !!(R && !R.state.closed && (R.state.video || R.state.sheet))); });
  $effect(() => { duck('tv-demo', !!(R && !R.state.closed && (step?.kind === 'monster' || step?.kind === 'boss') && (demo || !!R.state.sheet))); });
  $effect(() => { hush('tv-video', !!(R && !R.state.closed && R.state.video)); }); // 🐞 11/19 ③ A안: 🎬 영상 동안 효과음 끔
  onDestroy(() => { bgm(null, 'tv'); bgmHold('tv', false); duck('tv-demo', false); hush('tv-video', false); });
  function playGame(k: Game) {
    if (!R) return;
    if (fun && fun.kind === k && fun.phase !== 'end') { stopFun(S, code); return; }
    const e = startFun(S, code, R, k, { which: 'now', no: L.no, me: 'tv' });
    funErr = e ?? ''; if (errT) clearTimeout(errT); if (e) errT = setTimeout(() => (funErr = ''), 3000);
  }

  // ── 왼쪽 위 숫자 한 칸 ──
  const box = $derived.by(() => {
    if (!R) return null;
    if (R.state.rest && view !== 'camp' && fun && (fun.kind as string) === 'td') { // 🏰 디펜스: 자리 고름 · ❤ 생명
      const tf = fun as unknown as { g: number; phase: string; res?: { life: number } }, X = R as unknown as { tdp?: Record<string, Record<string, string>>; tdl?: Record<string, { life?: number }> };
      if (tf.phase === 'pick') return { ic: '🏰', lab: '자리 고름', n: Object.keys(X.tdp?.[tf.g] || {}).length, m: ids.length, sub: '' };
      return { ic: '❤', lab: '성 생명', n: tf.phase === 'end' ? tf.res?.life ?? 0 : X.tdl?.[tf.g]?.life ?? 30, m: 30, sub: '' };
    }
    if (R.state.rest && view !== 'camp' && fun) {
      if ((fun.kind as string) === 'drg') { const d = fun as unknown as { g: number; round: number }, pr = (R as unknown as { dg?: Record<string, Record<string, Record<string, { f?: number }>>> }).dg?.[d.g]?.[d.round] || {}; return { ic: '🏁', lab: '들어옴', n: Object.values(pr).filter((x) => x?.f != null).length, m: Object.keys(fun.alive || {}).length, sub: '' }; } // 🐉 #25
      if ((fun.kind as string) === 'ak') { const k = fun as unknown as { g: number; st?: Record<string, unknown> }; return { ic: '🥏', lab: '참가', n: Object.keys(k.st || {}).length || Object.keys(((R as unknown as { fv?: Record<string, Record<string, unknown>> }).fv?.[`ak${k.g}_j`]) || {}).length, m: ids.length, sub: '' }; }
      if ((fun.kind as string) === 'lg') { const l = fun as unknown as { g: number; team?: Record<string, number> }; return { ic: '🏁', lab: '참가', n: Object.keys(l.team || {}).length || Object.keys(((R as unknown as { fv?: Record<string, Record<string, unknown>> }).fv?.[`lg${l.g}_j`]) || {}).length, m: ids.length, sub: '' }; }
      if ((fun.kind as string) === 'aj') { const a = fun as unknown as { rk: string; total: number }; return { ic: '😆', lab: '답 낸 학생', n: Object.values(((R as unknown as { fv?: Record<string, Record<string, unknown>> }).fv?.[a.rk]) || {}).length, m: Object.keys(fun.alive || {}).length, sub: '' }; } // 😆 고른 학생 수(맞힘 · 틀림 다 포함 = 답을 낸 학생)
      if (fun.kind === 'quiz') return { ic: '⭕', lab: '고른 학생', n: Object.keys((R as unknown as { fv?: Record<string, Record<string, string>> }).fv?.[ff?.rk ?? ''] || {}).length, m: Object.keys(fun.alive || {}).length, sub: '' };
      return { ic: '🧍', lab: '살아남음', n: Object.keys(fun.alive || {}).length, m: nn ? Object.keys(nn.alive || {}).length + Object.keys(nn.zz || {}).length : ff?.total ?? 0, sub: '' };
    }
    if (R.state.rest && view !== 'camp') return { ic: '📱', lab: '입장', n: ids.length, m: expected.length, sub: '' };
    if (view === 'concept') return null;
    if (view === 'camp') return { ic: '📱', lab: '입장한 학생', n: ids.length, m: expected.length, sub: '' };
    if (view === 'lobby') return { ic: '⚔', lab: '들어온 학생', n: ids.length, m: expected.length, sub: [keysOf(L).length ? `🔑 열쇠 ${keyBoard(L, R, ids).all} / ${ids.length}` : '', oldIds.length ? `🔄 옛 판 ${oldIds.map(nameOf).join(' · ')}` : '', expected.length > ids.length ? `⏳ ${expected.filter((p) => !inSet.has(p.uid)).map((p) => p.name).slice(0, 4).join(' · ')}${expected.length - ids.length > 4 ? ' …' : ''}` : ''].filter(Boolean).join('  ') };
    if (scout?.on) return { ic: '✋', lab: '준비 완료', n: Object.keys(R.ready?.[scout.id] || {}).length, m: ids.length, sub: '' };
    if (view === 'end') return { ic: '✔', lab: '참여', n: ids.length, m: expected.length, sub: '' };
    return { ic: '✔', lab: '제출', n: ids.filter(submitted).length, m: ids.length, sub: lost.length ? `📵 끊김 ${lost.map(nameOf).join(' · ')}` : '' };
  });

  // ── 정찰 +30초 = 교사 폰에만 (📺 시안 · 선생님 「2번 교사 폰에만」 2026-11-14) · TV 는 남은 초만 바뀜 ──

  // ── 👑 문 닫기 (정식 #68 A): 마감이 되면 장면 · +5분을 아직 안 썼으면 30초 묻기 · 지나면 수업 끝 ──
  $effect(() => { if (R && !R.state.closed && !isLobby(R) && left === 0 && !R.state.door) untrack(() => doorStart(S, code)); });
  const door = $derived(R?.state.door ?? null);
  // 🔊 효과음 2차 (📜 2026-11-14): TV = 수업 시작 · 정찰 시작(그림자) · 몬스터 등장(일반 P · 보스 A) · 🔴 집중 · 👑 문 닫힘 — 상태가 바뀐 순간 한 번
  let sndKey = { lobby: true, scout: '', focus: false, door: false };
  $effect(() => {
    const Rv = R; if (!Rv) return; const lob = isLobby(Rv), sc = scout?.on ? `${Rv.state.step}` : '', fo = !!Rv.state.focus, dr = !!Rv.state.door, stp = step;
    untrack(() => {
      const k = sndKey;
      if (k.lobby && !lob) sfx('class-start', 0.8);
      if (sc && sc !== k.scout) sfx('scout-start', 0.7);
      if (!sc && k.scout && k.scout === `${Rv.state.step}`) sfx(stp?.kind === 'boss' ? 'mon-appear-boss' : 'mon-appear', 0.85);
      if (fo && !k.focus) sfx('focus', 0.8);
      if (dr && !k.door) sfx('door-close', 0.85);
      sndKey = { lobby: lob, scout: sc, focus: fo, door: dr };
    });
  });
  const askLeft = $derived(door ? Math.max(0, 30 - Math.floor((now - door.at) / 1000)) : 0);
  $effect(() => { if (R && door && !R.state.closed && (door.ask ? askLeft <= 0 : now - door.at > 3000)) untrack(() => endClass(S, L, code)); });
  const extShow = $derived(!!R?.state.doorExt && now - Number(R.state.doorExt) < 3500);
  // 🎯 복습으로 보냄 (📜 2026-11-16 · A): 새로 보낸 몬스터 · 👑 = 허수아비 쪽으로 날아감 「복습 던전으로 이동!」 6초
  let sendSeen: string[] | null = null, sendShow = $state<{ names: string[]; at: number } | null>(null);
  $effect(() => { const ks = Object.keys(sentOf(R)); untrack(() => { if (sendSeen === null) { sendSeen = ks; return; } const nw = ks.filter((k) => !sendSeen!.includes(k)); sendSeen = ks; if (!nw.length) return; const names = nw.map((k) => (k === 'boss' ? '👑 형성평가' : (L.steps.find((s) => s.id === k)?.title ?? k).split(' · ').pop()!)); sendShow = { names, at: Date.now() }; setTimeout(() => { if (sendShow && Date.now() - sendShow.at >= 5900) sendShow = null; }, 6000); }); });
  // ⚔ 선제 공격 (📜 2026-11-16 · 🌊 ③): 첫 몬스터가 나오고 7초 · 이름 없이 수만
  const backShow = $derived.by(() => { if (!R || !mid || !L.carryOf?.[mid] || now - Number(R.state.stepAt) >= 7000) return ''; const [h = '', no = ''] = (L.steps.find((x) => x.id === mid)?.title ?? '').split(' · '); return `${no} ${h.replace(/^⏪\s*/, '')}`.trim(); }); // 📦 B 넘어온 몬스터 첫 7초
  const preShow = $derived(!!(R && mid && hp && (hp.pre ?? 0) > 0 && R.meta.pre?.mid === mid && now - Number(R.state.stepAt) < 7000));
  const giftShow = $derived(!!R?.state.gift && now - Number(R.state.gift.at) < 4000);

  // ── 조작 막대 (마우스 · 터치로 나타나고 3초 뒤 숨음 · 📌 고정) ──
  let dockAt = $state(Date.now()), pin = $state(false), mini = $state(false), sound = $state((() => { try { return localStorage.getItem('tv-sound') !== '0'; } catch { return true; } })()); // 🔇 이 TV 기억 (#44 ⑤ 새로 고침해도 끈 채로)
  const dockOn = true; // 🚨 2026-11-16 핫픽스(정식 b210) 선생님 「리모컨 안 나와 · 리모컨은 그냥 계속 표시되게」 = 조작 막대 늘 보임 · 늘 누름 (마우스 없는 터치 교실 PC)
  const poke = () => (dockAt = Date.now());
  let offTip = $state(''); $effect(() => { if (!offTip) return; const t = setTimeout(() => (offTip = ''), 1800); return () => clearTimeout(t); }); // 꺼진 칸 누름 = 「⚙ 기능에서 켜요」
  const goLabel = $derived(!R ? '' : view === 'camp' && isLobby(R) ? '⚔ 던전 입장' : isLobby(R) ? '▶ 수업 시작' : scout?.on ? '⚔ 지금 등장' : '앞으로 ▶'); // 🌫 정찰 중 = 리모컨과 같게 「⚔ 지금 등장」 (🐞 2026-11-14 · 예전엔 몬스터를 건너뜀)
  const goSub = $derived(!R ? '' : view === 'camp' && isLobby(R) ? '반 전체 던전 대기실로' : scout?.on ? `정찰 끝 · ${short(step)}` : short(L.steps[R.meta.resumeFrom != null && isLobby(R) ? R.meta.resumeFrom : nextIdx(L, R)]) || '마무리');
  function go() {
    if (!R) return;
    if (view === 'camp' && isLobby(R)) { hallLobby(S, code); return; }
    if (R.state.rest) endRest(S, code); // 🏕 쉼터 중 「앞으로 ▶」 = 쉼터 끝 + 수업으로 (#142)
    else if (scout?.on) { appearNow(S, L, code); return; } // 🌫 정찰 중 = 지금 등장
    nextStep(S, L, code);
  }
  function full() { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); }
  // ⛶ (📜 2026-11-17 #20 「전체화면 버튼 던전입장 리모컨 옆에」): 막대의 앞으로 · 던전 입장 단추 바로 옆 한 곳 · 설정 창에서는 뺌
  let isFull = $state(typeof document !== 'undefined' && !!document.fullscreenElement);
  $effect(() => { const f = () => (isFull = !!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); });
  // 📄 문제 창 · 📖 개념 오른쪽 = 학생 폰과 같은 함수(🪞) · 첫 판 숫자
  const nextMon = $derived(step ? L.steps.slice(i).find((s) => s.kind === 'monster' || s.kind === 'boss') ?? null : null);
  const qsOf = (id: string) => (id === BOSS_ID ? (L.boss ? Array.from({ length: L.boss.items }, (_, k) => k).filter((k) => !bossDrop(L, R).includes(k)).map((k) => bossItem(L, `${code}|tv`, k, 0)).filter((q): q is NonNullable<typeof q> => !!q) : []) : L.monsters[id]?.chain ? chainItems(L, id, `${code}|tv`, 0) : items(L, id, `${code}|tv`, 0));
  const tvRev = $derived.by(() => { const v = R?.state.review; if (!v || !mid || v.mid !== mid) return null; return reviewsOf(L, mid).find((x) => x.i === v.i && x.k === v.k)?.r ?? null; });
  const sheetQs = $derived(R?.state.sheet ? (L.steps.find((s) => s.id === R.state.sheet)?.kind === 'concept' && nextMon ? qsOf(nextMon.kind === 'boss' ? BOSS_ID : nextMon.id) : qsOf(R.state.sheet)) : []);
  // 위 막대 흐름도 · 남은 시간 선 (#119 덧붙임 3 · 4 · 6)
  const topic = $derived(L.title.split(' · ')[0] ?? L.title);
  const flowSteps = $derived(L.steps.map((s, k) => ({ s, k })).filter((x) => !x.s.later));
  const tline = $derived(view !== 'camp' && view !== 'lobby' && started && closeAt && left != null ? { p: Math.max(0, Math.min(1, (now - started) / (closeAt - started))), red: !!door || left <= 5 * 60e3 } : null);
  const restLeft = $derived(R?.state.rest ? Math.max(0, R.state.rest.at + R.state.rest.min * 60e3 - now) : 0);
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  // 🏕 교사 캠프 = 학생 캠프와 같은 자리표(manifest CAMP_PROPS · 🔨 「캠프라는 캠프는 모두 지침대로」) · 물건 그림 + 바로 아래 이름표(늘 보임) · 꺼진 기능 = 그 자리만 비움
  const PNAME: Record<string, string> = { anvil: '⚒ 모루', scare: '🎯 허수아비', dummy: '📋 게시판', mail: '📮 우편함', tent: '✏ 출제 공방' };
  const tvProps = $derived(CAMP_PROPS.filter((p) => !p.feat || feat(p.feat)));
  const zoneLab = (k: string) => { const z = CAMP.zones[k]!; return { x: ((z[0] + z[2]) / 2 / CAMP.size[0]) * 100, y: ((k === 'tent' ? z[1] + 40 : z[3]) / CAMP.size[1]) * 100 }; }; // 출제 공방 = 텐트 위 (학생 캠프와 같게)
  // 📺 시안 (2026-11-14): 물건 이름표 아래 부제 = 실제 상태 (성채 열린 층 · 이번 차시 · 허수아비 복습 범위 · 모루 카드 수)
  const floorsOpen = (SUBJ.camp?.floors ?? []).filter((f) => !f.off).length;
  const revNos = $derived(PACKS.filter((p) => (p.steps.some((x) => x.kind === 'monster') || p.boss) && p.no < L.no).map((p) => p.no));
  const SUBS = $derived<Record<string, string>>({ castle: (() => { const t = (SUBJ.camp?.castleSub ?? '').split(' · ').pop() ?? ''; return floorsOpen ? `${floorsOpen}층 열림${t ? ` · ${t}` : ''}` : t; })(), gate: `${L.no}차시 던전${R && !R.state.closed ? ' · 열림' : ''}`, scare: revNos.length ? `복습 ${Math.min(...revNos)}~${Math.max(...revNos)}차시` : '복습', anvil: `연성 ${SUBJ.forge?.unit.CARDS.length ?? 0}장` });
  const ZONES = $derived([['castle', '🏰 성채던전', feat('citadel')], ['tent', '✏ 출제 공방', feat('author')], ['gate', '🌀 차원문', true]].filter((z) => z[2]) as [string, string, boolean][]);
  const portal = untrack(() => portalOf(S)); onDestroy(portal.stop);
  // 🧙 캠프 그림 속 선생님 용사 = 그림 폭에 맞춰 (그림 폭 512 = 2배 · 창이 작거나 폰으로 보면 같이 작아짐 · 🐛 2026-11-13 밤 선생님 캡처 「용사가 캠프 그림을 덮음」)
  let campW = $state(0);
  // 🐞 2026-11-15 「교사 크기 조정」: 예전 campW/256 = 학생 캠프의 1.5배 → 학생 캠프와 같은 비율(장면 폭 390 에 용사 80px) · 후광도 같은 함수(aura)라 같이 줄어듦
  const heroK = $derived(campW ? Math.max(0.5, campW / 390) : 2);
  // 🖱 TV(PC) 교사 캠프 물건 누르기 (🐞 2026-11-15 「오브젝트 상호작용 · 던전 입장 안 됨」 = 예전엔 그림뿐이었음) · 옛 정식처럼 수업이 열려 있어도 열림
  //   모루 · 허수아비 · 게시판 · 성채 = 내 용사처럼 가운데 창(교사 기록 · B안) · 차원문 = 수업 들어가기(⚔ 던전 입장과 같음) · 우편함 = 교사는 소식 탭(리모컨)이라 반응만
  let tvSheet = $state<'' | 'anvil' | 'scare' | 'dummy' | 'castle'>('');
  function tvTap(k: string) {
    if (k === 'gate') { if (R && !R.state.closed) go(); return; }
    if (k === 'anvil' || k === 'scare' || k === 'dummy' || k === 'castle') { fit(); tvSheet = k; }
  }
  let fireF = $state(0); const fireT = setInterval(() => (fireF = (fireF + 1) % CAMP.fire.frames), CAMP.fire.ms); onDestroy(() => clearInterval(fireT));
  let hk = $state(1);
  const fit = () => (hk = Math.min(1.3, (innerHeight * 0.86) / 760));
  const [CW, CH] = CAMP.size;
  const pct = (v: number, tot: number) => `${((100 * v) / tot).toFixed(2)}%`;
  const site = siteUrl(); // 🔗 지금 열린 사이트 (🐞 QR 이 「…github.io./」 로 가던 것)
  // 화면 시험 고리(#157 · 학생 화면엔 없음 · 출시 전 메모 5): 가상 학생 n명이 이 방에 들어와 있음(2초마다 접속 신호)
  let fakeN = $state(0);
  (globalThis as { __tvFake?: (n: number) => void }).__tvFake = (n: number) => { fakeN = n; };
  // 🌙 갤러리 「📺 TV 모습」(?demo=twin · 테스트 모드만): 가상 학생 1명 → 첫 몬스터까지 → 3.5초마다 쌍월 참(필살기 · 새 엔진 ?newfx&twin=) 한 번
  if (typeof location !== 'undefined' && /[?&]demo=twin\b/.test(location.search) && /[?&]mode=test\b/.test(location.search)) {
    fakeN = 1;
    const adv = () => { const RR = R; if (!RR) return; if (step && (step.kind === 'monster' || step.kind === 'boss')) return true; go(); return false; };
    let n = 0; const t1 = setInterval(() => { if (adv() || ++n > 12) { clearInterval(t1); setInterval(() => (globalThis as { __tvAtk?: (k: number, kind?: string, dmg?: number, fx?: string, ult?: boolean, now?: boolean) => void }).__tvAtk?.(0, 'hit', 3, 'twin', true, true), 3500); } }, 900);
  }
  $effect(() => {
    const n = fakeN; if (!n || !code) return;
    const beat = () => { for (let k = 0; k < n; k++) { const b = `rooms/${code}/players/fake${k}`; S.set(`${b}/num`, 101 + k); S.set(`${b}/nick`, `가상${k + 1}`); S.set(`${b}/hero`, k % 31); S.set(`${b}/fx`, ladder(k % 31)[(k * 3) % 4]); S.set(`${b}/enh`, (k * 3) % 11); S.set(`${b}/seen`, S.now()); } }; // ⚔ 가상 용사 = 스킬 · 강화도 섞음 (TV 이펙트 · 오라 시험)
    beat(); const t = setInterval(beat, 2000); return () => clearInterval(t);
  });
</script>

<svelte:window bind:innerHeight={tvH} onmousemove={poke} ontouchstart={poke} onkeydown={poke} onresize={fit} />
{#if !embed}<div class="tvout" style:background-image="url({CAMP.bg})" aria-hidden="true"></div>{/if}
<div class="tv" class:emb={embed} class:dim={!!R?.state.focus}>
  <div class="bg" style:background-image="url({view === 'camp' ? CAMP.bg : dungeonOf(L.theme)})" class:campbg={view === 'camp'}></div>

  <!-- 위 막대 (#119 덧붙임 3 · 7 · 9): 반 칩 · n차시 + 소단원 주제 · 흐름도(리모컨 단계 막대와 같은 함수) · 🚪 코드 · ⛺ 내 캠프 / 아래 가장자리 = 남은 시간 선 -->
  <header class="top">
    <span class="ttl">{#if view === 'camp' && (!R || R.state.closed)}📺 입장 대기{:else}{#if live}<span class="cls">{clsLabel(S, live.cls)}</span>{/if}{#if view === 'camp'}📺 입장 대기 · {/if}{L.no}차시 <b>{topic}</b>{/if}</span>
    <div class="tflow" class:dim={view === 'lobby'} class:hide={view === 'camp'} aria-label="오늘 흐름">
      {#each flowSteps as x (x.s.id)}<span class="fs" class:ok={x.k < i} class:now={x.k === i} style:flex={Math.max(1, minOf(L, R, x.s))} style:--c={COLOR[kindOf(L, R, x.s)]}><i></i><em>{x.s.kind === 'boss' ? '👑 형성평가' : short(x.s)}</em></span>{/each}
    </div>
    {#if view !== 'camp'}<span class="code">🚪 코드<b>{code}</b></span>{/if}
    <!-- ⚙ 설정 (📜 2026-11-14 선생님 「맨 위에 내 캠프 자리를 설정으로 · 내 캠프 · 테마 · 처음으로 · 전체 화면 · 소리」) — 아래 막대엔 도구 · 진행 · 📌 고정만 -->
    <button type="button" class="gear" data-k="tvset" aria-label="설정" aria-expanded={setOpen} onclick={(e) => { e.stopPropagation(); setOpen = !setOpen; }}>⚙</button>
    <!-- ⛺ 둥근 캠프 단추 없앰 (선생님 「저 버튼은 없어도 돼」 · 캠프 보기 = 조작 막대 🏕) -->
    {#if tline}
      <div class="tline" class:red={!!door} style:--p="{tline.p * 100}%">
        <i></i><em class:still={!!R?.state.focus}>⏳</em>
        <span class="tlt" class:red={tline.red}>남은 {mmss(left ?? 0)}</span>
        <b>👑</b>
      </div>
    {/if}
  </header>

  <!-- 왼쪽 위 숫자 한 칸 -->
  {#if box}
    <div class="nbox" class:over={!!R?.state.rest && !R?.state.focus} aria-label="{box.lab} {box.n} / {box.m}"><small>{box.ic} {box.lab}</small><b>{box.n}<span> / {box.m}</span></b>{#if box.sub}<em>{box.sub}</em>{/if}</div>
  {/if}

  {#if view === 'camp'}
    <!-- 📺 종합실 = 입장 대기 화면 (📜 2026-11-17 #21 C · 옛 TV 교사 캠프 대신 · 교사 캠프 = 교사 폰 「나 → ⛺ 내 캠프」에만) -->
    <div class="entry" data-k="tv-entry">
      <div class="eqr">
        <QR text={R && !R.state.closed ? `${site}?join=${encodeURIComponent(code)}` : site} size={360} />
        <small>📱 휴대폰 카메라로 찍어요 · 반 · 번호로 로그인</small>
        {#if R && !R.state.closed}<div class="ecode">수업 코드 <b>{code}</b></div>{/if}
      </div>
      <div class="einfo">
        {#if R && !R.state.closed && live}
          <span class="etag">오늘 수업</span>
          <b class="ecls" data-k="entry-cls">{clsLabel(S, live.cls)} · {L.no}차시</b>
          <span class="ettl">{topic}</span>
          <div class="ein" data-k="entry-n">들어온 학생 <b>{box?.n ?? 0}</b><small> / {box?.m ?? 0}</small></div>
          <p class="ewait">선생님이 「⚔ 던전 입장」을 누르면 시작해요</p>
        {:else}
          {#if nx}
            <span class="etag">다음 수업 · {nx.p}교시 {nx.hm}</span>
            <b class="ecls" data-k="entry-cls">{nx.cls}반 · {nx.L ? `${nx.L.no}차시` : ''}</b>
            {#if nx.L}<span class="ettl">{nx.L.title.split(' · ')[0]}</span>{/if}
          {:else}
            <span class="etag">모두의 던전</span>
            <b class="ecls" data-k="entry-cls">입장 대기</b>
          {/if}
          <p class="ewait" data-k="entry-wait">선생님이 수업을 열면 시작해요</p>
          {#if S.kind !== 'memory'}<div class="ewar"><WarBar {S} line /></div>{/if}
          {#if nxa}<p class="eauto" data-k="entry-auto">⏰ 다음 자동 열기 {nxa.hm} · {nxa.cls}반 {nxa.L?.no}차시<br /><small>{tvAdm(now) ? '이 PC (교사 로그인) · 교사 폰 중 먼저 켜진 쪽이 열어요' : AUTO_PC_NOTE}</small></p>{/if}
        {/if}
        <div class="ebtn">
          {#if R && R.state.closed}<button type="button" data-k="tv-result" onclick={() => (showRes = true)}>🏫 학급 결과</button>{/if}
          <button type="button" data-k="tv-full2" onclick={full}>⛶ {isFull ? '창으로' : '전체 화면'}</button>
        </div>
      </div>
    </div>
  {:else if view === 'lobby'}
    <!-- ⚔ 던전 대기실: 선생님 용사 둘레에 학생 용사 두 줄 · 선생님 말풍선 -->
    <!-- 🐞 2026-11-15 「교사 위치 · 크기」: 선생님 = 앞쪽 바닥 · 학생의 1.15배 · 말풍선은 옆(후광과 안 겹침) / 학생 = 뒤쪽 줄 · 대기실 폭에 맞춘 크기 · 명단 밖 접속(그 밖)도 줄에 -->
    <div class="lring" bind:clientWidth={lobbyW}>
      <div class="rows">{#each expected as p (p.uid)}<div class="h" class:nin={!inSet.has(p.uid)}><HeroSprite id={R?.players?.[p.uid]?.hero ?? 0} scale={stuK} dim={!inSet.has(p.uid)} /><span>{expOf(R, p.uid) ? '🔥 ' : ''}{p.num} {p.name}</span></div>{/each}{#each others as u (u)}<div class="h oth"><HeroSprite id={R?.players?.[u]?.hero ?? 0} scale={stuK} /><span>{nameOf(u)}</span></div>{/each}</div>
      <div class="tchr"><HeroSprite id={meLookId(M.me)} scale={tchK} aura={M.me.enh} pose="idle" /><div class="tside"><em class="bub">{R?.state.bubble || `${L.no}차시 던전에 온 걸 환영하네!`}</em><span>🧙 선생님</span></div></div>
    </div>
  {:else if view === 'concept' && step}
    <!-- 📖 개념 = 2분할 (왼 개념 · 오른 문제 · 누르면 크게) -->
    <div class="split" class:z1={zoom === 1} class:z2={zoom === 2}>
      <div class="cpane" role="button" tabindex="0" onclick={() => (zoom = zoom === 1 ? 0 : 1)} onkeydown={(e) => { if (e.key === 'Enter') zoom = zoom === 1 ? 0 : 1; }}><span class="lab">{step.kind === 'intro' ? short(step) : `${short(step)} · 개념`}</span><div class="pimg"><PrepImg zoom={false} {S} {L} id={step.img ?? step.id} fb={step.id} alt={short(step)}>{@const cp = conceptParts(step.say ?? '')}<h4>{step.title.split(' · ').slice(1).join(' · ') || step.title}</h4>{#each cp.boxes as f (f)}<div class="fbox"><SymText text={f} /></div>{/each}{#each cp.lines as t (t)}<p class="sum"><SymText text={t} /></p>{/each}</PrepImg></div><em class="zm">{zoom === 1 ? '⤡ 누르면 작게' : '⤢ 누르면 크게'}</em></div>
      {#if nextMon}
        {@const qs = qsOf(nextMon.kind === 'boss' ? BOSS_ID : nextMon.id)}
        <div class="cpane" role="button" tabindex="0" onclick={() => (zoom = zoom === 2 ? 0 : 2)} onkeydown={(e) => { if (e.key === 'Enter') zoom = zoom === 2 ? 0 : 2; }}><span class="lab">{short(nextMon)} · 문제</span><div class="pimg qpaper"><PrepImg zoom={false} {S} {L} id={nextMon.kind === 'boss' ? BOSS_ID : nextMon.id} alt="{short(nextMon)} 문제">{@const pp = problemParts(qs.slice(0, 4).map((q) => q.question))}{#if pp.head.length}<div class="qhead">{#each pp.head as h (h)}<b><SymText text={h} /></b>{/each}</div>{/if}{#each pp.items as t, k (k)}<p class="qi"><SymText text={t} /></p>{/each}</PrepImg></div><em class="zm">{zoom === 2 ? '⤡ 누르면 작게' : '⤢ 누르면 크게'}</em></div>
      {/if}
    </div>
  {:else if view === 'end'}
    <div class="endv"><b>{bhp?.won ? '🏆 승리!' : '🏁 마무리'}</b><p>{ids.length}명이 함께했어요 · 결과는 학생 폰에</p>{#each Object.entries(R?.players ?? {}).flatMap(([u, p]) => ((p as { ach?: { id: string; name: string; title: string }[] }).ach ?? []).map((a) => ({ u, a }))) as x (x.u + x.a.id)}<p class="legach" data-k="tv-legach">🏆 {nameOf(x.u)} 용사 『{x.a.title || x.a.name}』 달성!</p>{/each}<!-- 🏆 #73 👑 전설 달성만 --> {#if R && explorers(R).length}<p class="expl" data-k="tv-explore">🔥 탐사대 {explorers(R).length}명 = 예습한 용사</p>{/if}<!-- 🔥 #67 -->
      <!-- 💬 마지막 한마디 말풍선 (정식 hall.js 마무리 · 거른 말 · 선생님이 숨긴 말 = 안 보임) -->
      {#if tvWords.length}<div class="wbubs" data-k="tv-words">{#each tvWords as w (w.u)}<span class="wb"><em style="font-family: var(--font-plain)">{w.t}</em><small>{nameOf(w.u)}</small></span>{/each}</div>{:else}<p class="wwait">💬 학생 폰에서 마지막 한마디를 남겨요</p>{/if}</div>
  {:else if step && R}
    <!-- ⚔ 전투: 몬스터 + 머리 위 체력 · 아래 용사 이름표 -->
    <!-- ⚔ 전투 (#157): PixiJS 캔버스 장면(몬스터 크게 · 머리 위 굵은 체력 · 용사단 · 공격 연출) · WebGL 없으면 같은 배치 DOM -->
    <Arena {L} R={R as Room} {step} {now} ids={arenaIds} {nameOf} {submitted} lost={new Set(lost)} split={demo} shadow={!!scout?.on} {tstrike} quiet={!sound} />
    {#if scout?.on}
      <div class="sc"><div class="q">🌫 정찰 — {L.carryOf?.[step.id] ? `${step.title.split(' · ')[1] ?? ''} ` : ''}학습지 「{short(step)}」을 먼저 풀어요</div><div class="r">등장까지 <b>{Math.ceil(scout.left / 1000)}</b>초</div></div>
    {/if}
    {#if demo}<div class="demoban" role="status" data-k="demo-ban">🎮 시연 중 · 전투 잠시 멈춤</div>{/if}
    {#if demo}<div class="dpane"><DemoPhone {L} R={R as Room} {code} {tlook} onclose={() => (demo = false)} onstrike={(ult) => { const lk = teacherLook(tlook); tstrike = { ult, at: Date.now(), hero: lk.hero, fx: lk.fx, key: `${R?.state.step}|${step?.id ?? ''}` }; demo = false; }} /></div>{/if}
  {/if}

  <!-- 덮개: 🔴 집중 · 🏕 쉼터 · 📄 문제 · 🎬 영상 · 👑 문 닫기 · 🎁 선물 -->
  {#if R?.state.sheet && sheetQs.length}
    {@const sid = L.steps.find((s) => s.id === R.state.sheet)?.kind === 'concept' && nextMon ? (nextMon.kind === 'boss' ? BOSS_ID : nextMon.id) : R.state.sheet}
    <div class="ov sheet"><b>📄 {short(L.steps.find((s) => s.id === R.state.sheet))}</b><div class="simg qpaper"><PrepImg {S} {L} id={sid} alt="학습지 문제" zoom={false}>{@const sp = problemParts(sheetQs.slice(0, 6).map((q) => q.question))}{#if sp.head.length}<div class="qhead">{#each sp.head as h (h)}<b><SymText text={h} /></b>{/each}</div>{/if}{#each sp.items as t, k (k)}<p><SymText text={t} /></p>{/each}</PrepImg></div></div>
  {/if}
  {#if R?.state.recall}{@const cs = L.steps.find((s) => s.id === R.state.recall && s.kind === 'concept')}{#if cs}
    <!-- 📊 길잡이 ⑤ 지난 개념 칸 다시 보기 (리모컨 단추 · 다시 누르거나 단계를 옮기면 닫힘) -->
    <div class="ov sheet recall" data-k="tv-recall"><b>📺 {short(cs)} · 다시 보기</b><div class="simg pimg"><PrepImg zoom={false} {S} {L} id={cs.img ?? cs.id} fb={cs.id} alt={short(cs)}>{@const cp = conceptParts(cs.say ?? '')}<h4>{cs.title.split(' · ').slice(1).join(' · ') || cs.title}</h4>{#each cp.boxes as f (f)}<div class="fbox"><SymText text={f} /></div>{/each}{#each cp.lines as t (t)}<p class="sum"><SymText text={t} /></p>{/each}</PrepImg></div></div>
  {/if}{/if}
  {#if R && step && ccOpen(R, step, now)}<div class="ccband" data-k="tv-cc" role="status">✔ 개념 체크 · 준비 완료 <b>{ccStats(R, step).n}</b> / {ids.length}</div>{/if}<!-- ✔ 개념 체크 (📜 2026-11-15): TV 는 낸 수만 · 맞힘 · 오답은 리모컨 -->
  {#if R?.state.review && R.state.review.i === -2}<GobiCardView g={gobiCard(L, R as Room, R.state.review.mid, now)} />{/if}<!-- 📊 우리 반 고비 (11/17 #14) -->
  {#if tvRev}
    <!-- 🔎 익명 풀이 (📜 2026-11-15 · 리모컨 띄우기 / 내리기): 양피지 카드 · 이름 · 점수 · 정답/오답 글자 없음 · 「함께 살펴볼 줄」 강조 · 질문 · wrong = 「검토할 풀이」 꼬리표 -->
    <div class="ov rev" data-k="tv-review"><div class="parch">
      <div class="rh"><b>🔎 함께 살펴볼 풀이</b>{#if tvRev.wrong}<span class="rtag">자주 하는 실수</span>{/if}</div>
      <ol class="rl">{#each tvRev.lines as ln, k (k)}<li class:fo={k + 1 === tvRev.focus}>{#if k + 1 === tvRev.focus}<span class="fl">함께 살펴볼 줄</span>{/if}<SymText text={ln} on={false} /></li>{/each}</ol>
      {#if tvRev.ask}<p class="rq">❓ <SymText text={tvRev.ask} on={false} /></p>{/if}
    </div></div>
  {/if}
  {#if R?.state.qr && !R.state.closed}<!-- 📷 수업 중 입장 QR (📜 11/24 🔨 #9 ②) · 리모컨 「📷 입장 QR」 · 막대 📷 로 켜고 끔 · 누르면 닫힘 --><button type="button" class="ov qrov" data-k="tv-qr" aria-label="입장 QR 닫기" onclick={() => setQr(S, code, false)}><span class="eqr"><QR text={`${site}?join=${encodeURIComponent(code)}`} size={360} /><small>📱 휴대폰 카메라로 찍어요 · 반 · 번호로 로그인</small><span class="ecode">수업 코드 <b>{code}</b></span></span></button>{/if}
  {#if R?.state.video && L.videos?.[R.state.video]}<div class="ov vid"><Vid {S} url={L.videos[R.state.video] ?? ""} autoplay muted={!sound} k="tvvid" /></div>{/if}
  {#if R?.state.rest}
    <div class="ov rest fun" class:still={fun?.frz != null} class:stg={!!ff && ff.phase !== 'end'} style:background-image={fun && FUN_BG[fun.kind] ? `linear-gradient(rgba(8, 10, 14, 0.62), rgba(8, 10, 14, 0.72)), url(${artUrl(FUN_BG[fun.kind]!)})` : undefined}>
      {#if fun?.kind === 'td'}
        <TdTV {S} {code} R={R as Room} {now} {nameOf} quiet={!sound} />
      {:else if (fun?.kind as string) === 'lg'}
        <LgTV R={R as Room} f={fun as unknown as Lg} {now} />
      {:else if (fun?.kind as string) === 'ak'}
        <AkTV R={R as Room} f={fun as unknown as Ak} {now} {nameOf} clock={() => S.now()} />
      {:else if (fun?.kind as string) === 'aj'}
        <AjTV R={R as Room} f={fun as unknown as Aj} {now} {nameOf} />
      {:else if (fun?.kind as string) === 'drg'}
        <DrgTV R={R as Room} f={fun as unknown as Drg} {now} {nameOf} />
      {:else if !fun}
        <b>🏕 쉼터</b><p>{mmss(restLeft)} · 선생님이 놀이를 고르는 중</p>
      {:else if nn}
        <h3>🙊 눈치게임 · {nn.round}판{#if funZz && nn.phase !== 'end'}<span class="zz">💤 {funZz}명 관전</span>{/if}</h3>
        {#if nnEmo.length && nn.phase !== 'end'}<div class="nnemos" aria-hidden="true">{#each nnEmo as e, i (i)}<i style:left="{(i * 37) % 92 + 3}%" style:animation-delay="{(i % 4) * 0.3}s">{e.e || '👏'}</i>{/each}</div>{/if}
        {#if nn.phase === 'end'}<p class="big">🏆 우승 {(nn.win || []).length}명</p><div class="crowd">{#each nn.win || [] as u (u)}<span><HeroSprite id={R.players?.[u]?.hero ?? 0} scale={2} /><em>{nameOf(u)}</em></span>{/each}</div>
        {:else}<p class="s">1부터 차례로 · 둘이 같이 누르면 💥 · 마지막 1명도 탈락</p>
          {#if nn.phase === 'play' && nnFresh && (nnFresh.k === 'clash' || nnFresh.k === 'last')}{#key nnFresh.at}<div class="cd nnbig bad">{nnFresh.k === 'clash' ? `💥 동시! ${nnFresh.u.length}명 탈락` : '⌛ 마지막!'}</div>{/key}
          {:else if nn.phase === 'show'}<div class="cd nnbig">{nn.round}판 끝 · 살아남은 사람 {Object.keys(nn.said || {}).length}명</div>
          {:else}{#key `${nn.phase}|${nn.phase === 'ready' ? funSec : nn.n}`}<div class="cd nnbig">{nn.phase === 'ready' ? funSec : nn.n}</div>{/key}{/if}
          {#if nnHint}<p class="nnhint">⏳ 긴장감…</p>{/if}
          <div class="evs">{#each (nn.ev || []).slice(-4) as e, k (k)}<span>{e.k === 'say' ? `🗣 ${e.n} ${e.u.map(nameOf).join('')}` : e.k === 'clash' ? `💥 동시! ${e.u.map(nameOf).join(' · ')}` : e.k === 'last' ? `⌛ 마지막! ${e.u.map(nameOf).join('')}` : `⏳ 시간 끝 ${e.u.length}명`}</span>{/each}</div>
          {#if nunPeople.length}<FunCrowd kind="nun" people={nunPeople} k={crowdK} />{/if}{/if}
      {:else if ff}
        <h3>{KIND[ff.kind as Kind].short}{ff.kind === 'quiz' ? ` · ${ff.n} / ${Math.min(QN, ff.queue.length)}` : ` · ${ff.n}판`}{ff.final && ff.kind !== 'quiz' && ff.phase !== 'end' ? ' · 마지막 판' : ''}{#if funZz && ff.phase !== 'end'}<span class="zz">💤 {funZz}명 관전</span>{/if}</h3>
        {#if ff.phase === 'end'}
          <p class="big">{ff.kind === 'quiz' ? '⭕ OX 타임 끝 · 결과는 폰에' : `🏆 우승 ${(ff.win || []).length}명`}</p>
          {#if ff.kind !== 'quiz'}<div class="crowd">{#each ff.win || [] as u (u)}<span><HeroSprite id={R.players?.[u]?.hero ?? 0} scale={2} /><em>{nameOf(u)}</em></span>{/each}</div>{/if}
        {:else}
          <!-- ⚖ 🔄 ⭕ 무대 (정식 hall stage · 📜 2026-11-15 「연출 = 정식과 같게」): 위 = 규칙 · 둘 중 하나 / 가운데 = 무대(광장 → 발판 → 무너짐) / 아래 = 남은 초 · 판정 -->
          <p class="s">{ff.s ? '' : funCat ? `${funCat} · ` : ''}{ff.rps ? '✊✌️✋ 선생님 손에 지면 탈락 · 안 내면 💤' : KIND[ff.kind].rule}</p>
          {#if ff.s}<p class="q">{ff.s}</p>{:else if !ff.rps}<div class="vs">{#each ff.q as t, k (k)}<span class="o{k}">{t}</span>{/each}</div>{/if}
          <div class="fa-box"><FunArena R={R as Room} f={ff} {now} big nm={nmOnly} num={numOf} k={crowdK} quiet={!sound} /></div>
          {#if ff.phase === 'show'}<p class="ver">{verdict(ff)}</p>{:else}<div class="cd">{funSec}</div>{/if}
        {/if}
      {/if}
      {#if funErr}<p class="err">{funErr}</p>{/if}
      {#if fun?.frz != null}<p class="frz">⏸ 집중 · 놀이 시계 멈춤</p>{/if}
      {#if fun?.kind === 'nun' && sound}<small class="credit">♪ Music by JDSherbert</small>{/if}
    </div>
  {/if}
  {#if R?.state.focus}<div class="ov fo"><b>⏸ 집중</b><p>선생님을 보세요 · 게임은 멈춰 있어요</p></div>{/if}
  {#if door && door.ask && !R?.state.closed}<div class="ov door"><div class="k">👑🚪</div><p>보스가 던전 문을 닫으려 한다!</p><small>⏰ 선생님, 5분 연장할까요? <b>{askLeft}</b></small><button type="button" class="ext" onclick={() => extendTime(S, code)}>⏰ +5분</button></div>
  {:else if door && !R?.state.closed}<div class="ov door"><div class="k">👑🚪</div><p>보스가 던전 문을 닫았다!</p></div>{/if}
  {#if extShow}<div class="ov door ext2"><div class="k">🧙🚪</div><p>선생님이 문을 밀어 열었다!</p><div class="plus">⏳ +5분!</div></div>{/if}
  {#if sendShow}<div class="sendfly" role="status" data-k="tv-send"><span class="fly" aria-hidden="true">👾</span><b>🎯 {sendShow.names.join(' · ')} 복습 던전으로 이동!</b><small>학생마다 허수아비에서 만나요</small></div>{/if}
  {#if backShow}<div class="gift back" role="status" data-k="tv-back">⏪ 지난번에 놓친 「{backShow}」 몬스터가 돌아왔다!</div>{/if}
  {#if preShow && R?.meta.pre && hp}<div class="gift pre" role="status" data-k="tv-pre">⚔ 선제 공격! 복습한 친구 {R.meta.pre.who}명 · 체력 −{hp.pre}</div>{/if}
  {#if giftShow && R?.state.gift}<div class="gift" role="status">🎁 선생님 선물! 모두 💎 {R.state.gift.g}</div>{/if}
  {#if ink}<Ink step={i} onclose={() => (ink = false)} />{/if}

  <!-- 조작 막대 (#119 덧붙임 2): 🔊 · ⛶ | 🏕 · 🎬 · 📄 · 🎮 · ✏ | 🔴 집중 · « 뒤로 · 앞으로 ▶ · 📌 — 캠프 · 메뉴 · 수업 끝 단추 없음 (수업 닫기 = 교사 폰) -->
  <!-- 🐞 2026-11-15 「종합실에 리모컨 등장 안 함」: 조작 막대는 3초 가만히 두면 숨음(📌 고정 전) → 숨어 있을 때 오른쪽 아래 작은 손잡이 = 누르면 다시 나옴 -->
  <nav class="dock" class:on={dockOn} class:small={view === 'camp'} aria-label="조작 막대">
    {#if R && !isLobby(R) && !R.state.closed && view !== 'camp' && R.state.rest}
      <!-- 🏕 쉼터 동안 가운데 묶음 = 놀이 5개 (리모컨 시트와 같은 순서) -->
      <span class="sep"></span>
      {#each gamesOn() as g (g.k)}<button type="button" class="t" class:on={fun?.kind === g.k && fun.phase !== 'end'} onclick={() => playGame(g.k)}>{g.ic}<small>{g.name}</small></button>{/each}
      <button type="button" class="t rend" data-k="dock-rest-end" onclick={() => endRest(S, code)}>🏁<small>쉼터 끝</small></button><!-- 🐞 11/23 선생님 「종합실에 쉼터로 들어가면 나오는 버튼이 없다」: 놀이 닫고 쉼터 전 단계 그대로 (「앞으로 ▶」= 쉼터 끝 + 다음 단계) -->
    {:else if R && !R.state.closed && view !== 'camp'}
      <!-- 📺 시안 (선생님 「1번 추천대로」 2026-11-14): 던전 대기실에서도 같은 도구 줄 + ▶ 수업 시작 -->
      <span class="sep"></span>
      <button type="button" class="t" class:on={!!R.state.rest} onclick={() => setRest(S, code, !R.state.rest)}>🏕<small>쉼터</small></button>
      <button type="button" class="t" disabled={!step || !L.videos?.[step.id]} onclick={() => setVideo(S, code, R.state.video ? null : step?.id ?? null)}>🎬<small>영상</small></button>
      <button type="button" class="t" class:on={!!R.state.sheet} disabled={!mid && step?.kind !== 'concept'} onclick={() => setSheet(S, code, R.state.sheet ? null : step?.id ?? null)}>📄<small>문제</small></button>
      <button type="button" class="t" class:on={demo} disabled={!mid && step?.kind !== 'boss'} onclick={() => (demo = !demo)}>🎮<small>시연</small></button>
      <button type="button" class="t" class:on={ink} onclick={() => (ink = !ink)}>✏<small>필기</small></button>
      <button type="button" class="t" class:on={!!R.state.qr} aria-pressed={!!R.state.qr} data-k="dock-qr" onclick={() => setQr(S, code, !R.state.qr)}>📷<small>입장 QR</small></button>
      <!-- ✔ · 🔎 (📜 2026-11-17 #13 「종합실 리모컨에 체크랑 풀이」): 교사 폰 리모컨과 같은 함수 · 같은 조건 · 같은 글 (🪞) -->
      <!-- 🧭 #24 ⑦ 자리 고정: ✔ · 🔎 늘 같은 자리 · 못 쓸 때 흐림 · ⚙ 에서 끔 = 점선 「꺼짐」(누르면 안내) -->
      {#if feat('cc')}<button type="button" class="t" class:on={ccOnTv} aria-pressed={ccOnTv} data-k="dock-cc" disabled={!(step?.kind === 'concept' && step.check)} onclick={() => (ccArm = ccTap(S, code, R, step!, now, ccArm))}>✔<small>{ccLabel(R, step, now, ccArm)}</small></button>
      {:else}<button type="button" class="t off" data-k="dock-cc" aria-disabled="true" title="⚙ 기능에서 켜요" onclick={() => (offTip = '⚙ 기능에서 켜요 (✔ 개념 체크)')}>✔<small>꺼짐</small></button>{/if}
      {#if feat('review')}<button type="button" class="t" class:on={!!rvTv.cur} aria-pressed={!!rvTv.cur} data-k="dock-review" disabled={!rvTv.show} onclick={() => R && stepReview(S, code, L, R as Room, now)}>{rvTv.gobi ? '📊' : '🔎'}<small>{rvTv.show ? rvTv.label : '풀이'}</small></button>
      {:else}<button type="button" class="t off" data-k="dock-review" aria-disabled="true" title="⚙ 기능에서 켜요" onclick={() => (offTip = '⚙ 기능에서 켜요 (🔎 익명 풀이)')}>🔎<small>꺼짐</small></button>{/if}
    {/if}
    {#if R && !R.state.closed}
      <span class="sep"></span>
      {#if view !== 'camp'}<button type="button" class="n fo" class:on={!!R.state.focus} aria-pressed={!!R.state.focus} onclick={() => setFocus(S, code, !R.state.focus)}>🔴 집중</button>
        <button type="button" class="n" disabled={i <= 0} onclick={() => prevStep(S, L, code)}>« 뒤로</button>{/if}
      {#if !isEnd(L, R)}<button type="button" class="n go" disabled={isLobby(R) && view === 'lobby' && !ids.length} onclick={go}>{goLabel}<small>{goSub}</small></button>{/if}
    {/if}
    {#if R?.state.closed && showRes}<button type="button" class="n" data-k="tv-entry-back" onclick={() => (showRes = false)}>‹ 입장 대기</button>{/if}
    <!-- ⛶ 전체 화면 = 입장 대기 화면 QR 옆으로 (📜 2026-11-17 #21 C · #20 자리 대신) -->
  </nav>
  {#if offTip}<p class="offtip" role="status" data-k="dock-off">{offTip}</p>{/if}
  {#if setOpen}
    <div class="setov" role="presentation" onclick={() => (setOpen = false)}>
      <div class="setbox" role="menu" aria-label="TV 설정" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') setOpen = false; }}>
        <button type="button" role="menuitem" data-k="tvtheme" onclick={() => { themeOpen = true; setOpen = false; }}>🎨<span>테마</span></button>
        <a role="menuitem" class="sbl" data-k="tvcamp" href="?role=camp&from=me&tv=1" target="_blank" rel="noopener">⛺<span>교사 캠프 (새 창 · 학생 화면과 같게)</span></a><!-- 👩‍🏫 #80 0번: #21 C 에서 빠진 입구 되살림 · TV = 이름 · 선생님 칸 없음 -->
        <button type="button" role="menuitemcheckbox" aria-checked={sound} onclick={() => (sound = !sound)}>{sound ? '🔊' : '🔇'}<span>소리 {sound ? '켬' : '끔'}</span></button>
        <button type="button" role="menuitem" data-k="out" onclick={() => { if (confirm('🚪 처음 화면으로 갈까요? (교실 TV 로그인만 끝나요 · 수업 기록은 그대로)')) location.replace(location.pathname); }}>🚪<span>처음으로</span></button>
      </div>
    </div>
  {/if}
  {#if themeOpen}<div class="thov" role="dialog" aria-label="TV 테마"><div class="thbox"><div class="thh"><b>🎨 교실 TV 테마</b><small>이 TV 에만 · 교사 폰과 따로</small><button type="button" aria-label="닫기" onclick={() => (themeOpen = false)}>✕</button></div><ThemePicker now={tvTheme} feats={null} onpick={pickTv} paper /></div></div>{/if}

  {#if tvSheet}<div class="heroov" data-k="tv-sheet"><div class="hk" style:transform="translateZ(0) scale({hk})">
    {#if tvSheet === 'anvil'}<Anvil me={M.me} save={M.save} who="me" onclose={() => (tvSheet = '')} />
    {:else if tvSheet === 'scare'}<Dummy {S} me={M.me} save={M.save} uid="me" num={0} cls="" onclose={() => (tvSheet = '')} onforge={() => (tvSheet = 'anvil')} />
    {:else if tvSheet === 'dummy'}<Board {S} me={M.me} save={M.save} uid="me" num={0} cls="" open={false} joinPid="" onclose={() => (tvSheet = '')} />
    {:else}<Castle {S} me={M.me} save={M.save} all uid="me" num={0} cls="" floor="" onclose={() => (tvSheet = '')} />{/if}
  </div></div>{/if}
  {#if hero}<div class="heroov"><div class="hk" style:transform="translateZ(0) scale({hk})"><MyHero me={M.me} persist={M.save} onclose={() => (hero = false)} teacher onreset={M.reset} /></div></div>{/if}
</div>

<style>
  /* 📺 TV 글자 = 한 글꼴(테마 토큰 --font) · 크기 4단계 · 굵기 2단계(500 · 700) (#157 · arena/layout TV_FS 와 같은 값) */
  /* 📺 16:9 무대 (📜 2026-11-13 밤 선생님 「화면마다 비율이 달라도 16:9 에 맞춰 정돈」): 창이 어떤 비율이든 가운데 16:9 틀 하나 · 남는 곳 = 흐린 캠프 바탕(.tvout) · 모든 TV 화면이 이 틀 */
  .tvout { position: fixed; inset: 0; background: #0b0a08 center / cover no-repeat; filter: blur(18px) brightness(0.45); transform: scale(1.06); }
  .tv { position: fixed; left: 50%; top: 50%; width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16)); translate: -50% -50%; container-type: size; overflow: hidden; color: #fff; font-family: var(--font); font-weight: 500; background: #0b0a08; --tv-big: 6cqh; --tv-title: 3.2cqh; --tv-body: 2.4cqh; --tv-small: 1.8cqh; }
  .tv.emb { position: relative; left: auto; top: auto; translate: none; width: 100%; height: auto; aspect-ratio: 16 / 9; }
  .tv :global(button) { font-family: var(--font); font-weight: 700; }
  .tv :global(b), .tv :global(strong), .tv :global(h3), .tv :global(h4) { font-weight: 700; }
  .bg { position: absolute; inset: 0; background: center 60% / cover no-repeat; image-rendering: pixelated; }
  .bg.campbg { filter: blur(14px) brightness(0.45); transform: scale(1.1); }
  .tv.dim :global(.arena2), .tv.dim .bg { filter: brightness(0.35); }
  /* 위 막대 = 테마 토큰 (#119 덧붙임 2 ①) · 장면 위 칩 · 덮개는 테마와 상관없이 어두운 칩 + 흰 글자 + 금빛(#f5b84a) */
  .top { position: absolute; left: 0; right: 0; top: 0; height: 3.8cqw; /* 0.7배 (선생님 「맨 위 바 0.7 정도」 · 5.4 → 3.8) */ z-index: 6; display: flex; align-items: center; gap: 1cqw; padding: 0 1.2cqw; background: var(--bg); border-bottom: 1px solid var(--line); color: var(--text); }
  .ttl { flex: none; max-width: 30cqw; font-size: var(--tv-body); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ttl b { color: var(--accent); }
  .cls { display: inline-block; margin-right: 0.7cqw; padding: 0.1cqw 0.8cqw; border-radius: 0.6cqw; background: var(--accent); color: var(--on-accent); font-size: var(--tv-body); vertical-align: 0.1cqw; }
  .tflow { flex: 1; min-width: 0; display: flex; gap: 0.25cqw; align-items: flex-start; padding-top: 0.5cqw; }
  .tflow.hide { visibility: hidden; }
  .fs { display: flex; flex-direction: column; gap: 0.25cqw; min-width: 0; }
  .fs i { height: 0.7cqw; border-radius: 9px; background: color-mix(in srgb, var(--c) 40%, var(--surface-2)); }
  .fs em { font-style: normal; font-size: var(--tv-small); color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: clip; text-align: center; }
  .fs.ok i { background: var(--ok); }
  .fs.now i { background: var(--accent); height: 1.1cqw; box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); }
  .fs.now em { color: var(--text); font-weight: 700; font-size: var(--tv-small); }
  .tflow.dim .fs i { background: color-mix(in srgb, var(--c) 40%, var(--surface-2)) !important; height: 0.7cqw !important; box-shadow: none !important; }
  .tflow.dim .fs em { color: var(--text-2) !important; font-weight: 500 !important; font-size: var(--tv-small) !important; }
  .code { flex: none; font-size: var(--tv-body); font-weight: 700; white-space: nowrap; }
  .gear { flex: none; width: 5.2cqh; height: 5.2cqh; margin-left: 1cqw; border-radius: 1.2cqh; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.08); color: #fff; font-size: var(--tv-title); line-height: 1; cursor: pointer; display: grid; place-items: center; }
  .setov { position: absolute; inset: 0; z-index: 40; }
  .setbox { position: absolute; right: 1.5cqw; top: 9cqh; min-width: 22cqw; display: flex; flex-direction: column; gap: 0.6cqh; padding: 1.2cqh; border-radius: 1.6cqh; background: rgba(14, 16, 22, 0.96); border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 1cqh 3cqh rgba(0, 0, 0, 0.5); }
  .setbox .sbl { display: flex; align-items: center; gap: 1cqw; padding: 1.1cqh 1.2cqw; border-radius: 1.1cqh; background: rgba(255, 255, 255, 0.06); color: #fff; font: 700 var(--tv-body) var(--font); text-decoration: none; }
  .setbox button { display: flex; align-items: center; gap: 1cqw; padding: 1.1cqh 1.2cqw; border: 0; border-radius: 1.1cqh; background: rgba(255, 255, 255, 0.06); color: #fff; font: 700 var(--tv-body) var(--font); text-align: left; cursor: pointer; }
  .code b { margin-left: 0.5cqw; color: var(--text); font-size: var(--tv-title); letter-spacing: 0.1cqw; }
  .ib { flex: none; width: 3.6cqw; height: 3.6cqw; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); font-size: var(--tv-title); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
  .ib.on { border: 2px solid var(--accent); }
  .tline { position: absolute; left: 0; right: 0; bottom: -1px; height: 0.4cqw; background: color-mix(in srgb, var(--text) 10%, transparent); z-index: 7; pointer-events: none; }
  .tline > i { position: absolute; left: 0; top: 0; bottom: 0; width: var(--p); background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), var(--accent)); }
  .tline.red > i { background: linear-gradient(90deg, #e5484d88, #e5484d); }
  .tline em { position: absolute; left: var(--p); top: 50%; transform: translate(-50%, -50%); font-style: normal; font-size: var(--tv-body); line-height: 1; filter: drop-shadow(0 0 0.3cqw rgba(0, 0, 0, 0.7)); animation: hgs 2.4s ease-in-out infinite; }
  .tline em.still { animation: none; }
  @keyframes hgs { 0%, 80% { transform: translate(-50%, -50%) rotate(0); } 90%, 100% { transform: translate(-50%, -50%) rotate(180deg); } }
  .tline b { position: absolute; left: 97%; top: 50%; transform: translate(-50%, -50%); font-size: var(--tv-small); line-height: 1; }
  .tlt { position: absolute; left: var(--p); top: 100%; margin-top: 0.35cqw; transform: translateX(-50%); white-space: nowrap; font-size: var(--tv-body); font-weight: 700; color: #f2f3f5; background: rgba(15, 17, 21, 0.85); border: 1px solid color-mix(in srgb, #f5b84a 60%, transparent); border-radius: 99px; padding: 0.1cqw 0.8cqw; }
  .tline .tlt { left: 50%; } /* 📺 시안: ⏳ 남은 시간 = 위 가운데(단계 막대 아래) · ⏳ 표시만 진행 자리를 따라감 (2026-11-14) */
  .tlt.red { border-color: #e5484d; color: #ffb3b0; }
  .nbox { position: absolute; right: 1.5cqw; top: 11cqh; z-index: 3; width: 15cqw; min-height: 11cqh; border-radius: 1.6cqh; background: rgba(8, 9, 12, 0.75); border: 1px solid rgba(255, 255, 255, 0.18); padding: 1.2cqh 1.2cqw; display: flex; flex-direction: column; gap: 0.4cqh; overflow: hidden; }
  .nbox.over { z-index: 7; }
  .nbox small { font-size: var(--tv-small); font-weight: 700; color: #d6d9e0; }
  .nbox b { font-size: var(--tv-big); line-height: 1; color: var(--accent); }
  .nbox b span { font-size: var(--tv-title); color: #fff; }
  .nbox em { font-style: normal; font-size: var(--tv-small); color: #ffd7a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* 캠프 그림 + QR 카드 = 한 묶음 가운데 (높이 80% · 사이 3%) */
  .entry { position: absolute; left: 0; right: 0; top: 3.8cqw; bottom: 0; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 5cqw; padding: 0 6cqw; }
  .eqr { display: flex; flex-direction: column; align-items: center; gap: 1.4cqh; padding: 2.4cqh; border-radius: 2cqh; background: #fff; color: #222; }
  .eqr :global(canvas), .eqr :global(img), .eqr :global(svg) { width: 42cqh !important; height: 42cqh !important; }
  .eqr small { font-size: var(--tv-small); color: #555; } .ecode { font-size: var(--tv-body); } .ecode b { font-size: var(--tv-title); letter-spacing: 0.3em; color: #b8860b; }
  .einfo { display: flex; flex-direction: column; gap: 1.6cqh; max-width: 46cqw; }
  .etag { font-size: var(--tv-body); color: #f5b84a; font-weight: 700; } .ecls { font-size: 8cqh; line-height: 1.1; } .ettl { font-size: var(--tv-title); color: #ddd; }
  .ein { font-size: var(--tv-title); } .ein b { font-size: 7cqh; color: #f5b84a; } .ein small { font-size: var(--tv-title); color: #aaa; }
  .ewait { margin: 0; font-size: var(--tv-title); color: #fff; } .eauto { margin: 0; font-size: var(--tv-body); color: #9be7ff; }
  .ebtn { display: flex; gap: 1.4cqw; margin-top: 1cqh; } .ebtn button { min-height: 7cqh; padding: 0 2.4cqw; border-radius: 1.4cqh; border: 0.3cqh solid rgba(255, 255, 255, 0.3); background: rgba(0, 0, 0, 0.5); color: #fff; font-size: var(--tv-body); }
  .lring { position: absolute; left: 2cqw; right: 18cqw; top: 13cqh; bottom: 16cqh; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2cqh; }
  .tchr { display: flex; flex-direction: row; align-items: flex-end; gap: 2cqw; flex: none; } .tside { display: flex; flex-direction: column; align-items: flex-start; gap: 1cqh; padding-bottom: 2cqh; }
  .tchr span { font-size: var(--tv-body); font-weight: 700; background: rgba(8, 9, 12, 0.72); padding: 0.3cqh 1cqw; border-radius: 999px; }
  .bub { font-style: normal; font-size: var(--tv-title); font-weight: 700; color: #1a1300; background: #fff7e0; padding: 1cqh 1.6cqw; border-radius: 2cqh; position: relative; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.5); }
  .bub::after { content: ''; position: absolute; left: -1.8cqh; top: 50%; margin-top: -1cqh; border: 1cqh solid transparent; border-right-color: #fff7e0; } .h.oth { opacity: 0.85; }
  .rows { display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-end; gap: 1.2cqh 1.4cqw; max-width: 76cqw; flex: 1; min-height: 0; overflow: hidden; }
  .h { display: flex; flex-direction: column; align-items: center; gap: 0.3cqh; }
  .h span { font-size: var(--tv-small); font-weight: 700; background: rgba(8, 9, 12, 0.72); padding: 0.2cqh 0.7cqw; border-radius: 999px; white-space: nowrap; }
  .h.nin { opacity: 0.4; }
  .split { position: absolute; left: 2cqw; right: 2cqw; top: 13cqh; bottom: 16cqh; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 1.4cqw; }
  /* 🐞 2026-11-15 「문제 1번 확대 = 좁은 세로 띠」: 0fr 1fr + 첫 칸 숨김 = 남은 칸이 0 폭 첫 줄로 들어감 → 확대 = 한 칸 1fr */
  .split.z1, .split.z2 { grid-template-columns: 1fr; }
  .split.z1 .cpane:nth-child(2), .split.z2 .cpane:nth-child(1) { display: none; }
  .cpane { position: relative; text-align: left; border: 0; border-radius: 2cqh; background: #fbf8f1; color: #1b1a17; padding: 3cqh 2cqw; display: flex; flex-direction: column; gap: 1.4cqh; overflow: hidden; font: inherit; cursor: zoom-in; }
  .cpane .lab { font-size: var(--tv-body); font-weight: 700; color: #7a4a10; }
  .cpane h4 { margin: 0; font-size: var(--tv-title); }
  .cpane p { margin: 0; font-size: var(--tv-title); line-height: 1.5; }
  .split.z1 .cpane p, .split.z2 .cpane p { font-size: var(--tv-title); }
  .pimg { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 1.4cqh; }
  .pimg { background: #fff; border-radius: 1cqh; } .pimg :global(.pi.fill) { width: 100%; height: 100%; } /* 🐞 2026-11-15 그림 전체가 칸 안에(PrepImg fill = contain · 아주 긴 칸만 스크롤) */ /* 🐞 2026-11-14 「좌우 전부 차지 · 하얀 배경」: 폭 가득 · 위에서부터 · 넘치면 「↗ 누르면 크게」(카드가 커짐) */
  .simg { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; gap: 1.4cqh; overflow: hidden; }
  :global(:root[data-qpaper]) .pimg.qpaper, :global(:root[data-qpaper]) .simg.qpaper { padding: 2cqh 1.6cqw; border-radius: 1cqh; } /* 📜 2026-11-15 양피지 기본 켬: 선생님 쪽 문제 = 학생 문제 카드와 같은 양피지 */
  .simg :global(.pi.fill) { width: 100%; height: 100%; } /* 🐞 2026-11-15 📄 문제 창도 칸 안에 전체 · 아주 긴 칸만 스크롤(PrepImg fill) */
  .zm { position: absolute; right: 1.4cqw; bottom: 1.4cqh; font-style: normal; font-size: var(--tv-small); color: #7a6850; border: 1px solid #d8cdb8; border-radius: 99px; padding: 0.2cqh 0.8cqw; background: #fffdf8; }
  /* 📺 시안: 개념 = 제목 + 회색 수식 상자 + 요약 한 줄 · 문제 = 공통 조건 위에 한 번 + (1)~(n) 짧게 */
  .cpane .fbox { background: #efeadf; border-radius: 1cqh; padding: 2cqh 1.4cqw; text-align: center; font-family: 'DejaVu Serif', 'Times New Roman', serif; font-style: italic; font-size: var(--tv-title); line-height: 1.3; }
  .cpane p.sum { font-size: var(--tv-body); font-weight: 600; }
  .qhead { display: flex; flex-direction: column; gap: 0.4cqh; font-size: var(--tv-title); line-height: 1.3; margin-bottom: 0.6cqh; }
  .cpane p.qi { font-size: var(--tv-body); line-height: 1.45; }
  .sc { position: absolute; right: 2cqw; top: 23cqh; z-index: 3; min-width: 31cqw; padding: 2.2cqh 2cqw; border-radius: 2cqh; background: rgba(10, 16, 30, 0.86); border: 2px solid #6aa3ff; box-shadow: 0 0 2cqh rgba(106, 163, 255, 0.25); display: flex; flex-direction: column; gap: 1cqh; align-items: center; text-align: center; } /* 🌫 정찰 = 큰 테두리 카드 (📺 시안) */
  .sc .q { font-size: var(--tv-body); font-weight: 700; }
  .sc .r { font-size: var(--tv-body); } .sc .r b { font-size: var(--tv-big); color: #9fc8ff; }
  .dpane { position: absolute; right: 1.5cqw; top: 7.5cqh; /* 위 막대(3.8cqw ≈ 6.8cqh) 바로 아래 · 한 화면에 더 들어가게 */ bottom: 10cqh; /* 🎮 아래 조작 막대(0.7배 · 약 6.7cqh + 바닥 2cqh) 위 = 막대가 떠 있어도 주요 단추가 늘 보임 (🐞 2026-11-14) */ width: 32cqw; /* 📜 2026-11-14 「좌우 폭을 조금 줄여서」 40 → 32 */ z-index: 9; /* 전투 띠(몬스터 격파 · 연습 타격)보다 위 */ border-radius: 2cqh; overflow: hidden; border: 1px solid var(--line); }
  .endv { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqh; }
  .endv .legach { font-size: var(--tv-title); color: #ffd98a; text-shadow: 0 0 14px rgba(255, 200, 90, 0.7), 0 2px 0 #000; animation: legIn 0.6s cubic-bezier(0.2, 1.4, 0.4, 1) both; }
  @keyframes legIn { from { transform: scale(1.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .endv b { font-size: var(--tv-big); text-shadow: 0 4px 0 #000; } .endv p { font-size: var(--tv-title); margin: 0; }
  .ccband { position: absolute; top: 9cqh; left: 50%; transform: translateX(-50%); z-index: 7; padding: 1.2cqh 2.4cqw; border-radius: 999px; background: #1b1408e6; color: #fff; border: 0.3cqw solid var(--accent, #f5b84a); font-size: var(--tv-title); font-weight: 800; }
  .ccband b { color: #ffe066; }
  .ov.rev { background: rgba(5, 6, 10, 0.7); padding: 4cqh 6cqw; }
  .parch { width: min(88cqw, 1500px); max-height: 82cqh; overflow: auto; text-align: left; padding: 3cqh 3.4cqw; border-radius: 1.4cqw; color: #2b1d0e; background: linear-gradient(#f6e7c4, #ead3a0); box-shadow: 0 1cqh 3cqh rgba(0, 0, 0, 0.6), inset 0 0 0 0.4cqw #c9a46a; }
  .parch .rh { display: flex; align-items: center; gap: 1.4cqw; margin-bottom: 1.6cqh; }
  .parch .rh b { font-size: var(--tv-title); text-shadow: none; color: #5a3a12; }
  .rtag { padding: 0.4cqh 1cqw; border-radius: 999px; background: #b4442a; color: #fff; font-size: var(--tv-small); font-weight: 800; }
  .rl { margin: 0; padding-left: 3cqw; display: flex; flex-direction: column; gap: 1.2cqh; font-size: var(--tv-title); font-weight: 700; line-height: 1.45; }
  .rl li { position: relative; padding: 0.6cqh 1cqw; border-radius: 0.8cqw; }
  .rl li.fo { background: #ffe066; box-shadow: 0 0 0 0.3cqw #d9a400; }
  .rl .fl { position: absolute; right: 1cqw; top: -1.6cqh; padding: 0.2cqh 0.8cqw; border-radius: 999px; background: #d9a400; color: #2b1d0e; font-size: var(--tv-small); }
  .rq { margin: 2cqh 0 0 !important; font-size: var(--tv-title) !important; color: #5a3a12; }
  .qrov { border: 0; color: inherit; font: inherit; cursor: pointer; z-index: 7; } .qrov .eqr { display: flex; } .qrov .eqr small { color: #555; } .qrov .ecode b { text-shadow: none; }
  .ov { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.6cqh; text-align: center; background: rgba(5, 6, 10, 0.55); }
  .ov b { font-size: var(--tv-big); text-shadow: 0 4px 0 #000; }
  .ov p { margin: 0; font-size: var(--tv-title); font-weight: 700; }
  .ov.fun .credit { position: absolute; right: 1.6cqw; bottom: 1.2cqh; font-size: var(--tv-small); color: #cfd3db; }
  .ov.fun { background-color: #13201a !important; background-size: cover !important; background-position: center !important; top: 7.4cqw; z-index: 6; bottom: 0; gap: 1.4cqh; padding: 0 6cqw 12cqh; }
  .ov.fun h3 { margin: 0; font-size: var(--tv-big); }
  .ov.fun .s { font-size: var(--tv-title); color: #cfd3db; font-weight: 500; }
  .ov.fun .q { font-size: calc(var(--tv-big) * 0.8); max-width: 84cqw; line-height: 1.3; }
  .ov.fun .vs { display: flex; gap: 1.4cqw; flex: none; }
  .ov.fun .vs span { min-width: 18cqw; max-width: 36cqw; padding: 0.8cqh 1.6cqw; border-radius: 1.4cqh; font-size: var(--tv-title); font-weight: 700; background: #2f5f9e; box-shadow: 0 0.5cqh 0 rgba(0, 0, 0, 0.45); }
  .ov.fun .fa-box { flex: 1 1 0; min-height: 0; width: 100%; container-type: size; display: flex; align-items: center; justify-content: center; --fa-w: min(100cqw, calc(100cqh * 16 / 9)); }
  .ov.fun .nnbig { animation: nnPop 0.35s ease-out; } .ov.fun .nnbig.bad { color: #e5534b; }
  @keyframes nnPop { from { transform: scale(0.5); opacity: 0.3; } 70% { transform: scale(1.12); } to { transform: none; opacity: 1; } }
  .ov.fun .nnhint { color: #6cc6ea; font-size: var(--tv-title); animation: nnBlink 1s steps(2) infinite; } @keyframes nnBlink { 50% { opacity: 0.35; } }
  .ov.fun .nnemos { position: absolute; left: 0; right: 0; bottom: 0; height: 60%; pointer-events: none; overflow: hidden; z-index: 0; }
  .ov.fun .nnemos i { position: absolute; bottom: -6cqh; font-style: normal; font-size: 4cqh; animation: nnRise 3.2s linear infinite; }
  @keyframes nnRise { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(-50cqh); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .ov.fun .nnbig, .ov.fun .nnhint, .ov.fun .nnemos i { animation: none; } }
  .ov.fun.stg { padding-bottom: 3cqh; gap: 1cqh; } /* ⚖ 🔄 ⭕ 무대가 있을 땐 아래 여백을 줄여 무대를 크게 (막대는 무대 위로 뜸) */
  .ov.fun h3 .zz { margin-left: 1.2cqw; padding: 0.3cqh 1cqw; border-radius: 1cqh; background: #2d4f78; font-size: var(--tv-body); vertical-align: middle; }
  .ov.fun .vs .o1 { background: #9e3f3f; } .ov.fun .vs .o2 { background: #4a7a3a; }
  .ov.fun .cd { font-size: var(--tv-big); font-weight: 700; color: #f5b84a; font-variant-numeric: tabular-nums; line-height: 1; }
  .ov.fun .ver, .ov.fun .big { font-size: var(--tv-title); color: #f5b84a; }
  .ov.fun .crowd { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.4cqw; max-width: 84cqw; }
  .ov.fun .crowd span { display: flex; flex-direction: column; align-items: center; } .ov.fun .crowd em { font-style: normal; font-size: var(--tv-body); font-weight: 700; }
  .ov.fun .evs { display: flex; gap: 1cqw; flex-wrap: wrap; justify-content: center; } .ov.fun .evs span { background: rgba(24, 27, 34, 0.9); border-radius: 99px; padding: 0.8cqh 1.6cqw; font-size: var(--tv-body); font-weight: 700; }
  .ov.fun .err { color: #ffb4ae; font-size: var(--tv-title); } .ov.fun .frz { color: #ffb4ae; font-size: var(--tv-title); }
  .ov.fun.still .cd { opacity: 0.5; }
  .ov small { font-size: var(--tv-body); color: #d6d9e0; }
  /* 🐞 11/23 「집중 모드에서 문제 단추 → 문제 창이 집중 막 뒤로」: 📄 문제 · 📺 다시 보기 · 🔎 풀이 창 = 집중 막(z 6) 위 · 닫으면 집중 막 그대로
     🐞 11/24 정식 「문제 이미지 띄우고 필기가 안 돼」: 8 이면 ✏ 필기 판(z 7) 위로 올라가 필기가 막힘 → 7 (필기 판과 같은 층 · 필기 판이 뒤에 그려져 위 · 아래 조작 막대(z 8)도 그대로 누름) */
  .ov.sheet, .ov.rev { z-index: 7; }
  .ov.sheet { background: rgba(251, 248, 241, 0.97); color: #1b1a17; align-items: flex-start; justify-content: flex-start; padding: 12cqh 6cqw; text-align: left; }
  .ov.sheet b { font-size: var(--tv-title); text-shadow: none; }
  .ov.sheet p { font-size: var(--tv-title); font-weight: 500; }
  .ov.vid :global(video) { max-width: 80cqw; max-height: 80cqh; width: auto; }
  .ov.door .k { font-size: var(--tv-big); }
  .ov.door small b { color: var(--accent); font-size: var(--tv-title); }
  .ext { height: 9cqh; padding: 0 3cqw; border: 0; border-radius: 2cqh; background: var(--accent); color: var(--on-accent); font: 700 var(--tv-title) var(--font); box-shadow: 0 4px 0 var(--accent-sh); cursor: pointer; }
  .plus { font-size: var(--tv-big); font-weight: 700; color: var(--accent); }
  .sendfly { position: absolute; left: 50%; top: 30cqh; transform: translateX(-50%); z-index: 8; display: flex; flex-direction: column; align-items: center; gap: 0.8cqh; padding: 2cqh 3cqw; border-radius: 2cqh; background: rgba(8, 9, 12, 0.88); border: 2px solid var(--accent); text-align: center; }
  .sendfly b { font-size: var(--tv-title); } .sendfly small { font-size: var(--tv-body); color: #cfd3dc; }
  .sendfly .fly { font-size: 8cqh; animation: sendfly 2.2s ease-in forwards; }
  @keyframes sendfly { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 60% { transform: translate(18cqw, 8cqh) scale(0.6) rotate(25deg); opacity: 0.9; } 100% { transform: translate(40cqw, 30cqh) scale(0.2) rotate(60deg); opacity: 0; } }
  .gift.pre { border-color: var(--accent); top: 12cqh; font-size: var(--tv-title); white-space: nowrap; } /* 정찰 창(오른쪽 위)과 안 겹치게 한 줄 */
  .gift.back { border-color: var(--accent); top: 40cqh; font-size: var(--tv-title); white-space: nowrap; } /* 📦 B ⏪ 돌아온 몬스터 (선제 공격 띠 아래) */
  .gift { position: absolute; left: 50%; top: 16cqh; transform: translateX(-50%); z-index: 7; font-size: var(--tv-big); font-weight: 700; padding: 1.4cqh 3cqw; border-radius: 999px; background: rgba(8, 9, 12, 0.85); border: 2px solid var(--gem); }
  .dock { position: absolute; right: 1.5cqw; bottom: 2cqh; z-index: 8; display: flex; align-items: center; gap: 0.5cqw; padding: 0.8cqh 0.8cqw; border-radius: 2cqh; background: rgba(8, 9, 12, 0.88); border: 1px solid rgba(255, 255, 255, 0.18); opacity: 0; transform: translateY(1cqh); transition: opacity var(--t), transform var(--t); pointer-events: none; max-width: 97cqw; }
  .dock.on { opacity: 1; transform: none; pointer-events: auto; }
  .wbubs { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.2cqh 1.2cqw; max-width: 80cqw; margin-top: 2cqh; } .wb { display: flex; flex-direction: column; align-items: center; gap: 0.4cqh; } .wb em { font-style: normal; font-size: var(--tv-body); font-weight: 700; color: #1a1300; background: #fff7e0; padding: 0.8cqh 1.2cqw; border-radius: 1.6cqh; } .wb small { font-size: var(--tv-small); opacity: 0.85; } .wwait { opacity: 0.7; }
  .dock { scale: 0.7; transform-origin: right bottom; } /* 📜 2026-11-14 선생님 「리모컨 사이즈 0.7로」 = 수업 중에도 0.7배 (교사 캠프는 원래 0.7) */
  .dock button { cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.16); background: rgba(255, 255, 255, 0.06); color: #fff; border-radius: 1.4cqh; font: 700 var(--tv-body) var(--font); }
  .dock button:disabled { opacity: 0.35; cursor: default; }
  .thov { position: absolute; inset: 0; z-index: 60; background: rgba(5, 6, 10, 0.6); display: grid; place-items: center; }
  .thbox { box-sizing: border-box; width: min(72cqw, 820px); max-height: 88cqh; overflow: auto; padding: 2.2cqh; border-radius: 2cqh; background: var(--surface); border: 1px solid var(--line); display: flex; flex-direction: column; gap: 1.6cqh; }
  .thh { display: flex; align-items: baseline; gap: 12px; } .thh b { font-size: 20px; } .thh small { color: var(--text-2); font-size: 13px; } .thh button { margin-left: auto; width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font-size: 18px; }
  .dock .t { width: 7cqh; height: 7.6cqh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2cqh; padding: 0; }
  .dock .t small { font-size: var(--tv-small); color: #d6d9e0; }
  .dock .t.on { border: 2px solid var(--accent); }
  .dock .t.off { border-style: dashed; background: none; color: #8a8f9c; } .dock .t.off small { color: #8a8f9c; }
  .offtip { position: absolute; right: 2cqw; bottom: 13cqh; z-index: 9; margin: 0; padding: 1cqh 1.4cqw; border-radius: 1.4cqh; background: rgba(8, 9, 12, 0.92); color: #fff; font: 700 var(--tv-body) var(--font); }
  .dock .n { height: 7.6cqh; padding: 0 1.2cqw; font-size: var(--tv-body); display: flex; flex-direction: column; align-items: center; justify-content: center; white-space: nowrap; }
  .dock .n small { font-size: var(--tv-small); color: inherit; opacity: 0.8; }
  .dock .n.go { background: var(--accent); color: var(--on-accent); border-color: var(--accent); box-shadow: 0 3px 0 var(--accent-sh); }
  .dock .n.fo { border: 2px solid #e5484d; }
  .dock .t.rend { border: 2px solid var(--accent); }
  .dock .n.fo.on { background: #e5484d; color: #fff; }
  .dock .sep { width: 1px; height: 6cqh; background: rgba(255, 255, 255, 0.2); margin: 0 0.3cqw; }
  .heroov { position: absolute; inset: 0; z-index: 12; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; }
  .hk { position: relative; flex: none; width: 430px; height: 760px; border-radius: 22px; overflow: hidden; color: var(--text); background: var(--bg); }
  .demoban { position: absolute; left: 34%; transform: translateX(-50%); top: 9cqh; z-index: 8; padding: 0.6cqh 1.6cqw; border-radius: 999px; background: rgba(10, 12, 18, 0.82); color: #ffe7a8; font: 800 2.2cqh var(--font); letter-spacing: 0.02em; box-shadow: 0 0 0 2px rgba(255, 210, 120, 0.55); pointer-events: none; white-space: nowrap; }
  .expl { margin: 0.6cqh 0 0; font: 700 2.6cqh var(--font); color: #ffc070; } /* 🔥 #67 */
  .ewar :global(.wl) { font-size: 22px; margin-top: 12px; }
</style>
