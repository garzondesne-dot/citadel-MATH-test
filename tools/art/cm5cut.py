#!/usr/bin/env python3
"""🐲 컨셉 몬스터 5동작 시트 (📜 #98-b 덧 · cm5-a / cm5-b) — 마젠타 바탕 원본 → 칸 256 · 투명 webp
칸 순서 = 대기 A · 대기 B · 공격 · 맞음 · 쓰러짐 (모두 왼쪽을 봄) · 줄마다 같은 배율 · 발 기준선(아래) 맞춤 · 보이는 부분 가운데
사용: python3 -I tools/art/cm5cut.py <원본.png> <줄 수> <출력.webp>
"""
import sys
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from keycut import key  # noqa: E402

C, BASE, PADW = 256, 250, 244
src, rows, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
rgba, _ = key(Image.open(src))
W, H = rgba.size; cw, ch = W / 5, H / rows
sheet = Image.new('RGBA', (C * 5, C * rows), (0, 0, 0, 0))
for r in range(rows):
    cells = []
    for c in range(5):
        cell = rgba.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        a = cell.getchannel('A').point(lambda v: 255 if v > 40 else 0)
        bb = a.getbbox(); cells.append(cell.crop(bb) if bb else None)
    mx = max(max(im.size) for im in cells if im)
    s = min(1.0, PADW / mx)
    for c, im in enumerate(cells):
        if not im: continue
        if s < 1: im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        x = c * C + (C - im.width) // 2; y = r * C + BASE - im.height
        sheet.alpha_composite(im, (x, max(r * C, y)))
    print('row', r, 'scale', round(s, 3))
sheet.save(out, quality=92, method=6)
