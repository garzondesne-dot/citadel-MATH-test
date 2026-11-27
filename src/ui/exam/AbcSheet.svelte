<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Store } from '../../model/types';
  import BottomAction from '../battle/BottomAction.svelte';
  import { EXAM_ART } from '../manifest';
  import { sfx } from '../sound.svelte';
  import { ABC_HELP_AT, ABC_TXT, abcKeys, abcOpen, abcRecPath, abcStep, keyFor, submitAbc, type AbcRec, type AbcStep } from '../../school/abcSheet';
  // 🚪 던전 문 1차 · 📄 기말 대비 답안지 (📜 11/25 · 머리 🔨): 종이로 푼 답을 7줄 × ① ~ ④ 로 고름 → 「정말 낼까요?」 → 채점
  //   7 / 7 = 통과(던전 문 돌) · 아니면 틀린 번호만(정답 안 보임) + 다음 세트 · C 뒤 = 틀린 번호만 다시 입력
  //   열림 = 선생님이 그 반을 열어 둔 동안(open) · base 없음(🧪 테스트 · 교사) = 이 화면 안에서만 기록
  //   🌀 차원문 수업 (📜 11/28): inline = 수업 화면 안(닫기 없음) · live = 그 반 차원문 수업 중(열림) · practice = 📄 B세트부터 연습(기록 · 보상 없음 · 판 수만) · onsubmit = 낸 뒤 (통과 → 부모가 통과 화면)
  const { S, base = null, cls = null, oncastle, onclose, inline = false, live = null, practice = false, onsubmit }: { S: Store; base?: string | null; /** 반 (null = 🧪 테스트 · 교사 = 늘 열림) */ cls?: string | null; oncastle?: () => void; onclose: () => void; inline?: boolean; live?: boolean | null; practice?: boolean; onsubmit?: (r: { pass: boolean; practice: boolean }) => void } = $props();
  let ver = $state(0); { const tk = setInterval(() => ver++, 2000); onDestroy(() => clearInterval(tk)); } // 서버 칸(열림 · 정답표)이 늦게 와도 따라감
  const open = $derived.by(() => { void ver; return live != null ? live : cls == null || abcOpen(S, cls); });
  const T = ABC_TXT, CIRC = ['①', '②', '③', '④'];
  // 기록 = 서버 거울에서 늘 다시 읽음(늦게 와도 · 다른 기기에서 낸 것도) · 🧪 테스트 = 이 화면 안(local)
  let local = $state<AbcRec | null>(untrack(() => (practice ? { A: { nums: [], g: '', wrong: [], at: 0 } } : null))), saved = $state(0); // 📄 연습 = A 를 건너뛴 채 B 부터 (이 화면 안에만)
  const rec = $derived.by<AbcRec | null>(() => { void ver; void saved; return base && !practice ? (S.get<AbcRec>(abcRecPath(base)) ?? null) : local; });
  const ready = $derived.by(() => { void ver; return practice || !base || !S.loaded || S.loaded(abcRecPath(base)) || S.loaded(base); }); // 🐞 내 기록이 오기 전엔 못 냄(낸 세트를 다시 내는 일 막기)
  let given = $state<number[]>([]), ask = $state(false), res = $state<{ ok: number; total: number; wrong: number[]; title: string } | null>(null);
  const st = $derived<AbcStep>(abcStep(rec));
  const key = $derived.by(() => { void ver; return keyFor(st, abcKeys(S)); });
  const nums = $derived(st.kind === 'done' ? [] : st.nums);
  $effect(() => { const n = nums.length; untrack(() => { if (given.length !== n) given = Array(n).fill(0); }); });
  const blanks = $derived(given.filter((x) => !x).length);
  const title = $derived(st.kind === 'set' ? `${st.set}세트` : st.kind === 'redo' ? `C세트 다시 · ${st.round}번째` : '통과');
  function submit() {
    if (!key || !open || !ready) return;
    if (!ask) { ask = true; return; }
    const at = Date.now(), r = submitAbc(rec, key, given.slice(), at), t = title;
    if (base && !practice) { S.set(abcRecPath(base), r.rec); saved++; } else local = r.rec;
    res = { ok: r.ok, total: r.total, wrong: r.wrong, title: t }; ask = false; given = [];
    sfx(r.wrong.length ? 'smash' : 'finish', 0.6); scrollTo?.({ top: 0 });
    onsubmit?.({ pass: !r.wrong.length, practice });
  }
  const why = $derived(!open ? T.closed : !key ? T.noKey : !ready ? '내 기록 불러오는 중…' : '');
  const mainText = $derived(ask ? (blanks ? `빈칸 ${blanks}개 · 정말 낼까요?` : '정말 낼까요? · 세트마다 한 번') : '📝 제출');
