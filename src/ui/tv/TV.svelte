<script lang="ts">
  import { SUBJ } from '../../engine/subject';
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { activeIds, BOSS_ID, bossHp, bossState, chainRecord, isChain, isEnd, isLobby, monsterHp, nextIdx, plainRecord, solveLock, stepIdx, stepOf, timeLeft } from '../../raid/raid';
  import { doorStart, endClass, extendTime, hallLobby, nextStep, prevStep, setFocus, setRest, setSheet, setVideo } from '../../raid/actions';
  import { items, chainItems, bossItem } from '../../engine/lessons';
  import { clsLabel, isOld, roster, type Live } from '../../school/school';
  import { COLOR, kindOf, minOf, short } from '../teacher/flow';
  import { liveRoom, liveValue } from '../room.svelte';
  import { CAMP, CAMP_PROPS, dungeonOf, propPos } from '../manifest';
  import CampProp from '../camp/CampProp.svelte';
  import { portalOf } from '../camp/portal.svelte';
  import { feat } from '../../school/features.svelte';
  import { useMe } from '../../store/me.svelte';
  import Sprite from '../Sprite.svelte';
  import DemoPhone from './DemoPhone.svelte';
  import QR from '../QR.svelte';
  import HeroSprite from '../camp/HeroSprite.svelte';
  import MyHero from '../camp/MyHero.svelte';
  import SymText from '../q/SymText.svelte';
  import PrepImg from '../q/PrepImg.svelte';
  import Ink from './Ink.svelte';
  import Arena from './Arena.svelte';
  import { applyTheme, isTheme } from '../../theme/theme';
  import { driveFun, endRest, funOf, GAMES, gamesOn, startFun, stopFun, tvBeat, type Game } from '../../rest/run';
  import TdTV from '../rest/TdTV.svelte';
  import { tvBgm, tvBgmNow } from './bgm';
  import { soundPref } from '../sound.svelte';
  import { ladder } from '../../model/hero';
  import FunCrowd from '../rest/FunCrowd.svelte';
  import { artUrl, FUN_BG } from '../manifest';
  import { balList, KIND, norm, QN, verdict, type Fun, type Kind } from '../../rest/fun';
  import type { Nun } from '../../rest/nunchi';

  // 🖥 교실 TV = 종합실 (#119 ⑮ · DECISIONS 「✅ ⑮ 교실 TV 컨펌」) — 정식 배치 그대로 + v1.0 색 · 글꼴
  //   위 막대 = 차시 · 단계 이름 · 단계 알약 · 시간 막대(👑 = 문 닫는 시각) · 🚪 코드 · 오른쪽 끝 🧙 · ⚙ 없음
  //   왼쪽 위 숫자 한 칸(같은 자리 · 같은 크기) · 오른쪽 위 정찰 상자 · 가운데 몬스터 + 체력 · 아래 용사 이름표 · 오른쪽 아래 조작 막대(3초 뒤 숨음 · 📌)
  //   정답 · 오답 글자 · 종합실 키는 TV 에 없음
  const { S, L, live, now }: { S: Store; L: LessonPack; live: Live | null; now: number } = $props();
  const code = untrack(() => live?.code ?? '');
  const lr = untrack(() => (code ? liveRoom(S, code) : null));
  onDestroy(() => lr?.stop());
  const R = $derived((lr?.v.room ?? null) as Room | null);
  const stopDrive = untrack(() => (code ? driveFun(S, code, 'tv') : () => {})); // 🏕 놀이 시계는 TV 가 먼저 맡음 (#142)
  onDestroy(stopDrive);
  // 🏰 TV 가 켜져 있음 (디펜스 시작 조건 · 3초마다)
  const beatT = untrack(() => (code ? setInterval(() => tvBeat(S, code), 3000) : 0)); if (code) untrack(() => tvBeat(S, code));
  onDestroy(() => clearInterval(beatT));
  const M = useMe(9999, 30, true);
  // 🎨 교실 TV = 선생님이 고른 테마의 색만 (#144 · 도트 테두리 · 바탕 그림 없음)
  const tth = untrack(() => liveValue<string>(S, 'school/teacher/theme'));
  onDestroy(tth.stop);
  $effect(() => { const t = tth.v.val; if (isTheme(t)) applyTheme(t, { tv: true }); }); // 🧙 선생님 용사 (이 기기 · 학생 폰 「내 용사」와 같은 창)
  const pupils = $derived(live ? roster(live.cls, S) : []);
  const ids = $derived(R ? activeIds(R, now) : []);
  const inSet = $derived(new Set(ids));
  const absent = $derived(R?.absent || {});
  const expected = $derived(pupils.filter((p) => !absent[p.uid]));
  const step = $derived(R ? stepOf(L, R) : null);
  const i = $derived(R ? stepIdx(R) : -1);
  const mid = $derived(step?.kind === 'monster' && L.monsters[step.id] ? step.id : null);
  const chain = $derived(!!R && !!mid && isChain(L, R, mid));
  const hp = $derived(R && mid ? monsterHp(L, R, mid, now) : null);
  const bhp = $derived(R && L.boss ? bossHp(L, R, now) : null);
  const scout = $derived(R ? solveLock(L, R, now) : null);
  const left = $derived(R ? timeLeft(R, now) : null);
  const closeAt = $derived(R?.state.deadline ? R.state.deadline + (Number(R.state.extend) || 0) * 60e3 : null);
  const started = $derived(R?.state.stepAt && !isLobby(R as Room) ? (R as Room).state.stepAt : null);
  const nameOf = (u: string) => { const p = pupils.find((x) => x.uid === u); return p ? `${p.num} ${p.name.slice(1)}` : R?.players?.[u]?.nick ?? u; };
  const submitted = (u: string) => !!R && !!step && (step.kind === 'boss' ? bossState(L, R, u).some((x) => x.n > 0) : mid ? (chain ? chainRecord(L, R, mid, u).submitted : plainRecord(L, R, mid, u).submitted) : false);
  const lost = $derived(R ? Object.keys(R.players || {}).filter((u) => !R.players?.[u]?.teacher && !inSet.has(u) && !absent[u]) : []);
  const oldIds = $derived(R ? ids.filter((u) => isOld(R.players?.[u]?.ver)) : []);

  // ── 어떤 장면인가 ──
  let campPeek = $state(false);
  const view = $derived(!R || R.state.closed ? 'camp' : campPeek ? 'camp' : isLobby(R) ? (R.state.hall === 'lobby' ? 'lobby' : 'camp') : isEnd(L, R) ? 'end' : step?.kind === 'concept' ? 'concept' : 'battle');
  let demo = $state(false);
  let ink = $state(false);
  let zoom = $state<0 | 1 | 2>(0);
  let hero = $state(false);
  $effect(() => { void i; untrack(() => { demo = false; zoom = 0; }); }); // 단계가 바뀌면 시연 · 크게 보기 닫힘 (필기는 Ink 가 지움)

  // ── 🏕 쉼터 놀이 (#142 ⑤) ──
  const fun = $derived(funOf(R));
  const ff = $derived(fun && fun.kind !== 'nun' ? norm(fun as Fun) : null);
  const nn = $derived(fun && fun.kind === 'nun' ? (fun as unknown as Nun) : null);
  // 🔄 🙊 쉼터 무리(❓#2 B): 이름 = 번호 뺀 이름 · 번호 = 명단(없으면 방 기록) · TV 높이 1000 넘으면 용사 1.5배
  const nmOnly = (u: string) => { const p = pupils.find((x) => x.uid === u); return p ? p.name.slice(1) : R?.players?.[u]?.nick ?? u; };
  const numOf = (u: string) => pupils.find((x) => x.uid === u)?.num ?? Number((R?.players?.[u] as { num?: number } | undefined)?.num) ?? 0;
  let tvH = $state(720);
  const crowdK = $derived(tvH >= 1000 ? 1.5 : 1);
  const revPeople = $derived(ff && ff.kind === 'rev' && ff.phase !== 'end' && R ? Object.keys(ff.alive || {}).map((u) => ({ u, hero: R.players?.[u]?.hero ?? 0, num: numOf(u), name: nmOnly(u), st: (ff.phase === 'show' && ff.res?.out.includes(u) ? 'out' : '') as '' | 'out' })).sort((a, b) => a.num - b.num) : []);
  const nunPeople = $derived(nn && nn.phase !== 'end' && R ? [...Object.keys(nn.alive || {}), ...Object.keys(nn.out || {}).filter((u) => !(nn.alive || {})[u]), ...Object.keys(nn.zz || {}).filter((u) => !(nn.alive || {})[u] && !(nn.out || {})[u])].map((u) => ({ u, hero: R.players?.[u]?.hero ?? 0, num: numOf(u), name: nmOnly(u), st: ((nn.zz || {})[u] ? 'zz' : (nn.out || {})[u] ? 'out' : '') as '' | 'out' | 'zz', say: (nn.said || {})[u] })).sort((a, b) => (a.st === 'out' ? 1 : 0) - (b.st === 'out' ? 1 : 0) || a.num - b.num) : []);
  const fnow = $derived(fun?.frz != null ? Number(fun.frz) : now);
  const funSec = $derived(fun && fun.phase !== 'end' ? Math.max(0, Math.ceil(((fun.phase === 'show' ? (ff?.until ?? nn?.to ?? 0) : fun.to) - fnow) / 1000)) : 0);
  const funCat = $derived(ff && !ff.s && !ff.rps ? balList()[ff.qi]?.[2] ?? '' : '');
  let funErr = $state(''), errT: ReturnType<typeof setTimeout> | null = null;
  // 🎵 TV 배경음 (#142-2): 🏕 쉼터 화면 · 놀이마다 곡 · 🔊 끄면 멈춤 · 쉼터 밖 = 없음(다른 장면 곡은 다음 판)
  $effect(() => { tvBgm(R?.state.rest && !R.state.closed ? (fun && fun.phase !== 'end' ? fun.kind : fun?.kind === 'td' ? 'td' : 'rest') : null, sound && soundPref.bgm); }); // 🎵 B5 이 기기 배경음 끔이면 TV 🔊 켜져도 곡 없음
  onDestroy(() => tvBgm(null, false));
  if (typeof window !== 'undefined') (window as unknown as { __bgm: unknown }).__bgm = tvBgmNow;
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
      if (fun.kind === 'quiz') return { ic: '⭕', lab: '고른 학생', n: Object.keys((R as unknown as { fv?: Record<string, Record<string, string>> }).fv?.[ff?.rk ?? ''] || {}).length, m: Object.keys(fun.alive || {}).length, sub: '' };
      return { ic: '🧍', lab: '살아남음', n: Object.keys(fun.alive || {}).length, m: nn ? Object.keys(nn.alive || {}).length + Object.keys(nn.zz || {}).length : ff?.total ?? 0, sub: '' };
    }
    if (R.state.rest && view !== 'camp') return { ic: '📱', lab: '입장', n: ids.length, m: expected.length, sub: '' };
    if (view === 'concept') return null;
    if (view === 'camp') return { ic: '📱', lab: '입장한 학생', n: ids.length, m: expected.length, sub: '' };
    if (view === 'lobby') return { ic: '⚔', lab: '들어온 학생', n: ids.length, m: expected.length, sub: [oldIds.length ? `🔄 옛 판 ${oldIds.map(nameOf).join(' · ')}` : '', expected.length > ids.length ? `⏳ ${expected.filter((p) => !inSet.has(p.uid)).map((p) => p.name.slice(1)).slice(0, 4).join(' · ')}${expected.length - ids.length > 4 ? ' …' : ''}` : ''].filter(Boolean).join('  ') };
    if (scout?.on) return { ic: '✋', lab: '준비 완료', n: Object.keys(R.ready?.[scout.id] || {}).length, m: ids.length, sub: '' };
    if (view === 'end') return { ic: '✔', lab: '참여', n: ids.length, m: expected.length, sub: '' };
    return { ic: '✔', lab: '제출', n: ids.filter(submitted).length, m: ids.length, sub: lost.length ? `📵 끊김 ${lost.map(nameOf).join(' · ')}` : '' };
  });

  // ── 정찰 +30초 1초 표시 ──
  let addFlash = $state(''), lastAdd = -1, flashT: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    const a = scout ? Number(R?.state.solveAdd?.[scout.id] || 0) : -1;
    if (lastAdd >= 0 && a !== lastAdd) { untrack(() => { addFlash = a > lastAdd ? '+30초' : '−30초'; if (flashT) clearTimeout(flashT); flashT = setTimeout(() => (addFlash = ''), 1000); }); }
    lastAdd = a;
  });

  // ── 👑 문 닫기 (정식 #68 A): 마감이 되면 장면 · +5분을 아직 안 썼으면 30초 묻기 · 지나면 수업 끝 ──
  $effect(() => { if (R && !R.state.closed && !isLobby(R) && left === 0 && !R.state.door) untrack(() => doorStart(S, code)); });
  const door = $derived(R?.state.door ?? null);
  const askLeft = $derived(door ? Math.max(0, 30 - Math.floor((now - door.at) / 1000)) : 0);
  $effect(() => { if (R && door && !R.state.closed && (door.ask ? askLeft <= 0 : now - door.at > 3000)) untrack(() => endClass(S, L, code)); });
  const extShow = $derived(!!R?.state.doorExt && now - Number(R.state.doorExt) < 3500);
  const giftShow = $derived(!!R?.state.gift && now - Number(R.state.gift.at) < 4000);

  // ── 조작 막대 (마우스 · 터치로 나타나고 3초 뒤 숨음 · 📌 고정) ──
  let dockAt = $state(Date.now()), pin = $state(false), mini = $state(false), sound = $state(true);
  const dockOn = $derived(pin || now - dockAt < 3000);
  const poke = () => (dockAt = Date.now());
  const goLabel = $derived(!R ? '' : view === 'camp' && isLobby(R) ? '⚔ 던전 입장' : isLobby(R) ? '▶ 수업 시작' : '앞으로 ▶');
  const goSub = $derived(!R ? '' : view === 'camp' && isLobby(R) ? '반 전체 던전 대기실로' : short(L.steps[R.meta.resumeFrom != null && isLobby(R) ? R.meta.resumeFrom : nextIdx(L, R)]) || '마무리');
  function go() {
    if (!R) return;
    campPeek = false;
    if (view === 'camp' && isLobby(R)) { hallLobby(S, code); return; }
    if (R.state.rest) endRest(S, code); // 🏕 쉼터 중 「앞으로 ▶」 = 쉼터 끝 + 수업으로 (#142)
    nextStep(S, L, code);
  }
  function full() { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); }
  // 📄 문제 창 · 📖 개념 오른쪽 = 학생 폰과 같은 함수(🪞) · 첫 판 숫자
  const nextMon = $derived(step ? L.steps.slice(i).find((s) => s.kind === 'monster' || s.kind === 'boss') ?? null : null);
  const qsOf = (id: string) => (id === BOSS_ID ? (L.boss ? Array.from({ length: L.boss.items }, (_, k) => bossItem(L, `${code}|tv`, k, 0)).filter((q): q is NonNullable<typeof q> => !!q) : []) : L.monsters[id]?.chain ? chainItems(L, id, `${code}|tv`, 0) : items(L, id, `${code}|tv`, 0));
  const sheetQs = $derived(R?.state.sheet ? (L.steps.find((s) => s.id === R.state.sheet)?.kind === 'concept' && nextMon ? qsOf(nextMon.kind === 'boss' ? BOSS_ID : nextMon.id) : qsOf(R.state.sheet)) : []);
  // 위 막대 흐름도 · 남은 시간 선 (#119 덧붙임 3 · 4 · 6)
  const topic = $derived(L.title.split(' · ')[0] ?? L.title);
  const flowSteps = $derived(L.steps.map((s, k) => ({ s, k })).filter((x) => !x.s.later));
  const tline = $derived(view !== 'camp' && view !== 'lobby' && started && closeAt && left != null ? { p: Math.max(0, Math.min(1, (now - started) / (closeAt - started))), red: !!door || left <= 5 * 60e3 } : null);
  const restLeft = $derived(R?.state.rest ? Math.max(0, R.state.rest.at + R.state.rest.min * 60e3 - now) : 0);
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  // 🏕 교사 캠프 = 학생 캠프와 같은 자리표(manifest CAMP_PROPS · 🔨 「캠프라는 캠프는 모두 지침대로」) · 물건 그림 + 바로 아래 이름표(늘 보임) · 꺼진 기능 = 그 자리만 비움
  const PNAME: Record<string, string> = { anvil: '⚒ 모루', scare: '🎯 허수아비', dummy: '📋 게시판', mail: '📮 우편함' };
  const tvProps = $derived(CAMP_PROPS.filter((p) => !p.feat || feat(p.feat)));
  const zoneLab = (k: string) => { const z = CAMP.zones[k]!; return { x: ((z[0] + z[2]) / 2 / CAMP.size[0]) * 100, y: ((k === 'tent' ? z[1] + 40 : z[3]) / CAMP.size[1]) * 100 }; }; // 출제 공방 = 텐트 위 (학생 캠프와 같게)
  const ZONES = $derived([['castle', '🏰 성채던전', feat('citadel')], ['tent', '✏ 출제 공방', feat('author')], ['gate', R && !R.state.closed ? `🌀 ${L.no}차시 던전 · 열림` : `🌀 ${L.no}차시 던전`, true]].filter((z) => z[2]) as [string, string, boolean][]);
  const portal = untrack(() => portalOf(S)); onDestroy(portal.stop);
  let fireF = $state(0); const fireT = setInterval(() => (fireF = (fireF + 1) % CAMP.fire.frames), CAMP.fire.ms); onDestroy(() => clearInterval(fireT));
  let hk = $state(1);
  const fit = () => (hk = Math.min(1.3, (innerHeight * 0.86) / 760));
  const [CW, CH] = CAMP.size;
  const pct = (v: number, tot: number) => `${((100 * v) / tot).toFixed(2)}%`;
  const site = `${location.origin}${import.meta.env.BASE_URL}`;
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
<div class="tvout" style:background-image="url({CAMP.bg})" aria-hidden="true"></div>
<div class="tv" class:dim={!!R?.state.focus}>
  <div class="bg" style:background-image="url({view === 'camp' ? CAMP.bg : dungeonOf(L.theme)})" class:campbg={view === 'camp'}></div>

  <!-- 위 막대 (#119 덧붙임 3 · 7 · 9): 반 칩 · n차시 + 소단원 주제 · 흐름도(리모컨 단계 막대와 같은 함수) · 🚪 코드 · ⛺ 내 캠프 / 아래 가장자리 = 남은 시간 선 -->
  <header class="top">
    <span class="ttl">{#if live}<span class="cls">{clsLabel(S, live.cls)}</span>{/if}{#if view === 'camp'}🏛 교사 캠프 · {/if}{L.no}차시 <b>{topic}</b></span>
    <div class="tflow" class:dim={view === 'lobby'} class:hide={view === 'camp'} aria-label="오늘 흐름">
      {#each flowSteps as x (x.s.id)}<span class="fs" class:ok={x.k < i} class:now={x.k === i} style:flex={Math.max(1, minOf(L, R, x.s))} style:--c={COLOR[kindOf(L, R, x.s)]}><i></i><em>{x.s.kind === 'boss' ? '👑 형성평가' : short(x.s)}</em></span>{/each}
    </div>
    {#if view !== 'camp'}<span class="code">🚪 코드<b>{code}</b></span>{/if}
    <!-- ⛺ 둥근 캠프 단추 없앰 (선생님 「저 버튼은 없어도 돼」 · 캠프 보기 = 조작 막대 🏕) -->
    {#if tline}
      <div class="tline" class:red={!!door} style:--p="{tline.p * 100}%">
        <i></i><em class:still={!!R?.state.focus}>⏳</em>
        <span class="tlt" class:red={tline.red} class:edge={tline.p > 0.88} class:start={tline.p < 0.06}>남은 {mmss(left ?? 0)}</span>
        <b>👑</b>
      </div>
    {/if}
  </header>

  <!-- 왼쪽 위 숫자 한 칸 -->
  {#if box}
    <div class="nbox" class:over={!!R?.state.rest && !R?.state.focus} aria-label="{box.lab} {box.n} / {box.m}"><small>{box.ic} {box.lab}</small><b>{box.n}<span> / {box.m}</span></b>{#if box.sub}<em>{box.sub}</em>{/if}</div>
  {/if}

  {#if view === 'camp'}
    <!-- 🏛 교사 캠프: 캠프 그림 통째 + 물건 이름표 늘 · 오른쪽 QR · 코드 = 가운데 한 묶음 -->
    <div class="campwrap">
    <div class="campv" style:aspect-ratio="{CW} / {CH}">
      <img class="cl0" alt="" src={CAMP.bg} />
      <img class="obj" alt="" src={CAMP.castle.src} style="left:{pct(CAMP.castle.x, CW)};top:{pct(CAMP.castle.y, CH)};width:{pct(CAMP.castle.w, CW)}" />
      <img class="obj" alt="" src={CAMP.tent.src} style="left:{pct(CAMP.tent.x, CW)};top:{pct(CAMP.tent.y, CH)};width:{pct(CAMP.tent.w, CW)}" />
      <img class="obj gate" alt="" class:on={!!R && !R.state.closed} src={CAMP.gateOn.src} style="left:{pct(CAMP.gateOn.x, CW)};top:{pct(CAMP.gateOn.y, CH)};width:{pct(CAMP.gateOn.w, CW)}" />
      <span class="me" style:left="{CAMP.hero.left}%" style:bottom="{CAMP.hero.bottom}%"><HeroSprite id={M.me.hero} row={8} aura={M.me.enh} scale={2} /></span>
      <i class="tfire" style="{propPos(CAMP.fire)};aspect-ratio:{CAMP.fire.aspect};background-image:url({CAMP.fire.src});background-size:{CAMP.fire.cols * 100}% {CAMP.fire.rows * 100}%;background-position:{(fireF % CAMP.fire.cols) / (CAMP.fire.cols - 1) * 100}% {Math.floor(fireF / CAMP.fire.cols) * 100}%"><span class="ob blw"><b>🔥 모닥불</b></span></i>
      {#each tvProps as p (p.k)}<span class="tprop" style={propPos(p)} data-prop={p.k}><CampProp {p} phase={p.k === 'dummy' ? portal.phase : 'idle'} /><span class="ob blw"><b>{PNAME[p.k]}</b></span></span>{/each}
      {#each ZONES as [k, t] (k)}{@const z = zoneLab(k)}<span class="ob zl" data-zone={k} style:left="{z.x}%" style:top="{z.y}%"><b>{t}</b></span>{/each}
      <button type="button" class="ob me2" style:left="{CAMP.hero.left + 4}%" style:top="{100 - CAMP.hero.bottom - 2}%" onclick={() => { fit(); hero = true; }}><b>🧙 내 용사</b><small>용사 바꾸기</small></button>
    </div>
    <div class="campqr">
      {#if R && !R.state.closed}
        <QR text={site} size={220} />
        <small>📱 휴대폰 카메라로 QR 을 찍어요 · 반 · 번호로 로그인</small>
        <div class="cc">수업 코드 <b>{code}</b></div>
      {:else}
        <div class="cc wait">수업을 열면<br />QR · 코드가 나와요</div>
        <small>교사 폰 「수업 열기」</small>
      {/if}
    </div>
    </div>
  {:else if view === 'lobby'}
    <!-- ⚔ 던전 대기실: 선생님 용사 둘레에 학생 용사 두 줄 · 선생님 말풍선 -->
    <div class="lring">
      <div class="tchr"><em class="bub">{R?.state.bubble || `${L.no}차시 던전에 온 걸 환영하네!`}</em><HeroSprite id={M.me.hero} scale={3} aura={M.me.enh} /><span>🧙 선생님</span></div>
      <div class="rows">{#each pupils.filter((p) => !absent[p.uid]) as p (p.uid)}<div class="h" class:nin={!inSet.has(p.uid)}><HeroSprite id={R?.players?.[p.uid]?.hero ?? 0} scale={1} dim={!inSet.has(p.uid)} /><span>{p.num} {p.name.slice(1)}</span></div>{/each}</div>
    </div>
  {:else if view === 'concept' && step}
    <!-- 📖 개념 = 2분할 (왼 개념 · 오른 문제 · 누르면 크게) -->
    <div class="split" class:z1={zoom === 1} class:z2={zoom === 2}>
      <div class="cpane" role="button" tabindex="0" onclick={() => (zoom = zoom === 1 ? 0 : 1)} onkeydown={(e) => { if (e.key === 'Enter') zoom = zoom === 1 ? 0 : 1; }}><span class="lab">{short(step)} · 개념</span><div class="pimg"><PrepImg {S} {L} id={step.id} alt="{short(step)} 개념"><h4>{step.title.split(' · ').slice(1).join(' · ') || step.title}</h4><p><SymText text={step.say ?? ''} /></p></PrepImg></div><em class="zm">{zoom === 1 ? '⤡ 누르면 작게' : '⤢ 누르면 크게'}</em></div>
      {#if nextMon}
        {@const qs = qsOf(nextMon.kind === 'boss' ? BOSS_ID : nextMon.id)}
        <div class="cpane" role="button" tabindex="0" onclick={() => (zoom = zoom === 2 ? 0 : 2)} onkeydown={(e) => { if (e.key === 'Enter') zoom = zoom === 2 ? 0 : 2; }}><span class="lab">{short(nextMon)} · 문제</span><div class="pimg"><PrepImg {S} {L} id={nextMon.kind === 'boss' ? BOSS_ID : nextMon.id} alt="{short(nextMon)} 문제">{#each qs.slice(0, 4) as q, k (k)}<p><SymText text={q.question} /></p>{/each}</PrepImg></div><em class="zm">{zoom === 2 ? '⤡ 누르면 작게' : '⤢ 누르면 크게'}</em></div>
      {/if}
    </div>
  {:else if view === 'end'}
    <div class="endv"><b>{bhp?.won ? '🏆 승리!' : '🏁 마무리'}</b><p>{ids.length}명이 함께했어요 · 결과는 학생 폰에</p></div>
  {:else if step && R}
    <!-- ⚔ 전투: 몬스터 + 머리 위 체력 · 아래 용사 이름표 -->
    <!-- ⚔ 전투 (#157): PixiJS 캔버스 장면(몬스터 크게 · 머리 위 굵은 체력 · 용사단 · 공격 연출) · WebGL 없으면 같은 배치 DOM -->
    <Arena {L} R={R as Room} {step} {now} {ids} {nameOf} {submitted} lost={new Set(lost)} split={demo} shadow={!!scout?.on} />
    {#if scout?.on}
      <div class="sc"><div class="q">🌫 정찰 — 학습지 「{short(step)}」을 먼저 풀어요</div><div class="r">등장까지 <b>{Math.ceil(scout.left / 1000)}</b>초 {#if addFlash}<span class="adj">{addFlash}</span>{/if}</div></div>
    {/if}
    {#if demo}<div class="dpane"><DemoPhone {L} R={R as Room} {code} onclose={() => (demo = false)} /></div>{/if}
  {/if}

  <!-- 덮개: 🔴 집중 · 🏕 쉼터 · 📄 문제 · 🎬 영상 · 👑 문 닫기 · 🎁 선물 -->
  {#if R?.state.sheet && sheetQs.length}
    {@const sid = L.steps.find((s) => s.id === R.state.sheet)?.kind === 'concept' && nextMon ? (nextMon.kind === 'boss' ? BOSS_ID : nextMon.id) : R.state.sheet}
    <div class="ov sheet"><b>📄 {short(L.steps.find((s) => s.id === R.state.sheet))}</b><div class="simg"><PrepImg {S} {L} id={sid} alt="학습지 문제">{#each sheetQs.slice(0, 6) as q, k (k)}<p><SymText text={q.question} /></p>{/each}</PrepImg></div></div>
  {/if}
  {#if R?.state.video && L.videos?.[R.state.video]}<div class="ov vid"><video src={L.videos[R.state.video]} autoplay controls muted={!sound}></video></div>{/if}
  {#if R?.state.rest}
    <div class="ov rest fun" class:still={fun?.frz != null} style:background-image={fun && FUN_BG[fun.kind] ? `linear-gradient(rgba(8, 10, 14, 0.62), rgba(8, 10, 14, 0.72)), url(${artUrl(FUN_BG[fun.kind]!)})` : undefined}>
      {#if fun?.kind === 'td'}
        <TdTV {S} {code} R={R as Room} {now} {nameOf} />
      {:else if !fun}
        <b>🏕 쉼터</b><p>{mmss(restLeft)} · 선생님이 놀이를 고르는 중</p>
      {:else if nn}
        <h3>🙊 눈치게임 · {nn.round}판</h3>
        {#if nn.phase === 'end'}<p class="big">🏆 우승 {(nn.win || []).length}명</p><div class="crowd">{#each nn.win || [] as u (u)}<span><HeroSprite id={R.players?.[u]?.hero ?? 0} scale={2} /><em>{nameOf(u)}</em></span>{/each}</div>
        {:else}<p class="s">1부터 차례로 · 둘이 같이 누르면 💥 · 마지막 1명도 탈락</p><div class="cd">{nn.phase === 'ready' ? funSec : nn.n}</div>
          <div class="evs">{#each (nn.ev || []).slice(-4) as e, k (k)}<span>{e.k === 'say' ? `🗣 ${e.n} ${e.u.map(nameOf).join('')}` : e.k === 'clash' ? `💥 동시! ${e.u.map(nameOf).join(' · ')}` : e.k === 'last' ? `⌛ 마지막! ${e.u.map(nameOf).join('')}` : `⏳ 시간 끝 ${e.u.length}명`}</span>{/each}</div>
          {#if nunPeople.length}<FunCrowd kind="nun" people={nunPeople} k={crowdK} />{/if}{/if}
      {:else if ff}
        <h3>{KIND[ff.kind as Kind].short}{ff.kind === 'quiz' ? ` · ${ff.n} / ${Math.min(QN, ff.queue.length)}` : ` · ${ff.n}판`}</h3>
        {#if ff.phase === 'end'}
          <p class="big">{ff.kind === 'quiz' ? '⭕ OX 타임 끝 · 결과는 폰에' : `🏆 우승 ${(ff.win || []).length}명`}</p>
          {#if ff.kind !== 'quiz'}<div class="crowd">{#each ff.win || [] as u (u)}<span><HeroSprite id={R.players?.[u]?.hero ?? 0} scale={2} /><em>{nameOf(u)}</em></span>{/each}</div>{/if}
        {:else}
          <p class="s">{ff.s ? '' : funCat ? `${funCat} · ` : ''}{ff.rps ? '✊✌️✋ 선생님 손에 지면 탈락 · 안 내면 💤' : KIND[ff.kind].rule}</p>
          {#if ff.s}<p class="q">{ff.s}</p>{/if}
          <div class="vs">{#each ff.q as t, k (k)}<span class="o{k}">{t}</span>{/each}</div>
          {#if ff.phase === 'show'}<p class="ver">{verdict(ff)}</p>{:else}<div class="cd">{funSec}</div>{/if}
          {#if revPeople.length}<FunCrowd kind="rev" people={revPeople} k={crowdK} />{/if}
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
  {#if giftShow && R?.state.gift}<div class="gift" role="status">🎁 선생님 선물! 모두 💎 {R.state.gift.g}</div>{/if}
  {#if ink}<Ink step={i} onclose={() => (ink = false)} />{/if}

  <!-- 조작 막대 (#119 덧붙임 2): 🔊 · ⛶ | 🏕 · 🎬 · 📄 · 🎮 · ✏ | 🔴 집중 · « 뒤로 · 앞으로 ▶ · 📌 — 캠프 · 메뉴 · 수업 끝 단추 없음 (수업 닫기 = 교사 폰) -->
  <nav class="dock" class:on={dockOn} class:small={view === 'camp'} aria-label="조작 막대">
    <button type="button" class="t" class:off={!sound} aria-pressed={!sound} onclick={() => (sound = !sound)}>{sound ? '🔊' : '🔇'}<small>{sound ? '소리' : '꺼짐'}</small></button>
    <button type="button" class="t" onclick={full}>⛶<small>전체</small></button>
    {#if R && !isLobby(R) && !R.state.closed && view !== 'camp' && R.state.rest}
      <!-- 🏕 쉼터 동안 가운데 묶음 = 놀이 5개 (리모컨 시트와 같은 순서) -->
      <span class="sep"></span>
      {#each gamesOn() as g (g.k)}<button type="button" class="t" class:on={fun?.kind === g.k && fun.phase !== 'end'} onclick={() => playGame(g.k)}>{g.ic}<small>{g.name}</small></button>{/each}
    {:else if R && !isLobby(R) && !R.state.closed && view !== 'camp'}
      <span class="sep"></span>
      <button type="button" class="t" class:on={!!R.state.rest} onclick={() => setRest(S, code, !R.state.rest)}>🏕<small>쉼터</small></button>
      <button type="button" class="t" disabled={!step || !L.videos?.[step.id]} onclick={() => setVideo(S, code, R.state.video ? null : step?.id ?? null)}>🎬<small>영상</small></button>
      <button type="button" class="t" class:on={!!R.state.sheet} disabled={!mid && step?.kind !== 'concept'} onclick={() => setSheet(S, code, R.state.sheet ? null : step?.id ?? null)}>📄<small>문제</small></button>
      <button type="button" class="t" class:on={demo} disabled={!mid && step?.kind !== 'boss'} onclick={() => (demo = !demo)}>🎮<small>시연</small></button>
      <button type="button" class="t" class:on={ink} onclick={() => (ink = !ink)}>✏<small>필기</small></button>
    {/if}
    {#if R && !R.state.closed}
      <span class="sep"></span>
      {#if view !== 'camp' && !isLobby(R)}<button type="button" class="n fo" class:on={!!R.state.focus} aria-pressed={!!R.state.focus} onclick={() => setFocus(S, code, !R.state.focus)}>🔴 집중</button>
        <button type="button" class="n" disabled={i <= 0} onclick={() => prevStep(S, L, code)}>« 뒤로</button>{/if}
      {#if !isEnd(L, R)}<button type="button" class="n go" disabled={isLobby(R) && view === 'lobby' && !ids.length} onclick={go}>{goLabel}<small>{goSub}</small></button>{/if}
    {/if}
    <button type="button" class="t" class:on={pin} aria-pressed={pin} onclick={() => (pin = !pin)}>📌<small>고정</small></button>
    <button type="button" class="t" data-k="out" aria-label="처음 화면으로" onclick={() => { if (confirm('🚪 처음 화면으로 갈까요? (교실 TV 로그인만 끝나요 · 수업 기록은 그대로)')) location.replace(location.pathname); }}>🚪<small>처음</small></button>
  </nav>

  {#if hero}<div class="heroov"><div class="hk" style:transform="translateZ(0) scale({hk})"><MyHero me={M.me} persist={M.save} onclose={() => (hero = false)} /></div></div>{/if}
</div>

<style>
  /* 📺 TV 글자 = 한 글꼴(테마 토큰 --font) · 크기 4단계 · 굵기 2단계(500 · 700) (#157 · arena/layout TV_FS 와 같은 값) */
  /* 📺 16:9 무대 (📜 2026-11-13 밤 선생님 「화면마다 비율이 달라도 16:9 에 맞춰 정돈」): 창이 어떤 비율이든 가운데 16:9 틀 하나 · 남는 곳 = 흐린 캠프 바탕(.tvout) · 모든 TV 화면이 이 틀 */
  .tvout { position: fixed; inset: 0; background: #0b0a08 center / cover no-repeat; filter: blur(18px) brightness(0.45); transform: scale(1.06); }
  .tv { position: fixed; left: 50%; top: 50%; width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16)); translate: -50% -50%; container-type: size; overflow: hidden; color: #fff; font-family: var(--font); font-weight: 500; background: #0b0a08; --tv-big: 6cqh; --tv-title: 3.2cqh; --tv-body: 2.4cqh; --tv-small: 1.8cqh; }
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
  .tlt.edge { transform: translateX(-90%); }
  .tlt.start { transform: translateX(-10%); }
  .tlt.red { border-color: #e5484d; color: #ffb3b0; }
  .nbox { position: absolute; right: 1.5cqw; top: 11cqh; z-index: 3; width: 15cqw; min-height: 11cqh; border-radius: 1.6cqh; background: rgba(8, 9, 12, 0.75); border: 1px solid rgba(255, 255, 255, 0.18); padding: 1.2cqh 1.2cqw; display: flex; flex-direction: column; gap: 0.4cqh; overflow: hidden; }
  .nbox.over { z-index: 7; }
  .nbox small { font-size: var(--tv-small); font-weight: 700; color: #d6d9e0; }
  .nbox b { font-size: var(--tv-big); line-height: 1; color: var(--accent); }
  .nbox b span { font-size: var(--tv-title); color: #fff; }
  .nbox em { font-style: normal; font-size: var(--tv-small); color: #ffd7a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* 캠프 그림 + QR 카드 = 한 묶음 가운데 (높이 80% · 사이 3%) */
  .campwrap { position: absolute; left: 0; right: 0; top: 3.8cqw; bottom: 0; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 3cqw; }
  .campv { position: relative; flex: none; height: 80cqh; z-index: 1; }
  .campv img { position: absolute; image-rendering: pixelated; }
  .campv .cl0 { inset: 0; width: 100%; height: 100%; position: absolute; }
  .campv .obj.on { filter: brightness(1.3); }
  .campv .me { position: absolute; z-index: 1; transform: translateX(-50%); }
  .ob.me2 { cursor: pointer; border-color: #6cc6ff; color: #fff; font: inherit; } .ob.me2 small { color: #6cc6ff; }
  .campv .gate { opacity: 0; } .campv .gate.on { opacity: 1; }
  .tprop, .tfire { position: absolute; z-index: 2; display: block; image-rendering: pixelated; background-repeat: no-repeat; }
  .ob.blw { left: 50%; top: 100%; transform: translate(-50%, 2px); } .ob.zl { transform: translate(-50%, -110%); }
  .ob { position: absolute; transform: translate(-50%, -50%); z-index: 2; display: flex; flex-direction: column; align-items: center; padding: 0.5cqh 0.9cqw; border-radius: 1.4cqh; background: rgba(10, 12, 18, 0.82); border: 1px solid rgba(255, 255, 255, 0.22); white-space: nowrap; box-shadow: 0 3px 0 #000; }
  .ob b { font-size: calc(var(--tv-body) * 0.55); } .ob small { display: none; } /* TV 이름표 = 절반 · 한 줄 · 아이콘 + 이름만 */
  .ob { padding: 0.25cqh 0.5cqw !important; border-radius: 0.8cqh !important; box-shadow: 0 2px 0 #000 !important; }
  .campqr { position: relative; flex: none; width: 26cqw; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 1.4cqh; padding: 2cqh 1.4cqw; border-radius: 2cqh; background: rgba(8, 9, 12, 0.8); border: 1px solid rgba(255, 255, 255, 0.18); text-align: center; }
  .campqr :global(svg) { width: 34cqh; height: 34cqh; border-radius: 1.2cqh; }
  .campqr small { font-size: var(--tv-small); color: #d6d9e0; }
  .cc { font-size: var(--tv-body); font-weight: 700; } .cc b { display: block; font-size: var(--tv-big); color: var(--accent); letter-spacing: 0.4cqw; line-height: 1.1; }
  .cc.wait { font-size: var(--tv-title); padding: 8cqh 0; color: #d6d9e0; }
  .lring { position: absolute; left: 2cqw; right: 18cqw; top: 13cqh; bottom: 16cqh; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 2cqh; }
  .tchr { display: flex; flex-direction: column; align-items: center; gap: 0.6cqh; }
  .tchr span { font-size: var(--tv-body); font-weight: 700; background: rgba(8, 9, 12, 0.72); padding: 0.3cqh 1cqw; border-radius: 999px; }
  .bub { font-style: normal; font-size: var(--tv-title); font-weight: 700; color: #1a1300; background: #fff7e0; padding: 1cqh 1.6cqw; border-radius: 2cqh; position: relative; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.5); }
  .bub::after { content: ''; position: absolute; left: 50%; bottom: -1.4cqh; margin-left: -1cqh; border: 1cqh solid transparent; border-top-color: #fff7e0; }
  .rows { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.2cqh 1.4cqw; max-width: 76cqw; }
  .h { display: flex; flex-direction: column; align-items: center; gap: 0.3cqh; }
  .h span { font-size: var(--tv-small); font-weight: 700; background: rgba(8, 9, 12, 0.72); padding: 0.2cqh 0.7cqw; border-radius: 999px; white-space: nowrap; }
  .h.nin { opacity: 0.4; }
  .split { position: absolute; left: 2cqw; right: 2cqw; top: 13cqh; bottom: 3cqh; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 1.4cqw; }
  .split.z1 { grid-template-columns: 1fr 0fr; } .split.z2 { grid-template-columns: 0fr 1fr; }
  .split.z1 .cpane:nth-child(2), .split.z2 .cpane:nth-child(1) { display: none; }
  .cpane { position: relative; text-align: left; border: 0; border-radius: 2cqh; background: #fbf8f1; color: #1b1a17; padding: 3cqh 2cqw; display: flex; flex-direction: column; gap: 1.4cqh; overflow: hidden; font: inherit; cursor: zoom-in; }
  .cpane .lab { font-size: var(--tv-body); font-weight: 700; color: #7a4a10; }
  .cpane h4 { margin: 0; font-size: var(--tv-title); }
  .cpane p { margin: 0; font-size: var(--tv-title); line-height: 1.5; }
  .split.z1 .cpane p, .split.z2 .cpane p { font-size: var(--tv-title); }
  .pimg { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 1.4cqh; }
  .pimg :global(.pi) { height: 100%; } .pimg :global(.pi img) { height: 100%; width: 100%; object-fit: contain; }
  .simg { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; gap: 1.4cqh; overflow: hidden; }
  .simg :global(.pi) { height: 100%; } .simg :global(.pi img) { height: 100%; width: 100%; object-fit: contain; }
  .zm { position: absolute; right: 1.4cqw; bottom: 1.4cqh; font-style: normal; font-size: var(--tv-small); color: #7a6850; }
  .sc { position: absolute; right: 1.5cqw; top: 25cqh; z-index: 3; padding: 1.4cqh 1.4cqw; border-radius: 1.6cqh; background: rgba(8, 9, 12, 0.78); border: 1px solid rgba(255, 255, 255, 0.2); display: flex; flex-direction: column; gap: 0.6cqh; align-items: flex-end; }
  .sc .q { font-size: var(--tv-body); font-weight: 700; }
  .sc .r { font-size: var(--tv-body); } .sc .r b { font-size: var(--tv-big); color: #9fc8ff; }
  .adj { margin-left: 0.6cqw; font-weight: 700; color: #9fc8ff; background: rgba(20, 34, 58, 0.85); border: 2px solid #6aa3ff; border-radius: 999px; padding: 0.3cqh 1cqw; }
  .dpane { position: absolute; right: 1.5cqw; top: 11cqh; bottom: 2cqh; width: 40cqw; z-index: 4; border-radius: 2cqh; overflow: hidden; border: 1px solid var(--line); }
  .endv { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqh; }
  .endv b { font-size: var(--tv-big); text-shadow: 0 4px 0 #000; } .endv p { font-size: var(--tv-title); margin: 0; }
  .ov { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.6cqh; text-align: center; background: rgba(5, 6, 10, 0.55); }
  .ov b { font-size: var(--tv-big); text-shadow: 0 4px 0 #000; }
  .ov p { margin: 0; font-size: var(--tv-title); font-weight: 700; }
  .ov.fun .credit { position: absolute; right: 1.6cqw; bottom: 1.2cqh; font-size: var(--tv-small); color: #cfd3db; }
  .ov.fun { background-color: #13201a !important; background-size: cover !important; background-position: center !important; top: 7.4cqw; z-index: 6; bottom: 0; gap: 1.4cqh; padding: 0 6cqw 12cqh; }
  .ov.fun h3 { margin: 0; font-size: var(--tv-big); }
  .ov.fun .s { font-size: var(--tv-title); color: #cfd3db; font-weight: 500; }
  .ov.fun .q { font-size: var(--tv-big); max-width: 80cqw; line-height: 1.35; }
  .ov.fun .vs { display: flex; gap: 2cqw; }
  .ov.fun .vs span { min-width: 22cqw; padding: 2cqh 2cqw; border-radius: 2cqh; font-size: var(--tv-title); font-weight: 700; background: #2f5f9e; box-shadow: 0 0.6cqh 0 rgba(0, 0, 0, 0.45); }
  .ov.fun .vs .o1 { background: #9e3f3f; } .ov.fun .vs .o2 { background: #4a7a3a; }
  .ov.fun .cd { font-size: var(--tv-big); font-weight: 700; color: #f5b84a; font-variant-numeric: tabular-nums; line-height: 1; }
  .ov.fun .ver, .ov.fun .big { font-size: var(--tv-title); color: #f5b84a; }
  .ov.fun .crowd { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.4cqw; max-width: 84cqw; }
  .ov.fun .crowd span { display: flex; flex-direction: column; align-items: center; } .ov.fun .crowd em { font-style: normal; font-size: var(--tv-body); font-weight: 700; }
  .ov.fun .evs { display: flex; gap: 1cqw; flex-wrap: wrap; justify-content: center; } .ov.fun .evs span { background: rgba(24, 27, 34, 0.9); border-radius: 99px; padding: 0.8cqh 1.6cqw; font-size: var(--tv-body); font-weight: 700; }
  .ov.fun .err { color: #ffb4ae; font-size: var(--tv-title); } .ov.fun .frz { color: #ffb4ae; font-size: var(--tv-title); }
  .ov.fun.still .cd { opacity: 0.5; }
  .ov small { font-size: var(--tv-body); color: #d6d9e0; }
  .ov.sheet { background: rgba(251, 248, 241, 0.97); color: #1b1a17; align-items: flex-start; justify-content: flex-start; padding: 12cqh 6cqw; text-align: left; }
  .ov.sheet b { font-size: var(--tv-title); text-shadow: none; }
  .ov.sheet p { font-size: var(--tv-title); font-weight: 500; }
  .ov.vid video { max-width: 80cqw; max-height: 80cqh; }
  .ov.door .k { font-size: var(--tv-big); }
  .ov.door small b { color: var(--accent); font-size: var(--tv-title); }
  .ext { height: 9cqh; padding: 0 3cqw; border: 0; border-radius: 2cqh; background: var(--accent); color: var(--on-accent); font: 700 var(--tv-title) var(--font); box-shadow: 0 4px 0 var(--accent-sh); cursor: pointer; }
  .plus { font-size: var(--tv-big); font-weight: 700; color: var(--accent); }
  .gift { position: absolute; left: 50%; top: 16cqh; transform: translateX(-50%); z-index: 7; font-size: var(--tv-big); font-weight: 700; padding: 1.4cqh 3cqw; border-radius: 999px; background: rgba(8, 9, 12, 0.85); border: 2px solid var(--gem); }
  .dock { position: absolute; right: 1.5cqw; bottom: 2cqh; z-index: 8; display: flex; align-items: center; gap: 0.5cqw; padding: 0.8cqh 0.8cqw; border-radius: 2cqh; background: rgba(8, 9, 12, 0.88); border: 1px solid rgba(255, 255, 255, 0.18); opacity: 0; transform: translateY(1cqh); transition: opacity var(--t), transform var(--t); pointer-events: none; max-width: 97cqw; }
  .dock.on { opacity: 1; transform: none; pointer-events: auto; }
  .dock.small { scale: 0.7; transform-origin: right bottom; } /* 교사 캠프 리모컨 0.7배 (선생님) */
  .dock button { cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.16); background: rgba(255, 255, 255, 0.06); color: #fff; border-radius: 1.4cqh; font: 700 var(--tv-body) var(--font); }
  .dock button:disabled { opacity: 0.35; cursor: default; }
  .dock .t { width: 7cqh; height: 7.6cqh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2cqh; padding: 0; }
  .dock .t small { font-size: var(--tv-small); color: #d6d9e0; }
  .dock .t.on { border: 2px solid var(--accent); }
  .dock .t.off { border: 2px solid var(--bad); }
  .dock .n { height: 7.6cqh; padding: 0 1.2cqw; font-size: var(--tv-body); display: flex; flex-direction: column; align-items: center; justify-content: center; white-space: nowrap; }
  .dock .n small { font-size: var(--tv-small); color: inherit; opacity: 0.8; }
  .dock .n.go { background: var(--accent); color: var(--on-accent); border-color: var(--accent); box-shadow: 0 3px 0 var(--accent-sh); }
  .dock .n.fo { border: 2px solid #e5484d; }
  .dock .n.fo.on { background: #e5484d; color: #fff; }
  .dock .sep { width: 1px; height: 6cqh; background: rgba(255, 255, 255, 0.2); margin: 0 0.3cqw; }
  .heroov { position: absolute; inset: 0; z-index: 12; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; }
  .hk { position: relative; flex: none; width: 430px; height: 760px; border-radius: 22px; overflow: hidden; color: var(--text); background: var(--bg); }
</style>
