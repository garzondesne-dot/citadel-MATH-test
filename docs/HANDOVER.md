# 🤝 시험 저장소 인계 (citadel-MATH-test · 손발 테스트 방) — b41 · 2026-11-12

정식(Citadel-MATH)을 새로 짓는 v1.0 시험판. 운영 Firebase(`citadel-math`)에는 절대 붙지 않음(코드가 빨간 띠로 거부). 시험 서버 = `public/server.json`(citadel-math-test) · 에뮬레이터 = `?emu=127.0.0.1`.

## 1. 지금 있는 것 (요청 번호 · 판)
| 판 | 요청 | 들어간 것 |
|---|---|---|
| b25 | #137 · #141 | 시험 서버 연결 · 학생 기록 정식 경로(accounts · gem · xp · cards · records · bonus) |
| b26 | #142-1 | 🏕 쉼터 놀이 ⚖ · 🔄 · ⭕ · 🙊 (정식 fun.js · nunchi.js 판정 · 정식 시험 원문 통과) |
| b27 | #144 | 🎨 테마 11 + 🏛 클래식(고른 폰만 받음) · 업적 잠금 |
| b28 | #145 | 엑셀 이름 · 캠프 360 × 640 겹침 0 |
| b29 · b31 | #142-2 · #146 | 🏰 디펜스(정식 td.js 계산 · 타워 힘 모두 같음) · 교환 · 업그레이드 고르기 · 용사 바꾸기 · 컷인 · 🎵 쉼터 곡 · 놀이 그림 |
| b30 · b32 · b33 | #143 · #147 | 📋 게시판 던전 1인 · 팀(모집 · 합류 · 대기실 · 수호자 · 힌트 · 멈춤 · 순위) · 🔁 진행 이어받기 |
| b34 ~ b36 | #148 · #150 | 룬 키패드 그림 · ⚒ 모루(정식 연성 · 카드 54 · 도감 · 특전) |
| b41 | #152 | 💥 몬스터 공격 6종(등록 표 raid/attacks.ts · 차시 팩 attack · 보스 번갈아 · 짝 표 tools/pack-from-release/attacks.json) · ▢ 도전 칸(✔ · 노랑 · −) · ⚡ 기력(충전 · ⛓ 묶기 · 💚 친구 힐 · 🌟 필살기 조건) |
| b40 | #163 ②③④ | 🔁 정식 칸 꼴(수업 기록 mons o·f·x·-·n · bossM · boss · bossN · won / 💎 · EXP · 카드 = 칸마다 써서 정식 칸 안 지움 · buy 지도 → 경제 0판 이전 / 명단 roster · rosterMask · 시험 계정 tester) · 복사 도구 `tools/copy-from-release` · 옮긴 계정 = 처음 로그인으로 잇기 · ⏸ 수업 중 새 판 알림 미룸 |
| b39 | #157 · #158 · #159 · #160 | 📺 TV 전투 장면 = PixiJS 8.6.6 캔버스(TV 에서만 불러옴 · WebGL 없으면 같은 배치 DOM · `?dom`) · TV 글자 4 크기 · 2 굵기 · 🎮 시연 = 학생 폰 화면 그대로(메모리 방) · 📄 학습지 칸 그림(prep) · ⌨ 정식 룬 · ⚔ 졸개 자리 · 형광펜 · 게시판 7차시 |
| b38 | #151 | 🟡 주요 단추 = 모든 학생 화면 한 자리(BottomAction 하나 · 56 · 바닥 20 · 폭 양옆 16) · 💥 피격 = 장면 띠 안 알림 + 문제 카드 덮개(움직임 0) |
| b37 | #149 | ✂ 6차시 = 문제 1 ~ 3 + 형성평가 1 ~ 3 · 7차시 = 문제 4 ~ 7 + 형성평가 4 ~ 6 (`parts[].boss` · 재도전 = 원래 번호) |

