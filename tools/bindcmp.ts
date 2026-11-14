// ⛓ 베타 bindFor 를 저장한 방 기록으로 계산 (정식 비교용 · npx vite-node tools/bindcmp.ts <snaps.json> <차시id>)
import fs from 'node:fs';
import { analyze, bindFor } from '../src/raid/combo';
import { SUBJ } from '../src/engine/subject';
const [SN, id] = process.argv.slice(2);
const L = SUBJ.lessons.find((p) => p.id === id)!;
const snaps = JSON.parse(fs.readFileSync(SN!, 'utf8')) as { mid: string; now: number; R: never }[];
console.log(JSON.stringify(snaps.map(({ mid, now, R }) => { const an = analyze(L, R, now), bs = an.binds.filter((b) => b.m === mid && b.at <= now); return [bindFor(L, R, mid, now, an), bs.length, bs.reduce((a, b) => a + b.sec, 0), [...new Set(bs.map((b) => b.why))].sort().join('+'), an.cur]; })));
