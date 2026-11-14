<script lang="ts">
  import type { Given, LessonPack, Question, Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import QItem from '../q/QItem.svelte';
  import { checkMedia, checkUpload, deletable, matchCells, PACK_PATH, revive, unpackZip, type Checked, type Issue } from '../../school/packUpload';
  import PrepImg from '../q/PrepImg.svelte';
  import { prepPath, prepPut } from '../../school/prep';
  import { items, bossItem } from '../../engine/lessons';
  import { PACKS, UPLOADED, addPacks, removePack } from '../../engine/packs';
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
  let failed = $state('');
  let text = $state(''), name = $state(''), res = $state<Checked | null>(null), paste = $state(false), saved = $state('');
  let pick = $state(''), ver = $state(0);
  // 🖼 함께 고른 그림 (📜 2026-11-14 선생님 「그림도 팩 올릴 때 같이 올리게 해줘」): 파일 이름 = 칸 이름이면 그 칸 · 저장 = prep/{팩 id}/img/{칸}(같은 이름 = 덮어씀)
  let imgs = $state<Record<string, string>>({}), unused = $state<string[]>([]), media = $state<Issue[]>([]), vidOk = $state<Record<string, boolean>>({});
  const P0 = $derived(res?.pack ?? null);
  /** 그림을 같이 올리면 = 팩 자기 칸 그림을 씀(imgOf 빌리기 끔) */
  const P = $derived.by((): LessonPack | null => { if (!P0) return null; if (!Object.keys(imgs).length) return P0; const { imgOf: _drop, ...rest } = P0; void _drop; return rest as LessonPack; });
  const issues = $derived(res ? [...res.issues, ...media] : []);
  const errs = $derived(issues.filter((x) => x.lvl === 'err')), asks = $derived(issues.filter((x) => x.lvl === 'ask'));
  // 미리 보기 칩 = 문제 · 형성평가 + 그림 · 영상이 붙은 도입 · 개념 칸 (학생 폰과 같은 자리)
  const hasMedia = (s: { id: string; img?: string }) => !!P && (!!P.videos?.[s.id] || (P.imgCells ?? []).includes(s.img ?? s.id));
  const stepsQ = $derived(P ? P.steps.filter((s) => (s.kind === 'monster' && P.monsters[s.id]) || (s.kind === 'boss' && P.boss) || hasMedia(s)) : []);
  const pickStep = $derived(P?.steps.find((s) => s.id === pick) ?? null);
  const pickCell = $derived(pickStep ? (pickStep.img ?? pickStep.id) : '');
  const nVer = $derived.by(() => { if (!P || !pick) return 1; if (pick === 'boss') return 1 + Math.max(0, ...(P.boss?.pool ?? []).map((x) => x.length)); const m = P.monsters[pick]; return m && 'pool' in m.retry ? 1 + m.retry.pool.length : 1; });
  const shown = $derived.by((): Question[] => {
    if (!P || !pick) return [];
    try { return pick === 'boss' ? Array.from({ length: P.boss?.items ?? 0 }, (_, i) => bossItem(P, 'preview', i, ver)).filter((q): q is Question => !!q) : items(P, pick, 'preview', ver); } catch { return []; }
  });
  const answerOf = (q: Question): Given => (q.type === 'choice' ? q.answerIndex : q.type === 'ox' ? q.answer : q.type === 'number' ? q.answer : q.type === 'multi' ? q.answer : q.type === 'blanks' ? q.items.map((x) => x.answer) : q.type === 'text' ? q.answers[0] ?? '' : null);
  // 그림 · 영상 있는지 = 서버 그림 칸 · 앱 영상 파일 (없으면 ⚠ 한 줄 · 저장은 막지 않음)
  const hasImg = async (path: string) => { try { const x = S.fetch ? await S.fetch<string>(path) : S.get<string>(path); return typeof x === 'string' && x.startsWith('data:image'); } catch { return false; } };
  const hasFile = async (url: string) => { try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return r.ok && !/text\/html/.test(r.headers.get('content-type') || ''); } catch { return false; } };
  function run(t: string, n: string) { text = t; name = n; saved = ''; res = checkUpload(t, look); pick = ''; ver = 0; matchImgs(); }
  // 그림 · 영상 확인 다시 (팩 · 그림이 바뀔 때마다) — 붙인 그림 = 있음 · 영상 = 있는 파일만 연결
  let mseq = 0;
  async function recheckMedia() {
    const Pk = P, k = ++mseq; if (!Pk) { media = []; return; }
    const own = (path: string) => Object.entries(imgs).some(([c]) => path === prepPath(Pk, c));
    const ok: Record<string, boolean> = {};
    const xs = await checkMedia(Pk, async (p) => own(p) || hasImg(p), async (u) => (ok[u] = await hasFile(u)));
    if (k === mseq) { media = xs; vidOk = ok; }
  }
  // 고른 그림 파일 → 칸 (이름 = 칸 · 확장자 빼고) · webp 1280 · 0.85 로 줄여 저장(정식 수업 준비 그림과 같은 꼴)
  let picked: File[] = [];
  async function shrink(f: File): Promise<string> {
    const bmp = await createImageBitmap(f), w = Math.min(1280, bmp.width), h = Math.round((bmp.height * w) / bmp.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    const out = c.toDataURL('image/webp', 0.85); return out.startsWith('data:image/webp') ? out : c.toDataURL('image/jpeg', 0.85);
  }
  async function matchImgs() {
    const cells = new Set(P0?.imgCells ?? []), got: Record<string, string> = {}, no: string[] = [];
    const m = matchCells(picked.map((f) => f.name), [...cells]); // 이름 = 칸 · 끝이 「_칸」 (드라이브 접두어) · 정확히 같은 이름 우선
    for (const [c, n] of Object.entries(m.map)) { const f = picked.find((x) => x.name === n); if (f) got[c] = await shrink(f); }
    no.push(...m.unused);
    imgs = got; unused = no;
    const Pk = P; if (Pk) for (const [c, u] of Object.entries(got)) prepPut(Pk, c, u);
    await recheckMedia();
  }
  async function onimgs(e: Event) { picked = [...((e.target as HTMLInputElement).files ?? [])]; await matchImgs(); }
  $effect(() => { if (res && !pick && stepsQ[0]) pick = (stepsQ.find((x) => x.kind === 'monster') ?? stepsQ[0]).id; });
  async function onfile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    if (!/\.zip$/i.test(f.name)) { run(await f.text(), f.name); return; }
    // 🗜 zip = 팩 .json 1개 + 칸 그림들 (폴더 · 이름 접두어 상관없음 · 20MB 까지)
    const z = await unpackZip(new Uint8Array(await f.arrayBuffer()));
    if (z.error || !z.json) { res = { pack: null, issues: [{ at: `zip ${f.name}`, msg: z.error ?? '팩이 없어요', lvl: 'err' }], stats: { mons: 0, items: 0, versions: 0, rechecked: 0, ask: 0 } }; name = f.name; return; }
    picked = z.images.map((x) => new File([x.data as Uint8Array<ArrayBuffer>], x.name, { type: /\.webp$/i.test(x.name) ? 'image/webp' : /\.png$/i.test(x.name) ? 'image/png' : 'image/jpeg' }));
    run(z.json, `${f.name} · ${z.name} + 그림 ${z.images.length}장`);
  }
    // 🗑 올린 팩 지우기 (📜 2026-11-14 선생님 「기존 11차시 지우면 되지? → 삭제 없어」): 베타에서 올린 팩만 · 확인 한 번 · 팩 + 그 팩 칸 그림
  const mine = $derived([...UPLOADED].map((id) => PACKS.find((p) => p.id === id)).filter((p): p is LessonPack => !!p).sort((a, b) => a.no - b.no));
  let ask = $state(''), gone = $state('');
  async function del(id: string) {
    if (!deletable(id, (x) => builtIn.has(x))) return;
    const put = (p: string) => (S.trySet ? S.trySet(p, null) : Promise.resolve((S.set(p, null), true)));
    if (!(await put(`${PACK_PATH}/${id}`))) { failed = '지우지 못했어요 · 교사 로그인 · 인터넷을 확인해요'; ask = ''; return; }
    await put(`prep/${id}`); // 그 팩의 칸 그림
    removePack(id); ask = ''; gone = `「${id}」 팩을 지웠어요 · 차시 목록에서 빠져요`;
    setTimeout(() => { const u = new URL(location.href); u.searchParams.set('tab', 'prep'); u.searchParams.delete('lesson'); location.href = u.toString(); }, 900);
  }
  async function save() {
    if (!P || errs.length) return;
    const v = JSON.parse(JSON.stringify(P)) as LessonPack, path = `${PACK_PATH}/${P.id}`;
    // 🎬 있는 영상만 연결 (파일이 없는 칸은 뺌)
    if (v.videos) { for (const [k, u] of Object.entries(v.videos)) if (vidOk[u] === false) delete v.videos[k]; if (!Object.keys(v.videos).length) delete v.videos; }
    const put = (p: string, x: unknown) => (S.trySet ? S.trySet(p, x) : Promise.resolve((S.set(p, x), true)));
    for (const [c, u] of Object.entries(imgs)) if (!(await put(prepPath(v, c), u))) { failed = `그림 「${c}」 를 저장하지 못했어요 · 교사 로그인 · 인터넷을 확인해요`; return; }
    const ok = await put(path, v); // 서버 = 실제로 써졌는지 확인(교사 로그인 · 규칙)
    if (!ok) { failed = '저장하지 못했어요 · 교사로 로그인했는지 · 인터넷을 확인해요'; return; }
    addPacks([revive(v)]); // 새로 고침 전에도 차시 목록에
    saved = `${P.no}차시 ${P.title} 저장${Object.keys(imgs).length ? ` · 그림 ${Object.keys(imgs).length}칸` : ''} · 차시 목록에 들어갔어요`;
    setTimeout(() => { const u = new URL(location.href); u.searchParams.set('tab', 'prep'); u.searchParams.set('lesson', P.id); location.href = u.toString(); }, 900);
  }
