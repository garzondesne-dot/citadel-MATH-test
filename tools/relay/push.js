// 🔔 웹 푸시 보내기 (RFC 8291 aes128gcm + RFC 8292 VAPID) — WebCrypto 만 씀 = Cloudflare Workers · Node 20+ 둘 다
//   sendPush(sub, payload, { publicKey, privateKey, subject }) → fetch 응답 · 410/404 = 그 받는 주소는 끝남(지움)
const te = new TextEncoder();
const b64u = (s) => { const p = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(p), (c) => c.charCodeAt(0)); };
const ub64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const hmac = async (key, data) => new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), data));

/** 내용 암호화 (aes128gcm 한 덩어리) — 시험이 같은 순서로 풀어 봄 */
export async function encrypt(payload, p256dh, auth, opt = {}) {
  const uaPub = b64u(p256dh), authSecret = b64u(auth);
  const as = opt.asKeys || (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']));
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(authSecret, shared);
  const ikm = (await hmac(prkKey, cat(te.encode('WebPush: info\0'), uaPub, asPub, new Uint8Array([1])))).slice(0, 32);
  const salt = opt.salt || crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(te.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

/** VAPID 서명 (ES256 JWT) */
export async function vapidAuth(endpoint, { publicKey, privateKey, subject }, now = Math.floor(Date.now() / 1000)) {
  const pub = b64u(publicKey);
  const jwk = { kty: 'EC', crv: 'P-256', d: privateKey, x: ub64(pub.slice(1, 33)), y: ub64(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = (o) => ub64(te.encode(JSON.stringify(o)));
  const data = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: new URL(endpoint).origin, exp: now + 12 * 3600, sub: subject })}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(data)));
  return `vapid t=${data}.${ub64(sig)}, k=${publicKey}`;
}

/** 받는 주소 하나에 보냄 */
export async function sendPush(sub, payload, vapid, doFetch = fetch) {
  const body = await encrypt(typeof payload === 'string' ? payload : JSON.stringify(payload), sub.keys.p256dh, sub.keys.auth);
  return doFetch(sub.endpoint, { method: 'POST', headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal', Authorization: await vapidAuth(sub.endpoint, vapid) }, body });
}
export { b64u, ub64 };
