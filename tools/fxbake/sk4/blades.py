# ⚔ 삼연 참격(slash) · 쌍월 참(twin) v4
#   slash A = 「레이저 말고 칼날이 선을 따라 베어지듯 잘려 나가는 느낌」: 칼끝(밝은 쐐기)이 선을 따라 달리고 → 지나간 자리에 가는 금 →
#             금이 위아래로 벌어지며(틈) 불꽃 · 파편이 튐 · 세 번(↘ ↗ →)
#   slash B = 칼 궤적(초승달 휘두름) 세 번 + 같은 「벌어지는 틈」 · 마지막에 세 틈이 동시에 번쩍
#   twin A  = 「달빛베기를 크게 여러 번」: 큰 초승달 6번(돌아가며 · 점점 크게) → 마지막 큰 X 두 달 + 빛 터짐
#   twin B  = 뒤에 보름달이 떠오르고 달 둘레를 초승달 베기가 연달아 8번 → 달이 깨지듯 번쩍
import math, random
import numpy as np
from lib import Canvas, hexc, poly, disc, ell, line, taper, arc_pts, crescent, multi, ease_out, ease_in, clamp, bump

WHITE, STEEL, EDGE, SPARK, MOON, MOONG = hexc('#ffffff'), hexc('#6fa8ff'), hexc('#e6f4ff'), hexc('#ffcf4a'), hexc('#fff0b0'), hexc('#ffb52e')

def cut(c, x0, y0, x1, y1, t, seed, big=1.0, bend=0.0):
    """칼날 한 번: t = 이 베기가 시작한 뒤 초 (0 ~ 0.6)"""
    if t < 0: return
    L = math.hypot(x1 - x0, y1 - y0); ux, uy = (x1 - x0) / L, (y1 - y0) / L; nx, ny = -uy, ux
    def at(u): b = math.sin(math.pi * u) * bend; return (x0 + (x1 - x0) * u + nx * b, y0 + (y1 - y0) * u + ny * b)
    q = ease_out(clamp(t / 0.1))  # 칼끝이 달린 정도
    pts = [at(u) for u in np.linspace(0, q, 30)]
    # ① 칼끝 쐐기 + 짧은 꼬리 (달리는 동안)
    if t < 0.14:
        tail = [at(u) for u in np.linspace(max(0, q - 0.35), q, 14)]
        c.add(c.mask(taper(tail, 0.5, 7 * big), 3), STEEL, 0.9)
        c.over(c.mask(taper(tail, 0.5, 5 * big)), EDGE, 0.95)
        hx, hy = at(q); c.add(c.mask(disc(hx, hy, 5 * big), 4), WHITE, 1.4)
    # ② 지나간 자리의 금 → 벌어지는 틈
    gap = ease_out(clamp((t - 0.08) / 0.22)) * 3.2 * big; a = clamp(1.25 - t * 1.9)
    if a > 0 and len(pts) > 2:
        for sgn in (-1, 1):
            off = [(x + nx * gap * sgn, y + ny * gap * sgn) for x, y in pts]
            c.over(c.mask(taper(off, 0.6, 2.2 * big)), WHITE if gap < 1.5 else EDGE, a)
            c.add(c.mask(line(off, 1.2), 2), STEEL, a * 0.6)
        if gap > 0.6:  # 틈 속 어두운 띠(잘린 공간)
            c.over(c.mask(taper(pts, 0.4, gap * 1.4)), hexc('#1a1030'), a * 0.55)
    # ③ 불꽃 · 파편 (틈에서 수직으로 튐)
    r = random.Random(seed)
    for k in range(int(22 * big)):
        u = r.uniform(0.1, 0.95); st = 0.03 + u * 0.1; tt = t - st
        if tt <= 0 or tt > 0.45: continue
        px, py = at(u); sgn = r.choice((-1, 1)); v = r.uniform(40, 150) * big
        dx = nx * sgn * v + ux * r.uniform(-30, 60); dy = ny * sgn * v + uy * r.uniform(-30, 60)
        x2, y2 = px + dx * tt, py + dy * tt + 120 * tt * tt; x1_, y1_ = px + dx * max(0, tt - 0.04), py + dy * max(0, tt - 0.04)
        aa = clamp(1 - tt / 0.45)
        c.add(c.mask(line([(x1_, y1_), (x2, y2)], 1.4)), SPARK if k % 3 else WHITE, aa * 1.2)