## 2. 서버 칸 (이 판이 쓰는 곳)
| 칸 | 쓰는 곳 | 내용 |
|---|---|---|
| `rooms/{코드}` | 수업 · 쉼터 · 디펜스 · 팀 방(`T…`) | 레이드 방 + `fun` · `fv` · `nun*` · `tdp · tdm · tdu · tdt · tdl` · `tvAt` · 팀 `bdrv/{uid}` · `bh` · `help` · `meta.board` · `state.bp · bend` |
| `school/board/posts/{pid}` | 게시판 모집 글 | lesson · no · host · phase(wait · play · done) · code · mem/{uid} = 반 · 번호 · 용사 · 역할 · 이유 · 준비 |
| `school/board/rank/{차시}/{주}/{팀}` | 익명 순위 | s(최강) · g(성장) · c(협동) |
| `school/funUsed · funStats · teacher/restMin · teacher/theme` | 쉼터 · 테마 | 정식과 같은 뜻 |
| `gifts/{uid}/fun{g} · td{날짜}_n` | 쉼터 · 디펜스 보상 | 캠프에서 지갑 · EXP |
| `gem/{반}/{번호}/day/{YYYY-MM-DD}` | 💎 하루 한도 | 정식 gem.day 와 같은 꼴(KST · 날짜마다 남김) |
| `roster/{반}/{번호}` · `rosterMask/{반}/{번호}` · `tester/{반}/{번호}` | 명단 · 가린 이름 · 시험 계정 (#163) | 정식 칸 그대로 · 옛 `school/roster` · `school/test` 도 읽음 |
| `prep/{차시}/img/{칸}` | 📄 학습지 칸 그림 (#158) | webp data URL · 정식 경로 그대로 · 실시간 거울 밖(그 단계에서만 한 장씩) · 나눈 차시(7차시)는 원래 차시 칸 |
| `accounts/{반}/{번호}/theme` | 🎨 테마 | 정식에 없는 칸(새로 더함) |
| `bonus/{반}/{번호}/review/{차시}/{문제}` | 📕 복습 완료 기록 | ⚠ 정식 꼴과 다름(아래 메모 3) |

## 3. 시험
- 단위: `npm test`(153) · 화면: `npm run build` → `npx vite preview --port 4173` → `NODE_PATH=$(npm root -g) node tools/e2e/<이름>.cjs <그림 폴더>`
- 에뮬레이터가 필요한 것: `rest` · `td` · `team` · `team-drv` · `me` · `gate` · `server` (`cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test`)
- 이 기기만: `board` · `theme` · `camp` · `myhero` · `tabs`(한글 파일 이름 = 브라우저 `LANG=ko_KR.UTF-8`)
- 화면 시험 고리(학생 화면엔 안 보임): `window.__board`(지금 단계 맞히기 · 틀리기) · `__BOARD_SEC` · `__TD_PICK` · `__TD_SPEED` · `__bgm` · `__strike(ms, 종류)`(몬스터 공격 한 번 · pause · glitch · fog · ice · fire · smash) · `__tvFake(n)`(TV 방에 가상 학생 n) · `__arena`(TV 장면 그리기 방식 · 배치 · 체력)
- 🟡 주요 단추 시험: `mainbtn`(이 기기 · 학생 화면 17곳 × 360 × 640 · 390 × 844 · 830 × 900 · 교사 폰 68 · 피격 전후 rect) — 학생 화면의 노란 주요 단추는 `src/ui/battle/BottomAction.svelte` 하나로만(`dock` = 화면 바닥 고정 · `dock={false}` = 바닥에 붙은 판 안 마지막 줄)

## 4. 📌 출시 전 메모 (아직 안 함 · 머리 방 · 선생님 결정 필요한 것 포함)
1. **규칙 좁히기** (`firebase/database.rules.json`): 지금 `rooms` · `school` · `gifts` · `mail` = 로그인(익명 포함)이면 누구나 씀 → 출시 전에
   - `school/board/posts/{pid}/mem/{uid}` = 그 학생만 · 글 지우기 = 글 올린 학생만 · `school/board/rank` = 새로 쓰기만
   - `gifts/{uid}` = 그 학생(쉼터 · 디펜스 보상) · 교사 계정(선물)만 · `school/teacher/*` · `school/sched` · `school/last*` = 교사만
   - `rooms/{코드}/players/{uid}` · `subs/*/{uid}` = 그 학생만 · 방 meta · state = 교사 · TV · 팀 진행 폰만
2. ✅ (b40) **records 칸 이름 맞추기** — 정식 꼴로 씀(school/records.ts) · 옛 메모: 정식 = `records/{반}/{번호}/{차시}` = `mons · bossM · loot …` / 이 판 = `mons · boss{ok, items, won} · right · total · no · at · code` → `boss` ↔ `bossM` · `loot` 없음 · 추가 칸(right · total · won)을 정식 이름으로 옮길지 정하기
3. **bonus 칸 꼴**: 정식 = `bonus/{반}/{번호}/{차시}/{방}` = clear · tries · mis / 이 판 「복습 완료」 = `bonus/{반}/{번호}/review/{차시}/{문제}` → 오답노트(⛺ 텐트 시안) 만들 때 정식 꼴(`{차시}/{방}.mis` 비우기)로 바꾸기
4. **accounts 새 칸**: `theme`(정식 없음) · 정식의 `gen · fx` 는 이 판에서 아직 안 씀
5. **화면 시험 고리 빼기 · 가리기**: 3절의 `window.__*` 를 출시 판에서 빼거나 시험 주소에서만 켜기
6. **?as 시험 폰**: 쉼터 · 디펜스 보상을 그 번호의 진짜 학생 `gifts` 에 씀 → 시험 폰이면 쓰지 않게
7. **팀 진행 이어받기**: 남은 팀원이 모두 끊기면 진행이 멈춤(다시 들어오면 이어짐) · 진행 폰이 바뀌는 순간 「다음 ▶」가 1 ~ 2초 늦을 수 있음
8. **디펜스 계산**: 시작 때 난이도 맞추기(calibrate)로 TV 가 1 ~ 2초 멈칫(정식과 같은 계산) · 균형 시험은 하지 않음(확정안)
9. **에셋**: 클래식(`public/classic`) · 쉼터 곡(`public/bgm` · JDSherbert 표기) · 놀이 · 디펜스 그림(`public/art/fun · td`) = 정식 저장소에서 복사 · 출처 `public/bgm/CREDITS.md` · Galmuri OFL
10. **6 · 7차시 나누기 (#149)**: 정식 6차시 기록의 u4 ~ u7 · 보스(형성평가 4 ~ 6) = v1.0 7차시로 옮겨 셈 (records 옮길 때 · 보스 items 0 ~ 2 = 6차시 · 3 ~ 5 = 7차시 0 ~ 2)
11. **prep 쓰기 = 교사만** (#158): 시험 판은 로그인이면 씀 → 출시 전 규칙에서 교사(또는 복사 도구)만
12. **TV 장면 PixiJS** (#157): `pixi.js` 8.6.6 고정 · TV 만 import() · 학생 폰 번들 0(시험 `tvarena`) · 이펙트 층(`fx`) = #152 · #161 몬스터 공격 이펙트 자리 · 콤보 미터는 v1.0 에 아직 없음
13. **복사 도구** (#163 ②): `FIREBASE_SA_JSON=… COPY_EMAIL=… COPY_PW=… node tools/copy-from-release/copy.mjs --dry` → 숫자 확인 → `--dry` 빼고 · 정식은 GET 만(시험 copytool) · 옮긴 계정 = `reset: true` → 그 반 · 번호 · 4자리로 처음 로그인하면 이어짐 · 규칙 좁히기(①) 뒤에는 복사 도구 uid 를 규칙에 넣어야 씀
