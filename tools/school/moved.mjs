// 🏫 학교판 = 정식 주소 하나 (📜 2026-11-16 · DECISIONS 「🏫 다른 학교 = 주소 하나(정식)만」)
//   node tools/school/moved.mjs <dist>  — moved.json 에서 true 인 학교는 <dist>/s/<코드>/ 를 「넘김 페이지」로 바꿈
//   index.html = 정식 주소로 location.replace(뒤 ?… #… 그대로) · sw.js = 옛 서비스 워커 자리를 이어받아 캐시 지우고 스스로 해지 → 열린 창 새로 고침 → 넘김
//   홈 화면에 깔린 앱도 다음에 열 때 넘어감 (브라우저가 sw.js 를 새로 받아 바꿔 끼움)
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
const dist = process.argv[2] || 'dist';
const M = JSON.parse(readFileSync(new URL('./moved.json', import.meta.url), 'utf8'));
const esc = (s) => String(s).replace(/[<>"&]/g, '');
for (const [code, on] of Object.entries(M)) {
  if (code === '_' || code === 'to' || on !== true) continue;
  const dir = `${dist}/s/${code}`, to = `${M.to}${code}/`;
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>모두의 던전 · 새 주소</title><meta http-equiv="refresh" content="2;url=${esc(to)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#14110f;color:#f2f3f5;font:500 16px system-ui,sans-serif;text-align:center;padding:16px}a{color:#f5b84a;font-weight:700}</style></head>
<body><div><p>🏰 모두의 던전이 새 주소로 옮겼어요</p><p><a id="go" href="${esc(to)}">새 주소로 가기 ›</a></p><p style="font-size:14px;color:#b4b8c2">홈 화면 앱은 새 주소에서 다시 깔아 주세요</p></div>
<script>(function(){var u=${JSON.stringify(to)}+location.search+location.hash;document.getElementById('go').href=u;
try{if(navigator.serviceWorker)navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}catch(e){}
try{if(window.caches)caches.keys().then(function(k){k.forEach(function(n){caches.delete(n)})})}catch(e){}
location.replace(u)})();</script></body></html>
`);
  writeFileSync(`${dir}/sw.js`, `// 🏫 넘김 · 옛 서비스 워커 정리 (moved.mjs)
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.map(function (n) { return caches.delete(n); })); })
    .then(function () { return self.registration.unregister(); })
    .then(function () { return self.clients.matchAll({ type: 'window' }); })
    .then(function (cs) { cs.forEach(function (c) { try { c.navigate(c.url); } catch (x) {} }); }));
});
`);
  writeFileSync(`${dir}/version.json`, JSON.stringify({ build: 'moved', v: 'moved' }));
  console.log(`🏫 ${code} → ${to}`);
}
