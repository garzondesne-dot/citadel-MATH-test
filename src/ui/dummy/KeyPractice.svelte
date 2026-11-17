<script lang="ts">
  import type { Given, LessonPack } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import QItem from '../q/QItem.svelte';
  import { emptyOf, filled } from '../../engine/input';
  import { grade } from '../../engine/grade';
  import { answerText, type EntryKey } from '../../school/keys';
  import { sfx } from '../sound.svelte';
  // 🎯 🔑 열쇠 연습 (📜 #59 · 정정 2): 수업에서 열쇠를 틀렸거나 못 받은 학생만 · 판 1 · 2 (숫자만 다르게) · 틀리면 💡 한 줄 + 정답 · 벌 없음
  const { L, ks, onend, onclose }: { L: LessonPack; ks: EntryKey[]; onend: (right: Record<string, number>) => void; onclose: () => void } = $props();
  const qs = ks.flatMap((k) => k.vers.slice(1).map((q, j) => ({ k, q, j })));
  let i = $state(0), given = $state<Given>(qs[0] ? emptyOf(qs[0].q) : null), res = $state<{ ok: boolean } | null>(null);
  const right: Record<string, number> = {};
  const cur = $derived(qs[i] ?? null);
  function check() { const c = cur; if (!c || !filled(c.q, given)) return; const ok = grade(c.q, given); if (ok) right[c.k.id] = (right[c.k.id] || 0) + 1; res = { ok }; sfx(ok ? 'correct' : 'block', 0.5); }
  function next() { res = null; if (i + 1 >= qs.length) { onend(right); return; } i++; given = emptyOf(qs[i]!.q); }
</script>

{#if cur}
  <Sheet {onclose} tall mainText={res ? (i + 1 >= qs.length ? '🔑 연습 끝' : '다음 ▶') : '확인'} mainDisabled={!res && !filled(cur.q, given)} onmain={res ? next : check}>
    {#snippet title()}🔑 열쇠 연습 · {L.no}차시 · {i + 1} / {qs.length}{/snippet}
    <div class="kp" data-k="key-practice">
      <p class="kn">🔑 {cur.k.name} · 판 {cur.j + 1}</p>
      {#if res}
        {#if res.ok}<p class="ok" data-k="kp-ok">✔ 맞았어요!</p>{:else}<div class="no" data-k="kp-no"><b>💡 {cur.k.help}</b><span>정답 · {answerText(cur.q)}</span></div>{/if}
      {:else}<QItem q={cur.q} i={0} value={given} showNo={false} onchange={(v) => (given = v)} />{/if}
    </div>
  </Sheet>
{/if}

<style>
  .kp { display: flex; flex-direction: column; gap: var(--s3); padding-bottom: var(--s3); }
  .kn { margin: 0; color: var(--accent); font: 800 15px var(--font); }
  .ok { margin: 0; padding: var(--s3); border-radius: var(--r); background: color-mix(in srgb, var(--ok) 18%, transparent); font: 800 17px var(--font); text-align: center; }
  .no { display: flex; flex-direction: column; gap: 6px; padding: var(--s3); border-radius: var(--r); background: var(--surface-2); font-size: 15px; line-height: 1.5; } .no span { font-weight: 800; color: var(--ok); }
</style>
