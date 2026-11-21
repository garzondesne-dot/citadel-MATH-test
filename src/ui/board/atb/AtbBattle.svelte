<script lang="ts">
  // ⚔ 게시판 던전 ATB 전투 화면 (시안 atb-1-wide · atb-2-quiz · atb-5-cutin · 📜 결정 11 · 정리.md 2)
  //   가로 무대 · 왼쪽 용사 한 줄(원근 앞 100% → 맨 뒤 70% · 내 용사 맨 아래 가장 크게 · 발은 모두 바닥 위) · 오른쪽 보스 · 단추 [공격][스킬 ▸ 부채꼴][문제 풀기]
  //   📜 11/20 요청 #4 (Y1 ~ Y12): 충전 = 원문항 통째 · 최대 3 · 스킬 = 공격 둘레 고정 단추(요청 #9) · ATB = 내 초상 둘레 고리 · 친구 = 발밑 고리 · HP = 큰 숫자 + 가는 띠 · 카드 47% · 채점 → 충전 연출
  //   문제를 열면 = 보스가 앞으로 걸어 나오고 용사가 왼쪽으로 모임 → 빈 오른쪽에 양피지 문제 카드(보스를 가리지 않음)
  //   이 화면은 그리기 · 누르기만 · 규칙 = src/board/atb/engine.ts · 숫자 = tune.ts
  import { onDestroy, onMount, untrack } from 'svelte';
  import type { Given, LessonPack } from '../../../model/types';
  import { heroOf, skillName } from '../../../model/hero';
  import { dungeonOf } from '../../manifest';
  import HeroSprite from '../../camp/HeroSprite.svelte';
  import Sprite from '../../Sprite.svelte';
  import AtbIcon, { type IconName } from './AtbIcon.svelte';
  import FamShield from './FamShield.svelte';
  import MonHit from '../../battle/MonHit.svelte';
  import { MHIT, mhitOf, type MhitKind } from '../../manifest';
  import { rectIn, ROT_ATTR } from '../../rot';
  import QuizCard from './QuizCard.svelte';
  import RaidHp from '../../battle/RaidHp.svelte';
  import TimingBar from './TimingBar.svelte';
  import { attack, canSkill, earn, healBlocked, skillList, tick, useSkill, weak, type Ev, type SkillK, type State, type Timing, skillPeek, canReact, telegraphOf, bossEveryOf, upcomingOf, calmed } from '../../../board/atb/engine';
  import { REACT } from '../../../board/atb/tune';
  import { portraitOf } from '../../manifest';
  import { lookOfStats } from '../../../board/atb/heroes';
  // 📜 11/20 요청 #3 손맛: 레이드 공격 연출(용사별 · 속성별)을 그대로 · 몬스터 공격 잠금 = 레이드 값
  import { attack as fxAttack, fit, shake, ultBlast, type Pose } from '../../fx/attack';
  import { sfx, soundPref, setSound } from '../../sound.svelte';
  import { bgm, bgmRate } from '../../bgm';
  import { actx } from '../../webaudio';
  import type { HPose } from '../../manifest';
  import { botStep, wrongOf, type Bot } from '../../../board/atb/bots';
  import { answer, nextOrigin, originsOf, startRun, easiestOf, questionsOf, noteSeen, shuffled, freshRun as newRun, sheetTitle, sheetNo, rngOf, loadSeen, saveSeen, seenKey, type Run } from '../../../board/atb/quiz';
  import { answerOf } from '../../../raid/raid';
  import { ATK, FAM_NAME, ROLE_SKILL, SIG, T, rage as RAGE, type Fam, type Role } from '../../../board/atb/tune';

  const { L, S, me, bots, seed = 'me', speed = 1, onend, fx = {}, bg = '' }: {
    L: LessonPack; S: State; /** 내 용사 번호 · -1 = 관전 */ me: number; bots: Bot[]; seed?: string; speed?: number; onend: (S: State) => void; /** 🎲 랜덤 던전 배경 열쇠 (Y9 · 없으면 차시 배경) */ bg?: string;
    /** 용사마다 장착 스킬 id (컷인 이름) */ fx?: Record<number, string>;
  } = $props();
  const FAM_ICON: Record<Fam, IconName> = { arms: 'fam-arms', flame: 'fam-flame', nature: 'fam-nature', wisdom: 'fam-wisdom', mystic: 'fam-mystic' };
  const ROLE_ICON: Record<Role, IconName> = { dealer: 'role-dealer', tank: 'role-tank', healer: 'role-healer', support: 'role-support' };

  // ── 시계 (이 폰 = 진행) ──
  // 🔄 돌린 화면(요청 #8 · 세로 폰) = 높이 · 너비가 바뀜 → 무대 크기는 돌린 뿌리 기준
  const rotNow = () => typeof document !== 'undefined' && !!document.querySelector(`[${ROT_ATTR}]`);
  let H = $state(typeof innerHeight === 'number' ? Math.min(innerHeight, innerWidth) : 390), Wd = $state(typeof innerWidth === 'number' ? Math.max(innerHeight, innerWidth) : 844);
  const onResize = () => { const r = rotNow(); H = r ? innerWidth : innerHeight; Wd = r ? innerHeight : innerWidth; };
  onMount(onResize);
  if (typeof window !== 'undefined') addEventListener('resize', onResize);
  let paused = $state(false), ended = false;
  const STEP = 0.1;
  const loop = setInterval(() => {
    lockLeft = lockUntil > Date.now() ? Math.ceil((lockUntil - Date.now()) / 1000) : 0;
    // 🐞 11/20 「처치 뒤 결과 화면 안 넘어감」 = 판 끝을 시계 안(봇 · 틱)에서만 봤음 → 내 공격 · 스킬 · 넘침 자동 스킬로 끝나면 다음 틱이 S.end 에서 바로 빠져 onend 를 못 부름 · 판 끝 검사를 맨 앞에(멈춤과도 상관없이)
    if (S.end) { if (!ended) { ended = true; setTimeout(() => onend(S), 1800); } return; }
    if (paused) return;
    for (let i = 0; i < speed && !S.end; i++) { tick(S, STEP); for (const b of bots) botStep(L, S, b, busyOf); autoStep(); }
  }, STEP * 1000);
  /** ⚔ 문제 카드를 연 채 ATB 가 차면 = T.autoAtkDelay 뒤 자동 일반 공격 (치명 없음 · ×1 · 타이밍 바 없음 · 📜 요청 #11) · 카드를 닫았으면 지금처럼 타이밍 */
  let fullAt = -1, autoTag = $state(0);
  /** ⚔ 풀이 중 자동 공격 켜기 · 끄기 (📜 요청 #24 ④ · 처음 켬 · 이 판 동안 마지막 값 기억) */
  let autoOn = $state(true);
  function autoStep() {
    const h = me >= 0 ? S.heroes[me] : null;
    if (!h || !open || !autoOn || !run || grading || over || h.down || h.atb < 1 || S.t < h.stunUntil || S.end) { fullAt = -1; return; }
    if (fullAt < 0) fullAt = S.t;
    if (S.t - fullAt >= T.autoAtkDelay) { fullAt = -1; attack(S, me, 'ok', true); }
  }
  // 💥 몬스터 공격에 맞음 = 문제 카드 잠깐 잠금 (📜 요청 #20 ① = T.hitLockMs 1초)
  let lockUntil = 0, lockLeft = $state(0), lockTag = $state('');
  // 🎵 전투 배경음 (📜 요청 #21): 레이드 곡(후보 2 · 5 · 4 = raid-1 · 2 · 3) 판마다 번갈아 → 실드 · 보스 체력 30% 아래 = 보스 곡(후보 10 · 11) 1초 교차
  //   이김 = Victory Short(win · 한 번) · 짐 = 조용히 멈춤 · 음량 = 효과음보다 작게(0.7) · 문제 카드 열림 = 더 작게(0.3) · 🎵/🔇 = 소리 설정과 같은 값
  const bgmN = untrack(() => { try { const n = (+(localStorage.getItem('atb-bgm-n') || 0) || 0) + 1; localStorage.setItem('atb-bgm-n', String(n)); return n; } catch { return Math.floor(Math.random() * 6); } });
  const RAID = `raid-${(bgmN % 3) + 1}`, BOSS = `boss-${(bgmN % 2) + 1}`;
  const bgmK = $derived(S.end ? (S.end.win ? 'win' : null) : S.shieldUp || S.bossHp < S.bossMax * 0.3 ? BOSS : RAID);
  $effect(() => { bgm(bgmK, 'phone', { scale: open ? 0.3 : 0.7, fadeMs: 1000 }); });
  onDestroy(() => { bgm(S.end?.win ? 'win' : null, 'phone', { scale: 0.25, fadeMs: 1000 }); /* 결과 화면 = 승리 곡 아주 작게 끝까지(한 번) · 짐 = 멈춤 */ clearInterval(loop); if (typeof window !== 'undefined') removeEventListener('resize', onResize); });

  // ── 내 문제 ──
  // 🔁 📜 요청 #19 덧2 = 판마다 원문항 순서 섞음 · 판(버전) = 이 기기에서 최근 본 것 피함 · 친구가 지금 쓰는 판 피함
  const qRnd = untrack(() => rngOf(`${seed}|q`)), OS = untrack(() => shuffled(originsOf(L), qRnd)), vSeen = loadSeen();
  /** 이 원문항에서 다른 사람(봇 · 나)이 지금 쓰는 판 */
  function busyOf(mid: string, who: number): number[] { const xs = bots.filter((b) => b.who !== who && b.run?.mid === mid).map((b) => b.run!.ver); if (who !== me && run?.mid === mid) xs.push(run.ver); return xs; }
  function freshRun(mid: string): Run { const r = newRun(L, mid, seed, vSeen, busyOf(mid, me), qRnd); saveSeen(vSeen); return r; }
  let open = $state(false), run = $state<Run | null>(null), flash = $state(''), hintUsed = $state(false), done: Record<string, number> = {};
  let fT: ReturnType<typeof setTimeout> | undefined;
  const meH = $derived(me >= 0 ? S.heroes[me] : null);
  function openQuiz() {
    if (!run) { const mine = S.shieldUp && S.cells.some((c) => c.owner === me && !c.broken); const o = nextOrigin(OS, done, mine && meH && !meH.ch ? easiestOf(OS)?.mid : null); if (o) run = freshRun(o.mid); hintUsed = false; }
    open = true;
  }
  /** 📝 채점 → ⚡ 충전 연출 (Y8 · 약 2초 · 누르면 건너뜀): 소문항 ○ × 차례로 → 카드가 쑥 빨려 들어가 에너지 → 충전 칸 */
  let grading = $state<{ marks: boolean[]; perfect: boolean; n: number; want: number; suck: boolean } | null>(null), gT: ReturnType<typeof setTimeout>[] = [];
  function finishGrade() {
    if (!grading) return; const n = grading.n, over = Math.max(0, grading.want - n), from = cardCenter(); gT.forEach(clearTimeout); gT = []; grading = null; run = null;
    // ✨ 퍼펙트 +1 = 금 구슬 1개 (소문항 구슬은 맞힐 때마다 이미 날아감 · 📜 요청 #41) · 넘친 금 구슬 = 내 용사에게(자동 스킬)
    for (let i = 0; i < n; i++) setTimeout(() => flyOrb(true, from, 'orbs', () => { pendOrb = Math.max(0, pendOrb - 1); tone(4); }), i * 180);
    for (let j = 0; j < over; j++) setTimeout(() => flyOrb(true, from, 'me', () => tone(4)), (n + j) * 180);
    if (n) setTimeout(() => { chgPop = '✨ 퍼펙트 +1'; setTimeout(() => (chgPop = ''), 1400); }, 450);
    setTimeout(() => { if (!run) open = false; }, Math.max(n, over) * 180 + 60); // 📜 요청 #10 ① 충전 뒤 = 문제 카드 닫음 · 무대가 다 보이게 · 다음 문제 = 「문제 풀기」를 눌러야
  }
  let chgPop = $state('');
  let barrierFx = $state(0), bossFrost = $state(0), bossCurse = $state(0);
  // 👹 분노 (요청 #37) = 진정 남은 초 · 배경음 빠르게 1.15
  const calmLeft = $derived(calmed(S) ? Math.ceil((S.calmUntil ?? 0) - S.t) : 0);
  $effect(() => { const r = !!S.rage && !calmLeft && !S.end; untrack(() => bgmRate(r ? 1.15 : 1)); });
  onDestroy(() => bgmRate(1));
  /** 아직 날아가는 구슬 수 = 단추 구슬은 닿을 때 한 칸씩 켜짐 (엔진 충전은 이미 들어감) */
  let pendOrb = $state(0);
  const shownCh = $derived(Math.max(0, (meH?.ch ?? 0) - pendOrb));
  /** 카드 머리 조각 자리 (요청 #41 구슬 출발) */
  const shardCenter = (k: number) => { const st = stageEl, c = st?.querySelectorAll('[data-k="atb-shards"] .sh')[k]; if (!st || !c) return cardCenter(); const R = rectIn(st), A = rectIn(c); return { x: A.left + A.width / 2 - R.left, y: A.top + A.height / 2 - R.top }; };
  const cardCenter = () => { const st = stageEl, c = st?.querySelector('.card'); if (!st || !c) return null; const R = rectIn(st), A = rectIn(c); return { x: A.left + A.width / 2 - R.left, y: A.top + A.height * 0.45 - R.top }; };
  /** 🎵 한 음씩 올라감 (도 · 미 · 솔 · 높은 도 …) · 효과음 설정 따름 */
  function tone(i: number) { if (!soundPref.sfx) return; const c = actx(); if (!c) return; const f = [523.25, 659.25, 783.99, 1046.5, 1318.5][Math.min(4, i)]!, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.24); }
  const firstTry: Record<string, boolean[]> = {};
  let mhit = $state<{ k: number; kind: MhitKind; to: number[] } | null>(null), mhN = 0;
  let fN = $state(0), combo = 0, canSend = $state(false), skOpen = $state(false), gearOpen = $state(false), revFx = $state<{ from: number; to: number; n: number } | null>(null);
  let qc = $state<{ send: () => void } | undefined>(), cardEl = $state<HTMLElement | undefined>(), dragY = $state(0), dragging = $state(false);
  /** 🤏 손잡이 바 끌어 넣기 = 닫힘 (📜 선생님 덧붙임 9) · 카드가 손을 따라 내려옴 · 28% 넘게 끌면 쏙 · 덜 끌면 되돌아감 · 돌린 화면 = 화면 가로가 안쪽 세로 */
  function grab(ev: PointerEvent) {
    ev.preventDefault(); const rot = !!stageEl?.closest('[data-rot90]'), x0 = ev.clientX, y0 = ev.clientY, h = cardEl?.offsetHeight ?? 300; dragging = true;
    const mv = (e: PointerEvent) => { dragY = Math.max(0, rot ? -(e.clientX - x0) : e.clientY - y0); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); dragging = false;
      if (dragY > h * 0.28) { dragY = h; setTimeout(() => { if (grading) finishGrade(); open = false; dragY = 0; }, 200); } else dragY = 0; };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  function startGrade(marks: boolean[], perfect: boolean, n: number) {
    grading = { marks, perfect, n, want: perfect ? T.charge.perfect : 0, suck: false }; // n = 퍼펙트 +1 중 실제로 들어간 칸 (넘치면 0)
    const t1 = 300 + marks.length * 260; // ○ △ 하나씩 0.26초 · 📜 채점 △ = 고쳐 맞힘 · 소리 = ○ 맑게 · △ 부드럽게(× 소리 안 씀)
    marks.forEach((m, i) => gT.push(setTimeout(() => { if (grading) sfx(m ? 'correct' : 'ink', m ? 0.35 : 0.3); }, 300 + i * 260)));
    gT.push(setTimeout(() => { if (grading) grading = { ...grading, suck: true }; sfx('scroll', 0.6); }, t1), setTimeout(finishGrade, t1 + 450));
  }
  function submit(g: Given) {
    if (!run || grading) return;
    if (lockLeft > 0) return;
    const ev0 = S.evN, k0 = run.k, mid0 = run.mid, before = meH?.ch ?? 0, o = answer(L, run, seed, g, [...(vSeen[seenKey(L, run.mid)] ?? []), ...busyOf(run.mid, me)]); earn(S, me, o.earn);
    // ⚡ 📜 요청 #41 = 맞힌 소문항 조각에서 구슬 1개가 바로 「스킬」 단추로 (카드 안 닫힘) · 넘치면 내 용사에게 · 퍼펙트 금 구슬은 채점 끝에
    let pfN = 0;
    { const ce = S.ev.filter((x) => (x.n ?? 0) > ev0 && x.k === 'charge' && x.who === me) as Extract<Ev, { k: 'charge' }>[];
      const sub = ce.find((x) => !x.perfect), pf = ce.find((x) => x.perfect), from = shardCenter(k0);
      if (sub) { pendOrb += sub.add; if (sub.add) flyOrb(false, from, 'orbs', () => { pendOrb = Math.max(0, pendOrb - 1); tone(Math.min(3, combo)); }); if (sub.over) flyOrb(true, from, 'me', () => tone(4)); }
      if (pf) { pendOrb += pf.add; pfN = pf.add; } void before; }
    if (o.earn.swapped) { const k = seenKey(L, run.mid); vSeen[k] = noteSeen(vSeen[k] ?? [], o.run.ver); saveSeen(vSeen); }
    flash = o.earn.done ? '' : o.earn.right ? (o.earn.gold ? 'gold' : 'ok') : o.earn.swapped ? 'swap' : 'wrong';
    clearTimeout(fT); fT = setTimeout(() => (flash = ''), 1300);
    // ⭐ 첫 시도 기록 = 소문항마다 처음 낸 답만 (📜 요청 #29 = 차시 정복 지도 별 규칙 gradeOf 그대로 · 틀림 · 안 푼 것 비율)
    { const a = (firstTry[mid0] ??= []); if (a[k0] === undefined && !o.earn.swapped) a[k0] = o.earn.right; else if (a[k0] === undefined && o.earn.swapped) a[k0] = false;
      if (meH) { const all = Object.values(firstTry).flat(), ok = all.filter((x) => x === true).length, bad = all.filter((x) => x === false).length, total = OS.reduce((s, x) => s + x.n, 0); meH.log.first = { ok, bad, none: Math.max(0, total - ok - bad), total }; } }
    fN++; // 📜 선생님 덧붙임 10 · 11 = 맞음 톡-톡 · 연달아 = 박자 맞춘 소리 · 틀림 = 찌잉(한 번 길게)
    if (o.earn.right) { combo++; sfx('correct', 0.5); if (combo >= 2) setTimeout(() => sfx('star', Math.min(0.5, 0.2 + combo * 0.06)), 92); try { navigator.vibrate?.([22, 70, 22]); } catch { /* 무시 */ } }
    else { combo = 0; try { navigator.vibrate?.(320); } catch { /* 무시 */ } }
    if (o.earn.done) { done[run.mid] = (done[run.mid] || 0) + 1; if (meH) { const sn = `${sheetNo(L, run.mid).no}${o.earn.perfect ? '✨' : ''}`; meH.log.sheets = [...(meH.log.sheets ?? []), sn]; } run = o.run; startGrade(o.earn.marks ?? [], o.earn.perfect, pfN); } else run = o.run;
  }
  /** 🛡 실드가 뜨면 = 내 칸을 깰 표가 없고 지금 문제가 가장 쉬운 칸이 아니면 → 가장 쉬운 칸으로 (U3 막힘 안전망 · 충전은 그대로) */
  function shieldSwap() {
    const ez = easiestOf(OS); if (!meH || !ez || meH.ch > 0 || !run || grading || run.mid === ez.mid) return;
    run = freshRun(ez.mid); hintUsed = false; flash = 'shieldSwap'; clearTimeout(fT); fT = setTimeout(() => (flash = ''), 2200);
  }
  const titleOf = (r: Run) => sheetTitle(L, r.mid, r.k, questionsOf(L, r, seed).length); // 📄 학습지 번호 (요청 #24 덧붙임)

  // ── 내 행동 ──
  let over = $state<'' | 'timing' | 'pick'>(''), tb = $state<{ stop: () => void }>(), pickK = $state<SkillK>('role');
  const ready = $derived(!!meH && !meH.down && meH.atb >= 1 && S.t >= meH.stunUntil && !S.end);
  /** 💠 지금 쓸 수 있는 스킬 (ok = 충전 · ATB 됨) */
  const skills = $derived(me >= 0 ? skillList(S, me) : []);
  const anySkill = $derived(skills.some((x) => x.ok));
  function doAttack() { if (ready && !over) over = 'timing'; }
  /** ⚔ 「공격」 단추 = 타이밍 바가 열리면 그 자리에서 「멈춤」 단추 (손가락 안 옮김 · 누르는 순간 멈춤) */
  function atkDown(e: PointerEvent) { if (over === 'timing') { e.preventDefault(); tb?.stop(); } }
  /** 💠 스킬 = 「⚔ 공격」 둘레 고정 자리 동그란 단추 (📜 요청 #9 · Y3 바뀜) · 한 번 톡 = 바로 발동 · 진동 = 발동 때 · 엄호 · 격려 · 부활(둘 이상) = 누구에게
   *   고정 칸 = 장착 · 역할 · 4레벨(Ⅳ) · 오라 방패(+10) · 각성(각성) — 모자라거나 다 쓰면 회색 · 쓸 수 있게 되는 순간 반짝 / 상황 칸 = 보호막 부수기 · 부활(그때만 나타남) */
  type Slot = { k: SkillK; cost: number; ok: boolean; fix: boolean };
  /** 📜 요청 #19 = ⚡ 내 스킬 · 역할 · 🌟 비장(각성 · 홀리 방패 · 없으면 칸 없음) + 💖 부활(그때만) · 실드가 뜨면 ⚡ 내 스킬 = 실드 칸 깸 */
  const slots = $derived.by((): Slot[] => {
    if (!meH) return []; const L0 = skillList(S, me);
    const out: Slot[] = L0.filter((x) => x.k !== 'revive').map((x) => ({ k: x.k, cost: x.cost, ok: x.ok || (x.k === 'equip' && canSkill(S, me, 'shield')), fix: true }));
    if (meH.s.awk && !out.some((x) => x.k === 'awk')) out.push({ k: 'awk', cost: T.cost.awk, ok: false, fix: true }); // 판당 1번 다 씀 = 회색으로 남김
    else if (!meH.s.awk && meH.s.aura && !out.some((x) => x.k === 'aura')) out.push({ k: 'aura', cost: T.cost.aura, ok: false, fix: true });
    for (const x of L0.filter((y) => y.k === 'revive')) out.push({ k: x.k, cost: x.cost, ok: x.ok, fix: false });
    if (reactNow) { const i = out.findIndex((x) => x.k === 'role'); if (i > 0) out.unshift(...out.splice(i, 1)); } // 🛡 반응 막기 = 역할 스킬 맨 앞 (요청 #35)
    return out;
  });
  // 🛡 📜 요청 #35 예고 · 반응 막기 안내
  const tg = $derived(S.end ? null : telegraphOf(S));
  const reactNow = $derived(me >= 0 && canReact(S, me));
  const REACT_TXT: Record<string, string> = { tank: '🛡 지금 엄호! 대신 맞아 줘요 (바로 쓸 수 있어요)', support: '🎵 지금 격려! 결계로 광역을 줄여요 (바로 쓸 수 있어요)', dealer: '⚔ 지금 강타! 모으기를 끊어요 (바로 쓸 수 있어요)' };
  const ROLE_COL: Record<string, string> = { tank: '#3a7ad8', support: '#c8862a', dealer: '#d8402a', healer: '#2faa5a' };
  const ROLE_KO: Record<string, string> = { tank: '탱커', support: '서포터', dealer: '딜러' };
  const tgLine = $derived(tg ? (tg.cls === 'single' ? `⚠ ${S.target?.map((i) => S.heroes[i]?.s.name).join(' · ') ?? ''} 노림 · 🛡 탱커가 막을 수 있어요` : tg.cls === 'aoe' ? `💥 광역! · 🎵 서포터 결계로 줄여요` : `🌀 ${tg.atk} 모으는 중 · ⚔ 딜러 강타로 끊어요`) : '');
  const hasRole = (r: string) => S.heroes.some((h) => h.s.role === r && !h.down);
  /** 🌀 특수 모으기 막대 (보스 머리 위 · 4초) */
  const chargeP = $derived(tg?.cls === 'special' ? (S.breathWarn != null && !S.target ? Math.min(1, (S.t - S.breathWarn) / SIG.breath.warn) : Math.min(1, Math.max(0, (S.bossT - (bossEveryOf(S) - (ATK[S.nextAtk!]?.warn ?? T.telegraph))) / (ATK[S.nextAtk!]?.warn ?? T.telegraph)))) : 0);
  let reactKey = '', healNowT = $state(0);
  $effect(() => { const r = reactNow, k = `${S.bossN}|${S.breathWarn ?? ''}`; untrack(() => { if (r && reactKey !== k) { reactKey = k; try { navigator.vibrate?.([60, 40, 60]); } catch { /* 무시 */ } snd('focus', 0.6); } }); });
  const breaksShield = $derived(me >= 0 && S.shieldUp && S.cells.some((c) => c.owner === me && !c.broken));
  /** ✨ 쓸 수 있게 되는 순간 반짝 */
  let lit = $state<Record<string, number>>({}), wasOk: Record<string, boolean> = {};
  $effect(() => { const cur = slots.map((x) => [x.k, x.ok] as const); untrack(() => { for (const [k, ok] of cur) { if (ok && !wasOk[k]) { const t = Date.now(); lit = { ...lit, [k]: t }; setTimeout(() => { if (lit[k] === t) lit = { ...lit, [k]: 0 }; }, 700); } wasOk[k] = ok; } }); });
  const U = $derived(Math.max(0.8, Math.min(1.3, H / 390))); // 단추 크기 = 화면 높이 390 기준
  // 🔎 📜 요청 #19 덧3 스킬 미리 보기 = 단추 안 한 줄(어림값) · 꾹 0.4초 = 설명 카드(손 떼면 닫힘 · 발동 안 함) · 톡 = 바로 발동
  const pv = $derived.by(() => { void S.t; void S.evN; const o: Partial<Record<SkillK, ReturnType<typeof skillPeek>>> = {}; if (meH) for (const x of slots) o[x.k] = skillPeek(S, me, x.k); return o; });
  let peek = $state<SkillK | ''>(''), peekX = $state(0), peekUsed = false, pressT: ReturnType<typeof setTimeout> | undefined;
  function pressStart(k: SkillK, ev: PointerEvent) { const b = ev.currentTarget as HTMLElement; peekX = b.offsetLeft + b.offsetWidth / 2; clearTimeout(pressT); peekUsed = false; pressT = setTimeout(() => { peek = k; peekUsed = true; try { navigator.vibrate?.(15); } catch { /* 무시 */ } }, 400); }
  function pressEnd() { clearTimeout(pressT); peek = ''; }
  function fire(k: SkillK, to?: number) {
    if (!meH) return; const R = meH.s.role;
    if (to == null && !(k === 'role' && canReact(S, me)) && ((k === 'role' && (R === 'tank' || R === 'support')) || (k === 'revive' && S.heroes.filter((x) => x.down && x.id !== me).length > 1))) { pickK = k; over = 'pick'; return; }
    over = ''; skOpen = false; if (useSkill(S, me, k, to)) { try { navigator.vibrate?.(k === 'awk' ? [60, 40, 160] : 60); } catch { /* 무시 */ } }
  }
  const pickTo = (to: number) => fire(pickK, to);
  const SK_NAME = (k: SkillK) => k === 'shield' ? '보호막 부수기' : k === 'equip' ? '내 스킬' : k === 'tier4' ? '4레벨 스킬' : k === 'role' ? (meH ? ROLE_SKILL[meH.s.role] : '역할') : k === 'aura' ? '홀리 방패' : k === 'awk' ? '각성' : '부활';
  const SK_ICON: Record<SkillK, string> = { shield: '🔨', equip: '⚡', tier4: '✴', role: '', aura: '🛡', awk: '✨', revive: '💖' };
  const onTiming = (t: Timing) => { over = ''; attack(S, me, t); };

  // ── 연출 (사건 → 떠오르는 숫자 · 공격 자세 · 컷인) ──
  type Pop = { id: number; x: number; y: number; t: string; cls: string };
  let pops = $state<Pop[]>([]), seen = 0, pk = 0, hpose = $state<Record<number, HPose | ''>>({}), hurtOn = $state<Record<number, boolean>>({}), bossPose = $state<'idle' | 'attack' | 'hit' | 'down'>('idle'), cut = $state<{ who: number; awk: boolean; name: string; short: boolean } | null>(null);
  // 🛡 실드 (📜 요청 #12): 칸마다 연출 단계(hold = 아직 멀쩡해 보임 · crack = 금 감 · shatter = 조각나며 사라짐) · 방패막 물결 · 산산조각 · 큰 문구
  const FAM_EMO: Record<Fam, string> = { arms: '🗡', flame: '🔥', nature: '🍃', wisdom: '📖', mystic: '🔮' };
  // 🎨 실드 그림 (작업대 atb-shield · atb-shield-slots · 11/20): 방패막 4칸 × 3줄(서 있음 · 막음 · 깨짐) · 칸 아이콘 5계열 × 3줄(멀쩡 · 금 감 · 깨짐)
  const SHIELD_URL = `${import.meta.env.BASE_URL}art/board-atb/atb-shield-v1.webp`;
  const FAM_COL: Record<Fam, string> = { arms: '#d8dcf0', flame: '#ff7a2a', nature: '#6ee05a', wisdom: '#5ab0ff', mystic: '#c88aff' };
  let cellAnim = $state<Record<number, 'hold' | 'crack' | 'shatter'>>({}), barrier = $state<'' | 'up' | 'ripple' | 'shatter'>(''), bigMsg = $state<{ t: string; cls: string } | null>(null), bossShield = $state(false);
  let msgN = 0, cutN = 0; // $state 는 넣은 객체를 프록시로 바꿈 → 같은지 = 번호로
  const big = (t: string, cls: string, ms = 1500) => { const n = ++msgN; bigMsg = { t, cls }; setTimeout(() => { if (msgN === n) bigMsg = null; }, ms); };
  const setCell = (i: number, v: 'hold' | 'crack' | 'shatter' | null) => { const n = { ...cellAnim }; if (v) n[i] = v; else delete n[i]; cellAnim = n; };
  /** 🛡 보호막 부수기 = 그 용사 공격이 방패막에 부딪혀 물결 → 칸 금 감 → 조각나며 사라짐(한 칸씩 · 쨍) · 마지막 = 방패막 산산조각 + 약점 시간 */
  function shieldHit(e: Extract<Ev, { k: 'shield' }>) {
    e.cells.forEach((i) => setCell(i, 'hold'));
    const go = () => {
      barrier = 'ripple'; setTimeout(() => { if (barrier === 'ripple') barrier = 'up'; }, 500);
      e.cells.forEach((i, j) => setTimeout(() => { setCell(i, 'crack'); sfx('ice-crack', 0.7); setTimeout(() => { setCell(i, 'shatter'); sfx('ice-shatter', 0.8); setTimeout(() => setCell(i, null), 450); }, 380); }, j * 420));
      if (e.last) setTimeout(() => { barrier = 'shatter'; shake(stageEl ?? null, 8, 400); sfx('chain-break', 0.9); big('💥 실드 파괴! 약점 시간 · 피해 2배', 'weak', 1800); setTimeout(() => { barrier = ''; }, 700); }, e.cells.length * 420 + 420);
    };
    const h = S.heroes[e.who], box = heroEls[e.who];
    if (!h || !stageEl || !bossEl || !box || busy.has(e.who)) { go(); return; }
    busy.add(e.who);
    void fxAttack(stageEl, { heroBox: box, monBox: bossEl, hero: h.s.hero, fx: fit(h.s.hero, fx[e.who] || 'flame'), finish: true, hits: 1, mult: 1.2, noDmg: true, vol: me < 0 || e.who === me ? 1 : 0.45, rest: 'idle', pose: (p) => setPose(e.who, p), onHit: go }).catch(() => {}).finally(() => { busy.delete(e.who); setPose(e.who, 'idle'); });
  }
  /** 🛡 실드 생김 = 화면 가운데 큰 문구 · 진동 · 보스 웅크렸다 일어나며 포효 · 방패막 펼침 */
  // 🛡 📜 요청 #32 실드 생김 = 방패막 + 빈 방패 칸 먼저(0.3초) → 칸마다 차례로 그 속성 방패가 가운데 크게(3배) → 작아지며 제 칸으로 쏙 + 「팅」(한 음씩 올라감) + 계열 색 반짝
  //   → 다 합쳐지면 「🛡 실드! 약점 = …」 · 약 1.5초 · 전투 · 문제 풀이 안 멈춤 · 화면 아무 데나 누르면 바로 끝 모양
  let pendCells = $state<Set<number>>(new Set()), flies = $state<{ id: number; i: number; fam: Fam; x0: number; y0: number; dx: number; dy: number }[]>([]), flyN = 0, shT: ReturnType<typeof setTimeout>[] = [], flashCell = $state(-1);
  function ting(i: number) { if (!soundPref.sfx) return; const c = actx(); if (!c) return; const t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 1046.5 * Math.pow(1.122, i); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.36); }
  function shieldDone() {
    shT.forEach(clearTimeout); shT = []; flies = []; pendCells = new Set(); removeEventListener('pointerdown', shieldDone, true);
    const wk = S.boss.weak.map((f) => `${FAM_EMO[f]} ${FAM_NAME[f]}`).join(' · '); big(`🛡 실드! 약점 = ${wk}`, 'shield');
  }
  function shieldUpFx() {
    try { navigator.vibrate?.(80); } catch { /* 무시 */ } sfx('holy-on', 0.8);
    const n = S.cells.length; pendCells = new Set(S.cells.map((_, i) => i)); flies = [];
    addEventListener('pointerdown', shieldDone, true);
    S.cells.forEach((c, i) => shT.push(setTimeout(() => {
      const st = stageEl, el = st?.querySelectorAll('[data-k="atb-cells"] .cell2')[i]; if (!st || !el) return;
      const R = rectIn(st), A = rectIn(el), x0 = R.width * 0.5, y0 = R.height * 0.42, dx = A.left + A.width / 2 - R.left - x0, dy = A.top + A.height / 2 - R.top - y0, id = ++flyN;
      flies = [...flies, { id, i, fam: c.fam, x0, y0, dx, dy }];
      shT.push(setTimeout(() => { flies = flies.filter((f) => f.id !== id); const p = new Set(pendCells); p.delete(i); pendCells = p; ting(i); flashCell = i; setTimeout(() => { if (flashCell === i) flashCell = -1; }, 260); }, 420));
    }, 300 + i * 220)));
    shT.push(setTimeout(shieldDone, 300 + n * 220 + 460));
    bossShield = true; setTimeout(() => (bossShield = false), 900); barrier = 'up';
    bossEl?.animate?.([{ scale: '1 1' }, { scale: '1.08 0.82', offset: 0.3 }, { scale: '0.94 1.12', offset: 0.6 }, { scale: '1 1' }], { duration: 800, easing: 'ease-out' });
    setTimeout(() => shake(stageEl ?? null, 5, 300), 450);
  }
  /** ⚡ 충전 가득 (📜 요청 #13) = 공격 단추 안 동그라미 · 스킬 단추 빛 · 「가득! 스킬을 써요」 한 번 */
  // 🔊 📜 요청 #23 효과음 더하기 (있던 파일만) · 30명 교실 = 0.15초 안에 겹치면 하나만
  let lastSnd = 0;
  const snd = (k: string, v = 0.6) => { const t = Date.now(); if (t - lastSnd < 150) return; lastSnd = t; sfx(k, v); };
  const fullCh = $derived(!!meH && meH.ch >= T.charge.max);
  let wasFull = false, fullMsg = $state(0);
  $effect(() => { const f = fullCh; untrack(() => { if (f && !wasFull && me >= 0) { const t = Date.now(); fullMsg = t; setTimeout(() => { if (fullMsg === t) fullMsg = 0; }, 1600); snd('skill-unlock', 0.6); } wasFull = f; }); }); // 📜 요청 #31 ④ 단추 위 「스킬 쓸 수 있어요!」 한 번
  /** 🆘 위험 체력 (📜 요청 #18): 30% 아래(T.lowHp) = 체력 막대 · 숫자 빨갛게 깜박 + 머리 위 🆘 · 처음 내려갈 때 한 줄(친구) · 진동(나) · 힐러 💚 · 💖 부활 단추 반짝 */
  const isLow = (h: State['heroes'][number]) => !h.down && h.hp < h.s.maxHp * T.lowHp;
  const lowIds = $derived(S.heroes.filter(isLow).map((h) => h.id));
  const anyNeed = $derived(lowIds.some((i) => i !== me) || S.heroes.some((h) => h.down && h.id !== me));
  let wasLow = new Set<number>();
  $effect(() => { const now = new Set(lowIds); untrack(() => { for (const id of now) if (!wasLow.has(id)) { if (id === me) { try { navigator.vibrate?.([60, 40, 60]); } catch { /* 무시 */ } } else if (me >= 0) big(`🆘 ${S.heroes[id]!.s.name} 위험!`, 'sosmsg', 1300); if (me >= 0) snd('heart-break', 0.55); } wasLow = now; }); });
  /** ⚔ 약점 상성 = 보스 약점 계열 용사 (📜 요청 #12 ④) */
  const isWeak = (id: number) => { const h = S.heroes[id]; return !!h && S.boss.weak.includes(h.s.fam); };
  let stageEl = $state<HTMLElement>(), bossEl = $state<HTMLElement>(), boom = $state(false), gaugeFlash = $state(false), auraOn = $state(false);
  const heroEls: Record<number, HTMLElement> = {}, busy = new Set<number>();
  const setPose = (who: number, p: Pose | HPose) => { hpose = { ...hpose, [who]: p === 'idle' ? '' : (p as HPose) }; };
  /** ⚔ 용사가 몬스터 앞까지 달려가 치고 제자리로 (레이드 attack · 원거리 = 제자리 탄) · 맞는 순간 = 숫자 · 몬스터 아픔 */
  function playAtk(e: Extract<Ev, { k: 'atk' | 'skill' | 'role' }>) {
    const h = S.heroes[e.who]; if (!h) return;
    const d = (e as { dmg?: number }).dmg ?? 0, isSk = e.k === 'skill', ult = isSk && e.kind === 'awk', big = isSk && e.kind !== 'equip', miss = e.k === 'atk' && e.timing === 'miss', crit = e.k === 'atk' && e.timing === 'crit';
    const fk = fit(h.s.hero, fx[e.who] || 'flame'); let hit = false, shown = 0;
    // 👹 📜 요청 #38 · #42 = 피해 숫자 단계(보통 흰 · 치명 노랑 · 약점 빨강 · 스킬 크게 · 각성 금) · 여러 타 = 하나씩 + 마지막 「합계」 · 내 것 2배 · 친구 0.7배 옅게
    const mine = e.who === me, wk = weak(S), tier = miss ? 'miss' : ult ? 'ult' : isSk ? 'sk' : crit ? 'crit' : wk ? 'weak' : 'norm';
    const onHit = (info?: { k: number; n: number }) => {
      if (!info && hit) return; // 끝(finally) 한 번 더 = 이미 다 띄웠으면 그만
      const n = Math.max(1, info?.n ?? 1), k = info?.k ?? n - 1, bx = open ? 86 : 72, x = bx + (Math.random() - 0.5) * 6, y = 34 - k * 3;
      if (!miss && d) { const part = k === n - 1 ? d - shown : Math.round(d / n); shown += part; pop(x, y, `${tier === 'crit' && n === 1 ? '💥 치명! ' : ''}${tier === 'weak' ? '약점! ' : ''}−${part}`, `dmg ${tier} ${mine ? 'me' : 'fr'}`, mine ? 900 : 600); }
      if (k < n - 1) { burstBits(isSk || crit ? 2 : 1); return; }
      if (hit) return; hit = true;
      if (miss) pop(x, 36, '빗나감', `dmg miss ${mine ? 'me' : 'fr'}`, mine ? 900 : 600);
      else if (n > 1 && d) setTimeout(() => pop(bx, 26, `합계 −${d}`, `dmg sum ${tier} ${mine ? 'me' : 'fr'}`, mine ? 1100 : 700), 120);
      if (d) { bossPose = 'hit'; setTimeout(() => (bossPose = S.end?.win ? 'down' : 'idle'), 420); burstBits(isSk || crit ? 2 : 1); if (isSk || crit) bossReel(); }
      if (ult && stageEl && bossEl) void ultBlast(stageEl, bossEl, fk);
    };
    const box = heroEls[e.who];
    if (!stageEl || !bossEl || !box || busy.has(e.who)) { onHit(); return; }
    busy.add(e.who);
    void fxAttack(stageEl, { heroBox: box, monBox: bossEl, hero: h.s.hero, fx: fk, miss, finish: isSk || crit || e.k === 'role', hits: big ? 3 : isSk ? 2 : 1, mult: ult ? 1.8 : big ? 1.5 : isSk ? 1.25 : crit ? 1.15 : 1, noDmg: true, vol: me < 0 || e.who === me ? 1 : 0.45, rest: 'idle', pose: (p) => setPose(e.who, p), onHit })
      .catch(() => {}).finally(() => { busy.delete(e.who); onHit(); setPose(e.who, 'idle'); });
  }
  /** 💥 몬스터 파편 (📜 요청 #38 ⑥) = 그 몬스터 맞는 그림 종류(mhitOf) 짝 색 · 모양 · 4 ~ 6개 0.4초 · 큰 공격 2배 · 저사양(코어 4 이하) · 움직임 줄이기 = 3개 */
  const BITS: Record<string, { c: string; r: string }> = { smash: { c: '#b8a898', r: '30%' }, ram: { c: '#b8a898', r: '30%' }, claw: { c: '#7ad86a', r: '2px' }, bite: { c: '#7ad86a', r: '2px' }, fire: { c: '#ff8a2a', r: '50%' }, ice: { c: '#bff0ff', r: '1px' }, poison: { c: '#6aff6a', r: '50% 50% 50% 0' }, beam: { c: '#fff7b0', r: '1px' }, bolt: { c: '#fff7b0', r: '1px' }, lash: { c: '#5ac85a', r: '0 70% 0 70%' } };
  const lowEnd = typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency ?? 8) <= 4 || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches));
  function burstBits(mul = 1) {
    const st = stageEl, b = bossEl; if (!st || !b) return; const R = rectIn(st), B = rectIn(b), k = mhitOf(S.boss.sprite), P = BITS[k] ?? BITS.smash!;
    const n = lowEnd ? 3 : (4 + Math.floor(Math.random() * 3)) * mul, cx = B.left + B.width * 0.42 - R.left, cy = B.top + B.height * 0.45 - R.top;
    for (let i = 0; i < n; i++) { const el = document.createElement('i'); el.className = 'atb-bit'; const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 50; el.style.cssText = `left:${cx}px;top:${cy}px;background:${P.c};border-radius:${P.r};--dx:${Math.cos(a) * v}px;--dy:${Math.sin(a) * v - 20}px;--rot:${Math.round(Math.random() * 360)}deg`; st.appendChild(el); setTimeout(() => el.remove(), 420); }
  }
  /** 👹 큰 공격 = 보스가 뒤로 더 밀리며 비틀 (기울기 −6° → 0 · 📜 요청 #38 ④) */
  function bossReel() { bossEl?.animate?.([{ translate: '0 0', rotate: '0deg' }, { translate: `${Math.round(Wd * 0.03)}px 0`, rotate: '-6deg', offset: 0.3 }, { translate: '0 0', rotate: '0deg' }], { duration: 480, easing: 'ease-out' }); }
  // 🪨 체력 75 · 50 · 25% 를 넘는 순간 = 크게 휘청 + 「쿵」 + 몸에 금 한 단계 (📜 요청 #38 ⑤ · 금 = 보스 몸 모양 안에서만 · 분노보다 먼저)
  let crackLv = $state(0), lastRatio = 1;
  $effect(() => { const r = S.bossMax ? S.bossHp / S.bossMax : 1; untrack(() => { const lv = r <= 0.25 ? 3 : r <= 0.5 ? 2 : r <= 0.75 ? 1 : 0; if (lv > crackLv && r < lastRatio) { crackLv = lv; bossEl?.animate?.([{ translate: '0 0', rotate: '0deg' }, { translate: `${Math.round(Wd * 0.02)}px 4px`, rotate: '-4deg', offset: 0.25 }, { translate: `-${Math.round(Wd * 0.01)}px 0`, rotate: '3deg', offset: 0.6 }, { translate: '0 0', rotate: '0deg' }], { duration: 500, easing: 'ease-out' }); sfx('dummy-hit', 0.8); shake(stageEl ?? null, 6, 300); } lastRatio = r; }); });
  /** 금 그림 = 보스 그림과 같은 칸을 마스크로 (몸 밖엔 안 보임) · 매 프레임 칸 자리 따라감 */
  function crackMask(node: HTMLElement) { let raf = 0; const f = () => { const sp = node.parentElement?.querySelector('.sprite, i[style*="background-image"]') as HTMLElement | null; if (sp) { const cs = sp.style; node.style.maskImage = node.style.webkitMaskImage = cs.backgroundImage; node.style.maskSize = node.style.webkitMaskSize = cs.backgroundSize; node.style.maskPosition = node.style.webkitMaskPosition = cs.backgroundPosition; node.style.width = cs.width; node.style.height = cs.height; } raf = requestAnimationFrame(f); }; f(); return { destroy: () => cancelAnimationFrame(raf) }; }
  /** 💥 광역이 터짐 = 용사 줄 가운데서 붉은 충격파 (레이드 필살기 충격파 .ult-ring 을 붉게) */
  function ring() {
    const st = stageEl; if (!st) return; const R = rectIn(st), x = R.width * (open ? 0.17 : 0.25), y = R.height * 0.6, d = R.width * 0.9;
    const el = document.createElement('i'); el.className = 'ult-ring'; el.style.cssText = `left:${x}px;top:${y}px;width:${d}px;height:${d}px;--c:#ff3a1a`; st.appendChild(el); setTimeout(() => el.remove(), 650);
  }
  /** 💢 용사가 맞음 = 맞음 자세 · 붉게 번쩍 (👹 「맞는 그림」 10종이 오면 .hitpic 자리에 겹침) */
  function hurt(id: number) { hurtOn = { ...hurtOn, [id]: true }; if (!busy.has(id)) setPose(id, 'hit'); setTimeout(() => { hurtOn = { ...hurtOn, [id]: false }; if (!busy.has(id) && !S.heroes[id]?.down) setPose(id, 'idle'); }, 450); }
  /** ✨ 채점이 끝나면 = 카드 자리에서 에너지 구슬이 내 충전 칸으로 날아가 차오름 (Y8) */
  function flyOrb(gold = true, from: { x: number; y: number } | null = null, to: 'orbs' | 'me' = 'orbs', cb?: () => void) {
    const st = stageEl, a = st?.querySelector('.card') ?? st?.querySelector('[data-k="atb-boss"]'), b = to === 'me' ? (heroEls[me] ?? null) : st?.querySelector('[data-k="atb-orbs"]') ?? st?.querySelector('[data-k="atb-attack"]'); if (!st || (!a && !from) || !b) { cb?.(); return; }
    const R = rectIn(st), B = rectIn(b), A = a ? rectIn(a) : null;
    const x0 = from ? from.x : A!.left + A!.width / 2 - R.left, y0 = from ? from.y : A!.top + A!.height / 2 - R.top, dx = B.left + B.width / 2 - R.left - x0, dy = B.top + B.height * (to === 'me' ? 0.4 : 0.5) - R.top - y0;
    const el = document.createElement('i'); el.className = gold ? 'atb-orb g' : 'atb-orb'; el.style.left = `${x0}px`; el.style.top = `${y0}px`; st.appendChild(el);
    const fin = () => { el.remove(); burst(x0 + dx, y0 + dy, to === 'me'); if (!cb) sfx(gold ? 'star-bonus' : 'energy-card', 0.55); cb?.(); gaugeFlash = true; setTimeout(() => (gaugeFlash = false), 450); };
    if (!el.animate) { fin(); return; }
    const an = el.animate([{ transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0.6 }, { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.45 - 90}px)) scale(1.3)`, opacity: 1, offset: 0.45 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 1 }], { duration: 620, easing: 'ease-in' });
    an.onfinish = fin;
  }
  /** 💥 흡수 터짐 (구슬이 닿은 자리 · 넘침 = 금빛) */
  function burst(x: number, y: number, gold: boolean) { const st = stageEl; if (!st) return; const el = document.createElement('i'); el.className = gold ? 'atb-burst g' : 'atb-burst'; el.style.left = `${x}px`; el.style.top = `${y}px`; st.appendChild(el); setTimeout(() => el.remove(), 480); }
  const pop = (x: number, y: number, t: string, cls: string, ms = 1100) => { const id = ++pk; pops = [...pops.slice(-12), { id, x, y, t, cls }]; setTimeout(() => (pops = pops.filter((p) => p.id !== id)), ms); };
  $effect(() => { const n = S.evN; untrack(() => { if (n < seen) seen = 0; for (const e of S.ev) if ((e.n ?? 0) > seen) handle(e); seen = n; }); });
  function handle(e: Ev) {
    const bx = open ? 86 : 72;
    if (e.k === 'atk' || e.k === 'skill' || (e.k === 'role' && e.dmg)) {
      // ⚡ 스킬 = 컷인(필살기 1.7초 · 내 스킬 0.9초) 뒤 큰 이펙트
      // 💠 스킬 = 컷인(각성 1.7초 · 4레벨 1.1초 · 내 장착 0.9초) 뒤 큰 이펙트
      const bigSk = e.k === 'skill' && (e.kind !== 'equip' || e.who === me), ms = e.k === 'skill' ? (e.kind === 'awk' ? 1700 : e.kind === 'tier4' ? 1100 : 900) : 0;
      if (e.k === 'skill' && bigSk) { const c = { who: e.who, awk: e.kind === 'awk', name: e.kind === 'awk' ? '각성' : fx[e.who] ? `${skillName(fx[e.who]!)}${e.kind === 'tier4' ? ' Ⅳ' : ''}` : '스킬', short: e.kind === 'equip' }; const cn = ++cutN; cut = c; setTimeout(() => { if (cutN === cn) cut = null; }, ms); sfx(e.kind === 'awk' ? 'true-ult' : 'special', 0.8); }
      if (e.k === 'skill' && e.auto && e.who === me) big('⚡ 넘침 → 자동 스킬!', 'note', 1300); // 📜 요청 #13
      if (e.k === 'atk' && e.auto && e.who === me) { const t = Date.now(); autoTag = t; setTimeout(() => { if (autoTag === t) autoTag = 0; }, 1100); }
      if (bigSk) setTimeout(() => playAtk(e as Extract<Ev, { k: 'skill' }>), ms - 200); else playAtk(e as Extract<Ev, { k: 'atk' | 'skill' | 'role' }>);
    } else if (e.k === 'shield') shieldHit(e);
    else if (e.k === 'boss') {
      // 👹 몬스터 공격 = 앞으로 덮침 → 맞음(용사 붉게 · 맞음 자세) · 광역 = 화면 크게 흔들림 + 붉은 번쩍 · 내가 맞음 = 문제 카드 흔들 + 잠금
      bossPose = 'attack'; setTimeout(() => (bossPose = 'idle'), 600);
      bossEl?.animate?.([{ translate: '0 0' }, { translate: `${-Math.round(Wd * 0.06)}px 6px`, offset: 0.4 }, { translate: '0 0' }], { duration: 520, easing: 'ease-out' });
      setTimeout(() => {
        // 👹 몬스터 맞는 그림 (📜 요청 #27 · 레이드 #26 과 같은 함수 mhitOf · MonHit) = 보스 몸짓 → 맞는 용사 위 6칸 0.42초 · 광역 = 모두 동시에 · 게시판 보스 = 1.5배
        const kind = mhitOf(S.boss.sprite), mk = ++mhN; mhit = { k: mk, kind, to: [...e.to] }; setTimeout(() => { if (mhit?.k === mk) mhit = null; }, MHIT.ms + 40);
        e.to.forEach((id, i) => { pop(posOf(id).x, posOf(id).y - 22, `−${e.dmg[i]}`, e.aoe ? 'hurt big' : 'hurt'); hurt(id); });
        if (e.aoe) { shake(stageEl ?? null, 10, 520); boom = true; ring(); setTimeout(() => (boom = false), 620); sfx('smash', 0.9); try { navigator.vibrate?.([50, 30, 90]); } catch { /* 무시 */ } }
        else { shake(stageEl ?? null, 4, 220); sfx('hurt', 0.6); }
        if (me >= 0 && e.to.includes(me) && !S.heroes[me]?.down) { lockUntil = Date.now() + T.hitLockMs; lockLeft = Math.ceil((lockUntil - Date.now()) / 1000); lockTag = `💥 ${e.atk || (e.aoe ? '광역' : '공격')}!`; }
      }, 230);
    }
    else if (e.k === 'role') { pop(e.to != null ? posOf(e.to).x : 20, 30, ROLE_SKILL[e.role], 'role'); if (e.role === 'healer') snd('heart-up', 0.6); }
    else if (e.k === 'revive') { pop(posOf(e.to).x, posOf(e.to).y - 24, '부활!', 'role'); snd('heart-up', 0.75); const n = Date.now(); revFx = { from: S.revives + 1, to: S.revives, n }; setTimeout(() => { if (revFx?.n === n) revFx = null; }, 1600); } // 📜 요청 #24 ⑤ 평소 숨김 · 쓸 때만 💖 깨지며 3 → 2
    else if (e.k === 'shieldUp') { shieldUpFx(); shieldSwap(); }
    else if (e.k === 'aura') { pop(posOf(e.who).x, posOf(e.who).y - 24, '🛡 홀리 방패!', 'role'); auraOn = true; sfx('holy-on', 0.8); pop(bx, 30, `🗿 석화 ${e.stone}초`, 'shield'); }
    else if (e.k === 'react') { const t = e.how === 'cover' ? '🛡 막았다!' : e.how === 'barrier' ? '🎵 결계!' : '⚔ 끊었다!'; pop(posOf(e.who).x, posOf(e.who).y - 26, t, 'role'); if (e.who === me) big(t, 'note', 1100); sfx(e.how === 'cut' ? 'smash' : 'block', 0.8); if (e.how === 'cut') { bossPose = 'hit'; setTimeout(() => (bossPose = 'idle'), 500); } if (e.how === 'barrier') { barrierFx = Date.now(); setTimeout(() => (barrierFx = 0), 4200); } }
    else if (e.k === 'fam') { // 🌈 계열 덧효과 (요청 #36) · 작게 0.8초
      const B0 = { x: bx + (open ? 0 : 4), y: 40 };
      if (e.fx === 'pierce') pop(B0.x, B0.y, '🗡 관통!', 'fam');
      else if (e.fx === 'burn') pop(B0.x + 3, B0.y + 6, e.tick ? `🔥 −${e.v}` : '🔥 화상!', 'fam');
      else if (e.fx === 'freeze') { pop(B0.x, B0.y, '🧊 얼림!', 'fam'); bossFrost = Date.now(); setTimeout(() => (bossFrost = 0), 1600); }
      else if (e.fx === 'expose') pop(B0.x, B0.y, '📖 약점 노출!', 'fam');
      else if (e.fx === 'bless' && e.to != null) pop(posOf(e.to).x, posOf(e.to).y - 24, '✨ 축복! +5', 'fam');
      else if (e.fx === 'shock') { pop(B0.x, B0.y, '⚡ 감전!', 'fam'); bossFrost = Date.now(); setTimeout(() => (bossFrost = 0), 900); }
      else if (e.fx === 'gust') pop(posOf(e.who).x, posOf(e.who).y - 26, '🌪 순풍! ATB +30%', 'fam');
      else if (e.fx === 'curse') { pop(B0.x, B0.y, '🌑 저주!', 'fam'); bossCurse = Date.now(); setTimeout(() => (bossCurse = 0), 3000); }
    }
    else if (e.k === 'rage') { // 👹 분노 (요청 #37)
      if (e.on === 'rage') { setTimeout(() => { big('👹 분노!', 'rage', 1600); sfx('mon-appear-boss', 0.9); shake(stageEl ?? null, 12, 700); }, 450); /* 금 연출(#38)이 먼저 · 분노가 뒤 */ try { navigator.vibrate?.([80, 40, 120]); } catch { /* 무시 */ } bossPose = 'attack'; setTimeout(() => (bossPose = 'idle'), 700); }
      else if (e.on === 'calm') { big('😮‍💨 진정!', 'note', 1400); sfx('heart-up', 0.6); bossPose = 'hit'; setTimeout(() => (bossPose = 'idle'), 800); }
      else if (e.on === 'calmEnd') { big('👹 다시 분노!', 'rage', 1100); sfx('mon-appear-boss', 0.6); }
      else if (e.on === 'perf') pop(bx, 52, `😮‍💨 진정 ${e.n}/${RAGE.calmPerfect}`, 'fam');
    }
    else if (e.k === 'sig' && e.what === 'healNow') { if (meH?.s.role === 'healer' && !meH.down) { const t = Date.now(); healNowT = t; setTimeout(() => { if (healNowT === t) healNowT = 0; }, 3500); } }
    else if (e.k === 'guard') { auraOn = false; S.heroes.forEach((h) => { if (!h.down) pop(posOf(h.id).x, posOf(h.id).y - 22, '막음!', 'role'); }); sfx('block', 0.9); bossPose = 'attack'; setTimeout(() => (bossPose = 'idle'), 500); }
    else if (e.k === 'charge' && e.who !== me) pop(posOf(e.who).x, posOf(e.who).y - 26, `⚡+${e.add}`, 'role');
    else if (e.k === 'sig') {
      if (e.what === 'breathHeal') pop(bx, 30, `+${e.v} 회복`, 'heal');
      else if (e.what === 'breathCut') pop(bx, 26, '숨 끊음!', 'shield');
      else if (e.what === 'reflect' && e.who != null) pop(posOf(e.who).x, posOf(e.who).y - 22, `−${e.v} 반사`, 'hurt');
      else if (e.what === 'unbind' && e.who != null) pop(posOf(e.who).x, posOf(e.who).y - 24, '풀림!', 'role');
      else if (e.what === 'mirrorOn') pop(bx, 26, '🪞 거울빛', 'shield');
    }
    else if (e.k === 'end' && e.win) bossPose = 'down';
    else if (e.k === 'end' && !e.win) snd('game-no', 0.7); // 이김 = 승리 곡(#21)이 소리
  }

  // ── 자리 (원근 한 줄 · 내 용사 = 맨 앞 · 맨 아래 · 가장 크게) ──
  const order = $derived(me >= 0 ? [me, ...S.heroes.map((h) => h.id).filter((i) => i !== me)] : S.heroes.map((h) => h.id));
  // 📜 요청 #15 = 오라 · 날개 · 이름표가 이웃과 안 겹치게 간격(가로 11% · 이름표 84px) · 그리는 순서 = 뒤 → 앞(z) · 원근 100 → 70%
  // 📜 요청 #24 ① = 처음부터 문제 카드 자리(26.5 ~ 73.5%)를 비운 자리 · 크기 고정 · 카드가 열려도 용사는 안 움직임(맨 뒤 용사 일부 가려져도 됨) · 몬스터만 움직임
  const ROWV = [{ x: 7.5, y: 73, s: 0.84 }, { x: 13, y: 61.5, s: 0.76 }, { x: 18.5, y: 51, s: 0.68 }, { x: 24, y: 41.5, s: 0.62 }];
  const posOf = (id: number) => { const k = Math.max(0, order.indexOf(id)); return ROWV[k] ?? ROWV[0]!; };
  const base = $derived(Math.max(1, (H * 0.27) / 64)); // 맨 앞 용사 키 = 화면 높이 27%
  const bossSize = $derived(Math.round(H * (open ? 0.3 : 0.42))); // 문제 카드 가운데(요청 #14) = 보스는 카드 오른쪽에 작게
  const stone = $derived(S.t < S.stoneUntil ? Math.ceil(S.stoneUntil - S.t) : 0);
  const C = 2 * Math.PI * 30; // 내 초상 고리 둘레 (r 30)
  const tele = $derived(S.target && !weak(S) ? Math.max(0, Math.ceil(bossEveryOf(S) - S.bossT)) : 0);
  const bossLeft = $derived(weak(S) ? 1 : Math.max(0, 1 - S.bossT / bossEveryOf(S)));
  // 👹 보스 ATB 게이지 (📜 요청 #7 ②): 체력바 바로 아래 · 차오름 · 예고(약 2초 전) = 붉게 깜빡 + 다음 공격 아이콘 · 이름 · 누구
  const ATK_IC: Record<string, string> = { basic: '💥', aoe: '⚠', smash: '💢', poison: '☠️', sleep: '💤', fire: '🔥', fire13: '🔥', fog: '🌊', tongue: '👅', ice: '🧊', confuse: '🌀', frost: '❄️', tail: '💥', dark: '🌑', darkHit: '🌑', mirror: '🪞', bind: '⛓', scale: '⚖️' };
  const upcoming = $derived(upcomingOf(S));
  const stoneG = $derived(S.t < S.stoneUntil ? Math.ceil(S.stoneUntil - S.t) : 0);
  const bossGauge = $derived.by(() => {
    if (S.end) return null;
    if (weak(S)) return { p: 1, txt: `⏸ 약점 시간 ${Math.ceil(S.weakUntil - S.t)}초 · 공격 멈춤`, blue: true };
    if (stoneG) return { p: Math.min(1, S.bossT / bossEveryOf(S)), txt: `🗿 석화 ${stoneG}초 · 공격 멈춤`, blue: true };
    const left = Math.max(0, Math.ceil(bossEveryOf(S) - S.bossT)), ic = ATK_IC[upcoming] ?? '💥', nm = ATK[upcoming as keyof typeof ATK]?.name ?? '공격';
    if (S.target) { const who = S.aoeNext ? '모두' : S.target.map((i) => name(i)).join(' · '); return { p: S.bossT / bossEveryOf(S), txt: `${S.aoeNext ? '⚠ 광역! ' : ''}${ic} ${nm} → ${who} · ${left}초`, hot: true }; }
    return { p: S.bossT / bossEveryOf(S), txt: `다음 ${ic} ${nm} · ${left}초` };
  });
  const bossX = $derived(open ? 86 : 73), bossY = $derived(74 - (bossSize / 2 / Math.max(1, H)) * 100);
  const meAimed = $derived(me >= 0 && !!tele && !!S.target?.includes(me));
  let aimedOnce = false;
  $effect(() => { const a = meAimed; untrack(() => { if (a && !aimedOnce) { try { navigator.vibrate?.(40); } catch { /* 무시 */ } } aimedOnce = a; }); });
  const atkName = $derived(S.nextAtk ? ATK[S.nextAtk].name : S.aoeNext ? '광역' : '공격');
  /** ⚠ 광역 예고 = 용사 줄 바닥이 붉게 깜빡 (📜 요청 #3 ⑤) */
  const aoeWarn = $derived(!!tele && S.aoeNext);
  let wasAim = false, wasAoe = false;
  $effect(() => { const a = meAimed, w = aoeWarn; untrack(() => { if (a && !wasAim) snd('focus', 0.6); else if (w && !wasAoe) snd('countdown', 0.5); wasAim = a; wasAoe = w; }); }); // ⚠ 나를 노려요 · 광역 예고 = 처음 뜰 때 한 번
  const tiltTxt = $derived(S.boss.tele === 'scale' && S.target ? (S.aoeNext ? '⚖ 수평 → 모두' : `⚖ ${S.tilt === 'L' ? '왼쪽' : '오른쪽'}으로 기욺 → ${S.heroes[S.target[0]!]?.s.name ?? ''}`) : '');
  const breathLeft = $derived(S.breathWarn != null ? Math.max(0, Math.ceil(S.breathWarn + SIG.breath.warn - S.t)) : 0);
  const mirrorLeft = $derived(S.t < S.mirrorUntil ? Math.ceil(S.mirrorUntil - S.t) : 0);
  const armor = $derived(S.boss.sig === 'iceArmor' && S.cells.some((c) => !c.broken));
  const weakLeft = $derived(weak(S) ? Math.ceil(S.weakUntil - S.t) : 0);
  const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, (a / Math.max(1, b)) * 100))}%`;
  const name = (id: number) => `${S.heroes[id]!.s.name}${id === me ? '(나)' : ''}`;
  // 🧪 화면 시험 고리 (봇 없이 내 차례 만들기)
  (globalThis as unknown as { __atb?: object }).__atb = { S: untrack(() => S), full: () => { if (meH) meH.atb = 1; }, charge: (n: number) => { if (meH) meH.ch = Math.min(T.charge.max, meH.ch + n); }, skip: () => finishGrade(), pause: (v: boolean) => (paused = v), solve: () => { if (!run) openQuiz(); const q = run ? questionsOf(L, run, seed)[run.k] : null; if (q) submit(answerOf(q)); }, miss: () => { if (!run) openQuiz(); const q = run ? questionsOf(L, run, seed)[run.k] : null; if (q) submit(wrongOf(q)); }, close: () => { open = false; }, lock: () => { lockUntil = Date.now() + T.hitLockMs; lockLeft = 1; lockTag = '💥 시험!'; }, /** 📏 요청 #19 덧1 카드 폭 재기 = 원문항 · 판 · 소문항 바로 띄움 (소문항 수 돌려줌) */ show: (mid: string, ver: number, k: number) => { const r = startRun(mid, ver); const n = questionsOf(L, r, seed).length; run = { ...r, k: Math.min(k, n - 1) }; open = true; return n; }, origins: () => OS.map((o) => o.mid) };
</script>

<div class="stage" class:q={open} class:weak={weakLeft > 0} style:background-image="url({dungeonOf(bg || L.theme)})" data-k="atb-stage" style:--u={U} bind:this={stageEl}>
  <!-- ⚠ 광역 예고 = 용사 줄 바닥 붉게 깜빡 · 터질 때 붉은 번쩍 -->
  <i class="floor" class:on={aoeWarn} class:q={open} data-k="atb-aoe-floor" aria-hidden="true"></i>
  <!-- 📜 요청 #24 ⑥ 빨간 점선 없앰 · 예고 = 보스 체력바 아래 한 줄 + 표적 발밑 -->
  {#if boom}<i class="boom" aria-hidden="true"></i>{/if}
  <!-- ⚙ = 오른쪽 맨 위 고정 (📜 요청 #24 ①) · 배경음 · 효과음 · 팀 부활 = 평소 숨김(쓸 때만 💖 깨지며 3 → 2 · ⑤) -->
  <div class="tr"><button type="button" class="gear" data-k="atb-gear" aria-label="설정" aria-expanded={gearOpen} onclick={() => { gearOpen = !gearOpen; sfx('click', 0.4); }}>⚙</button>
    {#if gearOpen}<div class="gmenu" role="menu"><button type="button" class:off={!soundPref.bgm} data-k="atb-bgm" aria-pressed={soundPref.bgm} onclick={() => { setSound({ bgm: !soundPref.bgm }); sfx('click', 0.5); }}>{soundPref.bgm ? '🎵 배경음 켜짐' : '🔇 배경음 꺼짐'}</button><button type="button" class:off={!soundPref.sfx} data-k="atb-sfx" aria-pressed={soundPref.sfx} onclick={() => setSound({ sfx: !soundPref.sfx })}>{soundPref.sfx ? '🔊 효과음 켜짐' : '🔈 효과음 꺼짐'}</button><span class="gr">💖 팀 부활 {S.revives} / {T.revives}</span></div>{/if}
  </div>
  {#if revFx}<div class="revfx" role="status" data-k="atb-revfx"><span class="hb">💔</span><b>💖 {revFx.from} → {revFx.to}</b></div>{/if}
  {#if reactNow && meH}<div class="reactb" style:--rc={ROLE_COL[meH.s.role]} role="alert" data-k="atb-react-band">{REACT_TXT[meH.s.role]}</div>
  {:else if healNowT}<div class="reactb heal" role="alert" data-k="atb-heal-now">💚 지금 힐! 광역 뒤 팀 체력 회복</div>
  {:else if tg && tgLine}<div class="tgline {tg.cls}" role="status" data-k="atb-tg-line">{tgLine}{#if !hasRole(REACT[tg.cls])} · (팀에 {ROLE_KO[REACT[tg.cls]]} 없음){/if}</div>{/if}
  {#if S.rage && !calmLeft && !S.end}<i class="ragedge" aria-hidden="true" data-k="atb-ragedge"></i>{/if}
  {#if barrierFx}<i class="tbarrier" aria-hidden="true" data-k="atb-tbarrier"></i>{/if}
  {#if weakLeft}<div class="weakb" role="status"><AtbIcon name="weak" size={26} /> 약점 시간 {weakLeft}초 · 피해 2배</div>{/if}

  <!-- 보스 -->
  <div class="bossui" style:left={open ? '74.5%' : '54%'} style:width={open ? '24%' : '40%'}>
    {#if stone}<div class="tele sig" role="status" data-k="atb-stone">🗿 석화 {stone}초 · 보스 공격 멈춤</div>{/if}
    {#if tele && tiltTxt}<div class="tele" role="status" data-k="atb-tele">{tiltTxt}</div>{/if}
    {#if breathLeft}<div class="tele sig" role="status" data-k="atb-breath">🫁 숨 고르기 {breathLeft}초 · 실드를 깨면 끊겨요</div>{/if}
    {#if mirrorLeft}<div class="tele sig" role="status" data-k="atb-mirror">🪞 거울빛 {mirrorLeft}초 · 일반 공격 30% 되돌아옴</div>{/if}
    {#if tg?.cls === 'special'}<div class="chbar" data-k="atb-charge-bar"><i style:width="{Math.round(chargeP * 100)}%"></i><span>🌀 {tg.atk} 모으는 중</span></div>{/if}
    {#if S.rage}<div class="calmb" class:on={calmLeft > 0} data-k="atb-calm">{#if calmLeft > 0}😮‍💨 진정 {calmLeft}초 · 공격 안 함{:else}👹 분노 · 퍼펙트 {S.ragePerf ?? 0}/{RAGE.calmPerfect} 모이면 진정{/if}</div>{/if}
    <div class="rhp" class:rage={S.rage && !calmLeft} data-k="atb-tele-g"><RaidHp name={`Lv.${S.diff === 'easy' ? 1 : S.diff === 'normal' ? 2 : 3} ${S.boss.name}${S.rage ? ' · 👹 분노' : ''}`} left={S.bossHp} max={S.bossMax} gauge={bossGauge} align="center" inside /></div>
    {#if S.cells.length}
      <div class="cells" data-k="atb-cells" aria-label="실드 {S.cells.filter((c) => !c.broken).length}칸 남음">
        {#each S.cells as c, i (i)}
          {@const st = cellAnim[i] ?? (c.broken ? 'gone' : 'ok')}
          <span class="cell2 {st}" class:fl={flashCell === i} style:--fc={FAM_COL[c.fam]} data-st={pendCells.has(i) ? 'empty' : st} title="{S.heroes[c.owner]?.s.name} · {FAM_NAME[c.fam]}"><FamShield fam={c.fam} size={44} state={pendCells.has(i) ? 'empty' : st === 'gone' ? 'gone' : st === 'crack' || st === 'shatter' || (st === 'hold' && cellAnim[i] != null) ? 'crack' : 'ok'} />{#if S.boss.sig === 'lock'}<i class="lk" aria-hidden="true">{c.broken ? '🔓' : '🔒'}</i>{/if}</span>
        {/each}
      </div>
    {/if}
  </div>
  {#if barrier || (S.shieldUp && S.cells.some((c) => !c.broken))}<i class="barrier {barrier || 'up'}" style:left={open ? '86%' : '73%'} style:width="{Math.round(bossSize * 1.25)}px" style:height="{Math.round(bossSize * 1.25)}px" style:background-image="url({SHIELD_URL})" data-k="atb-barrier" aria-hidden="true"></i>{/if}
  <div class="boss" class:roar={bossShield} class:stone={stone > 0} class:burning={!!S.burn} class:frost={!!bossFrost} class:cursed={!!bossCurse} class:raging={S.rage && !calmLeft} style:left={open ? '86%' : '73%'} style:width="{bossSize}px" style:height="{bossSize}px" data-k="atb-boss" data-flip={S.boss.flip?.[bossPose] ? 1 : 0} bind:this={bossEl}><i class="bflip" class:flip={!!S.boss.flip?.[bossPose]} class:armor class:shine={mirrorLeft > 0} class:breath={breathLeft > 0}><Sprite ref={S.boss.sprite} pose={bossPose} size={bossSize} />{#if crackLv}<i class="crack" data-k="atb-crack" data-lv={crackLv} use:crackMask aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none">{#if crackLv >= 1}<polyline points="40,22 46,34 41,44 49,55" />{/if}{#if crackLv >= 2}<polyline points="60,40 54,52 61,62 55,74" /><polyline points="46,34 56,36" />{/if}{#if crackLv >= 3}<polyline points="30,52 38,60 33,70 42,82" /><polyline points="61,62 70,66" /><polyline points="38,60 47,62" />{/if}</svg></i>{/if}</i></div>

  {#each flies as f (f.id)}<span class="shfly" style:left="{f.x0}px" style:top="{f.y0}px" style:--dx="{f.dx}px" style:--dy="{f.dy}px" data-k="atb-shfly" data-fam={f.fam}><FamShield fam={f.fam} size={132} /></span>{/each}

  <!-- 용사 -->
  {#each S.heroes as h (h.id)}
    {@const p = posOf(h.id)}
    {@const sc = +(base * p.s).toFixed(2)}
    <div class="hero" class:down={h.down} class:mine={h.id === me} class:hurt={hurtOn[h.id]} class:aura={auraOn && !h.down} style:left="{p.x}%" style:top="{p.y}%" style:--zi={10 + (4 - order.indexOf(h.id))} data-k="atb-hero" data-id={h.id}>
      {#if isWeak(h.id) && !h.down}<i class="wglow" style:--fc={FAM_COL[h.s.fam]} aria-hidden="true"></i><i class="wbadge" style:--fc={FAM_COL[h.s.fam]} style:top="{-Math.round(base * p.s * 64 * 1.02) - 40}px" data-k="atb-weak"><FamShield fam={h.s.fam} size={14} /> 약점!</i>{/if}
      {#if S.target?.includes(h.id) && tele}{#if S.boss.tele === 'gaze' && !S.aoeNext}<i class="gaze" aria-label="보스가 바라봄">👁</i>{:else}<i class="tgt" aria-label="표적"></i>{/if}{#if !S.aoeNext}<i class="aimx" style:top="{-Math.round(base * p.s * 64 * 0.95)}px" data-k="atb-aim" aria-label="노림">⊕</i>{/if}{/if}
      <!-- 🌟 오라 = 몸과 따로 아래 층 (📜 요청 #20 ③ · 어떤 오라도 몸을 안 가림 · 오라끼리는 안쪽(뒤) 용사가 위) · 전용 10강 오라 = 원래 용사로 찾음 -->
      {#if h.s.enh > 0 && !h.down}<div class="aul" class:off={busy.has(h.id) || (!!hpose[h.id] && hpose[h.id] !== 'hit')} style:z-index={2 + order.indexOf(h.id)} aria-hidden="true"><HeroSprite id={lookOfStats(h.s)} auraHero={h.s.hero} scale={sc} aura={h.s.enh} /></div>{/if}
      <div class="spr" style:transform="translate(-50%, -100%)" bind:this={heroEls[h.id]}><HeroSprite id={lookOfStats(h.s)} scale={sc} aura={0} row={h.down ? 8 : 0} play={!h.down} pose={!h.down && hpose[h.id] ? hpose[h.id] || undefined : undefined} /><i class="hitpic" data-k="atb-hitpic" aria-hidden="true"></i></div>
      {#if mhit && mhit.to.includes(h.id)}{#key mhit.k}<MonHit kind={mhit.kind} x={0} y={-Math.round(base * p.s * 64 * 0.5)} size={Math.round(base * p.s * 64 * 0.9)} boss z={19} />{/key}{/if}
      {#if h.cover}<i class="cov"><AtbIcon name="role-tank" size={20} label="엄호" /></i>{/if}
      {#if lowIds.includes(h.id)}<i class="sos" style:top="{-Math.round(base * p.s * 64 * 1.02) - (isWeak(h.id) ? 62 : 40)}px" data-k="atb-sos" aria-label="위험">🆘</i>{/if}
      {#if h.id === me && meAimed}<b class="aimme" role="alert" data-k="atb-aim-me">⚠ 나를 노려요!</b>{/if}
      <!-- 📜 요청 #24 ① 머리 위 얇은 초록 HP 바 + 「69/100」 · 발밑 「Lv.1 이름 + 역할」 · 그 아래 금색 ATB · 가득 = 작은 ⚡ · 이름표 상자 없음 -->
      <div class="hpb" class:low={lowIds.includes(h.id)} style:top="{-Math.round(base * p.s * 64 * 0.98) - 16}px" data-k="atb-hpb"><i class="thin hp"><b style:width={pct(h.hp, h.s.maxHp)}></b></i><span class="hn">{h.hp}/{h.s.maxHp}</span></div>
      <div class="tag" class:full={h.atb >= 1 && !h.down} class:low={lowIds.includes(h.id)} class:aimed={h.id === me && meAimed} class:wk={h.id === me && isWeak(me)} style:--fc={FAM_COL[h.s.fam]} data-k={h.id === me ? 'atb-me' : undefined}>
        <b><FamShield fam={h.s.fam} size={14} /> Lv.{h.s.lv} {name(h.id)} <AtbIcon name={ROLE_ICON[h.s.role]} size={12} /></b>
        <span class="ar"><i class="thin atb" aria-label="ATB"><b style:width="{Math.round(Math.min(1, h.atb) * 100)}%"></b></i>{#if h.atb >= 1 && !h.down}<i class="az" aria-label="ATB 가득">⚡</i>{/if}</span>
      </div>
    </div>
  {/each}

  {#each pops as p (p.id)}<span class="pop {p.cls}" style:left="{p.x}%" style:top="{p.y}%">{p.t}</span>{/each}

  <!-- 문제 카드 -->
  {#if open && run}
    <div class="card" class:suck={grading?.suck} class:drag={dragging} style:translate="0 {dragY}px" bind:this={cardEl}><QuizCard bind:this={qc} {L} {run} {seed} title={titleOf(run)} hintOk={!hintUsed} {flash} flashN={fN} locked={lockLeft} {lockTag} {grading} auto={!!autoTag} onskip={finishGrade} onsubmit={submit} ongrab={grab} onfill={(v) => (canSend = v)} /></div>
  {/if}

  <!-- 단추 -->
  {#if me >= 0 && meH}
    <!-- 📜 요청 #19 = 아래 가로 한 줄: 문제 풀기 · ⚡ 내 스킬 · 역할 · 🌟 비장 · (💖) · ⚔ 공격 · 보스 · 용사는 모두 이 줄 위 -->
    <!-- 📜 요청 #24 ② 아래 단추 고정 3개 (카드를 열고 닫아도 자리 그대로): 왼쪽 ⚔ 공격(풀이 중 = 자동 공격 켜기 · 끄기) · 가운데 📜 문제 풀이(열리면 = ✅ 제출) · 오른쪽 스킬 ⚡(누르면 위로 메뉴) -->
    <nav class="btns v2" class:q={open} class:wk={isWeak(me)} class:full3={fullCh} aria-label="행동" style:--u={U} style:--fc={FAM_COL[meH.s.fam]}>
      {#if open && over !== 'timing'}<button type="button" class="b atk tg" class:on={autoOn} data-k="atb-autotgl" role="switch" aria-checked={autoOn} onclick={() => { autoOn = !autoOn; sfx('click', 0.4); }}><span class="ai">⚔</span> {autoOn ? '자동 공격' : '수동 공격'}<i class="sw" class:on={autoOn} aria-hidden="true"><b></b></i></button>
      {:else}<button type="button" class="b atk" class:hot={ready || over === 'timing'} class:stopb={over === 'timing'} disabled={!ready && over !== 'timing'} data-k="atb-attack" data-stop={over === 'timing' ? 1 : 0} onpointerdown={atkDown} onclick={doAttack}>{#if over === 'timing'}⏹ 멈춤!{:else}<span class="ai">⚔</span> 공격{/if}</button>{/if}
      {#if open}<button type="button" class="b quiz go" data-k="atb-submit" disabled={!canSend} onclick={() => qc?.send()}>{lockLeft > 0 ? `⏳ 막는 중… ${lockLeft}` : '✅ 제출'}</button>
      {:else}<button type="button" class="b quiz" data-k="atb-quiz-open" disabled={!!S.end} onclick={openQuiz}>📜 문제 풀이</button>{/if}
      <div class="skw">
        <button type="button" class="b skb" class:react={reactNow} style:--rc={meH ? ROLE_COL[meH.s.role] : undefined} class:hot={slots.some((x) => x.ok)} class:on={skOpen} data-k="atb-skill-btn" aria-expanded={skOpen} onclick={() => (skOpen = !skOpen)}>스킬 <span class="orbs" class:flash={gaugeFlash} data-k="atb-orbs" aria-label="기력 {meH.ch} / {T.charge.max}">{#each Array(T.charge.max) as _, j (j)}<i class:on={j < shownCh}>⚡</i>{/each}</span>{#if shownCh >= T.charge.max}<i class="ringfx" data-k="atb-fullring" aria-hidden="true"></i>{/if}</button>
        {#if fullMsg}<b class="fullmsg" data-k="atb-fullmsg" role="status">⚡ 스킬 쓸 수 있어요!</b>{/if}
        <div class="ring skm" class:open={skOpen} data-k="atb-skills" aria-label="스킬" aria-hidden={!skOpen}>
        {#each slots as sk (sk.k)}
          <button type="button" class="sk2 {sk.k}" class:situ={!sk.fix} class:lit={!!lit[sk.k]} class:need={anyNeed && sk.ok && ((sk.k === 'role' && meH.s.role === 'healer') || sk.k === 'revive')} class:dis={!sk.ok || over === 'timing'} aria-disabled={!sk.ok || over === 'timing'} data-k="atb-sk-{sk.k}" aria-label="{SK_NAME(sk.k)} · 기력 {sk.cost} · {pv[sk.k]?.line ?? ''}" onpointerdown={(ev) => pressStart(sk.k, ev)} onpointerup={pressEnd} onpointerleave={pressEnd} onpointercancel={pressEnd} oncontextmenu={(ev) => ev.preventDefault()} onclick={() => { if (peekUsed) { peekUsed = false; return; } if (sk.ok && over !== 'timing') fire(sk.k); }}>
            <span class="ic">{#if sk.k === 'role' && meH.s.role === 'healer'}💚{:else if sk.k === 'role'}<AtbIcon name={ROLE_ICON[meH.s.role]} size={Math.round(22 * U)} />{:else}{SK_ICON[sk.k]}{/if}{#if sk.k === 'equip' && breaksShield}<i class="shb" data-k="atb-sk-shield-badge" title="실드도 깸">🛡</i>{/if}</span>
            <span class="nm">{SK_NAME(sk.k)}{#if sk.k === 'equip' && fx[me]}<small>{skillName(fx[me]!)}{meH.s.tier >= 4 ? ' Ⅳ' : ''}</small>{:else if sk.k === 'aura' || sk.k === 'awk'}<small>🌟 비장</small>{/if}{#if pv[sk.k]}<em class="pv" class:gold={pv[sk.k]!.gold} data-k="atb-pv-{sk.k}">{pv[sk.k]!.line}</em>{/if}</span>
            <span class="co" data-k="atb-cost-{sk.k}">{#each Array(sk.cost) as _, j (j)}<i class:on={j < meH.ch}>⚡</i>{/each}{#if meH.ch < sk.cost}<small class="need1">⚡ {sk.cost - meH.ch}개 더 풀면</small>{/if}</span>
            {#if sk.k === 'role' && meH.s.role === 'healer' && healBlocked(S)}<small class="hw" data-k="atb-heal-wait">보스 공격 뒤</small>{/if}
          </button>
        {/each}
        {#if peek && pv[peek]}{@const P = pv[peek]!}<span class="peekc" role="tooltip" data-k="atb-peek" style:left="{peekX}px"><b>{P.name}</b><span>{P.desc}</span><span class="pl">{P.line}</span><small>⚡ {P.cost} · {P.per}</small>{#if P.why}<small class="why">지금 못 씀: {P.why}</small>{/if}</span>{/if}
        </div>
      </div>
      {#if chgPop}<b class="chpop" data-k="atb-chg-pop">{chgPop}</b>{/if}
    </nav>
  {:else}
    <p class="watch" role="status">👀 봇 {S.heroes.length}명 관전 · {Math.floor(S.t / 60)}:{String(Math.floor(S.t % 60)).padStart(2, '0')} · ×{speed}</p>
  {/if}

  {#if over === 'timing'}<TimingBar bind:this={tb} ondone={onTiming} />{/if}
  {#if over === 'pick' && meH}
    <div class="pick" role="dialog" aria-label="누구에게"><b>{pickK === 'revive' ? '부활' : ROLE_SKILL[meH.s.role]} · 누구에게?</b>{#each S.heroes.filter((x) => (pickK === 'revive' ? x.down && x.id !== me : !x.down && (meH.s.role === 'tank' || x.id !== me))) as x (x.id)}<button type="button" onclick={() => pickTo(x.id)}>{name(x.id)}{S.target?.includes(x.id) ? ' ⚠표적' : ''}</button>{/each}<button type="button" class="x" onclick={() => (over = '')}>취소</button></div>
  {/if}
  {#if cut}
    <div class="cut" class:short={cut.short} data-k="atb-cutin" aria-live="polite">
      <div class="band"><HeroSprite id={lookOfStats(S.heroes[cut.who]!.s)} scale={Math.max(2, Math.round(H / 90))} row={2} play /></div>
      <p class="cn"><small>{cut.short ? '스킬' : cut.awk ? '✨ 각성 ⚡⚡⚡' : '4레벨 스킬 ⚡⚡'}</small>{cut.name}</p>
    </div>
  {/if}
  {#if bigMsg}<div class="bigmsg {bigMsg.cls}" role="alert" data-k="atb-bigmsg">{bigMsg.t}</div>{/if}
  {#if S.end}<div class="endb" class:win={S.end.win} role="status">{S.end.win ? '⚔ 처치!' : `💀 ${S.end.why}`}</div>{/if}
</div>

<style>
  .stage { position: fixed; inset: 0 var(--safe-r, 0px) 0 var(--safe-l, 0px); overflow: hidden; background: #1a1424 center / cover no-repeat; color: #fff; font-family: var(--font); user-select: none; -webkit-user-select: none; touch-action: manipulation; }
  .stage::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(#0000 55%, #0006); }
  .stage.weak::after { background: radial-gradient(ellipse at 70% 50%, #ffcf4a33, #0000 60%), linear-gradient(#0000 55%, #0006); }
  .tr { position: absolute; top: 2%; right: 1.5%; z-index: 20; display: flex; align-items: center; gap: 6px; }
  .weakb { position: absolute; top: 2%; left: 50%; transform: translateX(-50%); z-index: 22; display: flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 12px; background: linear-gradient(#ffdf7a, #f0a92a); color: #3a1d00; font: 800 16px var(--font); box-shadow: 0 0 16px #ffcf4a; animation: pulse 0.8s ease-in-out infinite; }
  @keyframes pulse { 50% { transform: translateX(-50%) scale(1.06); } }
  .bossui { position: absolute; top: 11%; z-index: 12; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: left 0.45s ease; }
  .tele { padding: 3px 12px; border-radius: 10px; border: 2px solid #ffcf6a; background: linear-gradient(#c81e1e, #8e1010); font: 800 14px var(--font); box-shadow: 0 0 10px #ff3a2a88; animation: blink 0.5s steps(2) infinite; }
  @keyframes blink { 50% { filter: brightness(1.3); } }
  /* ❤ HP = 큰 숫자 + 가는 색 띠 (Y6) */
  .thin { display: block; width: 100%; height: 5px; border-radius: 3px; background: #0009; overflow: hidden; box-shadow: 0 0 0 1px #0006; }
  .thin b { display: block; height: 100%; transition: width 0.25s; } .thin.hp b { background: linear-gradient(90deg, #7de06a, #2faa3a); } .thin.atb { height: 4px; } .thin.atb b { background: linear-gradient(90deg, #ffe46a, #e6b81e); }
  /* 🧑 내 초상 HUD (Y5) */
  @keyframes glow2 { 50% { box-shadow: 0 0 22px #ffe27a; } }
  .chs, .slots, .co { display: flex; gap: 3px; }
  .cs { display: inline-block; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #8fd0ff88; background: #0a1a3a; }
  .cs.on { border-color: #fff; background: radial-gradient(circle, #fff 0 25%, #8fe0ff 50%, #3a8ef0); box-shadow: 0 0 6px #8fd0ff; }
  .chs.flash { animation: gflash 0.45s; }
  .hn { font: 800 10px var(--font-plain); color: #e0ffd8; text-align: center; line-height: 1; text-shadow: 0 1px 0 #000; }
  .boss.stone :global(*) { filter: grayscale(1) brightness(0.85) contrast(1.2); }
  .hero.aura .spr { filter: drop-shadow(0 0 6px #fff6a0) drop-shadow(0 0 12px #ffd34d); }
  .bflip { display: block; } .bflip.flip { transform: scaleX(-1); } /* 몬스터는 늘 왼쪽(용사 쪽)을 봄 · 시트마다 · 자세마다 다름 = tune.ts BOSSES.flip */
  .boss { position: absolute; top: 74%; transform: translate(-50%, -100%); z-index: 11; transition: left 0.45s ease; }
  .hero { position: absolute; transition: left 0.45s ease, top 0.45s ease; }
  .hero .spr { position: absolute; left: 0; top: 0; z-index: var(--zi); } /* 앞 용사 몸 = 뒤 용사 몸 위 · 이름표 · 배지 = 모든 몸 위 (요청 #15) */
  .hero .tag, .hero .wbadge, .hero .sos, .hero .aimx { z-index: 20; }
  .hero.down .spr { filter: grayscale(1) brightness(0.6); }
  .tele.sig { background: linear-gradient(#3a5ac8, #1d2f8e); border-color: #9fd0ff; box-shadow: 0 0 10px #5aa9ff88; }
  .bflip.armor { filter: drop-shadow(0 0 4px #9fe6ff) drop-shadow(0 0 10px #5ac8ff) saturate(0.7) brightness(1.15); } /* 4 얼음 갑옷 */
  .bflip.shine { filter: drop-shadow(0 0 8px #fff) drop-shadow(0 0 16px #c9a8ff); animation: blink 0.6s steps(2) infinite; } /* 8 거울빛 */
  .bflip.breath { filter: drop-shadow(0 0 10px #7dffb0); } /* 6 숨 고르기 */
  .gaze { position: absolute; left: -10px; top: -96px; font-size: 22px; font-style: normal; animation: blink 0.4s steps(2) infinite; }
  .pop.heal { color: #7dffb0; font-size: 20px; }
  .tgt { position: absolute; left: -26px; top: -10px; width: 52px; height: 18px; border-radius: 50%; border: 3px solid #ff3a2a; box-shadow: 0 0 10px #ff3a2a; animation: blink 0.4s steps(2) infinite; }
  .cov { position: absolute; left: 14px; top: -54px; }
  .tag { position: absolute; left: -42px; top: 2px; width: 84px; display: flex; flex-direction: column; gap: 1px; padding: 1px 2px 2px; border-radius: 6px; border: none; background: linear-gradient(#0000, #0006 30%, #0006); text-shadow: 0 1px 0 #000, 0 0 3px #000; } /* 📜 요청 #14 참고 그림 = 상자 없이 글 + 막대 */
  .tag > b { font: 700 9.5px var(--font-plain); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hero.mine .tag > b { color: #ffe08a; }
  .hz { font-size: 9px; font-style: normal; line-height: 1; }
  .pop { position: absolute; z-index: 25; transform: translate(-50%, 0); font: 900 22px var(--font); color: #fff; text-shadow: 0 2px 0 #000, 0 0 6px #000; pointer-events: none; animation: up 1.1s ease-out forwards; white-space: nowrap; }
  .pop.crit { color: #ffe066; font-size: 34px; } .pop.sk { color: #8fd0ff; font-size: 34px; } .pop.ult { color: #ffd34d; font-size: 46px; } .pop.hurt { color: #ff6a6a; font-size: 20px; } .pop.hurt.big { font-size: 26px; } .pop.miss { color: #ccc; font-size: 20px; }
  .pop.crit, .pop.sk, .pop.ult { animation: upbig 1.1s ease-out forwards; } @keyframes upbig { 0% { opacity: 1; transform: translate(-50%, 0) scale(1.8); } 15% { transform: translate(-50%, -6px) scale(1); } 100% { opacity: 0; transform: translate(-50%, -56px) scale(1); } } .pop.shield { color: #9fe6ff; font-size: 22px; } .pop.role { color: #9dff9a; font-size: 16px; }
  @keyframes up { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -48px); } }
  .card { position: absolute; z-index: 26; left: 26.5%; top: 2.5%; bottom: 2.5%; width: 47%; animation: slide 0.35s ease-out; transform-origin: 10% 10%; } /* Y7 약 47% */
  .card.suck { transition: transform 0.42s ease-in, opacity 0.42s ease-in; transform: translate(-80%, -20%) scale(0.05) rotate(-20deg); opacity: 0; }
  @keyframes slide { from { transform: translateX(30px); opacity: 0; } }
  /* ⚔ 오른쪽 아래 큰 공격 단추 + 둘레 스킬 고리 (요청 #9) · 📜 문제 풀기 = 왼쪽 아래 · 문제를 열면 = 카드 왼쪽 */
  .sk2 .co { display: flex; gap: 0; font-size: calc(9px * var(--u)); } .sk2 .co i { font-style: normal; filter: grayscale(1) brightness(0.6); } .sk2 .co i.on { filter: drop-shadow(0 0 3px #ffd34d); }
  .sk2:disabled, .sk2.dis { filter: grayscale(0.85) brightness(0.6); }
  .sk2.role { border-color: #5fe0c0; background: radial-gradient(circle at 50% 35%, #2a9a84, #0f4a40); } .sk2.tier4 { border-color: #ffb84a; background: radial-gradient(circle at 50% 35%, #c8762a, #5a2a0a); } .sk2.aura { border-color: #fff3a0; background: radial-gradient(circle at 50% 35%, #c8b84a, #5a4a0a); } .sk2.awk { border-color: #ffd34d; background: radial-gradient(circle at 50% 35%, #e8a82a, #6a3a0a); }
  @keyframes situ { 50% { box-shadow: 0 0 18px #fff, 0 3px 0 #0a1430; } }
  .sk2.lit { animation: lit 0.7s ease-out; } @keyframes lit { 0% { filter: brightness(2.6); box-shadow: 0 0 26px #fff; scale: 1.25; } 100% { scale: 1; } }
  .sk2 .hw { position: absolute; bottom: -14px; white-space: nowrap; font: 700 10px var(--font-plain); color: #ffd98a; text-shadow: 0 1px 1px #000; }
  .ai { font-size: calc(30px * var(--u)); line-height: 1; } .hrt { font-size: 18px; } .chg.flash { animation: gflash 0.45s; }
  .b { min-height: 48px; border-radius: 12px; border: 3px solid #8a6a3a; background: linear-gradient(#5a3f2a, #3a2618); color: #fff2d6; font: 800 clamp(13px, 4.6vh, 22px) var(--font); display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: inset 0 0 0 2px #2a1a10, 0 4px 0 #1a100a; padding: 0 4px; text-shadow: 0 2px 0 #0008; }
  .b:disabled { filter: grayscale(0.4) brightness(0.75); }
  .b.atk.hot { border-color: #ffd34d; background: linear-gradient(#f6c25a, #c8862a); color: #2a1600; box-shadow: 0 0 14px #ffd34d, inset 0 0 0 2px #fff3c0, 0 4px 0 #6a4210; text-shadow: none; animation: glow 1s ease-in-out infinite; }
  @keyframes glow { 50% { box-shadow: 0 0 22px #ffe27a, inset 0 0 0 2px #fff3c0, 0 4px 0 #6a4210; } }
  @keyframes gflash { 30% { filter: brightness(2.2); box-shadow: 0 0 22px #ffe27a; } }
  .b.atk.stopb { border-color: #fff; background: linear-gradient(#ff6a4a, #c8261e); color: #fff; text-shadow: 0 2px 0 #0008; animation: none; font-size: clamp(16px, 6vh, 26px); }
  /* 🧭 역할 스킬 = 따로 보이게 (📜 선생님 「스킬 하나밖에 없다」) · 꺼져 있어도 색은 그대로 */
  .floor { position: absolute; z-index: 9; left: 0; width: 50%; top: 42%; height: 34%; pointer-events: none; opacity: 0; border-radius: 50%; background: radial-gradient(ellipse at 50% 62%, #ff2a1a, #ff2a1a99 40%, #ff2a1a33 62%, #0000 72%); mix-blend-mode: screen; transition: opacity 0.2s, width 0.45s; }
  .floor.q { width: 34%; } .floor.on { opacity: 1; animation: blink 0.35s steps(2) infinite; }
  .boom { position: absolute; inset: 0; z-index: 35; pointer-events: none; background: radial-gradient(ellipse at 25% 60%, #ffffffcc, #ff3a1a99 30%, #7a000066 70%); animation: boom 0.6s ease-out forwards; }
  @keyframes boom { from { opacity: 1; } to { opacity: 0; } }
  .tele.aoe { font-size: 17px; padding: 4px 16px; background: linear-gradient(#ff3a1a, #a80e0e); box-shadow: 0 0 18px #ff2a1a; }
  .hero.hurt .spr { filter: brightness(1.6) sepia(1) saturate(6) hue-rotate(-30deg); animation: hshake 0.3s; }
  @keyframes hshake { 25% { margin-left: -5px; } 75% { margin-left: 5px; } }
  .hitpic { position: absolute; inset: 0; pointer-events: none; }
  /* 👹 맞는 순간 = 붉은 할퀸 자국 (「맞는 그림」 10종이 오면 이 자리에 그림) */
  .hero.hurt .hitpic { background: linear-gradient(135deg, #0000 38%, #ff3a2acc 40%, #fff 42%, #ff3a2acc 44%, #0000 46%, #0000 52%, #ff3a2acc 54%, #fff 56%, #ff3a2acc 58%, #0000 60%); animation: claw 0.4s ease-out forwards; }
  @keyframes claw { from { opacity: 0; transform: scale(0.6) translate(20%, -20%); } 30% { opacity: 1; } to { opacity: 0; transform: scale(1.1); } }
  /* ⊕ 노림 (📜 요청 #7 ③) */
  .aimme { position: absolute; left: 0; top: -14px; z-index: 21; transform: translate(-50%, -100%); white-space: nowrap; padding: 2px 10px; border-radius: 10px; background: linear-gradient(#e8332a, #8e1010); border: 2px solid #ffcf6a; font: 900 13px var(--font); animation: blink 0.4s steps(2) infinite; }
  .rhp { width: 100%; } /* 👹 「맞는 그림」 10종 겹칠 자리 (아직 빈 칸 · hero-v2 monster-hit-map.json) */
  .stage :global(.atb-orb) { position: absolute; z-index: 38; width: 22px; height: 22px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, #fff 0 25%, #8fe0ff 45%, #3a8ef0aa 70%, #0000 72%); box-shadow: 0 0 16px 6px #8fd0ffaa; }
  .stage :global(.atb-orb.g) { width: 28px; height: 28px; background: radial-gradient(circle, #fff 0 25%, #ffe27a 45%, #f0a92aaa 70%, #0000 72%); box-shadow: 0 0 20px 8px #ffd34daa; }
  .cut.short { background: #0007; animation-duration: 0.9s; } .cut.short .band { top: 20%; height: 28%; }
  .watch { position: absolute; z-index: 24; left: 50%; bottom: 3%; transform: translateX(-50%); margin: 0; padding: 6px 14px; border-radius: 10px; background: #000a; font: 700 14px var(--font-plain); }
  .pick { position: absolute; z-index: 30; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; border: 3px solid #c9953e; background: #2a1a10f0; min-width: 200px; }
  .pick button { min-height: 44px; border-radius: 10px; border: 2px solid #8a6a3a; background: #4a3020; color: #fff; font: 700 15px var(--font-plain); }
  .pick .x { background: #0006; }
  .cut { position: absolute; inset: 0; z-index: 40; pointer-events: none; background: #000c; animation: cutin 1.7s ease-out forwards; }
  .band { position: absolute; left: -10%; right: -10%; top: 12%; height: 40%; transform: rotate(-12deg); background: linear-gradient(90deg, #ff9a1a, #ffe27a 40%, #ff7a1a); display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 0 40px #ffcf4a; }
  .band :global(.hs) { transform: rotate(12deg) scaleX(1); }
  .cn { position: absolute; left: 5%; bottom: 10%; margin: 0; font: 900 clamp(26px, 10vh, 54px) var(--font); color: #fff; text-shadow: 0 3px 0 #a8460a, 0 0 18px #ffb84a; } .cn small { display: block; font-size: 0.42em; color: #ffe27a; }
  @keyframes cutin { 0% { opacity: 0; } 10% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
  .endb { position: absolute; z-index: 45; left: 50%; top: 38%; transform: translate(-50%, -50%); padding: 10px 30px; border-radius: 14px; border: 3px solid #c9953e; background: #2a1020e6; font: 900 34px var(--font); } .endb.win { color: #ffe27a; }
  @media (prefers-reduced-motion: reduce) { .weakb, .tele, .b.atk.hot, .tgt, .barrier, .bigmsg { animation: none; } }
  /* 🛡 실드 칸 = 보스 체력바 아래 크게 한 줄 (요청 #12 ② · 그림 atb-shield-slots 오기 전 = 큰 이모지 + 굵은 계열 색 테두리) */
  .cells { display: flex; justify-content: center; gap: 8px; margin-top: 2px; }
  .cell2 { position: relative; width: 46px; height: 50px; display: grid; place-items: center; filter: drop-shadow(0 0 5px var(--fc)); } /* 📜 요청 #28 방패 모양 칸 */
  .cell2.hold { animation: none; }
  .cell2.crack { animation: cshake 0.38s; }
  @keyframes cshake { 20% { translate: -3px 0; } 40% { translate: 3px 0; } 60% { translate: -2px 0; } 80% { translate: 2px 0; } }
  .cell2.shatter { animation: cgone 0.45s ease-in forwards; }
  @keyframes cgone { to { opacity: 0; scale: 1.3; } }
  .cell2.gone { filter: none; }
  .cell2 .lk { position: absolute; right: -8px; bottom: -8px; font-size: 15px; font-style: normal; }
  /* 🛡 방패막 (그림 atb-shield 오기 전 = 빛 테두리) · 펼침 · 물결 · 산산조각 */
  .barrier { position: absolute; top: 75%; z-index: 11; transform: translate(-50%, -100%); pointer-events: none; background-repeat: no-repeat; background-size: 400% 300%; background-position: 0% 0%; mix-blend-mode: screen; mix-blend-mode: plus-lighter; transition: left 0.45s ease; }
  .barrier.up { animation: bup 0.5s ease-out, bloop 1.2s steps(4) 0.5s infinite; } @keyframes bup { from { scale: 0.3; opacity: 0; } to { scale: 1; opacity: 1; } }
  @keyframes bloop { from { background-position-x: 0%; } to { background-position-x: 133.33%; } }
  .barrier.ripple { background-position-y: 50%; animation: bhit 0.5s steps(4) forwards; } @keyframes bhit { from { background-position-x: 0%; } to { background-position-x: 133.33%; } }
  .barrier.shatter { background-position-y: 100%; animation: bhit 0.7s steps(4) forwards; }
  .boss.roar { animation: roar 0.8s ease-out; } @keyframes roar { 40% { filter: brightness(1.5) drop-shadow(0 0 12px #9fe6ff); } }
  /* 💬 큰 문구 (실드! · 실드 파괴 · 약점 시간) */
  .bigmsg { position: absolute; z-index: 44; left: 50%; top: 42%; transform: translate(-50%, -50%); padding: 8px 28px; border-radius: 16px; border: 3px solid #9fe6ff; background: linear-gradient(#1d5ac8ee, #0d2f6aee); color: #fff; font: 900 clamp(26px, 10vh, 44px) var(--font); text-shadow: 0 3px 0 #000; white-space: nowrap; pointer-events: none; animation: bigin 0.35s ease-out; }
  .bigmsg.note { top: 30%; padding: 4px 18px; border-color: #8fd0ff; font-size: clamp(16px, 5.5vh, 24px); }
  .btns.full3 .sk2:not(.dis) { box-shadow: 0 0 16px #8fe0ff, 0 3px 0 #0a1430; }
  .bigmsg.weak { border-color: #ffe27a; background: linear-gradient(#e8a82aee, #8a4a0aee); font-size: clamp(20px, 7vh, 34px); }
  @keyframes bigin { from { opacity: 0; scale: 1.6; } }
  /* ⚔ 약점 상성 (요청 #12 ④) = 머리 위 「약점!」 + 발밑 계열 색 빛 · 내가 약점이면 초상 · 공격 · 보호막 단추 테두리도 */
  .wbadge { position: absolute; left: 0; transform: translateX(-50%); z-index: 3; padding: 1px 8px; border-radius: 8px; border: 2px solid var(--fc); background: #1d1220e6; color: #fff; font: 900 11px var(--font); font-style: normal; white-space: nowrap; box-shadow: 0 0 8px var(--fc); }
  .wglow { position: absolute; left: -34px; top: -12px; width: 68px; height: 24px; border-radius: 50%; background: radial-gradient(ellipse, var(--fc), #0000 70%); opacity: 0.85; z-index: -1; animation: blink 0.9s ease-in-out infinite; }
  .btns.wk .b.atk, .btns.wk .sk2.shield { border-color: var(--fc); box-shadow: 0 0 14px var(--fc), 0 4px 0 #1a100a; }
  .stage.q .tag { transform: scale(0.82); transform-origin: top center; }
  .tag.full { box-shadow: 0 0 10px #ffd34d88; } .tag.full > b { color: #fff3a0; }
  /* 🆘 위험 체력 (요청 #18) */
  .sos { position: absolute; left: 0; transform: translateX(-50%); z-index: 4; padding: 0 6px; border-radius: 10px; background: #fff; font-size: 16px; font-style: normal; box-shadow: 0 0 8px #ff2a2a; animation: blink 1s steps(2) infinite; }
  .sk2.need { animation: need 0.8s ease-in-out infinite; } @keyframes need { 50% { box-shadow: 0 0 22px #7dffb0, 0 3px 0 #0a1430; filter: brightness(1.3); } }
  .bigmsg.sosmsg { top: 30%; padding: 4px 18px; border-color: #ff6a5a; background: linear-gradient(#c81e1eee, #6a0a0aee); font-size: clamp(16px, 5.5vh, 24px); }
  @media (prefers-reduced-motion: reduce) { .hpb.low .thin.hp, .hpb.low .hn, .sos, .sk2.need { animation: none; } }
  /* 📜 요청 #22 = 내 정보는 발밑 이름표 하나 · 노림 · 약점 · 위험 = 내 이름표 테두리 */
  .hero.mine .tag { box-shadow: 0 0 0 2px #e2b04a; } .tag.wk { box-shadow: 0 0 0 2px var(--fc), 0 0 10px var(--fc); } .tag.aimed { box-shadow: 0 0 0 2px #ff3a2a, 0 0 14px #ff3a2a; } .tag.low { box-shadow: 0 0 0 2px #ff2a2a, 0 0 12px #ff2a2a; }
  /* 📜 요청 #19 아래 가로 한 줄 단추 */
  .btns { position: absolute; z-index: 24; left: 1.5%; right: 1.5%; bottom: 2%; height: calc(64px * var(--u)); display: flex; align-items: stretch; gap: 1.2%; }
  .b.quiz { flex: 0 0 22%; height: 100%; min-height: 0; }
  .qsp { flex: 0 0 22%; }
  .ring { position: relative; flex: 1; display: flex; gap: 1.2%; justify-content: center; }
  .sk2 { position: relative; flex: 0 1 calc(118px * var(--u)); height: 100%; border-radius: 14px; padding: 0 6px; display: grid; grid-template-columns: auto 1fr; grid-template-rows: 1fr auto; column-gap: 4px; align-items: center; border: 3px solid #8fd0ff; background: linear-gradient(#3a6ac8, #16285a); color: #fff; font: 800 calc(12px * var(--u)) var(--font-plain); box-shadow: 0 3px 0 #0a1430; line-height: 1.05; text-align: left; }
  .sk2 .ic { grid-row: 1 / span 2; position: relative; font-size: calc(24px * var(--u)); line-height: 1; display: inline-flex; }
  .sk2 .nm { display: flex; flex-direction: column; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 0 #000; } .sk2 .nm small { font-size: calc(9.5px * var(--u)); color: #cfe6ff; font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
  .sk2 .shb { position: absolute; right: -8px; bottom: -6px; font-style: normal; font-size: calc(14px * var(--u)); filter: drop-shadow(0 0 3px #9fe6ff); }
  .sk2.situ { animation: situ 0.9s ease-in-out infinite; }
  .b.atk { flex: 0 0 calc(130px * var(--u)); height: 100%; min-height: 0; border-radius: 16px; flex-direction: column; gap: 0; font-size: calc(18px * var(--u)); padding: 0; }
  .chpop { position: absolute; right: calc(40px * var(--u)); bottom: calc(70px * var(--u)); font: 900 22px var(--font); color: #ffe46a; text-shadow: 0 0 6px #e6b81e, 0 2px 0 #000; animation: up 1.4s ease-out forwards; pointer-events: none; }
  /* 🌟 오라 층 (요청 #20): 몸 그림은 숨기고 오라만 · 몸(.spr z 10+)보다 아래 · 공격하러 달려가는 동안은 숨김 */
  .aul { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); pointer-events: none; }
  .aul :global(.hs > i) { visibility: hidden; } .aul.off { opacity: 0; transition: opacity 0.1s; }
  /* 문제 카드 = 아래 스킬 줄까지 덮음 (📜 ❓#8 선생님 「덮기」 · 열린 동안 스킬 못 누름 · 공격 단추 · 자동 공격 그대로 · 닫으면 스킬) */
  .sk2 .pv { display: block; font: 800 calc(9.5px * var(--u)) var(--font-plain); font-style: normal; color: #ffe9b0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .sk2 .pv.gold { color: #ffd34d; text-shadow: 0 0 4px #b8860b, 0 1px 0 #000; }
  .sk2 { -webkit-touch-callout: none; user-select: none; }
  .peekc { position: absolute; z-index: 40; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); width: max-content; max-width: 260px; display: flex; flex-direction: column; gap: 3px; padding: 8px 12px; border-radius: 12px; border: 2px solid #e2b04a; background: #1d1220f2; color: #fff; font: 700 13px var(--font-plain); text-align: left; white-space: normal; box-shadow: 0 6px 18px #000a; pointer-events: none; filter: none; }
  .peekc b { font: 900 15px var(--font); color: #ffd98a; } .peekc .pl { color: #ffe9b0; font-weight: 800; } .peekc small { font: 700 12px var(--font-plain); color: #cfe6ff; } .peekc .why { color: #ff9a8a; }
  /* ── 📜 요청 #24 UI v2 ── */
  .gear { width: 40px; height: 40px; border-radius: 12px; border: 2px solid #c9953e; background: #1d1220e6; font-size: 22px; line-height: 1; padding: 0; color: #ffe9b0; }
  .tr { flex-direction: column; align-items: flex-end; }
  .gmenu { display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: 12px; border: 2px solid #c9953e; background: #1d1220f2; }
  .gmenu button { min-height: 40px; padding: 0 12px; border-radius: 10px; border: 2px solid #8a6a3a; background: #3a2618; color: #fff2d6; font: 800 14px var(--font-plain); text-align: left; } .gmenu button.off { filter: grayscale(0.6); }
  .gmenu .gr { font: 700 12px var(--font-plain); color: #ffd0e0; padding: 0 4px; }
  .revfx { position: absolute; z-index: 44; left: 50%; top: 30%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 10px; padding: 6px 20px; border-radius: 14px; border: 3px solid #ff8ab0; background: #3a0a20e6; font: 900 clamp(18px, 6vh, 28px) var(--font); color: #ffe0ea; animation: bigin 0.3s ease-out; pointer-events: none; }
  .revfx .hb { font-size: 1.4em; animation: hbreak 0.6s ease-out; } @keyframes hbreak { 0% { transform: scale(1.6); filter: brightness(2); } 60% { transform: scale(1) rotate(-12deg); } }
  .hpb { position: absolute; left: -26px; width: 52px; z-index: 20; display: flex; flex-direction: column; align-items: center; gap: 1px; pointer-events: none; }
  .hpb .hn { font: 800 9px var(--font-plain); color: #eaffe4; text-shadow: 0 1px 0 #000, 0 0 3px #000; }
  .hpb.low .thin.hp b { background: #ff2a2a; } .hpb.low .hn { color: #ff6a5a; } .hpb.low .thin.hp, .hpb.low .hn { animation: lowb 1s steps(2) infinite; }
  .tag { left: -46px; width: 92px; padding: 0; background: none; box-shadow: none !important; gap: 2px; }
  .tag > b { display: flex; align-items: center; justify-content: center; gap: 2px; font: 800 10px var(--font-plain); text-shadow: 0 1px 0 #000, 0 0 3px #000, 0 0 3px #000; }
  .tag .ar { position: relative; display: block; width: 70%; margin: 0 auto; }
  .tag .az { position: absolute; right: -12px; top: -6px; font-size: 10px; font-style: normal; filter: drop-shadow(0 0 3px #ffd34d); }
  .tag.aimed > b { color: #ff8a7a !important; } .tag.low > b { color: #ff6a5a; } .tag.wk > b { text-shadow: 0 0 6px var(--fc), 0 1px 0 #000; }
  .stage.q .tag { transform: none; }
  .card { left: 26.5%; top: 2%; bottom: 0; width: 47%; animation: rise 0.32s cubic-bezier(.2,.9,.3,1.1); transform-origin: 50% 100%; transition: translate 0.2s ease-out; }
  .card.drag { transition: none; }
  @keyframes rise { from { transform: translateY(100%); } }
  .btns.v2 { justify-content: space-between; gap: 0; z-index: 27; } /* 카드 위 = 아래 단추 줄(가운데 = ✅ 제출이 카드 아래 끝에 얹힘) */
  .orbs.flash { animation: gflash 0.45s; }
  .btns.v2 .b.atk { flex: 0 0 22%; }
  .btns.v2 .b.quiz { position: absolute; left: 50%; transform: translateX(-50%); width: calc(47% * 0.94 / 0.97); max-width: 41%; height: 100%; z-index: 30; }
  .btns.v2 .b.quiz.go { border-color: #2f8a3a; background: linear-gradient(#7ddc6a, #2faa3a); color: #0a2a0a; text-shadow: none; } .btns.v2 .b.quiz.go:disabled { background: linear-gradient(#b8c8a8, #8a9a7a); border-color: #6a7a5a; color: #3a4a3a; }
  .b.atk.tg { background: linear-gradient(#3a3a4a, #22222e); border-color: #8a8aa0; font-size: calc(14px * var(--u)); } .b.atk.tg.on { border-color: #ffd34d; background: linear-gradient(#6a5a2a, #3a2e10); color: #ffe9b0; } .b.atk.tg small { font: 800 calc(11px * var(--u)) var(--font-plain); }
  .skw { position: relative; flex: 0 0 22%; height: 100%; }
  .b.skb { width: 100%; height: 100%; min-height: 0; flex-direction: column; gap: 2px; border-color: #8fd0ff; background: linear-gradient(#3a6ac8, #16285a); font-size: calc(17px * var(--u)); }
  .b.skb.hot { box-shadow: 0 0 16px #8fe0ff, 0 3px 0 #0a1430; animation: glow 1.1s ease-in-out infinite; } .b.skb.on { filter: brightness(1.2); }
  .orbs { display: flex; gap: 1px; padding: 0 6px; border-radius: 8px; background: #0006; } .orbs i { font-style: normal; font-size: calc(14px * var(--u)); filter: grayscale(1) brightness(0.55); } .orbs i.on { filter: drop-shadow(0 0 4px #ffd34d); }
  .ring.skm { position: absolute; right: 0; bottom: calc(100% + 8px); width: max-content; max-width: none; flex-direction: row; gap: 6px; padding: 8px; border-radius: 14px; border: 2px solid #8fd0ff; background: #0d1830f0; visibility: hidden; opacity: 0; transform: translateY(8px); transition: opacity 0.15s, transform 0.15s; z-index: 32; }
  .ring.skm.open { visibility: visible; opacity: 1; transform: none; }
  .ring.skm .sk2 { flex: 0 0 calc(124px * var(--u)); height: calc(64px * var(--u)); }
  .btns.v2.full3 .b.skb .orbs i.on { animation: pipglow 0.7s ease-in-out infinite; }
  /* 시안 = 아래 세 단추 같은 폭 알약 · 낮게 */
  .btns.v2 { height: max(48px, calc(54px * var(--u))); }
  .btns.v2 .b { border-radius: 999px; flex-direction: row; gap: 8px; font-size: calc(18px * var(--u)); }
  .btns.v2 .b.atk { flex: 0 0 27%; } .btns.v2 .skw { flex: 0 0 27%; } .btns.v2 .b.quiz { width: 27%; max-width: none; }
  .btns.v2 .b .ai { font-size: calc(22px * var(--u)); }
  .btns.v2 .b.atk.stopb { font-size: calc(20px * var(--u)); }
  .b.skb { background: linear-gradient(#2a2a36, #14141c); border-color: #8a8aa0; color: #fff; }
  .sw { position: relative; display: inline-block; width: 40px; height: 22px; border-radius: 11px; background: #555; border: 2px solid #ddd; font-style: normal; } .sw b { position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.15s; } .sw.on { background: #2faa3a; } .sw.on b { left: 20px; }
  /* ⚡ 충전 기믹 (요청 #31) */
  .stage :global(.atb-burst) { position: absolute; z-index: 39; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, #fff 0 18%, #8fe0ff88 40%, #0000 70%); box-shadow: 0 0 18px 6px #8fd0ffaa; animation: burst 0.45s ease-out forwards; }
  .stage :global(.atb-burst.g) { background: radial-gradient(circle, #fff 0 18%, #ffe27a88 40%, #0000 70%); box-shadow: 0 0 20px 8px #ffd34daa; }
  @keyframes burst { from { transform: scale(0.3); opacity: 1; } to { transform: scale(2.2); opacity: 0; } }
  .b.skb { position: relative; overflow: visible; }
  .ringfx { position: absolute; inset: -5px; border-radius: 999px; pointer-events: none; padding: 3px; background: conic-gradient(from var(--a, 0deg), #0000 0 60%, #8fe0ff, #fff, #8fe0ff, #0000 85%); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; animation: ringspin 1.4s linear infinite; }
  @property --a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
  @keyframes ringspin { to { --a: 360deg; } }
  .fullmsg { position: absolute; right: 1.5%; bottom: calc(100% + 8px); z-index: 33; padding: 4px 14px; border-radius: 12px; border: 2px solid #8fe0ff; background: #0d1830f0; color: #dff6ff; font: 900 15px var(--font); white-space: nowrap; animation: bigin 0.25s ease-out; pointer-events: none; }
  .need1 { margin-left: 4px; font: 800 calc(9px * var(--u)) var(--font-plain); color: #ffd98a; white-space: nowrap; }
  .card.suck { transition: transform 0.45s cubic-bezier(.6,0,.9,.4), opacity 0.45s ease-in; transform: scale(0.04) rotate(540deg); transform-origin: 50% 45%; opacity: 0; }
  @media (prefers-reduced-motion: reduce) { .ringfx { animation: none; } }
  /* 🛡 실드 속성 강조 (요청 #32) */
  .shfly { position: absolute; z-index: 43; pointer-events: none; transform: translate(-50%, -50%); animation: shfly 0.42s cubic-bezier(.5,0,.8,.4) forwards; filter: drop-shadow(0 0 14px #fff8); }
  @keyframes shfly { 0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; } 22% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; } 45% { transform: translate(-50%, -50%) scale(1); } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.33); opacity: 1; } }
  .cell2.fl { animation: cflash 0.26s ease-out; } @keyframes cflash { 0% { filter: drop-shadow(0 0 2px var(--fc)) brightness(2.2); scale: 1.3; } 100% { scale: 1; } }
  @media (prefers-reduced-motion: reduce) { .shfly { animation-duration: 0.01s; } }
  /* 🛡 반응 막기 (요청 #35) */
  .reactb { position: absolute; z-index: 34; left: 50%; top: 2%; transform: translateX(-50%); padding: 6px 18px; border-radius: 14px; border: 3px solid #fff; background: var(--rc, #3a6ac8); color: #fff; font: 900 clamp(14px, 4.6vh, 20px) var(--font); text-shadow: 0 2px 0 #0008; box-shadow: 0 0 18px var(--rc, #8fd0ff); white-space: nowrap; animation: blink 0.5s steps(2) infinite; pointer-events: none; }
  .reactb.heal { --rc: #2faa5a; }
  .tgline { position: absolute; z-index: 21; left: 50%; top: 2%; transform: translateX(-50%); padding: 3px 12px; border-radius: 10px; background: #2a0a0ae6; border: 2px solid #ff5a4a; color: #ffe0d8; font: 800 13px var(--font-plain); white-space: nowrap; pointer-events: none; }
  .tgline.special { border-color: #b07aff; background: #1d0a2ae6; color: #eadcff; }
  .chbar { position: relative; width: 70%; height: 14px; border-radius: 7px; background: #1d0a2acc; border: 2px solid #b07aff; overflow: hidden; }
  .chbar i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #7a3aff, #d08aff); transition: width 0.1s linear; } .chbar span { position: relative; display: block; text-align: center; font: 800 10px var(--font-plain); line-height: 10px; color: #fff; text-shadow: 0 1px 0 #000; }
  .b.skb.react { animation: rflash 0.45s steps(2) infinite; border-color: var(--rc); box-shadow: 0 0 20px var(--rc); } @keyframes rflash { 50% { background: var(--rc); } }
  .tbarrier { position: absolute; z-index: 12; left: 2%; width: 30%; top: 30%; height: 52%; border-radius: 50%; pointer-events: none; border: 3px solid #b8f0ff; background: radial-gradient(ellipse, #8fe0ff22, #8fe0ff55 70%, #0000 72%); box-shadow: 0 0 22px #8fe0ff; animation: bup 0.4s ease-out; }
  @media (prefers-reduced-motion: reduce) { .reactb, .b.skb.react { animation: none; } }
  /* 🌈 계열 덧효과 (요청 #36) */
  .pop.fam { font-size: 15px; color: #fff3c0; animation-duration: 0.8s; }
  .boss.burning :global(.sprite), .boss.burning :global(i) { filter: drop-shadow(0 0 6px #ff7a2a) drop-shadow(0 -4px 8px #ffb84a); }
  .boss.burning::after { content: '🔥'; position: absolute; left: 50%; top: 10%; font-size: 22px; transform: translateX(-50%); animation: blink 0.35s steps(2) infinite; pointer-events: none; }
  .boss.frost :global(.sprite), .boss.frost :global(i) { filter: drop-shadow(0 0 8px #8fe0ff) saturate(0.6) brightness(1.15) hue-rotate(160deg); }
  /* 👹 분노 (요청 #37) */
  .ragedge { position: absolute; inset: 0; z-index: 15; pointer-events: none; box-shadow: inset 0 0 60px 12px #ff1a1a88; animation: rpulse 1.1s ease-in-out infinite; }
  @keyframes rpulse { 50% { box-shadow: inset 0 0 90px 22px #ff1a1acc; } }
  .boss.raging :global(.sprite), .boss.raging .bflip { filter: drop-shadow(0 0 8px #ff2a1a) drop-shadow(0 0 16px #ff2a1a88) saturate(1.3); }
  .boss.raging::before { content: '💨'; position: absolute; left: 30%; top: 4%; font-size: 20px; opacity: 0.85; animation: steam 1.2s ease-out infinite; pointer-events: none; } @keyframes steam { from { transform: translate(0, 0); opacity: 0.9; } to { transform: translate(-8px, -26px); opacity: 0; } }
  .rhp.rage :global(.b .cur) { background: linear-gradient(90deg, #7a0a0a, #c8100a); box-shadow: 0 0 8px #ff1a1a; }
  .calmb { padding: 1px 10px; border-radius: 8px; background: #3a0606e6; border: 1px solid #ff5a4a; font: 800 11px var(--font-plain); color: #ffd8d0; } .calmb.on { background: #06283ae6; border-color: #8fe0ff; color: #dff6ff; }
  .bigmsg.rage { border-color: #ff5a4a; background: linear-gradient(#a8100aee, #4a0606ee); font-size: clamp(30px, 12vh, 56px); }
  @media (prefers-reduced-motion: reduce) { .ragedge, .boss.raging::before { animation: none; } }
  .boss.cursed :global(.sprite), .boss.cursed .bflip { filter: drop-shadow(0 0 8px #6a2aa8) brightness(0.8) saturate(0.7); } /* 🌑 저주 · 그림 자리 atb-status-fx */
  /* 👹 몬스터 피격 손맛 (📜 요청 #38) · 숫자 크기 (요청 #42 = 내 것 2배 · 친구 0.7배 옅게) */
  .pop.dmg { font: 900 22px var(--font); -webkit-text-stroke: 1px #000; paint-order: stroke fill; }
  .pop.dmg.me { font-size: 40px; -webkit-text-stroke: 3px #000; text-shadow: 0 3px 0 #000, 0 0 10px #0009; animation: dmgup 0.9s cubic-bezier(.2,1.4,.4,1) forwards; z-index: 27; }
  .pop.dmg.fr { font-size: 15px; opacity: 0.7; animation-duration: 0.6s; }
  .pop.dmg.norm { color: #fff; } .pop.dmg.crit { color: #ffe066; } .pop.dmg.crit.me { font-size: 56px; } .pop.dmg.weak { color: #ff4a3a; }
  .pop.dmg.sk { color: #fff; } .pop.dmg.sk.me { font-size: 50px; } .pop.dmg.sk.fr { font-size: 19px; }
  .pop.dmg.ult { color: #ffd34d; text-shadow: 0 0 12px #ffb84a, 0 3px 0 #6a3a00; } .pop.dmg.ult.me { font-size: 64px; } .pop.dmg.ult.fr { font-size: 22px; }
  .pop.dmg.miss { color: #ccc; }
  .pop.dmg.sum { font-size: 30px; } .pop.dmg.sum.me { font-size: 58px; } .pop.dmg.sum.fr { font-size: 20px; }
  @keyframes dmgup { 0% { opacity: 1; transform: translate(-50%, 10px) scale(0.6); } 18% { transform: translate(-50%, -26px) scale(1.25); } 35% { transform: translate(-50%, -20px) scale(1); } 100% { opacity: 0; transform: translate(-50%, -60px) scale(1); } }
  .stage :global(.atb-bit) { position: absolute; z-index: 24; width: 7px; height: 7px; margin: -3px 0 0 -3px; pointer-events: none; animation: bit 0.42s ease-out forwards; box-shadow: 0 0 4px #0006; }
  @keyframes bit { from { transform: translate(0, 0) rotate(0); opacity: 1; } to { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; } }
  .crack { position: absolute; left: 0; top: 0; pointer-events: none; mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; }
  .crack svg { width: 100%; height: 100%; } .crack polyline { fill: none; stroke: #1a0a0a; stroke-width: 2.4; stroke-linejoin: round; filter: drop-shadow(0 0 1px #fff8); vector-effect: non-scaling-stroke; }
</style>
