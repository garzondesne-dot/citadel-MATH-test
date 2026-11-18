# ✏ 사진 채점 중계소 + 출제 분석 (#75)

`photo-grade.gs` = 정식 `tools/apps-script/photo-grade.gs`(hero-v2) 그대로 + 맨 아래 「✏ 출제 공방 · 출제 분석」 절(`kind: 'quest'`).
사진 채점 길은 한 글자도 바꾸지 않음 (`handle_` 첫 줄에 `quest` 갈래 한 줄만 더함).

## 선생님이 할 일 (정식 배포 때 한 번)
1. Apps Script 편집기 → 지금 `photo-grade.gs` 내용을 이 파일로 통째로 바꿔 붙여 넣기 → 저장
2. 배포 → 배포 관리 → ✏ 지금 배포 → 버전 「새 버전」 → 배포 (웹 앱 주소는 그대로)
3. 스크립트 속성은 그대로 (새로 넣을 것 없음 · 키는 지금 것)
4. (선택) 게임 Firebase `gcfg/quest` = `{ "on": true, "daily": 3 }` — 없으면 켜짐 · 하루 3번

## 저장 칸 (Firebase 규칙 게시 필요 · `firebase/database.rules.json`)
| 칸 | 누가 씀 | 누가 읽음 |
|---|---|---|
| `quest/{반}/{번호}/{id}` | 중계소 · 교사 | 그 학생 · 교사 |
| `quest_q/{반}/{번호}/{날짜}` | 중계소 | 그 학생 · 교사 |
| `school/qboard/{반}/{id}` (🔵 친구 문제) | 교사(승인) · `solved/{uid}` = 그 학생 한 번 | 로그인 |
| `school/hall/{id}` (🟣 명예의 전당) | 교사(승인) · `like/{uid}` · `solved/{uid}` = 그 학생 | 로그인 |

사진 · 이름은 어디에도 저장하지 않음 (폰에서 모서리로 펴고 맨 위 이름 띠를 흰색으로 가린 뒤 보냄 · 중계소는 결과 글자만 저장).
