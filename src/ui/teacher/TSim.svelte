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

  const { L, bots = 5, onclose }: { L: LessonPack; bots?: number; onclose: () => void } = $props();
  const S: Store = untrack(() => ({ ...memoryStore(), kind: 'memory' as const }));
  const code = untrack(() => `SIM${L.no}${Math.floor(Math.random() * 1e4)}`);
  const live: Live = untrack(() => ({ code, cls: 'test', lesson: L.id, test: true }));
  untrack(() => { openRoom(S, L, code, PROFILES.test); S.set(`${roomPath(code)}/meta/solve`, 15); S.set(`${roomPath(code)}/meta/cls`, 'test'); S.set('school/live', live); if (bots > 0) setBots(S, L, code, true, bots); });
  onDestroy(botsOff);
  let big = $state(false);
</script>

<div class="sim" class:big data-k="tsim">
  <div class="tvbox"><TV {S} {L} {live} now={clock.now} embed /><button type="button" class="bigb" data-k="sim-big" aria-label={big ? 'TV 작게' : 'TV 크게'} onclick={() => (big = !big)}>{big ? '↙ 작게' : '⛶ 크게'}</button></div>
  {#if !big}<div class="rem tp"><TLive {S} {L} {live} now={clock.now} onhome={() => {}} onclose={onclose} /></div>{/if}
  <button type="button" class="x" data-k="sim-close" onclick={onclose}>⏹ 테스트 끝</button>
</div>

<style>
  .sim { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; background: var(--bg); }
  .tvbox { position: relative; flex: none; width: 100%; border-bottom: 2px solid #8b5cf6; }
  .sim.big .tvbox { flex: 1; display: grid; place-items: center; }
  .bigb, .x { position: absolute; z-index: 20; min-height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: rgba(0, 0, 0, 0.6); color: #fff; font: 700 13px var(--font); }
  .bigb { right: 6px; bottom: 6px; }
  .x { right: 6px; top: 6px; border-color: var(--bad); }
  .rem.tp { flex: 1; min-height: 0; height: auto; }
</style>
