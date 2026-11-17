#!/usr/bin/env python3
# 🧙 #50 용사 세밀화 v4 시트 자르기 (주문 「용사세밀화_v4_주문_33명」 · 4칸 × 12줄 · 마젠타 또는 초록 바탕 · 1024 × 1536 / 809 × 1942)
#   cut.py(#166 · 발 높이로 줄 묶기)는 v4 시트에서 줄이 갈라짐(쓰러짐 · 뒤돌아 걷기 · 큰 이펙트) → 격자로 자름:
#   ① 바탕 = 모서리 색(마젠타 · 초록) · 가장자리에서 이어진 바탕만 지움 + 번짐 두 겹 (cut.unmatte)
#   ② 줄 = 조각 가운데 높이 ÷ (H / 12) · 칸 = 4칸 줄(걷기 · 공격 · 포털)의 조각 가로 가운데를 4묶음 → 칸 가운데 → 가장 가까운 칸
#   ③ 키 맞춤 = 서 있기(0줄 1칸) 키를 TARGET 으로 (시트마다 그림 크기가 달라서) · 가장 가까운 점(도트 그대로)
#   ④ 새 칸 CW × CH 에 놓기: 가로 = 다리(아래 40%) 가운데 → 칸 가운데 · 세로 = 발 → 칸 아래 BASE 위 · 넘치면 「잘림」 수 · 서 있기 1칸 → 2~4칸 채움(깜빡임 막기)
#   ⑤ 줄마다 칸 수 = 주문(1 · 4 · 4 · 1 · 2 · 2 · 2 · 4 · 2 · 2 · 2 · 2)과 다르면 「⚠」 (넣기는 함 · 머리에 목록)
# 사용: python3 tools/hero-hd/cut_v4.py <입력.png> <출력.webp> [미리보기.png]
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cut
from PIL import Image, ImageDraw

CW, CH, COLS, ROWS, BASE, TARGET = 256, 144, 4, 12, 8, 118
WANT = [1, 4, 4, 1, 2, 2, 2, 4, 2, 2, 2, 2]

def holes(im, minn=20):  # 몸 · 이펙트로 둘러싸여 가장자리와 안 이어진 바탕 구멍(마젠타 · 초록) = 덩이 minn 칸 이상만 지움 + 번짐 한 겹
    W, H = im.size; px = im.load(); seen = bytearray(W * H); n = 0
    for y0 in range(H):
        for x0 in range(W):
            i0 = y0 * W + x0
            if seen[i0] or not px[x0, y0][3] or not cut.is_mag(px[x0, y0]): continue
            reg = []; q = [(x0, y0)]; seen[i0] = 1
            while q:
                x, y = q.pop(); reg.append((x, y))
                for u, v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= u < W and 0 <= v < H and not seen[v * W + u] and px[u, v][3] and cut.is_mag(px[u, v]): seen[v * W + u] = 1; q.append((u, v))
            if len(reg) >= minn:
                for x, y in reg: px[x, y] = (0, 0, 0, 0)
                n += len(reg)
                for x, y in reg:
                    for u, v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= u < W and 0 <= v < H and px[u, v][3] and cut.fringe(px[u, v]): px[u, v] = (0, 0, 0, 0)
    return n

