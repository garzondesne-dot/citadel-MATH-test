// 📊 대시보드 보기 11개를 서버 사본(JSON)으로 계산해 그대로 뽑기 (읽기 사본만 · 쓰기 0) — 미래교육상 익명 표 (#55)
//   사용: npx vite-node tools/ops/dashdump.ts -- <사본.json> <출력.json> · 학생 이름 · 번호는 출력 파일에만(저장소 밖) → 익명화는 파이썬 쪽
import { readFileSync, writeFileSync } from 'node:fs';
import { memoryStore } from '../../src/store/device';
import { ALL, ALL_VIEWS, view } from '../../src/school/views';
import { loadCache } from '../../src/school/survey';
const [src, out] = process.argv.slice(2).filter((a) => a !== '--');
const snap = JSON.parse(readFileSync(src!, 'utf8')) as Record<string, unknown>;
const S = { ...memoryStore(), kind: 'server' as const }; /* 서버 사본 = 실제 기록 (memory 면 가짜 시연 판) */ for (const [k, v] of Object.entries(snap)) S.set(k, v);
const CL = ['1-1', '1-2', '1-3', '1-4', '1-5'], res: Record<string, unknown> = {};
await loadCache(S, CL); // 📝 설문 답 = 미리 받아 둠 (대시보드도 엑셀 전에 받음 · #55)
for (const c of [ALL, ...CL]) for (const id of ALL_VIEWS) {
  if (id === 'cmp' && c !== ALL) continue;
  try { const v = view(S, c, id, false); res[`${c}|${id}`] = { ...v, table: v.table && { head: v.table.head, rows: v.table.rows.map((r) => ({ cells: r.cells.map((x) => (x.v !== undefined && x.v !== null && typeof x.v === 'object' ? { t: x.t, v: x.v } : { t: x.t, v: x.v })), cls: r.cls ?? r.pick?.cls, n: r.pick?.n, sum: r.sum })) }, list: v.list?.map((x) => ({ ...x, cls: x.pick?.cls, n: x.pick?.n, pick: undefined })), boards: v.boards?.map((b) => ({ ...b, rows: b.rows.map((r) => ({ ...r, cls: r.pick?.cls, n: r.pick?.n, pick: undefined })) })), memos: undefined, csv: undefined }; }
  catch (e) { res[`${c}|${id}`] = { err: String(e) }; }
}
writeFileSync(out!, JSON.stringify(res));
console.log('보기', Object.keys(res).length, '오류', Object.values(res).filter((x) => (x as { err?: string }).err).length);
