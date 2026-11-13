# 「지금 | 새것」 움직이는 그림 두 개를 나란히 한 장으로 (평가판 🧪 · 같은 시간 축) — python3 -I tools/e2e/sbs.py <지금.webp> <새것.webp> <출력.webp>
import sys
from PIL import Image, ImageDraw
a, b, out = sys.argv[1:4]
def frames(p):
    im = Image.open(p); fs = []; ds = []
    for i in range(im.n_frames):
        im.seek(i); fs.append(im.convert('RGB').copy()); ds.append(im.info.get('duration', 70))
    seq = []  # 70ms 칸으로 펼침
    for f, d in zip(fs, ds): seq += [f] * max(1, round(d / 70))
    return seq
A, B = frames(a), frames(b); n = max(len(A), len(B)); A += [A[-1]] * (n - len(A)); B += [B[-1]] * (n - len(B))
w, h = A[0].size; pad = 8; out_f = []
for fa, fb in zip(A, B):
    W = Image.new('RGB', (w * 2 + pad, h + 22), (18, 16, 12)); W.paste(fa, (0, 22)); W.paste(fb, (w + pad, 22))
    d = ImageDraw.Draw(W); d.text((8, 5), 'NOW', fill=(170, 160, 140)); d.text((w + pad + 8, 5), 'NEW', fill=(232, 178, 58)); out_f.append(W)
out_f[0].save(out, save_all=True, append_images=out_f[1:], duration=70, loop=0, quality=72)
