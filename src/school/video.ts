// 🎬 영상 주소 (📜 2026-11-14 선생님 「전부 진행해」 · DECISIONS 「🖼🎬 베타 차시 그림 · 영상 채우기」)
//   'video/…mp4' · 'https://…' = 그대로 (앱에 든 영상 · 정식 사이트 영상)
//   'rtdb:prep/{차시}/vid/{이름}' = 차시 팩 zip 안 .mp4 를 서버(Realtime Database)에 쪼개 넣은 것 → 받아서 이 기기 Blob 주소로 재생
//   왜 RTDB: 시험 서버는 무료 요금(Storage 버킷은 요금제 · 버킷 설정이 따로 필요) · 영상은 교사 폰 · TV 에서만 받음(학생 폰 X)
import type { Store } from '../model/types';

export const RTDB = 'rtdb:';
const RAW = 750_000; // 쪼갬 1개 = 75만 바이트 → base64 100만 글자 (3의 배수라 쪼갬마다 따로 풀림)
/** 서버 칸 이름에 못 쓰는 글자(. # $ [ ] /) → _ */
export const vidKey = (name: string) => name.replace(/^.*\//, '').replace(/\.mp4$/i, '').replace(/[.#$[\]/\s]/g, '_') || 'video';
export const vidPath = (id: string, name: string) => `prep/${id}/vid/${vidKey(name)}`;
export const isRtdb = (u: string | undefined | null) => !!u && u.startsWith(RTDB);

export interface VidDoc { type: string; size: number; n: number; c: Record<string, string> | string[] }
/** 바이트 → 서버에 넣을 꼴 (쪼갬마다 base64) */
export function vidDoc(bytes: Uint8Array): VidDoc {
  const c: string[] = [];
  for (let i = 0; i < bytes.length; i += RAW) {
    const part = bytes.subarray(i, i + RAW); let s = '';
    for (let k = 0; k < part.length; k += 0x8000) s += String.fromCharCode(...part.subarray(k, k + 0x8000));
    c.push(btoa(s));
  }
  return { type: 'video/mp4', size: bytes.length, n: c.length, c };
}
export function vidBytes(d: VidDoc): Uint8Array {
  const parts = Array.from({ length: d.n }, (_, i) => { const s = atob(String((d.c as Record<string, string>)[i] ?? '')); const b = new Uint8Array(s.length); for (let k = 0; k < s.length; k++) b[k] = s.charCodeAt(k); return b; });
  const out = new Uint8Array(parts.reduce((a, b) => a + b.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
/** 서버에 넣기 (쪼갬 하나씩 · 마지막에 머리 칸 = 다 들어갔다는 표시) */
export async function putVid(put: (p: string, x: unknown) => Promise<boolean>, path: string, bytes: Uint8Array): Promise<boolean> {
  const d = vidDoc(bytes), c = d.c as string[];
  for (let i = 0; i < c.length; i++) if (!(await put(`${path}/c/${i}`, c[i]))) return false;
  return (await put(`${path}/type`, d.type)) && (await put(`${path}/size`, d.size)) && (await put(`${path}/n`, d.n));
}

const memo = new Map<string, Promise<string | null>>();
/** 재생 주소 = 보통 주소는 그대로 · rtdb: = 받아서 Blob 주소 (한 번 받으면 이 탭에서 기억) */
export function videoSrc(S: Pick<Store, 'get'> & { fetch?: Store['fetch'] }, url: string | null | undefined): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  if (!isRtdb(url)) return Promise.resolve(url);
  let v = memo.get(url);
  if (!v) {
    const p = url.slice(RTDB.length);
    v = (S.fetch ? S.fetch<VidDoc>(p) : Promise.resolve(S.get<VidDoc>(p))).then((d) => (d && d.n ? URL.createObjectURL(new Blob([vidBytes(d) as Uint8Array<ArrayBuffer>], { type: d.type || 'video/mp4' })) : null)).catch(() => null);
    memo.set(url, v);
    void v.then((x) => { if (!x) memo.delete(url); });
  }
  return v;
}

/** zip 안 .mp4 → 칸: ① 팩 video 칸의 파일 이름과 끝맞춤(…_v11-49.mp4 → v11-49 의 at 칸들) ② 아니면 이름 끝 = 단계 칸(…_c1.mp4 → c1) */
export function matchVideos(names: string[], files: { file: string; at: string[] }[], cells: string[]): { map: Record<string, string>; unused: string[] } {
  const base = (n: string) => n.replace(/^.*\//, '').replace(/\.mp4$/i, '');
  const ends = (b: string, x: string) => b === x || (b.length > x.length && b.endsWith(x) && /[^0-9A-Za-z]/.test(b[b.length - x.length - 1]!));
  const map: Record<string, string> = {}, used = new Set<string>();
  for (const f of [...files].sort((a, b) => b.file.length - a.file.length)) {
    const n = names.find((x) => !used.has(x) && base(x) === f.file) ?? names.find((x) => !used.has(x) && ends(base(x), f.file));
    if (n) { used.add(n); for (const a of f.at) map[a] = n; }
  }
  for (const c of [...cells].sort((a, b) => b.length - a.length)) {
    if (map[c]) continue;
    const n = names.find((x) => !used.has(x) && base(x) === c) ?? names.find((x) => !used.has(x) && ends(base(x), c));
    if (n) { used.add(n); map[c] = n; }
  }
  return { map, unused: names.filter((x) => !used.has(x)) };
}
