#!/usr/bin/env python3
# 🎲 랜덤 던전 한 번에 굽기: 원본 폴더의 dNN-a4-src-v1.png 를 모두 자르고 → public/art/rdun/dNN-v1.webp
#   + src/ui/rdun.json (던전 표: 이름 · 몬스터 이름 · 보스 줄 · 공격 · 룬 자리 · 칸) + src/ui/sprite-bbox.json monsters 에 칸 상자 더함
# 사용: python3 tools/rdun/build.py <원본 폴더>   (원본 = 정식 hero-v2 docs/handoff/rdun/)
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = sys.argv[1]
# 던전 표 = 머리 랜덤 던전 작업대 (2026-11-14 v1) · 공격 id = src/raid/attacks.ts · 보스 줄이 없는 던전 = 보스 그림 도착 전(boss-g1 ~)
T = {
  'd01': ('🌲 이끼 숲 굴', ['이끼 슬라임', '도토리 병정', '덩굴 뱀', '반딧불 요정', '버섯 곰'], '고목 거인', ['bind', 'sleep'], ['bind', 'sleep', 'smash'], '02-deep-forest'),
  'd02': ('🔥 화산 대장간', ['불씨 방울', '숯 골렘', '용암 도마뱀', '풀무 박쥐', '모루 거북'], '화염 대장장이', ['fire', 'smash'], ['fire', 'smash', 'fog'], '05-ruins'),
  'd03': ('❄ 얼음 동굴', ['눈덩이', '고드름 박쥐', '펭귄 기사', '서리 늑대', '눈사람 미믹'], '서리 여왕', ['ice', 'wind'], ['ice', 'wind', 'pause'], '06-frost'),
  'd04': ('🏜 사막 유적', ['모래 방울', '스카라베', '붕대 꼬마', '선인장 전사', '항아리 미믹'], '스핑크스', ['wind', 'fog'], ['confuse', 'fog', 'smash'], '05-ruins'),
  'd05': ('🏴‍☠️ 난파선', ['게 선원', '해파리 등불', '닻 골렘', '앵무 해골', '보물 상자 미믹'], '유령 선장', ['confuse', 'dark'], ['dark', 'confuse', 'smash'], '01-burrow'),
  'd06': ('🍄 버섯 늪', ['포자 방울', '개구리 마법사', '늪 악어', '독버섯 무리', '연꽃 정령'], '늪의 마녀', ['poison', 'sleep'], ['poison', 'fog', 'sleep'], '02-deep-forest'),
  'd07': ('⚙ 태엽 공장', ['톱니 벌레', '태엽 쥐', '증기 통', '나사 거미', '경비 로봇'], '시계탑 골렘', ['glitch', 'pause'], ['glitch', 'pause', 'smash'], '05-ruins'),
  'd08': ('📚 마법 도서관', ['날개 책', '잉크 방울', '촛대 유령', '두루마리 뱀', '깃펜 새'], '금서의 사서', ['glitch', 'sleep'], ['confuse', 'glitch', 'dark'], '01-burrow'),
  'd09': ('🌙 별빛 천문대', ['별똥 방울', '망원경 올빼미', '달 토끼', '별자리 사슴', '혜성 여우'], '밤하늘 고래', ['confuse', 'dark'], ['dark', 'confuse', 'pause'], '06-frost'),
  'd10': ('💀 그림자 성', ['그림자 쥐', '촛불 해골', '갑옷 망령', '박쥐 집사', '액자 미믹'], '그림자 군주', ['dark', 'bind'], ['dark', 'bind', 'poison'], '01-burrow'),
  'd11': ('☁ 구름 섬', ['구름 양', '번개 새', '바람개비 요정', '무지개 달팽이', '열기구 미믹'], '폭풍 거인', ['wind', 'sleep'], ['wind', 'fog', 'smash'], '06-frost'),
  'd12': ('🧸 장난감 다락방', ['태엽 병정', '공 슬라임', '종이비행기', '퍼즐 상자', '인형 마술사'], '깜짝 상자 왕', ['confuse', 'glitch'], ['confuse', 'pause', 'smash'], '05-ruins'),
}
# 👑 보스 묶음 (보스 줄이 없는 던전 · 한 장에 보스 여러 마리) = 시트 id → 줄 순서대로 던전
BOSSES = {'bg1': ('boss-g1-src-v1.png', ['d03', 'd04', 'd05', 'd06']), 'bg2': ('boss-g2-src-v1.png', ['d07', 'd08', 'd09', 'd10']), 'bg3': ('boss-g3-src-v1.png', ['d11', 'd12'])}
out, bb = {}, json.load(open(f'{ROOT}/src/ui/sprite-bbox.json'))
for did, (ko, mons, boss, atk, batk, bg) in T.items():
    src = f'{SRC}/{did}-a4-src-v1.png'
    if not os.path.exists(src): continue
    j = json.loads(subprocess.check_output([sys.executable, f'{HERE}/cut.py', src, did, f'{ROOT}/public/art/rdun']))
    hasBoss = j['rows'] > 5
    out[did] = {'name': ko, 'src': j['src'], 'cell': j['cell'], 'rows': j['rows'], 'names': mons + ([boss] if hasBoss else []), 'boss': 5 if hasBoss else None, 'bossName': boss,
                'attack': atk, 'bossAttack': batk, 'bg': bg, 'rune': j['rune']}
    bb['monsters'][f'{did}-v1.webp'] = j['bbox']
    print(did, j['cell'], j['rows'], '보스' if hasBoss else '보스 그림 없음')
boss = {}
for bid, (fn, ds) in BOSSES.items():
    src = f'{SRC}/{fn}'
    if not os.path.exists(src): continue
    j = json.loads(subprocess.check_output([sys.executable, f'{HERE}/cut.py', src, bid, f'{ROOT}/public/art/rdun', '--rows', str(len(ds))]))
    boss[bid] = {'src': j['src'], 'cell': j['cell'], 'rows': j['rows'], 'names': [T[d][2] for d in ds], 'rune': j['rune']}
    bb['monsters'][f'{bid}-v1.webp'] = j['bbox']
    for k, d in enumerate(ds):
        if d in out and out[d]['boss'] is None: out[d]['bossRef'] = f'{bid}:{k}'
    print(bid, j['cell'], j['rows'], ds)
# ✝ → ★ 금서의 사서(bg2 줄 1) 펼친 책 표지 (머리 📎 · 학교 수업용) — 칸 좌표는 cut 결과 기준으로 잰 값
if 'bg2' in boss: subprocess.check_call([sys.executable, f'{HERE}/fix_cross.py', f'{ROOT}/public/art/rdun/bg2-v1.webp', str(boss['bg2']['cell']), '1', '0:97:161 1:99:190 2:120:165'])
json.dump(out, open(f'{ROOT}/src/ui/rdun.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(boss, open(f'{ROOT}/src/ui/rdun-boss.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(bb, open(f'{ROOT}/src/ui/sprite-bbox.json', 'w'), ensure_ascii=False, indent=0)  # 원래 꼴(한 줄에 값 하나) 그대로
