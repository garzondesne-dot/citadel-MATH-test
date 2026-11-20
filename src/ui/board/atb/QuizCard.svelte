<script lang="ts">
  // 📜 문제 카드 (시안 atb-2-quiz): 양피지 · 위 = 원문항 이름 · 단계 k / n + ⚡ 5칸(금색 = 테두리 반짝) · 가운데 = 지금 차시 팩 문항(QItem · 학생과 같은 부품)
  //   아래 = 보스 공격까지 막대 · 💡 수호자에게 묻기 · ✕ 닫기 · 몬스터를 가리지 않음(무대 오른쪽) · 말풍선 꼬리 = 몬스터 쪽
  import type { Given, LessonPack } from '../../../model/types';
  import QItem from '../../q/QItem.svelte';
  import { emptyOf, filled, finalOf } from '../../../engine/input';
  import { hintOf } from '../../../board/team';
  import { questionsOf, type Run } from '../../../board/atb/quiz';
  import { T } from '../../../board/atb/tune';
  import AtbIcon from './AtbIcon.svelte';
  const { L, run, seed, title, ch, bossLeft, hintOk, onsubmit, onclose, flash = '', locked = 0, lockTag = '', grading = null, onskip, auto = false }: {
    L: LessonPack; run: Run; seed: string; title: string; /** ⚡ 충전 칸 (Y1 · 최대 3) */ ch: number; /** 보스 공격까지 남은 비율 0 ~ 1 */ bossLeft: number; /** 💡 이번 원문항에서 쓸 수 있나 */ hintOk: boolean;
    onsubmit: (g: Given) => void; onclose: () => void; /** 방금 결과 (ok · gold · wrong · swap · done) */ flash?: string;
    /** 💥 몬스터 공격에 맞아 잠긴 남은 초 (0 = 안 잠김 · 📜 요청 #3 ① 레이드처럼 카드 흔들 + 잠깐 잠금) */ locked?: number; lockTag?: string;
    /** 📝 채점 연출 (Y8) · 소문항 ○ × · 누르면 건너뜀 */ grading?: { marks: boolean[]; perfect: boolean; /** 실제 받은 충전 */ n: number; /** 규칙상 받을 충전(퍼펙트 3 · 재시도 2) */ want: number; suck: boolean } | null; onskip?: () => void; /** ⚔ 방금 자동 일반 공격 (요청 #11 · 한 줄만 · 입력은 그대로) */ auto?: boolean;
  } = $props();
  const qs = $derived(questionsOf(L, run, seed)), q = $derived(qs[run.k] ?? null);
  let val = $state<Given>(null), hint = $state(''), key = $state('');
  $effect(() => { const k = `${run.mid}|${run.ver}|${run.k}`; if (k !== key) { key = k; val = q ? emptyOf(q) : null; hint = ''; } });
  const send = () => { if (q && filled(q, val) && !locked) onsubmit(finalOf(q, val)); };
  const left = $derived(Math.max(0, T.wrongSwap - run.wrong));
</script>

