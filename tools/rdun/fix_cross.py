#!/usr/bin/env python3
# ✝ → ★ (머리 📎 2026-11-14 「금서의 사서 책 표지 무늬가 십자가처럼 보임 → 학교 수업용이라 별 · 보석 모양으로 덮기」)
#   표지 자리(칸 좌표 · 손으로 잼) 둘레 반지름 r 안의 주황 무늬 → 둘레 보라 표지색으로 덮고 → 같은 주황 별
# 사용: python3 tools/rdun/fix_cross.py <시트.webp> <칸> <줄> "<칸>:<x>:<y>[:r] …"
import sys
import numpy as np
from PIL import Image, ImageDraw
f, cell, row = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
im = Image.open(f).convert('RGBA'); a = np.asarray(im).copy()
for spec in sys.argv[4].split():
    k, cx, cy, *rr = [int(v) for v in spec.split(':')]; r = rr[0] if rr else 15
    x0, y0 = k * cell, row * cell; c = a[y0:y0 + cell, x0:x0 + cell]
    yy, xx = np.mgrid[0:cell, 0:cell]; win = np.hypot(xx - cx, yy - cy) <= r
    R, G, B = [c[..., i].astype(int) for i in range(3)]
    purple = win & (B > R + 40) & (c[..., 3] > 0); orange = win & (R > 120) & (R - B > 40) & (c[..., 3] > 0)
    if not orange.any() or not purple.any(): print(f'칸 {k}: 무늬 없음'); continue
    under = np.median(c[purple][:, :3], 0).astype(np.uint8); oc = np.array([232, 150, 84], np.uint8)
    c[orange, :3] = under
    sub = Image.fromarray(c, 'RGBA'); d = ImageDraw.Draw(sub); s = r * 0.5
    pts = [(cx + (s if i % 2 == 0 else s * 0.45) * np.sin(i * np.pi / 5), cy - (s if i % 2 == 0 else s * 0.45) * np.cos(i * np.pi / 5)) for i in range(10)]
    d.polygon(pts, fill=tuple(int(v) for v in oc) + (255,)); a[y0:y0 + cell, x0:x0 + cell] = np.asarray(sub)
    print(f'칸 {k}: 무늬 {int(orange.sum())} 점 → 별')
Image.fromarray(a, 'RGBA').quantize(colors=255, method=Image.Quantize.FASTOCTREE).convert('RGBA').save(f, lossless=True, method=6)
