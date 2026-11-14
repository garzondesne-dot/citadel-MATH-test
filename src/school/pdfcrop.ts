// ✂ 학습지 PDF → 칸 그림 자동 자르기 (📜 2026-11-14 선생님 「A로 진행해」 · DECISIONS 「✂ 차시 팩 zip 안의 학습지 PDF …」)
//   정식 js/raid/prep.js(v0.9.64 · f269f7a) 「수업 준비 PDF 자동 자르기 = 학습지 글자 찾기」 를 그대로 옮김 (같은 기준):
//   칸마다 ① 「몬스터 n」(n번째 문제 단계) ② 단계 제목 앞말(「문제 1」 · 「형성평가」 · 도입 = 「생각 열기」 · 개념 = 「STEP k」 순서) · 팩 칸 `find`(칸 → 찾을 글자)가 있으면 그것 먼저
//   자를 곳 = 찾은 줄 바로 위 ~ 같은 단 다음 칸 이름 줄 바로 위(없으면 글자 끝 + 여백) · 2단이면 그 단 폭 · 도입 가로 전체 칸(전시 확인 상자)
//   이 파일은 계산만 (글자 줄 → 칸 틀) · 쪽 그리기 · 자르기 = ui/teacher/PdfCrop.ts
import type { Step } from '../model/types';

/** 글자 줄 (0~1 · y = 줄 위끝) */
export interface Line { p: number; x0: number; x1: number; y: number; h: number; s: string }
/** 자를 틀 (0~1) */
export interface Rect { p: number; x: number; y: number; w: number; h: number }
export interface Slot { id: string; kind: Step['kind']; title: string; find?: string }

const ANCHOR = /^[^\p{L}\p{N}]*(몬스터\s*\d+|문제\s*\d+|STEP\s*\d+)|형성\s*평가|생각\s*열기/u; // 「문제 n」 등은 줄 맨 앞일 때만
/** 칸 끝 표시 (여기서 위까지만 · 칸 시작은 아님): 레이드용 학습지의 「✏ 풀이 · 메모」 칸 (형성평가 「맞은 개수」는 정식 칸 그림처럼 넣음) */
const END = /풀이\s*·\s*메모/;
const AT = (src: string) => new RegExp(`^[^\\p{L}\\p{N}]*${src}`, 'u');
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');

