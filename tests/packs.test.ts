// 🧩 #132 차시 팩 (정식에서 옮김) — ① 정식 독립 검산 시험 원문 통과 ② v1.0 엔진이 만든 문항 = 정식 출력(첫 판 · 다시 도전 판 · 형성평가) 글자까지 같음
//   ③ 팩 확인(생성기 등록 · 단계 · 그림 · 분) — 기준값 = tests/fixtures/packs (tools/pack-from-release 가 정식 코드로 만듦)
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { PACKS, packOf } from '../src/packs';
import { bossItem, items, validate } from '../src/engine/lessons';
import { SHEETS, DUNGEONS } from '../src/ui/manifest';

const OFFICIAL_TEST: Record<string, string> = { 'set-02': 'lesson2.test.js', 'set-03': 'lesson.test.js', 'set-04': 'lesson4.test.js', 'set-05': 'lesson5.test.js' };
const SEEDS = ['A1|s1_3_1', 'B2|s1_3_7', 'C3|s1_5_12'], VARS = [0, 1, 2, 3, 5, 9];

describe.each(Object.keys(OFFICIAL_TEST))('%s 차시 팩', (id) => {
  const L = packOf(id)!;
  const fix = JSON.parse(fs.readFileSync(`tests/fixtures/packs/${id}.json`, 'utf8'));
  it('정식 독립 검산 시험(원문) 통과', () => {
    const out = execFileSync('node', [`tests/official/tests/${OFFICIAL_TEST[id]}`], { encoding: 'utf8' });
    expect(out.trim().split('\n').pop()).toMatch(/^OK/);
  }, 60000);
  it('엔진 문항 = 정식 출력 (몬스터 · 시드 3 × 판 0 · 1 · 2 · 3 · 5 · 9)', () => {
    for (const [mid, bySeed] of Object.entries(fix.monsters as Record<string, unknown[][]>))
      SEEDS.forEach((sd, k) => VARS.forEach((v, j) => expect(JSON.parse(JSON.stringify(items(L, mid, sd, v))), `${mid} ${sd} 판 ${v}`).toEqual(bySeed[k]![j])));
  });
  it('형성평가 = 정식 (시도 0 = 학습지 세트 1 · 시도 1 ~ 3 = 정식 make)', () => {
    const n = L.boss!.items;
    for (let i = 0; i < n; i++) expect(JSON.parse(JSON.stringify(bossItem(L, 'x', i, 0)))).toEqual(fix.boss.first[i]);
    SEEDS.forEach((sd, k) => { for (let i = 0; i < n; i++) [1, 2, 3].forEach((a, j) => expect(JSON.parse(JSON.stringify(bossItem(L, sd, i, a))), `보스 ${i} 시도 ${a}`).toEqual(fix.boss.retry[k][i][j])); });
  });
  it('팩 확인 · 그림 · 배경 · 분 · 출처', () => {
    expect(validate(L)).toEqual([]);
    for (const m of [...Object.values(L.monsters), L.boss!]) expect(SHEETS[m.sprite.split(':')[0]!], m.sprite).toBeTruthy();
    expect(DUNGEONS[L.theme!]).toBeTruthy();
    expect(fs.existsSync(`public/${DUNGEONS[L.theme!]}`)).toBe(true);
    expect(L.steps.every((s) => (s.min ?? 0) > 0)).toBe(true);
    expect(L.source?.commit).toBeTruthy();
  });
});
it('차시 팩 목록 = 차시 번호 순 · id 겹침 없음', () => {
  expect(PACKS.map((p) => p.no)).toEqual([...PACKS.map((p) => p.no)].sort((a, b) => a - b));
  expect(new Set(PACKS.map((p) => p.id)).size).toBe(PACKS.length);
});
