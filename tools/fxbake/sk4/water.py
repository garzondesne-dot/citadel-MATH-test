# 🌊 파도 치기(wave) · 해일 베기(tsunami) v4 — 「제일 허접함 · 꼭 고쳐」
#   wave A = 말리는 큰 파도가 왼 → 오른쪽으로 몬스터를 덮침 → 물보라 기둥 · 거품 고리 → 물방울 떨어짐
#   wave B = 물결 세 겹이 연달아 밀려와 부딪힘(작은 파도 3번 + 마지막 큰 물보라)
#   tsunami A = 물의 칼날 X 베기 → 뒤에서 거대한 해일 벽이 일어나 덮침 → 큰 물기둥 3개
#   tsunami B = 하늘 위로 물이 소용돌이쳐 모였다가 칼날처럼 내려 벰 → 해일이 양옆으로 터짐
import math, random, sys
import numpy as np
from lib import Canvas, hexc, poly, disc, ell, line, taper, arc_pts, multi, ease_out, ease_in, clamp, bump, strip

DEEP, MID, LIGHT, FOAM = hexc('#0b3f8f'), hexc('#1f7fd6'), hexc('#5fd0ff'), hexc('#f2fbff')

def vgrad(h, w, y0, y1, c0, c1):
    t = np.clip((np.arange(h, dtype=np.float32)[:, None] - y0) / max(1, (y1 - y0)), 0, 1)
    t = np.repeat(t, w, 1)[..., None]
    return c0 * t + c1 * (1 - t)

def wave_shape(F, base, H, L, curl=1.0):
    """앞 끝 x=F · 바닥 y=base · 높이 H · 길이 L → (몸 점들, 입술 중심선, 꼭대기, 입술 반지름)
    몸 = 뒤 완만한 경사 → 꼭대기 → 입술 아래 오목한 앞면 → 바닥 · 입술 = 꼭대기에서 앞으로 말려 내려가는 가늘어지는 띠"""
    cx, cy = F - L * 0.16, base - H; r = H * 0.36 * curl
    body = [(F - L, base)]
    for i in range(1, 25):
        t = i / 24; body.append((F - L + (cx - (F - L)) * t, base - H * (t ** 1.6)))
    # 앞면: 꼭대기 바로 앞에서 오목하게 바닥으로 (입술 아래 빈 통)
    for k in range(1, 11):
        u = k / 10; x = cx + r * 0.55 * u + (F - cx) * 0.9 * (u ** 2.2); y = cy + (base - cy) * u
        body.append((x - r * 0.9 * math.sin(math.pi * u) * 0.5, y))
    body.append((F, base))
    lip = []
    for k in range(0, 15):
        a = -math.pi / 2 + k / 14 * math.pi * 1.05
        lip.append((cx + r * 0.35 + math.cos(a) * r, cy + r * 0.95 + math.sin(a) * r * 0.95))
    return body, lip, (cx, cy), r

def draw_wave(c, F, base, H, L, fade, curl=1.0, seed=0, i=0):
    if H < 3 or fade <= 0: return
    body, lip, (cx, cy), r = wave_shape(F, base, H, L, curl)
    bm = c.mask(poly(body)); c.over(bm, vgrad(c.h, c.w, base - H, base, DEEP, LIGHT), 0.97 * fade)
    # 통 안쪽 그늘 (입술 아래 · 몸 안에서만)
    c.over(c.mask(ell(cx + r * 0.2, cy + r * 1.25, r * 0.5, r * 0.75), 2) * bm, DEEP, 0.5 * fade)
    # 몸 안 물결 줄
    for off in (0.3, 0.55, 0.8):
        ln = [(F - L + (cx - (F - L)) * u, base - H * (u ** 1.6) * off) for u in np.linspace(0.12, 0.95, 14)]
        c.add(c.mask(line(ln, 1.4)), LIGHT, 0.32 * fade)
    # 입술 = 굵다 → 가늘게 말림 · 위는 거품
    c.over(c.mask(taper(lip, r * 0.62, 1.5)), vgrad(c.h, c.w, cy - r * 0.2, cy + r * 1.6, MID, LIGHT), fade)
    c.over(c.mask(taper(lip[:11], r * 0.2, 1.2)), FOAM, fade)
    crest = [(F - L + (cx - (F - L)) * u, base - H * (u ** 1.6)) for u in np.linspace(0.78, 1, 8)] + lip[:6]
    c.over(c.mask(line(crest, max(2.5, H * 0.05))), FOAM, fade)
    rr = random.Random(seed * 100 + i)
    for j in range(12):
        fx, fy = crest[rr.randrange(len(crest))]; c.over(c.mask(disc(fx + rr.uniform(-5, 6), fy - rr.uniform(0, 7), rr.uniform(1.0, 2.6))), FOAM, fade)
    # 앞 물보라 알갱이 (입술 끝 앞)
    ex, ey = lip[-1]
    for j in range(8):
        c.over(c.mask(disc(ex + rr.uniform(0, 14), ey + rr.uniform(-6, 10), rr.uniform(0.8, 2.0))), LIGHT if j % 2 else FOAM, fade * 0.9)

