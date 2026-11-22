#!/usr/bin/env python3
"""🎨 마젠타 바탕 그림 → 조각마다 투명 PNG (📜 #102 뒤 그림 넣기 · ui-ic4 · atb-counter-ui)
가장자리에서 이어진 마젠타 + 그 옆 분홍 테 = 투명(몸 안 보라는 남김) · 가까운 조각(빛 줄기 · 반짝이)은 한 덩어리로 묶음(gap px) · 위 → 아래 줄, 왼 → 오 순서로 저장
사용: python3 -I tools/art/keycut.py <그림.png> <출력 폴더> <이름 머리> [gap=24] [최소 넓이=2000]
     칸 정해 자르기: ... <이름 머리> box x0,y0,x1,y1 [x0,y0,x1,y1 ...]  (칸 안을 투명 처리 → 보이는 부분만큼 잘라 저장)
"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter


def key(im, flood=True):
    """바탕 = 가장자리에서 이어진 마젠타만 (몸 안 보라 · 빛은 남김) · flood=False = 마젠타 비슷한 색 모두"""
    a = np.asarray(im.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    loose = ((r > 150) & (b > 150) & (g < 110)) | ((r > 190) & (b > 190) & (g < 160) & (np.abs(r - b) < 70))
    if flood:
        tight = (r > 170) & (b > 170) & (g < 120) & (np.abs(r - b) < 80)
        L = Image.fromarray(np.where(tight, 255, 0).astype('uint8'), 'L').copy()  # 복사 = numpy 와 메모리 안 나눔(안 그러면 floodfill 이 안 먹음)
        from PIL import ImageDraw
        h, w = tight.shape
        for x in range(0, w, 16):
            for y in (0, h - 1):
                if L.getpixel((x, y)) == 255: ImageDraw.floodfill(L, (x, y), 128)
        for y in range(0, h, 16):
            for x in (0, w - 1):
                if L.getpixel((x, y)) == 255: ImageDraw.floodfill(L, (x, y), 128)
        bgm = (np.asarray(L) == 128) | ((g < 40) & (r > 220) & (b > 220) & (np.abs(r - b) < 30))  # + 몸 사이에 갇힌 순 마젠타 칸(빛 · 보라는 g 가 커서 남음)
        # 분홍 테 = 바탕 옆 2px 안의 느슨한 마젠타
        near = np.asarray(Image.fromarray(np.where(bgm, 255, 0).astype('uint8'), 'L').filter(ImageFilter.MaxFilter(5))) > 0
        bg = bgm | (near & loose)
    else:
        bg = loose
    alpha = np.where(bg, 0, 255).astype('uint8')
    m = Image.fromarray(alpha, 'L').filter(ImageFilter.MinFilter(3))  # 분홍 테 1px 깎음
    out = im.convert('RGBA'); out.putalpha(m)
    return out, np.asarray(m) > 0


def pieces(mask, gap, minarea):
    s = max(2, gap // 2)
    h, w = mask.shape
    gh, gw = (h + s - 1) // s, (w + s - 1) // s
    pad = np.zeros((gh * s, gw * s), bool); pad[:h, :w] = mask
    grid = pad.reshape(gh, s, gw, s).any(axis=(1, 3))
    seen = np.zeros_like(grid); out = []
    for y in range(gh):
        for x in range(gw):
            if not grid[y, x] or seen[y, x]: continue
            q = deque([(y, x)]); seen[y, x] = True; ys, xs = [y], [x]
            while q:
                cy, cx = q.popleft()
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < gh and 0 <= nx < gw and grid[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx)); ys.append(ny); xs.append(nx)
            x0, y0, x1, y1 = min(xs) * s, min(ys) * s, (max(xs) + 1) * s, (max(ys) + 1) * s
            sub = mask[y0:y1, x0:x1]
            if sub.sum() < minarea: continue
            yy, xx = np.nonzero(sub)
            out.append((x0 + xx.min(), y0 + yy.min(), x0 + xx.max() + 1, y0 + yy.max() + 1))
    rows = sorted(out, key=lambda b: b[1])
    lines, cur = [], []
    for b in rows:
        if cur and b[1] > max(c[3] for c in cur) - 10: lines.append(cur); cur = []
        cur.append(b)
    if cur: lines.append(cur)
    return [b for ln in lines for b in sorted(ln, key=lambda b: b[0])]


if __name__ == '__main__':
    src, od, pre = sys.argv[1], sys.argv[2], sys.argv[3]
    rgba, mask = key(Image.open(src))
    if len(sys.argv) > 4 and sys.argv[4] == 'box':
        for i, t in enumerate(sys.argv[5:]):
            b = tuple(int(v) for v in t.split(',')); c = rgba.crop(b); bb = c.getchannel('A').getbbox()
            c.crop(bb).save(f'{od}/{pre}-{i}.png'); print(i, b, bb)
        sys.exit(0)
    gap = int(sys.argv[4]) if len(sys.argv) > 4 else 24; minarea = int(sys.argv[5]) if len(sys.argv) > 5 else 2000
    for i, b in enumerate(pieces(mask, gap, minarea)):
        rgba.crop(b).save(f'{od}/{pre}-{i}.png'); print(i, b)
