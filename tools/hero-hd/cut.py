#!/usr/bin/env python3
# 🧙 새 화풍 용사 시트 자르기 (#166 · #167 · DECISIONS 「🧙 v1.0 용사 세밀 = GPT 손수 작업」)
#   입력 = GPT 시트(1024 × 1536 · 마젠타 바탕 · 왼쪽에 4칸 × 12줄 · 칸 폭이 정확하지 않음)
#   ① 바깥 마젠타만 빼기(가장자리에서 이어진 마젠타 · 머리색 보라 · 분홍은 안 지움) + 테두리 분홍 번짐 정리
#   ② 줄 = 가로 빈 띠로 12개 · 칸 = 줄 안 세로 빈 띠(가까운 조각은 합침 · 이펙트 포함)
#   ③ 새 칸(CW × CH) 에 놓기: 가로 = 다리 쪽(아래 40%) 가운데를 칸 가운데로 · 세로 = 발(불투명 아래끝)을 칸 아래 BASE 픽셀 위로
#   ④ 줄이지 않음(세밀함 유지 · 화면 크기는 manifest HERO_HD k=2 로 맞춤)
# 사용: python3 tools/hero-hd/cut.py <입력> <출력.webp> [미리보기.png]
import sys
from collections import deque
from PIL import Image

CW, CH, COLS, ROWS, BASE = 192, 144, 4, 12, 8  # 새 화풍 칸 (34명 같은 칸 · HANDOVER) · 화면 = ½(96 × 72 · 발은 옛 80 × 64 칸 바닥에)
MAG = (251, 4, 251)

def is_mag(p, tol=95):
    r, g, b = p[:3]
    return abs(r - MAG[0]) + abs(g - MAG[1]) + abs(b - MAG[2]) < tol

def fringe(p):  # 바깥 테두리의 분홍 번짐 (마젠타 쪽으로 섞인 색)
    r, g, b = p[:3]
    return r > 150 and b > 150 and g < 0.55 * min(r, b) and abs(r - b) < 70

def unmatte(im):
    im = im.convert('RGBA'); W, H = im.size; px = im.load()
    seen = bytearray(W * H); q = deque()
    for x in range(W):
        for y in (0, H - 1): q.append((x, y))
    for y in range(H):
        for x in (0, W - 1): q.append((x, y))
    while q:  # 가장자리에서 이어진 마젠타만
        x, y = q.popleft(); i = y * W + x
        if seen[i] or not is_mag(px[x, y]): continue
        seen[i] = 1; px[x, y] = (0, 0, 0, 0)
        if x > 0: q.append((x - 1, y))
        if x < W - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < H - 1: q.append((x, y + 1))
    for _ in range(2):  # 번짐 두 겹
        kill = []
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                p = px[x, y]
                if p[3] and fringe(p) and any(px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): kill.append((x, y))
        for x, y in kill: px[x, y] = (0, 0, 0, 0)
    return im

def bands(occ, min_gap):  # occ = [bool] → [(a, b)] 이어진 띠 (min_gap 보다 좁은 빈틈은 합침)
    out = []; a = None; gap = 0
    for i, v in enumerate(occ + [False] * (min_gap + 1)):
        if v:
            if a is None: a = i
            gap = 0; last = i
        elif a is not None:
            gap += 1
            if gap > min_gap: out.append((a, last + 1)); a = None
    return out

def comps(im):  # 이어진 조각 (8방향) → [{x0,y0,x1,y1,n,px}]
    W, H = im.size; a = im.getchannel('A').load(); lab = [0] * (W * H); out = []
    for y in range(H):
        for x in range(W):
            if a[x, y] == 0 or lab[y * W + x]: continue
            k = len(out) + 1; q = deque([(x, y)]); lab[y * W + x] = k; c = {'x0': x, 'y0': y, 'x1': x, 'y1': y, 'n': 0, 'px': []}
            while q:
                u, v = q.popleft(); c['n'] += 1; c['px'].append((u, v))
                c['x0'] = min(c['x0'], u); c['x1'] = max(c['x1'], u); c['y0'] = min(c['y0'], v); c['y1'] = max(c['y1'], v)
                for du in (-1, 0, 1):
                    for dv in (-1, 0, 1):
                        uu, vv = u + du, v + dv
                        if 0 <= uu < W and 0 <= vv < H and a[uu, vv] and not lab[vv * W + uu]: lab[vv * W + uu] = k; q.append((uu, vv))
            out.append(c)
    return out

