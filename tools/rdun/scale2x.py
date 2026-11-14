#!/usr/bin/env python3
# 🔍 도트 전용 2배 (Scale2x · EPX) — 랜덤 던전 시트를 TV 확대용으로 미리 굽기 (확대 품질 비교 · 2026-11-14 머리 📎)
#   경계가 계단 대신 매끈해지고 색 섞임(번짐)은 없음 · 출력 = 같은 폴더 <이름>x2.webp
# 사용: python3 tools/rdun/scale2x.py public/art/rdun/d01-v1.webp …
import sys
import numpy as np
from PIL import Image
def epx(a):
    h, w = a.shape[:2]; p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode='edge')
    P = p[1:-1, 1:-1]; A = p[:-2, 1:-1]; B = p[1:-1, 2:]; C = p[1:-1, :-2]; D = p[2:, 1:-1]
    eq = lambda x, y: np.all(x == y, axis=2)
    o = np.empty((h * 2, w * 2, a.shape[2]), a.dtype)
    c1 = eq(C, A) & ~eq(C, D) & ~eq(A, B); c2 = eq(A, B) & ~eq(A, C) & ~eq(B, D)
    c3 = eq(D, C) & ~eq(D, B) & ~eq(C, A); c4 = eq(B, D) & ~eq(B, A) & ~eq(D, C)
    o[0::2, 0::2] = np.where(c1[..., None], A, P); o[0::2, 1::2] = np.where(c2[..., None], B, P)
    o[1::2, 0::2] = np.where(c3[..., None], C, P); o[1::2, 1::2] = np.where(c4[..., None], D, P)
    return o
for f in sys.argv[1:]:
    a = np.asarray(Image.open(f).convert('RGBA')).copy(); a[a[..., 3] == 0] = 0  # 투명 칸 색 = 같게 (경계 판단이 흔들리지 않게)
    Image.fromarray(epx(a), 'RGBA').save(f.replace('.webp', 'x2.webp'), lossless=True, method=6); print(f, '→ x2')
