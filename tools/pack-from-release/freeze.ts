// 🧊 정식 차시 팩(생성기 이름 · convert.mjs 결과) → 올릴 수 있는 팩(판 0 ~ 6 을 미리 씀 · pool) — official/set-11 · set-12.json 꼴
//   사용(작업 사본에서 convert.mjs --only set-NN 뒤): npx vite-node tools/pack-from-release/freeze.ts <set-NN.json> <out.json> <출처 글> '<videos JSON>' <칸,칸,…>
import fs from 'node:fs';
import { items, chainItems, bossItem } from '../../src/engine/lessons';
import type { LessonPack } from '../../src/model/types';
const [IN, OUT, src, vids, cells] = process.argv.slice(2);
const L = JSON.parse(fs.readFileSync(IN!, 'utf8')) as LessonPack & Record<string, unknown>;
const SEED = 'pack', N = 7; // 판 0 ~ 6 (11차시와 같음)
const P = JSON.parse(JSON.stringify(L)) as Record<string, any>;
for (const [mid, m] of Object.entries(P.monsters as Record<string, any>)) {
  const first = items(L, mid, SEED, 0), pool = Array.from({ length: N - 1 }, (_, k) => items(L, mid, SEED, k + 1));
  m.first = first; m.retry = { pool };
  if (m.chain) m.chain = { pool: Array.from({ length: N - 1 }, (_, k) => chainItems(L, mid, SEED, k)) };
}
const b = P.boss; const n = b.items;
b.sets = { '1': Array.from({ length: n }, (_, i) => bossItem(L, SEED, i, 0)) };
b.pool = Array.from({ length: n }, (_, i) => Array.from({ length: N - 1 }, (_, a) => bossItem(L, SEED, i, a + 1)));
delete b.gen; delete b.params;
delete P.crops; delete P.parts;
P.source = { file: `lessons/${L.id}.js`, commit: src, board: null };
P.videos = JSON.parse(vids!); P.imgCells = cells!.split(',');
fs.writeFileSync(OUT!, JSON.stringify(P, null, 1));
console.log('ok', Object.keys(P.monsters), Object.entries(P.monsters).map(([k, m]: [string, any]) => `${k} first ${m.first.length} pool ${m.retry.pool.length}${m.chain ? ` chain ${m.chain.pool.length}` : ''}`).join(' · '), `boss ${n}×${N}`);
