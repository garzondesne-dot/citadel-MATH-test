// 📦 #136 엔진 = 과목을 모름: src/subjects 밖(엔진 · 화면 · 학교 · 모델 · 저장)에 과목 낱말 · 차시 id 가 없음 (주석 포함)
//   과목 내용은 src/subjects/<과목>/ 에만 · 엔진은 engine/subject.ts 의 SUBJ 한 입구로만 읽음
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const BAN = ['집합', '명제', '드모르간', '원소', '공통수학', '진리', '대우', '필요조건', '충분조건', '중단원', '단원 평가', '벤 다이어그램', '10공수', '연성 54'];
const ID = /set-?\d\d|set\d\d|common-math2/;
const ALLOW: string[] = []; // 예외 없음 (#140: 스킬 이름도 과목 팩이 정함)
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk('src').filter((f) => !f.startsWith(path.join('src', 'subjects')) && /\.(ts|svelte|json|css)$/.test(f));

describe('엔진 폴더 = 과목 낱말 · 차시 id 없음 (#136)', () => {
  it(`검사한 파일 ${files.length}개`, () => expect(files.length).toBeGreaterThan(40));
  it('과목 낱말 0', () => {
    const hits = files.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').flatMap((l, i) => BAN.filter((w) => l.includes(w) && !ALLOW.some((a) => l.includes(a))).map((w) => `${f}:${i + 1} 「${w}」`)));
    expect(hits).toEqual([]);
  });
  it('차시 id · 과목 id 0 (과목 이름은 subjects/active.ts 한 줄만)', () => {
    const hits = files.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').map((l, i) => (ID.test(l) ? `${f}:${i + 1}` : '')).filter(Boolean));
    expect(hits).toEqual([]);
  });
  it('과목 폴더는 엔진 입구로만 읽힘 (엔진 코드가 subjects/<과목> 을 직접 import 하지 않음)', () => {
    const hits = files.filter((f) => /from ['"][./]*subjects\/(?!active)/.test(fs.readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
it('칭호 목록 = 분리 전과 같은 순서 (엔진 칭호 + 과목 칭호를 같은 자리에 끼움)', async () => {
  const { TITLES } = await import('../src/model/hero');
  expect(TITLES.map((t) => t.id)).toEqual(["none", "dawn", "first", "slayer", "smith", "collector", "magic", "rare", "grit", "sage", "king", "detective", "sovereign", "gambler", "nunchi", "oxsurv", "steady", "quester", "writer", "hunter", "wall", "awake", "slash10k", "lv1", "lv2", "lv3", "lv4", "lv5", "lv6", "lv7", "lv8", "lv9", "lv10"]);
});
it('스킬 이름 = 과목 팩이 정함 (엔진 기본 「📐 도형」 · 공통수학2 = 「📐 벤 다이어그램」 · #140)', async () => {
  const { SKILL_NAMES } = await import('../src/model/hero');
  expect(SKILL_NAMES.venn).toBe('📐 벤 다이어그램');
  expect(JSON.parse(fs.readFileSync('src/model/hero-data.json', 'utf8')).fx.venn.name).toBe('📐 도형');
});
