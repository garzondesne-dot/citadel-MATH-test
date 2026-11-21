# ⚡ #44 각성 GPT 시트(6×7 · 마젠타) → 전투 시트 hero-<k>-awk-v8 + 숨쉬기 hero-<k>-awk-idle8-v8 (녹스 v8 cut_components.py 일반화)
#   python3 cut.py <k> <gpt.png> <public/art/heroes> <레이아웃 폴더(hero-v2 docs/handoff/assets/hero-awaken)> <출력 폴더> [--row8 = 끝줄 8칸 숨쉬기(닌자)]
#   더함: 떨어진 작은 조각 버림 · 옆 칸으로 넘어간 조각 버림 · 발 맞춤 = 몸(가장 큰 덩어리) 아래 · despill · webp q82
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage
k, src, HER, LAY, out = sys.argv[1:6]
L = json.load(open(f'{LAY}/gpt-layout-{k}.json'))
RS = Image.open(f'{HER}/hero-{k}-v7.webp').convert('RGBA')
RB = Image.open(f'{HER}/hero-{k}-idle8-v7.webp').convert('RGBA')
G = Image.open(src).convert('RGB').resize((1536, 1008), Image.NEAREST)
a = np.array(G).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
km = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
edge = (~km) & (b > r * 0.75) & (r > 120) & (g < 90); a[edge, 2] = (a[edge, 2] * 0.45).astype(int)
fg = ndimage.binary_opening(~km, iterations=1)
lab, n = ndimage.label(fg); sizes = ndimage.sum(fg, lab, range(1, n + 1)); coms = ndimage.center_of_mass(fg, lab, range(1, n + 1))
rgba = np.dstack([a.clip(0, 255).astype('uint8'), np.where(fg, 255, 0).astype('uint8')])
cells = {}
for i in range(n):
    if sizes[i] < 6: continue
    cy, cx = coms[i]; cells.setdefault(int(cy // 144) * 6 + int(cx // 256), []).append(i + 1)
SL = ndimage.find_objects(lab)
def keep(ids, idx=None):
    ids = keep0(ids)
    if idx is None or len(ids) < 2: return ids
    r0, c0 = divmod(idx, 6); big = max(ids, key=lambda i: sizes[i - 1]); bys, bxs = SL[big - 1]
    out = []
    for i in ids:
        ys, xs = SL[i - 1]
        near = xs.start <= bxs.stop + 28 and xs.stop >= bxs.start - 28 and ys.start <= bys.stop + 28 and ys.stop >= bys.start - 28
        cross = xs.start < c0 * 256 - 4 or xs.stop > (c0 + 1) * 256 + 4
        if i == big or near or not cross: out.append(i)
    return out
def keep0(ids):
    # 떨어진 작은 조각(옆 칸 반짝이 · 점) 버림: 가장 큰 몸 상자 ±28px 안이거나 몸의 2% 이상만
    if not ids: return ids
    big = max(ids, key=lambda i: sizes[i - 1]); m0 = lab == big; ys, xs = np.where(m0)
    x0, x1, y0, y1 = xs.min() - 28, xs.max() + 28, ys.min() - 28, ys.max() + 28
    out = []
    for i in ids:
        cy, cx = coms[i - 1]
        if i == big or sizes[i - 1] >= sizes[big - 1] * 0.02 or (x0 <= cx <= x1 and y0 <= cy <= y1): out.append(i)
    return out
def piece(idx):
    ids = keep(cells.get(idx, []), idx)
    m = np.isin(lab, ids); ys, xs = np.where(m); r0, c0 = divmod(idx, 6)
    if not len(xs): return None
    big = max(ids, key=lambda i: sizes[i - 1]); bfoot = np.where(lab == big)[0].max()
    sub = rgba.copy(); sub[..., 3] = np.where(m, 255, 0)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    # 칸 밖으로 넘친 조각 = 옆 칸 섞임 의심
    spill = bx0 < c0 * 256 - 4 or bx1 > (c0 + 1) * 256 + 4 or by0 < r0 * 144 - 4 or by1 > (r0 + 1) * 144 + 4
    return Image.fromarray(sub[by0:by1, bx0:bx1], 'RGBA'), bx0 - c0 * 256, by0 - r0 * 144, spill, bfoot - by0

ROW8 = '--row8' in sys.argv
def piece8(j):
    x0, x1 = j * 192, (j + 1) * 192
    ids = [i + 1 for i in range(n) if sizes[i] >= 6 and 864 <= coms[i][0] < 1008 and x0 <= coms[i][1] < x1]
    ids = keep0(ids)
    if not ids: return None
    m = np.isin(lab, ids); ys, xs = np.where(m)
    big = max(ids, key=lambda i: sizes[i - 1]); bfoot = np.where(lab == big)[0].max()
    sub = rgba.copy(); sub[..., 3] = np.where(m, 255, 0)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    cx = (x0 + x1) // 2 - 128  # 칸 가운데 맞춤 기준
    return Image.fromarray(sub[by0:by1, bx0:bx1], 'RGBA'), bx0 - cx, by0 - 864, False, bfoot - by0
def feet(im):
    al = np.array(im.getchannel('A')) > 0; ys = np.where(al.any(1))[0]; return ys.max() if len(ys) else 143
def place(pc, ref):
    p, ox, oy, _, bf = pc; y = feet(ref) - bf; pa = np.array(p.getchannel('A')) > 0; ra = np.array(ref.getchannel('A')) > 0; best = (-1, 0)
    for dx in range(-24, 25):
        xx = ox + dx; t = np.zeros((144 + 300, 256 + 600), bool); t[150 + y:150 + y + p.height, 300 + xx:300 + xx + p.width] = pa; t = t[150:294, 300:556]
        sc = (t & ra).sum() / max(1, (t | ra).sum()); best = max(best, (sc, dx))
    o = Image.new('RGBA', (256 + 600, 144 + 300)); o.alpha_composite(p, (300 + ox + best[1], 150 + y)); return o.crop((300, 150, 556, 294)), y, best[0]
sheet = Image.new('RGBA', RS.size); breath = Image.new('RGBA', (2048, 144)); rep = {'top': [], 'empty': [], 'spill': [], 'low': []}
for sl in L['slots']:
    pc = piece8(sl['breath']) if ROW8 and 'breath' in sl else piece(sl['slot'])
    if pc is None: rep['empty'].append(sl['slot'] + 1); continue
    if pc[3]: rep['spill'].append(sl['slot'] + 1)
    if 'src' in sl:
        r_, c_ = sl['src']; o, y, sc = place(pc, RS.crop((256 * c_, 144 * r_, 256 * c_ + 256, 144 * r_ + 144))); sheet.alpha_composite(o, (256 * c_, 144 * r_))
    else:
        j = sl['breath']; o, y, sc = place(pc, RB.crop((256 * j, 0, 256 * j + 256, 144))); breath.alpha_composite(o, (256 * j, 0))
    if y < 0: rep['top'].append(sl['slot'] + 1)
    if sc < 0.35: rep['low'].append((sl['slot'] + 1, round(sc, 2)))
# despill (despill.py 그대로)
def despill(im):
    a = np.array(im).astype(int)
    for _ in range(2):
        op = a[..., 3] > 0; r, g, b = a[..., 0], a[..., 1], a[..., 2]
        tint = op & (b > 90) & (r > 90) & (g < b - 35) & (abs(r - b) < 110)
        t = ~op; nb = np.zeros_like(op); nb[1:] |= t[:-1]; nb[:-1] |= t[1:]; nb[:, 1:] |= t[:, :-1]; nb[:, :-1] |= t[:, 1:]
        a[tint & nb, 3] = 0
    op = a[..., 3] > 0; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    tint = op & (b > 90) & (r > 90) & (g < b - 35); a[tint, 2] = (a[tint, 1] + a[tint, 2]) // 3
    return Image.fromarray(a.clip(0, 255).astype('uint8'), 'RGBA')
sheet = despill(sheet); breath = despill(breath)
sheet.save(f'{out}/hero-{k}-awk-v8.webp', quality=82, method=6, alpha_quality=100)
breath.save(f'{out}/hero-{k}-awk-idle8-v8.webp', quality=82, method=6, alpha_quality=100)
pv = Image.new('RGBA', (sheet.width * 2 + 20, sheet.height + 160), (40, 40, 60, 255)); pv.alpha_composite(RS); pv.alpha_composite(sheet, (sheet.width + 20, 0)); pv.alpha_composite(breath.resize((1024, 72)), (sheet.width + 20, sheet.height + 40)); pv.alpha_composite(RB.resize((1024, 72)), (0, sheet.height + 40))
pv.convert('RGB').resize((pv.width // 2, pv.height // 2)).save(f'{out}/pv-{k}.png')
print(json.dumps({'k': k, **rep}))
