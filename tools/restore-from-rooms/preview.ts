// ♻ 되살리기 미리 보기 (쓰기 0) — 정식 백업 rooms + 운영 records 사본(파일) → 바뀌는 칸 표 + 쓸 칸 목록(patch.json)
//   사용: npx vite-node tools/restore-from-rooms/preview.ts -- <정식 백업.json> <운영 records.json> <out 폴더>
//   (학생 기록이 든 파일 = 저장소 밖 · 실행 뒤 지움) · 실제 쓰기 = write.mjs (선생님 「되살리기 실행」 뒤)
import { readFileSync, writeFileSync } from 'node:fs';
import { fullLesson } from '../../src/school/statsCells';
import { normRoom, patchOf, roomCells, skipped, type Patch } from '../../src/school/restore';

const [backupF, recF, out] = process.argv.slice(2).filter((a) => a !== '--');
const B = JSON.parse(readFileSync(backupF!, 'utf8')), REC = JSON.parse(readFileSync(recF!, 'utf8')) || {};
type O = Record<string, any>;
const items = (x: any): [string, any][] => (Array.isArray(x) ? x.map((v, i) => [String(i), v] as [string, any]).filter(([, v]) => v) : Object.entries(x || {}));
const u2: Record<string, [string, string]> = {};
for (const [c, ns] of items(B.accounts)) for (const [n, a] of items(ns)) if (a?.uid) u2[a.uid] = [c, n];
const recOf = (c: string, n: string, lid: string): O | null => { const ns = REC[c]; const s = Array.isArray(ns) ? ns[Number(n)] : ns?.[n]; return s?.[lid] ?? null; };
// 학생 · 차시마다 방 칸 모으기 (방 순서 = 만든 때)
const found: Record<string, { mons: O; bossM?: string }[]> = {};
const rooms = Object.entries(B.rooms || {}).map(([code, r]) => ({ code, r: r as O })).filter((x) => x.r?.meta?.lesson && x.r?.meta?.cls).sort((a, b) => (a.r.meta.created || 0) - (b.r.meta.created || 0));
for (const { r } of rooms) {
  const L = fullLesson(r.meta.lesson); if (!L) continue;
  const R = normRoom(r), uids = new Set<string>([...Object.values(r.subs || {}), ...Object.values(r.chain || {})].flatMap((m: any) => Object.keys(m || {})).concat(Object.keys(r.bossTry || {})));
  for (const u of uids) { const who = u2[u]; if (!who) continue; const k = `${who[0]}|${who[1]}|${r.meta.lesson}`; (found[k] ||= []).push(roomCells(L, R, u)); }
}
const patches: Patch[] = [], table: Record<string, { cells: number; studs: Set<string>; byCell: Record<string, number> }> = {};
for (const [k, f] of Object.entries(found)) {
  const [c, n, lid] = k.split('|') as [string, string, string], rec = recOf(c, n, lid); if (!rec) continue; // 학생 줄이 없으면 만들지 않음(수업 기록 없는 학생)
  const p = patchOf(rec, f, Number(rec.bossN) || undefined); if (!p) continue;
  patches.push({ path: `records/${c}/${n}/${lid}`, ...p });
  const t = (table[`${c} · ${lid}`] ||= { cells: 0, studs: new Set(), byCell: {} }); t.cells += p.cells.length; t.studs.add(n); for (const x of p.cells) t.byCell[x] = (t.byCell[x] || 0) + 1;
}
writeFileSync(`${out}/patch.json`, JSON.stringify(patches));
let sum = 0; for (const [k, t] of Object.entries(table).sort()) { sum += t.cells; console.log(`${k} · 칸 ${t.cells} · 학생 ${t.studs.size} · ${Object.entries(t.byCell).map(([c, v]) => `${c} ${v}`).join(' ')}`); }
console.log(`합계 칸 ${sum} · 학생 줄 ${patches.length} · 읽지 못해 건너뛴 칸 ${skipped} · patch.json 저장`);
