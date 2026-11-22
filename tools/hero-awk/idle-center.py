#!/usr/bin/env python3
# 🐞 #134 각성 용사 숨쉬기(idle8) 좌우 흔들림 = 칸마다 보이는 그림의 무게 중심(투명 아닌 픽셀 · 알파 가중) x 를 칸 평균에 맞춰 가로로만 옮김
#   (선생님 「각성 녹스 여전히 불안하게 좌우로 움직여 · 숨쉬기에서」 · #96 은 발 줄(세로)만 맞췄음)
#   상자(bbox) 가운데 대신 무게 중심 = 망토 · 칼끝처럼 얇은 끝이 흔들려도 몸통이 고정됨(녹스: 상자 맞춤 = 몸 3px 흔들림 · 무게 중심 = 1px)
#   세로 · 발 줄은 그대로 · 늘이지 않음 · 새 파일 = 이름 끝 -v9 (그림은 캐시 먼저라서) · src/ui/idle8-hd-map.json 갱신
#   사용: python3 tools/hero-awk/idle-center.py [--all] [--dry]   (기본 = 각성 띠 중 흔들림 > 1px)
import json, os, re, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAP = f'{ROOT}/src/ui/idle8-hd-map.json'; DIR = f'{ROOT}/public/art/heroes'; CW = 256

def cms(im):
    out = []
    for i in range(im.shape[1] // CW):
        w = im[:, i * CW:(i + 1) * CW, 3].astype(float)
        out.append((w.sum(0) * np.arange(CW)).sum() / max(w.sum(), 1))
    return np.array(out)

def bbc(im):
    out = []
    for i in range(im.shape[1] // CW):
        xs = np.nonzero((im[:, i * CW:(i + 1) * CW, 3] > 16).any(0))[0]
        out.append((xs.min() + xs.max() + 1) / 2)
    return np.array(out)

def main():
    dry, allw = '--dry' in sys.argv, '--all' in sys.argv
    m = json.load(open(MAP)); rows = []
    for sheet, strip in m.items():
        if '-awk' not in sheet: continue
        im = np.asarray(Image.open(f'{DIR}/{strip}').convert('RGBA'))
        c = cms(im); sp = np.ptp(c)
        if sp <= 1 and not allw: rows.append((strip, strip, sp, sp, np.ptp(bbc(im)), np.ptp(bbc(im)))); continue
        sh = np.round(c.mean() - c).astype(int); out = np.zeros_like(im)
        for i, d in enumerate(sh):
            fr = im[:, i * CW:(i + 1) * CW]; dst = out[:, i * CW:(i + 1) * CW]
            if d >= 0: dst[:, d:] = fr[:, :CW - d] if d else fr
            else: dst[:, :d] = fr[:, -d:]
        name = re.sub(r'-idle8-v8b?\.webp$', '-idle8-v9.webp', strip)
        rows.append((strip, name, sp, np.ptp(cms(out)), np.ptp(bbc(im)), np.ptp(bbc(out))))
        if not dry:
            Image.fromarray(out, 'RGBA').save(f'{DIR}/{name}', lossless=True, quality=100, method=6); m[sheet] = name
    if not dry: json.dump(m, open(MAP, 'w'), ensure_ascii=False, indent=1); open(MAP, 'a').write('\n')
    print('| 띠 | 무게 중심 흔들림 전 → 뒤 (px) | 상자 가운데 전 → 뒤 |\n|---|---|---|')
    for a, b, s0, s1, b0, b1 in sorted(rows, key=lambda r: -r[2]): print(f'| {b} | {s0:.1f} → {s1:.1f} | {b0:.1f} → {b1:.1f} |')

if __name__ == '__main__': main()
