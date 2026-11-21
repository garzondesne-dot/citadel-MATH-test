# 🌀 차원 소용돌이(vortex) · 🕳 블랙홀(void) v4
#   vortex A = 「더 크고 웅장하게」: 나선 팔 5개가 넓게 펼쳐지며 돌고(보라 · 파랑 · 분홍) 바깥 고리 · 별가루 → 가운데로 조여 → 빛 폭발
#   void A   = 「블랙홀 모양 + 빨아들이는 기믹」: 검은 구멍 + 빛 고리(광자 고리) + 기울어진 강착 원반(주황 → 보라 · 한쪽 더 밝음) + 바깥 알갱이가 나선으로 빨려 듦
#              → 몬스터 빨아들이기는 띠 밖 연출(몬스터 그림이 작아지며 끌려감) → ❓ 질문
#   void B   = 같은 블랙홀이 더 크게 열렸다가 마지막에 빛 기둥(제트)을 위아래로 뿜고 닫힘
import math, random
import numpy as np
from lib import Canvas, hexc, poly, disc, ell, line, taper, arc_pts, multi, ease_out, ease_in, clamp, bump

VP, VB, VK, VW = hexc('#a25bff'), hexc('#4f7dff'), hexc('#ff6fd8'), hexc('#f4e9ff')

def spiral(cx, cy, a0, R, turns=1.2, n=40, flat=0.62):
    pts = []
    for k in range(n + 1):
        u = k / n; a = a0 + u * turns * 6.283; r = R * (0.08 + 0.92 * u)
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r * flat))
    return pts

