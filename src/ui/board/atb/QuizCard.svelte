<script lang="ts">
  // 📜 문제 카드 v2 (📜 요청 #24 UI v2 · 선생님 「다른 AI 랑 짠 시안」): 가운데 「문제 풀이」 단추 자리에서 위로 올라옴 · 위 모서리만 둥글게 · 아래는 화면 끝에서 잘린 듯
  //   ✕ · 제출 단추 없음 → 맨 위 손잡이 바를 아래로 끌어 넣으면 닫힘(부모가 끌기를 받음 · ongrab) · 제출 = 아래 가운데 단추(부모가 send() 를 부름 · onfill 로 켜짐 알림)
  //   소문항 맞음 = 테두리 초록 + 초록 반짝 · 틀림 = 단호한 좌우 흔들림 + 빨간 테두리 (진동 · 소리 = 부모) · 짧은 보기 4개 = 2 × 2 · 긴 문항 = 보기 칸만 스크롤
  import type { Given, LessonPack } from '../../../model/types';
  import QItem from '../../q/QItem.svelte';
  import { fxCss } from './AtbFx.svelte';
  import { emptyOf, filled, finalOf } from '../../../engine/input';
  import { hintOf } from '../../../board/team';
  import { questionsOf, type Run } from '../../../board/atb/quiz';
  const { L, run, seed, title, hintOk, onsubmit, ongrab, onfill, flash = '', flashN = 0, locked = 0, lockTag = '', grading = null, onskip, auto = false }: {
    L: LessonPack; run: Run; seed: string; title: string; /** 💡 이번 원문항에서 쓸 수 있나 */ hintOk: boolean;
    onsubmit: (g: Given) => void; /** 손잡이 바를 누름 → 부모가 끌어 닫기를 받음 */ ongrab?: (ev: PointerEvent) => void; /** 답을 골라 제출할 수 있나 (부모 「✅ 제출」 단추) */ onfill?: (ok: boolean) => void;
    /** 방금 결과 (ok · gold · wrong · swap · shieldSwap) */ flash?: string; /** 같은 결과가 잇따라도 연출을 다시 (맞음 · 틀림 번호) */ flashN?: number;
    /** 💥 몬스터 공격에 맞아 잠긴 남은 초 */ locked?: number; lockTag?: string;
    /** 📝 채점 연출 (Y8) · 소문항 ○ △ · 누르면 건너뜀 */ grading?: { marks: boolean[]; perfect: boolean; n: number; want: number; suck: boolean } | null; onskip?: () => void; /** ⚔ 방금 자동 일반 공격 (한 줄만) */ auto?: boolean;
  } = $props();
  const qs = $derived(questionsOf(L, run, seed)), q = $derived(qs[run.k] ?? null);
  let val = $state<Given>(null), hint = $state(''), key = $state('');
  $effect(() => { const k = `${run.mid}|${run.ver}|${run.k}`; if (k !== key) { key = k; val = q ? emptyOf(q) : null; hint = ''; } });
  /** 조각 상태: 끝낸 소문항 = 첫 시도 맞음 full · 고쳐 맞힘 half · 아직 = empty (채점 중 = 모두 끝낸 것) */
  const done = $derived(grading ? qs.length : run.k);
  const shardOf = (i: number) => { if (i >= done) return 'empty'; const g = run.gains?.[i] ?? (run.marks[i] === false ? 0.5 : 1); return g >= 1 ? 'full' : g > 0 ? 'half' : 'zero'; }; // 📜 요청 #49 꽉(1) · 반(½) · 빈(0)
  const can = $derived(!!q && filled(q, val) && !locked && !grading);
  $effect(() => { onfill?.(can); });
  /** ✅ 제출 (부모 아래 가운데 단추) */
  export function send(): void { if (q && can) onsubmit(finalOf(q, val)); }
  const fx = $derived(flash === 'ok' || flash === 'gold' ? 'good' : flash === 'wrong' || flash === 'swap' ? 'bad' : '');
  // 📜 요청 #61 보기 · 숫자판이 넘치면 카드 아래 그림자 + 「▼ 더 있음」 (작은 가로 화면 = 아래 media 로 먼저 줄여 한 화면에)
  let bodyEl = $state<HTMLDivElement | null>(null), more = $state(false);
  const measure = () => { const b = bodyEl; more = !!b && b.scrollHeight - b.scrollTop - b.clientHeight > 4; };
  $effect(() => { const b = bodyEl; if (!b) return; void key; void hint; measure(); const ro = new ResizeObserver(measure); ro.observe(b); for (const c of b.children) ro.observe(c); const mo = new MutationObserver(measure); mo.observe(b, { childList: true, subtree: true }); return () => { ro.disconnect(); mo.disconnect(); }; });
