# 모두의 던전 v1.0 테스트 (BETA)

정식(`Citadel-MATH`)을 새로 짓는 테스트 버전. 서버에 닿지 않음(이 기기 저장).
주소: https://garzondesne-dot.github.io/citadel-MATH-test/

| 자리 | 내용 |
|---|---|
| `src/model/` | 데이터 모양(차시 팩 · 다른 점 표 · 저장 꽂개 · 방) |
| `src/engine/` | 난수 · 채점 · 차시 팩 → 문항 (정식과 같은 동작) |
| `src/gens/` | 이름 등록 생성기 (차시 팩 JSON 은 이름만) |
| `src/raid/` | 던전 엔진: 단계 흐름 · 재도전 v3 · 힐 · 보스 · 정찰 · 공격 시계 · 방 쓰기 (모드 분기 없음 · 방 meta 값만 읽음) |
| `src/store/` | 저장 꽂개: 이 기기(두 탭 실시간) · 메모리 |
| `src/ui/` | 화면 (상태를 그리기만 · 시계 하나 `clock.svelte.ts`) |
| `tests/` | 6차시 독립 검산 · 정식과 같음(기준값 `tests/fixtures`) · 엔진 한 바퀴 |

```bash
npm ci
npm test
npm run dev
```

정식과 같은지 기준값 다시 만들기: `node tools/make-parity-fixture.cjs <정식 저장소 경로>`
