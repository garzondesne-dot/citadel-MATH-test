<script lang="ts">
  import type { Given, LessonPack, Question, Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import QItem from '../q/QItem.svelte';
  import { checkUpload, PACK_PATH, revive, type Checked } from '../../school/packUpload';
  import { items, bossItem } from '../../engine/lessons';
  import { PACKS, addPacks } from '../../engine/packs';
  import { SUBJ } from '../../engine/subject';
  import { ATTACKS } from '../../raid/attacks';
  import { spriteOf } from '../manifest';
  // 📦 차시 팩 올리기 (L1 · 📜 2026-11-14 · 머리 🔨): 파일(또는 붙여 넣기) → 자동 검사(칸 · 이유 한 줄) → 미리 보기(학생 폰과 같은 QItem · 💡 정답 펼침) → 저장(prep/packs/{id})
  //   오류 0 이어야 저장 · 「선생님 확인」 = 다시 계산 못 한 문항 · 앱에 있는 차시를 대신함 → 보이기만(저장은 됨)
  const { S, onclose }: { S: Store; onclose: () => void } = $props();
  const builtIn = new Set(SUBJ.lessons.map((p) => p.id));
  const look = {
    sheet: (r: string) => { try { spriteOf(r); return true; } catch { return false; } },
    theme: (t: string) => !t || t in SUBJ.themes.dungeons,
    attack: (a: string) => a in ATTACKS,
    builtIn: (id: string) => builtIn.has(id) || PACKS.some((p) => p.id === id),
  };
  let text = $state(''), name = $state(''), res = $state<Checked | null>(null), paste = $state(false), saved = $state('');
  let pick = $state(''), ver = $state(0);
  const errs = $derived(res?.issues.filter((x) => x.lvl === 'err') ?? []), asks = $derived(res?.issues.filter((x) => x.lvl === 'ask') ?? []);
  const P = $derived(res?.pack ?? null);
  const stepsQ = $derived(P ? P.steps.filter((s) => (s.kind === 'monster' && P.monsters[s.id]) || (s.kind === 'boss' && P.boss)) : []);
  const nVer = $derived.by(() => { if (!P || !pick) return 1; if (pick === 'boss') return 1 + Math.max(0, ...(P.boss?.pool ?? []).map((x) => x.length)); const m = P.monsters[pick]; return m && 'pool' in m.retry ? 1 + m.retry.pool.length : 1; });
  const shown = $derived.by((): Question[] => {
    if (!P || !pick) return [];
    try { return pick === 'boss' ? Array.from({ length: P.boss?.items ?? 0 }, (_, i) => bossItem(P, 'preview', i, ver)).filter((q): q is Question => !!q) : items(P, pick, 'preview', ver); } catch { return []; }
  });
  const answerOf = (q: Question): Given => (q.type === 'choice' ? q.answerIndex : q.type === 'ox' ? q.answer : q.type === 'number' ? q.answer : q.type === 'multi' ? q.answer : q.type === 'blanks' ? q.items.map((x) => x.answer) : q.type === 'text' ? q.answers[0] ?? '' : null);
  function run(t: string, n: string) { text = t; name = n; saved = ''; res = checkUpload(t, look); pick = stepsQ[0]?.id ?? ''; ver = 0; }
  $effect(() => { if (res && !pick && stepsQ[0]) pick = stepsQ[0].id; });
  async function onfile(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) run(await f.text(), f.name); }
  let failed = $state('');
  async function save() {
    if (!P || errs.length) return;
    const v = JSON.parse(JSON.stringify(P)) as LessonPack, path = `${PACK_PATH}/${P.id}`;
    const ok = S.trySet ? await S.trySet(path, v) : (S.set(path, v), true); // 서버 = 실제로 써졌는지 확인(교사 로그인 · 규칙)
    if (!ok) { failed = '저장하지 못했어요 · 교사로 로그인했는지 · 인터넷을 확인해요'; return; }
    addPacks([revive(v)]); // 새로 고침 전에도 차시 목록에
    saved = `${P.no}차시 ${P.title} 저장 · 차시 목록에 들어갔어요`;
    setTimeout(() => { const u = new URL(location.href); u.searchParams.set('tab', 'prep'); u.searchParams.set('lesson', P.id); location.href = u.toString(); }, 900);
  }
</script>

