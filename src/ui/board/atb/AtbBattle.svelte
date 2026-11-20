<script lang="ts">
  // ⚔ 게시판 던전 ATB 전투 화면 (시안 atb-1-wide · atb-2-quiz · atb-5-cutin · 📜 결정 11 · 정리.md 2)
  //   가로 무대 · 왼쪽 용사 한 줄(원근 앞 100% → 맨 뒤 70% · 내 용사 맨 아래 가장 크게 · 발은 모두 바닥 위) · 오른쪽 보스 · 단추 [공격][스킬][역할][문제 풀기]
  //   문제를 열면 = 보스가 앞으로 걸어 나오고 용사가 왼쪽으로 모임 → 빈 오른쪽에 양피지 문제 카드(보스를 가리지 않음)
  //   이 화면은 그리기 · 누르기만 · 규칙 = src/board/atb/engine.ts · 숫자 = tune.ts
  import { onDestroy, untrack } from 'svelte';
  import type { Given, LessonPack } from '../../../model/types';
  import { heroOf, skillName } from '../../../model/hero';
  import { dungeonOf } from '../../manifest';
  import HeroSprite from '../../camp/HeroSprite.svelte';
  import Sprite from '../../Sprite.svelte';
  import AtbIcon, { type IconName } from './AtbIcon.svelte';
  import QuizCard from './QuizCard.svelte';
  import TimingBar from './TimingBar.svelte';
  import { attack, canBreak, canRole, earn, healBlocked, revive, roleAct, skill, tick, weak, type Ev, type State, type Timing } from '../../../board/atb/engine';
  // 📜 11/20 요청 #3 손맛: 레이드 공격 연출(용사별 · 속성별)을 그대로 · 몬스터 공격 잠금 = 레이드 값
  import { attack as fxAttack, fit, shake, ultBlast, type Pose } from '../../fx/attack';
  import { sfx } from '../../sound.svelte';
  import { attackMs, attackStrong } from '../../../raid/attacks';
  import type { HPose } from '../../manifest';
  import { botStep, type Bot } from '../../../board/atb/bots';
  import { answer, nextOrigin, originsOf, startRun, easiestOf, questionsOf, type Run } from '../../../board/atb/quiz';
  import { answerOf } from '../../../raid/raid';
  import { ATK, ROLE_SKILL, SIG, T, type Fam, type Role } from '../../../board/atb/tune';

  const { L, S, me, bots, seed = 'me', speed = 1, onend, fx = {} }: {
    L: LessonPack; S: State; /** 내 용사 번호 · -1 = 관전 */ me: number; bots: Bot[]; seed?: string; speed?: number; onend: (S: State) => void;
    /** 용사마다 장착 스킬 id (컷인 이름) */ fx?: Record<number, string>;
  } = $props();
  const FAM_ICON: Record<Fam, IconName> = { arms: 'fam-arms', flame: 'fam-flame', nature: 'fam-nature', wisdom: 'fam-wisdom', mystic: 'fam-mystic' };
  const ROLE_ICON: Record<Role, IconName> = { dealer: 'role-dealer', tank: 'role-tank', healer: 'role-healer', support: 'role-support' };

  // ── 시계 (이 폰 = 진행) ──
  let H = $state(typeof innerHeight === 'number' ? innerHeight : 390), Wd = $state(typeof innerWidth === 'number' ? innerWidth : 844);
  const onResize = () => { H = innerHeight; Wd = innerWidth; };
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
    if (!run) { const mine = S.shieldUp && S.cells.some((c) => c.owner === me && !c.broken); const o = nextOrigin(OS, done, mine && meH && !meH.tickets ? easiestOf(OS)?.mid : null); if (o) run = startRun(o.mid, me * 2 + Object.values(done).reduce((a, x) => a + x, 0)); hintUsed = false; }
    open = true;
  }
  function submit(g: Given) {
    if (!run) return;
    if (lockLeft > 0) return;
    const o = answer(L, run, seed, g); earn(S, me, o.earn);
    if (o.earn.right) for (let i = 0; i < Math.max(1, o.earn.zap); i++) setTimeout(() => flyOrb(o.earn.gold), i * 160);
    flash = o.earn.done ? 'done' : o.earn.right ? (o.earn.gold ? 'gold' : 'ok') : o.earn.swapped ? 'swap' : 'wrong';
    clearTimeout(fT); fT = setTimeout(() => (flash = ''), 1300);
    if (o.earn.done) { done[run.mid] = (done[run.mid] || 0) + 1; const r = run; setTimeout(() => { if (run === r) { run = null; openQuiz(); } }, 900); } else run = o.run;
  }
  /** 🛡 실드가 뜨면 = 내 칸을 깰 표가 없고 지금 문제가 가장 쉬운 칸이 아니면 → 가장 쉬운 칸으로 (U3 막힘 안전망 · ⚡ 는 그대로) */
  function shieldSwap() {
    const ez = easiestOf(OS); if (!meH || !ez || meH.tickets > 0 || !run || run.mid === ez.mid) return;
    run = startRun(ez.mid, me * 2 + 1); hintUsed = false; flash = 'shieldSwap'; clearTimeout(fT); fT = setTimeout(() => (flash = ''), 2200);
  }
  const titleOf = (mid: string) => OS.find((o) => o.mid === mid)?.title ?? mid;

  // ── 내 행동 ──
  let over = $state<'' | 'timing' | 'pick'>(''), tb = $state<{ stop: () => void }>();
  const ready = $derived(!!meH && !meH.down && meH.atb >= 1 && S.t >= meH.stunUntil && !S.end);
  const breakNow = $derived(!!meH && ready && !!canBreak(S, me));
  const skillOk = $derived(!!meH && ready && (meH.zaps.length > 0 || breakNow));
  const roleOk = $derived(!!meH && canRole(S, me));
  function doAttack() { if (ready && !over) over = 'timing'; }
  /** ⚔ 「공격」 단추 = 타이밍 바가 열리면 그 자리에서 「멈춤」 단추 (손가락 안 옮김 · 누르는 순간 멈춤) */
  function atkDown(e: PointerEvent) { if (over === 'timing') { e.preventDefault(); tb?.stop(); } }
  /** ⚡ 스킬 = 누르면 바로 발동 (📜 요청 #3 ⑦ 모았다 놓기 고리 없앰 · 진동 = 발동 때) */
  function doSkill() { if (!skillOk || !meH) return; const ult = meH.zaps.length >= T.zapMax; if (skill(S, me, T.skillTap)) { try { navigator.vibrate?.(ult ? [60, 40, 160] : 60); } catch { /* 무시 */ } } }
  /** 스킬 단추 목록 (지금 1개 · 설계 방이 개수 · 종류를 정하면 여기에 더함) */
  type SkillBtn = { k: string; label: string; ok: boolean; zaps: boolean; go: () => void };
  const skillBtns = $derived<SkillBtn[]>(meH ? [{ k: 'atb-skill', label: breakNow ? '실드 깨기' : `스킬 ⚡${meH.zaps.length}`, ok: skillOk, zaps: true, go: doSkill }] : []);
  function doRole() { if (!roleOk || !meH) return; const R = meH.s.role; if (R === 'tank' || R === 'support') over = 'pick'; else roleAct(S, me); }
  const pickTo = (to: number) => { roleAct(S, me, to); over = ''; };
  const doRevive = (to: number) => { if (meH && ready && meH.zaps.length >= 1) revive(S, me, to); };
  const onTiming = (t: Timing) => { over = ''; attack(S, me, t); };

  // ── 연출 (사건 → 떠오르는 숫자 · 공격 자세 · 컷인) ──
  type Pop = { id: number; x: number; y: number; t: string; cls: string };
  let pops = $state<Pop[]>([]), seen = 0, pk = 0, hpose = $state<Record<number, HPose | ''>>({}), hurtOn = $state<Record<number, boolean>>({}), bossPose = $state<'idle' | 'attack' | 'hit' | 'down'>('idle'), cut = $state<{ who: number; awk: boolean; name: string; short: boolean } | null>(null), crack = $state<number[]>([]);
  let stageEl = $state<HTMLElement>(), bossEl = $state<HTMLElement>(), boom = $state(false), gaugeFlash = $state(false);
  const heroEls: Record<number, HTMLElement> = {}, busy = new Set<number>();
  const setPose = (who: number, p: Pose | HPose) => { hpose = { ...hpose, [who]: p === 'idle' ? '' : (p as HPose) }; };
  /** ⚔ 용사가 몬스터 앞까지 달려가 치고 제자리로 (레이드 attack · 원거리 = 제자리 탄) · 맞는 순간 = 숫자 · 몬스터 아픔 */
  function playAtk(e: Extract<Ev, { k: 'atk' | 'skill' | 'role' }>) {
    const h = S.heroes[e.who]; if (!h) return;
    const d = (e as { dmg?: number }).dmg ?? 0, isSk = e.k === 'skill', ult = isSk && e.ult, miss = e.k === 'atk' && e.timing === 'miss', crit = e.k === 'atk' && e.timing === 'crit';
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
    void fxAttack(stageEl, { heroBox: box, monBox: bossEl, hero: h.s.hero, fx: fk, miss, finish: isSk || crit || e.k === 'role', hits: isSk ? 3 : 1, mult: ult ? 1.7 : isSk ? 1.35 : crit ? 1.15 : 1, noDmg: true, vol: me < 0 || e.who === me ? 1 : 0.45, rest: 'idle', pose: (p) => setPose(e.who, p), onHit })
      .catch(() => {}).finally(() => { busy.delete(e.who); onHit(); setPose(e.who, 'idle'); });
  }
  /** 💥 광역이 터짐 = 용사 줄 가운데서 붉은 충격파 (레이드 필살기 충격파 .ult-ring 을 붉게) */
  function ring() {
    const st = stageEl; if (!st) return; const R = st.getBoundingClientRect(), x = R.width * (open ? 0.17 : 0.25), y = R.height * 0.6, d = R.width * 0.9;
    const el = document.createElement('i'); el.className = 'ult-ring'; el.style.cssText = `left:${x}px;top:${y}px;width:${d}px;height:${d}px;--c:#ff3a1a`; st.appendChild(el); setTimeout(() => el.remove(), 650);
  }
  /** 💢 용사가 맞음 = 맞음 자세 · 붉게 번쩍 (👹 「맞는 그림」 10종이 오면 .hitpic 자리에 겹침) */
  function hurt(id: number) { hurtOn = { ...hurtOn, [id]: true }; if (!busy.has(id)) setPose(id, 'hit'); setTimeout(() => { hurtOn = { ...hurtOn, [id]: false }; if (!busy.has(id) && !S.heroes[id]?.down) setPose(id, 'idle'); }, 450); }
  /** ✨ 정답 = 문제 카드에서 빛 구슬이 내 ATB · ⚡ 게이지로 날아가 차오름 (금색 ⚡ = 금빛 구슬) */
  function flyOrb(gold: boolean) {
    const st = stageEl, a = st?.querySelector('[data-k="atb-submit"]') ?? st?.querySelector('.card'), b = st?.querySelector('.hero.mine .tag'); if (!st || !a || !b) return;
    const R = st.getBoundingClientRect(), A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
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
      if (e.k === 'skill' && (e.ult || e.who === me)) { const c = { who: e.who, awk: e.awk, name: fx[e.who] ? skillName(fx[e.who]!) : e.ult ? '필살기' : '스킬', short: !e.ult }; cut = c; setTimeout(() => { if (cut === c) cut = null; }, e.ult ? 1700 : 900); sfx(e.ult ? 'true-ult' : 'special', 0.8); }
      if (e.k === 'skill' && (e.ult || e.who === me)) setTimeout(() => playAtk(e), e.ult ? 1500 : 650); else playAtk(e);
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
  const tele = $derived(S.target && !weak(S) ? Math.max(0, Math.ceil(T.bossEvery - S.bossT)) : 0);
  const bossLeft = $derived(weak(S) ? 1 : Math.max(0, 1 - S.bossT / T.bossEvery));
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
  (globalThis as unknown as { __atb?: object }).__atb = { S: untrack(() => S), full: () => { if (meH) meH.atb = 1; }, zap: (n: number, g = false) => { for (let i = 0; i < n; i++) earn(S, me, { zap: 1, gold: g, done: false, perfect: false, right: true }); }, pause: (v: boolean) => (paused = v), solve: () => { if (!run) openQuiz(); const q = run ? questionsOf(L, run, seed)[run.k] : null; if (q) submit(answerOf(q)); }, miss: () => { if (!run) openQuiz(); submit(-999 as never); }, lock: () => { lockUntil = Date.now() + attackMs(); lockLeft = 3; lockTag = '💥 시험!'; } };
</script>

<div class="stage" class:q={open} class:weak={weakLeft > 0} style:background-image="url({dungeonOf(L.theme)})" data-k="atb-stage" bind:this={stageEl}>
  <!-- ⚠ 광역 예고 = 용사 줄 바닥 붉게 깜빡 · 터질 때 붉은 번쩍 -->
  <i class="floor" class:on={aoeWarn} class:q={open} data-k="atb-aoe-floor" aria-hidden="true"></i>
  {#if boom}<i class="boom" aria-hidden="true"></i>{/if}
  <!-- 팀 부활 -->
  <div class="revs" aria-label="팀 부활 {S.revives} / {T.revives}"><b>팀 부활</b>{#each Array(T.revives) as _, i (i)}<span class:used={i >= S.revives}><AtbIcon name="revive" size={22} /></span>{/each}</div>
  {#if weakLeft}<div class="weakb" role="status"><AtbIcon name="weak" size={26} /> 약점 시간 {weakLeft}초 · 피해 2배</div>{/if}

  <!-- 보스 -->
  <div class="bossui" style:left={open ? '6%' : '54%'} style:width={open ? '40%' : '40%'}>
    {#if tele}<div class="tele" class:aoe={S.aoeNext} role="status" data-k="atb-tele">{#if S.aoeNext}⚠ 광역!{atkName !== '광역' ? ` ${atkName}` : ''} {tele}초 뒤 · 모두 맞아요{:else}⚠ {atkName} {tele}초 뒤{/if}{#if tiltTxt} · {tiltTxt}{/if}</div>{/if}
    {#if breathLeft}<div class="tele sig" role="status" data-k="atb-breath">🫁 숨 고르기 {breathLeft}초 · 실드를 깨면 끊겨요</div>{/if}
    {#if mirrorLeft}<div class="tele sig" role="status" data-k="atb-mirror">🪞 거울빛 {mirrorLeft}초 · 일반 공격 30% 되돌아옴</div>{/if}
    <div class="hp" aria-label="보스 HP {S.bossHp} / {S.bossMax}"><b style:width={pct(S.bossHp, S.bossMax)}></b><span>{S.bossHp}</span></div>
    {#if S.cells.length}
      <div class="cells" data-k="atb-cells" aria-label="실드 {S.cells.filter((c) => !c.broken).length}칸 남음">
        {#each S.cells as c, i (i)}<span class="cell" class:broken={c.broken} class:crack={crack.includes(i)} title="{S.heroes[c.owner]?.s.name} · {c.fam}"><AtbIcon name={c.broken ? 'shield-broken' : 'shield'} size={34} /><i class="fi"><AtbIcon name={FAM_ICON[c.fam]} size={18} /></i>{#if S.boss.sig === 'lock'}<i class="lk" aria-hidden="true">{c.broken ? '🔓' : '🔒'}</i>{/if}</span>{/each}
      </div>
    {/if}
  </div>
  <div class="boss" style:left={open ? '33%' : '73%'} style:width="{bossSize}px" style:height="{bossSize}px" data-k="atb-boss" data-flip={S.boss.flip?.[bossPose] ? 1 : 0} bind:this={bossEl}><i class="bflip" class:flip={!!S.boss.flip?.[bossPose]} class:armor class:shine={mirrorLeft > 0} class:breath={breathLeft > 0}><Sprite ref={S.boss.sprite} pose={bossPose} size={bossSize} /></i></div>

  <!-- 용사 -->
  {#each S.heroes as h (h.id)}
    {@const p = posOf(h.id)}
    {@const sc = +(base * p.s).toFixed(2)}
    <div class="hero" class:down={h.down} class:mine={h.id === me} class:hurt={hurtOn[h.id]} style:left="{p.x}%" style:top="{p.y}%" style:z-index={10 + (4 - order.indexOf(h.id))} data-k="atb-hero" data-id={h.id}>
      {#if S.target?.includes(h.id) && tele}{#if S.boss.tele === 'gaze' && !S.aoeNext}<i class="gaze" aria-label="보스가 바라봄">👁</i>{:else}<i class="tgt" aria-label="표적"></i>{/if}{/if}
      <div class="spr" style:transform="translate(-50%, -100%)" bind:this={heroEls[h.id]}><HeroSprite id={h.s.hero} scale={sc} row={h.down ? 8 : 0} play={!h.down} pose={!h.down && hpose[h.id] ? hpose[h.id] || undefined : undefined} /><i class="hitpic" data-k="atb-hitpic" aria-hidden="true"></i></div>
      {#if h.cover}<i class="cov"><AtbIcon name="role-tank" size={20} label="엄호" /></i>{/if}
      <div class="tag" class:full={h.atb >= 1 && !h.down} class:flash={h.id === me && gaugeFlash}>
        <b>{name(h.id)}</b>
        <i class="bar hp"><b style:width={pct(h.hp, h.s.maxHp)}></b></i>
        <i class="bar atb"><b style:width="{Math.round(h.atb * 100)}%"></b></i>
        {#if h.zaps.length}<span class="hz">{#each h.zaps as z, j (j)}<i class:g={z === 'g'}>⚡</i>{/each}</span>{/if}
      </div>
      {#if h.down && me >= 0 && h.id !== me && meH && !meH.down}<button type="button" class="rv" data-k="atb-revive" disabled={!ready || !meH.zaps.length || S.revives <= 0} onclick={() => doRevive(h.id)}>💖 살리기 ⚡1</button>{/if}
    </div>
  {/each}

  {#each pops as p (p.id)}<span class="pop {p.cls}" style:left="{p.x}%" style:top="{p.y}%">{p.t}</span>{/each}

  <!-- 문제 카드 -->
  {#if open && run}
    <div class="card"><QuizCard {L} {run} {seed} title={titleOf(run.mid)} zaps={meH?.zaps ?? []} {bossLeft} hintOk={!hintUsed} {flash} locked={lockLeft} {lockTag} onsubmit={submit} onclose={() => (open = false)} /></div>
  {/if}

  <!-- 단추 -->
  {#if me >= 0 && meH}
    <nav class="btns" aria-label="행동" style:--n={(open ? 2 : 3) + skillBtns.length}>
      <button type="button" class="b atk" class:hot={ready || over === 'timing'} class:stopb={over === 'timing'} disabled={!ready && over !== 'timing'} data-k="atb-attack" data-stop={over === 'timing' ? 1 : 0} onpointerdown={atkDown} onclick={doAttack}>{#if over === 'timing'}⏹ 멈춤!{:else}<AtbIcon name="fam-arms" size={28} /> 공격{/if}</button>
      {#each skillBtns as sb (sb.k)}
        <button type="button" class="b sk" class:hot={sb.ok} class:flash={gaugeFlash} disabled={!sb.ok} data-k={sb.k} onclick={sb.go}>
          <span>{sb.label}</span>
          {#if sb.zaps}<span class="slots">{#each Array(5) as _, i (i)}<i class="sl" class:g={meH.zaps[i] === 'g'}><AtbIcon name={meH.zaps[i] === 'g' ? 'zap-gold' : meH.zaps[i] ? 'zap' : 'zap-empty'} size={18} /></i>{/each}</span>{/if}
        </button>
      {/each}
      <button type="button" class="b role" class:hot={roleOk} disabled={!roleOk} data-k="atb-role" onclick={doRole}><AtbIcon name={ROLE_ICON[meH.s.role]} size={34} /> <span class="rl"><small class="rk">역할 스킬</small>{ROLE_SKILL[meH.s.role]}{#if meH.s.role === 'healer' && healBlocked(S)}<small data-k="atb-heal-wait">보스 공격 뒤</small>{/if}</span></button>
      {#if !open}<button type="button" class="b quiz" data-k="atb-quiz-open" disabled={!!S.end} onclick={openQuiz}>📜 문제 풀기</button>{/if}
    </nav>
  {:else}
    <p class="watch" role="status">👀 봇 {S.heroes.length}명 관전 · {Math.floor(S.t / 60)}:{String(Math.floor(S.t % 60)).padStart(2, '0')} · ×{speed}</p>
  {/if}

  {#if over === 'timing'}<TimingBar bind:this={tb} ondone={onTiming} />{/if}
  {#if over === 'pick' && meH}
    <div class="pick" role="dialog" aria-label="누구에게"><b>{ROLE_SKILL[meH.s.role]} · 누구에게?</b>{#each S.heroes.filter((x) => !x.down && (meH.s.role === 'tank' || x.id !== me)) as x (x.id)}<button type="button" onclick={() => pickTo(x.id)}>{name(x.id)}{S.target?.includes(x.id) ? ' ⚠표적' : ''}</button>{/each}<button type="button" class="x" onclick={() => (over = '')}>취소</button></div>
  {/if}
  {#if cut}
    <div class="cut" class:short={cut.short} data-k="atb-cutin" aria-live="polite">
      <div class="band"><HeroSprite id={S.heroes[cut.who]!.s.hero} scale={Math.max(2, Math.round(H / 90))} row={2} play /></div>
      <p class="cn"><small>{cut.short ? '스킬' : cut.awk ? '각성 필살기 ⚡⚡⚡⚡⚡' : '필살기 ⚡⚡⚡⚡⚡'}</small>{cut.name}</p>
    </div>
  {/if}
  {#if S.end}<div class="endb" class:win={S.end.win} role="status">{S.end.win ? '⚔ 처치!' : `💀 ${S.end.why}`}</div>{/if}
</div>

<style>
  .stage { position: fixed; inset: 0; overflow: hidden; background: #1a1424 center / cover no-repeat; color: #fff; font-family: var(--font); user-select: none; -webkit-user-select: none; touch-action: manipulation; }
  .stage::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(#0000 55%, #0006); }
  .stage.weak::after { background: radial-gradient(ellipse at 70% 50%, #ffcf4a33, #0000 60%), linear-gradient(#0000 55%, #0006); }
  .revs { position: absolute; top: 2%; right: 1.5%; z-index: 20; display: flex; align-items: center; gap: 2px; padding: 4px 10px; border-radius: 10px; border: 2px solid #c9953e; background: #1d1220e6; font: 800 14px var(--font); }
  .revs b { margin-right: 4px; } .revs .used { filter: grayscale(1) brightness(0.5); }
  .weakb { position: absolute; top: 2%; left: 50%; transform: translateX(-50%); z-index: 22; display: flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 12px; background: linear-gradient(#ffdf7a, #f0a92a); color: #3a1d00; font: 800 16px var(--font); box-shadow: 0 0 16px #ffcf4a; animation: pulse 0.8s ease-in-out infinite; }
  @keyframes pulse { 50% { transform: translateX(-50%) scale(1.06); } }
  .bossui { position: absolute; top: 11%; z-index: 12; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: left 0.45s ease; }
  .tele { padding: 3px 12px; border-radius: 10px; border: 2px solid #ffcf6a; background: linear-gradient(#c81e1e, #8e1010); font: 800 14px var(--font); box-shadow: 0 0 10px #ff3a2a88; animation: blink 0.5s steps(2) infinite; }
  @keyframes blink { 50% { filter: brightness(1.3); } }
  .hp { position: relative; width: 100%; height: 16px; border-radius: 8px; border: 3px solid #c9953e; background: #2a1a1a; overflow: hidden; box-shadow: 0 2px 6px #0008; }
  .hp b { display: block; height: 100%; background: linear-gradient(#ff6a5a, #d8261e); transition: width 0.25s; }
  .hp span { position: absolute; right: 6px; top: -1px; font: 800 11px var(--font-plain); text-shadow: 0 1px 2px #000; }
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
  .tag.full { border-color: #ffd34d; box-shadow: 0 0 10px #ffd34d; } /* ATB 가득 = 금테 */
  .hero.mine .tag { border-color: #e2b04a; }
  .bar { display: block; height: 5px; border-radius: 3px; background: #0008; overflow: hidden; }
  .bar b { display: block; height: 100%; }
  .bar.hp b { background: linear-gradient(#7de06a, #2faa3a); } .bar.atb b { background: linear-gradient(#ffe46a, #e6b81e); }
  .hz { display: flex; justify-content: center; gap: 0; font-size: 9px; line-height: 1; } .hz i { font-style: normal; } .hz i.g { filter: drop-shadow(0 0 2px #ffd34d) brightness(1.3); }
  .rv { position: absolute; left: -42px; top: 44px; width: 84px; min-height: 30px; border-radius: 8px; border: 2px solid #ff8fb0; background: #5a1630; color: #fff; font: 800 11px var(--font-plain); }
  .rv:disabled { opacity: 0.5; }
  .pop { position: absolute; z-index: 25; transform: translate(-50%, 0); font: 900 22px var(--font); color: #fff; text-shadow: 0 2px 0 #000, 0 0 6px #000; pointer-events: none; animation: up 1.1s ease-out forwards; white-space: nowrap; }
  .pop.crit { color: #ffe066; font-size: 34px; } .pop.sk { color: #8fd0ff; font-size: 34px; } .pop.ult { color: #ffd34d; font-size: 46px; } .pop.hurt { color: #ff6a6a; font-size: 20px; } .pop.hurt.big { font-size: 26px; } .pop.miss { color: #ccc; font-size: 20px; }
  .pop.crit, .pop.sk, .pop.ult { animation: upbig 1.1s ease-out forwards; } @keyframes upbig { 0% { opacity: 1; transform: translate(-50%, 0) scale(1.8); } 15% { transform: translate(-50%, -6px) scale(1); } 100% { opacity: 0; transform: translate(-50%, -56px) scale(1); } } .pop.shield { color: #9fe6ff; font-size: 22px; } .pop.role { color: #9dff9a; font-size: 16px; }
  @keyframes up { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -48px); } }
  .card { position: absolute; z-index: 26; right: 1.5%; top: 2.5%; bottom: 2.5%; width: 52%; animation: slide 0.35s ease-out; }
  @keyframes slide { from { transform: translateX(30px); opacity: 0; } }
  .btns { position: absolute; z-index: 24; left: 1.5%; right: 1.5%; bottom: 2.5%; height: 19%; display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr)); gap: 1.2%; }
  .stage.q .btns { right: auto; width: 44%; height: 17%; }
  .b { min-height: 48px; border-radius: 12px; border: 3px solid #8a6a3a; background: linear-gradient(#5a3f2a, #3a2618); color: #fff2d6; font: 800 clamp(13px, 4.6vh, 22px) var(--font); display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: inset 0 0 0 2px #2a1a10, 0 4px 0 #1a100a; padding: 0 4px; text-shadow: 0 2px 0 #0008; }
  .b:disabled { filter: grayscale(0.4) brightness(0.75); }
  .b.atk.hot { border-color: #ffd34d; background: linear-gradient(#f6c25a, #c8862a); color: #2a1600; box-shadow: 0 0 14px #ffd34d, inset 0 0 0 2px #fff3c0, 0 4px 0 #6a4210; text-shadow: none; animation: glow 1s ease-in-out infinite; }
  @keyframes glow { 50% { box-shadow: 0 0 22px #ffe27a, inset 0 0 0 2px #fff3c0, 0 4px 0 #6a4210; } }
  .rl { display: flex; flex-direction: column; align-items: center; line-height: 1.1; } .rl small { font: 700 11px var(--font-plain); color: #ffd98a; }
  .b.sk { flex-direction: column; gap: 0; } .slots { display: flex; gap: 1px; } .sl.g { border-radius: 50%; box-shadow: 0 0 5px 1px #ffd34d; }
  .b.sk.hot { border-color: #ffd34d; }
  .b.sk.flash, .tag.flash { animation: gflash 0.45s; } @keyframes gflash { 30% { filter: brightness(2.2); box-shadow: 0 0 22px #ffe27a; } }
  .b.atk.stopb { border-color: #fff; background: linear-gradient(#ff6a4a, #c8261e); color: #fff; text-shadow: 0 2px 0 #0008; animation: none; font-size: clamp(16px, 6vh, 26px); }
  /* 🧭 역할 스킬 = 따로 보이게 (📜 선생님 「스킬 하나밖에 없다」) · 꺼져 있어도 색은 그대로 */
  .b.role { border-color: #5fe0c0; background: linear-gradient(#1f7a6a, #0f4a40); color: #e8fff8; }
  .b.role.hot { border-color: #b8fff0; box-shadow: 0 0 14px #5fe0c0, inset 0 0 0 2px #c8fff2, 0 4px 0 #0a2e28; }
  .rl .rk { color: #b8fff0; font-size: 10px; }
  .floor { position: absolute; z-index: 9; left: 0; width: 50%; top: 42%; height: 34%; pointer-events: none; opacity: 0; border-radius: 50%; background: radial-gradient(ellipse at 50% 62%, #ff2a1a, #ff2a1a99 40%, #ff2a1a33 62%, #0000 72%); mix-blend-mode: screen; transition: opacity 0.2s, width 0.45s; }
  .floor.q { width: 34%; } .floor.on { opacity: 1; animation: blink 0.35s steps(2) infinite; }
  .boom { position: absolute; inset: 0; z-index: 35; pointer-events: none; background: radial-gradient(ellipse at 25% 60%, #ffffffcc, #ff3a1a99 30%, #7a000066 70%); animation: boom 0.6s ease-out forwards; }
  @keyframes boom { from { opacity: 1; } to { opacity: 0; } }
  .tele.aoe { font-size: 17px; padding: 4px 16px; background: linear-gradient(#ff3a1a, #a80e0e); box-shadow: 0 0 18px #ff2a1a; }
  .hero.hurt .spr { filter: brightness(1.6) sepia(1) saturate(6) hue-rotate(-30deg); animation: hshake 0.3s; }
  @keyframes hshake { 25% { margin-left: -5px; } 75% { margin-left: 5px; } }
  .hitpic { position: absolute; inset: 0; pointer-events: none; } /* 👹 「맞는 그림」 10종 겹칠 자리 (아직 빈 칸 · hero-v2 monster-hit-map.json) */
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
