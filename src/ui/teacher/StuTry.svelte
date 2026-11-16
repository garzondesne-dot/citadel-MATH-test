<script lang="ts">
  // 🎒 학생으로 해 보기 (📜 2026-11-16 선생님 「3. 가상 친구 넣어 줘」 · DECISIONS 「📋 교사 준비 탭 2개」 · 시안 Se2dj6YN ④)
  //   폰 하나로 학생 화면 그대로 그 차시 처음 ~ 끝: 도입 → 개념(✔ 체크가 있으면 띄움) → 몬스터 → 🏕 쉼터(가운데쯤 한 번) → 👑 형성평가
  //   단계는 저절로 넘어감 + 위 막대 ⏮ ⏭ 로 건너뛰기 · 가상 친구 4명(raid/bots.ts = 체험판 · 🧪 테스트와 같은 엔진)이 같이 공격(공동 체력 실제처럼)
  //   이 기기 메모리 방 = 서버 · 반 기록 · 💎 아무것도 안 남음 (학생 기록은 서버 계정 폰만 씀 · 교사 폰은 그 계정이 아님)
  import { onDestroy, untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { memoryStore } from '../../store/device';
  import { PROFILES } from '../../model/profiles';
  import { nextStep, openRoom, prevStep, roomPath, setRest } from '../../raid/actions';
  import { bossHp, cleared, isEnd, isLobby, stepOf } from '../../raid/raid';
  import { startBots } from '../../raid/bots';
  import { openCC } from '../../school/cc';
  import { feat } from '../../school/features.svelte';
  import Student from '../Student.svelte';
  import { short } from './flow';

  const { L, onclose }: { L: LessonPack; onclose: () => void } = $props();
  const S: Store = untrack(() => ({ ...memoryStore(), kind: 'memory' as const }));
  const code = untrack(() => `TRY${L.no}${Math.floor(Math.random() * 1e4)}`);
  untrack(() => { openRoom(S, L, code, PROFILES.test); S.set(`${roomPath(code)}/meta/solve`, 15); }); // 🌫 정찰 15초 (학생 화면 그대로 · 혼자 해 보기라 짧게)
  const bots = untrack(() => startBots(S, L, code, 4, { speed: 1 }));
  // ⏩ 저절로 넘기기: 대기실 2초 · 도입 8초 · 개념 10초(✔ 체크가 있으면 체크 30초 뒤) · 몬스터 = 쓰러지면 3초 · 쉼터 = 가운데 몬스터 뒤 한 번 20초 · 👑 = 이기면 끝
  let at = Date.now(), seen = '', ccDone = new Set<string>(), restDone = false, auto = $state(true), now = $state(Date.now());
  const R = $derived.by(() => { void now; return S.get<Room>(roomPath(code)); });
  const step = $derived(R ? stepOf(L, R) : null);
  const mons = untrack(() => L.steps.filter((s) => s.kind === 'monster' && !s.later));
  const iv = setInterval(() => {
    now = Date.now();
    const r = S.get<Room>(roomPath(code)); if (!r || !auto) return;
    const st = stepOf(L, r), key = `${r.state.step}`;
    if (key !== seen) { seen = key; at = now; }
    const t = (now - at) / 1000;
    if (isLobby(r)) { if (t > 2) nextStep(S, L, code); return; }
    if (isEnd(L, r) || !st) return;
    if (r.state.rest) { if (t > 20) { setRest(S, code, false); at = now; } return; }
    if (st.kind === 'intro' && t > 8) nextStep(S, L, code);
    else if (st.kind === 'concept') {
      if (st.check && feat('cc') && !ccDone.has(st.id) && t > 4) { ccDone.add(st.id); openCC(S, code, st.id); at = now; return; }
      if (t > (ccDone.has(st.id) ? 32 : 10)) nextStep(S, L, code);
    } else if (st.kind === 'monster' && cleared(L, r, st.id, now)) {
      if (t > 3 && !restDone && mons.findIndex((m) => m.id === st.id) === Math.ceil(mons.length / 2) - 1) { restDone = true; setRest(S, code, true, 1); at = now; return; }
      if (t > 3) nextStep(S, L, code);
    } else if (st.kind === 'boss' && bossHp(L, r, now).won && t > 3) nextStep(S, L, code);
  }, 1000);
  // 몬스터가 쓰러진 순간부터 3초를 세도록 (쓰러짐 = 새 기준)
  let downSeen = '';
  $effect(() => { const r = R, st = step; if (!r || !st || st.kind !== 'monster') return; const d = cleared(L, r, st.id, now); untrack(() => { if (d && downSeen !== st.id) { downSeen = st.id; at = Date.now(); } }); });
  onDestroy(() => { clearInterval(iv); bots.stop(); });
  const go = (d: 1 | -1) => { if (d > 0) nextStep(S, L, code); else prevStep(S, L, code); seen = ''; };
  const where = $derived(!R ? '' : isLobby(R) ? '대기실' : isEnd(L, R) ? '마무리' : R.state.rest ? '🏕 쉼터' : short(step));
</script>

<div class="try" data-k="stutry">
  <div class="tbar2"><b aria-label="학생으로 해 보기 {L.no}차시">🎒 {L.no}차시</b><span class="wh" data-k="try-where">{where}</span>
    <button type="button" aria-label="앞 단계" data-k="try-prev" onclick={() => go(-1)}>⏮</button>
    <button type="button" aria-label="다음 단계" data-k="try-next" onclick={() => go(1)}>⏭</button>
    <button type="button" class:off={!auto} aria-pressed={auto} aria-label={auto ? '저절로 넘기는 중 · 누르면 멈춤' : '멈춤 · 누르면 저절로'} data-k="try-auto" onclick={() => (auto = !auto)}>{auto ? '⏩' : '⏸'}</button>
    <button type="button" class="x" data-k="try-close" onclick={onclose} aria-label="끝내기">✕</button></div>
  <p class="note">🎒 학생으로 해 보기 · 친구 4명(🤖)이 같이 공격 · 기록 · 💎 안 남아요</p>
  <div class="ph">{#key code}<Student {S} {L} {code} uid="me" num={0} nick="나" />{/key}</div>
</div>

<style>
  .try { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; background: var(--bg); }
  .tbar2 { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: var(--surface); border-bottom: 1px solid var(--line); }
  .tbar2 b { font-size: 14px; } .wh { flex: 1; min-width: 0; font-size: 13px; color: var(--accent); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tbar2 button { min-height: 44px; min-width: 44px; padding: 0 10px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  .tbar2 button.off { color: var(--text-2); } .tbar2 .x { border-color: var(--accent); }
  .note { margin: 0; padding: 4px 12px; font-size: 13px; color: var(--text-2); background: var(--surface); }
  .ph { flex: 1; min-height: 0; overflow: auto; position: relative; }
</style>
