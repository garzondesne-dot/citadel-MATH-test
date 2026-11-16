#!/usr/bin/env python3
"""🎨 아이콘 시트 자르기 (📜 2026-11-17 #4 「앱 이모지 → 픽셀 아이콘 · 전부다」)
GPT 시트(4열 · 칸 크기 아무거나 · 마젠타 바탕) → 칸마다 32×32 진짜 도트(분홍 테두리 지움) → out/<시트>-<칸>.png + 미리 보기
사용: python3 -I tools/icons/cut.py <시트.png> <열> <행> <이름 a|b|c|d|e> <출력 폴더>
"""
import sys
from PIL import Image

N = 32  # 아이콘 원래 칸 (32 → 128 = 4배)


def is_bg(p):
    r, g, b = p[:3]
    # 마젠타 + 분홍 테두리(바탕과 섞인 끝) = 바탕
    return (r > 140 and b > 130 and g < 120 and abs(r - b) < 110) or (r > 200 and b > 200 and g < 170)


def cut_cell(im):
    w, h = im.size
    px = im.load()
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            if not is_bg(px[x, y]):
                mp[x, y] = 255
    bb = mask.getbbox()
    if not bb:
        return None
    x0, y0, x1, y1 = bb
    s = int(max(x1 - x0, y1 - y0) * 1.12)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    box = (int(cx - s / 2), int(cy - s / 2), int(cx - s / 2) + s, int(cy - s / 2) + s)
    rgb = Image.new('RGB', (s, s), (0, 0, 0)); rgb.paste(im.convert('RGB'), (-box[0], -box[1]))
    m = Image.new('L', (s, s), 0); m.paste(mask, (-box[0], -box[1]))
    # 무게 평균(바탕 색이 섞이지 않게): (색 × 마스크) / 마스크
    pre = Image.composite(rgb, Image.new('RGB', (s, s), (0, 0, 0)), m)
    small = pre.resize((N, N), Image.BOX); ms = m.resize((N, N), Image.BOX)
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    sp, mp2, op = small.load(), ms.load(), out.load()
    for y in range(N):
        for x in range(N):
            a = mp2[x, y]
            if a >= 110:
                k = 255 / max(a, 1)
                r, g, b = sp[x, y]
                op[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)), 255)
    return out


def main():
    src, cols, rows, name, outd = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
    im = Image.open(src).convert('RGB')
    W, H = im.size
    cw, ch = W / cols, H / rows
    prev = Image.new('RGBA', (cols * N * 4, rows * N * 4), (40, 36, 51, 255))
    n = 0
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
            ic = cut_cell(cell)
            i = r * cols + c
            if ic is None:
                continue
            ic.save(f'{outd}/{name}-{i:02d}.png')
            prev.alpha_composite(ic.resize((N * 4, N * 4), Image.NEAREST), (c * N * 4, r * N * 4))
            n += 1
    prev.save(f'{outd}/preview-{name}.png')
    print(name, n, '칸')


if __name__ == '__main__':
    main()
