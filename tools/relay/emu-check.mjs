// 🔔 중계 전용 로그인 규칙 확인 (에뮬레이터 · 📜 2026-11-16 선생님 「A」) — node tools/relay/emu-check.mjs
//   dungeon-relay = photo · school/inbox · loginFail · teacherPush 읽기 · relay 쓰기 · teacherPush 끝난 주소 지우기만 / 그 밖(accounts · gem · 새 주소 쓰기) 막힘
import { run } from './worker.js';
const NS = 'demo-citadel-test-default-rtdb', DB = 'http://127.0.0.1:9000', AU = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com';
const owner = (p, method = 'GET', body) => fetch(`${DB}/${p}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
await owner('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' });
await fetch(`${AU}/v1/projects/demo-citadel-test/accounts`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ localId: 'dungeon-relay', email: 'relay@citadel.class', password: 'relay-test-pw' }) });
const sub = (e) => ({ endpoint: e, keys: { p256dh: 'BHLbfxRkAOne6F2gfZMYrY0B9GeD5AqXrkLsKnmEPkSUs9VvCEZbsGoEznyjAix-LygAMty0tKAxA6MA7tz6NIk', auth: 'AAAAAAAAAAAAAAAAAAAAAA' } });
await owner('', 'PATCH', { accounts: { '1-3': { 2: { uid: 'u2' } } }, photo: {}, teacherPush: { t1: { a: { sub: sub('https://push.example/ok'), kinds: { photo: true } }, b: { sub: sub('https://push.example/gone'), kinds: { photo: true } } } } });
const v = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const jwk = await crypto.subtle.exportKey('jwk', v.privateKey), raw = new Uint8Array(await crypto.subtle.exportKey('raw', v.publicKey));
const env = { DB_URL: DB, DB_NS: NS, AUTH_URL: AU, API_KEY: 'demo-key', RELAY_EMAIL: 'relay@citadel.class', RELAY_PASSWORD: 'relay-test-pw', SITE: 'http://127.0.0.1:1/', VAPID_PUBLIC: Buffer.from(raw).toString('base64url'), VAPID_PRIVATE: jwk.d, VAPID_SUBJECT: 'mailto:noreply@example.invalid' };
const pushed = [];
const doFetch = async (url, init) => { if (url.startsWith('https://push.example/')) { pushed.push(url); return new Response(null, { status: url.endsWith('gone') ? 410 : 201 }); } return fetch(url, init); };
const r1 = await run(env, { doFetch });
ok('첫 번 = 기준만 · 읽기 4칸 모두 됨', r1.notes === 0, JSON.stringify(r1));
ok('relay/seen 씀', !!(await owner('relay/seen'))?.at);
await owner('photo/1-3/2/k/a', 'PUT', { status: 'check' });
const r2 = await run(env, { doFetch });
ok('새 사진 → 알림 2곳 시도 · 끝난 주소 지움', r2.notes === 1 && pushed.length === 2 && r2.gone === 1, JSON.stringify(r2));
ok('teacherPush/t1/b 지워짐 · a 남음', !(await owner('teacherPush/t1/b')) && !!(await owner('teacherPush/t1/a')));
// 막힌 칸: 중계 토큰으로 직접
const tok = (await (await fetch(`${AU}/v1/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.RELAY_EMAIL, password: env.RELAY_PASSWORD, returnSecureToken: true }) })).json()).idToken;
const as = (p, method = 'GET', body) => fetch(`${DB}/${p}.json?ns=${NS}&auth=${tok}`, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.status);
ok('records 읽기 막힘', (await as('records')) === 401);
ok('secrets 읽기 막힘', (await as('secrets')) === 401);
ok('gem 읽기 막힘', (await as('gem')) === 401);
ok('teacherPush 새 주소 쓰기 막힘', (await as('teacherPush/t1/z', 'PUT', { sub: { endpoint: 'https://evil.example/x' } })) === 401);
ok('photo 쓰기 막힘', (await as('photo/1-3/2/k/a/ok', 'PUT', true)) === 401);
console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0');
process.exit(errs.length ? 1 : 0);
