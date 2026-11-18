<script lang="ts">
  import type { Store } from '../../model/types';
  import { approveQuest, fixQuest, GRADE_IC, GRADE_NAME, CHANGES, type QRow } from '../../school/quest';
  // ✏ #75 출제 안건 하나 (소식 탭 「✏ 출제」 · 누르면 그 자리에서): 바탕 문제 ↔ AI 가 옮긴 학생 문제 나란히 · AI 두 번 풀이 · ✅ 출제 승인 / ✏ 고쳐 주세요 + 메모
  //   🔵 승인 = 그 반 「친구 문제」 · 🟣 승인 = 🏛 명예의 전당 · 그림 문제 = 보상만 · 학생 💎 📜 = 학생 폰이 다음에 열 때 받음
  const { S, x, ondone }: { S: Store; x: QRow; ondone: (ok: boolean, saved: boolean) => void } = $props();
  let note = $state(''), busy = $state(false);
  async function go(ok: boolean) { if (busy) return; busy = true; const saved = ok ? await approveQuest(S, x, note) : await fixQuest(S, x, note); busy = false; ondone(ok, saved); }
  const chg = (x.changed || []).map((k) => CHANGES.find((c) => c[0] === k)?.[1]).filter(Boolean).join(' · ');
</script>

<div class="qc" data-k="quest-check-t">
  <p class="gd">{GRADE_IC[x.grade]} {GRADE_NAME[x.grade]} 후보 · {x.type === 'obj' ? '객관식' : '주관식'}{chg ? ` · 학생 체크: ${chg}` : ''}{x.picture ? ' · 🖼 그림 문제(게임 문제로 안 만듦)' : ''}</p>
  <div class="two">
    <div><span class="lab">🏰 바탕 ({x.base?.room})</span><p>{x.base?.text ?? ''}</p><small>정답 {x.base?.answer ?? ''}</small></div>
    <div><span class="lab">✏ 학생 문제 (AI 옮김)</span><p>{x.problem}</p>{#if x.choices?.length}<ol>{#each x.choices as c, i (i)}<li>{c}</li>{/each}</ol>{/if}<small>정답 {x.answer}</small></div>
  </div>
  <div class="sv"><span class="lab">🤖 AI 두 번 풀이 {x.agree ? '✔ 같음' : '⚠ 다름'}</span><p>① {x.solve1}</p><p>② {x.solve2}</p></div>
  {#if x.issues?.length}<p class="is">⚠ {x.issues.join(' · ')}</p>{/if}
  <input type="text" maxlength="120" placeholder="메모 (고쳐 주세요 · 칭찬 한 줄)" aria-label="메모" bind:value={note} />
  <div class="row"><button type="button" class="b1" data-k="quest-ok" disabled={busy} onclick={() => go(true)}>✅ 출제 승인 {x.grade === 'purple' ? '· 🏛 전당' : '· 친구 문제'}</button><button type="button" class="b2" data-k="quest-fix" disabled={busy} onclick={() => go(false)}>✏ 고쳐 주세요</button></div>
</div>

<style>
  .qc { display: flex; flex-direction: column; gap: 8px; width: 100%; }
  .gd { margin: 0; font: 700 14px var(--font); }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .two > div, .sv { padding: 8px; border-radius: 10px; background: var(--surface-2); display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .two p, .sv p { margin: 0; font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: keep-all; overflow-wrap: anywhere; }
  .two ol { margin: 0; padding-left: 18px; font-size: 13px; } .two small { color: var(--text-2); font-size: 13px; }
  .lab { font: 700 13px var(--font); color: var(--text-2); }
  .is { margin: 0; color: var(--bad); font-size: 14px; }
  input { min-height: 44px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font: 500 14px var(--font); }
  .row { display: flex; gap: 8px; } .row button { flex: 1; min-height: 48px; border-radius: 12px; font: 700 14px var(--font); }
  .b1 { border: 0; background: var(--accent); color: var(--on-accent, #1d1406); } .b2 { border: 1px solid var(--line); background: none; color: var(--text); }
  @media (max-width: 380px) { .two { grid-template-columns: 1fr; } }
</style>