def run(src, dst, prev=None):
    raw = Image.open(src).convert('RGB'); W, H = raw.size
    bg = raw.getpixel((2, 2)); cut.MAG = bg
    if bg[1] > 200 and bg[0] < 80 and bg[2] < 80:
        cut.fringe = lambda p: p[1] > 150 and p[0] < 0.6 * p[1] and p[2] < 0.6 * p[1] and abs(p[0] - p[2]) < 70
    im = cut.unmatte(raw); s = H / 1536; ph = H / ROWS; nh = holes(im)
    cs = cut.comps(im)
    big = [c for c in cs if c['n'] >= 600 * s * s and (c['y1'] - c['y0'] >= 45 * s or c['x1'] - c['x0'] >= 70 * s)]  # 누운 자세(쓰러짐 2칸) = 납작해도 몸
    big = [c for c in big if c['n'] >= 2500 * s * s]  # 어지러움 소용돌이 같은 작은 이펙트는 몸 아님
    # 위아래 줄이 반짝이로 이어져 한 덩이가 된 것 = 키 기준으로 k줄로 쪼갬 (가장 빈 가로줄에서)
    hm = sorted(c['y1'] - c['y0'] + 1 for c in big)[len(big) // 2]; pitch = (max(c['y1'] for c in big) - min(c['y0'] for c in big) + 1) / ROWS
    def sub(c, a, b):
        px = [(u, v) for u, v in c['px'] if a <= v < b]
        return {'px': px, 'n': len(px), 'x0': min(u for u, v in px), 'x1': max(u for u, v in px), 'y0': min(v for u, v in px), 'y1': max(v for u, v in px)} if px else None
    out_big = []; split = []
    for c in big:
        h = c['y1'] - c['y0'] + 1
        if h <= 1.5 * hm: out_big.append(c); continue
        split.append(c); k = max(2, round(h / pitch)); cnt = {}
        for u, v in c['px']: cnt[v] = cnt.get(v, 0) + 1
        cuts_c = [c['y0']]
        for i in range(1, k):
            e = c['y0'] + round(i * h / k); cuts_c.append(min(range(e - round(0.45 * pitch), e + round(0.45 * pitch)), key=lambda y: (cnt.get(y, 0), abs(y - e))))
        cuts_c.append(c['y1'] + 1)
        out_big += [x for x in (sub(c, cuts_c[i], cuts_c[i + 1]) for i in range(k)) if x]
    big = out_big
    small = [c for c in cs if c not in big and c not in split]
    # 줄 간격 = 그림이 있는 위 ~ 아래 ÷ 12 (시트마다 위 여백이 달라 H / 12 로는 한 줄씩 밀림)
    # 줄 = 발 높이(y1)를 정렬해 가장 큰 빈틈 11개로 12묶음 (줄 간격이 시트마다 · 줄마다 달라 고정 간격은 밀림)
    ys = sorted(set(c['y1'] for c in big))
    cutsy = sorted(sorted(range(1, len(ys)), key=lambda i: ys[i] - ys[i - 1], reverse=True)[:ROWS - 1])
    edges = [ys[i] for i in cutsy]
    for c in big: c['row'] = sum(1 for e in edges if c['y1'] >= e); c['cx'] = (c['x0'] + c['x1']) / 2
    # 칸 가운데 = 4칸 줄(1 · 2 · 7) 조각 가운데 → 가장 큰 빈틈 3개로 4묶음
    xs = sorted(c['cx'] for c in big if c['row'] in (1, 2, 7))
    gaps = sorted(range(1, len(xs)), key=lambda i: xs[i] - xs[i - 1], reverse=True)[:COLS - 1]
    cuts = sorted(gaps); groups = []; a = 0
    for g in cuts + [len(xs)]: groups.append(xs[a:g]); a = g
    centers = [sum(g) / len(g) for g in groups if g]
    if len(centers) != COLS: raise SystemExit(f'⛔ 칸 가운데 {len(centers)} ≠ {COLS}')
    frames = {}
    for c in big:
        col = min(range(COLS), key=lambda k: abs(c['cx'] - centers[k]))
        frames.setdefault((c['row'], col), []).append(c)
    fl = [{'rc': k, 'parts': v, 'x0': min(p['x0'] for p in v), 'x1': max(p['x1'] for p in v), 'y0': min(p['y0'] for p in v), 'feet': max(p['y1'] for p in v)} for k, v in frames.items()]
    for c in small:
        cx, cy = (c['x0'] + c['x1']) / 2, (c['y0'] + c['y1']) / 2
        f = min(fl, key=lambda f: max(0, f['x0'] - cx, cx - f['x1']) + max(0, f['y0'] - cy, cy - f['feet']))
        if max(0, f['x0'] - cx, cx - f['x1']) + max(0, f['y0'] - cy, cy - f['feet']) < 40 * s: f['parts'].append(c)
    by = {f['rc']: f for f in fl}
    st = by.get((0, 0))
    if not st: raise SystemExit('⛔ 서 있기(0줄 1칸) 없음')
    body0 = max(st['parts'], key=lambda p: p['n']); sc = TARGET / (body0['y1'] - body0['y0'] + 1)
    src_px = im.load(); out = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0)); report = []; warn = []
    for r in range(ROWS):
        n = sum(1 for c in range(COLS) if (r, c) in by)
        if n != WANT[r]: warn.append(f'{r + 1}줄 {n}칸(주문 {WANT[r]})')
        for c in range(COLS):
            f = by.get((r, c))
            if not f: continue
            x0 = min(p['x0'] for p in f['parts']); y0 = min(p['y0'] for p in f['parts']); x1 = max(p['x1'] for p in f['parts']); y1 = max(p['y1'] for p in f['parts'])
            tile = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0)); tp = tile.load()
            for p in f['parts']:
                for u, v in p['px']: tp[u - x0, v - y0] = src_px[u, v]
            tw, th = max(1, round(tile.size[0] * sc)), max(1, round(tile.size[1] * sc)); tile = tile.resize((tw, th), Image.NEAREST)
            body = max(f['parts'], key=lambda p: p['n']); bot = round((body['y1'] - y0 + 1) * sc); top = round((body['y0'] - y0) * sc)
            leg0 = top + int((bot - top) * 0.6); a = tile.getchannel('A').load()
            lx = sorted(x for y in range(min(leg0, th - 1), min(bot, th)) for x in range(tw) if a[x, y])
            cx = lx[len(lx) // 2] if lx else tw // 2
            ox = CW * c + CW // 2 - cx; oy = CH * r + CH - BASE - bot
            cell = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0)); cell.alpha_composite(tile, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
            box = (CW * c, CH * r, CW * (c + 1), CH * (r + 1)); inside = cell.crop(box)
            tot = sum(1 for v in tile.getchannel('A').get_flattened_data() if v); kept = sum(1 for v in inside.getchannel('A').get_flattened_data() if v)
            out.alpha_composite(inside, (CW * c, CH * r))
            if tot - kept > 0: report.append(f'{r + 1}줄 {c + 1}칸 잘림 {tot - kept}')
    c1 = out.crop((0, 0, CW, CH)); filled = 0
    for c in range(1, COLS):
        if not out.crop((CW * c, 0, CW * (c + 1), CH)).getbbox(): out.paste(c1, (CW * c, 0)); filled += 1
    a = out.getchannel('A').point(lambda v: 255 if v > 0 else 0)
    q = out.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA'); q.putalpha(a)
    q.save(dst, 'WEBP', lossless=True, quality=100, method=6)
    if prev:
        p = Image.new('RGBA', out.size, (40, 44, 56, 255)); p.alpha_composite(out); d = ImageDraw.Draw(p)
        for r in range(ROWS):
            d.line([(0, CH * r + CH - BASE), (CW * COLS, CH * r + CH - BASE)], fill=(255, 210, 0, 120))
            for c in range(COLS): d.rectangle([CW * c, CH * r, CW * c + CW - 1, CH * r + CH - 1], outline=(90, 100, 120, 255))
        p.save(prev)
    print(f'키 {body0["y1"] - body0["y0"] + 1} → {TARGET} (×{sc:.2f}) · 서 있기 채움 {filled} · 바탕 구멍 {nh}')
    for w in warn: print('⚠', w)
    for x in report: print('✂', x)

if __name__ == '__main__':
    run(*sys.argv[1:])
