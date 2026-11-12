# 🎯 캐릭터 정중앙 (#121): 도트 시트의 칸마다 「보이는 부분」(알파 > 0) 상자를 재서 src/ui/sprite-bbox.json 에 적음
#   용사 = 칸 80 × 64 · 4열 × 12줄 · 줄마다 4칸을 합친 상자(움직여도 자리가 흔들리지 않게) · 몬스터 = 칸 256 · 자세(열)마다
#   화면은 이 상자 가운데를 칸 가운데 · 상자 아래(발)를 칸 아래 기준선에 맞춤 · 그림을 바꾸면 이 도구를 다시 돌림
# 사용: python3 tools/make-sprite-bbox.py
import json, os
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..')
ART = os.path.join(ROOT, 'public', 'art')
def box(im, x, y, w, h):
    b = im.crop((x, y, x + w, y + h)).getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    return list(b) if b else None
def union(bs):
    bs = [b for b in bs if b]
    return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)] if bs else None
out = {'hero': {'w': 80, 'h': 64}, 'heroes': {}, 'monsters': {}}
hd = os.path.join(ART, 'heroes')
for f in sorted(os.listdir(hd)):
    if not f.startswith('hero-') or 'portrait' in f: continue
    im = Image.open(os.path.join(hd, f)).convert('RGBA')
    cw, ch = im.width // 4, im.height // 12
    rows = {}
    for r in (0, 2, 8):
        u = union([box(im, c * cw, r * ch, cw, ch) for c in range(4)])
        if u: rows[str(r)] = [round(v * 80 / cw) if i % 2 == 0 else round(v * 64 / ch) for i, v in enumerate(u)]
    out['heroes'][f] = rows
# 🧩 #132 정식 차시 몬스터 줄(mon-*.webp · 칸 = 높이) 도 함께
import glob as _g
for f, cell in (('monster-mimic-v1.webp', 256), *[(os.path.basename(x), Image.open(x).height) for x in sorted(_g.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'art', 'mon-*.webp')))]):
    im = Image.open(os.path.join(ART, f)).convert('RGBA')
    out['monsters'][f] = {f'{r}:{c}': box(im, c * cell, r * cell, cell, cell) for r in range(im.height // cell) for c in range(im.width // cell)}
json.dump(out, open(os.path.join(ROOT, 'src', 'ui', 'sprite-bbox.json'), 'w'), ensure_ascii=False, indent=0)
print('heroes', len(out['heroes']), 'monsters', len(out['monsters']))