</script>

<section class="qc" style:--ui-card={fxCss('ui-card')} style:--ui-ch={fxCss('ui-choice')} style:--ui-ch-on={fxCss('ui-choice-on')} class:hitlock={locked > 0} class:good={fx === 'good'} class:bad={fx === 'bad'} data-k="atb-quiz" data-fx={fx} aria-label="문제">
  {#key flashN}{#if fx}<i class="fxr {fx}" aria-hidden="true"></i>{/if}{/key}
  {#if auto}<p class="auto" role="status" data-k="atb-auto">⚔ 자동 공격!</p>{/if}
  <button type="button" class="grab" data-k="atb-qhandle" aria-label="아래로 끌어 넣으면 닫혀요" onpointerdown={(ev) => ongrab?.(ev)}><i></i></button>
  <header>
    <span class="tt" data-k="atb-qtitle">{title}</span>
    <!-- ⚡ 충전 미리 보기 (📜 요청 #31 · 푸는 게 곧 충전): 소문항 수만큼 기력 조각 · 맞히면 켜짐(첫 시도 = 꽉 · 고쳐 맞힘 = 반) · 퍼펙트 +3 / 고치면 +2 -->
    <span class="shards" class:gather={!!grading?.suck} data-k="atb-shards" aria-label="충전 조각 {done}/{qs.length}">{#each qs as _, i (i)}{@const st = shardOf(i)}<i class="sh {st}" data-st={st}>⚡</i>{/each}</span>
    {#if run.clean}<b class="cpv gold" data-k="atb-chgpv">✨ 퍼펙트 +1</b>{/if}
    <button type="button" class="lnk" data-k="atb-hint" disabled={!hintOk || !q || !!hint} onclick={() => { if (q) hint = hintOf(q); }}>💡 수호자에게 묻기</button>
  </header>
  <div class="body" bind:this={bodyEl} onscroll={measure}>
    {#if q}{#key key}<QItem {q} i={run.k} value={val} runeLen={4} showNo={false} onchange={(v) => (val = v)} />{/key}{/if}
    {#if hint}<p class="hint" role="status">💡 {hint}</p>{/if}
  </div>
  {#if more}<button type="button" class="more" data-k="atb-qmore" onclick={() => bodyEl?.scrollBy({ top: bodyEl.clientHeight * 0.7, behavior: 'smooth' })}>▼ 더 있음</button>{/if}
  {#if flash === 'ok' || flash === 'gold'}<p class="fb ok" role="status">{flash === 'gold' ? '✔ 한 번에 정답!' : '✔ 정답'} · 다음 단계</p>
  {:else if flash === 'wrong'}<p class="fb bad" role="status">✘ 다시 · 고치면 △</p>
  {:else if flash === 'swap'}<p class="fb bad" role="status">🔥 재도전 · 새 숫자 판으로 처음부터 (⚡ 기력은 그대로)</p>
  {:else if flash === 'shieldSwap'}<p class="fb ok" role="status">🛡 실드! 내 칸을 깨기 쉬운 문제로 바꿨어요 (⚡ 기력은 그대로)</p>{/if}
  {#if grading}
    <button type="button" class="grade" data-k="atb-grade" aria-label="채점 · 누르면 건너뛰기" onclick={() => onskip?.()}>
      <b class="gt" data-k="atb-grade-title">{grading.perfect ? '🏁 퍼펙트!' : '🏁 완주!'}{#if grading.perfect} <em>✨+1</em>{/if}</b>
      <span class="marks">{#each grading.marks as m, i (i)}<i class="mk" class:tri={!m} style:animation-delay="{0.3 + i * 0.26}s" data-k="atb-mark" data-m={m ? 'o' : 'tri'}>{#if m}○{:else}△<small>고침</small>{/if}</i>{/each}</span>
      <span class="gain" style:animation-delay="{0.3 + grading.marks.length * 0.26}s">⚡ 한 번에 +1 · 한 번 틀림 +½ · 두 번+ 0 (풀면서 받음){grading.perfect ? (grading.n ? ' · ✨ 퍼펙트 +1 · ATB 가득' : ' · ✨ 퍼펙트 +1 → 가득이라 자동 스킬 · ATB 가득') : ''}</span>
      <small>누르면 건너뛰기</small>
    </button>
  {/if}
  {#if locked > 0}<div class="lock" role="status" data-k="atb-qlock"><b>{lockTag || '💥 몬스터 공격!'}</b><small>{locked}초 뒤 다시 풀 수 있어요</small><i class="hitpic" data-k="atb-qhitpic" aria-hidden="true"></i></div>{/if}
</section>

<style>
  .qc { position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 6px; padding: 4px 14px calc(64px * var(--u, 1) + 14px); color: #3a2614; border-radius: 14px; border: 3px solid #b88a4a; background: radial-gradient(ellipse at 50% 40%, #fbf0d6 0%, #f1dfb6 70%, #e2c995 100%); box-shadow: 0 0 0 2px #5a3a1a, 0 10px 24px #0008; overflow: hidden;
    --text: #2b1a0c; --text-2: #5a4128; --text-3: #8a6e4e; --surface-2: #f3e1b6; --surface: #f8ebcc; --line: #c9a36a; --press-sh: #b08a52; --accent: #c98a1e; --on-accent: #fff8e6; --accent-sh: #7a4e10; } /* 양피지 위 = 글자 · 칸 색을 진하게 (QItem 이 같은 토큰을 씀) */
  header { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; }
  .lnk { border: none; background: none; padding: 4px 6px; color: #7a4e10; font: 700 13px var(--font-plain); text-decoration: underline; white-space: nowrap; } .lnk:disabled { opacity: 0.4; text-decoration: none; }
  .tt { font: 800 14px var(--font-plain); padding: 3px 12px; border-radius: 8px; border: 1px solid #c9a36a; background: #f6e7c4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  /* 📝 채점 → 충전 (Y8) */
  .auto { position: absolute; z-index: 4; left: 50%; top: 4px; transform: translateX(-50%); margin: 0; padding: 1px 12px; border-radius: 10px; background: #3a2618e6; color: #ffe08a; font: 800 13px var(--font); pointer-events: none; animation: autoIn 1.1s ease-out forwards; }
  @keyframes autoIn { 0% { opacity: 0; transform: translate(-50%, 6px); } 15% { opacity: 1; transform: translate(-50%, 0); } 80% { opacity: 1; } 100% { opacity: 0; } }
  .grade { position: absolute; inset: 0; z-index: 7; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: none; background: #fbf0d6f2; color: #3a2614; font-family: var(--font); }
  .gt { font: 900 24px var(--font); color: #8a4a0a; } .gt em { font-style: normal; color: #1d5ac8; font-size: 1.15em; }
  .marks { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
  .mk { font: 900 40px var(--font); font-style: normal; color: #1f7a3c; opacity: 0; animation: stamp 0.25s ease-out forwards; } .mk.tri { color: #d99a00; display: inline-flex; flex-direction: column; align-items: center; line-height: 1; } .mk.tri small { font: 800 11px var(--font-plain); color: #a87400; }
  @keyframes stamp { from { opacity: 0; transform: scale(2.2); } to { opacity: 1; transform: scale(1); } }
  .gain { font: 900 20px var(--font); color: #1d5ac8; opacity: 0; animation: stamp 0.3s ease-out forwards; }
  .grade small { font: 600 11px var(--font-plain); color: #8a6e4e; }
  .body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .body :global(.q2) { color: #2b1a0c; }
  .body :global(.q1) { color: #4a3420; }
  /* 가로 폰(높이 390) = 룬 키패드를 낮게 (학생 수업 화면 크기는 그대로) */
  .body :global(.runepad) { gap: 4px; } .body :global(.rune-keys) { gap: 4px; } .body :global(.rune) { min-height: 34px; aspect-ratio: auto; font-size: 18px; } .body :global(.rune-slot) { min-height: 40px; } .body :global(.rune-del) { width: 52px; font-size: 20px; }
  .body :global(.item) { gap: 6px; } .body :global(.q2) { font-size: 17px; } .body :global(.ans) { min-height: 34px; height: 34px; }
  @keyframes shake { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
  .hint { margin: 6px 0 0; padding: 6px 8px; border-radius: 8px; background: #fff7d6; border: 1px dashed #d1a54a; font: 600 14px var(--font-plain); }
  .fb { margin: 6px 0 0; font: 800 14px var(--font-plain); } .fb.ok { color: #1f7a3c; } .fb.bad { color: #b3261e; }
  /* 💥 몬스터 공격 = 카드 흔들흔들 + 잠깐 잠금 (레이드 3초 · 분노 4초) · .hitpic = 👹 「맞는 그림」 10종 겹칠 자리(아직 빈 칸) */
  .qc.hitlock { animation: wob 0.5s ease-in-out 2; }
  /* 🎨 atb-ui-parts: 문제 카드 틀(위 리본 = 제목 칸) · 보기 칸(보통 · 고름) = 9조각 늘이기 */
  .qc { border-style: solid; border-width: 24px 14px 0; border-image: var(--ui-card) 92 56 0 fill / 24px 14px 0 stretch; background: none; box-shadow: 0 10px 24px #0008; }
  .qc.good { box-shadow: 0 0 0 3px #7de06a, 0 0 22px #7de06a; } .qc.bad { box-shadow: 0 0 0 3px #ff5a4a, 0 0 18px #ff3a2a; }
  .body :global(.opt) { border: 10px solid transparent; border-image: var(--ui-ch) 44 fill / 10px stretch; background: none; box-shadow: none; }
  .body :global(.opt.on) { border-image: var(--ui-ch-on) 46 fill / 10px stretch; outline: none; }
  @keyframes wob { 20% { transform: translateX(-8px) rotate(-1.5deg); } 40% { transform: translateX(7px) rotate(1.2deg); } 60% { transform: translateX(-5px) rotate(-0.8deg); } 80% { transform: translateX(3px); } }
  .lock { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: #3a0a0a99; color: #fff; text-align: center; pointer-events: auto; }
  .lock b { padding: 4px 16px; border-radius: 10px; background: linear-gradient(#e8332a, #8e1010); border: 2px solid #ffcf6a; font: 900 20px var(--font); }
  .lock small { font: 700 13px var(--font-plain); text-shadow: 0 1px 2px #000; }
  .hitpic { position: absolute; inset: 0; pointer-events: none; background: center / contain no-repeat; }
  @media (prefers-reduced-motion: reduce) { .qc.hitlock { animation: none; } }
  /* 📜 요청 #24 v2 = 위 모서리만 둥글게 · 아래 = 화면 끝에서 잘린 듯 · 손잡이 바 */
  .qc { border-radius: 18px 18px 0 0; border-bottom: none; transition: border-color 0.15s, box-shadow 0.15s; }
  .grab { align-self: center; width: 46%; height: 22px; padding: 0; border: none; background: none; touch-action: none; cursor: grab; display: grid; place-items: center; }
  .grab i { display: block; width: 64px; height: 6px; border-radius: 3px; background: #b88a4a; box-shadow: 0 1px 0 #fff8; }
  .body { overflow-x: hidden; }
  /* 맞음 = 초록 테두리 + 반짝 · 틀림 = 빨간 테두리 + 단호한 좌우 흔들림 (📜 선생님 덧붙임 10 · 11) */
  .qc.good { border-color: #2faa3a; box-shadow: 0 0 0 3px #7de06a, 0 0 22px #7de06a; }
  .qc.bad { border-color: #d0261e; box-shadow: 0 0 0 3px #ff5a4a, 0 0 18px #ff3a2a; }
  .fxr { position: absolute; inset: 0; z-index: 8; pointer-events: none; border-radius: inherit; }
  .fxr.good { background: radial-gradient(circle at 50% 40%, #b8ffb066, #0000 60%); animation: sparkle 0.5s ease-out forwards; }
  @keyframes sparkle { from { opacity: 1; transform: scale(0.9); } to { opacity: 0; transform: scale(1.08); } }
  .fxr.bad { animation: none; }
  .qc.bad { animation: no 0.36s cubic-bezier(.36,.07,.19,.97); }
  @keyframes no { 15% { transform: translateX(-12px); } 30% { transform: translateX(11px); } 45% { transform: translateX(-9px); } 60% { transform: translateX(7px); } 75% { transform: translateX(-4px); } 90% { transform: translateX(2px); } }
  .fb { position: absolute; left: 14px; right: 14px; bottom: calc(64px * var(--u, 1) + 16px); z-index: 4; margin: 0; padding: 3px 10px; border-radius: 8px; background: #fffbeecc; text-align: center; pointer-events: none; }
  /* 짧은 보기 = 2 × 2 · 고른 보기 = 테두리 + ✓ */
  .body :global(.opts.col:has(> .opt:nth-child(4):last-child)), .body :global(.opts.col:has(> .opt:nth-child(2):last-child)) { display: grid; grid-template-columns: 1fr 1fr; }
  .body :global(.opt.on) { position: relative; outline: 3px solid #2f6ad0; outline-offset: -1px; }
  .body :global(.opt.on)::after { content: '✓'; position: absolute; right: 6px; top: 4px; font: 900 16px var(--font); color: #2f6ad0; }
  @media (prefers-reduced-motion: reduce) { .qc.bad, .fxr.good { animation: none; } }
  /* ⚡ 충전 조각 (요청 #31) */
  header { flex-wrap: wrap; row-gap: 2px; }
  .shards { display: inline-flex; gap: 2px; padding: 1px 6px; border-radius: 8px; background: #3a2618; transition: transform 0.4s ease-in, opacity 0.4s; }
  .sh { font-style: normal; font-size: 13px; line-height: 1; filter: grayscale(1) brightness(0.45); }
  .sh.full { filter: drop-shadow(0 0 4px #5ff0ff) hue-rotate(150deg) saturate(2); animation: shon 0.36s ease-out; }
  .sh.zero { filter: grayscale(1) brightness(0.3); opacity: 0.5; }
  .sh.half { filter: drop-shadow(0 0 2px #5ff0ff) hue-rotate(150deg) saturate(1.2) brightness(0.8); opacity: 0.75; clip-path: inset(40% 0 0 0); animation: shon 0.36s ease-out; }
  @keyframes shon { 0% { transform: scale(2.2); } 60% { transform: scale(0.9); } }
  .shards.gather { transform: translate(0, 34vh) scale(1.8); opacity: 0; }
  /* 📜 요청 #61 더 있음 = 카드 아래 그림자 + 알림 (누르면 아래로) */
  .more { position: absolute; left: 0; right: 0; bottom: calc(64px * var(--u, 1) + 10px); z-index: 3; height: 34px; border: none; padding: 0 0 4px; display: flex; align-items: flex-end; justify-content: center; background: linear-gradient(#f1dfb600, #e2c995 70%); color: #7a4e10; font: 800 13px var(--font-plain); animation: morebob 1.2s ease-in-out infinite; }
  @keyframes morebob { 50% { padding-bottom: 0; } }
  /* 📜 요청 #61 낮은 가로 화면(높이 ≤ 430 · 667 × 375 · 740 × 360 · 844 × 390) = 카드 머리 · 글자 · 보기 · 숫자판을 줄여 보기 전부 + 「✅ 제출」이 한 화면에 */
  @media (max-height: 430px) {
    .qc { gap: 3px; }
    .grab { height: 12px; }
    header { min-height: 22px; gap: 6px; }
    .tt { font-size: 12px; padding: 2px 8px; } .lnk { font-size: 12px; padding: 2px 4px; } .cpv { font-size: 12px; padding: 0 6px; } .sh { font-size: 12px; }
    .body :global(.item) { gap: 4px; } .body :global(.q2) { font-size: 15px; line-height: 1.3; } .body :global(.q1) { font-size: 13px; }
    .body :global(.opts.col) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
    .body :global(.opt) { min-height: 38px; padding: 2px 8px; font-size: 15px; }
    .body :global(.runepad) { gap: 4px; } .body :global(.rune-keys) { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 3px; }
    .body :global(.rune) { min-height: 32px; height: 32px; font-size: 16px; padding: 0; } .body :global(.rune-slot) { min-height: 34px; font-size: 22px; } .body :global(.rune-del) { width: 44px; font-size: 18px; }
    /* 여럿 고르기 칩 = 낮고 촘촘하게 · 그림 = 낮게 */
    .body :global(.chips) { grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 4px; }
    .body :global(.chips .chip) { min-height: 32px; font-size: 15px; padding: 0 4px; }
    .body :global(.chips.wide) { grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); }
    .body :global(.chips.wide .chip), .body :global(.chips.many.wide .chip) { min-height: 32px; font-size: 14px; white-space: normal; word-break: keep-all; line-height: 1.15; }
    .body :global(.chips.many.wide) { grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); }
    .body :global(.chips.one), .body :global(.chips.many.one) { grid-template-columns: repeat(2, minmax(0, 1fr)); } .body :global(.chips.one .chip) { font-size: 14px; min-height: 34px; }
    .body :global(svg:not(.chip svg):not(.opt svg)) { max-height: 56px; }
    .body :global(.ans) { min-height: 26px; height: 26px; } .body :global(.item:has(.chips) > .ans) { display: none; } /* 칩 = 고른 칩이 곧 답 (답 줄 생략) */
    .body :global(.chips .chip) { min-height: 30px; }
    .body :global(.opts.col .opt) { font-size: 13.5px; line-height: 1.2; padding: 2px 6px; word-break: keep-all; }
  }
  .cpv { font: 900 13px var(--font); padding: 1px 8px; border-radius: 8px; background: #e6eef8; color: #1d5ac8; } .cpv.gold { background: linear-gradient(#fff3b0, #f5c542); color: #6a3a00; box-shadow: 0 0 6px #ffd34d; }
</style>
