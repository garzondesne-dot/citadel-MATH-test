# 📥 #111 스킬 도감 「도감 넣기」 = 고른 v4 띠를 게임에 (python3 tools/fxbake/sk4/adopt.py)
#   docs/handoff/skill-v4/<띠>.webp → public/art/pfx4/<띠>.webp (새 이름 = 캐시) + src/ui/fx/fx-v4.json { fx: 스킬 키 → Spec, bb: 보이는 상자 }
#   Spec = alt.json 값(w · h · n · fps · px · py · pk) + 옛 표(fx-data.json)의 hit · mm (흔들림 · 여러 몬스터 꼴은 그대로)
import json, os, shutil
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..'); D = os.path.join(ROOT, 'docs', 'handoff', 'skill-v4')
PICK = {'slash': 'slash-a', 'twin': 'twin-x', 'cyclone': 'cyclone-a', 'pillar': 'pillar-mix', 'thunder': 'thunder-mix', 'vortex': 'vortex-a', 'void': 'void-a', 'wave': 'wave-a', 'tsunami': 'tsunami-b'}  # 📜 #111 선생님 비교 탭 「도감 넣기」
alt = json.load(open(os.path.join(D, 'alt.json'))); old = json.load(open(os.path.join(ROOT, 'src', 'ui', 'fx', 'fx-data.json')))['fx2']['fx']
out = os.path.join(ROOT, 'public', 'art', 'pfx4'); os.makedirs(out, exist_ok=True)
fx, bb = {}, {}
for k, nm in PICK.items():
    e = next(x for x in alt[f'sk-{k}'] if x['name'] == nm); fn = os.path.basename(e['src'])
    shutil.copyfile(os.path.join(D, fn), os.path.join(out, fn))
    a = np.asarray(Image.open(os.path.join(out, fn)).convert('RGBA'))[..., 3]; w, h, n = e['w'], e['h'], e['n']
    u = np.zeros((h, w), bool)
    for i in range(n): u |= a[:, i * w:(i + 1) * w] > 0
    ys, xs = np.nonzero(u); bb[k] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    sp = {'src': f'pfx4/{fn}', 'w': w, 'h': h, 'n': n, 'fps': e['fps'], 'px': e['px'], 'py': e['py'], 'pk': e['pk']}
    for f in ('hit', 'mm'):
        if f in old.get(k, {}): sp[f] = old[k][f]
    fx[k] = sp; print(k, nm, sp, bb[k])
json.dump({'_note': '📥 #111 스킬 도감 「도감 넣기」 v4 띠 (tools/fxbake/sk4/adopt.py 가 씀 · 손으로 고치지 않음)', 'fx': fx, 'bb': bb}, open(os.path.join(ROOT, 'src', 'ui', 'fx', 'fx-v4.json'), 'w'), ensure_ascii=False, indent=1)
