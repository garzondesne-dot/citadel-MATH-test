<script lang="ts">
  import type { Given, LessonPack, Room, Store } from '../../model/types';
  import { emptyOf, filled, finalOf } from '../../engine/input';
  import { CHAIN_SLOTS, chainDown, chainItems, chainRecord, PRAC_MAX, pracUsed } from '../../raid/raid';
  import { chainSubmit, pracStart } from '../../raid/actions';
  import ChainStage from './ChainStage.svelte';

  // ⚔ 소레이드 학생 화면 (정식 chainView): 지금 단계 하나 · 졸개 오답 −½ · 대장 오답 −1 · 1칸 남으면 🙋 선생님 확인
  //   대장 처치 뒤 = 「🔥 한 판 더 (n/3)」 (저절로 넘어가지 않음 · 나타난 뒤 1.5초 잠금) · 연습 판 = 숫자 바뀜 · 📜 원문 · 💡 근거 빈칸
  //   (b3 범위 밖: ✍ 서술형 📸 · ⛓ 묶기 · 💚 힐 · 💡 힌트 주기)
  const { S, L, R, code, mid, uid, now, locked, title }: { S: Store; L: LessonPack; R: Room; code: string; mid: string; uid: string; now: number; locked: boolean; title: string } = $props();
  const rec = $derived(chainRecord(L, R, mid, uid));
  let pracPass = $state<number | null>(null); // 지금 보는 연습 판 (null = 첫 판)
  const prac = $derived(rec.done && pracPass != null);
  const pass = $derived(prac ? (pracPass as number) : 0);
  const pItems = $derived(prac ? chainItems(L, R, mid, uid, pass) : rec.items);
  const stage = $derived(prac ? (rec.pass === pass ? rec.pStage : 0) : rec.stage);
  const says = $derived(prac ? (rec.pass === pass ? rec.pSays : []) : rec.says);
  const needWhy = $derived(prac && rec.pass === pass && rec.pWhy >= 0);
  const wq = $derived(needWhy ? pItems[rec.pWhy] : null);
  const pFail = $derived(prac && rec.pass === pass && rec.pFail);
  const pDone = $derived(prac && stage >= pItems.length && !needWhy);
  const q = $derived(pItems[Math.min(stage, pItems.length - 1)]);
  const key = $derived(`${mid}|${pass}|${stage}|${rec.nextK}`);
  let given = $state<Given>(null);
  let formKey = '';
  $effect(() => { if (key !== formKey) { formKey = key; given = q ? emptyOf(q) : null; } });
  const ready = $derived(!!q && filled(q, given));
  const downs = $derived(chainDown(L, R, mid, now).filter((d) => d.down).map((d) => d.k));
  const lastWrong = $derived(!prac && !!rec.lastWrong && rec.lastWrong.s === stage);
  const used = $derived(pracUsed(R, mid, uid, rec));
  const pLeftN = $derived(Math.max(0, PRAC_MAX - used));
  // 🔥 한 판 더 단추: 나타난 뒤 1.5초 잠금 (대장을 잡은 손가락이 같은 자리를 눌러 저절로 넘어가지 않게)
  let armKey = '', armAt = $state(0);
  const pracShown = $derived((!prac && rec.done) || pDone || pFail);
  $effect(() => { const k = `${pass}|${pracShown}`; if (pracShown && k !== armKey) { armKey = k; armAt = Date.now() + 1500; } });
  let toast = $state('');
  function go() {
    if (!q || !ready || locked) return;
    const before = stage, err = chainSubmit(S, L, code, mid, uid, stage, pass, finalOf(q, given));
    if (err) { toast = err; return; }
    const r2 = chainRecord(L, S.get<Room>(`rooms/${code}`) as Room, mid, uid);
    const okNow = prac ? r2.pass === pass && r2.pStage > before : r2.stage > before;
    toast = okNow ? (before === pItems.length - 1 ? (prac ? '✔ 연습 사슬 완성!' : r2.perfect ? '🌟 퍼펙트 사슬!' : '👑 대장 처치!') : `✔ 졸개 ${'①②③④⑤⑥'[before]} 처치!`)
      : prac ? (r2.pFail ? '✘ 이번 연습 판은 기회를 다 썼어요' : `✘ 틀렸어요 · 연습 기회 −${before === pItems.length - 1 ? 1 : 0.5}`)
      : r2.locked ? '🙋 기회 1칸 — 선생님 확인을 기다려요' : r2.fail ? '기회를 다 썼어요' : `✘ 틀렸어요 · 기회 −${before === rec.n - 1 ? 1 : 0.5}`;
  }
  function why(i: number) {
    const err = chainSubmit(S, L, code, mid, uid, rec.pWhy, pass, i, 1);
    if (err) { toast = err; return; }
    const r2 = chainRecord(L, S.get<Room>(`rooms/${code}`) as Room, mid, uid);
    toast = r2.pWhy < 0 ? '💡 근거 완성!' : '다시 골라 봐요 — 벌은 없어요';
  }
  function again() { const p = pracStart(S, L, code, mid, uid); if (p) { pracPass = p; toast = ''; } }
  const slotsTxt = $derived(prac && !pDone && !pFail ? `연습 기회 ${rec.pass === pass ? rec.pLeft : CHAIN_SLOTS}/${CHAIN_SLOTS}` : `기회 ${rec.left}/${rec.slots}`);
