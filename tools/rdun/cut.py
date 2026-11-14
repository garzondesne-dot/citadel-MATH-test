#!/usr/bin/env python3
# 🎲 랜덤 던전 몬스터 시트 자르기 (머리 🎨 2026-11-14 · DECISIONS 「🎲 랜덤 던전」)
#   입력 = 그림 AI 가 준 A4 한 장 (줄 = 몬스터 · 칸 5 = 대기 A · 대기 B · 공격 · 맞음 · 쓰러짐 · 바탕 ≈ #FF00FF)
#   ① 바탕 허용 범위 투명화 + 가장자리 분홍 테두리 지움 ② 빈 줄로 줄 · 칸 자르기(원본 격자 안 자리는 그대로)
#   ③ 줄마다 대기 A 의 가운데 · 발 = 칸 가운데 · 바닥선 ④ 룬 원판(청록) 위치 = 칸 비율 · 원판 안 무늬는 원판 색으로 덮어 비움(대기 · 공격 · 맞음)
#   출력 = public/art/rdun/<id>-v1.webp (5 칸 × 줄 · 칸 cell) + JSON 한 줄(줄마다 룬 [x, y, r] × 5 · 쓰러짐 = null)
# 사용: python3 tools/rdun/cut.py <원본.png> <id> <출력 폴더> [--rows N]
import json, sys
from collections import deque
import numpy as np
from PIL import Image

