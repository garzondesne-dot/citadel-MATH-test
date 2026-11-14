<script lang="ts">
  import { untrack } from 'svelte';
  import type { LessonPack, Store } from '../../model/types';
  import Sheet from '../battle/Sheet.svelte';
  import { autoRects, nudge, slotsOf, type Rect } from '../../school/pdfcrop';
  import { prepPath, prepPut } from '../../school/prep';
  import type { PdfDoc } from './pdfPages';
  // 📄 차시 준비 「학습지 PDF · 한 번에 넣기」 (📜 2026-11-14 선생님 「전부 진행해」 · DECISIONS 「🖼🎬 베타 차시 그림 · 영상 채우기」)
  //   PDF 1개 → 칸마다 자름(앱 차시 = 칸 위치 crops 그대로 · 칸 위치가 없는 차시 · 올린 팩 = 글자로 찾기 b121) → 칸마다 미리 보기 · 위 · 아래 늘리기 · 줄이기 · 그림 직접 고르기 → 저장 prep/{차시}/img/{칸}
  //   문제 · 정답 · 생성기는 그대로 · 늘 한 줄 결과
  const { S, L, onclose, ondone }: { S: Store; L: LessonPack; onclose: () => void; ondone?: () => void } = $props();
  const slots = untrack(() => slotsOf(L.steps.filter((s) => !s.later), L.boss?.title ?? '', L.find ?? {})).filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i); // 열 때 차시 그대로
  let note = $state(''), name = $state(''), rects = $state<Record<string, Rect[] | null>>({}), cut = $state<Record<string, string>>({}), own = $state<Record<string, string>>({});
  let pick = $state(slots[0]?.id ?? ''), saving = $state(false), saved = $state(''), failed = $state('');
  let doc: PdfDoc | null = null;
  const iou = (a: Rect, b: Rect) => { if (a.p !== b.p) return 0; const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)), i = ix * iy; return i / (a.w * a.h + b.w * b.h - i || 1); };
  const urlOf = (c: string) => own[c] ?? cut[c] ?? null;
  const n = $derived(slots.filter((s) => urlOf(s.id)).length);
  async function shrink(f: File): Promise<string> {
    const bmp = await createImageBitmap(f), w = Math.min(1280, bmp.width), h = Math.round((bmp.height * w) / bmp.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    const out = c.toDataURL('image/webp', 0.85); return out.startsWith('data:image/webp') ? out : c.toDataURL('image/jpeg', 0.85);
  }
  async function onpdf(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    name = f.name; note = `✂ ${f.name} 읽는 중… (처음엔 PDF 읽기 도구를 받느라 몇 초 걸려요)`; cut = {}; rects = {}; saved = ''; failed = '';
    try {
      const { readPdf, cutRects, inkOf } = await import('./pdfPages');
      doc = await readPdf(new Uint8Array(await f.arrayBuffer()));
      const crops0 = (L.crops ?? {}) as Record<string, Rect[]>;
      const byText = doc.lines.length ? autoRects(doc.lines, slots, inkOf(doc.pages)) : {};
      // 앱 차시 = 학습지에 맞춰 잰 칸 위치(crops) — 고른 PDF 가 그 판인지 먼저 봄: 쪽 수가 모자라거나 글자로 찾은 칸과 절반 넘게 어긋나면 글자로 찾기
      const maxP = Math.max(0, ...Object.values(crops0).flat().map((x) => x.p));
      const both = slots.filter((s) => crops0[s.id]?.length && byText[s.id]?.length), agree = both.filter((s) => iou(crops0[s.id]![0]!, byText[s.id]![0]!) >= 0.5).length;
      const useCrops = maxP > 0 && maxP <= doc.pages.length && (!both.length || agree * 2 >= both.length);
      const crops = useCrops ? crops0 : {};
      const r: Record<string, Rect[] | null> = {}, got: Record<string, string> = {};
      let fromCrops = 0;
      for (const s of slots) { const c = crops[s.id]?.length ? crops[s.id]!.map((x) => ({ ...x })) : null; const rs = c ?? byText[s.id] ?? null; if (c) fromCrops++; r[s.id] = rs; if (rs && rs.every((x) => x.p <= doc!.pages.length)) got[s.id] = cutRects(doc.pages, rs); }
      (globalThis as { __fillHow?: unknown }).__fillHow = { useCrops, maxP, pages: doc.pages.length, both: both.length, agree };
      rects = r; cut = got;
      const k = Object.keys(got).length;
      note = !k ? (!doc.lines.length && fromCrops === 0 ? `✂ ${f.name} 에 글자가 없어요(스캔 · 사진 PDF) — 칸마다 「그림 직접 고르기」로 넣어 주세요` : `✂ ${f.name} 에서 칸 이름 글자를 하나도 못 찾았어요 — 이 차시의 레이드용 학습지가 맞는지 · 칸마다 그림을 직접 골라 주세요`)
        : `✂ ${f.name} 에서 ${k} / ${slots.length}칸을 잘랐어요${fromCrops ? ` (학습지 칸 위치로 ${fromCrops} · 글자로 ${k - Math.min(k, fromCrops)})` : (L.crops ? ' (이 PDF 는 차시에 맞춰 잰 학습지 판과 달라 글자로 찾음)' : '')} — 칸마다 눈으로 보고, 틀리면 위 · 아래를 늘리고 줄이거나 그림을 직접 골라요`;
      (globalThis as { __fillRects?: unknown; __fillCut?: unknown }).__fillRects = r; (globalThis as { __fillCut?: unknown }).__fillCut = got;
    } catch (er) { note = `✂ ${f.name} 을 읽지 못했어요 — ${(er as Error)?.message || String(er)} · 칸마다 「그림 직접 고르기」로 넣어 주세요`; }
  }
  async function adjust(c: string, edge: 'top' | 'bottom', d: number) {
    const rs = rects[c]; if (!rs || !doc) return;
    const { cutRects } = await import('./pdfPages');
    const nr = nudge(rs, edge, d); rects = { ...rects, [c]: nr }; cut = { ...cut, [c]: cutRects(doc.pages, nr) }; 
  }
  async function pickOwn(c: string, e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; own = { ...own, [c]: await shrink(f) }; }
  async function save() {
    saving = true; failed = '';
    const put = (p: string, x: unknown) => (S.trySet ? S.trySet(p, x) : Promise.resolve((S.set(p, x), true)));
    let k = 0;
    for (const s of slots) { const u = urlOf(s.id); if (!u) continue; if (!(await put(prepPath(L, s.id), u))) { failed = `「${s.id}」 그림을 저장하지 못했어요 · 교사 로그인 · 인터넷을 확인해요`; saving = false; return; } prepPut(L, s.id, u); k++; }
    saving = false; saved = `${L.no}차시 칸 그림 ${k}장을 저장했어요`; ondone?.();
  }
  const pickSlot = $derived(slots.find((s) => s.id === pick) ?? null);
  const label = (s: { id: string; title: string }) => s.title.split(' · ')[0] || s.id;
</script>

<Sheet {onclose} tall mainText={saved ? '저장했어요' : saving ? '저장 중…' : `칸 그림 ${n}장 저장`} mainDisabled={!n || saving || !!saved} why={!n && name ? '자른 그림이 없으면 저장할 수 없어요' : ''} onmain={save}>
  {#snippet title()}📄 {L.no}차시 학습지 PDF · 한 번에 넣기{/snippet}
  <div class="pf" data-k="pdffill">
    <label class="file"><input type="file" accept="application/pdf,.pdf" onchange={onpdf} data-k="fillpdf" /><span>📂 학습지 PDF 고르기</span><small>{name || '레이드용 학습지 PDF 1개 · 칸마다 잘라 단계별 그림으로'}</small></label>
    {#if note}<p class="note" data-k="fillnote">{note}</p>{/if}
    {#if name}
      <div class="chips2" role="tablist">{#each slots as s (s.id)}<button type="button" role="tab" class:on={pick === s.id} class:none={!urlOf(s.id)} aria-selected={pick === s.id} onclick={() => (pick = s.id)}>{label(s)}{urlOf(s.id) ? '' : ' ⚠'}</button>{/each}</div>
      {#if pickSlot}<div class="cell">
        <small>{own[pick] ? '🖼 직접 고른 그림' : cut[pick] ? '✂ 학습지 PDF 에서 자름' : '⚠ 자르지 못함 — 그림을 직접 골라 주세요'}</small>
        {#if cut[pick] && !own[pick]}<span class="adj"><button type="button" data-k="top-up" onclick={() => adjust(pick, 'top', 1)}>위 늘리기</button><button type="button" onclick={() => adjust(pick, 'top', -1)}>위 줄이기</button><button type="button" data-k="bot-up" onclick={() => adjust(pick, 'bottom', 1)}>아래 늘리기</button><button type="button" onclick={() => adjust(pick, 'bottom', -1)}>아래 줄이기</button></span>{/if}
        <label class="ownpick"><input type="file" accept="image/png,image/webp,image/jpeg" onchange={(e) => pickOwn(pick, e)} />그림 직접 고르기</label>
        <div class="img" data-k="fillimg">{#if urlOf(pick)}<img src={urlOf(pick)} alt="학습지 칸 {pick}" />{:else}<p class="no">그림 없음</p>{/if}</div>
      </div>{/if}
    {/if}
    {#if saved}<p class="ok" role="status">{saved}</p>{/if}{#if failed}<p class="fail" role="alert">{failed}</p>{/if}
  </div>
</Sheet>

<style>
  .pf { display: flex; flex-direction: column; gap: 10px; }
  .file { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 12px; border: 1.5px dashed var(--line); border-radius: var(--r); cursor: pointer; }
  .file input, .ownpick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .file span { font-weight: 700; } .file small { color: var(--text-2); font-size: 13px; }
  .note { margin: 0; font: 600 13px var(--font); color: var(--text-2); }
  .chips2 { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
  .chips2 button { flex: none; min-height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
  .chips2 button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); } .chips2 button.none { border-style: dashed; }
  .cell { display: flex; flex-direction: column; gap: 8px; } .cell small { color: var(--text-2); font-size: 13px; }
  .adj { display: flex; flex-wrap: wrap; gap: 6px; }
  .adj button, .ownpick { min-height: 40px; padding: 0 10px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); display: inline-flex; align-items: center; position: relative; align-self: flex-start; }
  .img { border-radius: var(--r-sm); overflow: hidden; background: #fff; } .img img { display: block; width: 100%; height: auto; } .no { margin: 0; color: var(--text-3); font-size: 13px; }
  .ok { margin: 0; color: var(--ok); font-weight: 700; } .fail { margin: 0; color: var(--bad); font-weight: 700; }
</style>
