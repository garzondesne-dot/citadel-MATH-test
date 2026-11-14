// 📦 「이 차시 팩 내려받기 (zip)」 (📜 2026-11-14 선생님 「응 만들고 단추도 만들어」)
//   지금 상태 그대로 zip 하나 = 팩 JSON(엔진 꼴 · 생성기 이름 그대로 · 앱 차시는 id ex-NN) + 칸 그림(칸.webp) + 영상 mp4(서버 · 앱) + README.txt
//   이 zip 을 「📦 차시 팩 올리기」에 그대로 올리면 같은 팩(왕복) · 20MB 넘으면 큰 영상부터 빼고 한 줄
import type { LessonPack, Store } from '../model/types';
import { slotsOf } from './pdfcrop';
import { prepImg } from './prep';
import { isRtdb, vidBytes, type VidDoc } from './video';
import { ZIP_MAX } from './packUpload';

const nn = (n: number) => String(n).padStart(2, '0');
const ymd = (t: number) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${nn(d.getUTCMonth() + 1)}${nn(d.getUTCDate())}`; }; // 한국 날짜
export const exportName = (L: LessonPack, now: number) => `(${nn(L.no)}차시) 차시팩_${ymd(now)}.zip`;
const b64 = (u: string) => { const s = atob(u.slice(u.indexOf(',') + 1)); const b = new Uint8Array(s.length); for (let k = 0; k < s.length; k++) b[k] = s.charCodeAt(k); return b; };
const vname = (u: string) => (isRtdb(u) ? u.replace(/^.*\//, '') : u.replace(/^.*\//, '').replace(/\.mp4$/i, '')).replace(/[^\w.()가-힣-]/g, '_');

/** 팩 JSON (엔진 꼴): 앱 차시 = id ex-NN · 나눈 차시도 혼자 서는 팩 · 그림 칸 = 넣은 칸 · 영상 = zip 안 mp4 이름(video/{이름}.mp4) */
export function packJson(L: LessonPack, builtIn: boolean, imgCells: string[], vids: Record<string, string>): LessonPack {
  const p = JSON.parse(JSON.stringify(L)) as LessonPack & Record<string, unknown>;
  if (builtIn) p.id = `ex-${nn(L.no)}`;
  delete p.partOf; delete p.parts; delete p.imgOf; delete p.source; delete p.imgCells;
  if (imgCells.length) p.imgCells = imgCells;
  if (Object.keys(vids).length) p.videos = vids; else delete p.videos;
  return p;
}

export interface Exported { name: string; bytes: Uint8Array; imgs: number; vids: number; dropped: { n: number; mb: number }; note: string }
export async function exportPack(S: Store, L: LessonPack, builtIn: boolean, now: number, fetchBin: (url: string) => Promise<Uint8Array | null> = async (u) => { try { const r = await fetch(u); return r.ok ? new Uint8Array(await r.arrayBuffer()) : null; } catch { return null; } }): Promise<Exported> {
  const { zipSync, strToU8 } = await import('fflate');
  const files: Record<string, Uint8Array> = {};
  // 🖼 칸 그림
  const cells = [...new Set(slotsOf(L.steps.filter((s) => !s.later), L.boss?.title ?? '', L.find ?? {}).map((x) => x.id))], got: string[] = [];
  for (const c of cells) { const u = await prepImg(S, L, c); if (u) { files[`${c}.webp`] = b64(u); got.push(c); } }
  // 🎬 영상 (같은 파일 = 한 번)
  const byUrl: Record<string, string[]> = {}; for (const [c, u] of Object.entries(L.videos ?? {})) (byUrl[u] ??= []).push(c);
  const vids: { url: string; at: string[]; name: string; data: Uint8Array }[] = [], missing: string[] = [];
  for (const [u, at] of Object.entries(byUrl)) {
    let data: Uint8Array | null = null;
    if (isRtdb(u)) { const p = u.slice(5); const d = S.fetch ? await S.fetch<VidDoc>(p).catch(() => null) : S.get<VidDoc>(p); data = d && d.n ? vidBytes(d) : null; } else data = await fetchBin(u);
    if (data && data.length) vids.push({ url: u, at, name: vname(u), data }); else missing.push(u);
  }
  // 20MB: 큰 영상부터 뺌
  const base = Object.values(files).reduce((a, b) => a + b.length, 0) + 200_000;
  vids.sort((a, b) => a.data.length - b.data.length);
  let total = base + vids.reduce((a, v) => a + v.data.length, 0); const drop: typeof vids = [];
  while (total > ZIP_MAX && vids.length) { const v = vids.pop()!; drop.push(v); total -= v.data.length; }
  const vmap: Record<string, string> = {};
  for (const v of vids) { files[`${v.name}.mp4`] = v.data; for (const c of v.at) vmap[c] = `video/${v.name}.mp4`; }
  for (const v of [...drop, ...missing.map((url) => ({ url, at: byUrl[url]!, name: '', data: new Uint8Array() }))]) if (!isRtdb(v.url)) for (const c of v.at) vmap[c] = v.url; // 앱 · 정식 사이트 영상 = 주소 그대로 남김
  const P = packJson(L, builtIn, got, vmap);
  files[`${P.id}.json`] = strToU8(JSON.stringify(P, null, 1));
  const dmb = drop.reduce((a, v) => a + v.data.length, 0) / 1048576;
  const lines = [`${L.no}차시 ${L.title} · 차시 팩 ${P.id}.json + 칸 그림 ${got.length}장 + 영상 ${vids.length}편`, '학습지 PDF 는 들어 있지 않아요 — 칸을 다시 자르려면 레이드용 학습지 PDF 를 이 zip 에 넣어 「📦 차시 팩 올리기」로 올리세요.'];
  if (drop.length) lines.push(`20MB 를 넘어 영상 ${drop.length}편(${dmb.toFixed(1)}MB)을 뺐어요.`);
  files['README.txt'] = strToU8(lines.join('\n') + '\n');
  const bytes = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, /\.(mp4|webp)$/.test(k) ? [v, { level: 0 }] : v])) as never);
  const note = `📦 ${exportName(L, now)} · 칸 그림 ${got.length}장 · 영상 ${vids.length}편${drop.length ? ` · 영상 ${drop.length}편 뺐어요(${dmb.toFixed(1)}MB · 20MB 넘음)` : ''}${missing.length ? ` · 받지 못한 영상 ${missing.length}편(주소만 남김)` : ''} · ${(bytes.length / 1048576).toFixed(1)}MB`;
  return { name: exportName(L, now), bytes, imgs: got.length, vids: vids.length, dropped: { n: drop.length, mb: dmb }, note };
}
