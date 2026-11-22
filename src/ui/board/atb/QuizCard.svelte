<script lang="ts">
  // 📜 문제 카드 v2 (📜 요청 #24 UI v2 · 선생님 「다른 AI 랑 짠 시안」): 가운데 「문제 풀이」 단추 자리에서 위로 올라옴 · 위 모서리만 둥글게 · 아래는 화면 끝에서 잘린 듯
  //   ✕ · 제출 단추 없음 → 맨 위 손잡이 바를 아래로 끌어 넣으면 닫힘(부모가 끌기를 받음 · ongrab) · 제출 = 아래 가운데 단추(부모가 send() 를 부름 · onfill 로 켜짐 알림)
  //   소문항 맞음 = 테두리 초록 + 초록 반짝 · 틀림 = 단호한 좌우 흔들림 + 빨간 테두리 (진동 · 소리 = 부모) · 짧은 보기 4개 = 2 × 2 · 긴 문항 = 보기 칸만 스크롤
  import type { Given, LessonPack } from '../../../model/types';
  import QItem from '../../q/QItem.svelte';
  import SymText from '../../q/SymText.svelte';
  import ChainStage from '../../q/ChainStage.svelte';
  import AnswerRow, { type Cell } from '../../q/AnswerRow.svelte';
  import Orb from './Orb.svelte';
  import { fxCss } from './AtbFx.svelte';
  import { emptyOf, filled, finalOf, penLine, stripNo } from '../../../engine/input';
  import { hintOf } from '../../../board/team';
  import { canSkip, questionsOf, type Run } from '../../../board/atb/quiz';
  import { answerOf } from '../../../raid/raid';
  const { L, run, seed, title, hintOk, onsubmit, ongrab, onfill, flash = '', flashN = 0, locked = 0, lockTag = '', grading = null, onskip, auto = false, help, onask, onhint, onpass }: {
    /** ⏭ #123 넘기기 (정답 보고 「알았어요」 뒤 다음 소문항) */ onpass?: () => void;
    L: LessonPack; run: Run; seed: string; title: string; /** 💡 이번 원문항에서 쓸 수 있나 */ hintOk: boolean;
    onsubmit: (g: Given) => void; /** 손잡이 바를 누름 → 부모가 끌어 닫기를 받음 */ ongrab?: (ev: PointerEvent) => void; /** 답을 골라 제출할 수 있나 (부모 「✅ 제출」 단추) */ onfill?: (ok: boolean) => void;
    /** 방금 결과 (ok · gold · wrong · swap · shieldSwap) */ flash?: string; /** 같은 결과가 잇따라도 연출을 다시 (맞음 · 틀림 번호) */ flashN?: number;
    /** 💥 몬스터 공격에 맞아 잠긴 남은 초 */ locked?: number; lockTag?: string;
    /** 📝 채점 연출 (Y8) · 소문항 ○ △ · 누르면 건너뜀 */ grading?: { marks: boolean[]; perfect: boolean; n: number; want: number; suck: boolean } | null; onskip?: () => void; /** ⚔ 방금 자동 일반 공격 (한 줄만) */ auto?: boolean;
    /** 🛡 #103 팀에 수호자 = ask(「💡 도와줘」 · wait = 기다림 · from = 보낸 수호자 이름 · id = 이 부탁) · 없음 = auto(「💡 힌트」 팩 힌트) */ help?: { mode: 'ask' | 'auto'; wait: boolean; from: string; id: number }; onask?: () => void; onhint?: () => void;
  } = $props();
  const qs = $derived(questionsOf(L, run, seed)), q = $derived(qs[run.k] ?? null);
  let reveal = $state(false), revealOk = $state(false), revealT: ReturnType<typeof setTimeout> | undefined;
  let val = $state<Given>(null), hint = $state(''), hintBy = $state(''), key = $state(''), gotId = -1;
  $effect(() => { const k = `${run.mid}|${run.ver}|${run.k}`; if (k !== key) { key = k; val = q ? emptyOf(q) : null; hint = ''; hintBy = ''; reveal = false; revealOk = false; clearTimeout(revealT); } });
  /* ⏭ 📜 #123 같은 소문항 3번 틀림 = 「⏭ 넘기기」 → 정답 + 풀이 한 줄 · 「✔ 알았어요」(2초 뒤 눌림) → 다음 */
  const canPass = $derived(!!onpass && canSkip(run) && !grading);
  /** 📜 #132 정답 까닭 한 줄 = 문항 solution · 소레이드 단계 = why.text · say 가 있으면 그것 (새 데이터 없음) */
  const solOf = (x: NonNullable<typeof q>) => { const a = x as { solution?: string; say?: string; why?: { text?: string } }; return String((chain ? a.why?.text || a.say || a.solution : a.solution || a.say) ?? '').trim(); };
  function startReveal() { reveal = true; revealOk = false; clearTimeout(revealT); revealT = setTimeout(() => (revealOk = true), 2000); }
  /* 🛡 #103 수호자가 보낸 힌트 = 카드에 「🛡 ○○가 보낸 힌트」 (부탁마다 한 번) */
  $effect(() => { const h = help; if (h?.from && q && h.id !== gotId) { gotId = h.id; hint = hintOf(q); hintBy = h.from; } });
  /** 조각 상태: 끝낸 소문항 = 첫 시도 맞음 full · 고쳐 맞힘 half · 아직 = empty (채점 중 = 모두 끝낸 것) */
  const done = $derived(grading ? qs.length : run.k);
  const shardOf = (i: number) => { if (i >= done) return 'empty'; const g = run.gains?.[i] ?? (run.marks[i] === false ? 0.5 : 1); return g >= 1 ? 'full' : g > 0 ? 'half' : 'zero'; }; // 📜 요청 #49 꽉(1) · 반(½) · 빈(0)
  const can = $derived(!!q && filled(q, val) && !locked && !grading);
  $effect(() => { onfill?.(can); });
  /** ✅ 제출 (e2e · 꾹 제출이 부름) */
  export function send(): void { if (q && can) onsubmit(finalOf(q, val)); }
  /** 🧾 #128 부모 submit 이 부름 = 낸 답 기억 → 결과(flash)가 오면 그 칸 뒤집힘 */
  export function sentAs(g: Given): void { if (q) sent = { i: run.k, text: penLine(q, g, 0), n: flashN, miss: run.subMiss ?? 0, why: solOf(q) }; }
  /* 🧾 📜 #128 레이드 학생 화면과 같은 부품 (src/ui/q · AnswerRow · ChainStage): 낸 칸 0.65초 뒤집힘 ✔ / ✘ · 소레이드 = 「📜 나의 풀이」 쌓임 → 👑 대장 */
  let sent: { i: number; text: string | null; n: number; miss?: number; why?: string } | null = null, flip = $state<{ i: number; ok: boolean; text: string | null } | null>(null), flipT: ReturnType<typeof setTimeout> | undefined;
  $effect(() => { const n = flashN, f = flash; if (!sent || n === sent.n || !f) return; const ok = f === 'ok' || f === 'gold'; flip = { i: sent.i, ok, text: sent.text }; lastBad = ok ? null : sent.text; if (ok && (sent.miss ?? 0) > 0 && sent.why) { fixWhy = sent.why; clearTimeout(fixT); fixT = setTimeout(() => (fixWhy = ''), 1500); } else if (!ok) fixWhy = ''; sent = null; clearTimeout(flipT); flipT = setTimeout(() => (flip = null), 650); });
  let lastBad = $state<string | null>(null);
  /* 💡 📜 #132 틀렸다가 맞혔을 때만 「왜 맞았나」 한 줄 · 1.5초(또는 다음 소문항에서 또 내기 전까지) · 다음 문제를 막지 않음 · 한 번에 맞힘 · 틀린 순간 = 안 보임 */
  let fixWhy = $state(''), fixT: ReturnType<typeof setTimeout> | undefined;
  $effect(() => { void run.mid; void run.ver; void run.k; if ((run.subMiss ?? 0) === 0) lastBad = null; });
  const chain = $derived(!!L.monsters[run.mid]?.chain);
  const lastWrong = $derived((run.subMiss ?? 0) > 0 && !grading);
  /** 📜 나의 풀이 = 레이드 chainRecord 와 같은 줄 (푼 단계마다 say · 근거 why) */
  const says = $derived.by(() => { const a: string[] = []; for (let i = 0; i < Math.min(done, qs.length); i++) { const x = qs[i]!; a.push(x.say || ''); if (x.why) a.push(x.why.text); } return a.filter((t) => t); });
  const cells = $derived.by((): Cell[] => qs.map((x, i) => {
    if (flip && flip.i === i) return { text: flip.text ? stripNo(flip.text) : null, state: flip.ok ? 'ok' : 'bad' };
    if (i < done) { const l = penLine(x, answerOf(x), 0); return { text: l ? stripNo(l) : '✓', state: run.marks[i] === false ? 'oldbad' : 'ok', lock: true }; }
    if (i === run.k) { const l = penLine(x, val, 0); return { text: l ? stripNo(l) : null, state: lastWrong && !l ? 'oldbad' : l ? 'filled' : 'empty', old: lastWrong ? lastBad : null }; }
    return { text: null, state: 'empty' };
  }));
  /* 📜 #128 ④ 긴 「나의 풀이」 = 카드 안 스크롤 · 지금 단계가 아래에 보이게 (단계 이름표를 위 끝에 · 다 들어가면 맨 아래) */
  $effect(() => { void key; void says.length; const b = bodyEl; if (!b || !chain) return; requestAnimationFrame(() => { const lab = b.querySelector('.lab') as HTMLElement | null; const max = b.scrollHeight - b.clientHeight; if (max <= 0) return; const top = lab ? lab.getBoundingClientRect().top - b.getBoundingClientRect().top + b.scrollTop - ((b.querySelector('.row') as HTMLElement | null)?.offsetHeight ?? 0) - 6 : max; b.scrollTop = Math.min(max, Math.max(0, top)); measure(); }); });
  /* 📜 #114 ② 꾹 제출 없앰 = 보기 톡 = 고르기(다시 톡 = 바꾸기) · 카드 아래 「제출」 단추(고르기 전엔 흐림) */
  const fx = $derived(flash === 'ok' || flash === 'gold' ? 'good' : flash === 'wrong' || flash === 'swap' ? 'bad' : '');
  /** 📜 #89 제목 = 「문제 2 (1) · 1/2」 만 (차시 · 학습지 글은 뺌) */
  const shortTitle = $derived(title.replace(/^\s*\d+차시\s*학습지\s*·\s*/, ''));
  // 📜 #89 돌린 상자(세로 폰 90°) 안 = 브라우저가 카드 안 스크롤을 못 함(손가락 끌기 0) → 손가락 움직임을 카드 기준으로 바꿔 직접 스크롤
  //   rotate(90deg) = 화면 (dx, dy) → 카드 (dy, −dx) · 카드 위로 끌기 = 화면 오른쪽으로 끌기
  let tch: { x: number; y: number; top: number } | null = null;
  function tStart(e: TouchEvent) { if (!bodyEl?.closest('[data-rot90]') || e.touches.length !== 1) { tch = null; return; } const t = e.touches[0]!; tch = { x: t.clientX, y: t.clientY, top: bodyEl.scrollTop }; }
  function tMove(e: TouchEvent) { if (!tch || !bodyEl) return; const t = e.touches[0]!; const dx = t.clientX - tch.x; bodyEl.scrollTop = tch.top + dx; if (Math.abs(dx) > 4) e.preventDefault(); measure(); }
  $effect(() => { const b = bodyEl; if (!b) return; b.addEventListener('touchstart', tStart, { passive: true }); b.addEventListener('touchmove', tMove, { passive: false }); const end = () => (tch = null); b.addEventListener('touchend', end); return () => { b.removeEventListener('touchstart', tStart); b.removeEventListener('touchmove', tMove); b.removeEventListener('touchend', end); }; });
  // 📜 요청 #61 보기 · 숫자판이 넘치면 카드 아래 그림자 + 「▼ 더 있음」 (작은 가로 화면 = 아래 media 로 먼저 줄여 한 화면에)
  let bodyEl = $state<HTMLDivElement | null>(null), more = $state(false);
  const measure = () => { const b = bodyEl; more = !!b && b.scrollHeight - b.scrollTop - b.clientHeight > 4; };
  $effect(() => { const b = bodyEl; if (!b) return; void key; void hint; measure(); const ro = new ResizeObserver(measure); ro.observe(b); for (const c of b.children) ro.observe(c); const mo = new MutationObserver(measure); mo.observe(b, { childList: true, subtree: true }); return () => { ro.disconnect(); mo.disconnect(); }; });