def vortex_A(W=280, H=220, n=30, fps=20):
    cx, cy = 140, 112; r = random.Random(6); frames = []
    dust = [dict(a=r.uniform(0, 6.28), rr=r.uniform(20, 130), s=r.uniform(0.8, 2.2)) for _ in range(70)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        g = ease_out(clamp(t / 0.35)); squeeze = ease_in(clamp((t - 0.55) / 0.2)); R = 125 * g * (1 - 0.85 * squeeze)
        a = clamp((0.85 - t) / 0.1)
        if R > 3 and a > 0:
            c.add(c.mask(ell(cx, cy, R * 0.9, R * 0.56), 14), VP, 0.35 * a)
            for k in range(5):
                col = (VP, VB, VK, VP, VB)[k]; a0 = k / 5 * 6.283 + t * 7
                pts = spiral(cx, cy, a0, R, 1.1)
                c.add(c.mask(taper(pts, 1, 9), 3), col, 0.9 * a)
                c.over(c.mask(taper(pts, 0.5, 5)), col, 0.95 * a)
                c.over(c.mask(taper(pts[len(pts) // 2:], 0.5, 2.4)), VW, 0.9 * a)
            c.add(c.mask(ell(cx, cy, R, R * 0.62, 2.5), 2), VB, 0.8 * a)
            for p in dust:
                aa = p['a'] + t * (9 - p['rr'] / 30); rr = p['rr'] * g * (1 - 0.85 * squeeze)
                c.over(c.mask(disc(cx + math.cos(aa) * rr, cy + math.sin(aa) * rr * 0.62, p['s'])), VW if p['s'] > 1.6 else VK, a)
            c.add(c.mask(disc(cx, cy, 10 + 8 * g), 6), VW, 1.2 * a)
        # 빛 폭발 0.72 ~
        tt = t - 0.72
        if tt >= 0:
            q = ease_out(clamp(tt / 0.3)); b = clamp((0.7 - tt) / 0.4)
            if tt < 0.1: c.add(c.mask(disc(cx, cy, 30), 12), VW, 1.6 * (1 - tt / 0.1))
            c.add(c.mask(ell(cx, cy, 20 + 120 * q, (20 + 120 * q) * 0.6, 4)), VP, b)
            c.add(c.mask(ell(cx, cy, 10 + 90 * q, (10 + 90 * q) * 0.6, 2.5)), VK, b)
            for k in range(14):
                ang = k / 14 * 6.283; L0 = 20 + 60 * q; L1 = L0 + 40 * q
                c.add(c.mask(taper([(cx + math.cos(ang) * L0, cy + math.sin(ang) * L0 * 0.6), (cx + math.cos(ang) * L1, cy + math.sin(ang) * L1 * 0.6)], 3, 0.5)), VW, b)
        frames.append(c.image())
    return frames, dict(px=cx, py=cy, pk=int(0.72 * fps))

ACC1, ACC2, ACC3, RING = hexc('#ffb347'), hexc('#ff5e3a'), hexc('#9b4dff'), hexc('#fff1c9')

def blackhole(c, cx, cy, R, t, a=1.0, tilt=0.32, rot=-0.18):
    """검은 구멍 + 원반(뒤 반쪽 → 구멍 → 앞 반쪽) + 광자 고리"""
    if R < 2 or a <= 0: return
    def disk(front):
        a0, a1 = (0.0, math.pi) if front else (math.pi, 2 * math.pi)  # 아래 반쪽 = 앞 · 위 반쪽 = 뒤
        for k, (col, rr, w) in enumerate(((ACC3, 2.5, 7), (ACC2, 2.0, 6), (ACC1, 1.6, 5), (RING, 1.3, 2.5))):
            for sgm in range(6):  # 왼쪽이 더 밝게(다가오는 쪽)
                b0 = a0 + (a1 - a0) * sgm / 6; b1 = a0 + (a1 - a0) * (sgm + 1) / 6 + 0.02
                br = 0.55 + 0.45 * -math.cos((b0 + b1) / 2)
                pts = arc_pts(cx, cy, R * rr, R * rr * tilt, b0, b1, 8, rot)
                c.over(c.mask(line(pts, w)), col, a * (0.55 + 0.45 * br))
            for s_ in range(5):  # 도는 밝은 줄
                q0 = ((s_ / 5) * 6.283 + t * (5 - k)) % 6.283
                if (q0 < math.pi) != front: continue
                pts = arc_pts(cx, cy, R * rr, R * rr * tilt, q0, q0 + 0.35, 6, rot)
                c.add(c.mask(line(pts, max(1, w * 0.5))), RING, a * 0.9)
    c.add(c.mask(disc(cx, cy, R * 1.5), R * 0.5), ACC3, 0.25 * a)  # 둘레 빛
    disk(False)
    c.add(c.mask(ell(cx, cy, R * 1.12, R * 1.12, max(1.5, R * 0.12)), 2), RING, 1.2 * a)  # 광자 고리
    c.over(c.mask(disc(cx, cy, R)), hexc('#000000'), a)
    disk(True)

def suck(c, cx, cy, ps, t, a=1.0):
    """바깥 알갱이가 나선으로 빨려 듦"""
    for p in ps:
        tt = (t * p['v'] + p['ph']) % 1.0; rr = p['r0'] * (1 - tt) ** 1.4; ang = p['a'] + tt * 7
        x, y = cx + math.cos(ang) * rr, cy + math.sin(ang) * rr * 0.45
        x2, y2 = cx + math.cos(ang - 0.25) * rr * 1.08, cy + math.sin(ang - 0.25) * rr * 1.08 * 0.45
        c.add(c.mask(line([(x2, y2), (x, y)], p['s'])), p['col'], a * clamp(tt * 4) * clamp((1 - tt) * 5))

def void_A(W=260, H=200, n=32, fps=20):
    cx, cy = 130, 104; r = random.Random(12); frames = []
    ps = [dict(a=r.uniform(0, 6.28), r0=r.uniform(70, 130), v=r.uniform(1.2, 2.2), ph=r.random(), s=r.uniform(1, 2.2), col=r.choice((ACC1, ACC3, RING, hexc('#c9b6ff')))) for _ in range(60)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        open_ = ease_out(clamp(t / 0.3)); close = ease_in(clamp((t - 0.95) / 0.15)); R = 26 * open_ * (1 - close)
        a = 1.0
        suck(c, cx, cy, ps, t, clamp(open_ * 2) * (1 - close))
        blackhole(c, cx, cy, R, t, a)
        tt = t - 1.1  # 닫히며 터짐
        if tt >= 0:
            q = ease_out(clamp(tt / 0.25)); b = clamp((0.5 - tt) / 0.3)
            if tt < 0.08: c.add(c.mask(disc(cx, cy, 20), 8), RING, 1.6 * (1 - tt / 0.08))
            c.add(c.mask(ell(cx, cy, 10 + 110 * q, (10 + 110 * q) * 0.45, 3)), ACC3, b)
            c.add(c.mask(ell(cx, cy, 6 + 80 * q, (6 + 80 * q) * 0.45, 2)), ACC1, b)
        frames.append(c.image())
    return frames, dict(px=cx, py=cy, pk=int(0.3 * fps))

def void_B(W=260, H=240, n=32, fps=20):
    cx, cy = 130, 124; r = random.Random(13); frames = []
    ps = [dict(a=r.uniform(0, 6.28), r0=r.uniform(80, 140), v=r.uniform(1.4, 2.4), ph=r.random(), s=r.uniform(1, 2.4), col=r.choice((ACC1, ACC3, RING))) for _ in range(70)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        open_ = ease_out(clamp(t / 0.35)); close = ease_in(clamp((t - 1.0) / 0.2)); R = 34 * open_ * (1 - close)
        suck(c, cx, cy, ps, t, clamp(open_ * 2) * (1 - close))
        # 제트 (빛 기둥 위아래) 0.7 ~ 1.0
        jt = bump(t, 0.7, 1.15)
        if jt > 0:
            for sgn in (-1, 1):
                L = 110 * jt; pts = [(cx, cy), (cx + 6 * sgn * -1, cy + sgn * L)]
                c.add(c.mask(taper(pts, 14, 2), 5), ACC3, jt)
                c.add(c.mask(taper(pts, 7, 1)), RING, jt * 1.2)
        blackhole(c, cx, cy, R, t, 1.0, 0.3, 0.12)
        tt = t - 1.18
        if tt >= 0:
            q = ease_out(clamp(tt / 0.25)); b = clamp((0.42 - tt) / 0.25)
            if tt < 0.08: c.add(c.mask(disc(cx, cy, 24), 8), RING, 1.6 * (1 - tt / 0.08))
            c.add(c.mask(ell(cx, cy, 10 + 120 * q, (10 + 120 * q) * 0.42, 3)), ACC3, b)
        frames.append(c.image())
    return frames, dict(px=cx, py=cy, pk=int(0.35 * fps))

ALL = {'vortex-a': vortex_A, 'void-a': void_A, 'void-b': void_B}
