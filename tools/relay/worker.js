// 🔔 무료 중계 (Cloudflare Workers · 📜 2026-11-16 선생님 「추천대로」 = 알림 ④ + 배포 알림 ②를 여기로 합침)
//   1분마다: 정식 version.json(새 판) + 운영 서버 photo · school/inbox · loginFail → 알릴 것 고르기(src/school/noteDiff.ts = 앱과 같은 것)
//   → teacherPush/{교사}/{주소} 중 그 종류를 켠 교사 폰에 웹 푸시 · 본 것 = 운영 서버 relay/seen (규칙 밖 · 서비스 계정만)
//   비밀값(secret): RELAY_PASSWORD(중계 전용 로그인 · 규칙이 허락한 칸만) · VAPID_PRIVATE · RUN_KEY · 공개값(vars): DB_URL · API_KEY · RELAY_EMAIL · SITE · VAPID_PUBLIC · VAPID_SUBJECT
import { diffData, rawNoteData } from '../../src/school/noteDiff.ts';
import { sendPush } from './push.js';

/** 중계 전용 로그인(dungeon-relay · 📜 2026-11-16 선생님 「A」 = 관리자 열쇠는 밖으로 안 보냄) → Firebase ID 토큰 (1시간) */
async function signIn(env, doFetch) {
  const r = await doFetch(`${env.AUTH_URL || 'https://identitytoolkit.googleapis.com'}/v1/accounts:signInWithPassword?key=${env.API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.RELAY_EMAIL, password: env.RELAY_PASSWORD, returnSecureToken: true }) });
  const j = await r.json(); if (!j.idToken) throw new Error('중계 로그인 실패'); return j.idToken;
}

export async function run(env, { doFetch = fetch, now = Date.now() } = {}) {
  if (/citadel-math-default-rtdb/.test(env.DB_URL)) throw new Error('옛 정식 서버 = 멈춤');
  const tok = await signIn(env, doFetch);
  const db = async (p, init) => { const r = await doFetch(`${env.DB_URL}/${p}.json?auth=${tok}${env.DB_NS ? `&ns=${env.DB_NS}` : ''}`, { ...init, headers: { 'content-type': 'application/json' } }); return init ? r.ok : r.json(); };
  const [photo, inbox, fails, seen, subs] = await Promise.all([db('photo'), db('school/inbox'), db('loginFail'), db('relay/seen'), db('teacherPush')]);
  let site = null; try { const v = await (await doFetch(`${env.SITE}version.json?t=${now}`, { cf: { cacheTtl: 0 } })).json(); site = String(v.build || '') || null; } catch { /* 사이트 잠깐 안 됨 */ }
  const { notes, next } = diffData(rawNoteData(photo, inbox, fails), seen && seen.at ? { photo: seen.photo || [], hand: seen.hand || [], login: seen.login || {}, deploy: seen.deploy || '' } : null /* 빈 목록은 서버에 안 남음 → at 으로 「본 적 있음」 */, now, site, '');
  // 🐞 #47 본 것 저장이 실패하면 보내지 않음 (저장 실패 = 다음 번에 같은 알림을 또 보냄 → 1분마다 되풀이되던 것)
  if (!(await db('relay/seen', { method: 'PUT', body: JSON.stringify({ ...next, at: now }) }))) return { notes: notes.length, sent: 0, gone: 0, error: 'seen 저장 실패' };
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

/** 📥 꾸러미 내려받기 한 번 = 오늘(한국) 칸 +1 (서버 값 더하기 · 동시에 눌러도 안 빠짐) */
export async function kitHit(env, doFetch = fetch, now = Date.now()) {
  try {
    if (/citadel-math-default-rtdb/.test(env.DB_URL)) return;
    const day = new Date(now + 9 * 3600e3).toISOString().slice(0, 10), tok = await signIn(env, doFetch);
    await doFetch(`${env.DB_URL}/relay/kit/${day}.json?auth=${tok}${env.DB_NS ? `&ns=${env.DB_NS}` : ''}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ '.sv': { increment: 1 } }) });
  } catch { /* 세기 실패 = 받기에는 영향 없음 */ }
}

export default {
  async scheduled(_ev, env, ctx) { ctx.waitUntil(run(env).catch((e) => console.error('중계 실패', String(e)))); },
  // 손으로 한 번 돌리기 = /run + 헤더 x-run-key (RUN_KEY 비밀값) · 그 밖 = 「ok」만
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname === '/run' && env.RUN_KEY && req.headers.get('x-run-key') === env.RUN_KEY) return Response.json(await run(env));
    // 📥 꾸러미 내려받기 수 (📜 2026-11-17 선생님 「1A 2추천」): 누를 때마다 날짜(한국)별 +1 = relay/kit/{날짜} · IP · 기기 정보 안 남김
    //   /kit = 세고 사이트 zip 으로 302 · /kit-hit = 세기만(앱이 zip 은 사이트에서 직접 받음 → Worker 가 죽어도 받기는 됨)
    if (u.pathname === '/kit' || u.pathname === '/kit-hit') {
      const p = kitHit(env); if (ctx?.waitUntil) ctx.waitUntil(p); else await p;
      if (u.pathname === '/kit-hit') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*' } });
      return Response.redirect(`${env.SITE}kit/${encodeURIComponent('모두의던전_차시팩_만들기_꾸러미.zip')}`, 302);
    }
    return new Response('ok');
  },
};
