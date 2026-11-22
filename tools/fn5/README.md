# 📦 함수 던전 몬스터 묶음 (#106)

묶음 한 장 = 차시 하나(14 ~ 17) · 줄 = 몬스터(마지막 줄 = 👑 보스) · 칸 5 = 대기 A · 대기 B · 공격 · 맞음 · 쓰러짐 · 바탕 마젠타.
줄 순서 · 이름 · 임시 그림 = `src/subjects/common-math2/themes.json` 의 `bundles`.

| 할 일 | 방법 |
|---|---|
| 묶음이 왔을 때 | 원본을 한 폴더에 `fn5-14-src-v1.png` 꼴로 두고 `python3 tools/fn5/build.py <폴더>` |
| 한 줄만 다시 뽑아 왔을 때 | 같은 폴더에 낱장 `f14-m01-src-v2.png`(5칸 한 줄)를 더 두고 다시 실행 → 그 줄만 바뀜 |
| 하나만 굽기 | `python3 tools/fn5/build.py <폴더> fn5-15` |

- 결과 = `public/art/fn5/fn5-14-v<n>.webp`(그림이 바뀌면 n + 1 · 옛 파일 지움) + `themes.json` `sheets.fn5-14`(cols 5) + `src/ui/sprite-bbox.json`.
- 그림이 들어오기 전엔 `fn5-14:줄` = 그 줄의 임시 그림(`bundles.*.temp`) → 차시 팩은 지금부터 `fn5-14:0` 으로 써도 됨.
- 게시판 던전(14 ~ 17) = 그림이 오면 연습 첫 몬스터 · 일반 둘째 · 도전 👑 보스 줄(`rdunBoss.ts fnRef`).
- 자르기 = `tools/rdun/cut.py --norune`(룬 원판 처리 안 함 · 청록 구슬이 그림의 일부라서).
