<script lang="ts">
  // 🧪 게시판 던전 ATB — 교사 연습방 (📜 결정 #9 · #11 · 설계안 v1 8절 · 정리.md 8 「엔진 → 교사 연습방 → 선생님이 3판 해 보고 OK → 학생 판」)
  //   올드윈(나) + 봇 3 으로 직접 · 봇 4 관전 · 시작 지점 4 · 같은 씨앗 = 같은 판(문항 변형 · 봇 · 보스 패턴 고정) · 결과 = 이 폰 최근 5판(서버 0)
  //   주소 ?role=atb · 학생 판(모집 · 서버 방 · 보상)은 선생님 OK 뒤
  import { onDestroy } from 'svelte';
  import type { LessonPack } from '../../../model/types';
  import { HEROES, TEACHER_HEROES, heroOf, ladder } from '../../../model/hero';
  import { PACKS, UPLOADED } from '../../../engine/packs';
  import { atbLessons, atbReady } from '../../../board/atb/lessons';
  import { newBattle, runRecord, tick, type State } from '../../../board/atb/engine';
  import { BOT_LABEL, newBot, type BotKind } from '../../../board/atb/bots';
  import { originsOf } from '../../../board/atb/quiz';
  import { famOf, roleOf, statsOf } from '../../../board/atb/heroes';
  import { bossOf, FAM_NAME, ROLE_NAME, shieldOf, T, type Diff } from '../../../board/atb/tune';
  import AtbBattle from './AtbBattle.svelte';
  import Land from './Land.svelte';
  import FamShield from './FamShield.svelte';
  import AtbResult from './AtbResult.svelte';
  import HeroSheet from './HeroSheet.svelte';
  import { bossArt } from './rdunBoss';

  const KEY = 'citadel-atb-practice';
  type Rec = { at: number; no: number; diff: Diff; win: boolean; sec: number; who: string; seed: number; mode: string; /** 📊 판 기록 (균형 도구) */ r?: ReturnType<typeof runRecord> };
  const loadRecs = (): Rec[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Rec[]; } catch { return []; } };
  let recs = $state<Rec[]>(loadRecs());
  const saveRec = (r: Rec) => { recs = [r, ...recs].slice(0, T.practiceKeep); try { localStorage.setItem(KEY, JSON.stringify(recs)); } catch { /* 사생활 창 */ } };

  const lessons = atbLessons(PACKS, UPLOADED); // 📦 서버 팩 먼저 · 설정표 없는 차시 = 기본 보스 표(bossOf)
  const OLD = TEACHER_HEROES.find((h) => h.name === '올드윈')?.id ?? TEACHER_HEROES[0]?.id ?? 0;
  const ALL = [OLD, ...HEROES.map((h) => h.id)];
  const nameOf = (id: number) => String(heroOf(id).name);
  let L = $state<LessonPack | null>(lessons.find((p) => p.no === 2) ?? lessons[0] ?? null);
  let diff = $state<Diff>('normal'), mode = $state<'play' | 'watch'>('play'), meHero = $state(OLD);
  let mates = $state<number[]>(['발도르', '루멘', '로안', '누아'].map((n) => HEROES.find((h) => h.name === n)?.id ?? 0));
  let botKind = $state<BotKind>('normal'), grow = $state<'new' | 'mid' | 'max' | 'awk'>('new'), start = $state<'start' | 'shield' | 'one' | 'aoe'>('start'), seed = $state(1), seedNew = $state(true), speed = $state(1), size = $state(4);
  const GROW = { new: { lv: 1, enh: 1, label: '새내기 Lv.1 · +1 · Ⅰ' }, mid: { lv: 5, enh: 4, label: '보통 Lv.5 · +4 · Ⅱ' }, max: { lv: 10, enh: 10, label: '끝까지 Lv.10 · +10 · Ⅳ' }, awk: { lv: 10, enh: 10, label: '✨ 각성 Lv.10 · +10 · Ⅳ · 각성' } } as const;
  /** ⚡ 용사마다 고른 장착 스킬 단계 (📜 요청 #16 · 연습방 = 이 화면에서만 · 저장 안 됨) */
  let skSel = $state<Record<number, number>>({});
  const tierFor = (id: number) => skSel[id] ?? (grow === 'max' || grow === 'awk' ? 4 : grow === 'mid' ? 2 : 1);
  const fxFor = (id: number) => (ladder(id)[tierFor(id) - 1] as string) ?? (ladder(id)[0] as string);
  let picking = $state<null | number>(null); // null · -1 = 나 · 0 ~ 2 = 봇 자리
  // 🛡 📜 요청 #35 = 막는 역할이 팀에 없으면 알림
  const teamIds = $derived(mode === 'play' ? [meHero, ...mates.slice(0, size - 1)] : mates.slice(0, size));
  const missRoles = $derived((['tank', 'support', 'dealer'] as const).filter((r) => !teamIds.some((id) => roleOf(id) === r)).map((r) => ROLE_NAME[r]));

  // ── 판 ──
  let bg = $state('');
  let S = $state<State | null>(null), bots = $state<ReturnType<typeof newBot>[]>([]), meIdx = $state(0), phase = $state<'setup' | 'battle' | 'result'>('setup'), runKey = $state(0);
  function begin() {
    if (!L) return;
    if (seedNew) seed = 1 + Math.floor(Math.random() * 9999); // 📜 요청 #19 덧2 = 연습방 씨앗 기본 「매번 새로」
    const g = GROW[grow], ids = mode === 'play' ? [meHero, ...mates.slice(0, size - 1)] : mates.slice(0, size);
    const party = ids.map((id) => statsOf({ hero: id, lv: g.lv, enh: g.enh, tier: tierFor(id), name: nameOf(id), awk: grow === 'awk' }));
    const art = bossArt(bossOf(L.no), diff, L.theme); bg = art.bg;
    const B = newBattle({ boss: art, diff, party, seed });
    if (start === 'shield' || start === 'one') { B.bossHp = Math.round(B.bossMax * T.shieldAt) - 1; B.shieldUp = true; B.shieldAt = 0; B.cells = shieldOf(B.boss).map((fam) => ({ fam, broken: false })); /* 📜 #95 */ if (start === 'one') B.cells.forEach((c, i) => { if (i > 0) { c.broken = true; c.by = 0; } }); }
    if (start === 'aoe') { while (!B.ev.some((e) => e.k === 'boss' && e.aoe) && B.t < 60) tick(B, 0.1); }
    S = B; meIdx = mode === 'play' ? 0 : -1;
    bots = B.heroes.map((h) => newBot(L!, h.id, botKind, seed)).filter((b) => mode === 'watch' || b.who !== 0);
    phase = 'battle'; runKey++; /* 📜 #85 돌림 = Land(CSS 돌림 상자)만 · 전체 화면 · 방향 잠금 안 부름 */
  }
  function ended(B: State) {
    saveRec({ at: Date.now(), no: L!.no, diff, win: !!B.end?.win, sec: Math.round(B.t), who: B.heroes.map((h) => h.s.name).join('·'), seed, mode: mode === 'play' ? '직접' : '관전', r: runRecord(B, { no: L!.no, practice: true }) });
    phase = 'result';
  }
  const mastery = $derived(L ? recs.filter((r) => r.no === L!.no && r.win).length : 0);
  // ── 가로 화면 = Land 가 맡음 ──
  /** 📜 #85 안전망 = 혹시 남은 전체 화면 · 방향 잠금을 나갈 때 풂 (연습방 → 캠프 · 게시판이 세로로 돌아오게) */
  function unLand() { try { (screen.orientation as unknown as { unlock?: () => void }).unlock?.(); } catch { /* 무시 */ } try { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); } catch { /* 무시 */ } }
  onDestroy(unLand);
  const md = (t: number) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