def main(src, dst, prev=None):
    im = unmatte(Image.open(src)); W, H = im.size; pitch = H / ROWS
    cs = comps(im); big = [c for c in cs if c['n'] >= 600 and c['y1'] - c['y0'] >= 45]; small = [c for c in cs if c not in big]
    # 몸 = 큰 조각 · 줄 = 발 높이로 묶음(GPT 줄 간격이 정확히 128 이 아님 · 40px 넘게 벌어지면 다음 줄) · 같은 줄에서 가로로 겹치거나 18px 안이면 한 칸
    feet = sorted(c['y1'] for c in big); groups = [[feet[0]]]
    for y in feet[1:]:
        if y - groups[-1][-1] > 40: groups.append([y])
        else: groups[-1].append(y)
    if len(groups) != ROWS: raise SystemExit(f'⛔ 줄 수 {len(groups)} ≠ {ROWS} (넣지 않음 · 머리에 알림)')
    for c in big: c['row'] = next(i for i, g in enumerate(groups) if g[0] <= c['y1'] <= g[-1])
    frames = {r: [] for r in range(ROWS)}
    for c in sorted(big, key=lambda c: c['x0']):
        fs = frames[c['row']]
        if fs and c['x0'] - fs[-1]['x1'] < 18: f = fs[-1]; f['parts'].append(c); f['x1'] = max(f['x1'], c['x1'])
        else: fs.append({'x0': c['x0'], 'x1': c['x1'], 'parts': [c]})
    # 작은 조각(반짝이 · 땀 · 별) = 가장 가까운 칸에 붙임
    allf = [f for r in frames for f in frames[r]]
    for f in allf: f['feet'] = max(p['y1'] for p in f['parts']); f['y0'] = min(p['y0'] for p in f['parts'])
    for c in small:
        cx, cy = (c['x0'] + c['x1']) / 2, (c['y0'] + c['y1']) / 2
        f = min(allf, key=lambda f: max(0, f['x0'] - cx, cx - f['x1']) + max(0, f['y0'] - cy, cy - f['feet']))
        if max(0, f['x0'] - cx, cx - f['x1']) + max(0, f['y0'] - cy, cy - f['feet']) < 40: f['parts'].append(c)
    src_px = im.load(); out = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0)); op = out.load(); report = []
    for r in range(ROWS):
        fs = frames[r]
        if not fs: raise SystemExit(f'⛔ {r}줄이 비어 있음 (넣지 않음 · 머리에 알림)')
        if len(fs) > COLS: raise SystemExit(f'⛔ {r}줄 칸 {len(fs)} > {COLS}')
        ws = []
        for c, f in enumerate(fs):
            body = max(f['parts'], key=lambda p: p['n']); bot = body['y1'] + 1
            leg0 = body['y0'] + int((bot - body['y0']) * 0.6)
            xs = sorted(u for u, v in body['px'] if v >= leg0); cx = xs[len(xs) // 2]
            ox = CW * c + CW // 2 - cx; oy = CH * r + CH - BASE - bot
            x0 = min(p['x0'] for p in f['parts']); x1 = max(p['x1'] for p in f['parts']); y0 = min(p['y0'] for p in f['parts'])
            cut = 0
            for p in f['parts']:
                for u, v in p['px']:
                    X, Y = u + ox, v + oy
                    if CW * c <= X < CW * (c + 1) and CH * r <= Y < CH * (r + 1): op[X, Y] = src_px[u, v]
                    else: cut += 1
            ws.append(f'{x1 - x0 + 1}×{bot - y0}' + (f'(잘림 {cut})' if cut else ''))
        report.append(f'{r}줄 {len(fs)}칸 {ws}')
    # 🎯 #121 정중앙 = 서 있는 줄(0줄 첫 칸) 보이는 상자 가운데를 칸 가운데로 → 시트 전체를 같은 만큼 옮김(줄 사이 몸 자리는 그대로)
    bb = out.crop((0, 0, CW, CH)).getbbox()
    if bb:
        sh = round(CW / 2 - (bb[0] + bb[2]) / 2)
        if sh:
            moved = Image.new('RGBA', out.size, (0, 0, 0, 0))
            for r in range(ROWS):
                for c in range(COLS):
                    cell = out.crop((CW * c, CH * r, CW * (c + 1), CH * (r + 1))); t = Image.new('RGBA', (CW, CH)); t.alpha_composite(cell, (sh, 0)) if sh > 0 else t.alpha_composite(cell.crop((-sh, 0, CW, CH)), (0, 0)); moved.alpha_composite(t, (CW * c, CH * r))
            out = moved; report.append(f'정중앙 옮김 {sh}px')
    # 256색 팔레트(도트) + 무손실 → 약 170KB · 반투명 없음
    a = out.getchannel('A').point(lambda v: 255 if v > 0 else 0)
    q = out.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA'); q.putalpha(a)
    q.save(dst, 'WEBP', lossless=True, quality=100, method=6)
    if prev:
        p = Image.new('RGBA', out.size, (40, 44, 56, 255)); p.alpha_composite(out)
        from PIL import ImageDraw
        d = ImageDraw.Draw(p)
        for r in range(ROWS):
            d.line([(0, CH * r + CH - BASE), (CW * COLS, CH * r + CH - BASE)], fill=(255, 210, 0, 120))
            for c in range(COLS): d.rectangle([CW * c, CH * r, CW * c + CW - 1, CH * r + CH - 1], outline=(90, 100, 120, 255))
        p.save(prev)
    print('\n'.join(report))

if __name__ == '__main__':
    main(*sys.argv[1:4])
