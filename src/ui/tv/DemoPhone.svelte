<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { memoryStore } from '../../store/device';
  import { roomPath } from '../../raid/actions';
  import { answerOf, BOSS_ID, bossState, chainRecord, isChain, itemsFor, bossItem as bossItemR, plainRecord, stepOf } from '../../raid/raid';
  import { penLine, stripNo } from '../../engine/input';
  import Student from '../Student.svelte';
  // 🎮 선생님 시연 = 학생 폰 화면 그대로 (#157 덧붙임 · 🪞): 학생 폰 틀(390 × 844)을 통째로 넣고 비율 그대로 키움(TV 높이에 맞춤)
  //   문제 · 숫자 규칙 · 부품(장면 띠 · 답안 줄 · 칩 · 룬 · 노란 주요 단추 56/20 · 도전 칸) = 학생과 같은 Student 화면
  //   다른 점 = 이 기기 메모리 방(데미지 · 기록 없음 · 실제 수업 방에 쓰지 않음) · 정찰 없음 · 💡 정답 펼치기 · 🔄 숫자 바꿔 다시 · ✕ 닫기
  const { L, R, code, onclose }: { L: LessonPack; R: Room; code: string; onclose: () => void } = $props();
  const PW = 390, PH = 844;
  let round = $state(0), reveal = $state(false), boxH = $state(0), boxW = $state(0);
  const k = $derived(boxH ? Math.min(boxH / PH, boxW / PW) : 0.6);
  const S: Store = untrack(() => ({ ...memoryStore(), kind: 'memory' as const }));
  // 판마다 다른 방 = 숫자가 바뀜 (seed = 방 코드) · 방을 먼저 만들고 나서 학생 화면을 띄움(접속 신호가 빈 방을 만들지 않게)
  //   실제 방 규칙 그대로(재도전 · 체력 기준 …) · 정찰만 끔 · 지금 단계로 바로
  function mk(n: number) { const c = `${code}D${n}`; S.set(roomPath(c), { meta: { ...R.meta, code: c, solve: 0, created: S.now() }, state: { step: R.state.step, stepAt: S.now() } }); return c; }
  let dcode = $state(untrack(() => mk(0)));
  const again = () => { round += 1; dcode = mk(round); };
  const D = $derived.by(() => { void tick; return S.get<Room>(roomPath(dcode)); });
  let tick = $state(0); const iv = setInterval(() => tick++, 500); $effect(() => () => clearInterval(iv));
  // 💡 지금 문제의 정답 (학생 폰과 같은 숫자 · 같은 함수)
  const ans = $derived.by(() => {
    if (!D) return [] as string[]; const st = stepOf(L, D); if (!st) return [];
    const line = (q: Parameters<typeof answerOf>[0], i: number) => { const l = penLine(q, answerOf(q), i); return l ? stripNo(l) : q.solution || ''; };
    if (st.kind === 'boss') { const bs = bossState(L, D, 'demo'); return bs.map((x, i) => { const q = bossItemR(L, D, 'demo', i, x.next); return q ? `${i + 1}번 ${line(q, i)}` : ''; }); }
    if (st.kind !== 'monster' || !L.monsters[st.id]) return [];
    if (isChain(L, D, st.id)) { const r = chainRecord(L, D, st.id, 'demo'); const q = r.items[Math.min(r.stage, r.n - 1)]; return q ? [`${r.stage < r.n - 1 ? `졸개 ${'①②③④⑤⑥'[r.stage]}` : '대장'} ${line(q, r.stage)}`] : []; }
    const rec = plainRecord(L, D, st.id, 'demo'); return itemsFor(L, D, st.id, 'demo', rec.nextAttempt).map((q, i) => `${i + 1}) ${line(q, i)}`);
  });
  void BOSS_ID;
</script>

<div class="dp" role="dialog" aria-label="선생님 시연">
  <div class="bar">
    <b>🎮 시연</b><span class="tag">데미지 · 기록 없음</span>
    <button type="button" onclick={() => (reveal = !reveal)}>💡 정답 {reveal ? '접기' : '펼치기'}</button>
    <button type="button" onclick={again}>🔄 숫자 바꿔 다시</button>
    <button type="button" onclick={onclose}>✕ 닫기</button>
  </div>
  {#if reveal && ans.length}<p class="rev">💡 {ans.join(' · ')}</p>{/if}
  <div class="box" bind:clientHeight={boxH} bind:clientWidth={boxW}>
    {#key dcode}
      <div class="phone" style:width="{PW}px" style:height="{PH}px" style:transform="scale({k})">
        <div class="scr"><Student {S} {L} code={dcode} uid="demo" num={0} nick="시연" board /></div>
      </div>
    {/key}
  </div>
</div>

<style>
  .dp { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 0.8cqh; padding: 0.8cqh 0.8cqw; background: rgba(8, 9, 12, 0.92); }
  .bar { display: flex; align-items: center; gap: 0.6cqw; flex-wrap: wrap; font-size: var(--tv-small); }
  .bar b { font-size: var(--tv-body); }
  .tag { padding: 0.2cqh 0.6cqw; border-radius: 99px; border: 1px solid var(--accent); color: var(--accent); }
  .bar button { margin-left: auto; height: 4cqh; padding: 0 0.8cqw; border-radius: 1cqh; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.08); color: #fff; font-size: var(--tv-small); cursor: pointer; }
  .bar button + button { margin-left: 0; }
  .rev { margin: 0; font-size: var(--tv-small); color: #ffe7a6; }
  .box { flex: 1; min-height: 0; display: flex; justify-content: center; overflow: hidden; }
  /* 폰 틀: transform 이 있는 상자 = 안쪽 「화면 바닥 고정」(주요 단추 · 시트)이 이 틀 기준이 됨 → 학생 폰과 같은 자리 */
  .phone { flex: none; transform-origin: top center; border-radius: 28px; overflow: hidden; box-shadow: 0 0 0 6px #1b1d24, 0 10px 40px rgba(0, 0, 0, 0.6); background: var(--bg); color: var(--text); font-family: var(--font); font-size: 16px; }
  .scr { position: relative; width: 100%; height: 100%; overflow: auto; }
  .scr :global(.edge .back) { pointer-events: none; opacity: 0.4; } /* 시연에선 뒤로 가지 않음 */
</style>
