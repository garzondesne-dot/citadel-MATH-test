<script lang="ts">
  // 🧪 🎒 학생 폰 테스트 (📜 2026-11-17 #21 · 옛 준비 탭 「🎒 학생으로 해 보기」를 대신함 · 수업 탭 ① 🧪 → ③ 🎒)
  //   폰 하나로 학생 화면 그대로 그 차시 처음 ~ 끝 · 맨 아래 🎮 진행 리모컨 · 🤖 봇(raid/bots.ts = 체험판 · 🧪 테스트와 같은 엔진)이 같이 공격(공동 체력 실제처럼)
  //   이 기기 메모리 방 = 서버 · 반 기록 · 💎 아무것도 안 남음 (학생 기록은 서버 계정 폰만 씀 · 교사 폰은 그 계정이 아님)
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { memoryStore } from '../../store/device';
  import { PROFILES } from '../../model/profiles';
  import { nextStep, openRoom, prevStep, roomPath, setFocus, setRest } from '../../raid/actions';
  import { isEnd, isLobby, stepOf } from '../../raid/raid';
  import { startBots } from '../../raid/bots';
      import Student from '../Student.svelte';
  import { short } from './flow';
  import TV from '../tv/TV.svelte';
  import { clock } from '../clock.svelte';
  import Sheet from '../battle/Sheet.svelte';
  import { driveFun, endRest, funOf, gamesOn, lgGo, startFun, stopFun, type Game } from '../../rest/run';

  const { L, onclose, bots: nb = 4, prep, restAfter = '', nick = '나', trial = false }: { L: LessonPack; /** ended = 마무리까지 갔나 (👩‍🏫 체험판 첫 차시 보상) */ onclose: (ended?: boolean) => void; /** 🤖 봇 수 (📜 2026-11-17 #21 · 0~30 · 기본 5) */ bots?: number;
    /** 👩‍🏫 체험판 (#33): 방 설정 · 이 몬스터 다음 「다음 ▶」 = 🏕 쉼터 먼저 · 이름 · 📺 TV 화면 단추 */ prep?: (S: Store, code: string) => void; restAfter?: string; nick?: string; trial?: boolean } = $props();
  const S: Store = untrack(() => ({ ...memoryStore(), kind: 'memory' as const }));
  const code = untrack(() => `TRY${L.no}${Math.floor(Math.random() * 1e4)}`);
  untrack(() => { openRoom(S, L, code, PROFILES.test); S.set(`${roomPath(code)}/meta/solve`, 15); prep?.(S, code); }); // 🌫 정찰 15초 (학생 화면 그대로 · 혼자 해 보기라 짧게)
  const bots = untrack(() => (nb > 0 ? startBots(S, L, code, nb, { speed: 1 }) : null));
  // 🎮 진행 리모컨 (📜 2026-11-17 #21 「🎒 학생 폰 = 맨 아래 진행 리모컨」): 저절로 넘기기 없음 · 교사가 ◀ · 다음 ▶ · 🏕 · ⏸ · ⏹ 로 진행 (리모컨과 같은 함수)
  let now = $state(Date.now());
  const iv = setInterval(() => (now = Date.now()), 1000);
  const R = $derived.by(() => { void now; return S.get<Room>(roomPath(code)); });
  const step = $derived(R ? stepOf(L, R) : null);
  onDestroy(() => { clearInterval(iv); bots?.stop(); });
  let rested = false, tvOn = $state(false);
  const go = (d: 1 | -1) => { if (d > 0 && restAfter && !rested && !R?.state.rest && step?.id === restAfter) { rested = true; setRest(S, code, true, 1); now = Date.now(); return; } // 👩‍🏫 체험판 흐름: 문제 1 → 🏕 쉼터 → 다음
    if (R?.state.rest) setRest(S, code, false); if (d > 0) nextStep(S, L, code); else prevStep(S, L, code); now = Date.now(); };
  // 🐞 11/24 🔨 #16 선생님 「학생폰 기준으로 쉼터 게임 못 골라」: 🎒 학생 폰 테스트 · 체험판엔 교사가 없음 → 🏕(쉼터 중) = 「놀이 고르기(선생님 대신)」 창 · 놀이 시계도 이 폰이 맡음 · 모이는 중 「다음 ▶」 자리 = 「▶ 출발 n명」
  const stopDrive = untrack(() => driveFun(S, code, 'tp'));
  onDestroy(() => stopDrive());
  let pick = $state(false), pickErr = $state('');
  const fun = $derived(funOf(R));
  const joinN = $derived(!R?.state.rest || !fun || fun.phase !== 'join' || !['ak', 'lg'].includes(fun.kind as string) ? -1 : Object.keys(((R as unknown as { fv?: Record<string, Record<string, unknown>> }).fv?.[`${fun.kind}${fun.g}_j`]) || {}).length);
  function restBtn() { if (!R) return; if (!R.state.rest) { setRest(S, code, true, 1); pick = true; } else pick = true; pickErr = ''; now = Date.now(); }
  function choose(k: Game) { if (!R) return; const e = startFun(S, code, R, k, { which: 'now', no: L.no, me: 'tp' }); pickErr = e || ''; if (!e) pick = false; now = Date.now(); }
  const where = $derived(!R ? '' : isLobby(R) ? '대기실' : isEnd(L, R) ? '마무리' : R.state.rest ? '🏕 쉼터' : short(step));
