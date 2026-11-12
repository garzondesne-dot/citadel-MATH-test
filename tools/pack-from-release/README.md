# 🧩 차시 팩 변환기 (#132)

정식 저장소(Citadel-MATH)의 `lessons/set-NN.js` 를 v1.0 차시 팩으로 옮긴다. **문제 · 정답은 늘 정식 코드 원문** — 다시 만들지 않는다.

```bash
# 1) 선생님 입력판(아티팩트 db packs/{id})을 JSON 으로 내려받아 둔다 (ArtifactData list · out_dir)
# 2) 변환
node tools/pack-from-release/convert.mjs <정식 저장소 폴더> --board <입력판 폴더/packs> --only set-02,set-03,set-04,set-05
python3 tools/make-sprite-bbox.py   # 새 몬스터 줄 정중앙
npx vitest run tests/packs.test.ts   # 정식 독립 검산 원문 + 정식 출력과 글자까지 같음
```

| 만드는 것 | 내용 |
|---|---|
| `src/gens/official/set-NN.js` · `shim.js` | 정식 차시 파일 · DS.Rng · DS.SetGen 원문(모듈로 감쌈) |
| `src/gens/official/index.ts` | 생성기 이름 등록 (`set02.m1` · `set02.boss`) — 팩에는 이름만 |
| `src/packs/set-NN.json` | 팩 데이터 (단계 · 분 · 몬스터 · 형성평가 세트 · crops · videos · source) |
| `public/art/mon-*.webp` · `dg-*-v1h.webp` · `src/ui/sheets.gen.json` | 쓰는 몬스터 줄 · 던전 배경만 |
| `tests/official/` · `tests/fixtures/packs/` | 정식 독립 검산 시험 원문 · 정식 출력 기준값 |

입력판에서 반영하는 것: 단계 순서 · 제목 · 말할 거리 · 분 · 이름표(title · goal · theme · pct · next · std). 메모(memo)는 반영하지 않고 「📝 입력판 메모 n개」로 출력(문제를 바꾸는 일 = 학습지 컨펌 흐름). 입력판에만 있는 단계 · 뺀 단계도 출력.
