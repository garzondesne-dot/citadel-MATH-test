# 🐞 해골 소환사(hero-bone) 시트 고침 (📜 2026-11-14 머리 🐞 「마도사 캐릭터 · 꼬마 해골 등장했다 안 했다 · 주변 형광색 제거 덜 됨」)
#   ① 형광 분홍(크로마키) 찌꺼기: 가장자리(투명 이웃) = 지움 · 안쪽 = 망토 보라로 · 반투명 분홍 번짐 = 지움
#   ② 공격 줄(3번째 줄) 3 · 4칸 = 옛 자르기가 40px 어긋나 용사가 칸 오른쪽 끝에 잘림 + 옆 칸의 해골 · 뼈 조각 → 원본에 없는 부분은 못 살림
#      → 4칸 = [준비 · 휘두름 · 휘두름 · 준비] (같은 자리 · 같은 크기 · 해골 조각 없음)
#   ③ 기쁨 줄(5번째 줄) = 꼬마 해골이 2칸 중 1칸에만 → 두 칸 모두 같은 자리에 (깜빡임 없음)
#   사용: python3 -I tools/fix-bone-sprite.py <입력.webp> <출력.webp>
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); W, H = 80, 64
px = im.load(); w, h = im.size
def mag(c): r, g, b, a = c; return a > 0 and r > 150 and b > 150 and g < 120 and abs(r - b) < 110
def edge(x, y):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        X, Y = x + dx, y + dy
        if X < 0 or Y < 0 or X >= w or Y >= h or px[X, Y][3] < 40: return True
    return False
for _ in range(2):  # 두 번 = 지운 뒤 새로 드러난 가장자리도
    rm, rc = [], []
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if mag(c): (rm if edge(x, y) or c[3] < 200 else rc).append((x, y))
    for x, y in rm: px[x, y] = (0, 0, 0, 0)
    for x, y in rc: a = px[x, y][3]; px[x, y] = (138, 62, 186, a)
cell = lambda r, c: im.crop((c * W, r * H, (c + 1) * W, (r + 1) * H))
def put(r, c, img): im.paste(Image.new('RGBA', (W, H), (0, 0, 0, 0)), (c * W, r * H)); im.paste(img, (c * W, r * H))
# ② 공격 줄
a0, a1 = cell(2, 0), cell(2, 1)
put(2, 2, a1); put(2, 3, a0)
# ③ 기쁨 줄: 꼬마 해골 = 기쁨 2칸의 오른쪽 아래(x ≥ 46 · y ≥ 34) 덩어리 → 1칸에도 같은 자리
j0, j1 = cell(4, 0), cell(4, 1)
sk = j1.crop((46, 34, 80, 64)); m = Image.new('RGBA', j0.size, (0, 0, 0, 0)); m.paste(j0, (0, 0)); m.alpha_composite(sk, (46, 34)); put(4, 0, m)
im.save(dst, 'WEBP', lossless=True, method=6)
print('ok', dst)
