// 📋 게시판 「도전」 난이도 봇 측정 (📜 11/24 선생님 · DECISIONS 7968385 「지금 표 그대로」 = 정답률 80% 팀 도전 승률 70 ~ 85% · 일반 95% 위)
//   실제 꼴 = 사람 1 ~ 4명(무작위 용사 lv1) + 빈자리 봇(botHeroes)으로 4명 · 모두 「보통 학생」 봇(역할 = 용사 이름대로 · 역할 스킬 씀) · 정답률만 acc 로
//   npx vite-node tools/sim/atb-hard80.ts -- [acc=0.8] [판=200] [차시=all] [hard 4인 배율 JSON 덮어쓰기]
//   맞춤 모드: npx vite-node tools/sim/atb-hard80.ts -- fit 0.8 160  → 차시마다 hardHpByNo 4인 칸 이분 탐색(목표 77.5%)
import { PACKS } from '../../src/engine/packs';
import { HEROES } from '../../src/model/hero';
import { newBattle, type State } from '../../src/board/atb/engine';
import { newBot, simulate } from '../../src/board/atb/bots';
import { statsOf } from '../../src/board/atb/heroes';
import { bossOf, T, type Diff } from '../../src/board/atb/tune';
import { atbLessons, atbReady } from '../../src/board/atb/lessons';
import { botHeroes } from '../../src/board/atbLink';
import { bossArt } from '../../src/ui/board/atb/rdunBoss';
import type { LessonPack } from '../../src/model/types';

const argv = process.argv.slice(2).filter((a) => a !== '--');
const fit = argv[0] === 'fit'; if (fit) argv.shift();
const acc = Number(argv[0] ?? 0.8), N = Number(argv[1] ?? 200), only = argv[2] && argv[2] !== 'all' ? argv[2].split(',').map(Number) : null;
const Ls = atbLessons(PACKS, new Set()).filter(atbReady).filter((L) => !only || only.includes(L.no));
const ids = HEROES.map((h) => h.id).filter((i) => i < 40);
const rng = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

function one(L: LessonPack, diff: Diff, seed: number): { win: boolean; t: number } {
  const r = rng(seed * 7919 + L.no * 131 + (diff === 'hard' ? 17 : 3)), people = 1 + (seed % 4);
  const pool = ids.slice(); const humans: number[] = [];
  for (let i = 0; i < people; i++) humans.push(pool.splice(Math.floor(r() * pool.length), 1)[0]!);
  const bots = botHeroes(L.no, humans, pool, 4 - people);
  const party = [...humans, ...bots].map((h, i) => statsOf({ hero: h, lv: 1, enh: i < people ? 0 : 1, tier: 1 }));
  const S: State = newBattle({ boss: bossArt(bossOf(L.no), diff), diff, party, seed: seed * 31 + L.no });
  const bs = S.heroes.map((h) => { const b = newBot(L, h.id, 'normal', seed); b.acc = acc; return b; });
  simulate(L, S, bs, { maxT: 600 }); // 10분 상한 = 현자 강제 귀환 (= 실패)
  return { win: !!S.end?.win, t: S.t };
}
const rate = (L: LessonPack, diff: Diff, n: number, base = 1) => { let w = 0, tw = 0; for (let s = base; s < base + n; s++) { const o = one(L, diff, s); if (o.win) { w++; tw += o.t; } } return { p: w / n, min: w ? tw / w / 60 : 0 }; };

const rows: string[] = ['| 차시 | 일반 승률 | 일반 이긴 판(분) | 도전 4인 배율 | 도전 승률 | 도전 이긴 판(분) |', '|---|---|---|---|---|---|'];
const fitted: Record<number, number> = {};
for (const L of Ls) {
  const hh = T.hardHpByNo[L.no] ?? [1, 1, 1, 1];
  if (fit) { // 4인 칸 이분 탐색 (학생 판은 늘 4명)
    let lo = 0.3, hi = 3;
    for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; hh[3] = +m.toFixed(3); const { p } = rate(L, 'hard', N, 1000); if (p > 0.775) lo = m; else hi = m; }
    hh[3] = +((lo + hi) / 2).toFixed(2); T.hardHpByNo[L.no] = hh; fitted[L.no] = hh[3];
  }
  const nr = rate(L, 'normal', N, 5000), hr = rate(L, 'hard', N, 9000);
  rows.push(`| ${L.no} | ${Math.round(nr.p * 100)}% | ${nr.min.toFixed(1)} | ${hh[3]} | ${Math.round(hr.p * 100)}% | ${hr.min.toFixed(1)} |`);
  console.error(rows[rows.length - 1]);
}
console.log(`정답률 ${acc} · ${N}판씩\n` + rows.join('\n'));
if (fit) console.log('FITTED ' + JSON.stringify(fitted));
