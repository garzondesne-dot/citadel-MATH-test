# 🔀 #110 기존 띠 + 새 안 섞기 (선생님 「뇌명이랑 불기둥은 기존 거랑 새 거랑 섞어 줘」 · 도감 의견)
#   thunder-mix = 기존 뇌명 띠(public/art/pfx/fx-thunder-v1 · 큰 번개 · 색 · 박자) 그대로 깔고 + 새 안의 「연쇄로 옆으로 퍼지는 번개 · 번쩍 · 잔향」
#   pillar-mix  = 기존 화염 기둥 띠(fx-pillar-v1 · 기둥 모양 · 색) 그대로 깔고 + 새 안 a 의 「옆 기둥 여러 개 · 큰 불덩이 폭발 · 연기」
#   기존 띠 = 15fps → 20fps 로 칸을 다시 뽑아 씀(늘이거나 다시 그리지 않음) · 크기 = 새 안과 같은 칸(300 × 180 · 260 × 220)
import math, os, random
import numpy as np
from PIL import Image
from lib import Canvas, disc, ell, ease_out, clamp
import storm

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
OLD = {'thunder': ('fx-thunder-v1.webp', 252, 151, 22, 15), 'pillar': ('fx-pillar-v1.webp', 169, 208, 22, 15)}

