<script lang="ts">
  // 📜 문제 카드 (시안 atb-2-quiz): 양피지 · 위 = 원문항 이름 · 단계 k / n + ⚡ 5칸(금색 = 테두리 반짝) · 가운데 = 지금 차시 팩 문항(QItem · 학생과 같은 부품)
  //   아래 = 보스 공격까지 막대 · 💡 수호자에게 묻기 · ✕ 닫기 · 몬스터를 가리지 않음(무대 오른쪽) · 말풍선 꼬리 = 몬스터 쪽
  import type { Given, LessonPack } from '../../../model/types';
  import QItem from '../../q/QItem.svelte';
  import { emptyOf, filled, finalOf } from '../../../engine/input';
  import { hintOf } from '../../../board/team';
  import { questionsOf, type Run } from '../../../board/atb/quiz';
  import type { Zap } from '../../../board/atb/engine';
  import { T } from '../../../board/atb/tune';
  import AtbIcon from './AtbIcon.svelte';
  const { L, run, seed, title, zaps, bossLeft, hintOk, onsubmit, onclose, flash = '' }: {
    L: LessonPack; run: Run; seed: string; title: string; zaps: Zap[]; /** 보스 공격까지 남은 비율 0 ~ 1 */ bossLeft: number; /** 💡 이번 원문항에서 쓸 수 있나 */ hintOk: boolean;
    onsubmit: (g: Given) => void; onclose: () => void; /** 방금 결과 (ok · gold · wrong · swap · done) */ flash?: string;
  } = $props();
  const qs = $derived(questionsOf(L, run, seed)), q = $derived(qs[run.k] ?? null);
  let val = $state<Given>(null), hint = $state(''), key = $state('');
  $effect(() => { const k = `${run.mid}|${run.ver}|${run.k}`; if (k !== key) { key = k; val = q ? emptyOf(q) : null; hint = ''; } });
  const send = () => { if (q && filled(q, val)) onsubmit(finalOf(q, val)); };
  const left = $derived(Math.max(0, T.wrongSwap - run.wrong));
</script>

<section class="qc" data-k="atb-quiz" aria-label="문제">
  <header>
    <span class="tt">{title} · 단계 {run.k + 1} / {qs.length}</span>
    <span class="zs" aria-label="⚡ {zaps.length}개 · 금색 {zaps.filter((z) => z === 'g').length}">{#each Array(5) as _, i (i)}<i class="z" class:g={zaps[i] === 'g'} class:on={!!zaps[i]}><AtbIcon name={zaps[i] === 'g' ? 'zap-gold' : zaps[i] ? 'zap' : 'zap-empty'} size={22} /></i>{/each}</span>
  </header>
  <div class="body" class:shake={flash === 'wrong'}>
    {#if q}{#key key}<QItem {q} i={run.k} value={val} runeLen={4} showNo={false} onchange={(v) => (val = v)} />{/key}{/if}
    {#if hint}<p class="hint" role="status">💡 {hint}</p>{/if}
    {#if flash === 'ok' || flash === 'gold'}<p class="fb ok" role="status">{flash === 'gold' ? '✨ 첫 시도 정답 · 금색 ⚡' : '✔ 정답 · ⚡ +1'}</p>
    {:else if flash === 'wrong'}<p class="fb bad" role="status">✘ 다시 · {left}번 더 틀리면 새 숫자 판</p>
    {:else if flash === 'swap'}<p class="fb bad" role="status">🔁 새 숫자 판으로 처음부터 (⚡ 는 그대로)</p>
    {:else if flash === 'done'}<p class="fb ok" role="status">🏁 완주! {run.clean ? '· 퍼펙트 = ATB 가득' : ''}</p>{/if}
  </div>
  <button type="button" class="go" data-k="atb-submit" disabled={!q || !filled(q, val)} onclick={send}>제출</button>
  <footer>
    <span class="bl">보스 공격까지 <i class="bar"><b style:width="{Math.round(bossLeft * 100)}%"></b></i></span>
    <button type="button" class="sm" data-k="atb-hint" disabled={!hintOk || !q || !!hint} onclick={() => { if (q) hint = hintOf(q); }}>💡 수호자에게 묻기</button>
    <button type="button" class="sm" data-k="atb-qclose" onclick={onclose}>✕ 닫기</button>
  </footer>
</section>

<style>
  .qc { position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 6px; padding: 10px 14px 10px; color: #3a2614; border-radius: 14px; border: 3px solid #b88a4a; background: radial-gradient(ellipse at 50% 40%, #fbf0d6 0%, #f1dfb6 70%, #e2c995 100%); box-shadow: 0 0 0 2px #5a3a1a, 0 10px 24px #0008; overflow: hidden;
    --text: #2b1a0c; --text-2: #5a4128; --text-3: #8a6e4e; --surface-2: #f3e1b6; --surface: #f8ebcc; --line: #c9a36a; --press-sh: #b08a52; --accent: #c98a1e; --on-accent: #fff8e6; --accent-sh: #7a4e10; } /* 양피지 위 = 글자 · 칸 색을 진하게 (QItem 이 같은 토큰을 씀) */
  .qc::before { content: ''; position: absolute; left: -16px; top: 46%; border: 10px solid transparent; border-right: 14px solid #b88a4a; } /* 말풍선 꼬리 = 몬스터 쪽 */
  header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .tt { font: 700 13px var(--font-plain); padding: 3px 10px; border-radius: 8px; border: 1px solid #c9a36a; background: #f6e7c4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .zs { display: flex; gap: 1px; padding: 2px 6px; border-radius: 8px; background: #2a1a0e; border: 2px solid #c9953e; flex: none; }
  .z { display: inline-flex; border-radius: 50%; }
  .z.g { box-shadow: 0 0 0 1.5px #fff6c0, 0 0 6px 2px #ffd34d; animation: glint 1.2s ease-in-out infinite; } /* 🛠 시안 고침 ② 금색 ⚡ = 테두리 반짝 */
  @keyframes glint { 50% { box-shadow: 0 0 0 1.5px #fff, 0 0 10px 3px #ffe27a; } }
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
  .go { min-height: 44px; border-radius: 10px; border: 2px solid #8a5a1a; background: linear-gradient(#ffd77a, #e9a93a); color: #3a2205; font: 800 17px var(--font); box-shadow: 0 3px 0 #8a5a1a; }
  .go:disabled { opacity: 0.45; box-shadow: none; }
  footer { display: flex; align-items: center; gap: 6px; }
  .bl { flex: 1; display: flex; align-items: center; gap: 6px; font: 700 12px var(--font-plain); white-space: nowrap; min-width: 0; }
  .bar { flex: 1; height: 8px; border-radius: 4px; background: #5a3a2a; overflow: hidden; display: block; min-width: 30px; }
  .bar b { display: block; height: 100%; background: linear-gradient(90deg, #ff5a4a, #e8332a); }
  .sm { min-height: 36px; padding: 0 8px; border-radius: 8px; border: 1px solid #b88a4a; background: #f9ecd0; color: #3a2614; font: 700 12px var(--font-plain); white-space: nowrap; }
  .sm:disabled { opacity: 0.45; }
</style>