</script>

{#if needWhy && wq?.why}
  <ChainStage items={pItems} stage={pItems.length} {says} {title} value={null} prac {downs} onchange={() => {}} />
  <div class="paper why">
    <div class="paper-h"><b>💡 근거 한 줄</b><small>틀려도 괜찮아요 · 다시 골라요</small></div>
    <p>{wq.why.pre} <b class="bl">____</b>{wq.why.post}</p>
    <div class="opts">{#each wq.why.choices as c, i (i)}<button class="opt" onclick={() => why(i)}>{c}</button>{/each}</div>
  </div>
{:else if rec.fail}
  <p class="note">끝까지 못 맞혔어요 — 아래 풀이를 학습지에 옮겨 적고 복습에서 다시 도전해요.</p>
  <div class="story"><b>📜 나의 풀이</b><ol>{#each rec.items as x, k (k)}<li>{x.say}</li>{/each}</ol></div>
{:else if !prac && rec.done}
  <p class="big">{rec.perfect ? '🌟 퍼펙트 사슬!' : '🎉 대장 처치!'}</p>
  <div class="story"><b>📜 나의 풀이</b><ol>{#each says as t, k (k)}<li>{t}</li>{/each}</ol></div>
  <p class="sub">숫자만 바뀐 새 문제 · 판마다 연습 기회 4칸 · 수업 기록 그대로 · 데미지 0</p>
{:else if pFail}
  <p class="note">✘ 이번 연습 판은 기회를 다 썼어요 — 끝 · 아래 풀이를 보고 다시 해 봐요</p>
  <div class="story"><b>📜 나의 풀이</b><ol>{#each pItems as x, k (k)}<li>{x.say}</li>{/each}</ol></div>
{:else if pDone}
  <p class="big">✔ 연습 사슬 완성!</p>
  <div class="story"><b>📜 나의 풀이</b><ol>{#each says as t, k (k)}<li>{t}</li>{/each}</ol></div>
{:else if rec.locked && !prac}
  <ChainStage items={pItems} stage={pItems.length} {says} {title} value={null} {downs} onchange={() => {}} />
  <div class="lock"><b>🙋 선생님 확인을 기다려요</b><p>기회가 1칸 남았어요 — 학습지에 풀이를 정리해 두면 선생님이 와서 확인해 줘요.</p></div>
{:else}
  <ChainStage items={pItems} {stage} {says} {title} value={given} {lastWrong} {prac} disabled={locked} {downs} onchange={(v) => (given = v)} />
{/if}
{#if toast}<p class="toast" role="status">{toast}</p>{/if}
<div class="dock">
  <span class="slots">{slotsTxt}</span>
  {#if needWhy}<span></span>
  {:else if pracShown}
    {#if pLeftN > 0}<button class="go" disabled={armAt > now} onclick={again}>🔥 한 판 더 <small>{pLeftN}/{PRAC_MAX}</small></button>{:else}<span class="wait">🔥 연습 {PRAC_MAX}번 끝!</span>{/if}
  {:else if rec.fail}<span></span>
  {:else if rec.locked && !prac}<span class="wait">🙋 확인 기다림</span>
  {:else}<button class="go" disabled={!ready || locked} onclick={go}>{prac ? '⚔ 연습 공격' : '⚔ 공격!'}</button>{/if}
</div>

<style>
  .paper { background: var(--card); border: 1px solid var(--muted); border-radius: 12px; padding: 10px 12px; }
  .paper-h { display: flex; flex-wrap: wrap; gap: 4px 8px; justify-content: space-between; align-items: baseline; }
  .paper-h small { color: var(--sub); }
  .why p { overflow-wrap: anywhere; }
  .bl { color: var(--accent); }
  .opts { display: flex; flex-direction: column; gap: 8px; }
  .opt { min-height: 44px; text-align: left; overflow-wrap: anywhere; }
  .story { background: var(--card); border: 1px solid var(--muted); border-radius: 10px; padding: 8px 10px; margin: 6px 0; overflow-wrap: anywhere; }
  .story ol { margin: 4px 0 0; padding-left: 1.3rem; }
  .note { font-size: 0.9rem; background: var(--muted); border-radius: 8px; padding: 6px 8px; }
  .lock { border: 2px dashed var(--accent); border-radius: 12px; padding: 8px 12px; margin-top: 8px; }
  .big { font-size: 1.3rem; font-weight: 700; color: var(--accent); }
  .sub { color: var(--sub); font-size: 0.85rem; }
  .toast { font-weight: 700; text-align: center; margin: 8px 0 0; }
  .dock { position: sticky; bottom: 0; display: flex; gap: 8px; align-items: center; padding: 8px 0; background: var(--bg); }
  .slots { color: var(--sub); font-size: 0.9rem; white-space: nowrap; }
  .wait { flex: 1; text-align: center; color: var(--sub); }
  .go { flex: 1; min-height: 48px; font-size: 1.1rem; font-weight: 700; border-color: var(--accent); }
  .go:disabled { opacity: 0.5; }
</style>