def slash_A(W=240, H=150, n=22, fps=20):
    cx, cy = 140, 78; frames = []
    cuts = [((cx - 70, cy - 48), (cx + 62, cy + 40), 0.0, 6), ((cx - 66, cy + 44), (cx + 66, cy - 42), 0.16, -6), ((cx - 80, cy + 2), (cx + 80, cy - 4), 0.32, 0)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        for k, ((x0, y0), (x1, y1), st, b) in enumerate(cuts): cut(c, x0, y0, x1, y1, t - st, 10 + k, 1.0 + 0.15 * k, b)
        if 0.32 < t < 0.46: c.add(c.mask(disc(cx, cy, 16), 8), WHITE, bump(t, 0.32, 0.46) * 1.3)
        frames.append(c.image())
    return frames, dict(px=cx, py=cy, pk=int(0.34 * fps))

def swing(c, cx, cy, r, a0, a1, t, dur=0.12, col=STEEL, w=14):
    """휘두름 궤적 = 굵은 초승달(앞 = 굵고 밝음 · 뒤 = 가늘게)"""
    if t < 0: return
    q = ease_out(clamp(t / dur)); fade = clamp(1 - max(0, t - dur) / 0.16)
    if fade <= 0: return
    head = a0 + (a1 - a0) * q; tail = a0 + (a1 - a0) * max(0, q - 0.55)
    pts = arc_pts(cx, cy, r, r * 0.7, tail, head, 30)
    c.add(c.mask(taper(pts, 1, w), 4), col, 0.8 * fade)
    c.over(c.mask(taper(pts, 0.5, w * 0.7)), EDGE, 0.9 * fade)
    c.over(c.mask(taper(pts[-12:], 0.5, w * 0.35)), WHITE, fade)

def slash_B(W=240, H=150, n=22, fps=20):
    cx, cy = 140, 78; frames = []
    sw = [(cx - 10, cy - 6, 70, -2.6, 0.2, 0.0), (cx + 10, cy + 4, 70, 0.6, 3.6, 0.14), (cx, cy, 80, -2.2, 0.9, 0.28)]
    cuts = [((cx - 60, cy - 40), (cx + 55, cy + 36), 0.06, 4), ((cx - 58, cy + 40), (cx + 58, cy - 38), 0.2, -4), ((cx - 72, cy + 2), (cx + 72, cy - 2), 0.34, 0)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        for k, (x, y, r, a0, a1, st) in enumerate(sw): swing(c, x, y, r, a0, a1, t - st)
        for k, ((x0, y0), (x1, y1), st, b) in enumerate(cuts): cut(c, x0, y0, x1, y1, t - st, 30 + k, 0.9, b)
        if 0.46 < t < 0.6:  # 세 틈 동시 번쩍
            for (x0, y0), (x1, y1), _, _ in cuts: c.add(c.mask(line([(x0, y0), (x1, y1)], 3), 3), WHITE, bump(t, 0.46, 0.6) * 1.2)
        frames.append(c.image())
    return frames, dict(px=cx, py=cy, pk=int(0.36 * fps))

def moon_slash(c, cx, cy, r, rot, t, dur=0.14, life=0.32, w=0.28):
    """초승달 베기 하나: 그려지며 커짐 → 빛나며 사라짐"""
    if t < 0 or t > life: return
    q = ease_out(clamp(t / dur)); a = clamp((life - t) / (life - dur)) if t > dur else 1
    rr = r * (0.85 + 0.15 * q)
    c.add(c.mask(crescent(cx, cy, rr, rr * w, rot, q), 3), MOONG, 1.1 * a)
    c.over(c.mask(crescent(cx, cy, rr, rr * w, rot, q)), MOON, a)
    c.over(c.mask(crescent(cx, cy, rr, rr * w * 0.35, rot, q)), WHITE, a)

def stars(c, cx, cy, t, n, R, seed, a=1.0):
    if t < 0: return
    r = random.Random(seed)
    for k in range(n):
        ang = r.uniform(0, 6.28); d = R * (0.3 + 0.7 * ease_out(clamp(t / 0.3))) * r.uniform(0.6, 1.2); s = r.uniform(1, 2.4)
        x, y = cx + math.cos(ang) * d, cy + math.sin(ang) * d * 0.8
        aa = a * clamp(1 - t / 0.5) * (0.6 + 0.4 * math.sin(k + t * 30))
        if aa > 0: c.add(c.mask(multi(line([(x - s * 2, y), (x + s * 2, y)], 1), line([(x, y - s * 2), (x, y + s * 2)], 1))), MOON, aa * 1.3)

def twin_A(W=260, H=180, n=28, fps=20):
    cx, cy = 140, 92; frames = []
    seq = [(0.00, 46, -0.4), (0.08, 52, 2.6), (0.16, 58, 0.9), (0.24, 64, -2.2), (0.32, 70, 1.8), (0.40, 76, -1.0)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        for k, (st, r, rot) in enumerate(seq): moon_slash(c, cx + math.cos(rot) * 6, cy + math.sin(rot) * 4, r, rot, t - st)
        # 마지막 큰 X 두 달
        for k, rot in enumerate((0.75, 0.75 + math.pi)): moon_slash(c, cx, cy, 86, rot, t - 0.5 - k * 0.04, 0.12, 0.5, 0.24)
        if 0.52 < t < 0.7: c.add(c.mask(disc(cx, cy, 24), 10), MOON, bump(t, 0.52, 0.7) * 1.5)
        stars(c, cx, cy, t - 0.52, 26, 90, 4)
        frames.append(c.image())
    return frames, dict(px=cx, py=cy, pk=int(0.52 * fps))

def twin_B(W=260, H=180, n=30, fps=20):
    cx, cy = 140, 92; frames = []
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        # 보름달 (뒤) 떠오름 → 끝에 깨지듯 번쩍
        ma = ease_out(clamp(t / 0.2)) * clamp((0.78 - t) / 0.1)
        if ma > 0:
            c.add(c.mask(disc(cx, cy, 40), 14), MOONG, 0.45 * ma)
            c.over(c.mask(disc(cx, cy, 34)), hexc('#fff6d8'), 0.35 * ma)
            for (dx, dy, rr) in ((-10, -8, 6), (8, 6, 4), (12, -12, 3)): c.over(c.mask(disc(cx + dx, cy + dy, rr)), hexc('#e8d9a6'), 0.35 * ma)
        for k in range(8):
            rot = k * 2.4 + 0.3; st = 0.1 + k * 0.06
            moon_slash(c, cx + math.cos(rot) * 30, cy + math.sin(rot) * 22, 58 + k * 3, rot + 1.6, t - st, 0.1, 0.28, 0.26)
        if 0.62 < t < 0.8: c.add(c.mask(disc(cx, cy, 40), 12), WHITE, bump(t, 0.62, 0.8) * 1.4)
        stars(c, cx, cy, t - 0.62, 30, 100, 8)
        frames.append(c.image())
    return frames, dict(px=cx, py=cy, pk=int(0.62 * fps))

ALL = {'slash-a': slash_A, 'slash-b': slash_B, 'twin-a': twin_A, 'twin-b': twin_B}
