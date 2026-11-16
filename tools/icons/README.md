# 🎨 픽셀 아이콘 = 색 글꼴 (📜 2026-11-17 #4 「앱 이모지 → 픽셀 아이콘 · 전부다」)

GPT 아이콘 시트(🎨 작업대 「🎨 아이콘 81」 A~E) → 칸마다 32×32 도트 → COLR 색 글꼴 `public/fonts/dungeon-icons-v2.woff`.
글꼴 맨 앞(`--font` · unicode-range = 그 이모지 글자만)이라 **템플릿을 고치지 않고** 모든 화면의 그 이모지가 그림으로 바뀜.
그림이 없는 이모지(✔ ✘ 같은 글자 기호 · 시트에 없는 드문 이모지) = 원래 이모지 그대로. 학생이 쓴 글 = `--font-plain`(이모지 그대로).

1. 시트 받기: `node <열쇠 폴더>/gdrive.js down <드라이브 id> icon-a.png`
2. 자르기: `python3 -I tools/icons/cut.py icon-a.png 4 5 a <칸 폴더>` (B~E = `4 4 b|c|d|e`) → `<칸 폴더>/a-00.png …` + `preview-a.png`
3. 칸 ↔ 이모지 = `tools/icons/map.json` (작업대 카드 순서 · ⚔ 칼 금 감 · 부러짐 · 초록 복귀 = U+E101~E103 사용자 영역)
4. 글꼴: `python3 -I tools/icons/font.py <칸 폴더> public/fonts/dungeon-icons-v2.woff tools/icons/map.json` (pip fonttools)
5. 그림을 바꾸면 글꼴 파일 이름을 올림(v2 · 캐시 먼저라서) · `src/theme/tokens.css` @font-face · `vite.config.ts` core 같이
