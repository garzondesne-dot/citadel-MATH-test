<script lang="ts">
  // 🧪 게시판 던전 ATB — 교사 연습방 (📜 결정 #9 · #11 · 설계안 v1 8절 · 정리.md 8 「엔진 → 교사 연습방 → 선생님이 3판 해 보고 OK → 학생 판」)
  //   올드윈(나) + 봇 3 으로 직접 · 봇 4 관전 · 시작 지점 4 · 같은 씨앗 = 같은 판(문항 변형 · 봇 · 보스 패턴 고정) · 결과 = 이 폰 최근 5판(서버 0)
  //   주소 ?role=atb · 학생 판(모집 · 서버 방 · 보상)은 선생님 OK 뒤
  import { onDestroy } from 'svelte';
  import type { LessonPack } from '../../../model/types';
  import { HEROES, TEACHER_HEROES, heroOf, ladder } from '../../../model/hero';
  import { PACKS } from '../../../engine/packs';
  import { newBattle, tick, type State } from '../../../board/atb/engine';
  import { BOT_LABEL, newBot, type BotKind } from '../../../board/atb/bots';
  import { originsOf } from '../../../board/atb/quiz';
  import { famOf, roleOf, statsOf } from '../../../board/atb/heroes';
  import { BOSSES, FAM_NAME, ROLE_NAME, T, type Diff } from '../../../board/atb/tune';
  import AtbBattle from './AtbBattle.svelte';
  import AtbResult from './AtbResult.svelte';
  import HeroPick from './HeroPick.svelte';

  const KEY = 'citadel-atb-practice';
  type Rec = { at: number; no: number; diff: Diff; win: boolean; sec: number; who: string; seed: number; mode: string };
  const loadRecs = (): Rec[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Rec[]; } catch { return []; } };
  let recs = $state<Rec[]>(loadRecs());
  const saveRec = (r: Rec) => { recs = [r, ...recs].slice(0, T.practiceKeep); try { localStorage.setItem(KEY, JSON.stringify(recs)); } catch { /* 사생활 창 */ } };

  const lessons = PACKS.filter((p) => !p.partOf && BOSSES[p.no] && originsOf(p).length > 0);
  const OLD = TEACHER_HEROES.find((h) => h.name === '올드윈')?.id ?? TEACHER_HEROES[0]?.id ?? 0;
  const ALL = [OLD, ...HEROES.map((h) => h.id)];
  const nameOf = (id: number) => String(heroOf(id).name);
  let L = $state<LessonPack | null>(lessons.find((p) => p.no === 2) ?? lessons[0] ?? null);
  let diff = $state<Diff>('normal'), mode = $state<'play' | 'watch'>('play'), meHero = $state(OLD);
  let mates = $state<number[]>(['발도르', '루멘', '로안', '누아'].map((n) => HEROES.find((h) => h.name === n)?.id ?? 0));
  let botKind = $state<BotKind>('normal'), grow = $state<'new' | 'mid' | 'max'>('new'), start = $state<'start' | 'shield' | 'one' | 'aoe'>('start'), seed = $state(1), speed = $state(1), size = $state(4);
  const GROW = { new: { lv: 1, enh: 1, label: '새내기 Lv.1 · +1 · Ⅰ' }, mid: { lv: 5, enh: 4, label: '보통 Lv.5 · +4 · Ⅱ' }, max: { lv: 10, enh: 10, label: '끝까지 Lv.10 · +10 · Ⅳ' } } as const;
  const tierFor = (id: number) => (grow === 'max' ? 4 : grow === 'mid' ? 2 : 1);
  const fxFor = (id: number) => (ladder(id)[tierFor(id) - 1] as string) ?? (ladder(id)[0] as string);
  let picking = $state<null | number>(null); // null · -1 = 나 · 0 ~ 2 = 봇 자리

  // ── 판 ──
  let S = $state<State | null>(null), bots = $state<ReturnType<typeof newBot>[]>([]), meIdx = $state(0), phase = $state<'setup' | 'battle' | 'result'>('setup'), runKey = $state(0);
  function begin() {
    if (!L) return;
    const g = GROW[grow], ids = mode === 'play' ? [meHero, ...mates.slice(0, size - 1)] : mates.slice(0, size);
    const party = ids.map((id) => statsOf({ hero: id, lv: g.lv, enh: g.enh, tier: tierFor(id), name: nameOf(id) }));
    const B = newBattle({ boss: BOSSES[L.no]!, diff, party, seed });
    if (start === 'shield' || start === 'one') { B.bossHp = Math.round(B.bossMax * T.shieldAt) - 1; B.shieldUp = true; B.shieldAt = 0; B.cells = B.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: false })); if (start === 'one') B.cells.forEach((c, i) => { if (i > 0) { c.broken = true; c.by = c.owner; } }); }
    if (start === 'aoe') { while (!B.ev.some((e) => e.k === 'boss' && e.aoe) && B.t < 60) tick(B, 0.1); }
    S = B; meIdx = mode === 'play' ? 0 : -1;
    bots = B.heroes.map((h) => newBot(L!, h.id, botKind, seed)).filter((b) => mode === 'watch' || b.who !== 0);
    phase = 'battle'; runKey++;
    tryLand();
  }
  function ended(B: State) {
    saveRec({ at: Date.now(), no: L!.no, diff, win: !!B.end?.win, sec: Math.round(B.t), who: B.heroes.map((h) => h.s.name).join('·'), seed, mode: mode === 'play' ? '직접' : '관전' });
    phase = 'result';
  }
  const mastery = $derived(L ? recs.filter((r) => r.no === L!.no && r.win).length : 0);
  // ── 가로 화면 ──
  let portrait = $state(typeof innerHeight === 'number' && innerHeight > innerWidth);
  const onRot = () => (portrait = innerHeight > innerWidth);
  if (typeof window !== 'undefined') addEventListener('resize', onRot);
  onDestroy(() => { if (typeof window !== 'undefined') removeEventListener('resize', onRot); });
  async function tryLand() { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape'); } catch { /* iOS · 데스크톱 = 덮개로 안내 */ } }
  const md = (t: number) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
</script>

{#if phase === 'setup'}
  <main class="setup" data-k="atb-setup">
    <h1>⚔ 게시판 던전 · 교사 연습방 <small>새 판(ATB) · 숫자 = 출발값 · 기록 = 이 폰 최근 5판만</small></h1>
    <section><b>차시</b><div class="chips">{#each lessons as p (p.id)}<button type="button" class:on={L?.id === p.id} data-no={p.no} onclick={() => (L = p)}>{p.no}차시{BOSSES[p.no]?.draft ? ' ·초안' : ''}</button>{/each}</div>
      {#if L}{@const B = BOSSES[L.no]!}<p class="sub">{B.name} · {B.type} · 약점 {B.weak.map((f) => FAM_NAME[f]).join(' · ')} · 원문항 {originsOf(L).length}개{B.draft ? ' · ⏳ 공격 묶음은 설계 방 설정표 오면 바꿈' : ''}</p>{/if}</section>
    <section><b>난이도</b><div class="chips">{#each [['easy', '연습'], ['normal', '일반'], ['hard', '도전']] as [k, t] (k)}<button type="button" class:on={diff === k} onclick={() => (diff = k as Diff)}>{t}</button>{/each}</div></section>
    <section><b>방식</b><div class="chips"><button type="button" class:on={mode === 'play'} data-k="atb-mode-play" onclick={() => (mode = 'play')}>🙋 나 + 봇</button><button type="button" class:on={mode === 'watch'} data-k="atb-mode-watch" onclick={() => (mode = 'watch')}>👀 봇만 관전</button></div>
      <div class="chips">{#each [1, 2, 3, 4] as n (n)}<button type="button" class:on={size === n} onclick={() => (size = n)}>{n}인</button>{/each}</div>{#if size < 3}<p class="sub">⏳ 1 · 2인 숫자는 설계 방이 아직 맞추는 중(출발값 그대로)</p>{/if}</section>
    <section><b>용사</b>
      <div class="party">
        {#if mode === 'play'}<button type="button" class="hp me" data-k="atb-me-hero" onclick={() => (picking = -1)}><small>나</small>{nameOf(meHero)}<em>{ROLE_NAME[roleOf(meHero)]} · {FAM_NAME[famOf(meHero)]}</em></button>{/if}
        {#each mates.slice(0, mode === 'play' ? size - 1 : size) as id, i (i)}<button type="button" class="hp" onclick={() => (picking = i)}><small>봇</small>{nameOf(id)}<em>{ROLE_NAME[roleOf(id)]} · {FAM_NAME[famOf(id)]}</em></button>{/each}
      </div></section>
    <section><b>봇</b><div class="chips">{#each Object.entries(BOT_LABEL) as [k, t] (k)}<button type="button" class:on={botKind === k} onclick={() => (botKind = k as BotKind)}>{t}</button>{/each}</div></section>
    <section><b>키운 정도</b><div class="chips">{#each Object.entries(GROW) as [k, g] (k)}<button type="button" class:on={grow === k} onclick={() => (grow = k as typeof grow)}>{g.label}</button>{/each}</div></section>
    <section><b>시작 지점</b><div class="chips">{#each [['start', '전투 시작'], ['shield', '실드 등장 직전'], ['one', '실드 한 칸 남음'], ['aoe', '광역기 직후']] as [k, t] (k)}<button type="button" class:on={start === k} onclick={() => (start = k as typeof start)}>{t}</button>{/each}</div></section>
    <section class="row"><label><b>씨앗</b> <input type="number" min="1" max="9999" bind:value={seed} /></label>{#if mode === 'watch'}<span class="chips">{#each [1, 2, 4] as v (v)}<button type="button" class:on={speed === v} onclick={() => (speed = v)}>×{v}</button>{/each}</span>{/if}</section>
    <button type="button" class="go" data-k="atb-start" disabled={!L} onclick={begin}>⚔ 출발 (폰을 눕혀요)</button>
    {#if recs.length}<section><b>최근 {recs.length}판 (이 폰)</b><ol class="recs">{#each recs as r (r.at)}<li>{md(r.at)} · {r.no}차시 {({ easy: '연습', normal: '일반', hard: '도전' })[r.diff]} · {r.mode} · {r.win ? '✔ 승리' : '✘ 실패'} · {Math.floor(r.sec / 60)}분 {r.sec % 60}초 · {r.who} · 씨앗 {r.seed}</li>{/each}</ol></section>{/if}
  </main>
{:else if phase === 'battle' && S && L}
  {#key runKey}<AtbBattle {L} {S} me={meIdx} {bots} speed={mode === 'watch' ? speed : 1} seed={`me${seed}`} fx={Object.fromEntries(S.heroes.map((h) => [h.id, fxFor(h.s.hero)]))} onend={ended} />{/key}
  {#if portrait}<div class="rot" role="alert" data-k="atb-rotate">📱↻ 폰을 눕혀요 <small>가로 화면 전투</small></div>{/if}
{:else if phase === 'result' && S && L}
  <AtbResult {S} no={L.no} me={meIdx} {mastery} onagain={begin} onswap={() => { phase = 'setup'; picking = -1; }} onexit={() => (phase = 'setup')} />
{/if}
{#if picking != null && L}
  <HeroPick ids={ALL} owned={() => true} boss={BOSSES[L.no]!} cur={picking === -1 ? meHero : mates[picking]!} lv={GROW[grow].lv} enh={GROW[grow].enh} tierOf={tierFor} fxOf={fxFor}
    onpick={(id) => { if (picking === -1) meHero = id; else mates[picking!] = id; picking = null; }} onclose={() => (picking = null)} />
{/if}

<style>
  .setup { min-height: 100dvh; box-sizing: border-box; padding: 14px 16px 40px; display: flex; flex-direction: column; gap: 12px; max-width: 760px; margin: 0 auto; background: var(--bg); color: var(--text); font-family: var(--font); }
  h1 { margin: 0; font: 900 20px var(--font); } h1 small { display: block; font: 600 12px var(--font-plain); color: var(--text-2); }
  section { display: flex; flex-direction: column; gap: 6px; } section > b { font: 800 14px var(--font); color: var(--accent); }
  .row { flex-direction: row; align-items: center; gap: 12px; } .row input { width: 80px; min-height: 36px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); padding: 0 8px; font: 700 15px var(--font-plain); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { min-height: 40px; padding: 0 12px; border-radius: 10px; border: 2px solid var(--surface-2); background: var(--surface-2); color: var(--text); font: 700 14px var(--font-plain); }
  .chips button.on { border-color: var(--accent); background: var(--accent); color: var(--on-accent); }
  .sub { margin: 0; font: 600 12px var(--font-plain); color: var(--text-2); }
  .party { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; }
  .hp { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; min-height: 56px; padding: 6px 10px; border-radius: 10px; border: 2px solid var(--line); background: var(--surface); color: var(--text); font: 800 15px var(--font); text-align: left; }
  .hp.me { border-color: var(--accent); } .hp small { font: 700 11px var(--font-plain); color: var(--accent); } .hp em { font: 600 11px var(--font-plain); color: var(--text-2); font-style: normal; }
  .go { min-height: 56px; border-radius: 14px; border: 3px solid #ffd34d; background: linear-gradient(#f6c25a, #c8862a); color: #2a1600; font: 900 20px var(--font); box-shadow: 0 4px 0 #6a4210; }
  .recs { margin: 0; padding-left: 18px; font: 600 12px var(--font-plain); color: var(--text-2); display: flex; flex-direction: column; gap: 2px; }
  .rot { position: fixed; inset: 0; z-index: 90; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: #120c18f2; color: #ffe08a; font: 900 26px var(--font); }
  .rot small { font: 600 14px var(--font-plain); color: #fff; }
</style>
