# 🔌 시험 서버 (#137) — 시험 전용 Firebase 프로젝트 · 운영(citadel-math)과 따로

| 파일 | 쓰임 |
|---|---|
| `database.rules.json` | 시험 프로젝트 규칙 (로그인한 사람만 읽기 · rooms · school · gifts · mail 쓰기 · accounts/{반}/{번호} = 그 학생만) — Firebase 콘솔에 게시 |
| `firebase.json` | 에뮬레이터 설정 (Database 9000 · Auth 9099 · 프로젝트 `demo-citadel-test`) |
| `../public/server.json` | 「어느 서버」 한 곳 — `{ "mode": "device" }`(이 기기) 또는 `{ "mode": "server", "firebase": { …웹 설정값… } }` |

## 선생님 손 (머리 방이 순서 안내)
1. Firebase 콘솔 → 새 프로젝트(예: citadel-math-test) → Realtime Database 만들기 → Authentication 에서 「이메일/비밀번호」 · 「익명」 켜기.
2. 프로젝트 설정 → 웹 앱 추가 → 나오는 웹 설정값(apiKey · authDomain · databaseURL · projectId · appId)을 손발 방에 전달 → `public/server.json` 에 넣음.
3. Realtime Database → 규칙 → `database.rules.json` 내용을 붙여 넣고 게시.

⚠ 운영 프로젝트(`citadel-math`) 설정값을 넣으면 앱이 연결을 거부하고 붉은 띠를 띄움(`src/store/config.ts` isForbidden).

## 에뮬레이터로 시험
```bash
cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test
```
주소에 `?emu=127.0.0.1` → 이 브라우저가 에뮬레이터에 붙음(`?emu=off` 로 끔) · 시험: `tools/e2e/server.cjs`(브라우저 5개) · `tests/server.test.ts`(30명 동시 제출 · 에뮬레이터 없으면 건너뜀).

## ⚠ 출시 전 메모 (지금 고치지 않음 · 머리 방 #137)
- accounts 규칙의 `newData.child('uid').val() === auth.uid` = 로그인한 누구나 남의 계정 칸을 자기 uid 로 덮을 수 있음(가로채기) → 출시 판은 「없을 때만 만들기 · 그 뒤엔 그 uid 만」으로 좁힘.
- 읽기가 「로그인한 사람 모두 · 전체」 → 출시 판은 정식 규칙 수준(반 · 방 · 자기 칸)으로 좁힘.
- 거울이 맨 윗칸(rooms · school …)을 통째로 받음 → 출시 판은 방 단위로 나눔.

## 지금 켠 시험 프로젝트
`citadel-math-test-c6a9b` (싱가포르) · `public/server.json` 한 곳 · 애널리틱스 SDK 안 씀(measurementId 없음) · 내 컴퓨터(localhost)는 늘 「이 기기」(`?server=on` 으로만 서버) · 서버가 안 닿거나 규칙 게시 전이면 8 ~ 10초 뒤 빈 화면 없이 열림(쓰기는 실패 · 콘솔에 남음).
