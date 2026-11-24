// 🏰 성채 레이드 봇 맞춤 (📜 11/24 선생님 · DECISIONS 7968385 · 설계 castle-raid/DESIGN-v1 4 · 5절)
//   목표 = 보통 팀(봇 정답률 0.6 = 일반 게시판 70% 기준 봇) 승률 50% · 이긴 판 5.5 ~ 6분 · 도망 10분 · 층마다 RAID.floorHp 만 맞춤
//   실제 꼴 = 사람 1 ~ 4명(무작위 용사 lv1) + 빈자리 봇(botHeroes · 2막 실드 속성)으로 4명
//   npx vite-node tools/sim/atb-raid.ts -- [acc=0.6] [판=200]          (측정)
//   npx vite-node tools/sim/atb-raid.ts -- fit [acc=0.6] [판=160]      (층마다 floorHp 이분 탐색 · 목표 50%)
import { readFileSync } from 'node:fs';
import { HEROES } from '../../src/model/hero';
import { newBattle, type State } from '../../src/board/atb/engine';
import { newBot, simulate } from '../../src/board/atb/bots';
import { statsOf } from '../../src/board/atb/heroes';
import { RAID, RAID_BOSSES, crackMul } from '../../src/board/atb/tune';
import { raidPack } from '../../src/board/atb/raid';
import { checkCastle } from '../../src/school/castle';
import { botHeroes } from '../../src/board/atbLink';
import type { LessonPack } from '../../src/model/types';

const argv = process.argv.slice(2).filter((a) => a !== '--');
const fit = argv[0] === 'fit'; if (fit) argv.shift();
const acc = Number(argv[0] ?? 0.6), N = Number(argv[1] ?? 200);
const ids = HEROES.map((h) => h.id).filter((i) => i < 40);
const rng = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const packOf = (f: 1 | 2 | 3) => raidPack(checkCastle(readFileSync(`tools/pack-upload/castle/eval-${f}.json`, 'utf8'), { sheet: () => true }).pack!, f)!;

function one(L: LessonPack, f: 1 | 2 | 3, seed: number, a = acc, crack = 0): { win: boolean; t: number; act2: boolean } {
  const r = rng(seed * 7919 + f * 131), people = 1 + (seed % 4), pool = ids.slice(), humans: number[] = [];
  for (let i = 0; i < people; i++) humans.push(pool.splice(Math.floor(r() * pool.length), 1)[0]!);
  const party = [...humans, ...botHeroes(L.no, humans, pool, 4 - people)].map((h, i) => statsOf({ hero: h, lv: 1, enh: i < people ? 0 : 1, tier: 1 }));
  const S: State = newBattle({ boss: RAID_BOSSES[f], diff: 'normal', party, seed: seed * 31 + f, hpMul: crackMul(crack) });
  const bs = S.heroes.map((h) => { const b = newBot(L, h.id, 'normal', seed); b.acc = a; return b; });
  simulate(L, S, bs, { maxT: RAID.cap.end + 5 });
  return { win: !!S.end?.win, t: S.t, act2: (S.act ?? 0) >= 2 };
}
const rate = (L: LessonPack, f: 1 | 2 | 3, n: number, base = 1, a = acc, crack = 0) => { let w = 0, tw = 0, run = 0, a2 = 0; for (let s = base; s < base + n; s++) { const o = one(L, f, s, a, crack); if (o.win) { w++; tw += o.t; } if (!o.win && o.t >= RAID.cap.end) run++; if (o.act2) a2++; } return { p: w / n, min: w ? tw / w / 60 : 0, run: run / n, a2: a2 / n }; };

const rows = ['| 층 | floorHp | 4인 체력 | 보통(0.6) 승률 | 이긴 판(분) | 도망 | 2막까지 | 잘하는(0.8) | 못하는(0.5) | 🕯 균열 3 (0.5) |', '|---|---|---|---|---|---|---|---|---|---|'];
const fitted: Record<number, number> = {};
for (const f of [1, 2, 3] as const) {
  const L = packOf(f);
  if (fit) { let lo = 0.3, hi = 3; for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; RAID.floorHp[f] = m; if (rate(L, f, N, 1000).p > 0.5) lo = m; else hi = m; } RAID.floorHp[f] = +((lo + hi) / 2).toFixed(2); fitted[f] = RAID.floorHp[f]; }
  const m = rate(L, f, N, 5000), hi8 = rate(L, f, N, 7000, 0.8), lo5 = rate(L, f, N, 9000, 0.5), cr = rate(L, f, N, 11000, 0.5, 3);
  const hp4 = Math.round(newBattle({ boss: RAID_BOSSES[f], diff: 'normal', party: [1, 2, 3, 4].map((h) => statsOf({ hero: h, lv: 1, enh: 0, tier: 1 })) }).bossMax);
  rows.push(`| ${f} | ${RAID.floorHp[f]} | ${hp4} | ${Math.round(m.p * 100)}% | ${m.min.toFixed(1)} | ${Math.round(m.run * 100)}% | ${Math.round(m.a2 * 100)}% | ${Math.round(hi8.p * 100)}% | ${Math.round(lo5.p * 100)}% | ${Math.round(cr.p * 100)}% |`);
  console.error(rows[rows.length - 1]);
}
console.log(`정답률 ${acc} · ${N}판씩\n` + rows.join('\n'));
if (fit) console.log('FITTED ' + JSON.stringify(fitted));
