// 🔔 무료 중계 (tools/relay · 📜 2026-11-16) — 웹 푸시 암호화를 받는 쪽처럼 풀어 봄 · VAPID 서명 확인 · 한 번 돌리기(가짜 서버)
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error 순수 JS 도구
import { b64u, encrypt, ub64, vapidAuth } from '../tools/relay/push.js';
// @ts-expect-error 순수 JS 도구
import { run } from '../tools/relay/worker.js';
import { generateKeyPairSync } from 'node:crypto';

const te = new TextEncoder();
const hmac = async (key: Uint8Array, data: Uint8Array) => new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), data));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function uaKeys() {
  const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey));
  return { k, pub, auth: crypto.getRandomValues(new Uint8Array(16)) };
}
/** 받는 쪽(브라우저)처럼 풀기 — RFC 8291 */
async function decrypt(body: Uint8Array, ua: Awaited<ReturnType<typeof uaKeys>>) {
  const salt = body.slice(0, 16), idlen = body[20]!, asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.k.privateKey, 256));
  const ikm = (await hmac(await hmac(ua.auth, shared), cat(te.encode('WebPush: info\0'), ua.pub, asPub, new Uint8Array([1])))).slice(0, 32);
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), ct));
  expect(pt[pt.length - 1]).toBe(2);
  return new TextDecoder().decode(pt.slice(0, -1));
}
async function vapidPair() {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', k.privateKey);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey));
  return { publicKey: ub64(pub), privateKey: jwk.d!, subject: 'mailto:noreply@example.invalid', verifyKey: k.publicKey };
}

describe('🔔 무료 중계', () => {
  it('암호화 → 받는 쪽처럼 풀면 같은 글 (한글 포함)', async () => {
    const ua = await uaKeys(), msg = JSON.stringify({ title: '📷 사진 확인 2장', body: '1-3반 2장' });
    const body = await encrypt(msg, ub64(ua.pub), ub64(ua.auth));
    expect(await decrypt(body, ua)).toBe(msg);
  });
  it('VAPID = ES256 서명 · aud = 받는 주소 출처 · k = 공개 열쇠', async () => {
    const v = await vapidPair();
    const h = await vapidAuth('https://fcm.googleapis.com/fcm/send/abc', v, 1000);
    const [, t, k] = /vapid t=([^,]+), k=(.+)/.exec(h)!;
    expect(k).toBe(v.publicKey);
    const [a, b, s] = t!.split('.');
    expect(JSON.parse(new TextDecoder().decode(b64u(b!)))).toMatchObject({ aud: 'https://fcm.googleapis.com', exp: 1000 + 43200 });
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, v.verifyKey, b64u(s!), te.encode(`${a}.${b}`))).toBe(true);
  });
  it('한 번 돌리기: 첫 번 = 기준만 · 새 사진 → 켠 교사에게만 · 끝난 주소(410) 지움 · 옛 정식 서버면 멈춤', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
    const v = await vapidPair(), ua = await uaKeys();
    const sub = (e: string) => ({ endpoint: e, keys: { p256dh: ub64(ua.pub), auth: ub64(ua.auth) } });
    const db: Record<string, unknown> = {
      photo: {}, 'school/inbox': {}, loginFail: {}, 'relay/seen': null,
      teacherPush: { t1: { a: { sub: sub('https://push.example/ok'), kinds: { photo: true } }, b: { sub: sub('https://push.example/gone'), kinds: { photo: true } } }, t2: { c: { sub: sub('https://push.example/off'), kinds: { photo: false } } } },
    };
    const calls: string[] = [], writes: [string, string][] = [];
    const doFetch = vi.fn(async (url: string, init?: { method?: string; body?: unknown }) => {
      if (url.startsWith('https://push.example/')) { calls.push(url); expect(await decrypt(init!.body as Uint8Array, ua)).toContain('사진 확인'); return new Response(null, { status: url.endsWith('gone') ? 410 : 201 }); }
      if (url.includes('version.json')) return Response.json({ build: 'b300' });
      const p = url.replace('https://db.test/', '').replace('.json', '');
      if (init?.method) { writes.push([init.method, p]); if (p === 'relay/seen') db['relay/seen'] = JSON.parse(String(init.body)); return new Response('null'); }
      return Response.json(db[p] ?? null);
    });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ access_token: 'tok' })));
    const env = { DB_URL: 'https://db.test', SITE: 'https://site.test/', SA_JSON: JSON.stringify({ client_email: 'x@y', private_key: privateKey }), VAPID_PUBLIC: v.publicKey, VAPID_PRIVATE: v.privateKey, VAPID_SUBJECT: v.subject };
    expect(await run(env, { doFetch })).toEqual({ notes: 0, sent: 0, gone: 0 }); // 첫 번
    db.photo = { '1-3': { 2: { k: { a: { status: 'check' } } } } };
    expect(await run(env, { doFetch })).toEqual({ notes: 1, sent: 1, gone: 1 });
    expect(calls.sort()).toEqual(['https://push.example/gone', 'https://push.example/ok']);
    expect(writes).toContainEqual(['DELETE', 'teacherPush/t1/b']);
    await expect(run({ ...env, DB_URL: 'https://citadel-math-default-rtdb.firebaseio.com' }, { doFetch })).rejects.toThrow('멈춤');
    vi.unstubAllGlobals();
  });
});
