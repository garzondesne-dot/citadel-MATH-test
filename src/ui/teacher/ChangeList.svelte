<script lang="ts">
  import type { Change } from '../../school/changes';
  // 🆕 바뀐 것 목록 (판별 · 최신부터) — 교사 로그인 창 · 「나」 → 📜 바뀐 것 같은 부품
  //   📜 2026-11-15 선생님 「중요한 게 잘 보이게 압축」: 맨 위 줄 크게 · 나머지 줄 작게 · ✔ 확인할 것 최대 2줄 · 「그 밖 n건」 누르면 펼침
  const { list, chan = 'rel', showStudent = false }: { list: Change[]; chan?: 'rel' | 'beta'; showStudent?: boolean } = $props();
  let open = $state<Record<string, boolean>>({});
</script>

<div class="cl" data-k="changes">
  {#each list as c (c.ver)}
    <section class="v" data-ver={c.ver}>
      <h3>{chan === 'rel' ? '✅ 정식' : '🧪 베타'} {c.ver} <small>{c.date}</small></h3>
      <p class="top" data-k="ch-top">{c.top}</p>
      {#if c.lines.length}<ul>{#each c.lines as t, i (i)}<li>{t}</li>{/each}</ul>{/if}
      {#if c.check.length}<div class="chk">{#each c.check as t, i (i)}<p>✔ {t}</p>{/each}</div>{/if}
      {#if c.more.length}
        <button type="button" class="more" data-k="ch-more" aria-expanded={!!open[c.ver]} onclick={() => (open = { ...open, [c.ver]: !open[c.ver] })}>{open[c.ver] ? '▾' : '▸'} 그 밖 {c.more.length}건</button>
        {#if open[c.ver]}<ul class="ml">{#each c.more as t, i (i)}<li>{t}</li>{/each}</ul>{/if}
      {/if}
      {#if showStudent && c.student?.length}<p class="stu">🎒 학생 새 소식: {c.student.join(' · ')}</p>{/if}
    </section>
  {:else}<p class="no">바뀐 것이 없어요</p>{/each}
</div>

<style>
  .cl { display: flex; flex-direction: column; gap: var(--s3); }
  .v { padding: var(--s3); border-radius: var(--r); background: var(--surface-2); display: flex; flex-direction: column; gap: 6px; }
  h3 { margin: 0; font: 800 14px var(--font); color: var(--text-2); } h3 small { color: var(--text-3); font-weight: 600; font-size: 13px; margin-left: 6px; }
  .top { margin: 0; font: 800 18px/1.4 var(--font); color: var(--accent); }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  li { font-size: 14px; line-height: 1.45; color: var(--text); } li::before { content: '· '; color: var(--text-3); }
  .chk { padding: 6px 10px; border-radius: var(--r-sm); background: color-mix(in srgb, var(--ok) 14%, var(--surface)); } .chk p { margin: 0; font-size: 14px; }
  .more { align-self: flex-start; min-height: 40px; padding: 0 10px; border: 0; border-radius: var(--r-sm); background: transparent; color: var(--text-2); font: 700 14px var(--font); }
  .ml li { color: var(--text-2); font-size: 14px; }
  .stu { margin: 0; font-size: 14px; color: var(--text-2); }
  .no { margin: 0; color: var(--text-3); text-align: center; }
</style>
