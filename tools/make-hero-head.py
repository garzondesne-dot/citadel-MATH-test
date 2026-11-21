# 👑 용사 머리 자리 (🔨 2026-11-13 「후광 위치 = 머리 뒤 중앙」): 서 있는 줄(0) 첫 칸에서 머리(맨 위 ~ 목 = 폭이 가장 좁은 줄) 가운데를 재서
#   src/ui/sprite-bbox.json 「heads」 에 적음 · 값 = [가로, 높이] (옛 칸 80 × 64 px) · 가로 = 보이는 상자 가운데에서 · 높이 = 발(상자 아래)에서 위로
#   키 = 시트 파일 이름(장면 · 원래 시트) · 'idle8:줄'(옛 숨쉬기 8칸 시트) · 'hd8:파일'(세밀화 숨쉬기 띠 첫 칸) · 그림을 바꾸면 다시 돌림
#   🐞 #97 (2026-11-21): 세밀화 칸(256 × 144 · 화면 ½ · 발 = 아래 8)은 화면에 그려지는 그대로 잼 — 예전엔 64/144 · 80/256 로 줄여 후광이 머리보다 약 5px 낮았음
#     · 각성 시트도 따로 잼(예전 = 원래 용사 머리를 빌림 → 최대 14px 어긋남)
#     · 「breath」 = 숨쉬기 띠 8칸마다 머리가 첫 칸보다 얼마나 내려갔나(화면 px · 아래 +) · 머리 둘레를 첫 칸과 맞대어 잼(목 찾기보다 흔들림 적음)
#     · EYE = 눈으로 고친 자리(자동값이 모자·뿔에 끌려간 용사만)
# 사용: python3 tools/make-hero-head.py
import json, os
from PIL import Image
import numpy as np
ROOT = os.path.join(os.path.dirname(__file__), '..'); HD = os.path.join(ROOT, 'public', 'art', 'heroes'); J = os.path.join(ROOT, 'src', 'ui', 'sprite-bbox.json')
M8 = json.load(open(os.path.join(ROOT, 'src', 'ui', 'idle8-hd-map.json')))
EYE: dict[str, list[float]] = {}  # 'hd8:파일' 또는 시트 이름 → [가로, 높이] (화면 px)
def head(cell, sx, sy, union=None):
    a = cell.getchannel('A').point(lambda v: 255 if v > 40 else 0); b = a.getbbox()
    if not b: return None
    u = union or b; px = a.load(); W = cell.width; H = b[3] - b[1]
    rows = {y: [x for x in range(W) if px[x, y]] for y in range(b[1], b[3])}
    lo, hi = int(b[1] + 0.35 * H), int(b[1] + 0.7 * H)
    neck = min(range(lo, hi + 1), key=lambda y: (len(rows.get(y, [])) or 999, y))
    xs = [x for y in range(b[1], neck) for x in rows[y]]
    cx = sum(xs) / len(xs); cy = (b[1] + neck) / 2
    return [round((cx - (u[0] + u[2]) / 2) * sx, 1), round((u[3] - cy) * sy, 1)]
def headHD(cell, k=2, base=8):
    """세밀화 칸: 화면에 그려지는 그대로 [칸 가운데에서 가로, 발에서 높이] (화면 px)"""
    h = head(cell, 1, 1, [0, 0, cell.width, cell.height - base])
    return [round(h[0] / k, 1), round(h[1] / k, 1)] if h else None
def breath(im, hx, hy, k=2, base=8):
    a = np.asarray(im.convert('RGBA')).astype(float); fw = a.shape[1] // 8; fr = [a[:, i * fw:(i + 1) * fw] for i in range(8)]
    ys = np.where(fr[0][:, :, 3].max(1) > 40)[0]; top = int(ys[0]); cy = int(im.height - base - hy * k); cx = int(fw / 2 + hx * k)
    y0, y1, x0, x1 = top, min(cy + (cy - top), im.height - 1), max(cx - 40, 0), min(cx + 40, fw); ref = fr[0][y0:y1, x0:x1]; out = []
    for f in fr:
        best = min((np.abs(f[y0 + d:y1 + d, x0:x1] - ref).mean(), d) for d in range(-10, 11) if y0 + d >= 0 and y1 + d <= im.height)
        out.append(best[1] / k)
    return out
def union(im, cw, ch, r, n):
    bs = [im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)).getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for c in range(n)]
    bs = [x for x in bs if x]; return [min(x[0] for x in bs), min(x[1] for x in bs), max(x[2] for x in bs), max(x[3] for x in bs)]
data = json.load(open(J)); heads = {}; br = {}
for f in sorted(os.listdir(HD)):
    if not f.startswith('hero-') or 'portrait' in f or 'glow' in f: continue
    im = Image.open(os.path.join(HD, f)).convert('RGBA')
    if 'idle8' in f:
        if f in M8.values():  # 세밀화 숨쉬기 띠 (256 × 144 × 8)
            h = headHD(im.crop((0, 0, im.width // 8, im.height)))
            if h: h = EYE.get(f'hd8:{f}', h); heads[f'hd8:{f}'] = h; br[f] = breath(im, h[0], h[1])
            continue
        if f != 'hero-idle8-pl-v4.webp': continue  # 옛 숨쉬기 8칸 시트 = 이것 하나(manifest IDLE8.src) · 다른 옛 띠는 건너뜀
        cw, ch = 80, 64
        for r in range(im.height // ch):
            u = union(im, cw, ch, r, im.width // cw); h = head(im.crop((0, r * ch, cw, (r + 1) * ch)), 1, 1, u)
            if h: heads[f'idle8:{r}'] = h
        continue
    cw, ch = im.width // 4, im.height // 12
    if cw == 256 and ch == 144: h = headHD(im.crop((0, 0, cw, ch)))
    else: u = union(im, cw, ch, 0, 4); h = head(im.crop((0, 0, cw, ch)), 80 / cw, 64 / ch, u)
    if h: heads[f] = EYE.get(f, h)
data['heads'] = heads; data['breath'] = br; json.dump(data, open(J, 'w'), ensure_ascii=False, indent=0)
print(len(heads), len(br), {k: heads[k] for k in list(heads)[:6]})