<section class="qc" class:hitlock={locked > 0} data-k="atb-quiz" aria-label="문제">
  {#if auto}<p class="auto" role="status" data-k="atb-auto">⚔ 자동 공격!</p>{/if}
  <header>
    <span class="tt" data-k="atb-qtitle">{title} · {run.k + 1}/{qs.length}</span>
    <button type="button" class="xx" data-k="atb-qclose" aria-label="닫기" onclick={onclose}>✕</button>
  </header>
  <div class="body" class:shake={flash === 'wrong'}>
    {#if q}{#key key}<QItem {q} i={run.k} value={val} runeLen={4} showNo={false} onchange={(v) => (val = v)} />{/key}{/if}
    {#if hint}<p class="hint" role="status">💡 {hint}</p>{/if}
    {#if flash === 'ok' || flash === 'gold'}<p class="fb ok" role="status">{flash === 'gold' ? '✔ 한 번에 정답!' : '✔ 정답'} · 다음 단계</p>
    {:else if flash === 'wrong'}<p class="fb bad" role="status">✘ 다시 · {left}번 더 틀리면 🔥 재도전(새 숫자 판)</p>
    {:else if flash === 'swap'}<p class="fb bad" role="status">🔥 재도전 · 새 숫자 판으로 처음부터 (⚡ 기력은 그대로)</p>
    {:else if flash === 'shieldSwap'}<p class="fb ok" role="status">🛡 실드! 내 칸을 깨기 쉬운 문제로 바꿨어요 (⚡ 기력은 그대로)</p>{/if}
  </div>
  <button type="button" class="go" data-k="atb-submit" disabled={!q || !filled(q, val) || locked > 0} onclick={send}>{locked > 0 ? `⏳ 막는 중… ${locked}` : '제출'}</button>
  {#if grading}
    <button type="button" class="grade" data-k="atb-grade" aria-label="채점 · 누르면 건너뛰기" onclick={() => onskip?.()}>
      <b class="gt" data-k="atb-grade-title">{grading.perfect ? '✨ PERFECT' : '🏁 완주!'} <em>⚡+{grading.want}</em></b>
      <span class="marks">{#each grading.marks as m, i (i)}<i class="mk" class:x={!m} style:animation-delay="{0.3 + i * 0.26}s">{m ? '○' : '×'}</i>{/each}</span>
      <span class="gain" style:animation-delay="{0.3 + grading.marks.length * 0.26}s">{grading.n >= grading.want ? `⚡ 기력 +${grading.n}` : `⚡+${grading.want} → 가득(+${grading.n} 받음)`}{grading.perfect ? ' · ATB 가득' : ''}</span>
      <small>누르면 건너뛰기</small>
    </button>
  {/if}
  {#if locked > 0}<div class="lock" role="status" data-k="atb-qlock"><b>{lockTag || '💥 몬스터 공격!'}</b><small>{locked}초 뒤 다시 풀 수 있어요</small><i class="hitpic" data-k="atb-qhitpic" aria-hidden="true"></i></div>{/if}
  <footer>
    <span class="bl">보스 공격까지 <i class="bar"><b style:width="{Math.round(bossLeft * 100)}%"></b></i></span>
    <button type="button" class="lnk" data-k="atb-hint" disabled={!hintOk || !q || !!hint} onclick={() => { if (q) hint = hintOf(q); }}>💡 수호자에게 묻기</button>
  </footer>
</section>

<style>
  .qc { position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 6px; padding: 10px 14px 10px; color: #3a2614; border-radius: 14px; border: 3px solid #b88a4a; background: radial-gradient(ellipse at 50% 40%, #fbf0d6 0%, #f1dfb6 70%, #e2c995 100%); box-shadow: 0 0 0 2px #5a3a1a, 0 10px 24px #0008; overflow: hidden;
    --text: #2b1a0c; --text-2: #5a4128; --text-3: #8a6e4e; --surface-2: #f3e1b6; --surface: #f8ebcc; --line: #c9a36a; --press-sh: #b08a52; --accent: #c98a1e; --on-accent: #fff8e6; --accent-sh: #7a4e10; } /* 양피지 위 = 글자 · 칸 색을 진하게 (QItem 이 같은 토큰을 씀) */
  .qc::before { content: ''; position: absolute; left: -16px; top: 46%; border: 10px solid transparent; border-right: 14px solid #b88a4a; } /* 말풍선 꼬리 = 몬스터 쪽 */
  header { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 30px; }
  .xx { position: absolute; right: -4px; top: -2px; width: 34px; height: 34px; border-radius: 50%; border: 2px solid #b88a4a; background: #f9ecd0; color: #5a3a1a; font: 900 16px var(--font); }
  .lnk { border: none; background: none; padding: 4px 6px; color: #7a4e10; font: 700 13px var(--font-plain); text-decoration: underline; white-space: nowrap; } .lnk:disabled { opacity: 0.4; text-decoration: none; }
  .tt { font: 800 14px var(--font-plain); padding: 3px 12px; border-radius: 8px; border: 1px solid #c9a36a; background: #f6e7c4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  /* 📝 채점 → 충전 (Y8) */
  .auto { position: absolute; z-index: 4; left: 50%; top: 4px; transform: translateX(-50%); margin: 0; padding: 1px 12px; border-radius: 10px; background: #3a2618e6; color: #ffe08a; font: 800 13px var(--font); pointer-events: none; animation: autoIn 1.1s ease-out forwards; }
  @keyframes autoIn { 0% { opacity: 0; transform: translate(-50%, 6px); } 15% { opacity: 1; transform: translate(-50%, 0); } 80% { opacity: 1; } 100% { opacity: 0; } }
  .grade { position: absolute; inset: 0; z-index: 7; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: none; background: #fbf0d6f2; color: #3a2614; font-family: var(--font); }
  .gt { font: 900 24px var(--font); color: #8a4a0a; } .gt em { font-style: normal; color: #1d5ac8; font-size: 1.15em; }
  .marks { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
  .mk { font: 900 40px var(--font); font-style: normal; color: #1f7a3c; opacity: 0; animation: stamp 0.25s ease-out forwards; } .mk.x { color: #b3261e; }
  @keyframes stamp { from { opacity: 0; transform: scale(2.2); } to { opacity: 1; transform: scale(1); } }
  .gain { font: 900 20px var(--font); color: #1d5ac8; opacity: 0; animation: stamp 0.3s ease-out forwards; }
  .grade small { font: 600 11px var(--font-plain); color: #8a6e4e; }
  .body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .body :global(.q2) { color: #2b1a0c; }
  .body :global(.q1) { color: #4a3420; }
  /* 가로 폰(높이 390) = 룬 키패드를 낮게 (학생 수업 화면 크기는 그대로) */
  .body :global(.runepad) { gap: 4px; } .body :global(.rune-keys) { gap: 4px; } .body :global(.rune) { min-height: 34px; aspect-ratio: auto; font-size: 18px; } .body :global(.rune-slot) { min-height: 40px; } .body :global(.rune-del) { width: 52px; font-size: 20px; }
  .body :global(.item) { gap: 6px; } .body :global(.q2) { font-size: 17px; } .body :global(.ans) { min-height: 34px; height: 34px; }
  .body.shake { animation: shake 0.3s; }
  @keyframes shake { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
  .hint { margin: 6px 0 0; padding: 6px 8px; border-radius: 8px; background: #fff7d6; border: 1px dashed #d1a54a; font: 600 14px var(--font-plain); }
  .fb { margin: 6px 0 0; font: 800 14px var(--font-plain); } .fb.ok { color: #1f7a3c; } .fb.bad { color: #b3261e; }
  .go { min-height: 48px; font-size: 19px !important; border-radius: 10px; border: 2px solid #8a5a1a; background: linear-gradient(#ffd77a, #e9a93a); color: #3a2205; font: 800 17px var(--font); box-shadow: 0 3px 0 #8a5a1a; }
  .go:disabled { opacity: 0.45; box-shadow: none; }
  footer { position: relative; z-index: 6; display: flex; align-items: center; gap: 6px; } /* 잠겨도 ✕ 닫기는 됨 */
  .bl { flex: 1; display: flex; align-items: center; gap: 6px; font: 700 12px var(--font-plain); white-space: nowrap; min-width: 0; }
  .bar { flex: 1; height: 8px; border-radius: 4px; background: #5a3a2a; overflow: hidden; display: block; min-width: 30px; }
  .bar b { display: block; height: 100%; background: linear-gradient(90deg, #ff5a4a, #e8332a); }
  /* 💥 몬스터 공격 = 카드 흔들흔들 + 잠깐 잠금 (레이드 3초 · 분노 4초) · .hitpic = 👹 「맞는 그림」 10종 겹칠 자리(아직 빈 칸) */
  .qc.hitlock { animation: wob 0.5s ease-in-out 2; }
  @keyframes wob { 20% { transform: translateX(-8px) rotate(-1.5deg); } 40% { transform: translateX(7px) rotate(1.2deg); } 60% { transform: translateX(-5px) rotate(-0.8deg); } 80% { transform: translateX(3px); } }
  .lock { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: #3a0a0a99; color: #fff; text-align: center; pointer-events: auto; }
  .lock b { padding: 4px 16px; border-radius: 10px; background: linear-gradient(#e8332a, #8e1010); border: 2px solid #ffcf6a; font: 900 20px var(--font); }
  .lock small { font: 700 13px var(--font-plain); text-shadow: 0 1px 2px #000; }
  .hitpic { position: absolute; inset: 0; pointer-events: none; background: center / contain no-repeat; }
  @media (prefers-reduced-motion: reduce) { .qc.hitlock { animation: none; } }
</style>