def key(a):
    """바탕 지우기 = 바깥(가장자리)에서 이어진 분홍만(넓은 허용 범위 · flood) + 몸 안에 갇힌 분홍은 아주 진한 #FF00FF 만
    → 보라 연기 · 분홍 날개처럼 바탕과 가까운 색이 몸 안에 있어도 먹히지 않음 (머리 📎 d10 · d11 · d12)"""
    R, G, B = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    loose = (R > 190) & (B > 190) & (G < 90)
    strict = (R > 232) & (B > 232) & (G < 30)
    h, w = loose.shape; bg = np.zeros_like(loose); q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if loose[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if loose[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and loose[ny, nx] and not bg[ny, nx]: bg[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(bg | strict, 0, 255).astype(np.uint8)
    for _ in range(2):  # 가장자리 분홍(바탕과 섞인 픽셀) 지우기 = 투명 칸에 붙은 것만
        t = alpha == 0
        near = np.zeros_like(t)
        near[1:] |= t[:-1]; near[:-1] |= t[1:]; near[:, 1:] |= t[:, :-1]; near[:, :-1] |= t[:, 1:]
        pink = (R > 150) & (B > 150) & (G < 0.5 * np.minimum(R, B))
        alpha[near & pink & (alpha > 0)] = 0
    return alpha

def runs(mask, minlen, gap=1):
    out, s = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and s is None: s = i
        if not v and s is not None:
            if i - s >= minlen: out.append([s, i])
            s = None
    return out

def comps(mask):
    h, w = mask.shape; seen = np.zeros_like(mask); res = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]: continue
        q = deque([(y0, x0)]); seen[y0, x0] = 1; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]: seen[ny, nx] = 1; q.append((ny, nx))
        res.append(np.array(pts))
    return res

def filled(c):
    """덩이의 구멍(하이라이트 · 무늬)까지 채운 넓이 = 상자 바깥에서 닿지 않는 칸 수"""
    y0, x0 = c[:, 0].min(), c[:, 1].min(); h, w = np.ptp(c[:, 0]) + 3, np.ptp(c[:, 1]) + 3
    m = np.zeros((h, w), bool); m[c[:, 0] - y0 + 1, c[:, 1] - x0 + 1] = True
    out = np.zeros_like(m); q = deque([(0, 0)]); out[0, 0] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not m[ny, nx] and not out[ny, nx]: out[ny, nx] = True; q.append((ny, nx))
    return int((~out).sum())

def discs(rgb, alpha, fillmin=0.55):
    """청록 둥근 덩이들 (원판 후보): 넓이 ≥ 30 · 가로세로 0.65~1.5 · 구멍 채운 원 채움 ≥ 0.55 → (cx, cy, r, 픽셀)"""
    R, G, B = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    cyan = (alpha > 0) & (G > 150) & (B > 150) & (np.minimum(G, B) - R > 60) & (np.abs(G - B) < 90)  # 진한 청록만 (연한 하늘색 몸과 가름)
    out = []
    for c in comps(cyan):
        if len(c) < 30: continue
        h, w = np.ptp(c[:, 0]) + 1, np.ptp(c[:, 1]) + 1
        r = max(h, w) / 2
        if r < 9 or not (0.65 <= h / w <= 1.5) or filled(c) / (np.pi * r * r) < fillmin: continue  # 작은 청록 점(촉수 끝 · 반짝임) 뺌
        out.append((c[:, 1].mean(), c[:, 0].mean(), r + 1, c))
    return out

def pick_first(ds):
    """대기 칸: 큰 것의 45% 이상 중 가장 아래(가슴 · 고글 · 머리 원판보다 아래)"""
    if not ds: return None
    big = max(len(d[3]) for d in ds)
    return max([d for d in ds if len(d[3]) >= 0.45 * big], key=lambda d: d[1])

def main():
    src, did, out = sys.argv[1], sys.argv[2], sys.argv[3]
    nrows = int(sys.argv[sys.argv.index('--rows') + 1]) if '--rows' in sys.argv else None
    im = Image.open(src).convert('RGB'); rgb = np.asarray(im).copy(); H, W = rgb.shape[:2]
    alpha = key(rgb)
    fg = alpha > 0
    bands = runs(fg.sum(1) > 3, 20)
    if nrows: bands = bands[:nrows]
    gw = W / 5
    frames = []  # 줄마다 [ (픽셀 rgba, 원본 격자 안 x0, y0) ×5 ]
    for (y0, y1) in bands:
        segs = runs(fg[y0:y1].sum(0) > 0, 4)
        while len(segs) > 5:  # 효과가 끊긴 조각 = 가장 가까운 것끼리 합침
            gi = min(range(len(segs) - 1), key=lambda i: segs[i + 1][0] - segs[i][1])
            segs[gi] = [segs[gi][0], segs[gi + 1][1]]; del segs[gi + 1]
        if len(segs) != 5:  # 칸끼리 붙음(보스 묶음) = 격자 경계 근처 ±15% 에서 그림이 가장 적은 세로줄로 자름
            col = fg[y0:y1].sum(0); cuts = [0]
            for k in range(1, 5):
                lo, hi = int((k - 0.15) * gw), int((k + 0.15) * gw); cuts.append(lo + int(np.argmin(col[lo:hi])))
            cuts.append(W); segs = [[cuts[k], cuts[k + 1]] for k in range(5)]
        row = []
        for k, (x0, x1) in enumerate(segs):
            a = alpha[y0:y1, x0:x1]; ys, xs = np.nonzero(a)
            by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            px = np.dstack([rgb[y0 + by0:y0 + by1, x0 + bx0:x0 + bx1], a[by0:by1, bx0:bx1]])
            row.append({'px': px, 'gx': x0 + bx0 - k * gw, 'y': y0 + by0, 'y1': y0 + by1})
        frames.append(row)
    maxw = max(f['px'].shape[1] for r in frames for f in r); maxh = max(f['px'].shape[0] for r in frames for f in r)
    cell = int(-(-(max(maxw, maxh) + 12) // 8) * 8)  # 칸 = 가장 큰 그림 + 여백 12 (8 의 배수) · 몬스터가 칸을 꽉 채워 화면에서 작아 보이지 않게
    sheet = np.zeros((cell * len(frames), cell * 5, 4), np.uint8)
    runes = []; bbox = {}
    for ri, row in enumerate(frames):
        a = row[0]; aw = a['px'].shape[1]
        base = max(f['y1'] for f in row[:2])  # 대기 발 = 바닥선
        dx = cell / 2 - (a['gx'] + aw / 2); floor = cell - 6
        rr = []; ref = None; refcol = None
        for k in (0, 1):  # 기준 = 대기 A (없으면 B) 의 원판 · 칸 좌표
            f = row[k]; h, w = f['px'].shape[:2]
            x = max(0, min(cell - w, int(round(f['gx'] + dx)))); y = max(0, min(cell - h, int(round(floor - (base - f['y'])))))
            d0 = pick_first(discs(f['px'][..., :3], f['px'][..., 3]))
            if d0: ref = (x + d0[0], y + d0[1], d0[2]); refcol = np.median(f['px'][d0[3][:, 0], d0[3][:, 1], :3], 0).astype(np.uint8); break
        for k, f in enumerate(row):
            px = f['px'].copy(); h, w = px.shape[:2]
            x = int(round(f['gx'] + dx)); y = int(round(floor - (base - f['y'])))
            x = max(0, min(cell - w, x)); y = max(0, min(cell - h, y))
            rn = None
            if k < 4:
                if ref is None: rn = pick_first(discs(px[..., :3], px[..., 3]))
                else:  # 기준 원판 자리(칸 좌표)에서 가장 가까운 둥근 덩이 · 너무 멀면 없음 (가려진 공격 칸 = 기호 안 얹음)
                    ds = discs(px[..., :3], px[..., 3], 0.4)
                    near = [(np.hypot(x + d[0] - ref[0], y + d[1] - ref[1]), d) for d in ds if 0.6 * ref[2] <= d[2] <= 1.6 * ref[2]]
                    near = [n for n in near if n[0] < cell * (0.14 if k < 2 else 0.22)]
                    rn = min(near, key=lambda n: n[0])[1] if near else None
                    if rn is None and k < 2: rn = (ref[0] - x, ref[1] - y, ref[2], None)  # 대기 A · B = 같은 자세 → 기준 자리 그대로 (원판이 몸과 같은 색이라 못 가른 칸)
            if rn:  # 원판 안 무늬 비우기 = 원판 안쪽에서 청록이 아닌 픽셀(무늬)만 원판 가운데 색으로
                cx, cy, r, pts = rn
                yy, xx = np.mgrid[0:h, 0:w]; d = np.hypot(xx - cx, yy - cy)
                col = np.median(px[pts[:, 0], pts[:, 1], :3], 0).astype(np.uint8) if pts is not None else refcol
                inner = (d <= r * 0.66) & (px[..., 3] > 0)  # 무늬(− · → · 흰 막대)가 있어도 = 안쪽 원 전체를 빛나는 빈 원판으로
                t = np.clip(1 - d / (r * 0.66), 0, 1)[..., None] * 0.35  # 가운데로 갈수록 살짝 밝게 (흰색 35%)
                fillc = (col[None, None, :] * (1 - t) + 255 * t).astype(np.uint8)
                px[inner, :3] = fillc[inner]
                rr.append([round((x + cx) / cell, 4), round((y + cy) / cell, 4), round(r / cell, 4)])
            else: rr.append(None)
            sheet[ri * cell + y: ri * cell + y + h, k * cell + x: k * cell + x + w] = px
            bbox[f'{ri}:{k}'] = [x, y, x + w, y + h]
        runes.append(rr)
    # 팔레트 255색 + 무손실 = 도트 가장자리 그대로 · 장당 약 1/3 크기 (손실 압축은 얼룩이 생김)
    Image.fromarray(sheet, 'RGBA').quantize(colors=255, method=Image.Quantize.FASTOCTREE).convert('RGBA').save(f'{out}/{did}-v1.webp', lossless=True, quality=100, method=6)
    print(json.dumps({'id': did, 'src': f'art/rdun/{did}-v1.webp', 'cell': cell, 'rows': len(frames), 'rune': runes, 'bbox': bbox}, ensure_ascii=False))

if __name__ == '__main__': main()
