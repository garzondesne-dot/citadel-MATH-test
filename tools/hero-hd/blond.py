# 🌟 #29 각성한 로안(16) = 로안 시트 색 바꾸기 (📜 2026-11-17 머리 🔨 · 새 주문 없음)
#   칸(80×64)마다 머리 부분(위쪽 · 줄마다 다름)의 갈색 머리칼만 금발로 · 피부 · 망토 · 장화 · 허리띠는 그대로
#   python3 tools/hero-hd/blond.py public/art/heroes/hero-sword-v3c.webp public/art/heroes/hero-blond-v1.webp [미리보기.png]
import colorsys, sys
from PIL import Image

IDLE8 = sys.argv[1] == '--idle8'
if IDLE8: sys.argv.pop(1)
src, out = sys.argv[1], sys.argv[2]
full = Image.open(src).convert('RGBA')
im = full.crop((0, 0, full.size[0], 64)) if IDLE8 else full.copy()
W, H = im.size; px = im.load()
CW, CH = 80, 64
# 줄별 머리 아래 끝(칸 안 y) — 앉기 · 쓰러짐 줄은 머리가 내려옴
HEAD = {r: 36 for r in range(H // CH)}
HEAD.update({8: 44, 9: 46, 10: 50, 11: 46})
GOLD = [(120, 78, 22), (176, 124, 30), (226, 176, 52), (250, 214, 96), (255, 238, 160)]

def gold(l):
    i = min(len(GOLD) - 1, max(0, int(l * len(GOLD))))
    return GOLD[i]

n = 0
for y in range(H):
    row, ly = y // CH, y % CH
    for x in range(W):
        if ly >= HEAD.get(row, 36) and not (row == 5 and (x // CW) == 1 and x % CW >= 30): continue  # 쓰러짐 칸 = 머리가 오른쪽 아래
        r, g, b, a = px[x, y]
        if a < 40: continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        hd = h * 360
        # 갈색 머리칼 = 주황~갈색 · 채도 있음 · 너무 밝지 않음(피부 제외) · 너무 어둡지 않음(윤곽선 제외)
        lo = 0.13 if (row == 5 and (x // CW) == 1) else 0.2  # 쓰러짐 칸 = 그늘진 머리칼까지
        if 8 <= hd <= 40 and s >= 0.3 and lo <= l <= 0.56 and not (r > 200 and g > 150):
            nr, ng, nb = gold((l - 0.2) / 0.36)
            px[x, y] = (nr, ng, nb, a); n += 1
if IDLE8: full.paste(im, (0, 16 * 64)); im = full
im.save(out, 'WEBP', lossless=True)
print('바꾼 점', n)
if len(sys.argv) > 3:
    Image.open(src).convert('RGBA').resize((W * 2, H * 2), Image.NEAREST).save(sys.argv[3] + '.src.png')
    im.resize((W * 2, H * 2), Image.NEAREST).save(sys.argv[3])

# 캠프 숨쉬기 시트(idle8 · 한 줄 = 용사 하나 · 칸 80×64 × 8) — 16번 줄 = 0번 줄(로안)을 같은 규칙으로 색 바꿈
#   python3 tools/hero-hd/blond.py --idle8 public/art/heroes/hero-idle8-pl-v3.webp public/art/heroes/hero-idle8-pl-v4.webp
