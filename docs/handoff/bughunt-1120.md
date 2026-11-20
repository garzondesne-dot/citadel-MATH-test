# 🐞 버그 사냥 11/20 (가지 `bughunt`) — 꼴별 전체 찾기

> 학생 이름 없음 · 반-번호만. 운영 서버 = 읽기 도구만 만듦(실행은 선생님 열쇠로). 정식 배포 · 규칙 게시 안 함.

## ① 받기 전 빈 값 · ② 통째로 덮어쓰기 — 위험도 순

| # | 심각도 | 어디 | 꼴 | 원인 | 고침 |
|---|---|---|---|---|---|
| 1 | 🚨 기록 사라짐 | `store/me.svelte.ts` toServer | ② | 지갑 저장 = 이 폰 메모리 값을 `total · scroll · enh · buy · day · xp` 에 **절대값**으로 씀 → 폰 두 대 · 수업 보상 · 선물이 서로 지움 (e2e: 옛 main = 💎 350 → 295 · 선물 +50 사라짐) | 마지막으로 맞춘 서버 값(base) 기억 · 수 칸 = 차이만 `increment` · 나머지 = 바뀐 칸만 · `buy` = 서버 최신과 합침(`transaction`) · 서버가 바뀌면 이 폰 값도 옮김(rebase) |
| 2 | 🚨 기록 사라짐 | `ui/Student.svelte` payReward | ①② | 수업 끝 보상이 `gem · xp · records · held` 를 **받기 전** 빈 값으로 읽음 → `total = 0 + 보상` 덮어씀 · 옛 수업 기록 prev = null 로 덮음 · 🎁 첫 출정 · 🔁 연속 다시 줌 | 네 칸을 받은 뒤에만(최대 120초 · 못 받으면 안내 줄) · total = 더하기 |
| 3 | 🚨 선물 사라짐 | `store/me.svelte.ts` (11/20 고침 955f122 의 옆 구멍) | ① | 받기 전(pending) 화면에서 받은 선물 💎 가 받은 뒤 `Object.assign(me, load())` 로 덮여 없어짐 (선물은 got 표시됨) | rebase = 그동안 늘어난 몫을 서버 값에 더해 저장 |
| 4 | 🔴 (이번 고침에서 생긴 것 · 바로 잡음) | `store/server.ts` add | ② | `setIn` 이 경로 배열을 줄여 increment 가 한 단 위(`gem/{반}/{번호}`)로 감 | 사본 · 에뮬레이터 시험 serveradd |
| 5 | 🟠 | `App.svelte` 캠프 입구 | ① | 캠프 · 허수아비 · 성채 · 게시판 · 도전과제가 열 때 한 번 읽은 빈 기록으로 「처음」 판단 | 묶인 학생 = 내 칸 6개(gem · xp · accounts · cards · records · bonus) 받은 뒤 캠프 (📦 내 기록 불러오는 중… · 20초 넘으면 엶) |
| 6 | 🟠 | `school/school.ts` 가입 | ①② | 계정 칸을 받기 전 「없음」 → `accounts/{반}/{번호}` 를 `{ uid, at }` 통째로 → 용사 · 호칭 · 테마 지움 | uid · at 칸마다 |
| 7 | 🟠 | `ui/dummy/Dummy.svelte` credit | ② | `bonus/…/{차시}/{몬스터}` = `{...옛 값, tries+1}` 통째로 → 옛 값이 비면 clear 지움 | tries = 더하기 · clear(true 만) · at · fixAt 칸마다 |
| 9 | 🟡 두 번 지급 | `school/mailbox.ts` claim · 캠프 선물 자동 받기 | ② | `got` 확인이 거울 → 폰 두 대가 같은 순간 받으면 두 번 | `claimOnce` = got 을 transaction 으로 먼저 · 이긴 폰만 지갑에 · 우편함 「받기」 두 번 누름 막음 |
| 8 | 🟡 두 번 지급 | 도전과제 받기 · 설문 보상 · 💬 마지막 한마디 EXP | ① | log 칸을 받기 전 「안 받음」 | 받기 전 = 안 줌 · EXP = 더하기 |

### 남은 것 (이번에 안 고침 · 이유)
| 심각도 | 어디 | 꼴 | 메모 |
|---|---|---|---|
| 🟡 | `ui/castle/Castle.svelte` photoWin · 방 기록 | ② | `{...keep, clear, ph, …}` 통째로 (pend · ans 를 지우려는 뜻) — 캠프 입구 문(5)으로 받기 전은 막힘 · 두 기기 동시만 남음 |
| 🟡 | 💎 로 사기 두 기기 동시 | ② | 차이 더하기라 둘 다 빠짐 → 💎 가 음수 될 수 있음 (건강 검진 ③ 이 잡음) |
| 🟡 | 성채 진도 · 퀘스트 · 게시판 기록 = 열 때 한 번(untrack) | ① | 캠프 입구 문 덕분에 첫 값은 맞음 · 열어 둔 채 수업이 끝나면 다시 열어야 새 방 |
| ⚪ | `school/records.ts` classRecords(교사 폰) ↔ 학생 폰 같은 기록 줄 | ② | 같은 방 데이터로 같은 값을 씀 · 두 번 써도 내용 같음 |

## ③ 반쪽 데이터
- `store/tidy.ts`: 반쪽 방(state · meta 가 객체 아님) = 없음 · 방 안 접속 신호만 남은 `players` 줄 · 숫자 줄 = 뺌 · 방 목록의 null 방 = 뺌 (서버 거울 get · watch · fetch)
- `App.svelte`: `svelte:boundary` = 그리기가 터져도 앱 전체가 멈추지 않음 (⚠ 안내 · ↻ 다시 그리기 · 새로 고침)

## 시험
- 단위: `wallet2dev`(두 기기 · 보상 뒤 저장 · 받기 전 선물 · 새 학생) · `mepending` · `halfdata` · `health` · `serveradd`(에뮬레이터) — 옛 코드에서 실패 재현
- e2e: `tools/e2e/wallet2dev-emu.cjs` · 느린 조건 `node -r ./tools/e2e/_slow.cjs …` · 전체 `tools/e2e/slowall.cjs`

## 🩺 운영 건강 검진 (읽기만)
`node tools/ops/health.mjs <서버 주소> <열쇠 헤더 파일> [--json 결과.json]` — GET 만 · ① 갑자기 0(💎 · EXP · 용사가 함께 0 인데 받은 기록 · 수업 기록 있음) ② 반쪽 노드 ③ 음수 · 글자 · 범위 밖 · 산 것 겹침 · 선물 이상값 · 반-번호만 찍음. 문제가 있으면 종료 코드 1.
