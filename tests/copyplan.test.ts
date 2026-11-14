// 🚀 출시 복사 계획 (plan.mjs) — 정식 기준 · 합치기 없음 · 대조 1칸이라도 다르면 멈춤
import { describe, expect, it } from 'vitest';
// @ts-expect-error — .mjs 도구 (타입 없음)
import { buildPlan, compare, converted, classify, BETA_CLEAR, same } from '../tools/copy-from-release/plan.mjs';

type DB = Record<string, any>;
const OFF: DB = {
  accounts: { '1-3': { 5: { uid: 'U5', gen: 1, hero: 4 }, 6: { uid: 'U6', gen: 0, hero: 2, reset: true } } },
  roster: { '1-3': { 5: '가짜오', 6: '가짜육' } }, rosterMask: { '1-3': { 5: '가*오', 6: '가*육' } },
  gem: { '1-3': { 5: { total: 321, scroll: 7, enh: 2, buy: { h4: 1 }, log: { join_x: { g: 4 } } } } },
  xp: { '1-3': { 5: { total: 880 } } }, cards: { '1-3': { 5: { sub: true } } },
  records: { '1-3': { 5: { 'set-06': { mons: { m1: 'o' }, bossM: 'ooooox' } } } },
  bonus: { '1-3': { 5: { 'set-06': { r1: { clear: true, mis: { a: 1 } } } } } },
  surveyA: { '1-3': { k1: { no: 6, r: 3, pick: 'a', cmp: 1, n: 5 } } }, survey: { '1-3': { open: true, no: 6 } },
  fgift: { '1-3': { 5: { f1: { from: '1-3/6', fromName: '가짜육', g: 3, msg: '힘내', at: 10 }, f2: { from: '1-3/6', g: 2, at: 11, got: true } } } },
  fbr: { '1-3': { 6: { fb9: { t: '고마워요', at: 20, q: '질문' } } } },
  notice: { '1-3': { n1: { t: '알림', at: 1 } } },
  admins: { T1: true }, prep: { 'set-06': { img: { c1: 'data:a' }, at: 5 } },
  rooms: { 111111: { state: {} } }, live: { x: 1 }, secrets: { s: 1 }, hallTry: { h: 1 },
};
function apply(beta: DB, plan: ReturnType<typeof buildPlan>): DB {
  const db = structuredClone(beta);
  const del = (p: string) => { const ks = p.split('/'), last = ks.pop()!; const o = ks.reduce((o: DB | undefined, k) => o?.[k], db); if (o) delete o[last]; };
  const put = (p: string, v: unknown) => { const ks = p.split('/'), last = ks.pop()!; let o = db; for (const k of ks) o = o[k] ??= {}; o[last] = structuredClone(v); };
  plan.clear.forEach(del); plan.put.forEach((x: { path: string; val: unknown }) => put(x.path, x.val)); Object.entries(plan.patch).forEach(([p, v]) => put(p, v));
  return db;
}
const BETA: DB = { accounts: { '1-3': { 1: { uid: 'B1' } } }, gem: { '1-3': { 1: { total: 999 } } }, pids: { s1_3_1: { u: 'B1' } }, admins: { TB: true },
  prep: { 'set-06': { img: { c2: 'data:beta' } }, packs: { p1: 1 } }, school: { board: { posts: { a: 1 } }, sched: { 1: { 1: '1-3' } } }, gifts: { s1_3_1: { x: { g: 5 } } } };

describe('🚀 출시 복사 계획', () => {
  it('칸 나누기: 수업 중 칸 · 열쇠 = 뺌 · admins · prep = 합침 · 나머지 = 그대로', () => {
    expect(['rooms', 'live', 'secrets', 'hallTry'].map(classify)).toEqual(['skip', 'skip', 'skip', 'skip']);
    expect(classify('admins')).toBe('merge'); expect(classify('prep')).toBe('merge');
    expect(['surveyA', 'survey', 'notice', 'fgift', 'fbr', 'qsolve', 'newArea'].map(classify)).toEqual(Array(7).fill('copy'));
  });
  it('베타 학생 칸은 비우고 교사 설정(시간표 · 팩)은 남김', () => {
    const db = apply(BETA, buildPlan(OFF));
    expect(db.accounts['1-3'][1]).toBeUndefined(); expect(db.gem['1-3'][1]).toBeUndefined(); expect(db.pids.s1_3_1).toBeUndefined();
    expect(db.school.board).toBeUndefined(); expect(db.gifts.s1_3_1).toBeUndefined();
    expect(db.school.sched).toEqual({ 1: { 1: '1-3' } }); expect(db.prep.packs).toEqual({ p1: 1 });
    expect(BETA_CLEAR).toContain('records');
  });
  it('정식 칸 = 같은 이름 · 같은 꼴 · 합치기는 둘 다 남음 · 수업 중 칸은 안 옮김', () => {
    const db = apply(BETA, buildPlan(OFF));
    for (const k of ['accounts', 'gem', 'records', 'bonus', 'surveyA', 'survey', 'fgift', 'fbr', 'notice', 'xp', 'cards']) expect(same(db[k], OFF[k])).toBe(true);
    expect(db.admins).toEqual({ TB: true, T1: true });
    expect(db.prep['set-06'].img).toEqual({ c1: 'data:a', c2: 'data:beta' });
    expect(db.rooms).toBeUndefined(); expect(db.live).toBeUndefined(); expect(db.secrets).toBeUndefined();
  });
  it('바꿔 넣기: 학생 칸 주인 · 안 받은 친구 선물만 · 선생님 답장', () => {
    const c = converted(OFF);
    expect(c['pids/s1_3_5']).toEqual({ u: 'U5', c: '1-3', n: '5' });
    expect(c['gifts/s1_3_5/fg_f1']).toMatchObject({ g: 3, at: 10 }); expect(c['gifts/s1_3_5/fg_f2']).toBeUndefined();
    expect(c['mail/s1_3_6/fbr_fb9']).toMatchObject({ text: '고마워요', kind: 'reply', g: 0 });
  });
  it('대조: 그대로면 0 차이 · 한 칸만 달라도 멈춤', () => {
    const plan = buildPlan(OFF), db = apply(BETA, plan);
    const ok = compare(OFF, db); expect(ok.bad).toEqual([]); expect(ok.ok).toBe(true); expect(ok.students).toHaveLength(2);
    const bad = structuredClone(db); bad.gem['1-3'][5].total = 320;
    const r = compare(OFF, bad); expect(r.ok).toBe(false); expect(r.bad.join()).toMatch(/학생 1-3-5: gem 321 → 320/);
    const bad2 = structuredClone(db); delete bad2.bonus['1-3'][5]['set-06'].r1.mis; expect(compare(OFF, bad2).ok).toBe(false);
  });
  it('로그인 목록을 못 옮기면 = 옮긴 계정에 reset (대조도 그 꼴로)', () => {
    const plan = buildPlan(OFF, { authImport: false }), db = apply(BETA, plan);
    expect(db.accounts['1-3'][5]).toMatchObject({ uid: 'U5', reset: true, from: 'release' });
    expect(compare(OFF, db, { authImport: false }).ok).toBe(true);
  });
});
