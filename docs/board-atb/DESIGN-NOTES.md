# 📋 게시판 던전 개편 (가로 · JRPG · ATB) — 손발 #2 구조 설계 메모

> 상태: **확정안 기다리는 중** · 기능 코드 없음 · 가지 `board-atb`
> 근거: 이 저장소 `src/board/*` · `src/ui/board/*` · `firebase/database.rules.json` 읽은 결과.
> ⚠ 설계 자료(Citadel-MATH hero-v2 `docs/handoff/board-atb/` HANDOFF · STATS · MONSTERS)는 **아직 못 읽음** (저장소 붙이기 권한 막힘) — 확정안 · 자료 받으면 이 메모를 고침.

## 0. 지금 구조 한 장 요약

| 층 | 파일 | 하는 일 | 개편 때 |
|---|---|---|---|
| 규칙(순수) | `src/board/board.ts` | 판 구성(boardPack) · 소문제 수 · 등급 · 💎 · 첫 시도 | **그대로** (등급 · 💎 공식만 확정안 따라 숫자 바꿈) |
| 순위 | `src/board/ladder.ts` | 🛡 수호자 · 🌱 도전자 순위 | **그대로** |
| 목표 | `src/board/goals.ts` | ⭐ 지도 · 📕 오답 · 명성 | **그대로** |
| 팀 | `src/board/team.ts` | 모집 글 · 🔒 암호 · 합류 · 출발 · ⏸ 멈춤 시계 · 💡 힌트 · 🚨 강적 · 🤝 구조 · ⏱ 저절로 닫기 | **그대로 재사용** + 시계 부분만 ATB 로 확장 |
| 동료 | `src/ui/board/mates.ts` | 동료 공격 사건(hitsOf) · 줄 세우기 | 사건 → ATB 행동 연출 입력으로 재사용 |
| 화면 | `Board.svelte`(로비 · 419줄) | 게시판 · 모집 · 대기실 · 결과 · 정산 | 로비는 **세로 그대로**, 출발부터 가로 |
| 화면 | `BoardRun.svelte`(전투 · 325줄) | Student(레이드 화면) 감싸기 + 진행 맡기(bdrv) · 끝 처리 | **새 `AtbRun.svelte` 로 갈아 끼움** · 진행 맡기 · 끝 처리 로직은 떼어서 재사용 |

## 1. ⏱ ATB 시계 = 서버 시각 기준 (저장 안 하고 계산)

원칙: **게이지 값을 방에 1초마다 쓰지 않는다.** 방에는 "언제부터 · 얼마 속도로" 만 적고, 모든 폰이 `S.now()`(= 서버 시각, `server.ts` `Date.now()+offset`, `clock.svelte.ts serverNow`) 로 같은 값을 계산.

```ts
// 확장 예정 (src/board/atb.ts · 순수 함수 · 시험 쉬움)
interface Gauge { t0: number; spd: number; /* 1 = 100% 까지 걸리는 ms 의 역수 */ }
gameNow(R, now) = now - meta.board.t0 - meta.board.paused - (bp ? now - bp.at : 0)   // ← team.ts elapsed() 그대로
fill(g, R, now)  = clamp01((gameNow(R, now) - g.t0) * g.spd)                       // 0~1
ready(g, R, now) = fill(...) >= 1
```

- 행동(공격 · 스킬)을 하면 그 사람 칸만 한 번 씀: `atb/{pid} = { t0: 지금 게임 시각, spd }` → 다시 0 부터.
- ⏸ 수호자 멈춤 · 길잡이 생각 = 이미 있는 `state/bp` + `meta/board/paused` 를 **게임 시각** 에서 빼므로 게이지도 자동으로 멈춤 (새 코드 0).
- 몬스터 게이지도 같은 꼴(`atb/_m/{mid}`) · **몬스터 행동은 진행 맡은 폰(bdrv 리더)만** 씀 → 두 폰이 동시에 몬스터 공격을 쓰는 일 없음. 리더가 바뀌어도 `t0` 가 방에 있으니 이어서 계산.
- 시계 어긋남: 화면은 `clock.now`(200ms 틱) 하나만 읽음 → TV · 폰이 같은 초. 쓰기 경쟁은 "내 칸은 나만" 규칙이라 없음.
- 1인 판 = 메모리 방 · `Date.now()` · 같은 함수.

