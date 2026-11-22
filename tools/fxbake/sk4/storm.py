# 🌪 대선풍(cyclone) · 🔥 화염 기둥(pillar) · ⚡ 뇌명(thunder) v4
#   cyclone A = 「크기를 키우고 공격인 것처럼 치명적이게」: 큰 깔때기(고리 겹 · 빙빙) + 돌며 튀어나가는 바람 칼날 + 돌 · 잎 파편 + 바닥 먼지
#   pillar A  = 「화염 기둥 여러 개 + 폭발」: 바닥 빛 → 기둥 4개 차례로 솟음 → 가운데 큰 불덩이 폭발 + 연기 고리 + 불티
#   thunder A = 「연쇄 번개처럼 퍼져 나가며 번개 잔향」: 위에서 내리꽂힘 → 양옆으로 줄줄이 튀어 퍼짐(5마디) → 잔향(가는 번개 꼬리 · 빛 점 · 지지직)
#   thunder B = 몬스터 둘레에 번개 고리가 감기며 사방으로 가지 번개 → 같은 잔향
import math, random
import numpy as np
from lib import Canvas, hexc, poly, disc, ell, line, taper, arc_pts, multi, ease_out, ease_in, clamp, bump

def bolt(r, x0, y0, x1, y1, rough=0.22, depth=5):
    pts = [(x0, y0), (x1, y1)]
    for d in range(depth):
        out = [pts[0]]
        for (a, b) in zip(pts, pts[1:]):
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; L = math.hypot(b[0] - a[0], b[1] - a[1])
            nx, ny = -(b[1] - a[1]) / (L or 1), (b[0] - a[0]) / (L or 1); o = r.uniform(-1, 1) * L * rough
            out += [(mx + nx * o, my + ny * o), b]
        pts = out
    return pts