<Sheet {onclose} tall mainText={saved ? '저장했어요' : P ? `${P.no}차시 저장` : '파일을 골라요'} mainDisabled={!P || errs.length > 0 || !!saved} why={P && errs.length ? `고칠 칸 ${errs.length}개가 있으면 저장할 수 없어요` : ''} onmain={save}>
  {#snippet title()}📦 차시 팩 올리기{/snippet}
  <div class="up" data-k="packup">
    <label class="file"><input type="file" accept=".json,application/json" onchange={onfile} data-k="packfile" /><span>📂 파일 고르기</span><small>{name || '차시 팩 .json (입력판 양식)'}</small></label>
    <button type="button" class="b2" onclick={() => (paste = !paste)}>{paste ? '붙여 넣기 닫기' : '글로 붙여 넣기'}</button>
    {#if paste}<textarea rows="5" bind:value={text} placeholder={'{ "id": "lesson-11", "no": 11, … }'} data-k="packtext"></textarea><button type="button" class="b2" onclick={() => run(text, '붙여 넣은 글')}>검사하기</button>{/if}

    {#if res}
      <p class="sum" data-k="packsum" class:bad={errs.length > 0}>{errs.length ? `✘ 고칠 칸 ${errs.length}개` : '✔ 검사 통과'}{asks.length ? ` · 선생님 확인 ${asks.length}` : ''} · 몬스터 {res.stats.mons} · 문항 {res.stats.items} · 버전 {res.stats.versions} · 다시 계산 맞음 {res.stats.rechecked}{res.stats.ask ? ` · 다시 계산 못 함 ${res.stats.ask}(눈으로 확인)` : ''}</p>
      {#if res.issues.length}<ul class="iss" data-k="packiss">{#each res.issues as x, i (i)}<li class={x.lvl}><b>{x.lvl === 'err' ? '✘' : '⚠'} {x.at}</b><span>{x.msg}</span></li>{/each}</ul>{/if}
      {#if P && stepsQ.length}
        <p class="lab">미리 보기 · 학생 폰과 같은 문제 꼴 (💡 정답 펼침)</p>
        <div class="chips2" role="tablist">{#each stepsQ as s (s.id)}<button type="button" role="tab" class:on={pick === s.id} aria-selected={pick === s.id} onclick={() => { pick = s.id; ver = 0; }}>{s.title.split(' · ')[0]}</button>{/each}</div>
        {#if nVer > 1}<div class="chips2 vers" role="tablist" aria-label="버전">{#each Array.from({ length: nVer }, (_, k) => k) as k (k)}<button type="button" role="tab" class:on={ver === k} aria-selected={ver === k} onclick={() => (ver = k)}>버전 {k}</button>{/each}</div>{/if}
        <div class="prev" data-k="packprev">{#each shown as q, i (`${pick}|${ver}|${i}`)}<div class="pq"><QItem {q} {i} value={answerOf(q)} disabled onchange={() => {}} />{#if q.type === 'choice' || q.type === 'multi'}<p class="sol" data-k="ansno">정답 = 보기 {(q.type === 'choice' ? [q.answerIndex] : q.answer).map((k) => `${k}번(${(q.type === 'choice' ? q.choices : q.options)[k]})`).join(' · ')}</p>{/if}{#if q.solution}<p class="sol">💡 {q.solution}</p>{/if}</div>{/each}</div>
      {/if}
    {/if}
    {#if saved}<p class="ok" role="status">{saved}</p>{/if}{#if failed}<p class="fail" role="alert">{failed}</p>{/if}
  </div>
</Sheet>

<style>
  .up { display: flex; flex-direction: column; gap: 10px; }
  .file { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 12px; border: 1.5px dashed var(--line); border-radius: var(--r); cursor: pointer; }
  .file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .file span { font-weight: 700; } .file small { color: var(--text-2); font-size: 13px; }
  .b2 { align-self: flex-start; min-height: 40px; padding: 0 12px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 14px var(--font); }
  textarea { width: 100%; box-sizing: border-box; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 13px ui-monospace, monospace; padding: 8px; }
  .sum { margin: 0; padding: 8px 10px; border-radius: var(--r-sm); background: color-mix(in srgb, var(--ok) 18%, var(--surface)); font: 700 14px var(--font); }
  .sum.bad { background: color-mix(in srgb, var(--bad) 18%, var(--surface)); }
  .iss { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 40vh; overflow: auto; overscroll-behavior: contain; }
  .iss li { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; border-radius: var(--r-sm); border-left: 4px solid var(--bad); background: var(--surface-2); font-size: 14px; }
  .iss li.ask { border-left-color: var(--accent); } .iss b { font-size: 13px; } .iss span { color: var(--text-2); }
  .lab { margin: 6px 0 0; font: 700 13px var(--font); color: var(--text-2); }
  .chips2 { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
  .chips2 button { flex: none; min-height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
  .chips2 button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .prev { display: flex; flex-direction: column; gap: 12px; }
  .pq { padding: 10px; border-radius: var(--r); background: var(--surface-2); }
  .sol { margin: 6px 0 0; font-size: 13px; color: var(--text-2); }
  .ok { margin: 0; color: var(--ok); font-weight: 700; } .fail { margin: 0; color: var(--bad); font-weight: 700; }
</style>