## 2. 🖥 가로 화면 틀 (전투만)

- 출발(포털 연출) 순간 `screen.orientation.lock('landscape')` 시도 → 실패(iOS · 데스크톱)면 세로일 때 「📱 폰을 눕혀요」 덮개. 끝나면 `unlock()`.
- 틀 (가로 640 × 360 기준 · 정수 배 · 대기 늘이기 0 원칙(b48) 지킴):

```
┌──────────────────────────────────────────────┐
│ ⏱ 남은 시간 선 · 차시 · ⏸/💡/🙋 도구          │ 40
├───────────────────────┬──────────────────────┤
│  몬스터 줄 (왼쪽)       │   용사 줄 (오른쪽 · 최대 4) │
│  HP 막대 · 행동 게이지   │   이름 · ATB 게이지 · ❤ ⚡ │ 200
├───────────────────────┴──────────────────────┤
│ 명령 창: [⚔ 공격=문제 열기] [스킬] [💡] … / 문제 시트 │ 120
└──────────────────────────────────────────────┘
```

- 문제 풀이 시트 = 지금 `battle/Sheet.svelte` + `BottomAction` 재사용, 가로에선 오른쪽 반 또는 아래 120px 창. (`--btn-h 56` 토큰 그대로)
- 확인할 크기: 640×360 · 844×390 · 915×412 (Camp.svelte 의 `orientation: landscape` 미디어 쿼리 꼴 따라감).

## 3. ♻ 지금 코드 재사용 표

| 지금 | 개편에서 |
|---|---|
| 모집 · 합류 · 준비 · 🔒 암호(`createLockedPost` · `joinLocked` · `boardLock` 규칙) | **손 안 댐** |
| `roleOf` 🛡/🌱 판정 · 명성 · 순위 | 손 안 댐 |
| `startTeam` | `meta/board` 에 ATB 칸(속도표 판 번호 등)만 더함 |
| `elapsed` · `timeLeft` · `pauseOn/Off` | ATB 게임 시각의 바탕 (위 1절) |
| `sendHint` · `stuckItem` · `hintOf` · 🚨 `strongOf` · 🤝 `rescuesOf` | 그대로 · 명령 창 단추로만 옮김 |
| `BoardRun` 의 진행 맡기(bdrv · LEASE) · 끝(`bend`) · 결과 붙잡기 | `src/board/drive.ts` 로 떼어 내 Run · AtbRun 둘 다 씀 (← 첫 손질 · 동작 같음 시험) |
| `mates.ts` hitsOf 사건 | ATB 행동 연출 줄 (공격 사건 → 용사 앞으로 나와 베기) |
| 채점(`submit` · `chainSubmit` · `bossSubmit`) · ❤ ⚡ 규칙 | 그대로 — 「공격 = 문제를 맞힘」 연결만 새로 |

## 4. ⚠ 머리에게 먼저 알릴 것 (규칙 파일)

`rooms/$code` 아래 **새 칸은 규칙에 없으면 못 씀** (state · meta 는 `T` 방이면 누구나). 개편이 필요로 할 칸:
- `atb/{pid}` (내 게이지 · 본인만) → `"atb": { "$pid": { ".write": "auth != null && root.child('pids/' + $pid + '/u').val() === auth.uid" } }`
- 몬스터 게이지 · 행동 = `state/atbM` 에 두면 **규칙 변경 없음** (state 는 T 방 누구나) ← 이 길을 추천.
→ 결국 `atb/{pid}` 하나만 추가가 필요할 수 있음. 확정안 보고 최종 목록 드림.

## 5. 확정안에서 꼭 받아야 할 답 (지금 막힌 결정)
1. 「공격」 = 문제 하나 맞히기? 게이지가 차야 문제가 열리나, 문제를 맞히면 게이지가 차나?
2. 몬스터 행동(용사 공격?) 이 ❤ 를 깎나 — 지금 ❤ 는 틀린 제출로만 깎임 (V4 규칙).
3. 속도(spd) 원천 = 용사 · 강화 · 스킬? (STATS.md)
4. 1인 판도 가로 · ATB 인가?
5. 시간 제한(소문제 × 90초) 유지?
6. 몬스터 그림 = MONSTERS.md · monsters-sheet.png 의 칸 크기 · 프레임 수.
