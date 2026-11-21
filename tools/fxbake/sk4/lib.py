# 🎆 #99 스킬 띠 v4 굽기 도구 (손발 · 2026-11-21): numpy 빛 합성 + PIL 도형 · 칸마다 그려 가로 띠 webp
#   Canvas: over(덮기 · 물 · 연기) / add(빛 · 번개 · 불꽃) · 도형은 2배로 그려 줄임(계단 덜함) · glow = 흐림 더하기
#   마지막에 색 단계 줄이기(도트 느낌) · 알파 4단 끊기
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 2  # 슈퍼샘플

def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)

class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.C = np.zeros((h, w, 3), np.float32); self.A = np.zeros((h, w), np.float32)
    # ── 마스크 만들기 (2배로 그려 줄임) ──
    def mask(self, fn, blur=0.0):
        im = Image.new('L', (self.w * SS, self.h * SS), 0); d = ImageDraw.Draw(im); fn(d, SS)
        if blur > 0: im = im.filter(ImageFilter.GaussianBlur(blur * SS))
        im = im.resize((self.w, self.h), Image.BOX)
        return np.asarray(im, np.float32) / 255
    def over(self, m, col, a=1.0):
        m = np.clip(m * a, 0, 1); c = hexc(col) if isinstance(col, str) else col
        self.C = c * m[..., None] + self.C * (1 - m[..., None]); self.A = m + self.A * (1 - m)
    def add(self, m, col, g=1.0):
        m = np.clip(m * g, 0, 4); c = hexc(col) if isinstance(col, str) else col
        self.C = self.C + c * m[..., None]; self.A = np.clip(self.A + m * 0.9, 0, 1)
    def paste(self, o, flip=False):
        """다른 캔버스를 위에 덮기 (flip = 좌우 뒤집어서)"""
        oC, oA = (o.C[:, ::-1], o.A[:, ::-1]) if flip else (o.C, o.A)
        self.C = oC + self.C * (1 - oA[..., None]); self.A = oA + self.A * (1 - oA)
    def glow(self, fn, col, core=1.0, rad=4.0, g=0.8, width_core=True):
        """같은 도형을 선명하게(core) + 흐리게(rad) 빛으로 더함"""
        if core: self.add(self.mask(fn), col, core)
        if rad: self.add(self.mask(fn, rad), col, g)
    def image(self, levels=12):
        A = np.clip(self.A, 0, 1)
        rgb = np.where(A[..., None] > 1e-4, self.C / np.maximum(A[..., None], 1e-4), 0)
        rgb = np.clip(rgb, 0, 1)
        rgb = np.round(rgb * levels) / levels if levels else rgb  # 도트 느낌 색 단계
        a = np.round(A * 8) / 8; a[A < 0.06] = 0
        out = np.dstack([rgb * 255, a * 255]).astype(np.uint8)
        return Image.fromarray(out, 'RGBA')

# ── 그리기 도우미 (좌표 = 칸 px · s = 슈퍼샘플 배) ──
def P(pts, s): return [(x * s, y * s) for x, y in pts]
def line(pts, wd):
    return lambda d, s: d.line(P(pts, s), fill=255, width=max(1, int(wd * s)), joint='curve')
def poly(pts):
    return lambda d, s: d.polygon(P(pts, s), fill=255)
def disc(x, y, r):
    return lambda d, s: d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s, (y + r) * s], fill=255)
def ell(x, y, rx, ry, wd=0):
    if wd: return lambda d, s: d.ellipse([(x - rx) * s, (y - ry) * s, (x + rx) * s, (y + ry) * s], outline=255, width=max(1, int(wd * s)))
    return lambda d, s: d.ellipse([(x - rx) * s, (y - ry) * s, (x + rx) * s, (y + ry) * s], fill=255)
def multi(*fns):
    def f(d, s):
        for g in fns: g(d, s)
    return f
def taper(pts, w0, w1):
    """굵기가 w0 → w1 로 가늘어지는 띠 (칼날 · 번개 · 파도 끝)"""
    if len(pts) < 2: return lambda d, s: None
    L, R = [], []
    for i, (x, y) in enumerate(pts):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy) or 1; nx, ny = -dy / n, dx / n
        t = i / (len(pts) - 1); w = (w0 + (w1 - w0) * t) / 2
        L.append((x + nx * w, y + ny * w)); R.append((x - nx * w, y - ny * w))
    return poly(L + R[::-1])
def arc_pts(cx, cy, rx, ry, a0, a1, n=40, rot=0.0):
    cr, sr = math.cos(rot), math.sin(rot); out = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n; x, y = math.cos(a) * rx, math.sin(a) * ry
        out.append((cx + x * cr - y * sr, cy + x * sr + y * cr))
    return out
def crescent(cx, cy, r, th, rot, frac=1.0, a0=-1.25, a1=1.25):
    """초승달(달빛 베기) = 바깥 호 + 안쪽 호 사이 · frac = 그려진 길이"""
    a1b = a0 + (a1 - a0) * frac
    o = arc_pts(cx, cy, r, r, a0, a1b, 40, rot); i = arc_pts(cx - th * math.cos(rot) * 0.0, cy, r - th, r - th * 0.6, a0, a1b, 40, rot)
    # 끝이 뾰족하게: 안쪽 호 반지름을 양 끝에서 바깥과 같게
    ii = []
    for k, (x, y) in enumerate(i):
        t = k / 40; e = math.sin(math.pi * t) if frac > 0.99 else math.sin(math.pi * t * 0.5 + 0.0)
        ox, oy = o[k]; ii.append((ox + (x - ox) * e, oy + (y - oy) * e))
    return poly(o + ii[::-1])

def ease_out(t): t = min(1, max(0, t)); return 1 - (1 - t) ** 3
def ease_in(t): t = min(1, max(0, t)); return t ** 2.2
def clamp(t): return min(1.0, max(0.0, t))
def bump(t, a, b):
    """a → b 사이 0 → 1 → 0"""
    if t <= a or t >= b: return 0.0
    return math.sin(math.pi * (t - a) / (b - a))

def strip(frames, path):
    w, h = frames[0].size; s = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames): s.paste(f, (i * w, 0))
    s.save(path, 'WEBP', lossless=True, method=6); return s.size

class Parts:
    """입자 묶음 (시드 고정 · 칸마다 같은 입자를 시간만 바꿔 그림)"""
    def __init__(self, n, seed, make):
        r = random.Random(seed); self.p = [make(r, i) for i in range(n)]
