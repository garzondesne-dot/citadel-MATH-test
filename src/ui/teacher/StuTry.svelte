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
  const where = $derived(!R ? '' : isLobby(R) ? '대기실' : isEnd(L, R) ? '마무리' : R.state.rest ? '🏕 쉼터' : short(step));
</script>

<div class="try" data-k="stutry">
  <p class="note">{#if trial}<b>👩‍🏫 체험판 · {L.no}차시</b> · <span class="wh" data-k="try-where">{where}</span> · 🤖 친구 {nb}명 · 아래 「다음 ▶」 로 진행{:else}<b>🧪 🎒 {L.no}차시</b> · <span class="wh" data-k="try-where">{where}</span> · 🤖 {nb}명 · 기록 · 💎 안 남아요{/if}</p>
  <div class="ph">{#key code}<Student {S} {L} {code} uid="me" num={0} {nick} />{/key}{#if tvOn}<div class="tvw" data-k="try-tv"><TV {S} {L} live={{ code, cls: 'test', lesson: L.id, test: true }} now={clock.now} embed /></div>{/if}</div>
  <nav class="rbar" class:t={trial} aria-label="진행 리모컨" data-k="try-remote">
    <button type="button" aria-label="앞 단계" data-k="try-prev" disabled={!R || isLobby(R)} onclick={() => go(-1)}>◀</button>
    <button type="button" class="nx" aria-label="다음 단계" data-k="try-next" disabled={!R || isEnd(L, R)} onclick={() => go(1)}>다음 ▶</button>
    <button type="button" class:on={!!R?.state.rest} aria-pressed={!!R?.state.rest} aria-label="쉼터" data-k="try-rest" disabled={!R || isLobby(R)} onclick={() => { setRest(S, code, !R?.state.rest, 1); now = Date.now(); }}>🏕</button>
    <button type="button" class:on={!!R?.state.focus} aria-pressed={!!R?.state.focus} aria-label="집중" data-k="try-focus" disabled={!R || isLobby(R)} onclick={() => { setFocus(S, code, !R?.state.focus); now = Date.now(); }}>⏸</button>
    {#if trial}<button type="button" class:on={tvOn} aria-pressed={tvOn} aria-label="📺 TV 화면 보기" data-k="try-tv-btn" onclick={() => (tvOn = !tvOn)}>📺</button>{/if}
    <button type="button" class="x" aria-label={trial ? '체험 끝내기' : '테스트 끝내기'} data-k="try-close" onclick={() => onclose(!!R && isEnd(L, R))}>⏹</button>
  </nav>
</div>

<style>
  .try { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; background: var(--bg); }
  .note { margin: 0; padding: 6px 12px; font-size: 13px; color: var(--text-2); background: var(--surface); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .note b { color: #c79bff; } .wh { color: var(--accent); font-weight: 700; }
  .ph { flex: 1; min-height: 0; overflow: auto; position: relative; transform: translateZ(0); /* 학생 화면의 고정 칸(아래 단추 · 시트)이 이 칸 안에 = 진행 리모컨을 덮지 않음 */ }
  .tvw { position: absolute; inset: 0; z-index: 30; background: #000; display: grid; place-items: center; } /* 📺 체험판 = 학생 화면 위에 교실 TV(같은 방) */
  .rbar.t { grid-template-columns: 48px 1fr 48px 48px 48px 48px; }
  .rbar { display: grid; grid-template-columns: 52px 1fr 52px 52px 52px; gap: 6px; padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)); background: var(--surface); border-top: 2px solid #8b5cf6; }
  .rbar button { min-height: 48px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .rbar button:disabled { opacity: 0.4; } .rbar .nx { background: var(--accent); color: var(--on-accent); border: 0; } .rbar .on { border: 2px solid var(--accent); } .rbar .x { border-color: var(--bad); }
</style>