def drops(r, n, cx, cy, spread, up):
    return [dict(x=cx + r.uniform(-spread, spread) * 0.4, y=cy, vx=r.uniform(-spread, spread), vy=-r.uniform(up * 0.5, up), s=r.uniform(1.2, 3.2), d=r.uniform(0, 0.12)) for _ in range(n)]

def draw_drops(c, ds, t, g=420):
    for p in ds:
        tt = t - p['d']
        if tt <= 0: continue
        x = p['x'] + p['vx'] * tt; y = p['y'] + p['vy'] * tt + 0.5 * g * tt * tt
        a = clamp(1.2 - tt * 1.4)
        if a <= 0 or y > c.h + 4: continue
        c.over(c.mask(disc(x, y, p['s'])), LIGHT if p['s'] > 2.4 else FOAM, a)

_SPL = {}
def splash(c, x, base, t, power=1.0, seed=1, wide=1.0):
    """물보라 = 부채꼴로 튀는 물덩이(큰 것은 아래 · 작은 것은 높이) + 바닥 거품 덩이 · t = 부딪힌 뒤 초"""
    if t < 0: return
    key = (seed, power, wide)
    if key not in _SPL:
        r = random.Random(seed); ps = []
        for k in range(int(70 * power)):
            a = math.radians(r.uniform(-160, -20)); v = r.uniform(80, 300) * power; big = r.random() < 0.35
            ps.append(dict(vx=math.cos(a) * v * wide * (0.5 if big else 0.8), vy=math.sin(a) * v * (1.0 if big else 1.25), s=r.uniform(3, 6) if big else r.uniform(1, 2.6), d=r.uniform(0, 0.06), col=r.choice((MID, LIGHT, LIGHT, FOAM))))
        _SPL[key] = ps
    for p in _SPL[key]:
        tt = t - p['d']
        if tt <= 0: continue
        px = x + p['vx'] * tt; py = base - 4 + p['vy'] * tt + 0.5 * 600 * tt * tt
        if py > base + 2: continue
        s = p['s'] * clamp(1.15 - tt * 0.9); a = clamp(1.3 - tt * 1.2)
        if s < 0.6 or a <= 0: continue
        c.over(c.mask(disc(px, py, s)), p['col'], a)
    hc = 70 * power * ease_out(clamp(t / 0.18)) * clamp(1 - max(0, t - 0.3) * 3)
    splash_column(c, x, base, hc, 14 * power * wide, clamp(1.2 - t * 1.6))
    # 바닥 거품: 옆으로 퍼지는 흰 덩이 줄
    g = ease_out(clamp(t / 0.4)); a = clamp(1.2 - t * 1.0)
    if a > 0:
        r = random.Random(seed + 7)
        for k in range(18):
            u = (k / 17 - 0.5) * 2; fx = x + u * (20 + 90 * g * wide); fy = base - 2 - abs(math.sin(k * 1.7)) * 4
            c.over(c.mask(disc(fx, fy, (2.5 + r.uniform(0, 3)) * (1.1 - abs(u) * 0.5))), FOAM if k % 3 else LIGHT, a)