</script>

<div class="try" data-k="stutry">
  <p class="note">{#if trial}<b>👩‍🏫 체험판 · {L.no}차시</b> · <span class="wh" data-k="try-where">{where}</span> · 🤖 친구 {nb}명 · 아래 「다음 ▶」 로 진행{:else}<b>🧪 🎒 {L.no}차시</b> · <span class="wh" data-k="try-where">{where}</span> · 🤖 {nb}명 · 기록 · 💎 안 남아요{/if}</p>
  <div class="ph">{#key code}<Student {S} {L} {code} uid="me" num={0} {nick} />{/key}{#if tvOn}<div class="tvw" data-k="try-tv"><TV {S} {L} live={{ code, cls: 'test', lesson: L.id, test: true }} now={clock.now} embed /></div>{/if}</div>
  <nav class="rbar" class:t={trial} aria-label="진행 리모컨" data-k="try-remote">
    <button type="button" aria-label="앞 단계" data-k="try-prev" disabled={!R || isLobby(R)} onclick={() => go(-1)}>◀</button>
    {#if joinN >= 0}<button type="button" class="nx" data-k="try-go" onclick={() => { if (joinN < 2) { pickErr = '2명부터 시작해요'; pick = true; } else lgGo(S, code); now = Date.now(); }}>▶ {fun?.kind === 'ak' ? '🥏' : '🏁'} 출발 {joinN}명</button>{:else}<button type="button" class="nx" aria-label="다음 단계" data-k="try-next" disabled={!R || isEnd(L, R)} onclick={() => go(1)}>다음 ▶</button>{/if}
    <button type="button" class:on={!!R?.state.rest} aria-pressed={!!R?.state.rest} aria-label="쉼터" data-k="try-rest" disabled={!R || isLobby(R)} onclick={restBtn}>🏕</button>
    <button type="button" class:on={!!R?.state.focus} aria-pressed={!!R?.state.focus} aria-label="집중" data-k="try-focus" disabled={!R || isLobby(R)} onclick={() => { setFocus(S, code, !R?.state.focus); now = Date.now(); }}>⏸</button>
    {#if trial}<button type="button" class:on={tvOn} aria-pressed={tvOn} aria-label="📺 TV 화면 보기" data-k="try-tv-btn" onclick={() => (tvOn = !tvOn)}>📺</button>{/if}
    <button type="button" class="x" aria-label={trial ? '체험 끝내기' : '테스트 끝내기'} data-k="try-close" onclick={() => onclose(!!R && isEnd(L, R))}>⏹</button>
  </nav>
  {#if pick && R}
    <Sheet onclose={() => (pick = false)} mainText="🏁 쉼터 끝내기" onmain={() => { endRest(S, code); pick = false; now = Date.now(); }}>
      {#snippet title()}🏕 놀이 고르기 <small>(선생님 대신)</small>{/snippet}
      <div class="games" data-k="try-games">{#each gamesOn() as g (g.k)}<button type="button" data-k="try-game-{g.k}" disabled={!!fun} onclick={() => choose(g.k)}><i>{g.ic}</i>{g.name}</button>{/each}</div>
      {#if fun}<button type="button" class="stopf" data-k="try-fun-stop" onclick={() => { stopFun(S, code); now = Date.now(); }}>⏹ 이 놀이 그만 · 다른 놀이 고르기</button>{/if}
      {#if pickErr}<p class="perr" data-k="try-pick-err">{pickErr}</p>{/if}
    </Sheet>
  {/if}
</div>

<style>
  .try { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; background: var(--bg); }
  .note { margin: 0; padding: 6px 12px; font-size: 13px; color: var(--text-2); background: var(--surface); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .note b { color: #c79bff; } .wh { color: var(--accent); font-weight: 700; }
  .ph { flex: 1; min-height: 0; overflow: auto; position: relative; transform: translateZ(0); /* 학생 화면의 고정 칸(아래 단추 · 시트)이 이 칸 안에 = 진행 리모컨을 덮지 않음 */ }
  .tvw { position: absolute; inset: 0; z-index: 30; background: #000; display: grid; place-items: center; } /* 📺 체험판 = 학생 화면 위에 교실 TV(같은 방) */
  .rbar.t { grid-template-columns: 48px 1fr 48px 48px 48px 48px; }
  .rbar { display: grid; grid-template-columns: 52px 1fr 52px 52px 52px; gap: 6px; padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)); background: var(--surface); border-top: 2px solid #8b5cf6; }
  .rbar button { min-height: 48px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .games { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .games button { min-height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .games button:disabled { opacity: 0.4; } .games i { font-style: normal; font-size: 22px; }
  .stopf { margin-top: 12px; width: 100%; min-height: 48px; border-radius: var(--r-sm); border: 1px solid var(--bad); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); }
  .perr { margin: 8px 0 0; color: var(--bad); font-size: 14px; }
  .rbar button:disabled { opacity: 0.4; } .rbar .nx { background: var(--accent); color: var(--on-accent); border: 0; } .rbar .on { border: 2px solid var(--accent); } .rbar .x { border-color: var(--bad); }
</style>
