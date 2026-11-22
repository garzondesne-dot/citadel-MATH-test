// 🔐 보안 고침 #149 — 바깥 사람(새 이메일 계정 · 익명)이 못 하는 것 + 학생 · 교사 길은 그대로
//   에뮬레이터가 안 떠 있으면 건너뜀 (cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const NS = 'demo-citadel-test-default-rtdb', DB = 'http://127.0.0.1:9000', AU = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const up = await fetch(`${DB}/.json?ns=${NS}&shallow=true`, { headers: { Authorization: 'Bearer owner' } }).then(() => true, () => false);
const owner = (path: string, method: string, body?: unknown) => fetch(`${DB}/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner' }, body: body === undefined ? undefined : JSON.stringify(body) });
async function user(email?: string): Promise<{ uid: string; tok: string }> {
  const r = await fetch(`${AU}/accounts:signUp?key=demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(email ? { email, password: 'pw123456', returnSecureToken: true } : { returnSecureToken: true }) }).then((x) => x.json() as Promise<{ localId: string; idToken: string }>);
  return { uid: r.localId, tok: r.idToken };
}
const as = (u: { tok: string }) => ({
  get: (p: string) => fetch(`${DB}/${p}.json?ns=${NS}&auth=${u.tok}`).then((r) => r.status),
  put: (p: string, v: unknown) => fetch(`${DB}/${p}.json?ns=${NS}&auth=${u.tok}`, { method: 'PUT', body: JSON.stringify(v) }).then((r) => r.status),
  del: (p: string) => fetch(`${DB}/${p}.json?ns=${NS}&auth=${u.tok}`, { method: 'DELETE' }).then((r) => r.status),
});
const r = Math.random().toString(36).slice(2, 7);

describe.skipIf(!up)('보안 고침 #149 (규칙)', () => {
  it('바깥 사람 · 학생 · 교사', async () => {
    const rules = readFileSync(new URL('../firebase/database.rules.json', import.meta.url), 'utf8');
    expect((await fetch(`${DB}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: rules })).ok).toBe(true);
    const T = await user(`t${r}@x.test`), S = await user(`s_1-3_3_0${r}@citadel.class`), O = await user(`o${r}@x.test`), A = await user();
    await owner('', 'PATCH', {
      admins: { [T.uid]: true },
      roster: { '1-3': { 3: '시험삼', 4: '시험사' }, '1-4': { 1: '다른반' } }, rosterMask: { '1-3': { 3: '시*삼', 4: '시*사' }, '1-4': { 1: '다*반' } },
      accounts: { '1-3': { 3: { uid: S.uid } } }, pids: { s1_3_3: { u: S.uid, c: '1-3', n: '3' }, s1_3_4: { u: 'nobody', c: '1-3', n: '4' } },
      school: { inbox: { x1: { title: '편지', at: 1 } }, board: { rank: { a: 1 }, posts: { p1: { host: 's1_3_4', act: Date.now(), phase: 'wait' } } }, live: { code: 'T1' } },
      held: { '1-3': { 'set-02': true } }, mail: { s1_3_3: { m1: { text: '안녕' } }, s1_3_4: { m1: { text: '남의 것' } } }, gifts: { s1_3_4: { g1: { g: 10 } } },
      atb: { p1: { meta: { a: 1 } } },
    });
    const o = as(O), a = as(A), s = as(S), t = as(T);
    // ── A1 명단: 바깥 이메일 계정 · 익명 = 못 읽음 · 그 반 학생 = 그 반만 · 교사 = 다
    expect(await o.get('roster')).toBe(401); expect(await o.get('roster/1-3')).toBe(401); expect(await a.get('roster/1-3')).toBe(401);
    expect(await s.put(`uids/${S.uid}`, { c: '1-3', n: '3' })).toBe(200);
    expect(await o.put(`uids/${O.uid}`, { c: '1-3', n: '3' })).toBe(401); // 남의 반 · 번호를 제 것이라고 못 씀
    expect(await s.get('roster/1-3')).toBe(200); expect(await s.get('roster/1-4')).toBe(401);
    expect(await t.get('roster')).toBe(200);
    expect(await s.get('rosterMask/1-3')).toBe(200); // 가입 전 화면 = 가린 이름은 그대로
    // ── A2 빈 번호 가져가기: 익명 = 못 함 · 명단에 없는 번호 = 못 함 · 이메일 계정 + 명단 번호 = 됨(가입 길)
    expect(await a.put('accounts/1-3/4', { uid: A.uid })).toBe(401);
    expect(await o.put('accounts/1-3/40', { uid: O.uid })).toBe(401);
    const N = await user(`s_1-3_4_0${r}@citadel.class`);
    expect(await as(N).put('accounts/1-3/4', { uid: N.uid })).toBe(200);
    expect(await o.put('accounts/1-3/4', { uid: O.uid })).toBe(401); // 남이 이미 가진 번호
    expect(await s.put('accounts/1-3/3/seen', 'b236')).toBe(200); // 내 칸 쓰기 그대로
    // ── A3 통째 쓰기 · 지우기: 소식함 · 랭킹 · held · 남의 게시판 글 · atb 판
    expect(await o.del('school/inbox')).toBe(401); expect(await o.put('school/inbox/z', { t: 1 })).toBe(401);
    expect(await o.del('school/board/rank')).toBe(401);
    expect(await o.del('held')).toBe(401); expect(await o.put('held/1-3/set-09', true)).toBe(401);
    expect(await o.del('school/board/posts/p1')).toBe(401);
    expect(await o.del('atb/p1')).toBe(401);
    expect(await o.put('school/funUsed/x', 1)).toBe(401); expect(await o.put('school/funStats/x', 1)).toBe(401);
    expect(await t.put('held/1-3/set-09', true)).toBe(200); expect(await t.del('school/board/posts/p1')).toBe(200);
    // ── A4 읽기: 소식함 = 교사만 · 우편 · 선물 = 자기 칸만
    expect(await o.get('school/inbox')).toBe(401); expect(await s.get('school/inbox')).toBe(401); expect(await t.get('school/inbox')).toBe(200);
    expect(await o.get('school')).toBe(401); expect(await s.get('school/live')).toBe(200); expect(await s.get('school/board')).toBe(200);
    expect(await o.get('mail')).toBe(401); expect(await o.get('mail/s1_3_3')).toBe(401); expect(await s.get('mail/s1_3_3')).toBe(200); expect(await s.get('mail/s1_3_4')).toBe(401);
    expect(await o.get('gifts')).toBe(401); expect(await s.get('gifts/s1_3_4')).toBe(401); expect(await t.get('gifts')).toBe(200); expect(await t.get('mail')).toBe(200);
  }, 30000);
});
