# 🎆 #99 스킬 띠 v4 굽기: python3 tools/fxbake/sk4/bake.py [이름 …] [--out 폴더] [--sheet 미리보기.png]
#   이름 = wave-a · tsunami-b … (없으면 전부) → <폴더>/sk4-<이름>-v1.webp + alt.json 조각 출력 · 옛 띠는 건드리지 않음
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from lib import strip
import water, blades, storm, arcane, mix
ALL = {**water.ALL, **blades.ALL, **storm.ALL, **arcane.ALL, **mix.ALL}
KEY = {'wave': 'wave', 'tsunami': 'tsunami', 'slash': 'slash', 'twin': 'twin', 'cyclone': 'cyclone', 'pillar': 'pillar', 'thunder': 'thunder', 'vortex': 'vortex', 'void': 'void'}
opt = {sys.argv[i]: sys.argv[i + 1] for i in range(1, len(sys.argv) - 1) if sys.argv[i].startswith('--')}
args = [a for a in sys.argv[1:] if not a.startswith('--') and a not in opt.values()]
out = opt.get('--out', os.path.join(os.path.dirname(__file__), '..', '..', '..', 'docs', 'handoff', 'skill-v4')); os.makedirs(out, exist_ok=True)
names = args or list(ALL)
alt_p = os.path.join(out, 'alt.json'); alt = json.load(open(alt_p)) if os.path.exists(alt_p) else {}
sheet = []
for nm in names:
    frames, meta = ALL[nm](); fps = meta.get('fps', 20); w, h = frames[0].size
    fn = f'sk4-{nm}-v1.webp'; strip(frames, os.path.join(out, fn))
    k = 'sk-' + KEY[nm.split('-')[0]]; ent = {'src': f'skill-v4/{fn}', 'w': w, 'h': h, 'n': len(frames), 'cols': len(frames), 'fps': fps, 'px': meta['px'], 'py': meta['py'], 'pk': meta['pk'], 'name': meta.get('name', nm)}
    alt[k] = [e for e in alt.get(k, []) if e['src'] != ent['src']] + [ent]; alt[k].sort(key=lambda e: e['src'])
    print(f"{nm}: {w}×{h} · {len(frames)}칸 · {fps}fps · {os.path.getsize(os.path.join(out, fn))}B")
    sheet.append((nm, frames))
json.dump(alt, open(alt_p, 'w'), ensure_ascii=False, indent=1)
if '--sheet' in opt:
    cols = 10; cw = 200; rh = 150
    im = Image.new('RGBA', (cols * cw, len(sheet) * rh), (28, 32, 46, 255)); d = ImageDraw.Draw(im)
    for r, (nm, fr) in enumerate(sheet):
        for c in range(cols):
            f = fr[int(c * (len(fr) - 1) / (cols - 1))]; k = min((cw - 4) / f.width, (rh - 14) / f.height); g = f.resize((int(f.width * k), int(f.height * k)), Image.NEAREST)
            im.paste(g, (c * cw + 2, r * rh + 12), g)
        d.text((4, r * rh), nm, fill=(255, 230, 90, 255))
    im.save(opt['--sheet'])
