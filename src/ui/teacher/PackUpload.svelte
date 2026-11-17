<script lang="ts">
  import type { Given, LessonPack, Question, Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import QItem from '../q/QItem.svelte';
  import { checkMedia, checkUpload, deletable, matchCells, PACK_PATH, PREV_PATH, recordedN, revive, slotDiff, unpackZip, type Checked, type Issue } from '../../school/packUpload';
  import { fixAuto } from '../rdun';
  import { RD } from '../../school/rdunCfg';
  import PrepImg from '../q/PrepImg.svelte';
  import { prepPath, prepPut } from '../../school/prep';
  import { autoRects, nudge, slotsOf, type Rect } from '../../school/pdfcrop';
  import type { PdfDoc } from './pdfPages';
  import { findVideo, matchVideos, putVid, RTDB, vidPath } from '../../school/video';
  import { items, bossItem } from '../../engine/lessons';
  import { PACKS, UPLOADED, addPacks, removePack } from '../../engine/packs';
  import { SUBJ } from '../../engine/subject';
  import { ATTACKS } from '../../raid/attacks';
  import { spriteOf } from '../manifest';
  import { CASTLE_PATH, checkCastle, diffRooms, floorName, forgetCastle, spanOf, storeOf, type CastleChecked } from '../../school/castle';
  import { addCastles, castles } from '../../school/castles.svelte';
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
  let failed = $state(''), vidNote = $state('');
  let text = $state(''), name = $state(''), res = $state<Checked | null>(null), paste = $state(false), saved = $state('');
  let pick = $state(''), ver = $state(0);
  // 🖼 함께 고른 그림 (📜 2026-11-14 선생님 「그림도 팩 올릴 때 같이 올리게 해줘」): 파일 이름 = 칸 이름이면 그 칸 · 저장 = prep/{팩 id}/img/{칸}(같은 이름 = 덮어씀)
  let pdfIss = $state<Issue[]>([]);
  let imgs = $state<Record<string, string>>({}), unused = $state<string[]>([]), media = $state<Issue[]>([]), vidOk = $state<Record<string, boolean>>({});
  const P0 = $derived(res?.pack ?? null);
  /** 그림을 같이 올리면 = 팩 자기 칸 그림을 씀(imgOf 빌리기 끔) */
  const P1 = $derived.by((): LessonPack | null => { if (!P0) return null; if (!Object.keys(imgs).length) return P0; const { imgOf: _drop, ...rest } = P0; void _drop; return { ...rest, imgCells: [...new Set([...(P0.imgCells ?? []), ...Object.keys(imgs)])] } as LessonPack; });
  // 🎬 zip 안 .mp4 (📜 2026-11-14 「전부 진행해」): 이름 끝맞춤 → 칸 · 미리 보기 = 이 기기 Blob 주소 · 저장 때 서버 prep/{팩}/vid/{이름} 로 올리고 rtdb: 주소로 바꿈
  let zvids: { name: string; data: Uint8Array }[] = [], vmap = $state<Record<string, string>>({}), vblob = $state<Record<string, string>>({}), vunused = $state<string[]>([]);
  // 📚 영상 서고: zip 에 없는 이름 = 앱 · 정식 사이트 · 서버에서 찾은 주소 (vres = 'video/이름.mp4' → 찾은 주소 · null = 못 찾음)
  let vres = $state<Record<string, { url: string; from: string } | null>>({});
  const P = $derived.by((): LessonPack | null => { if (!P1) return null; const base = Object.fromEntries(Object.entries(P1.videos ?? {}).map(([c, u]) => [c, vres[u]?.url ?? u])); const v = { ...base, ...Object.fromEntries(Object.entries(vmap).map(([c, n]) => [c, vblob[n]!])) }; return Object.keys(v).length ? { ...P1, videos: v } : P1; });
  const fromLib = $derived(Object.values(vres).filter(Boolean).length), missLib = $derived(Object.entries(vres).filter(([, x]) => !x).map(([u]) => u.replace(/^.*\//, '').replace(/\.mp4$/, ''))); // 붙인 그림 칸 = 그림 칸 목록에 (팩에 img 목록이 없어도)
  const issues = $derived(res ? [...res.issues, ...media, ...pdfIss] : []);
  const errs = $derived(issues.filter((x) => x.lvl === 'err')), asks = $derived(issues.filter((x) => x.lvl === 'ask'));
  // 🗑 ② 같은 id 로 다시 올림 = 옛 판과 문제 칸(몬스터 · 형성평가 문항)이 다르고 기록이 있으면 경고 → 「그래도 올리기」를 눌러야 저장 (📜 2026-11-15)
  const oldP = $derived(P ? PACKS.find((x) => x.id === P!.id) ?? null : null);
  const recN = $derived(P ? recordedN(S.get<Record<string, unknown>>('records'), P.id) : 0);
  const sdiff = $derived(oldP && P ? slotDiff(oldP, P) : null);
  let okReplace = $state(false);
  $effect(() => { void P; okReplace = false; });
  const needOk = $derived(!!sdiff && recN > 0 && !okReplace);
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
  const hasFile = async (url: string) => { if (url.startsWith('blob:')) return true; try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return r.ok && !/text\/html/.test(r.headers.get('content-type') || ''); } catch { return false; } };
  // 🏰 올리기 단추 하나 = 파일 안 kind 로 가름 (📜 2026-11-14 · 머리 확정 「추가 팩 관리」): 없음 = 차시 팩(그대로) · "castle" = 🏰 성채 팩(검사기 · 저장 자리 prep/addons/castle 따로)
  let cres = $state<CastleChecked | null>(null), cpick = $state(''), cver = $state(0);
  const cerrs = $derived(cres ? cres.issues.filter((x) => x.lvl === 'err') : []), casks = $derived(cres ? cres.issues.filter((x) => x.lvl === 'ask') : []);
  const cold = $derived(cres?.pack ? castles.list.find((x) => x.id === cres!.pack!.id) ?? null : null);
  const cdiff = $derived(cold && cres?.pack ? diffRooms(cold, cres.pack) : null);
  const croom = $derived(cres?.pack?.rooms.find((r) => r.id === cpick) ?? null);
  const kindOf = (t: string) => { try { const j = JSON.parse(t) as { kind?: unknown }; return j && typeof j === 'object' ? String(j.kind ?? '') : ''; } catch { return ''; } };
  async function saveCastle() {
    const P = cres?.pack; if (!P || cerrs.length || saved) return;
    const put = (p: string, x: unknown) => (S.trySet ? S.trySet(p, x) : Promise.resolve((S.set(p, x), true)));
    const P2 = { ...P, ...(cold?.hide ? { hide: true } : {}) };
    if (!(await put(`${CASTLE_PATH}/${P.id}`, storeOf(P2, Date.now())))) { failed = '저장하지 못했어요 · 교사로 로그인했는지 · 인터넷을 확인해요'; return; }
    const keep = cdiff ? ` · 처치 기록 그대로 ${cdiff.keep.length}방` : '';
    forgetCastle(P2); addCastles([P2]);
    saved = `🏰 ${floorName(P)} 저장 · 방 ${P.rooms.length}개${keep} · 「➕ 추가 팩」에 들어갔어요`;
  }
  function run(t: string, n: string) {
    cres = null;
    if (kindOf(t) === 'castle') { text = t; name = n; saved = ''; failed = ''; res = null; cres = checkCastle(t, { sheet: look.sheet }); cpick = cres.pack?.rooms[0]?.id ?? ''; cver = 0; return; }
    text = t; name = n; saved = ''; res = checkUpload(t, look); pick = ''; ver = 0; fromPdf = {}; rects = {}; own = {}; pdfIss = []; pdfNote = ''; pdfDoc = null; vres = {}; matchVids(); return matchImgs(); }
  // 그림 · 영상 확인 다시 (팩 · 그림이 바뀔 때마다) — 붙인 그림 = 있음 · 영상 = 있는 파일만 연결
  let mseq = 0;
  async function recheckMedia() {
    const k0 = ++mseq;
    if (P1) { // 📚 zip 에 없는 영상 이름 → 서고에서 찾기 (한 번 찾은 이름은 기억)
      const zipNames = new Set(Object.keys(vmap)), want = [...new Set(Object.entries(P1.videos ?? {}).filter(([c, u]) => !zipNames.has(c) && u.startsWith('video/')).map(([, u]) => u))].filter((u) => !(u in vres));
      if (want.length) { const got: typeof vres = {}; for (const u of want) got[u] = await findVideo(u, P1.id, hasFile, async (p) => { try { const x = S.fetch ? await S.fetch(p) : S.get(p); return x != null; } catch { return false; } }); if (k0 !== mseq) return; vres = { ...vres, ...got }; }
    }
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
  // 칸 그림 = ✂ PDF 에서 자른 것 < 🖼 zip · 고른 그림 파일 < 🖼 그 칸만 직접 고른 그림 (뒤가 이김)
  let fromFile = $state<Record<string, string>>({}), fromPdf = $state<Record<string, string>>({}), own = $state<Record<string, string>>({});
  let rects = $state<Record<string, Rect[] | null>>({}), pdfDoc: PdfDoc | null = null, pdfNote = $state('');
  const srcOf = (c: string) => (own[c] ? 'own' : fromFile[c] ? 'file' : fromPdf[c] ? 'pdf' : '');
  async function combine() {
    imgs = { ...fromPdf, ...fromFile, ...own };
    const Pk = P; if (Pk) for (const [c, u] of Object.entries(imgs)) prepPut(Pk, c, u);
    const miss = Object.entries(rects).filter(([c, r]) => !r && !fromFile[c] && !own[c]).map(([c]) => c);
    pdfIss = miss.length ? [{ at: `✂ PDF 칸 ${miss.join(' · ')}`, msg: '자르지 못함 — 학습지에서 그 칸 이름 글자를 못 찾았어요 · 「그림 직접 고르기」 또는 팩 find 칸', lvl: 'ask' }] : [];
    await recheckMedia();
  }
  /** 그림 칸 = 팩 img 목록 · 없으면 단계(도입 img · 개념 · 문제 · 형성평가) 모두 — 단계 id 가 무엇이든 단계 종류 · 제목으로 자름 (🐞 2026-11-14 팩에 img 목록이 없어 0장) */
  const cellsOf = (Pk: LessonPack) => (Pk.imgCells?.length ? Pk.imgCells : [...new Set(slotsOf(Pk.steps, Pk.boss?.title ?? '').map((x) => x.id))]);
  async function matchImgs() {
    const cells = new Set(P0 ? cellsOf(P0) : []), got: Record<string, string> = {};
    const m = matchCells(picked.map((f) => f.name), [...cells]); // 이름 = 칸 · 끝이 「_칸」 (드라이브 접두어) · 정확히 같은 이름 우선
    for (const [c, n] of Object.entries(m.map)) { const f = picked.find((x) => x.name === n); if (f) got[c] = await shrink(f); }
    fromFile = got; unused = m.unused;
    await combine();
  }
  function matchVids() {
    for (const u of Object.values(vblob)) URL.revokeObjectURL(u);
    if (!P0 || !zvids.length) { vmap = {}; vblob = {}; vunused = []; return; }
    const byUrl: Record<string, string[]> = {}; for (const [c, u] of Object.entries(P0.videos ?? {})) (byUrl[u] ??= []).push(c);
    const files = Object.entries(byUrl).map(([u, at]) => ({ file: u.replace(/^.*\//, '').replace(/\.mp4$/i, ''), at }));
    const m = matchVideos(zvids.map((v) => v.name), files, P0.steps.map((x) => x.id));
    vblob = Object.fromEntries([...new Set(Object.values(m.map))].map((n) => [n, URL.createObjectURL(new Blob([zvids.find((v) => v.name === n)!.data as Uint8Array<ArrayBuffer>], { type: 'video/mp4' }))]));
    vmap = m.map; vunused = m.unused;
  }
  // ✂ 학습지 PDF → 칸마다 자동 자르기 (정식 수업 준비와 같은 글자 찾기 · 칸 = 팩 imgCells)
  async function cropPdf(bytes: Uint8Array, pdfName: string) {
    const Pk = P0; if (!Pk) return;
    pdfNote = `✂ ${pdfName} 읽는 중… (처음엔 PDF 읽기 도구를 받느라 몇 초 걸려요)`;
    try {
      const { readPdf, cutRects, inkOf } = await import('./pdfPages');
      pdfDoc = await readPdf(bytes);
      const cells = new Set(cellsOf(Pk)), slots = slotsOf(Pk.steps, Pk.boss?.title ?? '', Pk.find ?? {}).filter((x, i, a) => cells.has(x.id) && a.findIndex((y) => y.id === x.id) === i);
      if (!pdfDoc.lines.length) { pdfNote = '✂ PDF 에 글자가 없어요(스캔 · 사진 PDF) — 칸마다 그림을 직접 골라 주세요'; rects = Object.fromEntries(slots.map((x) => [x.id, null])); await combine(); return; }
      const r = autoRects(pdfDoc.lines, slots, inkOf(pdfDoc.pages)), got: Record<string, string> = {};
      for (const [c, rs] of Object.entries(r)) if (rs) got[c] = cutRects(pdfDoc.pages, rs);
      rects = r; fromPdf = got; (globalThis as { __pdfRects?: unknown }).__pdfRects = r; // 시험: 자른 틀
      const n = Object.values(r).filter(Boolean).length;
      if (!slots.length) { pdfNote = '✂ 자를 칸이 없어요 — 팩에 단계(도입 · 개념 · 문제 · 형성평가)가 없어요'; await combine(); return; }
      if (!n) { pdfNote = `✂ ${pdfName} 에서 칸 이름 글자(몬스터 n · 문제 n · STEP n · 형성평가 · 생각 열기)를 하나도 못 찾았어요 — 레이드용 학습지가 맞는지 · 칸마다 그림을 직접 골라 주세요`; rects = r; await combine(); return; }
      pdfNote = `✂ ${pdfName} 에서 ${n} / ${slots.length}칸을 글자로 찾아 잘랐어요 — 칸마다 눈으로 보고, 틀리면 위 · 아래를 늘리고 줄이거나 그림을 직접 골라요`;
    } catch (e) { pdfNote = `✂ ${pdfName} 을 읽지 못했어요 — ${(e as Error)?.message || String(e)} · 칸마다 「그림 직접 고르기」로 넣거나 칸 그림 파일을 zip 에 같이 넣어 주세요`; }
    await combine();
  }
  async function adjust(c: string, edge: 'top' | 'bottom', d: number) {
    const rs = rects[c]; if (!rs || !pdfDoc) return;
    const { cutRects } = await import('./pdfPages');
    const n = nudge(rs, edge, d); rects = { ...rects, [c]: n }; fromPdf = { ...fromPdf, [c]: cutRects(pdfDoc.pages, n) };
    await combine();
  }
  async function pickOwn(c: string, e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; own = { ...own, [c]: await shrink(f) }; await combine(); }
  async function onimgs(e: Event) { picked = [...((e.target as HTMLInputElement).files ?? [])]; await matchImgs(); }
  $effect(() => { if (res && !pick && stepsQ[0]) pick = (stepsQ.find((x) => x.kind === 'monster') ?? stepsQ[0]).id; });
  async function onfile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    const buf = new Uint8Array(await f.arrayBuffer());
    // zip = 이름 끝 .zip 또는 내용 첫 글자 「PK」 (폰 파일 고르기가 확장자를 떼는 때 · 🐞 2026-11-14)
    const isZip = /\.zip$/i.test(f.name) || (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04);
    if (!isZip) { zvids = []; run(new TextDecoder().decode(buf), f.name); return; }
    // 🗜 zip = 팩 .json 1개 + 칸 그림들 + 학습지 PDF (폴더 · 이름 접두어 상관없음 · 20MB 까지)
    const z = await unpackZip(buf);
    if (z.error || !z.json) { res = { pack: null, issues: [{ at: `zip ${f.name}`, msg: z.error ?? '팩이 없어요', lvl: 'err' }], stats: { mons: 0, items: 0, versions: 0, rechecked: 0, ask: 0 } }; name = f.name; return; }
    zvids = z.videos;
    picked = z.images.map((x) => new File([x.data as Uint8Array<ArrayBuffer>], x.name, { type: /\.webp$/i.test(x.name) ? 'image/webp' : /\.png$/i.test(x.name) ? 'image/png' : 'image/jpeg' }));
    await run(z.json, `${f.name} · ${z.name} + 그림 ${z.images.length}장${z.pdfs.length ? ` + 학습지 PDF ${z.pdfs.length}개` : ''}${z.videos.length ? ` + 영상 ${z.videos.length}편` : ''}`);
    // ✂ 언제나 한 줄: PDF 없음 · 여러 개 · 읽는 중 → 결과 (조용히 0장 금지)
    if (!z.pdfs.length) pdfNote = z.images.length ? '' : `✂ zip 안에 학습지 PDF 도 칸 그림도 없어요 (zip 안 파일: ${z.files.slice(0, 6).join(' · ')}${z.files.length > 6 ? ' …' : ''})`;
    else if (z.pdfs.length > 1) pdfNote = `✂ zip 안에 PDF 가 ${z.pdfs.length}개 (${z.pdfs.map((x) => x.name).join(' · ')}) — 학습지 PDF 는 1개만 · 자르지 않았어요`;
    else await cropPdf(z.pdfs[0]!.data, z.pdfs[0]!.name);
  }
    // 🗑 올린 팩 지우기 (📜 2026-11-14 선생님 「기존 11차시 지우면 되지? → 삭제 없어」): 베타에서 올린 팩만 · 확인 한 번 · 팩 + 그 팩 칸 그림
  const mine = $derived([...UPLOADED].map((id) => PACKS.find((p) => p.id === id)).filter((p): p is LessonPack => !!p).sort((a, b) => a.no - b.no));
  let ask = $state(''), gone = $state('');
  // 🗑 ① 기록 있는 팩 = 경고 + 👀 숨기기 먼저 권함 (📜 2026-11-15 DECISIONS)
  const recOf = (id: string) => recordedN(S.get<Record<string, unknown>>('records'), id);
  let hidden = $state<Record<string, boolean>>({});
  const isHidden = (id: string) => hidden[id] ?? !!PACKS.find((p) => p.id === id)?.hide;
  async function setHide(id: string, on: boolean) {
    const put = (p: string, x: unknown) => (S.trySet ? S.trySet(p, x) : Promise.resolve((S.set(p, x), true)));
    if (!(await put(`${PACK_PATH}/${id}/hide`, on ? true : null))) { failed = '바꾸지 못했어요 · 교사 로그인 · 인터넷을 확인해요'; return; }
    const pk = PACKS.find((p) => p.id === id); if (pk) pk.hide = on || undefined;
    hidden = { ...hidden, [id]: on }; ask = ''; gone = on ? `「${id}」 학생 캠프에서 숨겼어요 · 기록은 그대로 · 다시 켤 수 있어요` : `「${id}」 다시 보여요`;
  }
  async function del(id: string) {
    if (!deletable(id, (x) => builtIn.has(x))) return;
    const put = (p: string) => (S.trySet ? S.trySet(p, null) : Promise.resolve((S.set(p, null), true)));
    if (!(await put(`${PACK_PATH}/${id}`))) { failed = '지우지 못했어요 · 교사 로그인 · 인터넷을 확인해요'; ask = ''; return; }
    await put(`prep/${id}`); // 그 팩의 칸 그림
    removePack(id); ask = ''; gone = `「${id}」 팩을 지웠어요 · 차시 목록에서 빠져요`;
    setTimeout(() => { const u = new URL(location.href); u.searchParams.set('tab', 'prep'); u.searchParams.delete('lesson'); location.href = u.toString(); }, 900);
  }
  // 📋 AI 에 붙일 문구 (📜 2026-11-17 #22 ① · 팩 도우미 지침 v3 [출력] 마지막 줄과 같은 꼴) · ❓ 문의 「오류 문구」 자동 채움용으로 이 기기에 기억
  let aiNote = $state('');
  const aiText = () => ['이 팩을 아래대로 고쳐 다시 줘', ...errs.map((x) => `- ${x.at} : ${x.msg}`)].join('\n');
  $effect(() => { if (errs.length) { const t = errs.map((x) => `${x.at} : ${x.msg}`).join(' / '); try { localStorage.setItem('citadel-pack-lasterr', `${name} · ${t}`.slice(0, 600)); } catch { /* 이 기기만 */ } } });
  async function copyAi() { try { await navigator.clipboard.writeText(aiText()); aiNote = '✔ 복사했어요 · AI 대화창에 붙여 넣어요'; } catch { aiNote = '복사가 막혔어요 · 아래 ✘ 줄을 길게 눌러 복사해요'; } }
  async function save() {
    if (!P || errs.length || needOk) return;
    const v = JSON.parse(JSON.stringify(P)) as LessonPack, path = `${PACK_PATH}/${P.id}`;
    if (oldP?.hide) v.hide = true; // 👀 숨김은 새 판에도 그대로
    { const o = oldP as (LessonPack & { rev?: number }) | null; Object.assign(v, { rev: (o?.rev ?? (o ? 1 : 0)) + 1, upAt: Date.now() }); } // 📦 차시 카드 「v2 · 11/20 올림」 (📜 2026-11-17 #22)
    // 🎬 영상 이름은 지금 서고에 없어도 그대로 저장 (🐞 2026-11-14 「13차시 팩에 영상이 포함 안 됨」 = 올릴 때 없던 영상을 빼 버려 나중에 서고에 생겨도 안 붙었음)
    //   재생할 때 다시 찾음(video.ts videoSrc = 앱 → 정식 사이트) · 그때도 없으면 그 칸 🎬 = 「영상을 받지 못했어요」 한 줄
    const put = (p: string, x: unknown) => (S.trySet ? S.trySet(p, x) : Promise.resolve((S.set(p, x), true)));
    for (const [c, u] of Object.entries(imgs)) if (!(await put(prepPath(v, c), u))) { failed = `그림 「${c}」 를 저장하지 못했어요 · 교사 로그인 · 인터넷을 확인해요`; return; }
    // 🎬 zip 영상 = 서버에 쪼개 올림(같은 이름 = 한 번) → 칸 주소 rtdb:
    const upv: Record<string, string> = {};
    for (const [c, n] of Object.entries(vmap)) {
      if (!upv[n]) { const z = zvids.find((x) => x.name === n); if (!z) continue; saved = ''; failed = ''; vidNote = `🎬 영상 「${n}」 올리는 중…`; const pth = vidPath(v.id, n); if (!(await putVid(put, pth, z.data))) { vidNote = ''; failed = `영상 「${n}」 을 저장하지 못했어요 · 교사 로그인 · 인터넷을 확인해요`; return; } upv[n] = RTDB + pth; }
      (v.videos ??= {})[c] = upv[n]!;
    }
    vidNote = '';
    // ↩ 바로 전 판 하나 보관 (📜 2026-11-17 #22 ② 「↩ 바로 전 판으로 되돌리기」) = prep/packPrev/{id}
    { const prev = S.fetch ? await S.fetch<LessonPack>(path).catch(() => null) : S.get<LessonPack>(path); if (prev && typeof prev === 'object') await put(`${PREV_PATH}/${P.id}`, prev); }
    const ok = await put(path, v); // 서버 = 실제로 써졌는지 확인(교사 로그인 · 규칙)
    if (!ok) { failed = '저장하지 못했어요 · 교사로 로그인했는지 · 인터넷을 확인해요'; return; }
    addPacks([revive(v)]); // 새로 고침 전에도 차시 목록에
    fixAuto(S, revive(v), RD); // 🎲 자동 던전 = 올릴 때 한 번 고정 (그림 없는 팩 · 📜 2026-11-17 #22)
    saved = `${P.no}차시 ${P.title} 저장${Object.keys(imgs).length ? ` · 그림 ${Object.keys(imgs).length}칸` : ''}${Object.keys(upv).length ? ` · 영상 ${Object.keys(upv).length}편` : ''} · 차시 목록에 들어갔어요`;
    setTimeout(() => { const u = new URL(location.href); u.searchParams.set('tab', 'prep'); u.searchParams.set('lesson', P.id); location.href = u.toString(); }, 900);
  }
</script>

{#if cres}
<Sheet {onclose} tall mainText={saved ? '저장했어요' : cres.pack ? (cold ? '🔁 새 판으로 바꾸기' : `🏰 ${cres.pack.floor}층 저장`) : '파일을 골라요'} mainDisabled={!cres.pack || cerrs.length > 0 || !!saved} why={cres.pack && cerrs.length ? `고칠 칸 ${cerrs.length}개가 있으면 저장할 수 없어요` : ''} onmain={saveCastle}>
  {#snippet title()}📦 팩 올리기 · 🏰 성채{/snippet}
  <div class="up" data-k="packup" data-kind="castle">
    <label class="file"><input type="file" accept=".json,.zip,application/json,application/zip" onchange={onfile} data-k="packfile" /><span>📂 다른 파일 고르기</span><small>{name}</small></label>
    <p class="sum" data-k="packsum" class:bad={cerrs.length > 0}>{cerrs.length ? `✘ 고칠 칸 ${cerrs.length}개` : '✔ 검사 통과'}{casks.length ? ` · 선생님 확인 ${casks.length}` : ''} · 🏰 성채 팩{cres.pack ? ` ${floorName(cres.pack)} · 열림 ${spanOf(cres.pack)}` : ''} · 방 {cres.stats.rooms} · 문항 {cres.stats.items} · 판 {cres.stats.versions}{cres.stats.rechecked ? ` · 다시 계산 맞음 ${cres.stats.rechecked}` : ''}</p>
    {#if cold && cdiff && !saved}<p class="ask" data-k="castle-replace" role="alert"><b>「{cold.id}」 이 이미 있어요 — 새 판으로 바꿀까요?</b><span>같은 방 id {cdiff.keep.length}개 = 학생 처치 기록 그대로{cdiff.gone.length ? ` · 빠지는 방 ${cdiff.gone.join(' · ')}` : ''}{cdiff.added.length ? ` · 새 방 ${cdiff.added.join(' · ')}` : ''}</span></p>{/if}
    {#if cres.issues.length}<ul class="iss" data-k="packiss">{#each cres.issues as x, i (i)}<li class={x.lvl}><b>{x.lvl === 'err' ? '✘' : '⚠'} {x.at}</b><span>{x.msg}</span></li>{/each}</ul>{/if}
    {#if cres.pack}
      <p class="lab">미리 보기 · 학생 폰과 같은 문제 꼴 (💡 정답 펼침)</p>
      <div class="chips2" role="tablist">{#each cres.pack.rooms as r (r.id)}<button type="button" role="tab" class:on={cpick === r.id} aria-selected={cpick === r.id} onclick={() => { cpick = r.id; cver = 0; }}>{r.boss ? '👑 ' : ''}{r.id}</button>{/each}</div>
      {#if croom}<div class="chips2 vers" role="tablist" aria-label="판">{#each croom.vers as _v, k (k)}<button type="button" role="tab" class:on={cver === k} aria-selected={cver === k} onclick={() => (cver = k)}>{k ? `재도전 ${k}` : '첫 판'}</button>{/each}</div>
      <p class="msum">{croom.title} · {croom.no}차시부터{croom.chain ? ' · ⚔ 소레이드' : ''}{croom.photo ? ' · 📷 서술형(답 확인만)' : ''}</p>
      <div class="prev" data-k="packprev">{#each croom.vers[cver] ?? [] as q, i (`${cpick}|${cver}|${i}`)}<div class="pq qpaper"><QItem {q} {i} value={answerOf(q)} disabled onchange={() => {}} />{#if q.type === 'choice' || q.type === 'multi'}<p class="sol" data-k="ansno">정답 = 보기 {(q.type === 'choice' ? [q.answerIndex] : q.answer).map((k) => `${k}번(${(q.type === 'choice' ? q.choices : q.options)[k]})`).join(' · ')}</p>{/if}{#if q.solution}<p class="sol">💡 {q.solution}</p>{/if}</div>{/each}</div>{/if}
    {/if}
    {#if saved}<p class="ok" role="status">{saved}</p>{/if}{#if failed}<p class="fail" role="alert">{failed}</p>{/if}
  </div>
</Sheet>
{:else}
<Sheet {onclose} tall mainText={saved ? '저장했어요' : P ? `${P.no}차시 저장` : '파일을 골라요'} mainDisabled={!P || errs.length > 0 || !!saved || needOk} why={P && errs.length ? `고칠 칸 ${errs.length}개가 있으면 저장할 수 없어요` : needOk ? '옛 기록과 문제가 맞지 않아요 · 위에서 「그래도 올리기」를 눌러야 저장돼요' : ''} onmain={save}>
  {#snippet title()}📦 팩 올리기{/snippet}
  <div class="up" data-k="packup">
    {#if mine.length && !res}<div class="mine" data-k="packmine"><p class="lab">올린 차시 팩</p>
      {#each mine as m (m.id)}<div class="mrow" data-id={m.id}><span><b>{m.no}차시 {m.title}</b><small>{m.id}</small></span>
        <button type="button" class="hid" data-k="packhide" aria-pressed={isHidden(m.id)} onclick={() => setHide(m.id, !isHidden(m.id))}>{isHidden(m.id) ? '🙈 숨김' : '👀 보임'}</button>
        {#if deletable(m.id, (x) => builtIn.has(x))}{#if ask === m.id}{@const rn = recOf(m.id)}<span class="cf" role="alertdialog" data-k="packdel-ask">{#if rn}<em>이 차시에 학생 {rn}명의 기록이 있어요. 기록은 남지만 차시 목록 · 복습에서 사라져요</em>{#if !isHidden(m.id)}<button type="button" class="yes" data-k="packdel-hide" onclick={() => setHide(m.id, true)}>👀 숨기기</button>{/if}<button type="button" class="no" data-k="packdel-yes" onclick={() => del(m.id)}>그래도 지우기</button>{:else}<em>이 팩을 지울까요? 되돌릴 수 없어요</em><button type="button" class="yes" data-k="packdel-yes" onclick={() => del(m.id)}>예</button>{/if}<button type="button" class="no" onclick={() => (ask = '')}>{rn ? '취소' : '아니요'}</button></span>{:else}<button type="button" class="del" data-k="packdel" onclick={() => (ask = m.id)}>🗑 삭제</button>{/if}{/if}
      </div>{/each}</div>{/if}
    {#if gone}<p class="ok" role="status">{gone}</p>{/if}
    <label class="file"><input type="file" accept=".json,.zip,application/json,application/zip" onchange={onfile} data-k="packfile" /><span>📂 파일 고르기</span><small>{name || '차시 팩 · 🏰 성채 팩 .json · 또는 .zip (팩 + 칸 그림 · 20MB 까지) · 종류는 파일 안 kind 로 저절로'}</small></label>
    <label class="file img"><input type="file" accept="image/png,image/webp,image/jpeg" multiple onchange={onimgs} data-k="packimgs" /><span>🖼 칸 그림 같이 고르기 (여러 장)</span><small>파일 이름 = 칸 이름 (예: c1.png · review.webp)</small></label>
        <button type="button" class="b2" onclick={() => (paste = !paste)}>{paste ? '붙여 넣기 닫기' : '글로 붙여 넣기'}</button>
    {#if paste}<textarea rows="5" bind:value={text} placeholder={'{ "id": "lesson-11", "no": 11, … }'} data-k="packtext"></textarea><button type="button" class="b2" onclick={() => run(text, '붙여 넣은 글')}>검사하기</button>{/if}

    {#if res}
      {#if sdiff && recN > 0 && !saved}<p class="ask" data-k="pack-replace" role="alert"><b>⚠ 옛 기록 {recN}명과 문제가 맞지 않아요</b><span>{sdiff.gone.length ? `빠지는 칸 ${sdiff.gone.join(' · ')}` : ''}{sdiff.gone.length && sdiff.added.length ? ' · ' : ''}{sdiff.added.length ? `새 칸 ${sdiff.added.join(' · ')}` : ''}</span><button type="button" class="b2" data-k="pack-replace-ok" aria-pressed={okReplace} onclick={() => (okReplace = !okReplace)}>{okReplace ? '✔ 알고 올려요' : '그래도 올리기'}</button></p>{/if}
      <p class="sum" data-k="packsum" class:bad={errs.length > 0}>{errs.length ? `✘ 고칠 칸 ${errs.length}개` : '✔ 검사 통과'}{asks.length ? ` · 선생님 확인 ${asks.length}` : ''} · 몬스터 {res.stats.mons} · 문항 {res.stats.items} · 버전 {res.stats.versions} · 다시 계산 맞음 {res.stats.rechecked}{res.stats.ask ? ` · 다시 계산 못 함 ${res.stats.ask}(눈으로 확인)` : ''}{res.pack?.keys?.length ? ` · 🔑 열쇠 ${res.pack.keys.length} (${res.pack.keys.map((k) => k.name).join(' · ')})` : ''}</p>
      {#if res && (Object.keys(imgs).length || unused.length || Object.keys(vidOk).length || vunused.length || missLib.length)}<p class="msum" data-k="packmedia-sum">🖼 그림 {Object.keys(imgs).length}칸 붙음{unused.length ? ` · 쓰이지 않는 그림 ${unused.length}개 (${unused.join(' · ')})` : ''} · 🎬 영상 {Object.values(vidOk).filter(Boolean).length}편 연결{Object.values(vidOk).some((x) => !x) ? ` · 없는 영상 ${Object.values(vidOk).filter((x) => !x).length}편은 이름만 저장(서고에 생기면 저절로 붙음)` : ''}{Object.keys(vblob).length ? ` · zip 영상 ${Object.keys(vblob).length}편 → 칸 ${Object.keys(vmap).join(' · ')}` : ''}{vunused.length ? ` · 칸을 못 찾은 영상 ${vunused.join(' · ')}` : ''}{fromLib ? ` · 서고에서 ${fromLib}편` : ''}</p>{#if missLib.length}<p class="msum" data-k="vidmiss">🎬 영상 없음 — {missLib.join(' · ')} · 「학습지 · 영상 한 번에 넣기」로 mp4 를 넣을 수 있어요</p>{/if}{/if}
      {#if pdfNote}<p class="msum" data-k="pdfnote">{pdfNote}</p>{/if}
      {#if issues.length}<ul class="iss" data-k="packiss">{#each issues as x, i (i)}<li class={x.lvl}><b>{x.lvl === 'err' ? '✘' : '⚠'} {x.at}</b><span>{x.msg}</span></li>{/each}</ul>{/if}
      {#if errs.length}<button type="button" class="aicopy" data-k="ai-copy" onclick={copyAi}>📋 AI 에 붙일 문구 복사</button><small class="aihint">{aiNote || '복사 = 「이 팩을 아래대로 고쳐 다시 줘」 + 위 ✘ 줄 · AI 가 준 팩을 다시 올리면 끝'}</small>{/if}
      {#if P && stepsQ.length}
        <p class="lab">미리 보기 · 학생 폰과 같은 문제 꼴 (💡 정답 펼침)</p>
        <div class="chips2" role="tablist">{#each stepsQ as s (s.id)}<button type="button" role="tab" class:on={pick === s.id} aria-selected={pick === s.id} onclick={() => { pick = s.id; ver = 0; }}>{s.title.split(' · ')[0]}</button>{/each}</div>
        {#if nVer > 1}<div class="chips2 vers" role="tablist" aria-label="버전">{#each Array.from({ length: nVer }, (_, k) => k) as k (k)}<button type="button" role="tab" class:on={ver === k} aria-selected={ver === k} onclick={() => (ver = k)}>버전 {k}</button>{/each}</div>{/if}
        {#if P && pickStep && ((P.imgCells ?? []).includes(pickCell) || P.videos?.[pick])}<div class="media" data-k="packmedia">
          {#if (P.imgCells ?? []).includes(pickCell)}<div class="csrc" data-k="cellsrc" data-src={srcOf(pickCell)}>
            <small>{srcOf(pickCell) === 'pdf' ? '✂ 학습지 PDF 에서 자름' : srcOf(pickCell) === 'file' ? '🖼 zip · 고른 그림' : srcOf(pickCell) === 'own' ? '🖼 직접 고른 그림' : '그림 없음'}</small>
            {#if srcOf(pickCell) === 'pdf'}<span class="adj" role="group" aria-label="자르기 조정"><button type="button" data-k="top-up" onclick={() => adjust(pickCell, 'top', 1)}>위 늘리기</button><button type="button" data-k="top-dn" onclick={() => adjust(pickCell, 'top', -1)}>위 줄이기</button><button type="button" data-k="bot-up" onclick={() => adjust(pickCell, 'bottom', 1)}>아래 늘리기</button><button type="button" data-k="bot-dn" onclick={() => adjust(pickCell, 'bottom', -1)}>아래 줄이기</button></span>{/if}
            <label class="ownpick"><input type="file" accept="image/png,image/webp,image/jpeg" onchange={(e) => pickOwn(pickCell, e)} data-k="ownpick" />그림 직접 고르기</label>
          </div>{/if}
          {#if (P.imgCells ?? []).includes(pickCell)}{#key imgs[pickCell]}<div class="mimg" data-k="packimg"><PrepImg {S} L={P} id={pickCell} alt="학습지 칸 {pickCell}"><p class="noimg">🖼 그림 「{pickCell}」 없음 · 글자로 보여요</p></PrepImg></div>{/key}{/if}
          <!-- svelte-ignore a11y_media_has_caption -->
          {#if P.videos?.[pick]}<video src={P.videos[pick]} controls preload="metadata" playsinline data-k="packvid"></video>{/if}
        </div>{/if}
        <div class="prev" data-k="packprev">{#each shown as q, i (`${pick}|${ver}|${i}`)}<div class="pq qpaper"><QItem {q} {i} value={answerOf(q)} disabled onchange={() => {}} />{#if q.type === 'choice' || q.type === 'multi'}<p class="sol" data-k="ansno">정답 = 보기 {(q.type === 'choice' ? [q.answerIndex] : q.answer).map((k) => `${k}번(${(q.type === 'choice' ? q.choices : q.options)[k]})`).join(' · ')}</p>{/if}{#if q.solution}<p class="sol">💡 {q.solution}</p>{/if}</div>{/each}</div>
      {/if}
    {/if}
    {#if vidNote}<p class="msum" role="status" data-k="vidnote">{vidNote}</p>{/if}
    {#if saved}<p class="ok" role="status">{saved}</p>{/if}{#if failed}<p class="fail" role="alert">{failed}</p>{/if}
  </div>
</Sheet>
{/if}

<style>
  .aicopy { min-height: 48px; border-radius: var(--r); border: 0; background: var(--accent); color: var(--on-accent); font: 800 15px var(--font); box-shadow: 0 3px 0 var(--press-sh); } .aihint { color: var(--text-2); font-size: 13px; }
  .ask { margin: 0; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: var(--r-sm); border-left: 4px solid var(--accent); background: var(--surface-2); font-size: 14px; } .ask span { color: var(--text-2); font-size: 13px; }
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
  .csrc { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; } .csrc small { width: 100%; color: var(--text-2); font-size: 13px; }
  .adj { display: flex; flex-wrap: wrap; gap: 6px; } .adj button, .ownpick { min-height: 40px; padding: 0 10px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); display: inline-flex; align-items: center; position: relative; }
  .ownpick input { position: absolute; inset: 0; opacity: 0; }
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
  .hid { min-height: 40px; padding: 0 10px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
</style>
