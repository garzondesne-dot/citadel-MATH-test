<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Sheet from '../battle/Sheet.svelte';
  import type { Store } from '../../model/types';
  import { board, check, KINDS, kindOf, LIMIT, myList, sortBoard, submit, today, vote, type BoardItem, type Kind } from '../../school/feedback';
  import { bugInfo, shrink } from '../trace';
  import { sfx } from '../sound.svelte';
  // 🛠 #98 개선단 (학생): 💬 보내기 · 🛠 개선단 게시판(이름 없이 👍) · 📮 내가 보낸 것(✅ 채택)
  //   S = 서버(묶인 학생) 또는 이 기기 시험 저장소(🧪 테스트) · trial = 체험판(저장 안 함 · 같은 화면)
  const { S, cls, num, pid, trial = false, tab0 = 'send', onclose }: { S: Store; cls: string; num: number; pid: string; trial?: boolean; tab0?: 'send' | 'board' | 'mine'; onclose: () => void } = $props();
  let tab = $state<'send' | 'board' | 'mine'>(untrack(() => tab0));
  let k = $state<Kind | ''>(''), t = $state(''), photo = $state(''), info = $state(''), err = $state(''), done = $state(''), busy = $state(false);
  let mine = $state<Awaited<ReturnType<typeof myList>>>([]), items = $state<BoardItem[]>([]), sort = $state<'up' | 'new'>('up'), loading = $state(false);
  const day = $derived(today(Object.fromEntries(mine.map((x) => [x.id, x])), Date.now()));
  async function refresh() { if (trial) return; loading = true; try { mine = await myList(S, cls, num); items = await board(S, pid, sort); } catch { /* 끊김 = 다음에 */ } loading = false; }
  onMount(() => { void refresh(); });
  function pick(x: Kind) { k = x; err = ''; info = x === 'bug' ? bugInfo() : ''; if (x !== 'bug') photo = ''; sfx('click', 0.4); }
  async function onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; (e.target as HTMLInputElement).value = '';
    if (!f) return; err = '';
    if (day.photos >= LIMIT.photoPerDay) { err = '사진은 하루에 1장만 보낼 수 있어요'; return; }
    try { photo = await shrink(f, LIMIT.photoEdge, LIMIT.jpeg); } catch (x) { err = (x as Error).message || '사진을 열 수 없어요'; }
  }
  async function send() {
    if (busy || !k) return;
    const e = check(k, t, Object.fromEntries(mine.map((x) => [x.id, x])), Date.now(), !!photo);
    if (e) { err = e; return; }
    if (trial) { done = '체험판에서는 저장 안 돼요 · 실제 게임에서는 선생님께 바로 가요'; sfx('click', 0.5); return; }
    busy = true; err = '';
    try { await submit(S, cls, num, { k, t, info: k === 'bug' ? info : undefined, photo: photo || undefined }); done = '보냈어요! 선생님이 읽고 채택하면 💎 를 받아요'; sfx('star', 0.6); t = ''; photo = ''; k = ''; await refresh(); }
    catch (x) { err = (x as Error & { user?: boolean }).user ? (x as Error).message : '보내지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.'; }
    busy = false;
  }
  async function up(x: BoardItem) {
    if (trial) { done = '체험판에서는 저장 안 돼요'; return; }
    const on = !x.me; x.me = on; x.up += on ? 1 : -1; sfx('click', 0.4);
    try { await vote(S, x.id, pid, on); } catch { x.me = !on; x.up += on ? -1 : 1; }
  }
  const resort = (s: 'up' | 'new') => { sort = s; items = sortBoard(items, s); };
  const when = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()}`; };
</script>

<Sheet tall {onclose} mainText={tab === 'send' ? (busy ? '보내는 중…' : '보내기') : '닫기'} mainDisabled={tab === 'send' && (busy || !k || t.trim().length < 2)} why={tab === 'send' && !k ? '종류를 먼저 골라요' : ''} onmain={tab === 'send' ? send : onclose}>
  {#snippet title()}🛠 개선단{/snippet}
  <div class="tabs" role="tablist">
    <button type="button" role="tab" aria-selected={tab === 'send'} class:on={tab === 'send'} data-k="fb-tab-send" onclick={() => (tab = 'send')}>💬 의견 보내기</button>
    <button type="button" role="tab" aria-selected={tab === 'board'} class:on={tab === 'board'} data-k="fb-tab-board" onclick={() => { tab = 'board'; void refresh(); }}>🛠 게시판</button>
    <button type="button" role="tab" aria-selected={tab === 'mine'} class:on={tab === 'mine'} data-k="fb-tab-mine" onclick={() => { tab = 'mine'; void refresh(); }}>📮 내 의견</button>
  </div>
  {#if trial}<p class="note" data-k="fb-trial">🧪 체험판에서는 저장 안 돼요 · 보내기 · 👍 를 눌러 볼 수는 있어요</p>{/if}
  {#if tab === 'send'}
    <div class="kinds">
      {#each KINDS as x (x.k)}<button type="button" class="kind" class:on={k === x.k} data-k="fb-kind-{x.k}" onclick={() => pick(x.k)}><span>{x.icon}</span><b>{x.name}</b>{#if k === x.k}<i aria-hidden="true">✓</i>{/if}</button>{/each}
    </div>
    {#if k}
      <label class="lab" for="fbt">{kindOf(k).hint}</label>
      <textarea id="fbt" data-k="fb-text" maxlength={LIMIT.text} rows="5" bind:value={t} placeholder="여기에 적어요 · 이름은 게시판에 안 보여요"></textarea>
      <small class="cnt">{t.length} / {LIMIT.text} · 오늘 {day.sent} / {LIMIT.perDay}번</small>
      {#if k === 'bug'}
        <details class="info" data-k="fb-info"><summary>📎 화면 정보가 저절로 같이 가요 (선생님만 봄)</summary><pre>{info}</pre></details>
        {#if photo}<div class="ph"><img src={photo} alt="고른 사진" /><button type="button" class="link" data-k="fb-photo-x" onclick={() => (photo = '')}>✕ 사진 빼기</button></div>
        {:else}<label class="file" class:off={day.photos >= LIMIT.photoPerDay}><input type="file" accept="image/*" data-k="fb-photo" onchange={onFile} disabled={day.photos >= LIMIT.photoPerDay} />📷 화면 사진 1장 고르기 <small>{day.photos >= LIMIT.photoPerDay ? '오늘은 다 보냈어요' : '갤러리에서 · 하루 1장'}</small></label>{/if}
      {/if}
    {/if}
    {#if err}<p class="err" data-k="fb-err">{err}</p>{/if}
    {#if done}<p class="ok" data-k="fb-done">✅ {done}</p>{/if}
  {:else if tab === 'board'}
    <div class="sort"><button type="button" class:on={sort === 'up'} data-k="fb-sort-up" onclick={() => resort('up')}>👍 많은 순</button><button type="button" class:on={sort === 'new'} data-k="fb-sort-new" onclick={() => resort('new')}>🆕 새것 순</button></div>
    {#if loading && !items.length}<p class="empty">불러오는 중…</p>
    {:else if !items.length}<p class="empty">🛠 아직 의견이 없어요 · 첫 의견을 보내 볼까요?</p>
    {:else}<ul class="list" data-k="fb-board">
      {#each items as x (x.id)}<li class:ad={x.ad}><span class="ic">{kindOf(x.k).icon}</span><p>{x.t}{#if x.ad}<em class="badge">✅ 채택</em>{/if}</p><button type="button" class="up" class:on={x.me} aria-pressed={x.me} data-k="fb-up" onclick={() => up(x)}>👍 {x.up}</button></li>{/each}
    </ul>{/if}
    <small class="cnt">이름 · 반 · 번호는 안 보여요 · 한 의견에 👍 한 번</small>
  {:else}
    {#if !mine.length}<p class="empty">📮 아직 보낸 의견이 없어요</p>
    {:else}<ul class="list" data-k="fb-mine">
      {#each mine as x (x.id)}<li class:ad={!!x.ad}><span class="ic">{kindOf(x.k).icon}</span><p>{x.t}<small class="when">{when(x.at)}{x.ph ? ' · 📷' : ''}</small>{#if x.ad}<em class="badge">✅ 채택 · 💎 +{x.ad.g}</em>{/if}</p></li>{/each}
    </ul>{/if}
    {#if done}<p class="ok">✅ {done}</p>{/if}
  {/if}
</Sheet>

<style>
  .tabs { display: flex; gap: 6px; padding: 2px 0 4px; }
  .tabs button { flex: 1; min-height: 44px; border-radius: 22px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text-2); font: 700 14px var(--font); }
  .tabs button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent, #1d1406); }
  .note { margin: 0; padding: 8px 12px; border-radius: 10px; background: var(--surface-2); color: var(--text-2); font-size: 14px; }
  .kinds { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .kind { position: relative; min-height: 64px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); text-align: left; box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .kind:active { transform: translateY(2px); box-shadow: none; }
  .kind span { font-size: 20px; } .kind b { font: 700 14px var(--font); }
  .kind.on { border-color: var(--accent); outline: 2px solid var(--accent); }
  .kind i { position: absolute; top: 6px; right: 10px; font-style: normal; color: var(--accent); font-weight: 800; }
  .lab { font: 600 14px var(--font); color: var(--text-2); }
  textarea { width: 100%; box-sizing: border-box; min-height: 120px; padding: 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 500 16px var(--font); resize: vertical; }
  .cnt { color: var(--text-3); font-size: 13px; }
  .info summary { min-height: 44px; display: flex; align-items: center; color: var(--text-2); font-size: 14px; }
  .info pre { margin: 0; padding: 8px; border-radius: 8px; background: var(--surface-2); color: var(--text-3); font: 12px/1.4 ui-monospace, monospace; white-space: pre-wrap; word-break: break-all; max-height: 120px; overflow: auto; }
  .file { min-height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border-radius: 12px; border: 1px dashed var(--line); color: var(--text); font: 700 15px var(--font); }
  .file small { color: var(--text-3); font-weight: 500; } .file.off { opacity: 0.5; }
  .file input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .ph { display: flex; align-items: center; gap: 12px; } .ph img { width: 96px; height: 96px; object-fit: cover; border-radius: 10px; }
  .link { min-height: 44px; border: 0; background: none; color: var(--text-2); font: 600 14px var(--font); }
  .err { margin: 0; color: var(--bad); font-weight: 700; } .ok { margin: 0; color: var(--ok); font-weight: 700; }
  .sort { display: flex; gap: 6px; } .sort button { min-height: 44px; padding: 0 14px; border-radius: 20px; border: 1px solid var(--line); background: none; color: var(--text-2); font: 700 14px var(--font); } .sort button.on { border-color: var(--accent); color: var(--accent); }
  .empty { color: var(--text-2); text-align: center; padding: 24px 0; margin: 0; }
  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .list li { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: 12px; background: var(--surface-2); }
  .list li.ad { outline: 1px solid var(--ok); }
  .list .ic { font-size: 20px; line-height: 1.2; } .list p { flex: 1; min-width: 0; margin: 0; font-size: 15px; line-height: 1.45; word-break: break-word; }
  .when { display: block; color: var(--text-3); font-size: 13px; }
  .badge { display: inline-block; margin-left: 6px; padding: 1px 8px; border-radius: 10px; background: color-mix(in srgb, var(--ok) 22%, transparent); color: var(--ok); font: 700 13px var(--font); font-style: normal; }
  .up { flex: none; min-width: 64px; min-height: 44px; border-radius: 22px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 15px var(--font); }
  .up.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent, #1d1406); }
</style>
