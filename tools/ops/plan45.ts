// 🧾 운영 쓰기 3개 미리 보기 (쓰기 0) — 📜 선생님이 손발 방에서 직접 허락한 뒤에만 apply45.mjs --go
//   ⓐ 📜 되살리기 A = 사진 통과(AI 통과 · 선생님 ✔)인데 서술 조각 선물(gifts/{uid}/ult_{차시}_{몬스터})이 없는 칸 → 선물 칸 만들기(📜 1 · 캠프에서 받음)
//   ⓑ 1-3반 11/16 9차시 수업 기록 되채우기 = 그 수업 방 사본 → 수업 닫기와 같은 함수(classRecords) → 줄이 없는 학생 줄만 (있는 줄은 안 건드림)
//   ⓒ #45 업데이트 사과 선물 = 1-1 ~ 1-5 명단 전원 gifts/{uid}/sorry_b216 = 📜 2 (이미 있으면 건너뜀)
//   사용: npx vite-node tools/ops/plan45.ts -- <읽어 온 파일 폴더> <plan.json>
//   폴더 = photo.json · gifts.json · roster.json · room685935.json · rec13.json (운영 읽기 사본 · 학생 기록 = 저장소 밖)
//   출력 = 표(반별 칸 수 · 이름 없음) + plan.json [{ g, path, value }] · 학생 이름 · 열쇠는 찍지 않음
import { readFileSync, writeFileSync } from 'node:fs';
import { packOf } from '../../src/engine/packs';
import { classRecords } from '../../src/school/records';
import type { Room } from '../../src/model/types';

const [dir, out] = process.argv.slice(2).filter((a) => a !== '--');
const rd = (f: string) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
type O = Record<string, any>;
const items = (x: any): [string, any][] => (Array.isArray(x) ? x.map((v, i) => [String(i), v] as [string, any]).filter(([, v]) => v) : Object.entries(x || {}));
const uidOf = (c: string, n: string | number) => `s${c.replace('-', '_')}_${n}`;
const plan: { g: string; path: string; value: unknown }[] = [];
const AT = Date.now();

// ⓐ
const V1 = Date.UTC(2026, 10, 14, 15, 0); // 11/15 00:00 KST = v1.0 정식 (그 전 사진 통과는 옛 정식 지갑으로 받음)
const P = rd('photo.json') || {}, G: O = rd('gifts.json') || {};
const ultRows: [string, string, string, string][] = [];
for (const [c, L] of items(P)) for (const [n, M] of items(L)) for (const [lm, E] of Object.entries(M || {})) {
  if (lm.startsWith('eval')) continue; // 🏰 성채 = 서술 조각 선물 아님
  const ps = Object.values(E || {}).filter((e: any) => e && (e.status === 'pass' || e.ok === true)) as O[];
  if (!ps.length || Math.min(...ps.map((e) => Number(e.at) || 0)) < V1) continue;
  const u = uidOf(c, n), k = `ult_${lm}`;
  if (G[u]?.[k]) continue;
  ultRows.push([c, n, lm, ps.some((e) => e.ok === true && e.status !== 'pass') ? '선생님 ✔' : 'AI 통과']);
  plan.push({ g: 'ⓐ', path: `gifts/${u}/${k}`, value: { at: AT, fun: '🌟 진필살기 서술', g: 0, s: 1 } });
}

// ⓑ
const room = rd('room685935.json') as Room, rec13 = rd('rec13.json') || {};
const L = packOf(room.meta.lesson)!;
const mem: O = {}, S = { get: <T>(p: string) => (mem[p] ?? null) as T | null, set: (p: string, v: unknown) => { mem[p] = v; }, now: () => Number(room.meta.created) || AT };
for (const [n, row] of items(rec13)) if (row?.[L.id]) mem[`records/1-3/${n}/${L.id}`] = row[L.id];
const had = new Set(items(rec13).filter(([, row]) => row?.[L.id]).map(([n]) => n));
await classRecords(S, L, room, '685935');
const recRows: string[] = [];
for (const [p, v] of Object.entries(mem)) { const n = p.split('/')[2]!; if (had.has(n)) continue; recRows.push(n); plan.push({ g: 'ⓑ', path: p, value: v }); }

// ⓒ
const roster = rd('roster.json') || {}, sorry: Record<string, number> = {};
for (const c of ['1-1', '1-2', '1-3', '1-4', '1-5']) for (const [n] of items(roster[c])) {
  const u = uidOf(c, n); if (G[u]?.sorry_b216) continue;
  sorry[c] = (sorry[c] || 0) + 1; plan.push({ g: 'ⓒ', path: `gifts/${u}/sorry_b216`, value: { at: AT, fun: '🎁 업데이트 사과 선물', g: 0, s: 2 } });
}

writeFileSync(out!, JSON.stringify(plan));
console.log(`ⓐ 📜 되살리기 = ${ultRows.length}칸`); for (const r of ultRows) console.log(`   ${r[0]}-${r[1]} · ${r[2]} · ${r[3]}`);
const done = recRows.filter((n) => (mem[`records/1-3/${n}/${L.id}`] as O)?.boss != null).length;
console.log(`ⓑ 1-3반 ${L.no}차시 수업 기록 = 새 줄 ${recRows.length} (있던 줄 ${had.size} 그대로) · 형성평가 칸 있는 줄 ${done}`);
console.log(`ⓒ 사과 선물 📜 2 = ${Object.entries(sorry).map(([c, k]) => `${c} ${k}명`).join(' · ')} · 합 ${Object.values(sorry).reduce((a, b) => a + b, 0)}칸`);
console.log(`합계 쓸 칸 ${plan.length} · plan 저장`);
