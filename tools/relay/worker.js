// 🔔 무료 중계 (Cloudflare Workers · 📜 2026-11-16 선생님 「추천대로」 = 알림 ④ + 배포 알림 ②를 여기로 합침)
//   1분마다: 정식 version.json(새 판) + 운영 서버 photo · school/inbox · loginFail → 알릴 것 고르기(src/school/noteDiff.ts = 앱과 같은 것)
//   → teacherPush/{교사}/{주소} 중 그 종류를 켠 교사 폰에 웹 푸시 · 본 것 = 운영 서버 relay/seen (규칙 밖 · 서비스 계정만)
//   비밀값(wrangler secret): SA_JSON(운영 서버 읽기 · relay 쓰기) · VAPID_PRIVATE · 공개값(vars): DB_URL · SITE · VAPID_PUBLIC · VAPID_SUBJECT
import { diffData, rawNoteData } from '../../src/school/noteDiff.ts';
import { sendPush } from './push.js';

const te = new TextEncoder();
const ub64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** 서비스 계정 → Google 접근 토큰 (RS256 JWT) */
async function gtoken(sa) {
  const now = Math.floor(Date.now() / 1000), enc = (o) => ub64(te.encode(JSON.stringify(o)));
  const data = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const jwt = `${data}.${ub64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, te.encode(data))))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const j = await r.json(); if (!j.access_token) throw new Error('토큰 실패'); return j.access_token;
}

export async function run(env, { doFetch = fetch, now = Date.now() } = {}) {
  if (/citadel-math-default-rtdb/.test(env.DB_URL)) throw new Error('옛 정식 서버 = 멈춤');
  const tok = await gtoken(JSON.parse(env.SA_JSON));
  const db = async (p, init) => { const r = await doFetch(`${env.DB_URL}/${p}.json`, { ...init, headers: { Authorization: `Bearer ${tok}`, 'content-type': 'application/json' } }); return init ? r.ok : r.json(); };
  const [photo, inbox, fails, seen, subs] = await Promise.all([db('photo'), db('school/inbox'), db('loginFail'), db('relay/seen'), db('teacherPush')]);
  let site = null; try { const v = await (await doFetch(`${env.SITE}version.json?t=${now}`, { cf: { cacheTtl: 0 } })).json(); site = String(v.build || '') || null; } catch { /* 사이트 잠깐 안 됨 */ }
  const { notes, next } = diffData(rawNoteData(photo, inbox, fails), seen && seen.photo ? { photo: seen.photo || [], hand: seen.hand || [], login: seen.login || {}, deploy: seen.deploy || '' } : null, now, site, '');
  await db('relay/seen', { method: 'PUT', body: JSON.stringify({ ...next, at: now }) });
  let sent = 0, gone = 0;
  const vapid = { publicKey: env.VAPID_PUBLIC, privateKey: env.VAPID_PRIVATE, subject: env.VAPID_SUBJECT };
  for (const [uid, byFp] of Object.entries(subs || {})) for (const [fp, row] of Object.entries(byFp || {})) {
    for (const n of notes) {
      if (!row?.sub?.endpoint || (row.kinds && row.kinds[n.kind] === false)) continue;
      const r = await sendPush(row.sub, { title: n.title, body: n.body, kind: n.kind, url: '?role=teacher&tab=news' }, vapid, doFetch);
      if (r.status === 404 || r.status === 410) { await db(`teacherPush/${uid}/${fp}`, { method: 'DELETE' }); gone++; break; }
      if (r.ok) sent++;
    }
  }
  return { notes: notes.length, sent, gone };
}

export default {
  async scheduled(_ev, env, ctx) { ctx.waitUntil(run(env).catch((e) => console.error('중계 실패', String(e)))); },
  // 손으로 한 번 돌리기 = /run + 헤더 x-run-key (RUN_KEY 비밀값) · 그 밖 = 「ok」만
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/run' && env.RUN_KEY && req.headers.get('x-run-key') === env.RUN_KEY) return Response.json(await run(env));
    return new Response('ok');
  },
};
