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

## 앞으로 만들 때 지킬 것 (머리 방 지침)
- 💰 지갑 · 상점: 산 것마다 `{ id, ver: 산 때의 경제 판 }` 로 저장 · 규칙 표에 `migrate[ver] = 옛 칸 → 새 칸` · 학생이 접속하면 게임이 **자기 기록만** 새 판으로 한 번 옮김(기록 · 우편함 한 줄) · 관리자 일괄 도구 없음 · 값이 바뀐 것은 옮기지 않음 (hero-v2 DECISIONS 「💰 경제 변경 규칙」 · V1-DESIGN 7절)
- 📱 화면: 스킬 `ui-senior` (토큰 = `src/theme/tokens.css` · 5절 스스로 검사)
