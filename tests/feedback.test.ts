// 🛠 #98 개선단 모델 — 보내기 · 하루 5번 · 사진 하루 1장 · 게시판(이름 없음) · 👍 · 채택(💎 선물 · 사진 지움) · 지우기 · 30일 사진 · 그림 · 난이도 표
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { adopt, adoptLog, artTable, artVote, board, check, diffTable, LIMIT, myList, rateDiff, remove, rows, submit, sweep, today, vote } from '../src/school/feedback';

const DAY = 86400_000;
describe('🛠 #98 개선단', () => {
  it('보내기 → 내 칸 · 사진 따로 · 게시판 줄엔 이름 · 자동 글 · 사진 없음', async () => {
    const S = memoryStore(), id = await submit(S, '1-3', 5, { k: 'bug', t: '게시판 단추가 안 눌려요', info: '화면: student', photo: 'data:image/jpeg;base64,AAAA' });
    const mine = S.get<Record<string, unknown>>(`fbk/1-3/5/${id}`)!;
    expect(mine).toMatchObject({ k: 'bug', t: '게시판 단추가 안 눌려요', info: '화면: student' });
    expect(Number(mine.ph)).toBeGreaterThan(0);
    expect(S.get(`fbkph/1-3/5/${id}`)).toMatchObject({ d: 'data:image/jpeg;base64,AAAA' });
    expect(S.get(`fbkpub/${id}`)).toEqual({ k: 'bug', t: '게시판 단추가 안 눌려요', at: expect.any(Number) });
    expect(await myList(S, '1-3', 5)).toHaveLength(1);
  });
  it('글 400자 · 하루 5번 · 사진 하루 1장 · 종류', () => {
    const now = Date.UTC(2026, 10, 21, 3); const l: Record<string, { k: 'idea'; t: string; at: number; ph?: number }> = {};
    expect(check('x', '안녕하세요', l, now, false)).toMatch(/종류/);
    expect(check('idea', 'a'.repeat(LIMIT.text + 1), l, now, false)).toMatch(/400/);
    l.a = { k: 'idea', t: 'aa', at: now, ph: now };
    expect(check('idea', '사진 또', l, now, true)).toMatch(/1장/);
    for (let i = 0; i < 4; i++) l[`b${i}`] = { k: 'idea', t: 'aa', at: now };
    expect(today(l, now)).toEqual({ sent: 5, photos: 1 });
    expect(check('idea', '여섯 번째', l, now, false)).toMatch(/5번/);
    expect(check('idea', '다음 날', l, now + DAY, false)).toBe('');
  });
  it('게시판: 👍 한 사람 한 번 · 👍순 · 새것순', async () => {
    const S = memoryStore(), a = await submit(S, '1-1', 1, { k: 'idea', t: '펫 키우기' }), b = await submit(S, '1-1', 2, { k: 'art', t: '파도 그림 바꿔요' });
    await vote(S, b, 's1_1_3', true); await vote(S, b, 's1_1_3', true); await vote(S, b, 's1_1_4', true); await vote(S, a, 's1_1_3', true);
    let xs = await board(S, 's1_1_3', 'up');
    expect(xs.map((x) => [x.id, x.up, x.me])).toEqual([[b, 2, true], [a, 1, true]]);
    await vote(S, a, 's1_1_3', false); xs = await board(S, 's1_1_5', 'up');
    expect(xs.find((x) => x.id === a)).toMatchObject({ up: 0, me: false });
    expect(Object.keys(xs[0]!).sort()).toEqual(['at', 'id', 'k', 'me', 't', 'up']); // 이름 · 번호 · 반 없음
  });
  it('채택 = 💎 선물(fbk_ 키) + 메시지 · 게시판 ✅ · 사진 지움 · 받으면 로그 한 줄(칭호)', async () => {
    const S = memoryStore(), id = await submit(S, '1-2', 7, { k: 'bug', t: '버그예요', photo: 'data:x' });
    const [r] = await rows(S, ['1-2']); adopt(S, r!, 's1_2_7', 50);
    expect(S.get(`gifts/s1_2_7/fbk_${id}m`)).toMatchObject({ g: 50, fun: '🛠 의견 채택' });
    expect(S.get(`mail/s1_2_7/fbk_${id}`)).toMatchObject({ g: 50, kind: 'msg' });
    expect(S.get(`fbkpub/${id}/ad`)).toBe(true);
    expect(S.get(`fbkph/1-2/7/${id}`)).toBeNull();
    expect(S.get(`fbk/1-2/7/${id}`)).toMatchObject({ ph: 0, ad: { g: 50 } });
    expect(adoptLog(`fbk_${id}m`, 1)).toEqual({ key: `fbk_${id}`, row: { g: 0, at: 1, why: '🛠 의견 채택' } });
    expect(adoptLog('mail_x', 1)).toBeNull();
  });
  it('지우기 = 의견 · 사진 · 게시판 · 👍 모두', async () => {
    const S = memoryStore(), id = await submit(S, '1-2', 7, { k: 'idea', t: '지울 것', photo: 'data:x' }); await vote(S, id, 'p', true);
    remove(S, { cls: '1-2', num: 7, id });
    for (const p of [`fbk/1-2/7/${id}`, `fbkph/1-2/7/${id}`, `fbkpub/${id}`, `fbkvote/${id}`]) expect(S.get(p)).toBeNull();
  });
  it('30일 지난 사진만 지움(사진은 안 받고 시각만 봄)', async () => {
    const S = memoryStore(), id = await submit(S, '1-2', 7, { k: 'bug', t: '오래된 것', photo: 'data:x' });
    const xs = await rows(S, ['1-2']);
    expect(sweep(S, xs, S.now() + 29 * DAY)).toBe(0);
    expect(sweep(S, xs, S.now() + 31 * DAY)).toBe(1);
    expect(S.get(`fbkph/1-2/7/${id}`)).toBeNull();
  });
  it('🎨 그림 👍 · 🔁 표 · 📊 난이도 표', async () => {
    const S = memoryStore();
    await artVote(S, 'skill_wave', 'a', -1); await artVote(S, 'skill_wave', 'b', -1); await artVote(S, 'skill_wave', 'c', 1); await artVote(S, 'hero_3', 'a', 1); await artVote(S, 'hero_3', 'b', 0);
    expect(artTable(S.get('artvote'))).toEqual([{ key: 'skill_wave', up: 1, swap: 2 }, { key: 'hero_3', up: 1, swap: 0 }]);
    await rateDiff(S, 'set-10', 'm1', 'a', 3); await rateDiff(S, 'set-10', 'm1', 'b', 2); await rateDiff(S, 'set-10', 'm1', 'a', 1);
    expect(diffTable(S.get('diff'))).toEqual([{ lid: 'set-10', mon: 'm1', n: [1, 1, 0] }]);
  });
});
