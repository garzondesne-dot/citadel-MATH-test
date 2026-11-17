<script lang="ts">
  // 🧪 🖥 종합실 + 리모컨 한 화면 (📜 2026-11-17 #21 · 수업 탭 ① 🧪 → ③ 🖥): 위 = 교실 TV(16:9) · 아래 = 교사 폰 리모컨 · 이 폰 하나로 수업 한 판
  //   이 기기 메모리 방 = 서버 · 반 기록 · 💎 아무것도 안 남음 · 🤖 봇(raid/bots.ts · 체험판 · 📱 테스트와 같은 엔진) · ⛶ = TV 크게
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import { memoryStore } from '../../store/device';
  import { PROFILES } from '../../model/profiles';
  import { openRoom, roomPath } from '../../raid/actions';
  import { setBots, botsOff } from '../../raid/botRun.svelte';
  import { clock } from '../clock.svelte';
  import type { Live } from '../../school/school';
  import TV from '../tv/TV.svelte';
  import TLive from './TLive.svelte';
  import './teacher.css';

  const { L, bots = 5, onclose, prep, trial = false }: { L: LessonPack; bots?: number; onclose: () => void; /** 👩‍🏫 체험판 (#33): 방 설정 · 넓으면 TV 왼쪽 + 리모컨 오른쪽 · 폰 폭 = 리모컨 + 📺 */ prep?: (S: Store, code: string) => void; trial?: boolean } = $props();
  const S: Store = untrack(() => ({ ...memoryStore(), kind: 'memory' as const }));
  const code = untrack(() => `SIM${L.no}${Math.floor(Math.random() * 1e4)}`);
  const live: Live = untrack(() => ({ code, cls: 'test', lesson: L.id, test: true }));
  untrack(() => { openRoom(S, L, code, PROFILES.test); S.set(`${roomPath(code)}/meta/solve`, 15); S.set(`${roomPath(code)}/meta/cls`, 'test'); S.set('school/live', live); prep?.(S, code); if (bots > 0) setBots(S, L, code, true, bots); });
  onDestroy(botsOff);
  let big = $state(false);
</script>

<div class="sim" class:big class:trial data-k="tsim">
  {#if trial}<div class="tbar" data-k="sim-bar"><b>👩‍🏫 체험판 · {L.no}차시</b><span class="pcnote" data-k="sim-pc">💻 PC 에서 보면 TV 와 리모컨이 나란히</span><button type="button" class="tvb" data-k="sim-tv" aria-pressed={big} onclick={() => (big = !big)}>{big ? '📱 리모컨' : '📺 TV 화면'}</button><button type="button" class="tx" data-k="sim-close" onclick={onclose}>⏹ 체험 끝</button></div>{/if}
  <div class="body">
    <div class="tvbox"><TV {S} {L} {live} now={clock.now} embed /><button type="button" class="bigb" data-k="sim-big" aria-label={big ? 'TV 작게' : 'TV 크게'} onclick={() => (big = !big)}>{big ? '↙ 작게' : '⛶ 크게'}</button></div>
    {#if !big}<div class="rem tp"><TLive {S} {L} {live} now={clock.now} onhome={() => {}} onclose={onclose} /></div>{/if}
  </div>
  {#if !trial}<button type="button" class="x" data-k="sim-close" onclick={onclose}>⏹ 테스트 끝</button>{/if}
</div>

<style>
  .sim { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; background: var(--bg); }
  .body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .tvbox { position: relative; flex: none; width: 100%; border-bottom: 2px solid #8b5cf6; }
  .sim.big .tvbox { flex: 1; display: grid; place-items: center; }
  .bigb, .x { position: absolute; z-index: 20; min-height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: rgba(0, 0, 0, 0.6); color: #fff; font: 700 13px var(--font); }
  .bigb { right: 6px; bottom: 6px; }
  .x { right: 6px; top: 6px; border-color: var(--bad); }
  .rem.tp { flex: 1; min-height: 0; height: auto; }
  /* 👩‍🏫 체험판: 맨 위 막대(체험판 · 차시 · 📺 · ⏹) = 리모컨 머리와 안 겹침 · 넓으면(900+) TV 왼쪽 크게 + 리모컨 오른쪽 · 좁으면 리모컨만 + 📺 로 TV 화면 */
  .tbar { flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--surface); border-bottom: 1px solid var(--line); }
  .tbar b { font-size: 15px; white-space: nowrap; } .pcnote { flex: 1; min-width: 0; font-size: 13px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; visibility: hidden; }
  .tvb, .tx { flex: none; min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--accent); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .tx { border-color: var(--bad); } .tvb { display: none; }
  @media (max-width: 899px) { .sim.trial:not(.big) .tvbox { position: fixed; width: 1px; height: 1px; overflow: hidden; opacity: 0; } .sim.trial .pcnote { visibility: visible; } .sim.trial .tvb { display: block; } .sim.trial .bigb { display: none; } }
  @media (max-width: 480px) { .sim.trial .pcnote { display: none; } .tbar b { flex: 1; overflow: hidden; text-overflow: ellipsis; } }
  @media (min-width: 900px) { .sim.trial .body { flex-direction: row; } .sim.trial .tvbox { flex: 1; align-self: center; border-bottom: 0; border-right: 2px solid #8b5cf6; } .sim.trial .rem.tp { flex: none; width: 420px; } .sim.trial .bigb { display: none; } }
</style>
