<script lang="ts">
  import Sheet from '../battle/Sheet.svelte';
  import type { Store } from '../../model/types';
  import { blank, check, CMP, firstGap, MAXT, PAIR, PICKS, rewardWrites, SCALE, submit, togglePick, WHEN } from '../../school/survey';
  import { sfx } from '../sound.svelte';

  // 📝 수업 설문 창 (정식 js/raid/survey.js open() 그대로 · 아래 시트 · 이름 없이 3분)
  //   ☑ 「2학기 중간고사 전 · 지금 비교」 체크 전엔 A 문항 잠김(누르면 체크 칸이 흔들림) · 보내기 = 빈칸이면 그 문항으로 · 보상 +5 EXP · 💎 +10 (한 번 · 한도 밖)
  const { S, cls, num, no, excluded, onpaid, onclose }: { S: Store; cls: string; num: number; no: number; excluded: boolean; onpaid: (gem: number, xp: number) => void; onclose: () => void } = $props();
  const a = $state(blank());
  let ack = $state(false), err = $state(''), busy = $state(false), nope = $state(0), shakeQ = $state(-1);
  let box = $state<HTMLElement | null>(null), ackEl = $state<HTMLElement | null>(null);
  const setR = (i: number, w: number, v: number) => { a.r[i]![w] = v; if (err && ack) err = ''; };
  function locked(e: Event) { if (ack) return; e.preventDefault(); e.stopPropagation(); nope++; err = '먼저 위의 「☐ 네, 2학기 중간고사 전과 … 알았어요」에 체크해 주세요'; ackEl?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  async function send() {
    if (busy) return;
    if (!ack) { nope++; err = '먼저 「☐ 네, 2학기 중간고사 전과 … 알았어요」에 체크해 주세요'; ackEl?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    const e = check(a);
    if (e) { err = e; const g = firstGap(a); shakeQ = g; box?.querySelectorAll('.q')[g]?.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => (shakeQ = -1), 500); return; }
    busy = true; err = '';
    try {
      await submit(S, cls, num, a, no, excluded);
      const r = rewardWrites(S, cls, num, S.now());
      for (const [k, v] of r.writes) S.set(k, v);
      onpaid(r.gem, r.xp);
      sfx('correct', 0.8);
      onclose();
    } catch (x) { err = (x as { user?: boolean; message?: string }).user ? String((x as Error).message) : '보내지 못했어요. 다시 눌러 주세요.'; busy = false; }
  }
</script>

<Sheet {onclose} tall mainText={busy ? '보내는 중…' : '📝 보내기'} mainDisabled={busy} onmain={send} why={err}>
  {#snippet title()}📝 우리 반 수업 설문 <small class="no">· {no}차시</small>{/snippet}
  <div class="sv" bind:this={box} data-k="survey">
    <p class="anon">🔒 이름 · 번호가 저장되지 않아요. <b>선생님도 누가 뭐라고 답했는지 볼 수 없어요.</b> 점수와도 상관없으니 솔직하게!</p>
    <p class="h">A. 『<b class="pre">2학기 중간고사 전</b>』 수학 시간과 『<b class="now">지금</b>』 던전 수업을 각각 골라요 · <b class="not1">1학기가 아니에요!</b></p>
    <p class="big">🕰 2학기 중간고사 전 <small>(게임 없이 하던 수업)</small></p>
    {#key nope}<label class="ack" class:on={ack} class:nope={nope > 0} bind:this={ackEl} data-k="sv-ack"><input type="checkbox" bind:checked={ack} onchange={() => { if (ack) { err = ''; sfx('click', 0.6); } }} /><span>네, <b>2학기 중간고사 전</b>(게임 없이 하던 수업)과 <b>지금</b>을 비교한다는 걸 알았어요</span></label>{/key}
    <div class="a" class:lock={!ack} onclickcapture={locked} role="group" aria-label="A 문항">
      <p class="legend">1 전혀 아니다 · 2 아니다 · 3 보통 · 4 그렇다 · 5 매우 그렇다</p>
      {#each PAIR as q, i (i)}
        <div class="q" class:shake={shakeQ === i}><p><b>{i + 1}.</b> {q}</p>
          {#each WHEN as w, k (k)}<div class="scale" role="radiogroup" aria-label="{i + 1}번 {w}"><span class="when" class:now={k === 1}>{w}</span>{#each SCALE as s, v (v)}<button type="button" class:on={a.r[i]?.[k] === v + 1} aria-pressed={a.r[i]?.[k] === v + 1} title={s} data-sv="{i}-{k}-{v + 1}" onclick={() => setR(i, k, v + 1)}>{v + 1}</button>{/each}</div>{/each}
        </div>
      {/each}
    </div>
    <p class="h">B. 지금 던전 수업</p>
    <div class="q" class:shake={shakeQ === 7}><p><b>8.</b> 가장 도움이 된 것 <small>(2개까지)</small></p><div class="chips">{#each PICKS as t, i (i)}<button type="button" class:on={a.pick.includes(i)} aria-pressed={a.pick.includes(i)} data-pick={i} onclick={() => { a.pick = togglePick(a.pick, i); err = ''; }}>{a.pick.includes(i) ? '✓ ' : ''}{t}</button>{/each}</div></div>
    <div class="q" class:shake={shakeQ === 8}><p><b>9.</b> 쉼터 놀이를 예전 5분 퀴즈와 비교하면</p><div class="chips">{#each CMP as t, i (i)}<button type="button" class:on={a.cmp === i} aria-pressed={a.cmp === i} data-cmp={i} onclick={() => { a.cmp = i; err = ''; }}>{a.cmp === i ? '✓ ' : ''}{t}</button>{/each}</div></div>
    <div class="q"><p><b>10.</b> 던전 수업에서 내가 달라진 점 한 가지 <small>(안 써도 돼요)</small></p><textarea maxlength={MAXT} rows="2" bind:value={a.say} data-k="sv-say"></textarea></div>
    <div class="q"><p><b>11.</b> 바꿨으면 하는 점 <small>(안 써도 돼요)</small></p><textarea maxlength={MAXT} rows="2" bind:value={a.want} data-k="sv-want"></textarea></div>
    <p class="rw">보내면 +5 EXP · 💎 +10 (한 번)</p>
  </div>
</Sheet>

<style>
  .no { color: var(--text-3); font-size: 14px; font-weight: 500; }
  .sv { display: flex; flex-direction: column; gap: var(--s3); padding-bottom: var(--s4); }
  .sv p { margin: 0; font-size: 15px; line-height: 1.5; }
  .anon { padding: var(--s3); border-radius: var(--r); background: var(--surface-2); color: var(--text-2); }
  .anon b { color: var(--text); }
  .h { font-weight: 700; }
  .pre { color: var(--gem); } .now { color: var(--accent); } .not1 { color: var(--bad); }
  .big { font-size: 18px !important; font-weight: 700; color: var(--gem); }
  .big small { font-size: 14px; color: var(--text-2); font-weight: 500; }
  .ack { display: flex; gap: var(--s3); align-items: flex-start; min-height: var(--tap); padding: var(--s3); border-radius: var(--r); border: 2px solid var(--accent); background: var(--surface-2); font-size: 15px; line-height: 1.45; }
  .ack.on { border-color: var(--ok); }
  .ack.nope { animation: nope 0.3s; }
  .ack input { width: 24px; height: 24px; flex: none; margin: 0; accent-color: var(--ok); }
  .a { display: flex; flex-direction: column; gap: var(--s3); transition: opacity var(--t); }
  .a.lock { opacity: 0.4; }
  .legend { color: var(--text-3); font-size: 14px !important; }
  .q { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); border-radius: var(--r); background: var(--surface-2); }
  .q.shake { animation: nope 0.3s; box-shadow: inset 0 0 0 2px var(--bad); }
  .q small { color: var(--text-3); font-size: 14px; }
  .scale { display: grid; grid-template-columns: 1fr repeat(5, 40px); gap: 4px; align-items: center; }
  .when { font-size: 14px; color: var(--gem); font-weight: 700; }
  .when.now { color: var(--accent); }
  .scale button { height: var(--tap); border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 16px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .scale button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .scale button:active { transform: translateY(2px); box-shadow: none; }
  .chips { display: flex; flex-wrap: wrap; gap: var(--s2); }
  .chips button { min-height: var(--tap); padding: 0 var(--s3); border-radius: 24px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 700 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); }
  .chips button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .chips button:active { transform: translateY(2px); box-shadow: none; }
  textarea { width: 100%; box-sizing: border-box; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 500 16px var(--font); padding: var(--s2) var(--s3); resize: none; }
  .rw { color: var(--text-3); font-size: 14px !important; text-align: center; }
  @keyframes nope { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
</style>