def splash_column(c, x, base, hgt, wd, a):
    """(옛 이름 · 지금은 물보라 덩이 기둥) 위로 솟는 물덩이 몇 개"""
    if a <= 0 or hgt <= 1: return
    for k in range(7):
        u = k / 6; yy = base - hgt * u; rr = wd * (1 - u * 0.6) * 0.6
        c.over(c.mask(disc(x + math.sin(k * 2.1) * wd * 0.25, yy, rr)), MID if k < 2 else LIGHT, a * 0.95)
    c.over(c.mask(multi(disc(x - wd * 0.15, base - hgt, wd * 0.32), disc(x + wd * 0.2, base - hgt * 0.93, wd * 0.25))), FOAM, a)

def foam_ring(c, x, y, r, a):
    return

def wave_A(W=240, H=160, n=24, fps=20):
    """큰 파도 하나가 말려 와서 몬스터를 덮침 → 물보라"""
    cx, base = 150, 146; frames = []
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        if t < 0.7:
            q = ease_in(clamp(t / 0.5)); F = -20 + q * 300; HH = (64 + 40 * math.sin(math.pi * clamp(t / 0.62))) * (1 - ease_in(clamp((t - 0.36) / 0.3))); fade = clamp((0.7 - t) / 0.06)
            draw_wave(c, F, base, HH, 170, fade, 1.0, 1, i)
        splash(c, cx, base, t - 0.33, 1.0, 3)
        if 0.33 <= t < 0.43: c.add(c.mask(disc(cx, base - 40, 13), 5), LIGHT, (0.43 - t) / 0.1 * 1.4)
        frames.append(c.image())
    return frames, dict(px=cx, py=base - 40, pk=int(0.33 * fps))

def wave_B(W=240, H=160, n=26, fps=20):
    """물결 세 겹이 연달아 밀려와 부딪힘 → 마지막 큰 물보라"""
    cx, base = 150, 146; frames = []
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        for k, (st, hh) in enumerate(((0.0, 40), (0.15, 54), (0.3, 80))):
            tt = t - st
            if tt < 0 or tt > 0.55: continue
            F = -10 + ease_in(clamp(tt / 0.4)) * 220; fade = clamp((0.55 - tt) / 0.06); hh = hh * (1 - ease_in(clamp((tt - 0.3) / 0.25)))
            draw_wave(c, F, base, hh, 110 + k * 25, fade, 0.85, 10 + k, i)
            if k < 2: splash(c, cx - 6 + k * 10, base, tt - 0.32, 0.45, 20 + k, 0.7)
        splash(c, cx, base, t - 0.62, 1.15, 31)
        if 0.62 <= t < 0.72: c.add(c.mask(disc(cx, base - 46, 15), 5), LIGHT, (0.72 - t) / 0.1 * 1.4)
        frames.append(c.image())
    return frames, dict(px=cx, py=base - 40, pk=int(0.62 * fps))

def water_blade(c, x0, y0, x1, y1, q, a, wd=9):
    """물 칼날 = 굽은 초승달 띠 · q = 그어진 정도"""
    if a <= 0 or q <= 0: return
    pts = []
    for u in np.linspace(0, q, 24):
        x = x0 + (x1 - x0) * u; y = y0 + (y1 - y0) * u; bend = math.sin(math.pi * u) * 18
        nx, ny = -(y1 - y0), (x1 - x0); L = math.hypot(nx, ny); pts.append((x + nx / L * bend, y + ny / L * bend))
    c.over(c.mask(taper(pts, 2, wd)), LIGHT, a)
    c.add(c.mask(taper(pts, 1, wd * 0.45)), FOAM, a * 1.2)
    c.add(c.mask(taper(pts, 2, wd), 4), LIGHT, a * 0.7)

