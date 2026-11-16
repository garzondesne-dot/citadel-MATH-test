<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Room, Store } from '../../model/types';
  import { memoryStore } from '../../store/device';
  import { roomPath } from '../../raid/actions';
  import { teacherLook, type TLook } from '../../store/me.svelte';
  import { NAMES, tierOf } from '../fx/fx';
  import { answerOf, BOSS_ID, bossRecord, V4, bossState, chainRecord, isChain, itemsFor, bossItem as bossItemR, plainRecord, stepOf } from '../../raid/raid';
  import { penLine, stripNo } from '../../engine/input';
  import Student from '../Student.svelte';
  // 🎮 선생님 시연 = 학생 폰의 문제 카드부터 아래만 (📜 2026-11-14 선생님 「전투 장면은 없애도 될 것 같아」 · 🪞 문제 꼴 · 단계 · 숫자 = 같은 Student 함수)
  //   폭 390 학생 화면을 창 폭에 맞춰 키움(3m 거리에서 읽히게) · 높이 = 창 높이 ÷ 배율 · 넘치면 안에서 스크롤
  //   문제 · 숫자 규칙 · 부품(장면 띠 · 답안 줄 · 칩 · 룬 · 노란 주요 단추 56/20 · 도전 칸) = 학생과 같은 Student 화면
  //   다른 점 = 이 기기 메모리 방(데미지 · 기록 없음 · 실제 수업 방에 쓰지 않음) · 정찰 없음 · 💡 정답 펼치기 · 🔄 숫자 바꿔 다시 · ✕ 닫기
  const { L, R, code, onclose, onstrike, tlook = null }: { L: LessonPack; R: Room; code: string; /** 👩‍🏫 교사 계정 「내 용사」(school/tlook) */ tlook?: TLook | null; onclose: () => void; /** 🧑‍🏫 다 맞힘 → 선생님 일격 (ult = ⚡ 필살기) */ onstrike?: (ult: boolean) => void } = $props();
  const PW = 390;
  let round = $state(0), reveal = $state(false), boxH = $state(0), boxW = $state(0);
  // 📐 한 화면 (📜 2026-11-14 「웬만하면 스크롤 안 되면 좋겠어」): 배율 = min(폭 배율, 높이 배율) · 문제 글자가 TV 에서 약 20px(학생 15px × 1.35) 아래로는 안 줄임 · 상태가 바뀔 때마다 다시 맞춤(0.5초마다 내용 높이를 잼)
  let need = $state(0), qfs = $state(15), scr = $state<HTMLDivElement | null>(null);
  // 문제 글(.q2) 하한 = 1080p TV 에서 20px · 작은 화면은 그 비율로 (1366 × 768 = 약 14px)
  const tvH = () => (typeof window === 'undefined' ? 1080 : Math.min(window.innerHeight, (window.innerWidth * 9) / 16));
  const K_MIN = $derived.by(() => { void boxH; return (20 * (tvH() / 1080)) / Math.max(10, qfs); });
  const k = $derived.by(() => { if (!boxW) return 1; const kw = Math.min(boxW / PW, 3), kh = need && boxH ? boxH / need : kw; return Math.max(Math.min(kw, K_MIN), Math.min(kw, kh)); });
  const PH = $derived(boxH && k ? boxH / k : 844);
  // 🐞 (📜 2026-11-15 「풀이 칸과 테두리 사이 공백 · 테두리까지 맞춰 늘려」): 폭도 칸에 맞춤 = 배율 k 는 그대로(글자 크기 그대로) · 폰 폭 = 칸 폭 ÷ k (390 아래로는 안 줄임)
  let PWv = $state(PW);
  $effect(() => { const w = boxW && k ? Math.max(PW, Math.floor(boxW / k)) : PW; if (Math.abs(w - untrack(() => PWv)) > 3) PWv = w; }); // 3px 넘게 바뀔 때만 (폭 ↔ 내용 높이 ↔ 배율이 서로 쫓는 고리 막기)
  $effect(() => { void tick; const el = scr; if (!el) return; const body = el.querySelector('section.body') as HTMLElement | null, act = el.querySelector('.act.dock') as HTMLElement | null; if (!body) return; const h = body.offsetTop + body.scrollHeight + 4; void act; /* 아래 단추 자리(spacer)는 body 안에 이미 있음 */ if (Math.abs(h - need) > 2 && Date.now() - fitAt < 1500) need = h; /* 📜 2026-11-16 선생님 「보기 단추 누르면 화면이 재조정 · 규격이 바뀜」 = 문제가 바뀐 뒤 1.5초만 맞추고 그다음엔 배율 고정 */ const q = el.querySelector('.q2, .qt') as HTMLElement | null; if (q) { const f = parseFloat(getComputedStyle(q).fontSize) || 15; if (f !== qfs) qfs = f; } });
  const S: Store = untrack(() => ({ ...memoryStore(), kind: 'memory' as const }));
  // 판마다 다른 방 = 숫자가 바뀜 (seed = 방 코드) · 방을 먼저 만들고 나서 학생 화면을 띄움(접속 신호가 빈 방을 만들지 않게)
  //   실제 방 규칙 그대로(재도전 · 체력 기준 …) · 정찰만 끔 · 지금 단계로 바로
  function mk(n: number) { const c = `${code}D${n}`; S.set(roomPath(c), { meta: { ...R.meta, code: c, solve: 0, created: S.now() }, state: { step: R.state.step, stepAt: S.now() } }); return c; }
  let dcode = $state(untrack(() => mk(0)));
  const again = () => { round += 1; dcode = mk(round); };
  const D = $derived.by(() => { void tick; return S.get<Room>(roomPath(dcode)); });
  // 📐 배율 맞춤 열쇠 = 판 · 단계 · 문항(소레이드 단계) — 바뀌면 다시 1.5초 맞춤
  let fitKey = '', fitAt = Date.now();
  $effect(() => { const D0 = D, k0 = `${dcode}|${D0?.state.step}|${JSON.stringify((D0?.state as { chainAt?: unknown } | undefined)?.chainAt ?? '')}`; if (k0 !== fitKey) { fitKey = k0; fitAt = Date.now(); } });
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
  // 🧑‍🏫 시연 다 맞힘 = 선생님 일격 (📜 2026-11-14 「교사 시연은 학생이랑 달라 · 퍼펙트 뜨면 필살기 공격」 · 정식 hall.js strikeHtml): 기술 고르기 · 재도전 판 대신 「⚔ 일반 공격」 · 「⚡ 필살기 · 이름」
  //   필살기 = 선생님 스킬이 Ⅳ 전설 또는 🪶 특별일 때만 (아니면 잠김 + 한 줄)
  const win = $derived.by(() => {
    if (!D) return false; const st = stepOf(L, D); if (!st) return false;
    if (st.kind === 'boss') return V4(D) ? bossRecord(L, D, 'demo').done : bossState(L, D, 'demo').every((x) => x.ok);
    if (st.kind !== 'monster' || !L.monsters[st.id]) return false;
    return isChain(L, D, st.id) ? chainRecord(L, D, st.id, 'demo').done : plainRecord(L, D, st.id, 'demo').perfectAt >= 0;
  });
  const tLook = $derived(teacherLook(tlook)), tTier = $derived(tierOf(tLook.fx)), tUlt = $derived(tTier === 3 || tTier === 's'), tName = $derived(NAMES[tLook.fx] || ''); // 👩‍🏫 교사 계정 「내 용사」 (TV 기기 저장값 아님 · 폰에서 바꾸면 바로)
