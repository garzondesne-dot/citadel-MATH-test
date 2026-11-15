<script lang="ts">
  import type { Change } from '../../school/changes';
  // 🆕 바뀐 것 목록 (판별 · 최신부터 · 👩‍🏫 / 🎒 꼬리표 · 확인할 것 한 줄) — 교사 로그인 창 · 「나」 → 📜 바뀐 것 같은 부품
  const { list, chan = 'rel', showStudent = false }: { list: Change[]; chan?: 'rel' | 'beta'; showStudent?: boolean } = $props();
</script>

<div class="cl" data-k="changes">
  {#each list as c (c.ver)}
    <section class="v" data-ver={c.ver}>
      <h3>{chan === 'rel' ? '✅ 정식' : '🧪 베타'} {c.ver} <small>{c.date}</small></h3>
      <ul>
        {#each c.items as x, i (i)}<li><span class="who" class:t={x.who === '교사'}>{x.who === '교사' ? '👩‍🏫 교사' : '🎒 학생'}</span><span class="tx">{x.text}{#if x.check}<small>✔ 확인할 것: {x.check}</small>{/if}</span></li>{/each}
      </ul>
      {#if showStudent && c.student?.length}<p class="stu">🎒 학생 새 소식: {c.student.join(' · ')}</p>{/if}
    </section>
  {:else}<p class="no">바뀐 것이 없어요</p>{/each}
</div>

<style>
  .cl { display: flex; flex-direction: column; gap: var(--s3); }
  .v { padding: var(--s3); border-radius: var(--r); background: var(--surface-2); }
  h3 { margin: 0 0 var(--s2); font: 800 16px var(--font); color: var(--accent); } h3 small { color: var(--text-3); font-weight: 600; font-size: 13px; margin-left: 6px; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  li { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; line-height: 1.45; }
  .who { flex: none; font: 700 12px var(--font); padding: 1px 7px; border-radius: 10px; background: color-mix(in srgb, var(--ok) 20%, var(--surface)); color: var(--text); }
  .who.t { background: color-mix(in srgb, var(--accent) 22%, var(--surface)); }
  .tx { display: flex; flex-direction: column; gap: 2px; } .tx small { color: var(--text-2); font-size: 12.5px; }
  .stu { margin: var(--s2) 0 0; font-size: 13px; color: var(--text-2); }
  .no { margin: 0; color: var(--text-3); text-align: center; }
</style>
