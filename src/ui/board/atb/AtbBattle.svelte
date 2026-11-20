<script lang="ts">
  // ⚔ 게시판 던전 ATB 전투 화면 (시안 atb-1-wide · atb-2-quiz · atb-5-cutin · 📜 결정 11 · 정리.md 2)
  //   가로 무대 · 왼쪽 용사 한 줄(원근 앞 100% → 맨 뒤 70% · 내 용사 맨 아래 가장 크게 · 발은 모두 바닥 위) · 오른쪽 보스 · 단추 [공격][스킬 ▸ 부채꼴][문제 풀기]
  //   📜 11/20 요청 #4 (Y1 ~ Y12): 충전 = 원문항 통째 · 최대 3 · 스킬 = 부채꼴(쓸 수 있는 것만) · ATB = 내 초상 둘레 고리 · 친구 = 발밑 고리 · HP = 큰 숫자 + 가는 띠 · 카드 47% · 채점 → 충전 연출
  //   문제를 열면 = 보스가 앞으로 걸어 나오고 용사가 왼쪽으로 모임 → 빈 오른쪽에 양피지 문제 카드(보스를 가리지 않음)
  //   이 화면은 그리기 · 누르기만 · 규칙 = src/board/atb/engine.ts · 숫자 = tune.ts
  import { onDestroy, onMount, untrack } from 'svelte';
  import type { Given, LessonPack } from '../../../model/types';
  import { heroOf, skillName } from '../../../model/hero';
  import { dungeonOf } from '../../manifest';
  import HeroSprite from '../../camp/HeroSprite.svelte';
  import Sprite from '../../Sprite.svelte';
  import AtbIcon, { type IconName } from './AtbIcon.svelte';
  import { rectIn, ROT_ATTR } from '../../rot';
  import QuizCard from './QuizCard.svelte';
  import RaidHp from '../../battle/RaidHp.svelte';
  import TimingBar from './TimingBar.svelte';
  import { attack, earn, healBlocked, skillList, tick, useSkill, weak, type Ev, type SkillK, type State, type Timing } from '../../../board/atb/engine';
  import { portraitOf } from '../../manifest';
  // 📜 11/20 요청 #3 손맛: 레이드 공격 연출(용사별 · 속성별)을 그대로 · 몬스터 공격 잠금 = 레이드 값
  import { attack as fxAttack, fit, shake, ultBlast, type Pose } from '../../fx/attack';
  import { sfx } from '../../sound.svelte';
  import { attackMs, attackStrong } from '../../../raid/attacks';
  import type { HPose } from '../../manifest';
  import { botStep, type Bot } from '../../../board/atb/bots';
  import { answer, nextOrigin, originsOf, startRun, easiestOf, questionsOf, type Run } from '../../../board/atb/quiz';
  import { answerOf } from '../../../raid/raid';
  import { ATK, ROLE_SKILL, SIG, T, type Fam, type Role } from '../../../board/atb/tune';

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
    if (paused || S.end) return;
    for (let i = 0; i < speed; i++) { tick(S, STEP); for (const b of bots) botStep(L, S, b); }
    if (S.end && !ended) { ended = true; setTimeout(() => onend(S), 1800); }
  }, STEP * 1000);
  // 💥 몬스터 공격에 맞음 = 문제 카드 잠깐 잠금 (레이드 attackMs = 3초 · 보스 HP 절반 아래 = 분노 4초)
  let lockUntil = 0, lockLeft = $state(0), lockTag = $state('');
  onDestroy(() => { clearInterval(loop); if (typeof window !== 'undefined') removeEventListener('resize', onResize); });

  // ── 내 문제 ──
  const OS = untrack(() => originsOf(L));
  let open = $state(false), run = $state<Run | null>(null), flash = $state(''), hintUsed = $state(false), done: Record<string, number> = {};
  let fT: ReturnType<typeof setTimeout> | undefined;
  const meH = $derived(me >= 0 ? S.heroes[me] : null);
  function openQuiz() {
    if (!run) { const mine = S.shieldUp && S.cells.some((c) => c.owner === me && !c.broken); const o = nextOrigin(OS, done, mine && meH && !meH.ch ? easiestOf(OS)?.mid : null); if (o) run = startRun(o.mid, me * 2 + Object.values(done).reduce((a, x) => a + x, 0)); hintUsed = false; }
    open = true;
  }
  /** 📝 채점 → ⚡ 충전 연출 (Y8 · 약 2초 · 누르면 건너뜀): 소문항 ○ × 차례로 → 카드가 쑥 빨려 들어가 에너지 → 충전 칸 */
  let grading = $state<{ marks: boolean[]; perfect: boolean; n: number; suck: boolean } | null>(null), gT: ReturnType<typeof setTimeout>[] = [];
  function finishGrade() {
    if (!grading) return; const n = grading.n; gT.forEach(clearTimeout); gT = []; grading = null; run = null;
    for (let i = 0; i < n; i++) setTimeout(() => flyOrb(), i * 180);
    openQuiz();
  }
  function startGrade(marks: boolean[], perfect: boolean, n: number) {
    grading = { marks, perfect, n, suck: false };
    const t1 = 300 + marks.length * 260; // ○ × 하나씩 0.26초
    gT = [setTimeout(() => { if (grading) grading = { ...grading, suck: true }; sfx('scroll', 0.6); }, t1), setTimeout(finishGrade, t1 + 450)];
  }
  function submit(g: Given) {
    if (!run || grading) return;
    if (lockLeft > 0) return;
    const before = meH?.ch ?? 0, o = answer(L, run, seed, g); earn(S, me, o.earn);
    flash = o.earn.done ? '' : o.earn.right ? (o.earn.gold ? 'gold' : 'ok') : o.earn.swapped ? 'swap' : 'wrong';
    clearTimeout(fT); fT = setTimeout(() => (flash = ''), 1300);
    if (o.earn.right) sfx('correct', 0.5);
    if (o.earn.done) { done[run.mid] = (done[run.mid] || 0) + 1; run = o.run; startGrade(o.earn.marks ?? [], o.earn.perfect, Math.max(0, (meH?.ch ?? 0) - before)); } else run = o.run;
  }
  /** 🛡 실드가 뜨면 = 내 칸을 깰 표가 없고 지금 문제가 가장 쉬운 칸이 아니면 → 가장 쉬운 칸으로 (U3 막힘 안전망 · 충전은 그대로) */
  function shieldSwap() {
    const ez = easiestOf(OS); if (!meH || !ez || meH.ch > 0 || !run || grading || run.mid === ez.mid) return;
    run = startRun(ez.mid, me * 2 + 1); hintUsed = false; flash = 'shieldSwap'; clearTimeout(fT); fT = setTimeout(() => (flash = ''), 2200);
  }
  const titleOf = (mid: string) => OS.find((o) => o.mid === mid)?.title ?? mid;

  // ── 내 행동 ──
  let over = $state<'' | 'timing' | 'pick' | 'fan'>(''), tb = $state<{ stop: () => void }>(), pickK = $state<SkillK>('role');
  const ready = $derived(!!meH && !meH.down && meH.atb >= 1 && S.t >= meH.stunUntil && !S.end);
  /** 💠 부채꼴에 보일 스킬 (Y3 · 쓸 수 있을 때만 보임 · ok = 충전 · ATB 됨) */
  const skills = $derived(me >= 0 ? skillList(S, me) : []);
  const anySkill = $derived(skills.some((x) => x.ok));
  function doAttack() { if (ready && !over) over = 'timing'; }
  /** ⚔ 「공격」 단추 = 타이밍 바가 열리면 그 자리에서 「멈춤」 단추 (손가락 안 옮김 · 누르는 순간 멈춤) */
  function atkDown(e: PointerEvent) { if (over === 'timing') { e.preventDefault(); tb?.stop(); } }
  /** 💠 스킬 단추 = 부채꼴로 펼침 · 고르면 바로 발동 (Y3 · 진동 = 발동 때) · 엄호 · 격려 · 부활(쓰러진 친구 둘 이상) = 누구에게 */
  function toggleFan() { if (over === 'fan') over = ''; else if (!over && me >= 0) over = 'fan'; }
  function fire(k: SkillK, to?: number) {
    if (!meH) return; const R = meH.s.role;
    if (to == null && ((k === 'role' && (R === 'tank' || R === 'support')) || (k === 'revive' && S.heroes.filter((x) => x.down && x.id !== me).length > 1))) { pickK = k; over = 'pick'; return; }
    over = ''; if (useSkill(S, me, k, to)) { try { navigator.vibrate?.(k === 'awk' ? [60, 40, 160] : 60); } catch { /* 무시 */ } }
  }
  const pickTo = (to: number) => fire(pickK, to);
  const SK_NAME = (k: SkillK) => k === 'shield' ? '보호막 부수기' : k === 'equip' ? (fx[me] ? skillName(fx[me]!) : '장착 스킬') : k === 'tier4' ? '4레벨 스킬' : k === 'role' ? (meH ? ROLE_SKILL[meH.s.role] : '역할') : k === 'aura' ? '오라 방패' : k === 'awk' ? '각성' : '부활';
  const SK_ICON: Record<SkillK, string> = { shield: '🛡', equip: '⚔', tier4: '✴', role: '', aura: '🔰', awk: '✨', revive: '💖' };
  const onTiming = (t: Timing) => { over = ''; attack(S, me, t); };

  // ── 연출 (사건 → 떠오르는 숫자 · 공격 자세 · 컷인) ──
  type Pop = { id: number; x: number; y: number; t: string; cls: string };
  let pops = $state<Pop[]>([]), seen = 0, pk = 0, hpose = $state<Record<number, HPose | ''>>({}), hurtOn = $state<Record<number, boolean>>({}), bossPose = $state<'idle' | 'attack' | 'hit' | 'down'>('idle'), cut = $state<{ who: number; awk: boolean; name: string; short: boolean } | null>(null), crack = $state<number[]>([]);
  let stageEl = $state<HTMLElement>(), bossEl = $state<HTMLElement>(), boom = $state(false), gaugeFlash = $state(false), auraOn = $state(false);
  const heroEls: Record<number, HTMLElement> = {}, busy = new Set<number>();
  const setPose = (who: number, p: Pose | HPose) => { hpose = { ...hpose, [who]: p === 'idle' ? '' : (p as HPose) }; };
  /** ⚔ 용사가 몬스터 앞까지 달려가 치고 제자리로 (레이드 attack · 원거리 = 제자리 탄) · 맞는 순간 = 숫자 · 몬스터 아픔 */
  function playAtk(e: Extract<Ev, { k: 'atk' | 'skill' | 'role' }>) {
    const h = S.heroes[e.who]; if (!h) return;
    const d = (e as { dmg?: number }).dmg ?? 0, isSk = e.k === 'skill', ult = isSk && e.kind === 'awk', big = isSk && e.kind !== 'equip', miss = e.k === 'atk' && e.timing === 'miss', crit = e.k === 'atk' && e.timing === 'crit';
    const fk = fit(h.s.hero, fx[e.who] || 'flame'); let hit = false;
    const onHit = () => {
      if (hit) return; hit = true; const bx = open ? 32 : 72;
      pop(bx + (Math.random() - 0.5) * 6, 36, miss ? '빗나감' : `−${d}`, miss ? 'miss' : ult ? 'ult' : isSk ? 'sk' : crit ? 'crit' : 'hit');
      if (d) { bossPose = 'hit'; setTimeout(() => (bossPose = S.end?.win ? 'down' : 'idle'), 420); }
      if (ult && stageEl && bossEl) void ultBlast(stageEl, bossEl, fk);
    };
    const box = heroEls[e.who];
    if (!stageEl || !bossEl || !box || busy.has(e.who)) { onHit(); return; }
    busy.add(e.who);
    void fxAttack(stageEl, { heroBox: box, monBox: bossEl, hero: h.s.hero, fx: fk, miss, finish: isSk || crit || e.k === 'role', hits: big ? 3 : isSk ? 2 : 1, mult: ult ? 1.8 : big ? 1.5 : isSk ? 1.25 : crit ? 1.15 : 1, noDmg: true, vol: me < 0 || e.who === me ? 1 : 0.45, rest: 'idle', pose: (p) => setPose(e.who, p), onHit })
      .catch(() => {}).finally(() => { busy.delete(e.who); onHit(); setPose(e.who, 'idle'); });
  }
  /** 💥 광역이 터짐 = 용사 줄 가운데서 붉은 충격파 (레이드 필살기 충격파 .ult-ring 을 붉게) */
  function ring() {
    const st = stageEl; if (!st) return; const R = rectIn(st), x = R.width * (open ? 0.17 : 0.25), y = R.height * 0.6, d = R.width * 0.9;
    const el = document.createElement('i'); el.className = 'ult-ring'; el.style.cssText = `left:${x}px;top:${y}px;width:${d}px;height:${d}px;--c:#ff3a1a`; st.appendChild(el); setTimeout(() => el.remove(), 650);
  }
  /** 💢 용사가 맞음 = 맞음 자세 · 붉게 번쩍 (👹 「맞는 그림」 10종이 오면 .hitpic 자리에 겹침) */
  function hurt(id: number) { hurtOn = { ...hurtOn, [id]: true }; if (!busy.has(id)) setPose(id, 'hit'); setTimeout(() => { hurtOn = { ...hurtOn, [id]: false }; if (!busy.has(id) && !S.heroes[id]?.down) setPose(id, 'idle'); }, 450); }
  /** ✨ 채점이 끝나면 = 카드 자리에서 에너지 구슬이 내 충전 칸으로 날아가 차오름 (Y8) */
  function flyOrb(gold = true) {
    const st = stageEl, a = st?.querySelector('.card') ?? st?.querySelector('[data-k="atb-boss"]'), b = st?.querySelector('[data-k="atb-me-ch"]'); if (!st || !a || !b) return;
    const R = rectIn(st), A = rectIn(a), B = rectIn(b);
    const x0 = A.left + A.width / 2 - R.left, y0 = A.top + A.height / 2 - R.top, dx = B.left + B.width / 2 - R.left - x0, dy = B.top + B.height / 2 - R.top - y0;
    const el = document.createElement('i'); el.className = gold ? 'atb-orb g' : 'atb-orb'; el.style.left = `${x0}px`; el.style.top = `${y0}px`; st.appendChild(el);
    const fin = () => { el.remove(); sfx(gold ? 'star-bonus' : 'energy-card', 0.55); gaugeFlash = true; setTimeout(() => (gaugeFlash = false), 450); };
    if (!el.animate) { fin(); return; }
    const an = el.animate([{ transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0.6 }, { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.45 - 90}px)) scale(1.3)`, opacity: 1, offset: 0.45 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 1 }], { duration: 620, easing: 'ease-in' });
    an.onfinish = fin;
  }
  const pop = (x: number, y: number, t: string, cls: string) => { const id = ++pk; pops = [...pops.slice(-10), { id, x, y, t, cls }]; setTimeout(() => (pops = pops.filter((p) => p.id !== id)), 1100); };
  $effect(() => { const n = S.evN; untrack(() => { if (n < seen) seen = 0; for (const e of S.ev) if ((e.n ?? 0) > seen) handle(e); seen = n; }); });
  function handle(e: Ev) {
    const bx = open ? 32 : 72;
    if (e.k === 'atk' || e.k === 'skill' || (e.k === 'role' && e.dmg)) {
      // ⚡ 스킬 = 컷인(필살기 1.7초 · 내 스킬 0.9초) 뒤 큰 이펙트
      // 💠 스킬 = 컷인(각성 1.7초 · 4레벨 1.1초 · 내 장착 0.9초) 뒤 큰 이펙트
      const big = e.k === 'skill' && (e.kind !== 'equip' || e.who === me), ms = e.k === 'skill' ? (e.kind === 'awk' ? 1700 : e.kind === 'tier4' ? 1100 : 900) : 0;
      if (e.k === 'skill' && big) { const c = { who: e.who, awk: e.kind === 'awk', name: e.kind === 'awk' ? '각성' : fx[e.who] ? `${skillName(fx[e.who]!)}${e.kind === 'tier4' ? ' Ⅳ' : ''}` : '스킬', short: e.kind === 'equip' }; cut = c; setTimeout(() => { if (cut === c) cut = null; }, ms); sfx(e.kind === 'awk' ? 'true-ult' : 'special', 0.8); }
      if (big) setTimeout(() => playAtk(e as Extract<Ev, { k: 'skill' }>), ms - 200); else playAtk(e as Extract<Ev, { k: 'atk' | 'skill' | 'role' }>);
    } else if (e.k === 'shield') { crack = e.cells; setTimeout(() => (crack = []), 900); pop(bx, 22, e.last ? '실드 파괴! 약점 시간' : `실드 ${e.cells.length}칸`, 'shield'); }
    else if (e.k === 'boss') {
      // 👹 몬스터 공격 = 앞으로 덮침 → 맞음(용사 붉게 · 맞음 자세) · 광역 = 화면 크게 흔들림 + 붉은 번쩍 · 내가 맞음 = 문제 카드 흔들 + 잠금
      bossPose = 'attack'; setTimeout(() => (bossPose = 'idle'), 600);
      bossEl?.animate?.([{ translate: '0 0' }, { translate: `${-Math.round(Wd * 0.06)}px 6px`, offset: 0.4 }, { translate: '0 0' }], { duration: 520, easing: 'ease-out' });
      setTimeout(() => {
        e.to.forEach((id, i) => { pop(posOf(id).x, posOf(id).y - 22, `−${e.dmg[i]}`, e.aoe ? 'hurt big' : 'hurt'); hurt(id); });
        if (e.aoe) { shake(stageEl ?? null, 10, 520); boom = true; ring(); setTimeout(() => (boom = false), 620); sfx('smash', 0.9); try { navigator.vibrate?.([50, 30, 90]); } catch { /* 무시 */ } }
        else { shake(stageEl ?? null, 4, 220); sfx('hurt', 0.6); }
        if (me >= 0 && e.to.includes(me) && !S.heroes[me]?.down) { lockUntil = Date.now() + attackMs(undefined, undefined, attackStrong({ left: S.bossHp, max: S.bossMax })); lockLeft = Math.ceil((lockUntil - Date.now()) / 1000); lockTag = `💥 ${e.atk || (e.aoe ? '광역' : '공격')}!`; }
      }, 230);
    }
    else if (e.k === 'role') pop(e.to != null ? posOf(e.to).x : 20, 30, ROLE_SKILL[e.role], 'role');
    else if (e.k === 'revive') pop(posOf(e.to).x, posOf(e.to).y - 24, '부활!', 'role');
    else if (e.k === 'shieldUp') { pop(bx, 22, '실드!', 'shield'); shieldSwap(); }
    else if (e.k === 'aura') { pop(posOf(e.who).x, posOf(e.who).y - 24, '🔰 오라 방패!', 'role'); auraOn = true; sfx('holy-on', 0.8); pop(bx, 30, `🗿 석화 ${e.stone}초`, 'shield'); }
    else if (e.k === 'guard') { auraOn = false; S.heroes.forEach((h) => { if (!h.down) pop(posOf(h.id).x, posOf(h.id).y - 22, '막음!', 'role'); }); sfx('block', 0.9); bossPose = 'attack'; setTimeout(() => (bossPose = 'idle'), 500); }
    else if (e.k === 'charge' && e.who !== me) pop(posOf(e.who).x, posOf(e.who).y - 26, `⚡+${e.n}`, 'role');
    else if (e.k === 'sig') {
      if (e.what === 'breathHeal') pop(bx, 30, `+${e.v} 회복`, 'heal');
      else if (e.what === 'breathCut') pop(bx, 26, '숨 끊음!', 'shield');
      else if (e.what === 'reflect' && e.who != null) pop(posOf(e.who).x, posOf(e.who).y - 22, `−${e.v} 반사`, 'hurt');
      else if (e.what === 'unbind' && e.who != null) pop(posOf(e.who).x, posOf(e.who).y - 24, '풀림!', 'role');
      else if (e.what === 'mirrorOn') pop(bx, 26, '🪞 거울빛', 'shield');
    }
    else if (e.k === 'end' && e.win) bossPose = 'down';
  }

  // ── 자리 (원근 한 줄 · 내 용사 = 맨 앞 · 맨 아래 · 가장 크게) ──
  const order = $derived(me >= 0 ? [me, ...S.heroes.map((h) => h.id).filter((i) => i !== me)] : S.heroes.map((h) => h.id));
  const ROW = [{ x: 14, y: 66, s: 1 }, { x: 22.5, y: 59.5, s: 0.9 }, { x: 31, y: 54, s: 0.8 }, { x: 39.5, y: 49.5, s: 0.7 }];
  const ROWQ = [{ x: 7, y: 66, s: 0.82 }, { x: 13.5, y: 60, s: 0.74 }, { x: 20, y: 54.5, s: 0.66 }, { x: 26.5, y: 50, s: 0.58 }];
  const posOf = (id: number) => { const k = Math.max(0, order.indexOf(id)); return (open ? ROWQ : ROW)[k] ?? ROW[0]!; };
  const base = $derived(Math.max(1, (H * 0.27) / 64)); // 맨 앞 용사 키 = 화면 높이 27%
  const bossSize = $derived(Math.round(H * (open ? 0.36 : 0.42)));
  const stone = $derived(S.t < S.stoneUntil ? Math.ceil(S.stoneUntil - S.t) : 0);
  const C = 2 * Math.PI * 30; // 내 초상 고리 둘레 (r 30)
  const tele = $derived(S.target && !weak(S) ? Math.max(0, Math.ceil(T.bossEvery - S.bossT)) : 0);
  const bossLeft = $derived(weak(S) ? 1 : Math.max(0, 1 - S.bossT / T.bossEvery));
  // 👹 보스 ATB 게이지 (📜 요청 #7 ②): 체력바 바로 아래 · 차오름 · 예고(약 2초 전) = 붉게 깜빡 + 다음 공격 아이콘 · 이름 · 누구
  const ATK_IC: Record<string, string> = { basic: '💥', aoe: '⚠', smash: '💢', poison: '☠️', sleep: '💤', fire: '🔥', fire13: '🔥', fog: '🌊', tongue: '👅', ice: '🧊', confuse: '🌀', frost: '❄️', tail: '💥', dark: '🌑', darkHit: '🌑', mirror: '🪞', bind: '⛓', scale: '⚖️' };
  const upcoming = $derived(S.nextAtk ?? S.boss.cycle[S.bossN % S.boss.cycle.length] ?? 'basic');
  const stoneG = $derived(S.t < S.stoneUntil ? Math.ceil(S.stoneUntil - S.t) : 0);
  const bossGauge = $derived.by(() => {
    if (S.end) return null;
    if (weak(S)) return { p: 1, txt: `⏸ 약점 시간 ${Math.ceil(S.weakUntil - S.t)}초 · 공격 멈춤`, blue: true };
    if (stoneG) return { p: Math.min(1, S.bossT / T.bossEvery), txt: `🗿 석화 ${stoneG}초 · 공격 멈춤`, blue: true };
    const left = Math.max(0, Math.ceil(T.bossEvery - S.bossT)), ic = ATK_IC[upcoming] ?? '💥', nm = ATK[upcoming as keyof typeof ATK]?.name ?? '공격';
    if (S.target) { const who = S.aoeNext ? '모두' : S.target.map((i) => name(i)).join(' · '); return { p: S.bossT / T.bossEvery, txt: `${S.aoeNext ? '⚠ 광역! ' : ''}${ic} ${nm} → ${who} · ${left}초`, hot: true }; }
    return { p: S.bossT / T.bossEvery, txt: `다음 ${ic} ${nm} · ${left}초` };
  });
  /** ⊕ 노리는 줄 (📜 요청 #7 ③): 보스 → 표적 용사 붉은 점선 (광역 = 바닥만) */
  const aimLines = $derived(S.target && tele && !S.aoeNext ? S.target.map((id) => { const p = posOf(id); return { id, x: p.x, y: p.y - 14 * p.s }; }) : []);
  const bossX = $derived(open ? 36 : 73), bossY = $derived(74 - (bossSize / 2 / Math.max(1, H)) * 100);
  const meAimed = $derived(me >= 0 && !!tele && !!S.target?.includes(me));
  let aimedOnce = false;
  $effect(() => { const a = meAimed; untrack(() => { if (a && !aimedOnce) { try { navigator.vibrate?.(40); } catch { /* 무시 */ } } aimedOnce = a; }); });
  const atkName = $derived(S.nextAtk ? ATK[S.nextAtk].name : S.aoeNext ? '광역' : '공격');
  /** ⚠ 광역 예고 = 용사 줄 바닥이 붉게 깜빡 (📜 요청 #3 ⑤) */
  const aoeWarn = $derived(!!tele && S.aoeNext);
  const tiltTxt = $derived(S.boss.tele === 'scale' && S.target ? (S.aoeNext ? '⚖ 수평 → 모두' : `⚖ ${S.tilt === 'L' ? '왼쪽' : '오른쪽'}으로 기욺 → ${S.heroes[S.target[0]!]?.s.name ?? ''}`) : '');
  const breathLeft = $derived(S.breathWarn != null ? Math.max(0, Math.ceil(S.breathWarn + SIG.breath.warn - S.t)) : 0);
  const mirrorLeft = $derived(S.t < S.mirrorUntil ? Math.ceil(S.mirrorUntil - S.t) : 0);
  const armor = $derived(S.boss.sig === 'iceArmor' && S.cells.some((c) => !c.broken));
  const weakLeft = $derived(weak(S) ? Math.ceil(S.weakUntil - S.t) : 0);
  const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, (a / Math.max(1, b)) * 100))}%`;
  const name = (id: number) => `${S.heroes[id]!.s.name}${id === me ? '(나)' : ''}`;
  // 🧪 화면 시험 고리 (봇 없이 내 차례 만들기)
  (globalThis as unknown as { __atb?: object }).__atb = { S: untrack(() => S), full: () => { if (meH) meH.atb = 1; }, charge: (n: number) => { if (meH) meH.ch = Math.min(T.charge.max, meH.ch + n); }, skip: () => finishGrade(), pause: (v: boolean) => (paused = v), solve: () => { if (!run) openQuiz(); const q = run ? questionsOf(L, run, seed)[run.k] : null; if (q) submit(answerOf(q)); }, miss: () => { if (!run) openQuiz(); submit(-999 as never); }, lock: () => { lockUntil = Date.now() + attackMs(); lockLeft = 3; lockTag = '💥 시험!'; } };
</script>

<div class="stage" class:q={open} class:weak={weakLeft > 0} style:background-image="url({dungeonOf(bg || L.theme)})" data-k="atb-stage" bind:this={stageEl}>
  <!-- 🧑 내 초상 = 둘레 동그란 ATB 고리(Y5) · HP 큰 숫자 + 가는 띠(Y6) · ⚡ 충전 칸 3(Y1) -->
  {#if meH}
    {@const pt = portraitOf(meH.s.hero)}
    <div class="me" class:full={ready} class:down={meH.down} class:aimed={meAimed} data-k="atb-me">
      {#if meAimed}<b class="aimme" role="alert" data-k="atb-aim-me">⚠ 나를 노려요!</b>{/if}
      <div class="face">
        <svg viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="30" class="rb" /><circle cx="34" cy="34" r="30" class="rf" style:stroke-dasharray="{C * Math.min(1, meH.atb)} {C}" /></svg>
        {#if pt}<i class="pt" style="background-image:url({pt.url});background-size:{pt.cols * 100}% {pt.rows * 100}%;background-position:{(pt.c[0] / Math.max(1, pt.cols - 1)) * 100}% {(pt.c[1] / Math.max(1, pt.rows - 1)) * 100}%"></i>{:else}<i class="pt"><HeroSprite id={meH.s.hero} scale={1} /></i>{/if}
      </div>
      <div class="mi">
        <b class="mn">{meH.s.name}</b>
        <span class="hpn" aria-label="HP {meH.hp} / {meH.s.maxHp}"><b>{meH.hp}</b><small>/ {meH.s.maxHp}</small></span>
        <i class="thin hp"><b style:width={pct(meH.hp, meH.s.maxHp)}></b></i>
        <span class="chs" class:flash={gaugeFlash} data-k="atb-me-ch" aria-label="충전 {meH.ch} / {T.charge.max}">{#each Array(T.charge.max) as _, i (i)}<i class="cs" class:on={i < meH.ch}></i>{/each}</span>
      </div>
    </div>
  {/if}
  <!-- ⚠ 광역 예고 = 용사 줄 바닥 붉게 깜빡 · 터질 때 붉은 번쩍 -->
  <i class="floor" class:on={aoeWarn} class:q={open} data-k="atb-aoe-floor" aria-hidden="true"></i>
  {#if aimLines.length}<svg class="aim" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{#each aimLines as a (a.id)}<line x1={bossX} y1={bossY} x2={a.x} y2={a.y} vector-effect="non-scaling-stroke" />{/each}</svg>{/if}
  {#if boom}<i class="boom" aria-hidden="true"></i>{/if}
  <!-- 팀 부활 -->
  <div class="revs" aria-label="팀 부활 {S.revives} / {T.revives}"><b>팀 부활</b>{#each Array(T.revives) as _, i (i)}<span class:used={i >= S.revives}><AtbIcon name="revive" size={22} /></span>{/each}</div>
  {#if weakLeft}<div class="weakb" role="status"><AtbIcon name="weak" size={26} /> 약점 시간 {weakLeft}초 · 피해 2배</div>{/if}

  <!-- 보스 -->
  <div class="bossui" style:left={open ? '21%' : '54%'} style:width={open ? '29%' : '40%'}>
    {#if stone}<div class="tele sig" role="status" data-k="atb-stone">🗿 석화 {stone}초 · 보스 공격 멈춤</div>{/if}
    {#if tele && tiltTxt}<div class="tele" role="status" data-k="atb-tele">{tiltTxt}</div>{/if}
    {#if breathLeft}<div class="tele sig" role="status" data-k="atb-breath">🫁 숨 고르기 {breathLeft}초 · 실드를 깨면 끊겨요</div>{/if}
    {#if mirrorLeft}<div class="tele sig" role="status" data-k="atb-mirror">🪞 거울빛 {mirrorLeft}초 · 일반 공격 30% 되돌아옴</div>{/if}
    <div class="rhp" data-k="atb-tele-g"><RaidHp name={S.boss.name} left={S.bossHp} max={S.bossMax} gauge={bossGauge} align="center" /></div>
    {#if S.cells.length}
      <div class="cells" data-k="atb-cells" aria-label="실드 {S.cells.filter((c) => !c.broken).length}칸 남음">
        {#each S.cells as c, i (i)}<span class="cell" class:broken={c.broken} class:crack={crack.includes(i)} title="{S.heroes[c.owner]?.s.name} · {c.fam}"><AtbIcon name={c.broken ? 'shield-broken' : 'shield'} size={34} /><i class="fi"><AtbIcon name={FAM_ICON[c.fam]} size={18} /></i>{#if S.boss.sig === 'lock'}<i class="lk" aria-hidden="true">{c.broken ? '🔓' : '🔒'}</i>{/if}</span>{/each}
      </div>
    {/if}
  </div>
  <div class="boss" class:stone={stone > 0} style:left={open ? '36%' : '73%'} style:width="{bossSize}px" style:height="{bossSize}px" data-k="atb-boss" data-flip={S.boss.flip?.[bossPose] ? 1 : 0} bind:this={bossEl}><i class="bflip" class:flip={!!S.boss.flip?.[bossPose]} class:armor class:shine={mirrorLeft > 0} class:breath={breathLeft > 0}><Sprite ref={S.boss.sprite} pose={bossPose} size={bossSize} /></i></div>

  <!-- 용사 -->
  {#each S.heroes as h (h.id)}
    {@const p = posOf(h.id)}
    {@const sc = +(base * p.s).toFixed(2)}
    <div class="hero" class:down={h.down} class:mine={h.id === me} class:hurt={hurtOn[h.id]} class:aura={auraOn && !h.down} style:left="{p.x}%" style:top="{p.y}%" style:z-index={10 + (4 - order.indexOf(h.id))} data-k="atb-hero" data-id={h.id}>
      {#if h.id !== me && !h.down}<svg class="foot" viewBox="0 0 60 20" aria-hidden="true"><ellipse cx="30" cy="10" rx="26" ry="7" class="rb" /><ellipse cx="30" cy="10" rx="26" ry="7" class="rf" class:full={h.atb >= 1} pathLength="100" style:stroke-dasharray="{Math.round(Math.min(1, h.atb) * 100)} 100" /></svg>{/if}
      {#if S.target?.includes(h.id) && tele}{#if S.boss.tele === 'gaze' && !S.aoeNext}<i class="gaze" aria-label="보스가 바라봄">👁</i>{:else}<i class="tgt" aria-label="표적"></i>{/if}{#if !S.aoeNext}<i class="aimx" style:top="{-Math.round(base * p.s * 64 * 0.95)}px" data-k="atb-aim" aria-label="노림">⊕</i>{/if}{/if}
      <div class="spr" style:transform="translate(-50%, -100%)" bind:this={heroEls[h.id]}><HeroSprite id={h.s.hero} scale={sc} row={h.down ? 8 : 0} play={!h.down} pose={!h.down && hpose[h.id] ? hpose[h.id] || undefined : undefined} /><i class="hitpic" data-k="atb-hitpic" aria-hidden="true"></i></div>
      {#if h.cover}<i class="cov"><AtbIcon name="role-tank" size={20} label="엄호" /></i>{/if}
      <div class="tag">
        <b>{name(h.id)}</b>
        <span class="hn"><b>{h.hp}</b>{#if h.ch}<i class="hz">{'⚡'.repeat(h.ch)}</i>{/if}</span>
        <i class="thin hp"><b style:width={pct(h.hp, h.s.maxHp)}></b></i>
      </div>
    </div>
  {/each}

  {#each pops as p (p.id)}<span class="pop {p.cls}" style:left="{p.x}%" style:top="{p.y}%">{p.t}</span>{/each}

  <!-- 문제 카드 -->
  {#if open && run}
    <div class="card" class:suck={grading?.suck}><QuizCard {L} {run} {seed} title={titleOf(run.mid)} ch={meH?.ch ?? 0} {bossLeft} hintOk={!hintUsed} {flash} locked={lockLeft} {lockTag} {grading} onskip={finishGrade} onsubmit={submit} onclose={() => (open = false)} /></div>
  {/if}

  <!-- 단추 -->
  {#if me >= 0 && meH}
    <nav class="btns" aria-label="행동" style:--n={open ? 2 : 3}>
      <button type="button" class="b atk" class:hot={ready || over === 'timing'} class:stopb={over === 'timing'} disabled={!ready && over !== 'timing'} data-k="atb-attack" data-stop={over === 'timing' ? 1 : 0} onpointerdown={atkDown} onclick={doAttack}>{#if over === 'timing'}⏹ 멈춤!{:else}<AtbIcon name="fam-arms" size={28} /> 공격{/if}</button>
      <div class="skw">
        <button type="button" class="b sk" class:hot={anySkill} class:on={over === 'fan'} class:flash={gaugeFlash} disabled={!!over && over !== 'fan'} data-k="atb-skill" aria-expanded={over === 'fan'} onclick={toggleFan}>
          <span>💠 스킬</span>
          <span class="slots">{#each Array(T.charge.max) as _, i (i)}<i class="cs" class:on={i < meH.ch}></i>{/each}</span>
        </button>
        {#if over === 'fan'}
          <div class="fan" role="menu" aria-label="스킬 고르기" data-k="atb-fan">
            {#each skills as sk, i (sk.k)}
              {@const a = skills.length > 1 ? -62 + (124 * i) / (skills.length - 1) : 0}
              <button type="button" role="menuitem" class="fi2 {sk.k}" disabled={!sk.ok} data-k="atb-sk-{sk.k}" style:transform="translate(calc(-50% + {Math.round(Math.sin((a * Math.PI) / 180) * 128)}px), {-Math.round(Math.cos((a * Math.PI) / 180) * 104)}px)" onclick={() => fire(sk.k)}>
                <span class="ic">{#if sk.k === 'role'}<AtbIcon name={ROLE_ICON[meH.s.role]} size={26} />{:else}{SK_ICON[sk.k]}{/if}</span>
                <span class="nm">{SK_NAME(sk.k)}</span>
                <span class="co">{#each Array(sk.cost) as _, j (j)}<i class="cs on"></i>{/each}</span>
                {#if sk.k === 'role' && meH.s.role === 'healer' && healBlocked(S)}<small data-k="atb-heal-wait">보스 공격 뒤</small>{/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      {#if !open}<button type="button" class="b quiz" data-k="atb-quiz-open" disabled={!!S.end} onclick={openQuiz}>📜 문제 풀기</button>{/if}
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
      <div class="band"><HeroSprite id={S.heroes[cut.who]!.s.hero} scale={Math.max(2, Math.round(H / 90))} row={2} play /></div>
      <p class="cn"><small>{cut.short ? '스킬' : cut.awk ? '✨ 각성 ⚡⚡⚡' : '4레벨 스킬 ⚡⚡'}</small>{cut.name}</p>
    </div>
  {/if}
  {#if S.end}<div class="endb" class:win={S.end.win} role="status">{S.end.win ? '⚔ 처치!' : `💀 ${S.end.why}`}</div>{/if}
</div>

<style>
  .stage { position: fixed; inset: 0 var(--safe-r, 0px) 0 var(--safe-l, 0px); overflow: hidden; background: #1a1424 center / cover no-repeat; color: #fff; font-family: var(--font); user-select: none; -webkit-user-select: none; touch-action: manipulation; }
  .stage::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(#0000 55%, #0006); }
  .stage.weak::after { background: radial-gradient(ellipse at 70% 50%, #ffcf4a33, #0000 60%), linear-gradient(#0000 55%, #0006); }
  .revs { position: absolute; top: 2%; right: 1.5%; z-index: 20; display: flex; align-items: center; gap: 2px; padding: 4px 10px; border-radius: 10px; border: 2px solid #c9953e; background: #1d1220e6; font: 800 14px var(--font); }
  .revs b { margin-right: 4px; } .revs .used { filter: grayscale(1) brightness(0.5); }
  .weakb { position: absolute; top: 2%; left: 50%; transform: translateX(-50%); z-index: 22; display: flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 12px; background: linear-gradient(#ffdf7a, #f0a92a); color: #3a1d00; font: 800 16px var(--font); box-shadow: 0 0 16px #ffcf4a; animation: pulse 0.8s ease-in-out infinite; }
  @keyframes pulse { 50% { transform: translateX(-50%) scale(1.06); } }
  .bossui { position: absolute; top: 11%; z-index: 12; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: left 0.45s ease; }
  .tele { padding: 3px 12px; border-radius: 10px; border: 2px solid #ffcf6a; background: linear-gradient(#c81e1e, #8e1010); font: 800 14px var(--font); box-shadow: 0 0 10px #ff3a2a88; animation: blink 0.5s steps(2) infinite; }
  @keyframes blink { 50% { filter: brightness(1.3); } }
  /* ❤ HP = 큰 숫자 + 가는 색 띠 (Y6) */
  .thin { display: block; width: 100%; height: 5px; border-radius: 3px; background: #0009; overflow: hidden; box-shadow: 0 0 0 1px #0006; }
  .thin b { display: block; height: 100%; transition: width 0.25s; } .thin.hp b { background: linear-gradient(90deg, #7de06a, #2faa3a); }
  /* 🧑 내 초상 HUD (Y5) */
  .me { position: absolute; z-index: 21; top: 2%; left: 1.2%; display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 40px; background: #1d1220d9; border: 2px solid #8a6a3a; }
  .me .face { position: relative; width: 60px; height: 60px; flex: none; }
  .me svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
  .me .rb { fill: none; stroke: #0008; stroke-width: 6; } .me .rf { fill: none; stroke: #ffd34d; stroke-width: 6; stroke-linecap: round; transition: stroke-dasharray 0.1s linear; }
  .me.full .rf { stroke: #fff3a0; filter: drop-shadow(0 0 4px #ffd34d); } .me.full { border-color: #ffd34d; box-shadow: 0 0 14px #ffd34d; animation: glow2 0.9s ease-in-out infinite; }
  @keyframes glow2 { 50% { box-shadow: 0 0 22px #ffe27a; } }
  .me .pt { position: absolute; inset: 7px; border-radius: 50%; overflow: hidden; background-color: #3a4a7a; image-rendering: pixelated; display: grid; place-items: center; }
  .me.down .pt { filter: grayscale(1) brightness(0.5); }
  .mi { display: flex; flex-direction: column; gap: 1px; min-width: 86px; }
  .mn { font: 800 11px var(--font-plain); color: #ffe6c0; }
  .hpn b { font: 900 22px var(--font); color: #9dff8a; text-shadow: 0 2px 0 #000; } .hpn small { font: 700 10px var(--font-plain); color: #ccc; margin-left: 2px; }
  .chs, .slots, .co { display: flex; gap: 3px; }
  .cs { display: inline-block; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #8fd0ff88; background: #0a1a3a; }
  .cs.on { border-color: #fff; background: radial-gradient(circle, #fff 0 25%, #8fe0ff 50%, #3a8ef0); box-shadow: 0 0 6px #8fd0ff; }
  .chs.flash { animation: gflash 0.45s; }
  .foot { position: absolute; left: -30px; top: -10px; width: 60px; height: 20px; z-index: -1; }
  .foot .rb { fill: #0005; stroke: #0008; stroke-width: 3; } .foot .rf { fill: none; stroke: #ffd34d; stroke-width: 3; } .foot .rf.full { stroke: #fff3a0; filter: drop-shadow(0 0 3px #ffd34d); }
  .hn { display: flex; align-items: baseline; justify-content: center; gap: 2px; } .hn b { font: 900 15px var(--font); color: #c8ffb8; text-shadow: 0 1px 0 #000; }
  .boss.stone :global(*) { filter: grayscale(1) brightness(0.85) contrast(1.2); }
  .hero.aura .spr { filter: drop-shadow(0 0 6px #fff6a0) drop-shadow(0 0 12px #ffd34d); }
  /* 💠 스킬 부채꼴 (Y3) */
  .skw { position: relative; display: grid; }
  .b.sk.on { border-color: #fff; box-shadow: 0 0 16px #8fd0ff; }
  .fan { position: absolute; left: 50%; bottom: 100%; width: 1px; height: 1px; z-index: 31; }
  .fi2 { position: absolute; left: 0; bottom: 0; width: 96px; min-height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 4px; border-radius: 14px; border: 3px solid #8fd0ff; background: linear-gradient(#2a4a8a, #16285a); color: #fff; font: 800 12px var(--font-plain); box-shadow: 0 4px 0 #0a1430, 0 0 12px #000a; animation: fanin 0.18s ease-out; }
  @keyframes fanin { from { opacity: 0; scale: 0.6; } }
  .fi2:disabled { filter: grayscale(0.8) brightness(0.6); }
  .fi2.shield { border-color: #9fe6ff; } .fi2.tier4 { border-color: #ffb84a; } .fi2.aura { border-color: #fff3a0; } .fi2.awk { border-color: #ffd34d; background: linear-gradient(#8a5a1a, #4a2a0a); } .fi2.role { border-color: #5fe0c0; background: linear-gradient(#1f7a6a, #0f4a40); } .fi2.revive { border-color: #ff8fb0; background: linear-gradient(#8a2a4a, #4a1020); }
  .fi2 .ic { font-size: 22px; line-height: 1; } .fi2 .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } .fi2 small { font: 700 10px var(--font-plain); color: #ffd98a; }
  .cells { display: flex; gap: 6px; }
  .cell { position: relative; display: inline-flex; } .cell .fi { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: inline-flex; }
  .cell.broken .fi { opacity: 0.35; } .cell.crack { animation: crack 0.45s 2; } @keyframes crack { 30% { transform: scale(1.25) rotate(-6deg); filter: brightness(2); } }
  .bflip { display: block; } .bflip.flip { transform: scaleX(-1); } /* 몬스터는 늘 왼쪽(용사 쪽)을 봄 · 시트마다 · 자세마다 다름 = tune.ts BOSSES.flip */
  .boss { position: absolute; top: 74%; transform: translate(-50%, -100%); z-index: 11; transition: left 0.45s ease; }
  .hero { position: absolute; transition: left 0.45s ease, top 0.45s ease; }
  .hero .spr { position: absolute; left: 0; top: 0; }
  .hero.down .spr { filter: grayscale(1) brightness(0.6); }
  .tele.sig { background: linear-gradient(#3a5ac8, #1d2f8e); border-color: #9fd0ff; box-shadow: 0 0 10px #5aa9ff88; }
  .cell .lk { position: absolute; right: -6px; bottom: -6px; font-size: 14px; font-style: normal; }
  .bflip.armor { filter: drop-shadow(0 0 4px #9fe6ff) drop-shadow(0 0 10px #5ac8ff) saturate(0.7) brightness(1.15); } /* 4 얼음 갑옷 */
  .bflip.shine { filter: drop-shadow(0 0 8px #fff) drop-shadow(0 0 16px #c9a8ff); animation: blink 0.6s steps(2) infinite; } /* 8 거울빛 */
  .bflip.breath { filter: drop-shadow(0 0 10px #7dffb0); } /* 6 숨 고르기 */
  .gaze { position: absolute; left: -10px; top: -96px; font-size: 22px; font-style: normal; animation: blink 0.4s steps(2) infinite; }
  .pop.heal { color: #7dffb0; font-size: 20px; }
  .tgt { position: absolute; left: -26px; top: -10px; width: 52px; height: 18px; border-radius: 50%; border: 3px solid #ff3a2a; box-shadow: 0 0 10px #ff3a2a; animation: blink 0.4s steps(2) infinite; }
  .cov { position: absolute; left: 14px; top: -54px; }
  .tag { position: absolute; left: -34px; top: 2px; width: 68px; display: flex; flex-direction: column; gap: 2px; padding: 2px 4px 3px; border-radius: 6px; border: 2px solid #8a6a3a; background: #1d1220d9; }
  .tag > b { font: 700 10px var(--font-plain); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hero.mine .tag { border-color: #e2b04a; }
  .hz { font-size: 9px; font-style: normal; line-height: 1; }
  .pop { position: absolute; z-index: 25; transform: translate(-50%, 0); font: 900 22px var(--font); color: #fff; text-shadow: 0 2px 0 #000, 0 0 6px #000; pointer-events: none; animation: up 1.1s ease-out forwards; white-space: nowrap; }
  .pop.crit { color: #ffe066; font-size: 34px; } .pop.sk { color: #8fd0ff; font-size: 34px; } .pop.ult { color: #ffd34d; font-size: 46px; } .pop.hurt { color: #ff6a6a; font-size: 20px; } .pop.hurt.big { font-size: 26px; } .pop.miss { color: #ccc; font-size: 20px; }
  .pop.crit, .pop.sk, .pop.ult { animation: upbig 1.1s ease-out forwards; } @keyframes upbig { 0% { opacity: 1; transform: translate(-50%, 0) scale(1.8); } 15% { transform: translate(-50%, -6px) scale(1); } 100% { opacity: 0; transform: translate(-50%, -56px) scale(1); } } .pop.shield { color: #9fe6ff; font-size: 22px; } .pop.role { color: #9dff9a; font-size: 16px; }
  @keyframes up { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -48px); } }
  .card { position: absolute; z-index: 26; right: 1.5%; top: 2.5%; bottom: 2.5%; width: 47%; animation: slide 0.35s ease-out; transform-origin: 10% 10%; } /* Y7 약 47% */
  .card.suck { transition: transform 0.42s ease-in, opacity 0.42s ease-in; transform: translate(-80%, -20%) scale(0.05) rotate(-20deg); opacity: 0; }
  @keyframes slide { from { transform: translateX(30px); opacity: 0; } }
  .btns { position: absolute; z-index: 24; left: 1.5%; right: 1.5%; bottom: 2.5%; height: 19%; display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr)); gap: 1.2%; }
  .stage.q .btns { right: auto; width: 44%; height: 17%; }
  .b { min-height: 48px; border-radius: 12px; border: 3px solid #8a6a3a; background: linear-gradient(#5a3f2a, #3a2618); color: #fff2d6; font: 800 clamp(13px, 4.6vh, 22px) var(--font); display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: inset 0 0 0 2px #2a1a10, 0 4px 0 #1a100a; padding: 0 4px; text-shadow: 0 2px 0 #0008; }
  .b:disabled { filter: grayscale(0.4) brightness(0.75); }
  .b.atk.hot { border-color: #ffd34d; background: linear-gradient(#f6c25a, #c8862a); color: #2a1600; box-shadow: 0 0 14px #ffd34d, inset 0 0 0 2px #fff3c0, 0 4px 0 #6a4210; text-shadow: none; animation: glow 1s ease-in-out infinite; }
  @keyframes glow { 50% { box-shadow: 0 0 22px #ffe27a, inset 0 0 0 2px #fff3c0, 0 4px 0 #6a4210; } }
  .b.sk { flex-direction: column; gap: 2px; }
  .b.sk.hot { border-color: #ffd34d; }
  .b.sk.flash { animation: gflash 0.45s; } @keyframes gflash { 30% { filter: brightness(2.2); box-shadow: 0 0 22px #ffe27a; } }
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
  .aim { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 16; pointer-events: none; opacity: 0.85; }
  .aim line { stroke: #ff3a2a; stroke-width: 3; stroke-dasharray: 8 6; filter: drop-shadow(0 0 3px #ff3a2a); animation: dash 0.6s linear infinite; }
  @keyframes dash { to { stroke-dashoffset: -14; } }
  .aimx { position: absolute; left: 0; transform: translate(-50%, -100%); font-style: normal; font-size: 28px; font-weight: 900; color: #ff3a2a; text-shadow: 0 0 6px #ff3a2a, 0 2px 0 #000; animation: blink 0.4s steps(2) infinite; z-index: 3; }
  .me.aimed { border-color: #ff3a2a; box-shadow: 0 0 16px #ff3a2a; animation: none; }
  .aimme { position: absolute; left: 50%; top: 100%; transform: translate(-50%, 4px); white-space: nowrap; padding: 2px 10px; border-radius: 10px; background: linear-gradient(#e8332a, #8e1010); border: 2px solid #ffcf6a; font: 900 13px var(--font); animation: blink 0.4s steps(2) infinite; }
  .rhp { width: 100%; } /* 👹 「맞는 그림」 10종 겹칠 자리 (아직 빈 칸 · hero-v2 monster-hit-map.json) */
  .stage :global(.atb-orb) { position: absolute; z-index: 38; width: 22px; height: 22px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, #fff 0 25%, #8fe0ff 45%, #3a8ef0aa 70%, #0000 72%); box-shadow: 0 0 16px 6px #8fd0ffaa; }
  .stage :global(.atb-orb.g) { width: 28px; height: 28px; background: radial-gradient(circle, #fff 0 25%, #ffe27a 45%, #f0a92aaa 70%, #0000 72%); box-shadow: 0 0 20px 8px #ffd34daa; }
  .cut.short { background: #0007; animation-duration: 0.9s; } .cut.short .band { top: 20%; height: 28%; }
  .b.quiz { border-color: #8fd0ff; background: linear-gradient(#3a8ef0, #1d5ac8); box-shadow: 0 0 12px #5aa9ff88, inset 0 0 0 2px #bfe2ff, 0 4px 0 #0d2f6a; }
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
  @media (prefers-reduced-motion: reduce) { .weakb, .tele, .b.atk.hot, .tgt, .cell.crack { animation: none; } }
</style>