</script>

<div class="dp" role="dialog" aria-label="선생님 시연" data-thero={tLook.hero} data-tfx={tLook.fx} data-tult={tUlt}>
  <div class="bar">
    <b>🎮 시연</b><span class="tag">데미지 · 기록 없음</span>
    <button type="button" onclick={() => (reveal = !reveal)}>💡 정답 {reveal ? '접기' : '펼치기'}</button>
    <button type="button" onclick={again}>🔄 숫자 바꿔 다시</button>
    <button type="button" onclick={onclose}>✕ 닫기</button>
  </div>
  {#if reveal && ans.length}<p class="rev">💡 {ans.join(' · ')}</p>{/if}

  <!-- 🧑‍🏫 (📜 2026-11-17 #12 「정답체크장면 급하게 나오고 공격 고르기로 넘어감 · 차분히 둘다 보이게」): 다 맞혀도 폰(문항마다 ✔ · 풀이 줄)은 그대로 · 그 아래에 일격 단추 · 저절로 넘어가지 않음(누를 때만) · 학생용 ⚡ 기술 고르기 · 이어서 단추는 시연에서 숨김 -->
  <div class="box" class:won={win && !!onstrike} bind:clientHeight={boxH} bind:clientWidth={boxW}>
    {#key dcode}
      <div class="phone" style:width="{PWv}px" style:height="{PH}px" style:transform="scale({k})">
        <div class="scr" data-k="demo-scr" bind:this={scr}><Student {S} {L} code={dcode} uid="demo" num={0} nick="시연" board cardOnly /></div>
      </div>
    {/key}
  </div>
  {#if win && onstrike}<div class="strike" data-k="tstrike" role="group" aria-label="선생님 일격">
    <p>⚔ 모두 맞혔다! 어떤 공격으로 갈까요?</p>
    <div class="sbtn"><button type="button" class="s0" onclick={() => onstrike(false)}>⚔ 일반 공격</button><button type="button" class="s1" disabled={!tUlt} onclick={() => onstrike(true)}>⚡ 필살기{tUlt && tName ? ` · ${tName}` : ''}</button></div>
    {#if !tUlt}<small>⚙ 스킬 고르기에서 Ⅳ 전설이나 🪶 특별 스킬로 바꾸면 필살기를 쓸 수 있어요</small>{/if}
  </div>{/if}
</div>

<style>
  .dp { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 0.8cqh; padding: 0.8cqh 0.8cqw; background: rgba(8, 9, 12, 0.92); }
  .bar { display: flex; align-items: center; gap: 0.6cqw; flex-wrap: wrap; font-size: var(--tv-small); }
  .bar b { font-size: var(--tv-body); }
  .tag { padding: 0.2cqh 0.6cqw; border-radius: 99px; border: 1px solid var(--accent); color: var(--accent); }
  .bar button { margin-left: auto; height: 4cqh; padding: 0 0.8cqw; border-radius: 1cqh; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.08); color: #fff; font-size: var(--tv-small); cursor: pointer; }
  .bar button + button { margin-left: 0; }
  /* 🐞 (📜 2026-11-17 #11 「시연 칸 미세하게 밀림」): 💡 정답 줄 = 폰 위에 겹쳐 띄움(자리 차지 안 함) → 펼치고 접어도 폰 · 칸 자리 그대로 */
  .rev { position: absolute; z-index: 3; left: 0.8cqw; right: 0.8cqw; top: 5.4cqh; margin: 0; padding: 0.8cqh 1cqw; border-radius: 1cqh; background: rgba(20, 16, 6, 0.94); border: 1px solid var(--accent); font-size: var(--tv-small); color: #ffe7a6; box-shadow: 0 1cqh 2cqh rgba(0, 0, 0, 0.5); }
  .strike { display: flex; flex-direction: column; gap: 1.6cqh; padding: 2cqh 1cqw; border-radius: 1.6cqh; background: rgba(245, 184, 74, 0.12); border: 1px solid var(--accent); }
  .strike p { margin: 0; font-size: var(--tv-title); font-weight: 800; color: #ffe7a6; }
  .strike .sbtn { display: flex; gap: 0.8cqw; } .strike button { flex: 1; min-height: 8cqh; border-radius: 1.4cqh; font: 800 var(--tv-body) var(--font); cursor: pointer; border: 0; box-shadow: 0 0.5cqh 0 rgba(0, 0, 0, 0.35); }
  .strike .s0 { background: var(--accent); color: #1b1408; } .strike .s1 { background: #6d3df0; color: #fff; } .strike .s1:disabled { opacity: 0.4; cursor: default; }
  .strike small { font-size: var(--tv-small); color: #d6d9e0; }
  .box.won :global(.bcard.sk), .box.won :global(.act.dock), .box.won :global(.spacer) { display: none !important; } /* 학생용 ⚡ 기술 고르기 · 이어서 = 시연에선 숨김 (일격 단추가 대신) */
  .strike { flex: none; }
  .box { flex: 1; min-height: 0; display: flex; justify-content: center; overflow: hidden; }
  /* 폰 틀: transform 이 있는 상자 = 안쪽 「화면 바닥 고정」(주요 단추 · 시트)이 이 틀 기준이 됨 → 학생 폰과 같은 자리 */
  .phone { flex: none; transform-origin: top center; border-radius: 12px; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 16px; }
  .scr { position: relative; width: 100%; height: 100%; overflow: auto; }
  .scr :global(.edge .back) { pointer-events: none; opacity: 0.4; } /* 시연에선 뒤로 가지 않음 */
</style>
