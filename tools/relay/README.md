# 🔔 무료 중계 (Cloudflare Workers) — 교사 앱을 닫아도 오는 알림 + 새 판 배포 알림

- 1분마다(cron) 운영 서버 `photo` · `school/inbox` · `loginFail` + 정식 `version.json` 을 보고, 알릴 것 고르기는 앱과 같은 `src/school/noteDiff.ts`
- 보낼 곳 = `teacherPush/{교사}/{주소}`(교사 폰 「🔔 알림 켜기」 때 저장 · 켠 종류만) · 끝난 주소(404/410)는 지움
- 본 것 = 운영 서버 `relay/seen` (서비스 계정만 · 규칙 밖)
- 열쇠: `SA_JSON`(운영 서버 서비스 계정) · `VAPID_PRIVATE`(손발 비공개 폴더 vapid.json) · `RUN_KEY`(손으로 돌리기) = **wrangler secret / API 로만** · 저장소 금지
- 옛 정식 서버(citadel-math)면 멈춤
- 올리기: `npx esbuild tools/relay/worker.js --bundle --format=esm --outfile=<폴더>/worker.js` → Cloudflare API(스크립트 + cron + 비밀값)
- 시험: `tests/relay.test.ts` (암호화를 받는 쪽처럼 풀어 봄 · VAPID 서명 · 가짜 서버로 한 번 돌리기)
