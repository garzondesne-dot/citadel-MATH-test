<script lang="ts">
  import { onMount } from 'svelte';
  import Sheet from '../battle/Sheet.svelte';
  import type { Store } from '../../model/types';
  import { CLASSES, roster, uidOf } from '../../school/school';
  import { ADOPT_GEMS, adopt, artTable, diffTable, kindOf, photo, remove, rows, sweep, type Row } from '../../school/feedback';
  import { hhmm } from '../../school/bells';
  import { giveBugHunter } from '../../school/bughunt';
  // 👩‍🏫 #98 💬 학생 의견 · 🎨 그림 표 · 📊 난이도 표
  //   의견 = 이름 · 번호 보임 · 글 먼저 · 「📷 사진 보기」를 눌러야 사진을 받아 옴 · 채택(💎 30 · 50 · 100) · 지우기(정말?) · 열 때 30일 지난 사진 지움
  const { S, onclose }: { S: Store; onclose: () => void } = $props();
  let seg = $state<'fb' | 'art' | 'diff'>('fb'), list = $state<Row[]>([]), loading = $state(true), swept = $state(0), kind = $state(''), only = $state<'' | 'new' | 'ad'>('new');
  let pics = $state<Record<string, string>>({}), open = $state(''), gems = $state(50), ask = $state(''), toast = $state('');
  let arts = $state<ReturnType<typeof artTable>>([]), diffs = $state<ReturnType<typeof diffTable>>([]);
  const nameOf = (c: string, n: number) => roster(c, S).find((p) => p.num === n)?.name ?? '';
  const fetchOr = async <T,>(p: string) => (S.fetch ? await S.fetch<T>(p).catch(() => null) : S.get<T>(p));
  async function load() {
    loading = true;
    try { list = await rows(S, CLASSES); swept = sweep(S, list, S.now()); arts = artTable(await fetchOr('artvote')); diffs = diffTable(await fetchOr('diff')); } catch { /* 끊김 */ }
    loading = false;
  }
  onMount(() => { void load(); });
  const shown = $derived(list.filter((r) => (!kind || r.k === kind) && (only === 'new' ? !r.ad : only === 'ad' ? !!r.ad : true)));
  async function showPic(r: Row) { if (pics[r.id]) return; pics = { ...pics, [r.id]: '…' }; const d = await photo(S, r); pics = { ...pics, [r.id]: d || '' }; }
  function doAdopt(r: Row) { adopt(S, r, uidOf(r.cls, r.num), gems); r.ad = { g: gems, at: S.now() }; r.ph = r.ph ? 0 : r.ph; list = [...list]; open = ''; say(`✅ 채택 · ${r.num}번에게 💎 ${gems}`); }
  function doRemove(r: Row) { remove(S, r); list = list.filter((x) => x.id !== r.id); ask = ''; open = ''; say('🗑 지웠어요 (사진 · 게시판 줄 · 👍 같이)'); }
  function say(t: string) { toast = t; setTimeout(() => (toast = ''), 2200); }
  const artName = (k: string) => k.replace(/^skill_/, '⚔ 스킬 ').replace(/^hero_/, '🧙 용사 ');
</script>

