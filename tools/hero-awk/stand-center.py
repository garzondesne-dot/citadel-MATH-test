#!/usr/bin/env python3
# 🐞 #134 덧 (선생님 「서기만 맞춤」): 각성 큰 시트(hero-*-awk-v8 · 256 × 144 칸 · 4칸 × 12줄)의 「서기」 줄(0 · ANIM idle 4칸)만
#   칸마다 무게 중심(투명 아닌 픽셀 · 알파 가중) x 를 줄 평균에 맞춰 가로로만 옮김 · 세로 · 발 줄 그대로 · 걷기 · 공격 등 다른 줄은 손대지 않음
#   새 파일 = hero-*-awk-v9.webp (그림은 캐시 먼저라서) · 옛 v8 은 그대로 둠
#   사용: python3 tools/hero-awk/stand-center.py [--dry]
import glob, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = f'{ROOT}/public/art/heroes'; CW, CH, ROW, N = 256, 144, 0, 4

def cm(cell):
    w = cell[..., 3].astype(float); return (w.sum(0) * np.arange(CW)).sum() / max(w.sum(), 1)

def main():
    dry = '--dry' in sys.argv; rows = []
    for src in sorted(glob.glob(f'{DIR}/hero-*-awk-v8.webp')):
        im = np.asarray(Image.open(src).convert('RGBA')).copy(); y = ROW * CH
        cells = [im[y:y + CH, i * CW:(i + 1) * CW] for i in range(N)]
        live = [i for i, c in enumerate(cells) if c[..., 3].any()]
        c0 = np.array([cm(cells[i]) for i in live]); tgt = c0.mean()
        for i in live:
            d = int(round(tgt - cm(cells[i]))); fr = cells[i].copy(); dst = np.zeros_like(fr)
            if d > 0: dst[:, d:] = fr[:, :CW - d]
            elif d < 0: dst[:, :d] = fr[:, -d:]
            else: dst = fr
            im[y:y + CH, i * CW:(i + 1) * CW] = dst
        c1 = np.array([cm(im[y:y + CH, i * CW:(i + 1) * CW]) for i in live])
        out = src.replace('-awk-v8.webp', '-awk-v9.webp'); rows.append((os.path.basename(out), np.ptp(c0), np.ptp(c1)))
        if not dry: Image.fromarray(im, 'RGBA').save(out, lossless=True, quality=100, method=6)
    print('| 시트 | 서기 줄 무게 중심 흔들림 전 → 뒤 (px) |\n|---|---|')
    for n, a, b in sorted(rows, key=lambda r: -r[1]): print(f'| {n} | {a:.1f} → {b:.1f} |')

if __name__ == '__main__': main()
