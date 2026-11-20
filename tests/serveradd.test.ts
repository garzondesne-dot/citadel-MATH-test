// 🐞 11/20 ② 서버 꽂개 add(increment) · tx(transaction) — 두 기기가 같은 칸에 같이 더해도 다 남음 · 이 칸만 바뀜(위 칸 안 지움)
//   에뮬레이터가 안 떠 있으면 건너뜀 (cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test)
import { describe, expect, it } from 'vitest';
import { serverStore } from '../src/store/server';

const NS = 'demo-citadel-test-default-rtdb', DB = 'http://127.0.0.1:9000';
const up = await fetch(`${DB}/.json?ns=${NS}&shallow=true`, { headers: { Authorization: 'Bearer owner' } }).then(() => true, () => false);
const rest = (p: string, method = 'GET', body?: unknown) => fetch(`${DB}/${p}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const mk = (name: string) => serverStore({ name, firebase: { apiKey: 'demo-key', projectId: 'demo-citadel-test', databaseURL: `${DB}/?ns=${NS}`, authDomain: 'x' }, emulator: { host: '127.0.0.1', db: 9000, auth: 9099 } });
const until = async (f: () => boolean | Promise<boolean>, ms = 8000) => { const t0 = Date.now(); while (!(await f()) && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 50)); return f(); };

describe.skipIf(!up)('② 서버 add · tx', () => {
  it('두 기기 add = 합 · 옆 칸(ver · log) 그대로 · tx = 최신 값에서 합침', async () => {
    const A = await mk('addA'), B = await mk('addB');
    for (const S of [A, B]) await rest(`admins/${S.auth.currentUser!.uid}`, 'PUT', true);
    await rest('gem/9-9/1', 'PUT', { total: 100, ver: 1, log: { raid_X: { g: 4 } }, buy: [{ id: 'hero_1', ver: 1, at: 1 }] });
    void A.get('gem/9-9/1'); void B.get('gem/9-9/1');
    await until(() => A.get('gem/9-9/1/total') === 100 && B.get('gem/9-9/1/total') === 100);
    A.add!('gem/9-9/1/total', 20); B.add!('gem/9-9/1/total', -30);
    await until(async () => (await rest('gem/9-9/1/total')) === 90);
    expect(await rest('gem/9-9/1')).toMatchObject({ total: 90, ver: 1, log: { raid_X: { g: 4 } } });
    await until(() => A.get('gem/9-9/1/total') === 90);
    expect(A.get('gem/9-9/1/total')).toBe(90);
    const add = (id: string) => (cur: { id: string }[] | null) => [...(cur || []), { id, ver: 1, at: 2 }];
    await Promise.all([A.tx!('gem/9-9/1/buy', add('hero_2')), B.tx!('gem/9-9/1/buy', add('hero_3'))]);
    expect(((await rest('gem/9-9/1/buy')) as { id: string }[]).map((x) => x.id).sort()).toEqual(['hero_1', 'hero_2', 'hero_3']);
  }, 30000);
});
