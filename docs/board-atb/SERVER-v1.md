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
| `snap` | 엔진 폰만 (host) · 5Hz | `{ v:1, n, t, host, at, ack:{ [uid]: 마지막 처리한 q }, j }` · j = State JSON **글자**(서버가 빈 배열을 지우지 않게 · 사건 마지막 40개 · 균형 기록 큰 배열 뺌) · 약 6 ~ 12 KB |
| `act/{uid}/{q}` | 그 학생만 · q = 1, 2, 3 … (그 학생이 늘려 씀 · push 키 대신) | `{ k:'atk', s, timing:'miss'‖'ok'‖'crit', auto? }` · `{ k:'skill', s, sk:'equip'‖'role'‖'heal'‖'revive'‖'aura'‖'awk', to? }` · `{ k:'earn', s, e:{ done, perfect, right, miss? } }` · s = 자리 번호(방장이 그 uid 자리인지 확인) · 반응 막기 = skill role |
| `hb/{uid}` | 그 학생만 | 시각 (3초마다) · 10초 끊김 = 봇이 이어받음(손발 #2) |
| `end/{uid}` | **그 학생 폰** (끝날 때 1번 · 손발 #2 바꿈: 규칙 = 자기 칸만 · 끊긴 학생은 안 씀) | `{ win, sec, right, total, first, perfect, stars, merit:{clear,star,first,act,role}, gem:{items,clear,guard}, role, why }` |

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
- ✅ `AtbNet.svelte` props: `{ S: Store, pid, uid, names?: {uid → 보이는 이름}, prevStars?: 0~3, mastery?: 이긴 판, onend(r: AtbEnd | null) }` — meta 읽고 엔진 / 받은 상태 / 행동 보내기 · 방장 넘김 · 봇 이어받기 · 결과 화면(「게시판으로」 = onend) 다 안에서 (src/ui/board/atb/AtbNet.svelte)
- ✅ meta.slots 모양 = `src/board/atb/net.ts` Slot (학생 `{ uid, cls, num, hero, lv, enh, tier, fx?, awk?, nick? }` · 봇 `{ bot:'normal', hero }`) · host 는 비어 있어도 됨(자리 순서 첫 살아 있는 학생이 가져감)
- ✅ names = 방 안 실명 규칙(같은 반 = 실명 · 다른 반 = 「1-3 실명」) · 나 = 「나」 · 봇 = 「🤖 모험가 A」 는 AtbNet 이 붙임
- ✅ `atbResultFor(S, idx, { prevStars }) → AtbEnd` (src/board/atb/net.ts) = `{ win, sec, right, total, first, perfect, stars, newStars, full, merit:{clear,star,first,act,role}, meritSum, gem:{items,clear,guard,star}, gemSum, role, mission, why }` · 공적 = 클리어 10 · 새 별 5 · 한 번에 맞힘 1 · (막기 + 구조 + 속성 브레이크) × 2 · 임무 5 · 💎 = 소문항 ×3(최대 30) · 클리어 10 · 수호 ×2(최대 10) · 새 별 20 · ⭐3 차시(prevStars 3) = 공적 · 💎 절반 · 하루 200 한도 = 손발 #1
- 🧪 시험: `?role=atbnet2`(테스트 주소) = 폰 두 대 iframe · 메모리 서버 칸 · `tools/e2e/atbnet.cjs`
- 끊김 · 방장 넘김 · 봇 이어받기 = AtbNet 안
