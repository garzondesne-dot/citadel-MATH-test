// 📦 차시 팩 올리기 + 자동 검사기 (L1 · 2026-11-14 머리 🔨): 예시 팩 통과 · 일부러 틀린 팩 5개 = 칸 · 이유 · 풀 판 차시(엔진 꼴)도 같은 길 · 정답 재계산
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { checkMedia, checkUpload, spriteName } from '../src/school/packUpload';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { items, bossItem } from '../src/engine/lessons';
import type { Question } from '../src/model/types';

const DIR = 'tools/pack-upload/';
const look = {
  sheet: (r: string) => (r.split(':')[0]!.replace(/@.*$/, '') in SUBJ.themes.sheets),
  theme: (t: string) => !t || t in SUBJ.themes.dungeons,
  attack: (a: string) => a in ATTACKS,
  builtIn: (id: string) => SUBJ.lessons.some((p) => p.id === id),
};
const run = (f: string) => checkUpload(fs.readFileSync(DIR + f, 'utf8'), look);
const errs = (r: ReturnType<typeof run>) => r.issues.filter((x) => x.lvl === 'err');

describe('📦 차시 팩 올리기 검사기', () => {
  it('예시 팩 = 통과 · 버전 3 · 정답 재계산 모두 맞음 · 미리 보기 문항 = 학생과 같은 함수(items · bossItem)', () => {
    const r = run('example-ex-11.json');
    expect(errs(r)).toEqual([]);
    expect(r.stats).toMatchObject({ mons: 2, items: 5, versions: 8, ask: 2 });
    expect(r.stats.rechecked).toBe(11); // 문제 1 버전 0~2 × 2 + 문제 2 버전 0~2 × 1 + 형성평가 버전 0~1 × 1(n 식) = 11 · 선다 2 = 선생님 확인
    const P = r.pack!;
    expect(items(P, 'm1', 's', 0)[0]!.type).toBe('multi');
    expect((items(P, 'm1', 's', 1)[1] as Extract<Question, { type: 'number' }>).answer).toBe(25);
    expect((items(P, 'm1', 's', 2)[1] as Extract<Question, { type: 'number' }>).answer).toBe(20);
    expect((bossItem(P, 's', 0, 0) as Extract<Question, { type: 'choice' }>).answerIndex).toBe(1);
    expect((bossItem(P, 's', 1, 1) as Extract<Question, { type: 'number' }>).answer).toBe(9);
    expect(P.monsters.m1!.sprite).toBe('base2:0'); expect(P.boss!.sprite).toBe('extra4:0');
  });
  it('🖼 🎬 그림 · 영상 칸 (정식 11차시 칸 그림 · 영상 3편) · 없으면 ⚠ 한 줄 · 저장은 막지 않음', async () => {
    const P = run('example-ex-11.json').pack!;
    expect(P.imgOf).toBe('set-11'); expect(P.imgCells).toEqual(['review', 'c1', 'm1', 'c2', 'm2', 'sum', 'boss']);
    expect(P.steps[0]!.img).toBe('review');
    expect(P.videos).toEqual({ c1: 'video/v11-49.mp4', m1: 'video/v11-49.mp4', sum: 'video/v11-49.mp4', c2: 'video/v11-50.mp4', m2: 'video/v11-50.mp4', boss: 'video/v11-51.mp4' });
    for (const f of ['v11-49', 'v11-50', 'v11-51']) expect(fs.existsSync(`public/video/${f}.mp4`), f).toBe(true);
    const have = new Set(['prep/set-11/img/c1', 'prep/set-11/img/m1']);
    const xs = await checkMedia(P, async (p) => have.has(p), async (u) => u !== 'video/v11-51.mp4');
    expect(xs.map((x) => `${x.lvl} | ${x.at} | ${x.msg.split(' — ')[0]}`)).toEqual(['ask | 그림(img) review · c2 · m2 · sum · boss | 그림 없음', 'ask | 영상(video) v11-51.mp4 | 영상 없음']);
    const d = JSON.parse(fs.readFileSync(DIR + 'example-ex-11.json', 'utf8')); d.img.push('zz'); d.video.push({ file: 'v11-49', at: ['nope'] });
    const r2 = checkUpload(JSON.stringify(d), look); expect(errs(r2)).toEqual([]);
    expect(r2.issues.filter((x) => x.lvl === 'ask').map((x) => x.at)).toEqual(expect.arrayContaining(['그림(img) 「zz」', '영상(video) 「v11-49」 · 칸 「nope」']));
  });
  it('틀린 팩 1 · 양식 칸 빠짐 · 단계 종류', () => {
    const e = errs(run('bad-1-fields.json')).map((x) => `${x.at} | ${x.msg}`).join('\n');
    expect(e).toMatch(/제목\(title\) \| 칸이 비었어요/); expect(e).toMatch(/수업 흐름 3번 \| 종류 「monstr」/);
  });
  it('틀린 팩 2 · 보기 번호 범위', () => {
    expect(errs(run('bad-2-choice-range.json')).map((x) => `${x.at} | ${x.msg}`)).toContain('문제 1 · 버전 0 · 1번 | 정답 「9」 이 보기 번호 범위(0 ~ 5) 밖이에요');
  });
  it('틀린 팩 3 · 정답 재계산이 다름', () => {
    expect(errs(run('bad-3-recheck.json')).map((x) => `${x.at} | ${x.msg}`)).toContain('문제 1 · 버전 1 · 2번 | 정답 재계산이 달라요 — 다시 풀면 25');
  });
  it('틀린 팩 4 · 버전 0~6 줄 (8개 · 문항 수 다름)', () => {
    const e = errs(run('bad-4-versions.json')).map((x) => `${x.at} | ${x.msg}`);
    expect(e).toContain('문제 1 | 버전이 8개 — 버전 0 ~ 6 (7개까지)'); expect(e).toContain('문제 1 · 버전 2 | 문항 1개 — 버전 0 은 2개');
  });
  it('틀린 팩 5 · 도감 이름표 (그림 · 배경 · 공격 · 개념 칸)', () => {
    const e = errs(run('bad-5-dex.json')).map((x) => `${x.at} | ${x.msg}`).join('\n');
    expect(e).toMatch(/배경\(theme\) \| 던전 배경 「99-moon」/); expect(e).toMatch(/문제 1 · 그림\(sprite\) \| 몬스터 그림 「nope9:0」/);
    expect(e).toMatch(/공격 「laser」/); expect(e).toMatch(/tags 2번 \| 개념 칸 「c9」/);
  });
  it('정답 = 보기 번호로 통일 · 보기 글자로 적으면 번호를 알려 줌', () => {
    const d = JSON.parse(fs.readFileSync(DIR + 'example-ex-11.json', 'utf8')); d.boss.vers[0][0].a = '∩';
    expect(errs(checkUpload(JSON.stringify(d), look)).map((x) => `${x.at} | ${x.msg}`)).toContain('형성평가 · 버전 0 · 1번 | 정답 「∩」 — 보기 번호(0부터)로 적어요 (「∩」 = 1번)');
  });
  it('JSON 이 아니면 한 줄 이유', () => { expect(checkUpload('{ 깨짐', look).issues[0]!.at).toBe('파일'); });
  it('풀 판 차시(엔진 꼴 · 생성기) = 같은 길 · 통과 · 이미 있는 차시 = 선생님 확인만', () => {
    for (const f of fs.readdirSync('src/subjects/common-math2/lessons')) {
      const r = checkUpload(fs.readFileSync(`src/subjects/common-math2/lessons/${f}`, 'utf8'), look);
      expect(errs(r), f).toEqual([]);
      expect(r.issues.some((x) => x.lvl === 'ask' && x.at === 'id'), f).toBe(true);
    }
  });
  it('입력판 그림 이름 → 배치표 이름', () => {
    expect(spriteName(2)).toBe('base2:0'); expect(spriteName('extra:4')).toBe('extra4:0'); expect(spriteName('2@h250')).toBe('base2:0@h250'); expect(spriteName('d01:2@e')).toBe('d01:2@e'); expect(spriteName('')).toBe('');
  });
});
