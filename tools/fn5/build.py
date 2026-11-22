#!/usr/bin/env python3
# 📦 #106 함수 던전 몬스터 묶음 시트 굽기 (DECISIONS c38efd1 · 머리 작업대 「📦 함수 몬스터 묶음」)
#   묶음 = 한 장에 N줄 × 5칸 (줄 = 몬스터 · 칸 = 대기 A · 대기 B · 공격 · 맞음 · 쓰러짐 · 모두 왼쪽 봄 · 바탕 마젠타)
#   줄 순서 = 과목 팩 themes.json bundles.<id>.ids (위 → 아래) · 👑 보스 4마리 = fn5-boss 한 장(칸이 커서 따로 · 작업대 v43)
#   원본 폴더에서 찾는 이름:
#     <id>*.png        예) fn5-14-src-v1.png  = 묶음 한 장 (없으면 그 묶음은 건너뜀)
#     <몬스터 id>*.png  예) f14-m01-src-v2.png = 낱장 카드 한 줄(5칸) → 묶음의 그 줄만 바꿔 끼움
#   자르기 = tools/rdun/cut.py --norune (룬 원판 처리 없음 · 바깥 분홍 flood · 가장자리 분홍 테 · 줄 · 칸 나누기 · 대기 A 가운데 · 발 = 바닥선)
#   줄마다 칸 크기가 다르면(낱장) = 가장 큰 칸에 맞춰 가로 가운데 · 바닥 맞춤으로 붙임 (늘이지 않음)
#   출력 = public/art/fn5/<id>-v<n>.webp (그림이 바뀌면 n + 1 · 그림은 캐시 먼저라서 이름을 바꿈)
#        + themes.json sheets.<id> (cols 5 · rows · cell · names) + src/ui/sprite-bbox.json monsters 칸 상자
#   그림이 sheets 에 들어오면 = 레이드 · 게시판 던전 · 허수아비 · 성채가 'fn5-14:줄' 로 같은 시트를 씀 (그 전엔 bundles temp 임시 그림)
# 사용: python3 tools/fn5/build.py <원본 폴더> [묶음 id …]   (원본 = 정식 hero-v2 docs/handoff/assets/fn5/)
import glob, hashlib, json, os, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
THEMES = f'{ROOT}/src/subjects/common-math2/themes.json'; BBOX = f'{ROOT}/src/ui/sprite-bbox.json'; OUT = f'{ROOT}/public/art/fn5'
CUT = f'{ROOT}/tools/rdun/cut.py'

def newest(src, stem):
    """그 이름으로 시작하는 png 중 가장 최근 것 (fn5-14 가 fn5-140 에 걸리지 않게 = 이름 뒤가 - · _ · . 일 때만)"""
    fs = [f for f in glob.glob(f'{src}/{stem}*.png') if re.match(rf'^{re.escape(stem)}([-_.]|$)', os.path.basename(f))]
    return max(fs, key=os.path.getmtime) if fs else None

def cut(png, rows, tmp, name):
    j = json.loads(subprocess.check_output([sys.executable, CUT, png, name, tmp, '--rows', str(rows), '--file', name, '--norune']))
    return np.asarray(Image.open(f'{tmp}/{name}.webp').convert('RGBA')), j

def rows_of(sheet, cell, n):
    return [sheet[r * cell:(r + 1) * cell] for r in range(n)]

def build(src, bid, b, themes, bb):
    main = newest(src, bid)
    if not main: print(f'{bid}: 원본 없음 · 건너뜀 (지금 임시 그림 그대로)'); return False
    n = len(b['ids'])
    with tempfile.TemporaryDirectory() as tmp:
        sh, j = cut(main, n, tmp, bid)
        if j['rows'] != n: sys.exit(f'❌ {bid}: 줄 {j["rows"]}개 찾음 · {n}개여야 함 ({os.path.basename(main)})')
        rows = [(r, j['cell'], os.path.basename(main)) for r in rows_of(sh, j['cell'], n)]
        for k, mid in enumerate(b['ids']):  # 낱장 카드 = 그 줄만 바꿔 끼움
            one = newest(src, mid)
            if not one: continue
            s1, j1 = cut(one, 1, tmp, mid)
            rows[k] = (s1[:j1['cell']], j1['cell'], os.path.basename(one)); print(f'  {bid} 줄 {k} ← {os.path.basename(one)}')
    C = max(c for _, c, _ in rows)
    out = np.zeros((C * n, C * 5, 4), np.uint8); box = {}
    for r, (px, c, _) in enumerate(rows):
        ox = (C - c) // 2; oy = C - c  # 가로 가운데 · 바닥 맞춤 (cut.py 가 발을 칸 바닥선에 둠)
        for k in range(5):
            cellpx = px[:, k * c:(k + 1) * c]
            out[r * C + oy:r * C + oy + c, k * C + ox:k * C + ox + c] = cellpx
            ys, xs = np.nonzero(cellpx[..., 3])
            if len(ys): box[f'{r}:{k}'] = [int(xs.min()) + ox, int(ys.min()) + oy, int(xs.max()) + 1 + ox, int(ys.max()) + 1 + oy]
    img = Image.fromarray(out, 'RGBA').quantize(colors=255, method=Image.Quantize.FASTOCTREE).convert('RGBA')
    h = hashlib.sha1(img.tobytes()).hexdigest()[:12]
    old = themes['sheets'].get(bid, {}); v = int(re.search(r'-v(\d+)\.webp$', old.get('src', '-v0.webp')).group(1))
    if old.get('hash') != h: v += 1
    os.makedirs(OUT, exist_ok=True); fname = f'{bid}-v{v}.webp'
    img.save(f'{OUT}/{fname}', lossless=True, quality=100, method=6)
    if old.get('src') and old['src'] != f'art/fn5/{fname}':  # 옛 판 파일 지움 (다른 곳은 sheets 이름만 봄)
        try: os.remove(f'{ROOT}/public/{old["src"]}')
        except FileNotFoundError: pass
        bb['monsters'].pop(os.path.basename(old['src']), None)
    themes['sheets'][bid] = {'src': f'art/fn5/{fname}', 'from': [f for _, _, f in rows], 'names': b['names'], 'cell': C, 'rows': n, 'cols': 5, 'hash': h}
    bb['monsters'][fname] = box
    print(f'{bid}: {fname} · 칸 {C} · 줄 {n} · {"바뀜" if old.get("hash") != h else "그대로"}')
    return True

def main():
    if len(sys.argv) < 2: sys.exit('사용: python3 tools/fn5/build.py <원본 폴더> [묶음 id …]')
    src, only = sys.argv[1], set(sys.argv[2:])
    themes = json.load(open(THEMES)); bb = json.load(open(BBOX))
    bundles = {k: v for k, v in themes.get('bundles', {}).items() if not k.startswith('_') and (not only or k in only)}
    changed = [bid for bid, b in bundles.items() if build(src, bid, b, themes, bb)]
    if changed:
        with open(THEMES, 'w') as f: json.dump(themes, f, ensure_ascii=False, indent=1)
        with open(BBOX, 'w') as f: json.dump(bb, f, ensure_ascii=False, indent=0)  # 원래 꼴 그대로
    print('끝 ·', ', '.join(changed) or '바뀐 묶음 없음')

if __name__ == '__main__': main()
