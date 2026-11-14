// ✂ 학습지 PDF 쪽 그리기 · 글자 줄 · 자르기 (브라우저 · pdf.js 는 올리기 창에서 PDF 를 받을 때만 불러옴)
//   정식 prep.js fromPdf · cut 과 같은 기준: 쪽 가로 2400px 로 그림 · 자른 칸 = webp 0.85 · 가로 1280 까지(다른 칸 그림과 같은 꼴)
import { linesOf, type Ink, type Line, type Rect, type TextItem } from '../../school/pdfcrop';

const PAGE_W = 2400, MAX_PAGES = 6, OUT_W = 1280;
export interface PdfDoc { pages: HTMLCanvasElement[]; lines: Line[] }

export async function readPdf(bytes: Uint8Array): Promise<PdfDoc> {
  const lib = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  lib.GlobalWorkerOptions.workerSrc = worker;
  const doc = await lib.getDocument({ data: bytes.slice() }).promise;
  const pages: HTMLCanvasElement[] = [], text: { items: TextItem[]; w: number; h: number }[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
    const pg = await doc.getPage(i), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: PAGE_W / v1.width });
    const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: g, viewport: vp }).promise;
    pages.push(cv);
    const tc = await pg.getTextContent();
    text.push({ items: tc.items.filter((x): x is typeof x & TextItem => 'str' in x) as TextItem[], w: v1.width, h: v1.height });
  }
  return { pages, lines: linesOf(text) };
}
/** 틀 → 칸 그림 (여러 조각이면 위아래로 이어 붙임) */
export function cutRects(pages: HTMLCanvasElement[], rects: Rect[]): string {
  const parts = rects.map((r) => { const pg = pages[Math.min(pages.length, Math.max(1, r.p)) - 1]!; return { pg, sx: r.x * pg.width, sy: r.y * pg.height, sw: r.w * pg.width, sh: r.h * pg.height }; });
  const W = Math.max(...parts.map((q) => q.sw)), H = parts.reduce((a, q) => a + q.sh, 0), k = Math.min(1, OUT_W / W);
  const cv = document.createElement('canvas'); cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  let y = 0; for (const q of parts) { g.drawImage(q.pg, q.sx, q.sy, q.sw, q.sh, 0, y * k, q.sw * k, q.sh * k); y += q.sh; }
  const w = cv.toDataURL('image/webp', 0.85); return /^data:image\/webp/.test(w) ? w : cv.toDataURL('image/jpeg', 0.82);
}
/** 잉크 찾기: 그 쪽 · 그 단(양옆 1% 안쪽 · 가운데 점선 빼고)에서 [y0, y1] 안 마지막으로 어두운 줄 — 풀이 칸 · 상자 · 그림까지 자르려고 */
export function inkOf(pages: HTMLCanvasElement[]): Ink {
  return (p, x0, x1, y0, y1) => {
    const pg = pages[p - 1]; if (!pg || y1 <= y0) return null;
    const W = pg.width, H = pg.height, sx = Math.round((x0 + 0.012) * W), sw = Math.max(1, Math.round((x1 - x0 - 0.024) * W)), sy = Math.round(y0 * H), sh = Math.max(1, Math.round((y1 - y0) * H));
    const d = pg.getContext('2d')!.getImageData(sx, sy, sw, sh).data;
    for (let y = sh - 1; y >= 0; y--) { let dark = 0; for (let x = 0; x < sw; x += 3) { const i = (y * sw + x) * 4; if (d[i]! + d[i + 1]! + d[i + 2]! < 600) dark++; } if (dark >= 3) return (sy + y) / H; }
    return null;
  };
}
