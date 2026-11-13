# 🏫 v1.0 층 나누기 조사 (2026-11-13 · 테스트 #1 · 코드 바꾸지 않음)

> 목표(선생님): 「학교판(배포판)과 정식판(이 될 v1.0)이 프로그램상 차이가 발생하지 않고 사용자의 선택에 의해 기능이 열리고 잠기게」
> 층 = 🦴 **뼈대**(늘 켜짐) · 🧩 **추가 기능**(스위치 · 필요한 것 = 과목 팩 · 일과표 · AI 키) · 📚 **과목 팩**(단원 내용 · 모루는 공통수학2 팩에만).
> ⚠ V1-DESIGN 10절이 hero-v2 에 아직 없어(19bf87c 기준) 요청 글의 층 정의로 나눔 · 10절과 다를 수 있는 칸 = 「(추정)」.
> 기준 판 = 테스트 저장소 b53 · 정식 = Citadel-MATH `release` 5ec29b6.

## ① 출시 전 빈칸 (정식 기능 ↔ v1.0)

(아래 「①」 절에 표 · 손발 조사 결과)

## ② 층 꼬리표 · 지금 코드에서 어긋나는 곳

### 잘 돼 있는 것 (먼저)
| 항목 | 지금 |
|---|---|
| 과목 내용 입구 | 엔진 → 과목 = `SUBJ` 한 곳(`src/engine/subject.ts` · #136). 단원 글자 · 집합 기호가 `src/subjects/` 밖 코드엔 거의 없음(아래 (나) 1곳) · 시험 `engine-clean` 이 지킴 |
| 과목 팩에 없어도 되는 칸 | `SUBJ.symtalk` · `cards` · `forge` · `funOx` · `rich` · `skillNames` = 「?」(없으면 글 그대로 · 0) — 기호 톡 · OX 는 이미 「없으면 꺼짐」 꼴 |
| 서버 주소 | Firebase 설정값 = 사이트의 `public/server.json` 하나(코드에 없음) · 운영(citadel-math) 금지 목록 → 학교마다 server.json 만 바꾸면 됨 |

### (가) 뼈대가 추가 기능을 바로 부르는 곳 (스위치가 들어갈 자리)
v1.0 엔 **기능 스위치 층이 아직 없음** → 아래는 모두 「늘 켜짐」. 스위치 하나(예: `features.ts` · 학교 설정 `school/features`)를 두고 이 자리들에서만 읽으면 됨.

| 추가 기능(층) | 필요한 것 | 뼈대 쪽 부르는 자리 | 지금 꺼지면? |
|---|---|---|---|
| ⚒ 모루 · 📖 도감 (🧩 · 📚 공통수학2만) | 과목 팩 `forge` · `cards` | `ui/camp/Camp.svelte` 캠프 물건 anvil(167줄 목록 · 238줄 시트) · `ui/forge/Anvil.svelte` · `ForgeCard.svelte` = `SUBJ.forge!`(느낌표 = 없으면 **깨짐**) · `ui/battle/SymSheet.svelte` 찜 ☆ → 모루 | **깨짐**(forge 없는 팩) — 캠프에서 모루 물건을 숨기는 갈림 필요 |
| 📖 기호 톡 (🧩 · 📚) | 과목 팩 `symtalk` | `ui/q/SymText.svelte`(모든 문제 글) · `Student.svelte` SymSheet | 이미 「없으면 글 그대로」 ✔ · 끄는 스위치만 없음 |
| 📋 게시판 던전 (🦴? · (추정) 뼈대) | 서버 | `Camp.svelte` dummy 물건 · `ui/board/*` | — |
| 🏰 성채 (🧩 · 📚 평가 팩) | 과목 팩 `camp.floors` · 평가 문항 | `Camp.svelte` castle 물건 · 212줄 시트 = 층 목록만 | 층 목록이 과목 팩에 필수 칸(`camp` 필수) |
| ✏ 출제 공방 · ⛺ 텐트 (🧩) | 서버 · (사진 = AI 키) | `Camp.svelte` tent 물건(빈 시트) | 빈 시트 |
| 📮 우편함 (🦴 (추정)) | 서버 | `Camp.svelte` · `Student.svelte` mailNew · `teacher/TNews` | — |
| 🏕 쉼터 놀이 · 🏰 디펜스 · ⭕ OX (🧩) | ⭕ = 과목 팩 `funOx` | `tv/TV.svelte` · `teacher/TLive.svelte` GAMES 목록 · `Student.svelte` FunPhone | OX 문장이 없으면 빈 목록(이미 `|| []`) · 놀이 하나씩 끄는 스위치 없음 |
| 💥 몬스터 공격 · 기력 카드 (🦴 (추정)) | 차시 팩 `attack` | `Student.svelte` · `tv/Arena.svelte` · `q/MonsterForm` · `ChainView` EnergyCard | — |
| 📅 시간표 · 교시 · 보스 타임바(문 닫기) (🧩 일과표) | 일과표 | `raid/actions.ts`(마감 = 교시 끝) · `teacher/THome`(오늘 시간표 칸) · `TPrep`(시간표 탭) · `TLive` · `TNews` | 늘 켜짐 · 정식 학교판은 숨김(bf6285f) |
| 📊 대시보드 성취기준 · 오개념 · 세특 문장 (🧩 · 📚) | 과목 팩 `standards` · `misconceptions` · `seteuk` | `school/dash.ts` · `school/seteuk.ts` · `teacher/Dash.svelte` | 필수 칸 · 정식 학교판은 숨김(f436a51) |
| 📷 사진 채점 · AI (🧩 AI 키) | AI 키 | `teacher/TMe` 「사진 채점 연결」(준비 중) | 아직 없음 |
| 🎬 영상 · 📄 학습지 그림(prep) (🦴 · 📚) | 차시 팩 · 서버 prep | `q/PrepImg` · TV | — |
| 🔊 소리 · 🎵 배경음 (🦴) | — | `ui/sound.svelte.ts` | — |

### (나) 코드에 박힌 단원 글자 · 차시 번호 · 집합 기호 (과목 팩으로 옮길 것)
| 자리 | 무엇 | 옮길 곳 |
|---|---|---|
| `src/raid/attacks.ts` 28~30줄 | 던전 특수 공격 = **차시 번호 8 · 9 · 10**(`special: 8`) → 공통수학2 차시 번호에 묶임 | 차시 팩 `boss.attack` 셋째 칸(짝 표 attacks.json 에 「+ mirror」처럼) · 엔진은 번호를 모름 |
| `src/ui/battle/AttackFx.svelte` 20줄 | ⚡ 파지직이 바꾸는 기호 목록 `∪∩⊂⊄∈∉=<>+−×÷ᶜ`(집합 기호) | 과목 팩 `rich`/`symtalk` 쪽 「기호 목록」 또는 「숫자 아닌 글자 아무거나」로 일반화 |
| `src/ui/AtkGallery.svelte` | 갤러리 = 「첫 일반 몬스터 · 첫 소레이드」(번호 없음 ✔) | 그대로 |
| `src/rest/funq.json` | ⚖ 밸런스 · 🔄 반대로 질문(음식 · 학교 · 게임) = 과목 무관 ✔ | 그대로(뼈대) |
| `index.html` `<title>` 「모두의 던전 v1.0 테스트」 | 이름 | 학교 설정(이름 · 로고) |
| `src/model/hero-data.json` 칭호 · 도감 문구 | 과목 무관 ✔(칭호 목록은 `SUBJ.titles`) | 그대로 |

### (다) 우리 학교에 묶인 값
| 자리 | 값 | 바꿀 꼴 |
|---|---|---|
| `src/school/school.ts` 8줄 | `CLASSES = ['1-1' … '1-8']` (1학년 8반) | 학교 설정(학년 · 반 수) · 명단에서 반 목록 만들기 |
| `src/school/school.ts` 10줄 | `BETA_DEFAULT = ['1-6']` (#162 ① 로 베타 반은 없앰 — 남은 값) | 지움 |
| `src/school/bells.ts` | `BELLS`(1~7교시 09:00 ~ · 50분) · `PERIODS`(요일별 교시 수) = 정식 sched.js 우리 학교 일과 | 🧩 일과표 = 학교 설정(교시 시각 표) · 없으면 「일과표 없음」 = 마감 = 지금 + 50분 |
| `src/ui/teacher/TPupils.svelte` 13 · 24줄 · `TNews.svelte` 36줄 | 처음 고른 반 `'1-3'`(선생님 담당 반) | 명단 첫 반 · 마지막에 본 반 |
| `src/ui/Hall.svelte` 17줄 · `TeacherApp.svelte` 62줄 | 시험 · 테스트 수업 반 `'1-1'` | 「테스트 반」 상수 하나 |
| `public/server.json` | 시험 서버 Firebase | 학교마다 파일 하나(코드 아님 ✔) |
| `src/subjects/active.ts` | 켜진 과목 팩 = 공통수학2 | 학교 설정(과목 팩 고르기) — 지금은 빌드 때 하나 |
| `src/school/dash.ts` 22줄 | 성취기준 = 「테스트 판 = 차시 묶음 셋」 | 과목 팩 `standards`(이미 있음) 로만 |

### (라) 「학교판이면 …」 갈림이 생길 자리 (스위치로 대신할 곳)
정식 학교판(079921e · bf6285f · f436a51 · fac796c)이 숨긴 것 = v1.0 에서 스위치 하나씩 읽을 자리:

| 정식 학교판이 숨긴 것 | v1.0 자리 | 스위치(제안) |
|---|---|---|
| ⚒ 모루 · 도감 | `Camp.svelte` anvil · `SymSheet` 찜 | `forge`(과목 팩에 forge 있을 때만 켤 수 있음) |
| 📖 기호 톡 | `SymText` · `SymSheet` | `symtalk` |
| 🏰 성채 | `Camp.svelte` castle | `castle`(평가 팩 있을 때만) |
| 📝 설문 · ✏ 출제 · ⛺ 텐트 | `Camp.svelte` tent · (설문은 v1.0 없음) | `quest` · `survey` |
| ⭕ OX | `TLive` · `TV` GAMES | `ox`(과목 팩 funOx 있을 때만) |
| 📅 시간표 · 예약 수업 · ➕ 보충 · 보스 타임바 · 진도 포인터 | `THome` · `TPrep` 시간표 탭 · `actions.ts` 마감 · `Board` 진도(`school/last`) | `timetable`(일과표 있을 때만) |
| 📊 대시보드 ⑤ 성취기준 · ⑥ 오개념 · 세특 성취기준 문장 | `Dash.svelte` · `dash.ts` · `seteuk.ts` | `standards`(과목 팩 standards 있을 때만) |
| 학교 로고 · 이름 · 과목 글자 | `index.html` · `Title.svelte` · `TV` 위 막대 | 학교 설정 `name` · `logo` |
| 새 판 = 수업 끝난 뒤 · 서버 준비 전 안내 | `App.svelte` checkVer(이미 수업 중 숨김 ✔) | 뼈대 그대로 |

→ 원칙 제안: 코드에 「학교판이면」을 쓰지 않고 **`feature(id)` 하나**만 읽음 · 켤 수 있는지 = 필요한 것(과목 팩 칸 · 일과표 · AI 키)이 있는지 · 켤지 = 학교 설정. 정식(우리 학교) = 모두 켬 · 학교판 = 기본 묶음.