# ── 대선풍 ──
WIND, WIND2, DUST, BLADE = hexc('#cfe9e4'), hexc('#7fb8b0'), hexc('#8a7a62'), hexc('#ffffff')
def cyclone_A(W=230, H=250, n=26, fps=20):
    cx, base = 115, 236; r = random.Random(3); frames = []
    deb = [dict(h=r.uniform(0.1, 0.95), a=r.uniform(0, 6.28), s=r.uniform(1.5, 3.5), col=r.choice((hexc('#6b5a44'), hexc('#4f8f3a'), hexc('#9a8a70')))) for _ in range(34)]
    blades = [dict(st=0.25 + k * 0.07, h=r.uniform(0.25, 0.8), a=r.uniform(0, 6.28), dir=r.choice((-1, 1))) for k in range(10)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        g = ease_out(clamp(t / 0.35)); fade = clamp((1.3 - t) / 0.3); HH = 220 * g
        if fade <= 0 or g < 0.08: frames.append(c.image()); continue
        # 바닥 먼지
        for k in range(14):
            a = k / 14 * 6.28 + t * 6; rr = 30 + 30 * g + 8 * math.sin(k * 3 + t * 9)
            c.over(c.mask(disc(cx + math.cos(a) * rr, base - 6 + math.sin(a) * 6, 6 + (k % 3) * 2), 1.5), DUST, 0.45 * fade)
        # 깔때기 = 고리 겹 (아래 좁고 위 넓음 · 위상 돌기)
        for k in range(22):
            u = k / 21; y = base - 10 - u * HH; R = (8 + 70 * u ** 1.3) * (0.6 + 0.4 * g); sway = math.sin(u * 4 + t * 7) * 10 * u
            ph = t * 14 + k * 0.7
            pts = arc_pts(cx + sway, y, R, R * 0.22, ph, ph + 4.2, 24)
            c.over(c.mask(taper(pts, 0.5, 3.2 + u * 2.5)), WIND if k % 2 else WIND2, 0.85 * fade)
            c.add(c.mask(taper(pts[-8:], 0.5, 2.2)), BLADE, 0.6 * fade)
        # 파편 (돌 · 잎) 빙빙
        for p in deb:
            u = p['h']; y = base - 10 - u * HH; R = (8 + 70 * u ** 1.3) * (0.6 + 0.4 * g); a = p['a'] + t * 12
            c.over(c.mask(disc(cx + math.cos(a) * R, y + math.sin(a) * R * 0.22, p['s'])), p['col'], fade)
        # 바람 칼날: 깔때기에서 튀어 나가 베고 사라짐 (치명적)
        for b in blades:
            tt = t - b['st']
            if tt < 0 or tt > 0.3: continue
            u = b['h']; y0 = base - 10 - u * HH; R = 30 + 160 * ease_out(tt / 0.3); a = b['a'] + tt * 8 * b['dir']
            pts = arc_pts(cx, y0, R, R * 0.3, a, a + 0.9 * b['dir'], 16)
            aa = clamp(1 - tt / 0.3)
            c.add(c.mask(taper(pts, 0.5, 5), 2), WIND, aa)
            c.over(c.mask(taper(pts, 0.5, 3)), BLADE, aa)
        frames.append(c.image())
    return frames, dict(px=cx, py=base - 70, pk=int(0.35 * fps))

# ── 화염 기둥 ──
F_CORE, F_Y, F_O, F_R, SMOKE = hexc('#fffbe0'), hexc('#ffd23a'), hexc('#ff8a1e'), hexc('#d8321a'), hexc('#4a3a3a')
def flame_col(c, x, base, hgt, wd, t, seed, a=1.0):
    if hgt < 2 or a <= 0: return
    r = random.Random(seed + int(t * 40))
    def side(sgn, scale):
        pts = []
        for k in range(14):
            u = k / 13; y = base - hgt * u; w = wd * scale * (1 - u ** 1.6) * (1 + 0.25 * math.sin(u * 9 + t * 30 + seed)) + r.uniform(-1, 1)
            pts.append((x + sgn * w, y))
        return pts
    for col, sc in ((F_R, 1.25), (F_O, 1.0), (F_Y, 0.7), (F_CORE, 0.38)):
        L = side(-1, sc); R = side(1, sc); c.over(c.mask(poly(L + R[::-1])), col, a)
    c.add(c.mask(disc(x, base - hgt * 0.4, wd * 1.1), 6), F_O, 0.5 * a)
    for k in range(6):  # 위로 튀는 불티
        yy = base - hgt * (0.7 + 0.5 * r.random()); c.over(c.mask(disc(x + r.uniform(-wd, wd), yy, r.uniform(1, 2.2))), F_Y if k % 2 else F_O, a)

def pillar_A(W=260, H=220, n=30, fps=20):
    cx, base = 130, 206; r = random.Random(4); frames = []
    cols = [(-70, 0.0, 120, 12), (40, 0.1, 150, 14), (-25, 0.2, 170, 15), (75, 0.3, 130, 12)]
    emb = [dict(a=r.uniform(-3.0, -0.1), v=r.uniform(60, 220), s=r.uniform(1, 2.6)) for _ in range(50)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        for k, (dx, st, hh, wd) in enumerate(cols):
            tt = t - st
            if tt < 0: continue
            # 바닥 빛 (예고) → 솟음 → 줄어듦
            pre = clamp(tt / 0.1); c.add(c.mask(ell(cx + dx, base, wd * 1.8, 4), 2), F_O, 0.8 * pre * clamp((0.7 - tt) / 0.2))
            up = ease_out(clamp((tt - 0.08) / 0.12)); dn = clamp((0.62 - tt) / 0.2)
            flame_col(c, cx + dx, base, hh * up * (0.6 + 0.4 * dn), wd, t, k * 7, dn)
        # 폭발 0.5 ~ : 불덩이 덩이 여러 개가 부풀며 → 어두운 연기로 식어 위로
        tt = t - 0.5
        if tt >= 0:
            g = ease_out(clamp(tt / 0.28)); cool = clamp((tt - 0.18) / 0.45); a = clamp((1.0 - tt) / 0.35)
            rb = random.Random(77)
            for k in range(16):
                ang = rb.uniform(0, 6.28); d = rb.uniform(0, 34) * g; rr = (14 + rb.uniform(0, 16)) * (0.4 + 0.8 * g)
                x = cx + math.cos(ang) * d; y = base - 58 + math.sin(ang) * d * 0.8 - cool * 30 * rb.uniform(0.5, 1.2)
                c.over(c.mask(disc(x, y, rr * (1 + cool * 0.3))), SMOKE, a * clamp(cool * 2) * 0.85)
                if cool < 1:
                    hot = 1 - cool
                    c.over(c.mask(disc(x, y, rr * 0.9)), F_R, a * hot)
                    c.over(c.mask(disc(x - 1, y - 2, rr * 0.65)), F_O, a * hot)
                    if hot > 0.4: c.over(c.mask(disc(x - 2, y - 3, rr * 0.38)), F_Y, a * (hot - 0.4) / 0.6)
            if tt < 0.12: c.add(c.mask(disc(cx, base - 60, 30), 8), F_CORE, 1.4 * (1 - tt / 0.12))
            c.add(c.mask(ell(cx, base - 2, 40 + 80 * g, 6, 3), 2), F_O, a * 0.7 * (1 - cool))
            for p in emb:
                d = p['v'] * tt; x = cx + math.cos(p['a']) * d; y = base - 60 + math.sin(p['a']) * d + 160 * tt * tt
                aa = clamp(1 - tt / 0.8)
                if aa > 0: c.over(c.mask(disc(x, y, p['s'])), F_Y if p['s'] > 2 else F_O, aa)
        frames.append(c.image())
    return frames, dict(px=cx, py=base - 60, pk=int(0.5 * fps))

# ── 뇌명 ──
LB, LC, LW = hexc('#5aa8ff'), hexc('#b8e4ff'), hexc('#ffffff')
def draw_bolt(c, pts, a, w=2.4):
    if a <= 0: return
    c.add(c.mask(line(pts, w * 2.5), 4), LB, 0.9 * a)
    c.over(c.mask(line(pts, w)), LC, a)
    c.over(c.mask(line(pts, max(1, w * 0.45))), LW, a)

def afterglow(c, r, x, y, t, a, n=5):
    """번개 잔향: 가는 짧은 번개 꼬리가 지지직 · 빛 점"""
    if a <= 0: return
    for k in range(n):
        if r.random() < 0.5:
            ang = r.uniform(0, 6.28); L = r.uniform(6, 18)
            c.add(c.mask(line(bolt(r, x, y, x + math.cos(ang) * L, y + math.sin(ang) * L, 0.35, 3), 1)), LC, a)
    c.add(c.mask(disc(x, y, 5), 4), LB, a * 0.7)

def thunder_A(W=300, H=180, n=30, fps=20):
    cx, base = 150, 150; frames = []
    nodes = [(cx, base - 40), (cx - 50, base - 30), (cx + 55, base - 34), (cx - 100, base - 22), (cx + 104, base - 26), (cx - 136, base - 14), (cx + 136, base - 16)]
    links = [(0, 1, 0.12), (0, 2, 0.14), (1, 3, 0.2), (2, 4, 0.22), (3, 5, 0.28), (4, 6, 0.3)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H); r = random.Random(1000 + i)
        # ① 내리꽂힘
        if 0.02 <= t < 0.3:
            a = 1 if t < 0.16 else clamp((0.3 - t) / 0.14)
            draw_bolt(c, bolt(r, cx + r.uniform(-20, 20), 0, cx, base - 40, 0.2, 5), a, 4.2)
            if t < 0.12: c.add(c.mask(disc(cx, base - 40, 14), 6), LW, 1.6 * (1 - t / 0.12))
        # ② 연쇄
        for (a_, b_, st) in links:
            tt = t - st
            if tt < 0 or tt > 0.25: continue
            (x0, y0), (x1, y1) = nodes[a_], nodes[b_]; q = ease_out(clamp(tt / 0.05)); a = clamp((0.25 - tt) / 0.12)
            draw_bolt(c, bolt(r, x0, y0, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, 0.3, 4), a, 3.0)
            if tt < 0.08: c.add(c.mask(disc(x1, y1, 7), 4), LW, 1.4 * (1 - tt / 0.08))
        # ③ 잔향
        for k, (x, y) in enumerate(nodes):
            st = 0.3 + (k // 2) * 0.06; tt = t - st
            if tt >= 0: afterglow(c, r, x, y, tt, clamp((0.8 - tt) / 0.6), 4)
        frames.append(c.image())
    return frames, dict(px=cx, py=base - 40, pk=int(0.04 * fps) + 1)

def thunder_B(W=260, H=200, n=30, fps=20):
    cx, cy = 130, 110; frames = []
    for i in range(n):
        t = i / fps; c = Canvas(W, H); r = random.Random(2000 + i)
        # 번개 고리가 감김 0 ~ 0.35
        if t < 0.45:
            q = ease_out(clamp(t / 0.3)); a = clamp((0.45 - t) / 0.12)
            for k in range(3):
                a0 = k * 2.1 + t * 10; pts = arc_pts(cx, cy, 50 - 12 * q, 26 - 6 * q, a0, a0 + 3.4 * q + 0.3, 18)
                pts = [(x + r.uniform(-2, 2), y + r.uniform(-2, 2)) for x, y in pts]
                draw_bolt(c, pts, a, 1.8)
        # 사방 가지 번개 0.32 ~ 0.6
        tt = t - 0.32
        if 0 <= tt < 0.3:
            a = 1 if tt < 0.12 else clamp((0.3 - tt) / 0.18)
            for k in range(8):
                ang = k / 8 * 6.28 + 0.3; L = 60 + 50 * ease_out(clamp(tt / 0.08))
                pts = bolt(r, cx, cy, cx + math.cos(ang) * L * 1.3, cy + math.sin(ang) * L * 0.8, 0.3, 4)
                draw_bolt(c, pts, a, 2.0)
            if tt < 0.1: c.add(c.mask(disc(cx, cy, 30), 12), LW, 1.4 * (1 - tt / 0.1))
        tt = t - 0.5
        if tt >= 0:
            for k in range(8):
                ang = k / 8 * 6.28 + 0.3; afterglow(c, r, cx + math.cos(ang) * 120 * 0.7, cy + math.sin(ang) * 70 * 0.7, tt, clamp((0.9 - tt) / 0.6), 3)
            afterglow(c, r, cx, cy, tt, clamp((0.9 - tt) / 0.6), 6)
        frames.append(c.image())
    return frames, dict(px=cx, py=cy, pk=int(0.32 * fps))

ALL = {'cyclone-a': cyclone_A}  # pillar-a · thunder-a · b = #110 으로 mix.py 가 대신 (함수는 mix 가 씀)