</script>

<section class="qc" style:--ui-card={fxCss('ui-card')} style:--ui-ch={fxCss('ui-choice')} style:--ui-ch-on={fxCss('ui-choice-on')} class:hitlock={locked > 0} class:fx-good={fx === 'good'} class:fx-bad={fx === 'bad'} data-k="atb-quiz" data-fx={fx} aria-label="문제">
  {#key flashN}{#if fx}<i class="fxr fx-{fx}" aria-hidden="true"></i>{/if}{/key}
  {#if auto}<p class="auto" role="status" data-k="atb-auto">⚔ 자동 공격!</p>{/if}
  <button type="button" class="grab" data-k="atb-qhandle" aria-label="아래로 끌어 넣으면 닫혀요" onpointerdown={(ev) => ongrab?.(ev)}><i></i></button>
  <header>
    <span class="tt" data-k="atb-qtitle">{shortTitle}</span>
    <!-- ⚡ 충전 미리 보기 (📜 요청 #31 · 푸는 게 곧 충전): 소문항 수만큼 기력 조각 · 맞히면 켜짐(첫 시도 = 꽉 · 고쳐 맞힘 = 반) · 퍼펙트 +3 / 고치면 +2 -->
    <span class="shards" class:gather={!!grading?.suck} data-k="atb-shards" aria-label="충전 조각 {done}/{qs.length}">{#each qs as _, i (i)}{@const st = shardOf(i)}<i class="sh {st}" data-st={st}><Orb st={st === 'full' ? 'full' : st === 'half' ? 'half' : 'empty'} size={16} /></i>{/each}</span>
    {#if run.clean}<b class="cpv gold" data-k="atb-chgpv">✨ 퍼펙트 +1</b>{/if}
    {#if help?.mode === 'ask'}<button type="button" class="lnk" class:wait={help.wait} data-k="atb-help" disabled={!hintOk || !q || !!hint || help.wait} onclick={() => onask?.()}>{help.wait ? '⏳ 수호자 기다리는 중' : '💡 도와줘'}</button>{:else}<button type="button" class="lnk" data-k="atb-hint" disabled={!hintOk || !q || !!hint} onclick={() => { if (q) { hint = hintOf(q); onhint?.(); } }}>💡 힌트</button>{/if}
  </header>
  <div class="body" bind:this={bodyEl} onscroll={measure}>
    {#if q && reveal}<div class="reveal" data-k="atb-reveal"><b class="rvt">정답</b><div class="rvq" inert>{#key key}<QItem {q} i={run.k} value={answerOf(q)} runeLen={4} showNo={false} onchange={() => {}} />{/key}</div>{#if solOf(q)}<div class="story why" data-k="atb-reveal-sol"><b>💡 까닭</b><p><SymText text={solOf(q)} /></p></div>{/if}<button type="button" class="rvok" class:on={revealOk} disabled={!revealOk} data-k="atb-reveal-ok" onclick={() => { reveal = false; onpass?.(); }}>✔ 알았어요</button></div>
    {:else if q && chain}<div class="cs" data-k="atb-chain"><ChainStage fold items={qs} stage={grading ? qs.length : run.k} {says} title={shortTitle} value={val} {lastWrong} v4 wrongText={lastBad} {flip} disabled={!!locked} onchange={(v) => (val = v)} /></div>{#if fixWhy}<div class="story why fix bot" data-k="atb-fixwhy" role="status"><b>💡 왜 맞았나</b><p><SymText text={fixWhy} /></p></div>{/if}

    {:else if q}{#if fixWhy}<div class="story why fix" data-k="atb-fixwhy" role="status"><b>💡 왜 맞았나</b><p><SymText text={fixWhy} /></p></div>{/if}<div class="cs" data-k="atb-cells"><AnswerRow {cells} cur={grading ? -1 : run.k} /></div>{#key key}<QItem {q} i={run.k} value={val} runeLen={4} showNo={false} onchange={(v) => (val = v)} />{/key}{/if}
    {#if hint}<p class="hint" class:gd={!!hintBy} role="status">{#if hintBy}<b class="from" data-k="atb-help-from">🛡 {hintBy}가 보낸 힌트</b>{/if}{hint.startsWith('💡') ? hint : `💡 ${hint}`}</p>{/if}
  </div>
  {#if !grading && !reveal}<div class="qrow">{#if canPass}<button type="button" class="qpass" data-k="atb-pass" onclick={startReveal}>⏭ 넘기기</button>{/if}<button type="button" class="qsend" class:on={can && !locked} disabled={!can || !!locked} data-k="atb-submit" onclick={send}>제출</button></div>{/if}
  {#if more}<button type="button" class="more" data-k="atb-qmore" onclick={() => bodyEl?.scrollBy({ top: bodyEl.clientHeight * 0.7, behavior: 'smooth' })}>▼ 더 있음</button>{/if}
  {#if reveal || (fixWhy && chain)}<!-- 📜 #132 정답 · 까닭 줄이 떠 있으면 아래 알림 숨김 (겹침 · 「알았어요」 가림) -->
  {:else if flash === 'ok' || flash === 'gold'}<p class="fb ok" role="status">{flash === 'gold' ? '✔ 한 번에 정답!' : '✔ 정답'} · 다음 단계</p>
  {:else if flash === 'wrong'}<p class="fb bad" role="status">✘ 다시 · 고치면 △</p>
  {:else if flash === 'swap'}<p class="fb bad" role="status">🔥 재도전 · 새 숫자 판으로 처음부터 (구슬은 그대로)</p>
  {:else if flash === 'shieldSwap'}<p class="fb ok" role="status">🛡 실드! 내 칸을 깨기 쉬운 문제로 바꿨어요 (구슬은 그대로)</p>{/if}
  {#if grading}
    <button type="button" class="grade" data-k="atb-grade" aria-label="채점 · 누르면 건너뛰기" onclick={() => onskip?.()}>
      <b class="gt" data-k="atb-grade-title">{grading.perfect ? '🏁 퍼펙트!' : '🏁 완주!'}{#if grading.perfect} <em>✨+1</em>{/if}</b>
      <span class="marks">{#each grading.marks as m, i (i)}<i class="mk" class:tri={!m} style:animation-delay="{0.3 + i * 0.26}s" data-k="atb-mark" data-m={m ? 'o' : 'tri'}>{#if m}○{:else}△<small>고침</small>{/if}</i>{/each}</span>
      <span class="gain" style:animation-delay="{0.3 + grading.marks.length * 0.26}s">구슬 = 한 번에 +1 · 한 번 틀림 +½ · 두 번+ 0 (풀면서 받음){grading.perfect ? (grading.n ? ' · ✨ 퍼펙트 +1 · ATB 가득' : ' · ✨ 퍼펙트 +1 → 가득이라 자동 스킬 · ATB 가득') : ''}</span>
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
  /* 🧾 #128 레이드 부품 = 양피지 위에서도 같은 모양 · 칸 위 배지가 잘리지 않게 */
  .cs { padding: 0 4px 4px; } .cs :global(.row) { position: sticky; top: 0; z-index: 2; padding-bottom: 4px; background: #f3e1b6; } /* 답안 줄 = 위에 붙어 늘 보임 (✔ ✘ 뒤집힘) */
  .cs :global(.row) { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 4px; } .cs :global(.row .cell) { min-height: 40px; padding: 0 4px; font-size: 14px; } /* 카드 폭 45% = 한 줄 (누르는 칸 아님 · 보기만) */ .cs :global(.bcard) { margin-top: 6px; } .cs :global(.story ol) { margin: 2px 0 6px; padding-left: 22px; font: 600 14px var(--font-plain); }
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
  .qc.fx-good { box-shadow: 0 0 0 3px #7de06a, 0 0 22px #7de06a; } .qc.fx-bad { box-shadow: 0 0 0 3px #ff5a4a, 0 0 18px #ff3a2a; }
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
  .qc.fx-good { border-color: #2faa3a; box-shadow: 0 0 0 3px #7de06a, 0 0 22px #7de06a; }
  .qc.fx-bad { border-color: #d0261e; box-shadow: 0 0 0 3px #ff5a4a, 0 0 18px #ff3a2a; }
  /* 🩹 #128 전역 .bad(배너 · theme/ui.css) 와 이름이 겹쳐 오답 때 카드가 진한 갈색으로 가려지던 것 → fx-good · fx-bad */
  .fxr { position: absolute; inset: 0; z-index: 8; pointer-events: none; border-radius: inherit; }
  .fxr.fx-good { background: radial-gradient(circle at 50% 40%, #b8ffb066, #0000 60%); animation: sparkle 0.5s ease-out forwards; }
  @keyframes sparkle { from { opacity: 1; transform: scale(0.9); } to { opacity: 0; transform: scale(1.08); } }
  .fxr.fx-bad { animation: none; }
  .qc.fx-bad { animation: no 0.36s cubic-bezier(.36,.07,.19,.97); }
  @keyframes no { 15% { transform: translateX(-12px); } 30% { transform: translateX(11px); } 45% { transform: translateX(-9px); } 60% { transform: translateX(7px); } 75% { transform: translateX(-4px); } 90% { transform: translateX(2px); } }
  .fb { position: absolute; left: 14px; right: 14px; bottom: calc(64px * var(--u, 1) + 16px); z-index: 4; margin: 0; padding: 3px 10px; border-radius: 8px; background: #fffbeecc; text-align: center; pointer-events: none; }
  /* 짧은 보기 = 2 × 2 · 고른 보기 = 테두리 + ✓ */
  .body :global(.opts.col:has(> .opt:nth-child(4):last-child)), .body :global(.opts.col:has(> .opt:nth-child(2):last-child)) { display: grid; grid-template-columns: 1fr 1fr; }
  .body :global(.opt.on) { position: relative; outline: 3px solid #2f6ad0; outline-offset: -1px; }
  .body :global(.opt.on)::after { content: '✓'; position: absolute; right: 6px; top: 4px; font: 900 16px var(--font); color: #2f6ad0; }
  @media (prefers-reduced-motion: reduce) { .qc.fx-bad, .fxr.fx-good { animation: none; } }
  /* ⚡ 충전 조각 (요청 #31) */
  header { flex-wrap: wrap; row-gap: 2px; }
  .shards { display: inline-flex; gap: 2px; padding: 1px 6px; border-radius: 8px; background: #3a2618; transition: transform 0.4s ease-in, opacity 0.4s; }
  .sh { font-style: normal; line-height: 0; display: inline-flex; } .sh.full, .sh.half { animation: shon 0.36s ease-out; } .sh.zero { opacity: 0.5; } /* ⚡ #125 = 번개 구슬 그림 */
  @keyframes shon { 0% { transform: scale(2.2); } 60% { transform: scale(0.9); } }
  .shards.gather { transform: translate(0, calc(var(--lvh, 1vh) * 34)) scale(1.8); opacity: 0; }
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
  /* 📜 #89 제목 띠(두루마리 리본) 없앰 = 카드 틀을 보통 테두리로 · 머리 한 줄 작게 · 그림 보기 칸 = 흰 바탕 · 진한 테두리 · 그림 칸 가득 · 고른 칸 금색 굵게 */
  .qc { border: 3px solid #b88a4a; border-bottom: none; border-image: none; border-radius: 14px 14px 0 0; background: radial-gradient(ellipse at 50% 40%, #fbf0d6 0%, #f1dfb6 70%, #e2c995 100%); padding-top: 2px; }
  .grab { height: 12px; }
  header { min-height: 20px; flex-wrap: nowrap; gap: 6px; }
  .tt { font-size: 12px; padding: 1px 8px; background: none; border: none; color: #6a4a20; }
  .lnk { font-size: 12px; padding: 2px 4px; margin-left: auto; } .cpv { font-size: 11px; padding: 0 6px; }
  .body { touch-action: pan-y; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .body :global(.opts.grid .opt), .body :global(.chips.figs .chip) { border: 2px solid #6a4a20; border-image: none; border-radius: 10px; background: #fffdf6; box-shadow: 0 2px 0 #b08a52; padding: 4px; }
  .body :global(.opts.grid .opt.on), .body :global(.chips.figs .chip.on) { border: 4px solid #e0a020; box-shadow: 0 0 0 2px #ffd34d, 0 2px 0 #b08a52; outline: none; background: #fffbe6; }
  .body :global(.opts.grid .opt svg), .body :global(.chips.figs .chip svg) { width: 100%; height: auto; max-height: none; display: block; }
  .body :global(.opts.grid .opt svg :is(ellipse, circle, rect, path, line, polyline, polygon)[stroke]:not([stroke='none'])), .body :global(.chips.figs .chip svg :is(ellipse, circle, rect, path, line, polyline, polygon)[stroke]:not([stroke='none'])) { stroke-width: 2.4; }
  .body :global(.opts.grid .opt svg text), .body :global(.chips.figs .chip svg text) { font-weight: 800; }
  .body :global(.opts.grid), .body :global(.chips.figs) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  @media (max-height: 430px) { .body :global(.opts.grid .opt), .body :global(.chips.figs .chip) { padding: 2px; } }
  /* ── 📜 #102 ② 꾹 제출 (아래 단추 줄이 카드 밖 = 아래 여백 줄임) ── */
  .qc { padding-bottom: 8px; }
  .qsend { flex: 0 0 auto; height: 48px; border-radius: 12px; border: 2px solid #8a7a5a; background: #d9cfb8; color: #7a6e58; font: 900 16px var(--font-plain); box-shadow: 0 3px 0 #0006; }
  .qsend.on { border-color: #5a3a08; background: linear-gradient(#ffd47a, #f0a93a); color: #2a1a04; box-shadow: 0 3px 0 #000; }
  .qsend.on:active { transform: translateY(2px); box-shadow: 0 1px 0 #000; }
  /* ── 🛡 #103 도와줘 · 수호자 힌트 ── */
  .lnk.wait { opacity: 1; color: #6b5a3a; }
  .hint.gd { border: 2px solid #5b8fd6; background: #eaf2ff; }
  .hint .from { display: block; font: 900 14px var(--font-plain); color: #2b4f8a; margin-bottom: 2px; }
  /* ── ⏭ #123 넘기기 · 정답 보기 ── */
  .qrow { flex: 0 0 auto; display: flex; gap: 8px; } .qrow .qsend { flex: 1; }
  .qpass { flex: 0 0 38%; height: 48px; border-radius: 12px; border: 2px solid #c9a24a; background: #6b6e78; color: #fff; font: 900 16px var(--font-plain); box-shadow: 0 3px 0 #0008; }
  .reveal { display: grid; gap: 6px; padding: 8px; border-radius: 10px; border: 2px solid #3aa86a; background: #eefbf2; }
  .reveal .rvt { font: 900 14px var(--font-plain); color: #1e7a48; }
  .reveal .rvq { pointer-events: none; }
  .reveal .rvs { margin: 0; font: 700 14px var(--font-plain); color: #2a3a2e; }
  .reveal .rvok { height: 48px; border-radius: 12px; border: 2px solid #8a7a5a; background: #d9cfb8; color: #7a6e58; font: 900 16px var(--font-plain); }
  .reveal .rvok.on { border-color: #5a3a08; background: linear-gradient(#ffd47a, #f0a93a); color: #2a1a04; box-shadow: 0 3px 0 #000; }

  /* 📏 📜 #130 ⑤ 카드 폭 45% · 누르는 칸 = 44px 이상 (보기 · O X · 고르기 칩 · 숫자 키 · 지우기) · 앞의 낮춘 크기(#61)보다 뒤에 둠 = 이김 · 넘치면 카드 안 스크롤 + 「▼ 더 있음」 */
  .body :global(.rune-keys) { grid-auto-flow: row; grid-template-columns: repeat(5, minmax(44px, 1fr)); grid-auto-columns: auto; gap: 4px; }
  .body :global(.rune) { min-height: 44px; height: 44px; width: auto; min-width: 44px; aspect-ratio: auto; }
  .body :global(.rune-del) { min-width: 48px; min-height: 44px; }
  .body :global(.opt) { min-height: 44px; }
  .body :global(.chips) { grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); }
  .body :global(.chips .chip), .body :global(.chips.wide .chip), .body :global(.chips.many.wide .chip), .body :global(.chips.one .chip) { min-height: 44px; min-width: 44px; }

  /* 💡 📜 #132 까닭 줄 = 레이드 「📜 나의 풀이」와 같은 .story 모양 · 글씨 (theme/ui.css) · 긴 줄 = 말줄임 없이 줄바꿈 */
  .story.why { margin: 4px 0; padding: 4px 10px; background: #fff7d6; border: 1px solid #e0c070; }
  .story.why b { font: 800 14px var(--font-plain); color: #7a4e10; }
  .story.why p { margin: 2px 0 0; font: 700 14px/1.45 var(--font-plain); color: #1f5a2c; white-space: normal; overflow-wrap: anywhere; }
  .story.why.fix { animation: whyin 0.2s ease-out; }
  .story.why.fix.bot { position: sticky; bottom: 0; z-index: 3; box-shadow: 0 -4px 10px #0003; } /* 소레이드 = 카드가 지금 단계로 스크롤되어도 아래에 붙어 보임 */ @keyframes whyin { from { opacity: 0; translate: 0 -4px; } }
</style>
