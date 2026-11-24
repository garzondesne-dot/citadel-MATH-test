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
  if (!isRtdb(url)) {
    // 🎬 앱 영상 이름(video/…) = 재생할 때 다시 찾음: 앱에 있으면 그대로 · 없으면 정식 사이트(꼬리 -v 최신) · 둘 다 없으면 null (🐞 2026-11-14 13차시)
    if (!/^video\//.test(url) || typeof fetch !== 'function') return Promise.resolve(url);
    let w = memo.get(url);
    if (!w) {
      const head = (u: string) => fetch(u, { method: 'HEAD' }).then((r) => r.ok && !/text\/html/.test(r.headers.get('content-type') || '')).catch(() => false);
      w = findVideo(url, '', head, async () => false).then((x) => x?.url ?? null).catch(() => null);
      memo.set(url, w); void w.then((x) => { if (!x) memo.delete(url); });
    }
    return w;
  }
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

// 🎬 앱 차시(정식 videos 가 코드에 든 차시)에도 영상 더하기 (📜 2026-11-14 「학습지 · 영상 한 번에 넣기」 zip) — 서버 prep/vids/{차시 id}/{칸} = 'rtdb:…' 를 앱 시작 때 덮어씀
export const VMAP = 'prep/vids';
export const vidRoot = (L: { id: string; imgOf?: string; partOf?: string }) => L.imgOf ?? L.partOf ?? L.id;
export function applyVids(packs: { id: string; videos?: Record<string, string> }[], map: Record<string, Record<string, string>> | null | undefined): void {
  for (const [id, m] of Object.entries(map || {})) { const p = packs.find((x) => x.id === id); if (p && m && typeof m === 'object') p.videos = { ...(p.videos ?? {}), ...m }; }
}
export async function loadVids(S: { get<T>(p: string): T | null; fetch?<T>(p: string): Promise<T | null> }, packs: { id: string; videos?: Record<string, string> }[]): Promise<void> {
  try { applyVids(packs, S.fetch ? await S.fetch<Record<string, Record<string, string>>>(VMAP) : S.get<Record<string, Record<string, string>>>(VMAP)); } catch (e) { console.warn('차시 영상 받기 실패', e); }
}

// 📚 영상 서고 (📜 2026-11-14 선생님 「이름만 적기로 진행해」 · 제미나이는 mp4 를 zip 에 못 넣음): 팩 video 칸 이름 → ① 베타 앱 video/ ② 정식 사이트 assets/video/(꼬리 -v2 · -v3 … 최신) ③ 서버에 올린 영상 prep/{팩}/vid
export const OFFICIAL_VIDEO = 'https://garzondesne-dot.github.io/Citadel-MATH/assets/video/';
export async function findVideo(name: string, packId: string, head: (url: string) => Promise<boolean>, srv: (path: string) => Promise<boolean>): Promise<{ url: string; from: 'app' | 'official' | 'server' } | null> {
  const base = name.replace(/^.*\//, '').replace(/\.mp4$/i, ''), stem = base.replace(/-v\d+$/, '');
  if (await head(`video/${base}.mp4`)) return { url: `video/${base}.mp4`, from: 'app' };
  const tries = base !== stem ? [base] : [...[6, 5, 4, 3, 2].map((n) => `${stem}-v${n}`), stem];
  for (const t of tries) if (await head(`${OFFICIAL_VIDEO}${t}.mp4`)) return { url: `${OFFICIAL_VIDEO}${t}.mp4`, from: 'official' };
  const p = vidPath(packId, base); if (await srv(`${p}/n`)) return { url: RTDB + p, from: 'server' };
  return null;
}

// 🎬 덧영상 (📜 11/24 선생님 ❓ #6 A · DECISIONS 634af93): 한 칸에 영상 하나 더 = 「🎬 1 · 🎬 2」 단추 · 영상 파일은 앱 안 video/ · 옛 영상 · 서버 팩은 그대로
//   리모컨 · 종합실 · 학생 폰 · 허수아비 · 예습 · 영상 목록이 모두 이 함수로 (🪞 선생님 쪽 = 학생 쪽) · 둘째 영상 열쇠 = 「칸~2」
export const ADDON_VIDS: Record<string, Record<string, string>> = {
  'ex-12': { c1: 'video/v12-71.mp4' },
  'ex-14': { c1: 'video/v14-72.mp4', c2: 'video/v14-72.mp4', c3: 'video/v14-73.mp4' },
};
/** 🎨 차시 배경 덮기 (서버 팩은 그대로 · 📜 11/24 머리 🔨 f14-bg) — 팩 id → 던전 배경 열쇠(manifest DUNGEONS) · 팩 theme 이 아래 「옛 값」일 때만 바꿈(선생님이 새로 고른 theme 은 그대로) */
export const ADDON_THEME: Record<string, { from: string; to: string }> = { 'ex-14': { from: '04-mine', to: '14-chainmine' }, 'ex-15': { from: '12-skygarden', to: '15-ridge' }, 'ex-16': { from: '05-ruins', to: '16-twinworks' }, 'ex-17': { from: '06-frost', to: '17-mirror' } }; // 🎨 11/24 · 11/25 함수 던전 배경 f14 ~ f17 (코덱스 · 과목 팩 themes.json dungeons 에 있음 = 차시 팩에서 고를 수 있음)
export function applyAddon(packs: { id: string; addVids?: Record<string, string>; theme?: string }[]): void {
  for (const p of packs) { const m = ADDON_VIDS[p.id]; if (m) p.addVids = { ...m }; const t = ADDON_THEME[p.id]; if (t && (!p.theme || p.theme === t.from)) p.theme = t.to; }
}
type VL = { videos?: Record<string, string>; addVids?: Record<string, string> };
/** 열쇠(칸 · 칸~2) → 영상 주소 */
export function vidOf(L: VL | null | undefined, key: string | null | undefined): string | null {
  if (!L || !key) return null;
  const m = /^(.+)~2$/.exec(key);
  return (m ? L.addVids?.[m[1]!] : L.videos?.[key]) ?? null;
}
/** 한 칸의 영상들 = [{ key, label }] · 하나면 「🎬 영상」 · 둘이면 「🎬 1」 · 「🎬 2」 (원래 영상이 없고 덧영상만 있으면 하나) */
export function vidsAt(L: VL | null | undefined, cell: string | null | undefined): { key: string; n: number }[] {
  if (!L || !cell) return [];
  const a = [L.videos?.[cell] ? cell : null, L.addVids?.[cell] ? `${cell}~2` : null].filter((k): k is string => !!k);
  return a.length === 2 ? a.map((key, i) => ({ key, n: i + 1 })) : a.map((key) => ({ key, n: 0 }));
}
export const vidLabel = (n: number, one = '영상') => (n ? `🎬 ${n}` : `🎬 ${one}`);
/** 리모컨 · 종합실 🎬 자리 하나(2×5 자리표 그대로): 누를 때마다 끔 → 1 → 2 → 끔 · 영상 하나면 켬 ↔ 끔 */
export function vidNext(L: VL | null | undefined, cell: string | null | undefined, cur: string | null | undefined): string | null {
  const ks = vidsAt(L, cell).map((v) => v.key); if (!ks.length) return null;
  const i = cur ? ks.indexOf(cur) : -1; return cur && i < 0 ? null : ks[i + 1] ?? null;
}
/** 🎬 자리 글자: 하나 = 「영상」 · 둘이고 끔 = 「영상 2편」 · 켬 = 「1 / 2」 · 「2 / 2」 */
export function vidDockLabel(L: VL | null | undefined, cell: string | null | undefined, cur: string | null | undefined): string {
  const ks = vidsAt(L, cell).map((v) => v.key); if (ks.length < 2) return '영상';
  const i = cur ? ks.indexOf(cur) : -1; return i < 0 ? '영상 2편' : `${i + 1} / 2`;
}
