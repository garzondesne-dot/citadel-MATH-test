import { findMarks, homography, NAME_BAND } from './quest';
// ✏ #75 출제 사진: 고른 사진 → 모서리 표시 4개 → 반듯하게 편 뒷면(가로 1000 · 세로 1430 = 표시 사이 202 × 289 mm) → 맨 위 이름 띠 흰색 → JPEG
//   사진은 이 폰에서만 다루고 보낸 뒤 버림 (어디에도 저장 ✗) · 표시를 못 찾으면 보내지 않음(이름이 찍힌 채 나가지 않게)
export const OUT_W = 1000, OUT_H = 1430, Q_QUAL = 0.82;
export async function openImage(f: File): Promise<HTMLImageElement> {
  return new Promise((ok, no) => { const u = URL.createObjectURL(f), x = new Image(); x.onload = () => { URL.revokeObjectURL(u); ok(x); }; x.onerror = () => { URL.revokeObjectURL(u); no(new Error('사진을 열지 못했어요')); }; x.src = u; });
}
/** 반듯하게 편 캔버스 · 못 찾으면 null */
export function rectify(img: HTMLImageElement | HTMLCanvasElement, rot = 0): HTMLCanvasElement | null {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width, ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const s = Math.min(1, 1600 / Math.max(iw, ih)), w0 = Math.round(iw * s), h0 = Math.round(ih * s), q = rot % 2 === 1;
  const src = document.createElement('canvas'); src.width = q ? h0 : w0; src.height = q ? w0 : h0;
  const g = src.getContext('2d', { willReadFrequently: true })!; g.translate(src.width / 2, src.height / 2); g.rotate((rot * Math.PI) / 2); g.drawImage(img, -w0 / 2, -h0 / 2, w0, h0); g.setTransform(1, 0, 0, 1, 0, 0);
  const W = src.width, H = src.height, d = g.getImageData(0, 0, W, H).data, gray = new Uint8ClampedArray(W * H);
  for (let i = 0; i < W * H; i++) gray[i] = (d[i * 4]! * 299 + d[i * 4 + 1]! * 587 + d[i * 4 + 2]! * 114) / 1000;
  const m = findMarks(gray, W, H); if (!m) return null;
  const map = homography(m, OUT_W, OUT_H), out = document.createElement('canvas'); out.width = OUT_W; out.height = OUT_H;
  const og = out.getContext('2d')!, od = og.createImageData(OUT_W, OUT_H), o = od.data;
  for (let y = 0; y < OUT_H; y++) for (let x = 0; x < OUT_W; x++) {
    const [sx, sy] = map(x + 0.5, y + 0.5), ix = Math.min(W - 1, Math.max(0, Math.round(sx))), iy = Math.min(H - 1, Math.max(0, Math.round(sy))), si = (iy * W + ix) * 4, di = (y * OUT_W + x) * 4;
    o[di] = d[si]!; o[di + 1] = d[si + 1]!; o[di + 2] = d[si + 2]!; o[di + 3] = 255;
  }
  og.putImageData(od, 0, 0);
  og.fillStyle = '#fff'; og.fillRect(0, 0, OUT_W, Math.round(OUT_H * NAME_BAND)); // 🙈 이름 띠 가림
  og.fillStyle = '#9aa0a6'; og.font = '600 22px system-ui'; og.fillText('(이름 칸 가림)', 24, Math.round(OUT_H * NAME_BAND) - 14);
  return out;
}
export const jpegOf = (c: HTMLCanvasElement) => c.toDataURL('image/jpeg', Q_QUAL).split(',')[1]!;