</script>

{#if phase === 'setup'}
  <main class="setup" data-k="atb-setup">
    <h1>⚔ 게시판 던전 · 교사 연습방 <small>새 판(ATB) · 숫자 = 출발값 · 기록 = 이 폰 최근 5판만</small></h1>
    <section><b>차시</b><div class="chips">{#each lessons as p (p.id)}<button type="button" class:on={L?.id === p.id} data-no={p.no} onclick={() => (L = p)}>{p.no}차시{bossOf(p.no).draft ? ' ·초안' : ''}{#if UPLOADED.has(p.id)}<small class="srv" data-k="atb-srv"> 📦 서버 팩</small>{/if}</button>{/each}</div>
      {#if L}{@const B = bossArt(bossOf(L.no), diff)}<p class="sub">{B.name} · {B.type} · 대표 행동 「{B.signature}」 · 약점 {#each B.weak as f (f)}<FamShield fam={f} size={18} /> {FAM_NAME[f]} {/each} · 원문항 {originsOf(L).length}개{B.draft ? ' · ⏳ 공격 묶음은 설계 방 설정표 오면 바꿈' : ''}</p>{/if}</section>
    <section><b>난이도</b><div class="chips">{#each [['easy', '연습'], ['normal', '일반'], ['hard', '도전']] as [k, t] (k)}<button type="button" class:on={diff === k} onclick={() => (diff = k as Diff)}>{t}</button>{/each}</div></section>
    <section><b>방식</b><div class="chips"><button type="button" class:on={mode === 'play'} data-k="atb-mode-play" onclick={() => (mode = 'play')}>🙋 나 + 봇</button><button type="button" class:on={mode === 'watch'} data-k="atb-mode-watch" onclick={() => (mode = 'watch')}>👀 봇만 관전</button></div>
      <div class="chips">{#each [1, 2, 3, 4] as n (n)}<button type="button" class:on={size === n} onclick={() => (size = n)}>{n}인</button>{/each}</div>{#if size < 3}<p class="sub">⏳ 1 · 2인 숫자는 설계 방이 아직 맞추는 중(출발값 그대로)</p>{/if}</section>
    <section><b>용사</b>
      <div class="party">
        {#if mode === 'play'}<button type="button" class="hp me" data-k="atb-me-hero" onclick={() => (picking = -1)}><small>나</small>{nameOf(meHero)}<em>{ROLE_NAME[roleOf(meHero)]} · <FamShield fam={famOf(meHero)} size={14} /> {FAM_NAME[famOf(meHero)]}</em></button>{/if}
        {#each mates.slice(0, mode === 'play' ? size - 1 : size) as id, i (i)}<button type="button" class="hp" onclick={() => (picking = i)}><small>봇</small>{nameOf(id)}<em>{ROLE_NAME[roleOf(id)]} · <FamShield fam={famOf(id)} size={14} /> {FAM_NAME[famOf(id)]}</em></button>{/each}
      </div>
      {#if missRoles.length}<p class="sub" data-k="atb-miss-role">⚠ 이 팀엔 {missRoles.join(' · ')}가 없어요 · 그 공격은 막을 수 없어요 (🎯 단일 = 탱커 · 💥 광역 = 서포터 · 🌀 특수 = 딜러)</p>{/if}</section>
    <section><b>봇</b><div class="chips">{#each Object.entries(BOT_LABEL) as [k, t] (k)}<button type="button" class:on={botKind === k} onclick={() => (botKind = k as BotKind)}>{t}</button>{/each}</div></section>
    <section><b>키운 정도</b><div class="chips">{#each Object.entries(GROW) as [k, g] (k)}<button type="button" class:on={grow === k} onclick={() => (grow = k as typeof grow)}>{g.label}</button>{/each}</div></section>
    <section><b>시작 지점</b><div class="chips">{#each [['start', '전투 시작'], ['shield', '실드 등장 직전'], ['one', '실드 한 칸 남음'], ['aoe', '광역기 직후']] as [k, t] (k)}<button type="button" class:on={start === k} onclick={() => (start = k as typeof start)}>{t}</button>{/each}</div></section>
    <section class="row"><b>씨앗</b><span class="chips"><button type="button" class:on={seedNew} data-k="atb-seed-new" onclick={() => (seedNew = true)}>🎲 매번 새로</button><button type="button" class:on={!seedNew} data-k="atb-seed-fix" onclick={() => (seedNew = false)}>고정</button></span>{#if !seedNew}<input type="number" min="1" max="9999" bind:value={seed} aria-label="씨앗" />{:else}<small class="sub">지난 판 씨앗 {seed}</small>{/if}{#if mode === 'watch'}<span class="chips">{#each [1, 2, 4] as v (v)}<button type="button" class:on={speed === v} onclick={() => (speed = v)}>×{v}</button>{/each}</span>{/if}</section>
    {#if L && !atbReady(L)}<p class="noq" role="status" data-k="atb-noq">📝 이 차시는 아직 게시판 문제가 준비 중이에요</p>{/if}
    <button type="button" class="go" data-k="atb-start" disabled={!L || !atbReady(L)} onclick={begin}>⚔ 출발 (폰을 눕혀요)</button>
    {#if recs.length}<section><b>최근 {recs.length}판 (이 폰)</b><ol class="recs">{#each recs as r (r.at)}<li>{md(r.at)} · {r.no}차시 {({ easy: '연습', normal: '일반', hard: '도전' })[r.diff]} · {r.mode} · {r.win ? '✔ 승리' : '✘ 실패'} · {Math.floor(r.sec / 60)}분 {r.sec % 60}초 · {r.who} · 씨앗 {r.seed}{#if r.r}<br /><small data-k="atb-rec">📊 소문항 {r.r.subs}개 · 하나에 {r.r.subSecMed}초 · 타이밍 {r.r.timingOk ?? '−'}% · 충전 {r.r.charges ?? '−'} · 스킬 {Object.values(r.r.skills ?? {}).reduce((a, x) => a + (x ?? 0), 0)} · 쓰러짐 {r.r.downs} · {r.r.roles}</small>{/if}</li>{/each}</ol></section>{/if}
  </main>
{:else}
<!-- 🔄 게시판 던전만 가로 (📜 요청 #8): 세로 폰 = 화면 전체를 CSS 로 시계 방향 90° (폰 회전 잠금 그대로 · 눕혀 들기만) · 가로 잠금이 되는 폰 = 안 돌림 · 나오면 원래대로 -->
<Land z={1}>
{#if phase === 'battle' && S && L}
  {#key runKey}<AtbBattle {L} {S} me={meIdx} {bots} speed={mode === 'watch' ? speed : 1} seed={`me${seed}`} fx={Object.fromEntries(S.heroes.map((h) => [h.id, fxFor(h.s.hero)]))} {bg} onend={ended} onleave={() => { S = null; phase = 'setup'; }} />{/key} <!-- 🚪 #113 연습방 ‹ = 설정으로 -->
{:else if phase === 'result' && S && L}
  <AtbResult {S} no={L.no} me={meIdx} mastery={0} practiceWins={mastery} onagain={begin} onswap={() => { phase = 'setup'; picking = -1; }} onexit={() => (phase = 'setup')} />
{/if}
</Land>
{/if}
{#if picking != null && L}
  <!-- 🧙 📜 #135 B7 연습방 = 게시판과 같은 용사 확인 시트 + 강화 단계 줄 · 자세히(수치 · 덧효과) · 스킬 단계 미리 보기 -->
  <HeroSheet ids={ALL} owned={() => true} boss={bossOf(L.no)} no={L.no} cur={picking === -1 ? meHero : mates[picking]!} lv={GROW[grow].lv} enh={GROW[grow].enh} awk={grow === 'awk'} tierOf={tierFor} detail mainText="✔ 이 용사로" note="🧪 연습방 = 미리 보기 · 저장 안 됨" onskill={(id, t) => (skSel = { ...skSel, [id]: t })}
    onpick={(id) => { if (picking === -1) meHero = id; else mates[picking!] = id; picking = null; }} onclose={() => (picking = null)}>
    {#snippet extra()}<div class="gchips" data-k="hero-sheet-grow" role="group" aria-label="강화 단계">{#each Object.entries(GROW) as [k, g] (k)}<button type="button" class:on={grow === k} onclick={() => (grow = k as typeof grow)}>{g.label}</button>{/each}</div>{/snippet}
  </HeroSheet>
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
  /* 🔄 게시판 던전만 가로 (요청 #8): 안 돌림 = 상자 없음(display: contents) · 돌림 = 화면 오른쪽 위를 축으로 90° · 안의 fixed 화면들은 이 상자 기준
     안전 영역 = 돌린 뒤 왼쪽 = 폰 위(노치) · 오른쪽 = 폰 아래(홈 바) → --safe-l · --safe-r (전투 무대가 씀) */
  .gchips { display: flex; flex-wrap: wrap; gap: 6px; } .gchips button { min-height: 44px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text-2); font: 700 14px var(--font); } .gchips button.on { background: var(--accent); color: #2a1c05; }
</style>
