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
}
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
json.dump(out, open(f'{ROOT}/src/ui/rdun.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(bb, open(f'{ROOT}/src/ui/sprite-bbox.json', 'w'), ensure_ascii=False, indent=0)  # 원래 꼴(한 줄에 값 하나) 그대로