<Sheet tall {onclose}>
  {#snippet title()}🛠 개선단 · 학생 의견{/snippet}
  <div class="seg" role="tablist">
    <button type="button" role="tab" class:on={seg === 'fb'} aria-selected={seg === 'fb'} data-k="tfb-seg-fb" onclick={() => (seg = 'fb')}>💬 의견 {list.filter((r) => !r.ad).length}</button>
    <button type="button" role="tab" class:on={seg === 'art'} aria-selected={seg === 'art'} data-k="tfb-seg-art" onclick={() => (seg = 'art')}>🎨 그림</button>
    <button type="button" role="tab" class:on={seg === 'diff'} aria-selected={seg === 'diff'} data-k="tfb-seg-diff" onclick={() => (seg = 'diff')}>📊 난이도</button>
  </div>
  {#if loading}<p class="empty">불러오는 중…</p>
  {:else if seg === 'fb'}
    <div class="chips">
      {#each [['new', '새 것'], ['ad', '✅ 채택'], ['', '전체']] as const as [k, t] (k)}<button type="button" class:on={only === k} onclick={() => (only = k)}>{t}</button>{/each}
      <span class="sp"></span>
      {#each [['', '모두'], ['bug', '🐞'], ['idea', '💡'], ['art', '🎨'], ['level', '📊']] as const as [k, t] (k)}<button type="button" class:on={kind === k} onclick={() => (kind = k)}>{t}</button>{/each}
    </div>
    {#if swept}<p class="note">🧹 30일 지난 사진 {swept}장을 지웠어요</p>{/if}
    {#each shown as r (r.id)}
      <div class="it" class:ad={!!r.ad} data-k="tfb-item">
        <button type="button" class="hd" aria-expanded={open === r.id} onclick={() => (open = open === r.id ? '' : r.id)}>
          <span class="ic">{kindOf(r.k).icon}</span>
          <span class="tx"><b>{r.cls}반 {r.num}번 {nameOf(r.cls, r.num)}</b><small>{kindOf(r.k).name} · {new Date(r.at).getMonth() + 1}/{new Date(r.at).getDate()} {hhmm(r.at)}{r.ph ? ' · 📷' : ''}{r.ad ? ` · ✅ 💎 ${r.ad.g}` : ''}</small></span>
        </button>
        <p class="body">{r.t}</p>
        {#if open === r.id}
          {#if r.info}<details class="info"><summary>📎 화면 정보</summary><pre>{r.info}</pre></details>{/if}
          {#if r.ph}{#if pics[r.id] && pics[r.id] !== '…'}<img class="pic" src={pics[r.id]} alt="학생이 보낸 화면 사진" />{:else}<button type="button" class="b2" data-k="tfb-photo" onclick={() => showPic(r)}>{pics[r.id] === '…' ? '사진 받는 중…' : '📷 사진 보기'}</button>{/if}{/if}
          {#if !r.ad}
            <div class="gems" role="group" aria-label="채택 💎"><span>채택 💎</span>{#each ADOPT_GEMS as g (g)}<button type="button" class:on={gems === g} aria-pressed={gems === g} onclick={() => (gems = g)}>{g}</button>{/each}</div>
            <div class="row"><button type="button" class="b1" data-k="tfb-adopt" onclick={() => doAdopt(r)}>✅ 채택 · 💎 {gems}</button><button type="button" class="b2" data-k="tfb-del" onclick={() => (ask = r.id)}>🗑 지우기</button></div>
            <div class="row"><button type="button" class="b2" data-k="tfb-bugh" onclick={() => { giveBugHunter(S, uidOf(r.cls, r.num), true); say(`🎖 ${r.num}번에게 「버그 사냥꾼」 호칭`); }}>🎖 버그 사냥꾼 주기</button></div><!-- 🎖 11/24 회수는 학생 한 명 시트에서 -->
          {:else}<div class="row"><button type="button" class="b2" data-k="tfb-del" onclick={() => (ask = r.id)}>🗑 지우기</button></div>{/if}
          {#if ask === r.id}<div class="ask"><b>정말 지울까요?</b> 사진 · 게시판 줄 · 👍 도 같이 지워져요<div class="row"><button type="button" class="b1 bad" data-k="tfb-del-ok" onclick={() => doRemove(r)}>지우기</button><button type="button" class="b2" onclick={() => (ask = '')}>그만두기</button></div></div>{/if}
        {/if}
      </div>
    {:else}<p class="empty">💬 {only === 'new' ? '새 의견이 없어요' : '의견이 없어요'}</p>{/each}
    <small class="hint">첫 채택 = 학생에게 칭호 「🛠 개선단」 · 💎 = 하루 한도 밖 · 사진은 채택 · 지우기 때 같이 지우고 남은 것은 30일 뒤 지움</small>
  {:else if seg === 'art'}
    {#if !arts.length}<p class="empty">🎨 아직 표가 없어요 · 학생 「내 용사」에서 👍 · 🔁 바꿈</p>
    {:else}<table><thead><tr><th>그림</th><th>🔁 바꿈</th><th>👍</th></tr></thead><tbody>{#each arts as a (a.key)}<tr><td>{artName(a.key)}</td><td class="n">{a.swap}</td><td class="n">{a.up}</td></tr>{/each}</tbody></table>{/if}
  {:else}
    {#if !diffs.length}<p class="empty">📊 아직 표가 없어요 · 학생이 몬스터를 쓰러뜨린 뒤 고름</p>
    {:else}<table><thead><tr><th>차시 · 몬스터</th><th>쉬움</th><th>알맞음</th><th>어려움</th></tr></thead><tbody>{#each diffs as d (d.lid + d.mon)}<tr><td>{d.lid} · {d.mon}</td>{#each d.n as v, i (i)}<td class="n" class:hot={i === 2 && v > d.n[0] + d.n[1]}>{v}</td>{/each}</tr>{/each}</tbody></table>{/if}
  {/if}
  {#if toast}<p class="toast" data-k="tfb-toast">{toast}</p>{/if}
</Sheet>

<style>
  .seg { display: flex; gap: 6px; } .seg button { flex: 1; min-height: 44px; border-radius: 22px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text-2); font: 700 14px var(--font); } .seg button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent, #1d1406); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; } .chips .sp { flex: 1; }
  .chips button { min-height: 44px; padding: 0 12px; border-radius: 18px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 700 14px var(--font); } .chips button.on { border-color: var(--accent); color: var(--accent); }
  .note { margin: 0; color: var(--text-2); font-size: 14px; }
  .it { padding: 10px 12px; border-radius: 12px; background: var(--surface-2); display: flex; flex-direction: column; gap: 8px; } .it.ad { outline: 1px solid var(--ok); }
  .hd { display: flex; gap: 10px; align-items: center; min-height: 44px; border: 0; background: none; color: var(--text); text-align: left; padding: 0; }
  .ic { font-size: 22px; } .tx { display: flex; flex-direction: column; } .tx small { color: var(--text-3); font-size: 13px; }
  .body { margin: 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
  .info summary { min-height: 44px; display: flex; align-items: center; color: var(--text-2); font-size: 14px; }
  .info pre { margin: 0; padding: 8px; border-radius: 8px; background: var(--surface); color: var(--text-3); font: 12px/1.4 ui-monospace, monospace; white-space: pre-wrap; word-break: break-all; }
  .pic { width: 100%; max-height: 60vh; object-fit: contain; border-radius: 10px; background: #000; }
  .gems { display: flex; align-items: center; gap: 6px; } .gems span { color: var(--text-2); font: 600 14px var(--font); }
  .gems button { min-width: 56px; min-height: 44px; border-radius: 20px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); } .gems button.on { background: var(--gem, #6cc6ff); border-color: var(--gem, #6cc6ff); color: #06202e; }
  .row { display: flex; gap: 8px; }
  .b1 { flex: 1; min-height: 48px; border: 0; border-radius: 12px; background: var(--accent); color: var(--on-accent, #1d1406); font: 700 15px var(--font); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); } .b1.bad { background: var(--bad); color: #fff; }
  .b2 { min-height: 48px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .ask { padding: 10px; border-radius: 10px; background: color-mix(in srgb, var(--bad) 14%, transparent); display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
  .empty { color: var(--text-2); text-align: center; padding: 24px 0; margin: 0; } .hint { color: var(--text-3); font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; } th, td { padding: 8px 6px; border-bottom: 1px solid var(--line); text-align: left; } td.n, th:not(:first-child) { text-align: center; width: 64px; } td.hot { color: var(--bad); font-weight: 800; }
  .toast { position: sticky; bottom: 0; margin: 0; padding: 10px 12px; border-radius: 10px; background: var(--surface); color: var(--ok); font-weight: 700; text-align: center; }
</style>
