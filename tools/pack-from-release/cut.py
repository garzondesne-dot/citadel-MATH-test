# 🧩 #132 변환기의 그림 자르기 — ['row', 시트, 줄, 저장] = 몬스터 시트의 그 줄(3칸)만 · ['half', 배경, 0, 저장] = 던전 배경 정확히 절반(최근접)
import json, sys
from PIL import Image

for kind, src, row, out in json.loads(sys.argv[1]):
    im = Image.open(src)
    if kind in ('row', 'rowflip'):
        cols = 3
        cell = im.width // cols
        rows = im.height // cell
        strip = im.crop((0, row * cell, im.width, (row + 1) * cell))
        if kind == 'rowflip':  # 칸마다 좌우 뒤집기 (용사는 왼쪽에 섬)
            for c in range(cols):
                strip.paste(strip.crop((c * cell, 0, (c + 1) * cell, cell)).transpose(Image.FLIP_LEFT_RIGHT), (c * cell, 0))
        strip.save(out, 'WEBP', quality=90, method=6)  # 투명은 그대로 · 무손실보다 3~4배 작게
        print(f'  ✂ {out.split("/")[-1]} ← {src.split("/")[-1]} 줄 {row} (칸 {cell} · {rows}줄)')
    else:
        im.resize((im.width // 2, im.height // 2), Image.NEAREST).save(out, 'WEBP', quality=88)
        print(f'  ✂ {out.split("/")[-1]} ← {src.split("/")[-1]} 절반')