def old_frames(k):
    fn, w, h, n, fps = OLD[k]; im = Image.open(os.path.join(ROOT, 'public', 'art', 'pfx', fn)).convert('RGBA')
    cols = im.width // w
    return [im.crop(((i % cols) * w, (i // cols) * h, (i % cols) * w + w, (i // cols) * h + h)) for i in range(n)], fps

def under(c, img, ox, oy, a=1.0):
    """기존 띠 한 칸을 바닥에 깔기 (Canvas = 곱한 색 · 알파)"""
    arr = np.asarray(img, np.float32) / 255; H, W = arr.shape[:2]
    x0, y0 = max(0, ox), max(0, oy); x1, y1 = min(c.w, ox + W), min(c.h, oy + H)
    if x1 <= x0 or y1 <= y0: return
    sub = arr[y0 - oy:y1 - oy, x0 - ox:x1 - ox]; al = sub[..., 3] * a
    o = Canvas(c.w, c.h); o.C[y0:y1, x0:x1] = sub[..., :3] * al[..., None]; o.A[y0:y1, x0:x1] = al
    c.paste(o)

def thunder_mix(W=300, H=180, n=30, fps=20):
    fr, ofps = old_frames('thunder'); hx, hy = 150, 140  # 맞는 점 = 기존 띠 (127, 120) 자리
    ox, oy = hx - 127, hy - 120
    nodes = [(hx, hy), (hx - 52, hy + 2), (hx + 56, hy), (hx - 102, hy + 6), (hx + 106, hy + 4), (hx - 138, hy + 10), (hx + 138, hy + 8)]
    links = [(0, 1, 0.24), (0, 2, 0.26), (1, 3, 0.32), (2, 4, 0.34), (3, 5, 0.40), (4, 6, 0.42)]  # 기존 번개가 꽂힌 뒤(0.2초) 옆으로 퍼짐
    frames = []
    for i in range(n):
        t = i / fps; c = Canvas(W, H); r = random.Random(3000 + i)
        k = int(t * ofps)
        if k < len(fr): under(c, fr[k], ox, oy)
        if 0.2 <= t < 0.3: c.add(c.mask(disc(hx, hy - 30, 26), 10), storm.LW, 1.3 * (1 - (t - 0.2) / 0.1))  # 꽂히는 순간 번쩍 더
        for (a_, b_, st) in links:
            tt = t - st
            if tt < 0 or tt > 0.26: continue
            (x0, y0), (x1, y1) = nodes[a_], nodes[b_]; q = ease_out(clamp(tt / 0.05)); a = clamp((0.26 - tt) / 0.12)
            storm.draw_bolt(c, storm.bolt(r, x0, y0, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, 0.32, 4), a, 2.6)
            if tt < 0.08: c.add(c.mask(disc(x1, y1, 7), 4), storm.LW, 1.4 * (1 - tt / 0.08))
            if 0.04 < tt < 0.2:  # 연쇄 끝에서 짧게 위로 튀는 가지
                storm.draw_bolt(c, storm.bolt(r, x1, y1, x1 + r.uniform(-12, 12), y1 - r.uniform(22, 40), 0.35, 3), a * 0.8, 1.6)
        for kk, (x, y) in enumerate(nodes):  # 잔향 = 지지직 · 빛 점 (퍼진 자리마다)
            st = 0.42 + (kk // 2) * 0.06; tt = t - st
            if tt >= 0: storm.afterglow(c, r, x, y, tt, clamp((0.9 - tt) / 0.6), 4)
        frames.append(c.image())
    return frames, dict(px=hx, py=hy, pk=int(0.2 * fps), name='thunder-mix')

def pillar_mix(W=260, H=220, n=30, fps=20):
    fr, ofps = old_frames('pillar'); cx, base = 130, 210  # 기존 띠 바닥 (84, 185) 자리
    ox, oy = cx - 84, base - 185 - 2
    side = [(-82, 0.05, 104, 11), (78, 0.13, 118, 12), (-46, 0.22, 136, 12), (48, 0.30, 128, 12)]  # 기존 큰 기둥보다 먼저 옆에서 차례로
    rb = random.Random(5); emb = [dict(a=rb.uniform(-3.0, -0.1), v=rb.uniform(70, 230), s=rb.uniform(1, 2.6)) for _ in range(56)]
    boom = 0.78  # 기존 기둥이 가장 클 때(맞는 칸) 바로 뒤 큰 폭발
    frames = []
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        for k, (dx, st, hh, wd) in enumerate(side):
            tt = t - st
            if tt < 0 or tt > 0.75: continue
            pre = clamp(tt / 0.1); c.add(c.mask(ell(cx + dx, base, wd * 1.8, 4), 2), storm.F_O, 0.8 * pre * clamp((0.75 - tt) / 0.2))
            up = ease_out(clamp((tt - 0.08) / 0.12)); dn = clamp((0.7 - tt) / 0.22)
            storm.flame_col(c, cx + dx, base, hh * up * (0.6 + 0.4 * dn), wd, t, k * 11, dn)
        k = int(t * ofps)
        if k < len(fr): under(c, fr[k], ox, oy)  # 기존 큰 기둥 = 가운데 · 옆 기둥 위
        tt = t - boom
        if tt >= 0:  # 새 안 폭발: 불덩이 여러 개가 부풀고 → 연기로 식어 위로 · 불티
            g = ease_out(clamp(tt / 0.26)); cool = clamp((tt - 0.16) / 0.42); a = clamp((0.72 - tt) / 0.3)
            rq = random.Random(91); cy = base - 120
            for kk in range(16):
                ang = rq.uniform(0, 6.28); d = rq.uniform(0, 36) * g; rr = (13 + rq.uniform(0, 15)) * (0.4 + 0.8 * g)
                x = cx + math.cos(ang) * d; y = cy + math.sin(ang) * d * 0.8 - cool * 28 * rq.uniform(0.5, 1.2)
                c.over(c.mask(disc(x, y, rr * (1 + cool * 0.3))), storm.SMOKE, a * clamp(cool * 2) * 0.85)
                if cool < 1:
                    hot = 1 - cool
                    c.over(c.mask(disc(x, y, rr * 0.9)), storm.F_R, a * hot)
                    c.over(c.mask(disc(x - 1, y - 2, rr * 0.65)), storm.F_O, a * hot)
                    if hot > 0.4: c.over(c.mask(disc(x - 2, y - 3, rr * 0.38)), storm.F_Y, a * (hot - 0.4) / 0.6)
            if tt < 0.12: c.add(c.mask(disc(cx, cy, 32), 8), storm.F_CORE, 1.4 * (1 - tt / 0.12))
            for p in emb:
                d = p['v'] * tt; x = cx + math.cos(p['a']) * d; y = cy + math.sin(p['a']) * d + 170 * tt * tt
                aa = clamp(1 - tt / 0.7)
                if aa > 0: c.over(c.mask(disc(x, y, p['s'])), storm.F_Y if p['s'] > 2 else storm.F_O, aa)
        frames.append(c.image())
    return frames, dict(px=cx, py=base - 100, pk=int(round(0.73 * fps)), name='pillar-mix')

ALL = {'thunder-mix': thunder_mix, 'pillar-mix': pillar_mix}