</script>

<Sheet {onclose} tall mainText={saved ? '저장했어요' : P ? `${P.no}차시 저장` : '파일을 골라요'} mainDisabled={!P || errs.length > 0 || !!saved} why={P && errs.length ? `고칠 칸 ${errs.length}개가 있으면 저장할 수 없어요` : ''} onmain={save}>
  {#snippet title()}📦 차시 팩 올리기{/snippet}
  <div class="up" data-k="packup">
    {#if mine.length && !res}<div class="mine" data-k="packmine"><p class="lab">올린 차시 팩</p>
      {#each mine as m (m.id)}<div class="mrow" data-id={m.id}><span><b>{m.no}차시 {m.title}</b><small>{m.id}</small></span>
        {#if deletable(m.id, (x) => builtIn.has(x))}{#if ask === m.id}<span class="cf" role="alertdialog"><em>이 팩을 지울까요? 되돌릴 수 없어요</em><button type="button" class="yes" data-k="packdel-yes" onclick={() => del(m.id)}>예</button><button type="button" class="no" onclick={() => (ask = '')}>아니요</button></span>{:else}<button type="button" class="del" data-k="packdel" onclick={() => (ask = m.id)}>🗑 삭제</button>{/if}{/if}
      </div>{/each}</div>{/if}
    {#if gone}<p class="ok" role="status">{gone}</p>{/if}
    <label class="file"><input type="file" accept=".json,.zip,application/json,application/zip" onchange={onfile} data-k="packfile" /><span>📂 파일 고르기</span><small>{name || '차시 팩 .json · 또는 .zip (팩 + 칸 그림 · 20MB 까지)'}</small></label>
    <label class="file img"><input type="file" accept="image/png,image/webp,image/jpeg" multiple onchange={onimgs} data-k="packimgs" /><span>🖼 칸 그림 같이 고르기 (여러 장)</span><small>파일 이름 = 칸 이름 (예: c1.png · review.webp)</small></label>
        <button type="button" class="b2" onclick={() => (paste = !paste)}>{paste ? '붙여 넣기 닫기' : '글로 붙여 넣기'}</button>
    {#if paste}<textarea rows="5" bind:value={text} placeholder={'{ "id": "lesson-11", "no": 11, … }'} data-k="packtext"></textarea><button type="button" class="b2" onclick={() => run(text, '붙여 넣은 글')}>검사하기</button>{/if}

    {#if res}
      <p class="sum" data-k="packsum" class:bad={errs.length > 0}>{errs.length ? `✘ 고칠 칸 ${errs.length}개` : '✔ 검사 통과'}{asks.length ? ` · 선생님 확인 ${asks.length}` : ''} · 몬스터 {res.stats.mons} · 문항 {res.stats.items} · 버전 {res.stats.versions} · 다시 계산 맞음 {res.stats.rechecked}{res.stats.ask ? ` · 다시 계산 못 함 ${res.stats.ask}(눈으로 확인)` : ''}</p>
      {#if res && (Object.keys(imgs).length || unused.length || Object.keys(vidOk).length)}<p class="msum" data-k="packmedia-sum">🖼 그림 {Object.keys(imgs).length}칸 붙음{unused.length ? ` · 쓰이지 않는 그림 ${unused.length}개 (${unused.join(' · ')})` : ''} · 🎬 영상 {Object.values(vidOk).filter(Boolean).length}편 연결{Object.values(vidOk).some((x) => !x) ? ` · 없는 영상 ${Object.values(vidOk).filter((x) => !x).length}편은 빼고 저장` : ''}</p>{/if}
      {#if issues.length}<ul class="iss" data-k="packiss">{#each issues as x, i (i)}<li class={x.lvl}><b>{x.lvl === 'err' ? '✘' : '⚠'} {x.at}</b><span>{x.msg}</span></li>{/each}</ul>{/if}
      {#if P && stepsQ.length}
        <p class="lab">미리 보기 · 학생 폰과 같은 문제 꼴 (💡 정답 펼침)</p>
        <div class="chips2" role="tablist">{#each stepsQ as s (s.id)}<button type="button" role="tab" class:on={pick === s.id} aria-selected={pick === s.id} onclick={() => { pick = s.id; ver = 0; }}>{s.title.split(' · ')[0]}</button>{/each}</div>
        {#if nVer > 1}<div class="chips2 vers" role="tablist" aria-label="버전">{#each Array.from({ length: nVer }, (_, k) => k) as k (k)}<button type="button" role="tab" class:on={ver === k} aria-selected={ver === k} onclick={() => (ver = k)}>버전 {k}</button>{/each}</div>{/if}
        {#if P && pickStep && ((P.imgCells ?? []).includes(pickCell) || P.videos?.[pick])}<div class="media" data-k="packmedia">
          {#if (P.imgCells ?? []).includes(pickCell)}<div class="mimg" data-k="packimg"><PrepImg {S} L={P} id={pickCell} alt="학습지 칸 {pickCell}"><p class="noimg">🖼 그림 「{pickCell}」 없음 · 글자로 보여요</p></PrepImg></div>{/if}
          <!-- svelte-ignore a11y_media_has_caption -->
          {#if P.videos?.[pick]}<video src={P.videos[pick]} controls preload="metadata" playsinline data-k="packvid"></video>{/if}
        </div>{/if}
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
  .mine { display: flex; flex-direction: column; gap: 6px; } .mrow { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--r-sm); background: var(--surface-2); }
  .mrow > span:first-child { flex: 1; min-width: 0; display: flex; flex-direction: column; } .mrow small { color: var(--text-3); font-size: 12px; }
  .del, .cf button { min-height: 40px; padding: 0 12px; border-radius: var(--r-sm); border: 1px solid var(--bad); background: transparent; color: var(--bad); font: 700 14px var(--font); }
  .cf { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; justify-content: flex-end; } .cf em { font-style: normal; font-size: 13px; color: var(--bad); width: 100%; text-align: right; } .cf .yes { background: var(--bad); color: #fff; } .cf .no { border-color: var(--line); color: var(--text); }
  .msum { margin: 0; font: 600 13px var(--font); color: var(--text-2); }
  .sum.bad { background: color-mix(in srgb, var(--bad) 18%, var(--surface)); }
  .iss { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 40vh; overflow: auto; overscroll-behavior: contain; }
  .iss li { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; border-radius: var(--r-sm); border-left: 4px solid var(--bad); background: var(--surface-2); font-size: 14px; }
  .iss li.ask { border-left-color: var(--accent); } .iss b { font-size: 13px; } .iss span { color: var(--text-2); }
  .lab { margin: 6px 0 0; font: 700 13px var(--font); color: var(--text-2); }
  .chips2 { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
  .chips2 button { flex: none; min-height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
  .chips2 button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .prev { display: flex; flex-direction: column; gap: 12px; }
  .media { display: flex; flex-direction: column; gap: 8px; } .media video { width: 100%; border-radius: var(--r-sm); background: #000; } .noimg { margin: 0; font-size: 13px; color: var(--text-2); }
  .pq { padding: 10px; border-radius: var(--r); background: var(--surface-2); }
  .sol { margin: 6px 0 0; font-size: 13px; color: var(--text-2); }
  .ok { margin: 0; color: var(--ok); font-weight: 700; } .fail { margin: 0; color: var(--bad); font-weight: 700; }
</style>
