# 🔔 무료 중계 (Cloudflare Workers) — 교사 앱을 닫아도 오는 알림 + 새 판 배포 알림

- 1분마다(cron) 운영 서버 `photo` · `school/inbox` · `loginFail` + 정식 `version.json` 을 보고, 알릴 것 고르기는 앱과 같은 `src/school/noteDiff.ts`
- 보낼 곳 = `teacherPush/{교사}/{주소}`(교사 폰 「🔔 알림 켜기」 때 저장 · 켠 종류만) · 끝난 주소(404/410)는 지움
- 본 것 = 운영 서버 `relay/seen` (중계 계정만 읽고 씀)
- 🔐 서버 열쇠 = **중계 전용 로그인 `dungeon-relay`**(📜 2026-11-16 선생님 「A」 · 관리자 열쇠는 밖으로 안 보냄): 규칙이 허락한 칸만 = 읽기 photo · school/inbox · loginFail · teacherPush / 쓰기 relay · teacherPush 끝난 주소 지우기만 · 확인 = `node tools/relay/emu-check.mjs`(에뮬레이터)
- 비밀값: `RELAY_PASSWORD` · `VAPID_PRIVATE`(손발 비공개 폴더 vapid.json) · `RUN_KEY` = **Cloudflare 비밀값으로만** · 저장소 금지 · 공개값: DB_URL · API_KEY(웹 설정 공개값) · RELAY_EMAIL
- 옛 정식 서버(citadel-math)면 멈춤
- 올리기: `npx esbuild tools/relay/worker.js --bundle --format=esm --outfile=<폴더>/worker.js` → Cloudflare API(스크립트 + cron + 비밀값)
- 📥 꾸러미 내려받기 수 = `/kit`(세고 사이트 zip 으로 302) · `/kit-hit`(세기만 · 앱 「📥 꾸러미 받기」가 누를 때 신호) → 운영 서버 `relay/kit/{한국 날짜}` +1 · IP · 기기 정보 없음 · 읽기 = 손발이 읽어 머리에
- 시험: `tests/relay.test.ts` (암호화를 받는 쪽처럼 풀어 봄 · VAPID 서명 · 가짜 서버로 한 번 돌리기)