/** 팩 단계 → 자를 칸 (도입 img = 다른 칸 이름 · 정식 slotSteps) */
export function slotsOf(steps: Step[], bossTitle = '', find: Record<string, string> = {}): Slot[] {
  return steps.map((s) => { const id = s.img ?? s.id; return { id, kind: s.kind, title: s.kind === 'boss' ? s.title || bossTitle : s.title, ...(find[id] ? { find: find[id] } : {}) }; });
}
export function anchorsOf(slots: Slot[]): RegExp[][] {
  let mon = 0, con = 0;
  return slots.map((st) => {
    const t = String(st.title || ''), head = t.split(' · ')[0]!.trim(), out: RegExp[] = [];
    if (st.find) out.push(new RegExp(esc(st.find))); // 팩 칸 find = 선생님이 정한 찾을 글자 (먼저)
    if (st.kind === 'monster') { mon += 1; out.push(AT(`몬스터\\s*${mon}(?!\\d)`)); }
    if (st.kind === 'concept') con += 1;
    const m = /^(문제|STEP)\s*(\d+)/.exec(head);
    if (m) out.push(AT(`${m[1]}\\s*${m[2]}(?!\\d)`));
    if (st.kind === 'boss') out.push(/형성\s*평가/);
    // 도입 = 제목 뒷말(「🔁 전시 확인」 · 레이드용 학습지 표시)을 먼저 · 없으면 「생각 열기」 (베타 · 2026-11-14 11차시 실제 학습지로 다듬음: 전시 확인 칸이 따로 있으면 생각 열기는 개념 1 칸)
    { const tail = (t.split(' · ')[1] || '').replace(/[^\p{L}\p{N}\s]/gu, '').trim(); if (st.kind === 'intro' && tail.length >= 2) out.push(new RegExp(tail.replace(/\s+/g, '\\s*'))); }
    if (st.kind === 'intro') out.push(/생각\s*열기/);
    if (st.kind === 'concept' && con === 1) out.push(/생각\s*열기/); // 도입이 안 쓴 「생각 열기」 = 개념 1 칸의 시작 (같은 칸에 STEP 1 이 이어짐)
    if (st.kind === 'concept') out.push(AT(`STEP\\s*${con}(?!\\d)`));
    if (head && !/^(문제|STEP)\s*\d/.test(head) && head.length >= 2) out.push(new RegExp(`^\\s*${esc(head)}`));
    return out;
  });
}
/** 글자 줄 → 칸마다 틀 (못 찾으면 null) — 정식 autoRects 그대로 */
/** ink = 그 쪽 · 그 단에서 [y0, y1] 안 마지막 잉크 줄(0~1 · 없으면 null) — 글자 없는 그림 · 상자 · 풀이 칸까지 넣으려고 (쪽 그림이 있을 때만 · 베타 다듬음) */
export type Ink = (p: number, x0: number, x1: number, y0: number, y1: number) => number | null;
export function autoRects(lines: Line[], slots: Slot[], ink?: Ink): Record<string, Rect[] | null> {
  const sorted = lines.slice().sort((a, b) => a.p - b.p || a.y - b.y || a.x0 - b.x0);
  const twoPg = (pg: number) => sorted.filter((l) => l.p === pg && l.x0 > 0.5).length >= 3, twoDoc = [...new Set(sorted.map((l) => l.p))].some(twoPg); // 한 쪽이라도 2단이면 2단
  const used = new Set<Line>(), res: Record<string, Rect[] | null> = {}, hits: (Line | null)[] = [];
  const all = anchorsOf(slots);
  all.forEach((res0, i) => { let hit: Line | null = null; for (const re of res0) { hit = sorted.find((l) => !used.has(l) && re.test(l.s)) ?? null; if (hit) break; } if (hit) used.add(hit); hits[i] = hit; });
  const isEdge = (l: Line, st: Slot) => used.has(l) || (ANCHOR.test(l.s) && !(st.kind === 'concept' && /^[^\p{L}\p{N}]*STEP\s*\d/u.test(l.s)));
  hits.forEach((hit, i) => {
    const st = slots[i]!;
    if (!hit) { if (!(st.id in res)) res[st.id] = null; return; }
    const left = hit.x0 < 0.5, two = twoDoc && (left ? hit.x1 < 0.56 : true);
    const x0 = two ? (left ? 0.02 : 0.5) : 0.02, x1 = two ? (left ? 0.5 : 0.98) : 0.98;
    const inCol = (l: Line) => l.p === hit.p && (two ? (left ? l.x0 < 0.5 : l.x0 >= 0.48) : true);
    const own = all[i]!, nx = sorted.find((l) => inCol(l) && l !== hit && l.y > hit.y + 0.008 && (isEdge(l, st) || END.test(l.s)) && !(!used.has(l) && own.some((re) => re.test(l.s))) && !(st.kind === 'boss' && !used.has(l) && /문제\s*\d/.test(l.s)));
    const top = Math.max(0, hit.y - (ink ? 0.018 : 0.008)), lim = nx ? nx.y - 0.006 : 0.965, last = sorted.filter((l) => inCol(l) && l.y >= hit.y && l.y + l.h <= lim + 0.002).reduce((m, l) => Math.max(m, l.y + l.h), hit.y + hit.h);
    const inkLast = ink ? ink(hit.p, x0, x1, last, lim - 0.014) : null; // 글자 아래 그림 · 상자 · 풀이 칸 (다음 칸 머리띠 앞까지)
    const bot = Math.max(top + 0.04, Math.min(lim, Math.max(last, inkLast ?? 0) + 0.012));
    const lone = st.kind === 'intro' && two && left && sorted.some((l) => l.p === hit.p && l.y >= top && l.y < bot && ((l.x0 < 0.5 && l.x1 > 0.58) || (l.x0 >= 0.48 && l.x0 < 0.52 && Math.abs(l.y - hit.y) < Math.max(l.h, hit.h)))); // 칸 안 글줄이 가운데를 넘거나 · 머리줄이 오른쪽 반으로 이어지면 = 가로 전체 칸 (전시 확인 상자)
    const r = (x: number, w: number): Rect[] => [{ p: hit.p, x: +x.toFixed(4), y: +top.toFixed(4), w: +w.toFixed(4), h: +(Math.min(1, bot) - top).toFixed(4) }];
    res[st.id] = lone ? r(0.02, 0.96) : r(x0, x1 - x0);
  });
  return res;
}
/** pdf.js 글자 조각(쪽마다) → 줄 — 정식 textLines 그대로 */
export type TextItem = { str: string; transform: number[]; width?: number; height?: number };
export function linesOf(pages: { items: TextItem[]; w: number; h: number }[]): Line[] {
  const out: Line[] = [];
  pages.forEach((pg, k) => {
    const items = pg.items.filter((it) => it.str && it.str.trim()).map((it) => { const x = it.transform[4]!, y = it.transform[5]!, h = Math.abs(it.transform[3]!) || it.height || 10; return { x0: x / pg.w, x1: (x + (it.width || 0)) / pg.w, yb: 1 - y / pg.h, h: h / pg.h, s: it.str }; });
    items.sort((a, b) => a.yb - b.yb || a.x0 - b.x0);
    const rows: typeof items = [];
    items.forEach((it) => { const r = rows.find((q) => Math.abs(q.yb - it.yb) < Math.max(q.h, it.h) * 0.5 && it.x0 - q.x1 < 0.015 && it.x0 >= q.x0); if (r) { r.s += (it.x0 - r.x1 > 0.004 ? ' ' : '') + it.s; r.x1 = Math.max(r.x1, it.x1); r.h = Math.max(r.h, it.h); } else rows.push({ ...it }); });
    rows.forEach((r) => out.push({ p: k + 1, x0: r.x0, x1: r.x1, y: r.yb - r.h, h: r.h, s: r.s }));
  });
  return out;
}
/** 위 · 아래 늘리고 줄이기 (조정 단추 · 한 번 = 쪽 높이의 1.5%) */
export function nudge(rs: Rect[], edge: 'top' | 'bottom', d: number): Rect[] {
  const STEP = 0.015;
  return rs.map((r, i) => {
    if (edge === 'top' && i === 0) { const y = Math.max(0, Math.min(r.y + r.h - 0.02, r.y - d * STEP)); return { ...r, y: +y.toFixed(4), h: +(r.h + (r.y - y)).toFixed(4) }; }
    if (edge === 'bottom' && i === rs.length - 1) { const h = Math.max(0.02, Math.min(1 - r.y, r.h + d * STEP)); return { ...r, h: +h.toFixed(4) }; }
    return r;
  });
}
