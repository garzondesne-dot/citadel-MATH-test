# 📦 공통수학2 풀 팩 (#136)

엔진(과목을 모르는 게임 뼈대)이 읽는 **과목 내용 전부**. 엔진은 `src/engine/subject.ts` 의 `SUBJ` 한 입구로만 읽는다.
지금 켜는 과목 = `src/subjects/active.ts` 한 줄. 이 폴더 밖에 과목 낱말 · 차시 id 가 없는지는 `tests/engine-clean.test.ts` 가 확인.

| 파일 | 내용 | 엔진이 읽는 곳 |
|---|---|---|
| `index.ts` | 팩 한 덩어리(Subject) | `SUBJ` |
| `subject.json` | 이름 · 기본 차시 · 성취기준 · 차시 목록(개념 3개씩) · 과목 칭호 · 캠프 / TV 이름표 · 세특 낱말 · 테스트 판 가짜 글 | 대시보드 · 학생 시트 · ⑫/⑰ · 칭호 · 캠프 · TV · 세특 · 소식 |
| `lessons/set-NN.json` | 차시 팩 2 ~ 10 (7 = 6의 parts) — 변환기가 만듦 | `engine/packs.ts` |
| `gens/official/*` · `gens/set06.ts` · `gens/index.ts` | 숫자 생성기(정식 원문) · 이름 등록 | `engine/registry.ts` |
| `themes.json` | 몬스터 줄 · 던전 배경 표 (그림은 public/art) | `ui/manifest.ts` |
| `symtalk.ts` | 기호 톡 사전 + 문제 글에서 기호 찾기 | SymText · SymSheet |
| `symcard.ts` | 기호 → 모루 카드 · 찜 수 | SymSheet · 캠프 |
| `mis-codes.json` | 오개념 사전 (세특 문구) | 세특 · 대시보드 |
| `venn.ts` · `ui/Venn.svelte` · `ui/Figure.svelte` | 문제 글 · 보기 그림(벤 · 색칠) · 글로 바꾸기 | SymText · Choices · 채점표 |
| `formats.ts` · `ui/SubsetBuilder.svelte` · `sets.ts` | 과목 고유 문항 꼴 「부분집합 모두 쓰기」(그림 · 채점 · 답 줄) | QItem · grade · input |

아직 없는 것(테스트 판에 기능이 없어 자리만): 모루 카드 전체 · 레시피 · 서술 채점 기준 · 성채 단원 평가 문항 · 쉼터 수학 OX · 낱말 자료(WORDS) · 힌트 — 그 기능을 만들 때 이 폴더에 더한다.
