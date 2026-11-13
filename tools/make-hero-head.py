# 👑 용사 머리 자리 (🔨 2026-11-13 「후광 위치 = 머리 뒤 중앙」): 서 있는 줄(0) 첫 칸에서 머리(맨 위 ~ 목 = 폭이 가장 좁은 줄) 가운데를 재서
#   src/ui/sprite-bbox.json 「heads」 에 적음 · 값 = [가로, 높이] (옛 칸 80 × 64 px) · 가로 = 보이는 상자 가운데에서 · 높이 = 발(상자 아래)에서 위로
#   키 = 시트 파일 이름(장면 · 원래 시트) · 'idle8:줄'(캠프 · 내 용사 = 숨쉬기 8칸 시트) · 그림을 바꾸면 다시 돌림
# 사용: python3 tools/make-hero-head.py
import json, os
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..'); HD = os.path.join(ROOT, 'public', 'art', 'heroes'); J = os.path.join(ROOT, 'src', 'ui', 'sprite-bbox.json')
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
def union(im, cw, ch, r, n):
    bs = [im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)).getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for c in range(n)]
    bs = [x for x in bs if x]; return [min(x[0] for x in bs), min(x[1] for x in bs), max(x[2] for x in bs), max(x[3] for x in bs)]
data = json.load(open(J)); heads = {}
for f in sorted(os.listdir(HD)):
    if not f.startswith('hero-') or 'portrait' in f: continue
    im = Image.open(os.path.join(HD, f)).convert('RGBA')
    if 'idle8' in f:
        cw, ch = 80, 64
        for r in range(im.height // ch):
            u = union(im, cw, ch, r, im.width // cw); h = head(im.crop((0, r * ch, cw, (r + 1) * ch)), 1, 1, u)
            if h: heads[f'idle8:{r}'] = h
        continue
    cw, ch = im.width // 4, im.height // 12; u = union(im, cw, ch, 0, 4)
    h = head(im.crop((0, 0, cw, ch)), 80 / cw, 64 / ch, u)
    if h: heads[f] = h
data['heads'] = heads; json.dump(data, open(J, 'w'), ensure_ascii=False, indent=0)
print(len(heads), {k: heads[k] for k in list(heads)[:6]})