def tsunami_A(W=280, H=200, n=30, fps=20):
    """물 칼날 X 베기 → 뒤에서 거대한 해일이 일어나 덮침 → 큰 물보라 3번"""
    cx, base = 170, 186; frames = []
    for i in range(n):
        t = i / fps; c = Canvas(W, H)
        for k, (x0, y0, x1, y1) in enumerate(((cx - 70, base - 150, cx + 60, base - 20), (cx - 70, base - 20, cx + 60, base - 150))):
            tt = t - k * 0.08; q = ease_out(clamp(tt / 0.14)); a = clamp(1 - max(0, tt - 0.2) * 4)
            water_blade(c, x0, y0, x1, y1, q, a, 13)
        if 0.14 < t < 0.3: c.add(c.mask(disc(cx - 5, base - 85, 16), 6), FOAM, bump(t, 0.14, 0.3) * 1.2)
        tt = t - 0.22
        if 0 <= tt < 0.75:
            F = -80 + ease_in(clamp(tt / 0.5)) * 420; HH = 160 * ease_out(clamp(tt / 0.32)) * (1 - ease_in(clamp((tt - 0.34) / 0.4))); fade = clamp((0.75 - tt) / 0.06)
            draw_wave(c, F, base, HH, 250, fade, 1.1, 5, i)
        for k, dx in enumerate((-46, 0, 48)): splash(c, cx + dx, base, t - 0.5 - k * 0.06, 1.0 if k != 1 else 1.4, 40 + k, 0.8)
        if 0.5 <= t < 0.62: c.add(c.mask(disc(cx, base - 70, 24), 5), LIGHT, (0.62 - t) / 0.12 * 1.4)
        frames.append(c.image())
    return frames, dict(px=cx, py=base - 80, pk=int(0.5 * fps))

def tsunami_B(W=280, H=200, n=30, fps=20):
    """물이 위로 소용돌이쳐 모였다가 칼날로 내려 벰 → 해일이 양옆으로 터짐"""
    cx, base = 140, 186; r = random.Random(9); frames = []
    sw = [dict(a=r.uniform(0, 6.28), rr=r.uniform(20, 62), s=r.uniform(1.5, 3.5)) for _ in range(46)]
    for i in range(n):
        t = i / fps; c = Canvas(W, H); oy = 50
        if t < 0.45:
            g = ease_out(clamp(t / 0.3)); fade = clamp((0.45 - t) / 0.1)
            for p in sw:
                a = p['a'] + t * 9; rr = p['rr'] * (1.4 - g * 0.9)
                c.over(c.mask(disc(cx + math.cos(a) * rr, oy + math.sin(a) * rr * 0.55, p['s'])), LIGHT, fade)
            c.over(c.mask(disc(cx, oy, 6 + 16 * g)), vgrad(H, W, oy - 22, oy + 22, MID, LIGHT), fade)
            c.add(c.mask(disc(cx, oy, 10 + 14 * g), 6), FOAM, 0.6 * fade)
        tt = t - 0.38
        if 0 <= tt < 0.3:
            q = ease_out(clamp(tt / 0.12)); a = clamp(1 - max(0, tt - 0.15) * 6)
            water_blade(c, cx + 36, oy - 6, cx - 20, base - 6, q, a, 18)
        tt = t - 0.5
        if 0 <= tt < 0.85:
            fade = clamp((0.85 - tt) / 0.06); HH = 120 * ease_out(clamp(tt / 0.25)) * (1 - ease_in(clamp((tt - 0.3) / 0.5))); F = cx + 20 + ease_out(clamp(tt / 0.55)) * 140
            o = Canvas(W, H); draw_wave(o, F, base, HH, 130, fade, 0.9, 7, i); c.paste(o)
            o = Canvas(W, H); draw_wave(o, (W - cx) + 20 + ease_out(clamp(tt / 0.55)) * 140, base, HH, 130, fade, 0.9, 8, i); c.paste(o, flip=True)
        splash(c, cx, base, t - 0.5, 1.4, 61)
        if 0.5 <= t < 0.62: c.add(c.mask(disc(cx, base - 60, 22), 5), LIGHT, (0.62 - t) / 0.12 * 1.4)
        frames.append(c.image())
    return frames, dict(px=cx, py=base - 80, pk=int(0.5 * fps))

ALL = {'wave-a': wave_A, 'wave-b': wave_B, 'tsunami-a': tsunami_A, 'tsunami-b': tsunami_B}