</script>

<div class="ab" class:inline data-k="abc-sheet" data-step={st.kind} data-set={st.kind === 'set' ? st.set : st.kind} data-practice={practice ? '1' : '0'} style:--bg="url({EXAM_ART.bg})">
  <header class="top">
    <button type="button" class="back" aria-label="닫기" onclick={onclose}>‹</button>
    <b class="ttl">{practice ? '📄 연습 · 기록 안 남아요' : T.name}</b>
  </header>

  {#if res}
    <section class="res" data-k="abc-result" data-pass={!res.wrong.length}>
      <p class="rt">{res.title}</p>
      {#if !res.wrong.length}
        <div class="stones" aria-hidden="true">{#each Array(7) as _, i (i)}<i style="--i:{i}">🪨</i>{/each}</div>
        <p class="big ok" data-k="abc-pass">{practice ? '7 / 7 · 연습 통과!' : T.pass}</p>
        <p class="sub">{practice ? '연습은 기록 · 조각 · 에너지 · 보상이 없어요' : T.after}</p>
      {:else}
        <p class="big" data-k="abc-score">{T.fail(res.ok, res.total)}</p>
        <p class="sub">{T.wrongLine}</p>
        <div class="wnums" data-k="abc-wrong">{#each res.wrong as n (n)}<b>{n}번</b>{/each}</div>
        {#if st.kind === 'redo' && st.round > ABC_HELP_AT}<p class="help" data-k="abc-help">{T.help}</p>{/if}
      {/if}
    </section>
    {#if st.kind === 'done' || (practice && st.kind === 'redo')}
      <BottomAction dock={false} mainLabel={practice ? '연습 끝' : '🏰 성채 던전으로'} text={practice ? '◀ 연습 끝' : '🏰 성채 던전으로'} onmain={() => (oncastle ? oncastle() : onclose())} />
    {:else}
      <BottomAction dock={false} mainLabel={st.kind === 'set' ? T.next(st.set) : T.redo} text={st.kind === 'set' ? T.next(st.set) : T.redo} onmain={() => { res = null; scrollTo?.({ top: 0 }); }} />
    {/if}
  {:else if st.kind === 'done'}
    <section class="res" data-k="abc-done">
      <div class="stones still" aria-hidden="true">{#each Array(7) as _, i (i)}<i style="--i:{i}">🪨</i>{/each}</div>
      <p class="big ok">통과했어요 · {st.by === 'R' ? 'C세트 다시' : `${st.by}세트`}</p>
      <p class="sub">{T.after}</p>
    </section>
    <BottomAction dock={false} mainLabel="🏰 성채 던전으로" text="🏰 성채 던전으로" onmain={() => (oncastle ? oncastle() : onclose())} />
  {:else}
    <div class="paper" data-k="abc-paper">
      <p class="set" data-k="abc-set">{title}</p>
      <p class="head">{st.kind === 'redo' ? T.redoHead(st.nums.length) : T.intro}</p>
      {#if st.prev && st.kind === 'set'}<p class="prev" data-k="abc-prev">지난 세트에서 틀린 번호 · {st.prev.wrong.join(', ')}</p>{/if}
      {#each nums as n, i (n)}
        <div class="row" data-k="abc-row" data-n={n}>
          <b class="no">{n}.</b>
          <div class="opts" role="radiogroup" aria-label="{n}번 답">
            {#each CIRC as c, k (k)}<button type="button" role="radio" aria-checked={given[i] === k + 1} class:on={given[i] === k + 1} data-k="abc-opt" data-v={k + 1} disabled={!open || !key} onclick={() => { given[i] = given[i] === k + 1 ? 0 : k + 1; ask = false; }}>{c}</button>{/each}
          </div>
        </div>
      {/each}
    </div>
    <BottomAction dock={false} mainLabel={mainText} text={mainText} disabled={!open || !key || !ready} {why} onmain={submit} />
  {/if}
</div>

<style>
  .ab.inline:not([data-practice='1']) .back { visibility: hidden; }
  .ab.inline { position: relative; inset: auto; z-index: auto; min-height: 100%; max-width: none; }
  .ab { position: fixed; inset: 0; z-index: 40; overflow-y: auto; background: #120a1c var(--bg) center top / cover no-repeat; color: var(--text); display: flex; flex-direction: column; max-width: 430px; margin: 0 auto; }
  .top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 12px; background: rgba(18, 10, 28, 0.92); }
  .back { width: 44px; height: 44px; border: 0; background: none; color: #fff; font-size: 28px; }
  .ttl { flex: 1; font: 800 18px var(--font); color: #fff; }
  .paper { margin: 12px; padding: 16px 14px 20px; border-radius: 8px; background: #fbfaf6; color: #1b1b1b; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45); display: grid; gap: 10px; }
  .set { margin: 0; font: 900 28px var(--font); text-align: center; letter-spacing: 0.04em; }
  .head { margin: 0; padding-bottom: 8px; border-bottom: 2px solid #1b1b1b; font: 700 14px/1.5 var(--font); text-align: center; color: #3a3a3a; }
  .prev { margin: 0; font: 700 14px var(--font); color: #a3261f; text-align: center; }
  .row { display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: center; gap: 4px; padding: 6px 0; border-top: 1px dashed #c9c4b6; }
  .no { font: 900 20px var(--font); }
  .opts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .opts button { min-height: 48px; border-radius: 12px; border: 2px solid #1b1b1b; background: #fff; color: #1b1b1b; font: 800 22px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .opts button.on { background: #1b1b1b; color: #ffd25a; box-shadow: none; transform: translateY(2px); }
  .opts button:disabled { opacity: 0.45; box-shadow: none; }
  .res { padding: 20px 16px; display: grid; gap: 12px; justify-items: center; text-align: center; }
  .rt { margin: 0; font: 900 22px var(--font); color: #fff; }
  .big { margin: 0; font: 800 22px/1.4 var(--font); color: #fff; } .big.ok { color: #ffd25a; }
  .sub { margin: 0; color: #e8e2f2; font: 600 15px var(--font); }
  .wnums { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
  .wnums b { min-width: 64px; padding: 10px 12px; border-radius: 12px; background: #fbfaf6; color: #a3261f; font: 900 20px var(--font); }
  .help { margin: 0; padding: 10px 14px; border-radius: 12px; background: #fffbe8; color: #2a1d06; font: 800 15px var(--font); }
  .stones { display: flex; gap: 4px; font-size: 30px; }
  .stones i { font-style: normal; animation: st 0.5s ease-out both; animation-delay: calc(var(--i) * 0.12s); }
  .stones.still i { animation: none; }
  @keyframes st { from { opacity: 0; transform: translateY(-24px) scale(0.6); } }
  @media (prefers-reduced-motion: reduce) { .stones i { animation: none; } }
</style>
