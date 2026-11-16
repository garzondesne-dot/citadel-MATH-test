#!/usr/bin/env python3
"""🎨 픽셀 아이콘 → 색 글꼴 (COLR v0 + CPAL · 📜 2026-11-17 #4)
이모지 글자 하나 = 아이콘 하나 · 글꼴 맨 앞(unicode-range)에 두면 앱 모든 화면의 그 이모지가 그림으로 바뀜(템플릿 그대로)
그림이 없는 이모지 = 이 글꼴에 없음 → 원래 이모지 그대로 (섞여도 깨지지 않음)
사용: python3 -I tools/icons/font.py <잘린 칸 폴더> <출력 woff> <map.json>
"""
import json
import sys
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.colorLib.builder import buildCOLR, buildCPAL

UPM, PX, N = 1024, 32, 32          # 1em = 32 도트
LSB, ADV = 64, 1152                # 옆 여백 · 글자 폭(이모지와 비슷)
TOP = 880                          # 아이콘 윗변 (아랫변 = TOP - 1024 = -144 · 이모지처럼 기준선 아래로 조금)


def rects(mask):
    """같은 색 칸 → 가로로 이어진 줄 사각형들"""
    out = []
    for y in range(N):
        x = 0
        while x < N:
            if mask[y][x]:
                s = x
                while x < N and mask[y][x]:
                    x += 1
                out.append((s, y, x, y + 1))
            else:
                x += 1
    return out


def xmin(rs):
    return LSB + min(r[0] for r in rs) * PX if rs else 0


def draw(pen, rs):
    for (x0, y0, x1, y1) in rs:
        X0, X1 = LSB + x0 * PX, LSB + x1 * PX
        YT, YB = TOP - y0 * PX, TOP - y1 * PX
        pen.moveTo((X0, YB)); pen.lineTo((X0, YT)); pen.lineTo((X1, YT)); pen.lineTo((X1, YB)); pen.closePath()


def main():
    src, out, mp = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3], encoding='utf8'))
    order, cmap, glyphs, metrics, layers, palette = ['.notdef', 'space'], {0x20: 'space'}, {}, {}, {}, []
    pen = TTGlyphPen(None); glyphs['.notdef'] = pen.glyph(); glyphs['space'] = TTGlyphPen(None).glyph()
    metrics['.notdef'] = (ADV, 0); metrics['space'] = (ADV // 2, 0)
    pal_ix = {}
    for key, cps in mp.items():
        im = Image.open(f'{src}/{key}.png').convert('RGBA')
        # 투명 칸이 색 고르기에 섞이지 않게 = 가장 흔한 불투명 색으로 채운 뒤 32색 (14색이면 중간 색이 외곽선 색으로 뭉개짐)
        ops = [im.getpixel((x, y))[:3] for y in range(N) for x in range(N) if im.getpixel((x, y))[3] > 0]
        fill = max(set(ops), key=ops.count) if ops else (0, 0, 0)
        rgb = Image.new('RGB', (N, N), fill); rgb.paste(im.convert('RGB'), mask=im.split()[3])
        q = rgb.quantize(colors=32, method=Image.MEDIANCUT)
        pl = q.getpalette()
        qa, aa = q.load(), im.load()
        base = f'ic_{key.replace("-", "_")}'
        order.append(base)
        allm = [[aa[x, y][3] > 0 for x in range(N)] for y in range(N)]
        ra = rects(allm); p = TTGlyphPen(None); draw(p, ra); glyphs[base] = p.glyph(); metrics[base] = (ADV, xmin(ra))
        lay = []
        for ci in sorted({qa[x, y] for y in range(N) for x in range(N) if aa[x, y][3] > 0}):
            m = [[aa[x, y][3] > 0 and qa[x, y] == ci for x in range(N)] for y in range(N)]
            col = tuple(pl[ci * 3: ci * 3 + 3])
            if col not in pal_ix: pal_ix[col] = len(palette); palette.append((col[0] / 255, col[1] / 255, col[2] / 255, 1.0))
            ln = f'{base}.l{len(lay)}'; order.append(ln)
            rm = rects(m); p = TTGlyphPen(None); draw(p, rm); glyphs[ln] = p.glyph(); metrics[ln] = (ADV, xmin(rm))  # lsb = 그 층의 진짜 왼쪽 끝 (다르면 층마다 옆으로 밀림)
            lay.append((ln, pal_ix[col]))
        layers[base] = lay
        for cp in cps: cmap[cp] = base
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics); fb.setupHorizontalHeader(ascent=950, descent=-260)
    fb.setupNameTable({'familyName': 'Dungeon Icons', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=950, sTypoDescender=-260, usWinAscent=950, usWinDescent=260)
    fb.setupPost()
    fb.font['COLR'] = buildCOLR(layers, version=0)
    fb.font['CPAL'] = buildCPAL([palette])
    fb.font.flavor = 'woff'
    fb.save(out)
    print(out, len(layers), '아이콘 ·', len(palette), '색 ·', len(cmap) - 1, '글자')


if __name__ == '__main__':
    main()
