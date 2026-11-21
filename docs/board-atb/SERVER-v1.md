# 📡 게시판 던전(ATB) ↔ 베타 학생 게시판 · 서버 칸 v1 (#48 · #51 · 2026-11-21 · 손발 #1 초안 → 손발 #2 와 맞춤)

> 손발 #1 = 게시판 · 대기실 · 서버 칸 · 규칙 · 기록 · 반 공적 · 주간 마감 · 깃발 · 교사 반 이름 · 에뮬레이터 시험
> 손발 #2 = 전투 엔진 네트워크(방장 엔진 · 행동 받기 · 봇 이어받기) · 결과 화면 · 공적 / 💎 / ⭐ 계산 함수
> uid = 앱 학생 id(`s1_3_7` = pids/{uid}/u 가 auth uid) · 시각 = `S.now()`(서버 시계 맞춘 값)

## 1. 흐름 (글 · 방 · 합류 · 암호 · 정원 · 대기실 = 지금 그대로)
1. 모집 → 합류(4명 정원 · #47 줄 세우기) → 준비 → 방장 「출발」
2. **출발 = 손발 #1 `startAtb(S, L, post)`**: `atb/{pid}/meta` 를 씀(아래) · 글 `phase = 'play'` · `code = 'A' + pid`
3. 모든 폰: 글 phase=play + `atb/{pid}/meta` 있음 → 게시판 화면이 **`<AtbNet pid>`(손발 #2)** 를 띄움 (옛 BoardRun 대신)
4. 끝 → 손발 #2 가 `atb/{pid}/end/{uid}` 결과를 씀 → 손발 #1 `saveAtbResult()` 가 학생 기록 · 반 공적 · 💎(스위치) 처리 → 결과 화면(손발 #2) → 「게시판으로」

## 2. 서버 칸 `atb/{pid}` (새 칸 · 규칙 게시 필요)
| 칸 | 누가 씀 | 모양 |
|---|---|---|
| `meta` | 출발 때 방장 1번 (글 host) | `{ v:1, pid, lid, no, diff:'normal', seed, t0, slots:[{ uid, cls, num, hero, lv, enh, tier, fx, awk, nick } ‖ { bot:'normal', hero }] }` (빈자리 = 봇 · 4칸 고정) |
| `host` | 지금 엔진 폰 uid · 끊기면 다음 사람이 가져감 | `'s1_3_7'` |
| `snap` | 엔진 폰만 (host) · 5Hz | 손발 #2 정함 (State 줄인 꼴 · `n` 사건 번호 포함) |
| `act/{uid}` | 그 학생만 · push 키 | `{ k, at, ... }` 손발 #2 정함 (atk · skill · quiz 답 · react) |
| `hb/{uid}` | 그 학생만 | 시각 (3초마다) · 10초 끊김 = 봇이 이어받음(손발 #2) |
| `end/{uid}` | 엔진 폰 (끝날 때 1번) | `{ win, sec, right, total, first, perfect, stars, merit:{clear,star,first,act,role}, gem:{items,clear,guard}, role, why }` |

- 판 끝나고 24시간 = 게시판 청소(sweep)가 `atb/{pid}` 도 지움(지금 글 청소와 같이).
- 🧪 테스트 반 · 연습방 = `atb` 안 씀(로컬 그대로) · 기록 · 공적 없음.

## 3. 학생 기록 (손발 #1 · 지금 칸 재사용)
- `bonus/{cls}/{num}/board/{lid}_{at36}` = `{ at, lid, no, n, role, win, sec, right, total, stars, merit }` (옛 board 기록과 같은 자리 · 칸 더함)
- ⭐ 차시 정복 지도 = `bonus/{cls}/{num}/boardStar/{lid}` = 지금까지 최고 별(0~3) · **처음 얻는 별만** 공적 +5 · 💎 +20 (⭐ 골고루 돌기)
- ⭐3 다 모은 차시 = 그 판 💎 · 공적 절반 (계산 = 손발 #2 함수가 `prevStars` 받아서)

## 4. 반 대항전 「기사단 토벌 주간」 (#51 · 손발 #1)
| 칸 | 누가 | 모양 |
|---|---|---|
| `classWar/{week}/sum/{cls}` | 학생(자기 판 끝) · increment | 공적 합(숫자) · 한 번에 +200 넘게 못 더함(규칙) |
| `classWar/{week}/by/{cls}/{num}` | 그 학생 · increment | 내 공적(반 안 순위 · 기여) |
| `classWar/{week}/done` | 교사만 | `{ at, rank:[cls…], paid:bool }` 마감 기록 |
| `school/knights/{cls}` | 교사만 | `{ name, crest }` (처음 값 = 설계 문서 표) |
| `school/war` | 교사만 | `{ pay: false }` 💎 지급 스위치(베타 = 끔) |
- `week` = 그 주 월요일 KST 날짜 `2026-11-16`
- **주간 마감**: 서버 함수가 없으므로 **월요일 0시 뒤 처음 접속한 교사 기기**가 지난주 `done` 이 없으면 순위 확정 → `done` 씀 → `pay` 켜져 있으면 반 학생마다 우편 선물 `gifts/{uid}/war_{week}` = `{ g:300|150|100, fun:'⚔ 토벌 주간 보상', got:false, hold:true }`
- 1-6(테스트 반) = 순위 밖 · 교사 = 왕실 근위대(공적 안 셈)

## 5. 화면 (손발 #1)
- 게시판 맨 위: 「⚔ 토벌 주간 · 남은 n일」 + 5 기사단 깃발 막대(공적) · 우리 반 강조 · 지난주 왕의 깃발
- 학생 캠프 · 종합실 대기 화면: 왕의 깃발 기사단 · 우리 반 순위 한 줄
- 교사(나 탭 ⚙): 반 이름 · 문장 바꾸기 · 💎 지급 켜기/끄기
- 옛 랭킹 탭(rk2 · rank) = 기사단 막대로 바꿈(옛 칸 읽기만 남김)

## 6. 손발 #2 에 바라는 것 (서로 맞출 함수)
- `AtbNet.svelte` props: `{ S: Store, pid, uid, onend(results) }` — meta 읽고 엔진 / 관전 / 행동 보내기 다 안에서
- `atbResultFor(S: State, idx, ctx:{ prevStars }) → end/{uid} 모양` (공적 · 💎 · ⭐)
- 끊김 · 방장 넘김 · 봇 이어받기 = AtbNet 안
