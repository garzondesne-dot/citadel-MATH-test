// 🧙 내 용사 데이터 = 정식 코드에서 그대로 뽑음 (손으로 옮겨 적지 않음 · 값이 바뀌면 이걸 다시 돌림)
// 사용: node tools/make-hero-data.cjs <정식 저장소 경로>  →  src/model/hero-data.json
//   용사 목록(account.js looks 순서) · 이름 · 이야기(lore.js) · 속성(fx.js attrOf) · 원거리(attack.js projOf) · 💎 값(gem.js SHOP) · 해금 조건(account.js)
//   스킬 이름 · 값 · 📜(fx.js · gem.js) · 강화 · 오라 · 호칭(titles.js BASE + 레벨 칭호) · 능력치 이름(camp.js STATS)
const path = require('path');
const fs = require('fs');
const root = path.resolve(process.argv[2] || '.');
const load = require(path.join(root, 'tests/load.js'));
const DS = load(['assets/manifest.js', 'js/engine/ui.js', 'js/engine/fx.js', 'js/raid/gem.js', 'js/raid/grow.js', 'js/engine/lore.js', 'js/raid/titles.js']);
const head = require('child_process').execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
const src = (f) => fs.readFileSync(path.join(root, f), 'utf8');
// attack.js isRanged = 배치표 ranged 표
const PROJ = DS.ASSETS.ranged || null;
if (!DS.Lessons) DS.Lessons = { list: [] }; // 호칭: 차시 정복 칭호는 차시 팩마다 따로(여기서는 뺌)
// account.js: 용사 순서 · 도전 · 사진 · 도감 조건 (looks 그대로)
const acc = src('js/raid/account.js');
const CHAL = Function(`return ${/const CHAL = (\{[\s\S]*?\n {2}\});/.exec(acc)[1]}`)();
const ids = [...Array.from({ length: 7 }, (_, i) => i), ...Array.from({ length: 8 }, (_, i) => 8 + i), 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];
const cardCond = { 8: '1~3차시 도감 카드를 모두 모으면 열려요', 9: '🎁 첫 레이드를 마치면 열려요', 10: '4~6차시 도감 카드를 모두 모으면 열려요', 11: '8~11차시 도감 카드를 모두 모으면 열려요' };
const heroes = ids.map((id) => {
  const lo = DS.Lore.of(id) || {}, price = DS.Gem.price('hero', id), card = DS.Gem.CARD_HEROES.includes(id), photo = DS.Gem.PHOTO_HEROES.includes(id);
  let open = id <= 6, cond = '';
  if (cardCond[id]) cond = cardCond[id];
  if (CHAL[id]) cond = CHAL[id].cond;
  if (photo) cond = '📷 성채 서술형 문제를 풀이 사진까지 통과하면 열려요';
  if (price != null) cond = card ? `${cond.replace(' 모으면 열려요', '')} 모으면 무료 · 💎 ${price} 로 먼저 열면 다 모았을 때 💎 돌려받아요` : `💎 ${price} 조각으로 해금`;
  if (!open && !cond) cond = '해금 조건은 추후 공개';
  return { id, name: lo.name || '', job: lo.job || '', nick: lo.nick || '', a: lo.a || '', b: lo.b || '', say: lo.say || '', attr: DS.FX.attrOf(id), ranged: PROJ ? !!PROJ[id] : false,
    price, card, photo, chal: CHAL[id] ? { need: CHAL[id].need } : null, open, cond, sprite: (DS.ASSETS.heroesV2.list[id] || {}).src || '' };
});
const fx = {};
DS.FX.FAMS.forEach((f) => f.ids.forEach((k, t) => { fx[k] = { name: DS.FX.NAMES[k], fam: f.id, tier: t, price: DS.Gem.price('fx', k), scroll: DS.Gem.scrollOf('fx', k) }; }));
const titles = [{ id: 'none', name: '달지 않기', tier: 'w', cond: '' }, ...DS.Titles.all().filter((t) => !/^dg-/.test(t.id)).map((t) => ({ id: t.id, name: t.name, tier: t.tier, cond: t.cond || '' }))];
const STATS = Function(`return ${/const STATS = (\[[\s\S]*?\n {2}\]);/.exec(src('js/raid/camp.js'))[1]}`)().map(([id, ic, name]) => ({ id, ic, name }));
const UNLOCK = Function(`return ${/const UNLOCK = (\[[^\]]*\])/.exec(src('js/raid/bonus.js'))[1]}`)(); // 업적(인장) 수 → 화려한 이펙트 FANCY[i]
const out = { from: `Citadel-MATH ${head}`, fancy: DS.FX.FANCY, unlock: UNLOCK, heroes, fams: DS.FX.FAMS.map(({ id, name, ids: k }) => ({ id, name, ids: k })), fx, enh: DS.Gem.ENH, aura: DS.Gem.AURA_NAMES || null, titles, stats: STATS,
  portraits: DS.ASSETS.heroPortraits, sheet: { cols: DS.ASSETS.heroesV2.cols, rows: DS.ASSETS.heroesV2.rows, w: DS.ASSETS.heroesV2.w, h: DS.ASSETS.heroesV2.h } };
fs.writeFileSync(path.join(__dirname, '../src/model/hero-data.json'), JSON.stringify(out, null, 1) + '\n');
console.log('용사', heroes.length, '· 스킬', Object.keys(fx).length, '· 호칭', titles.length, '· 원거리', PROJ ? heroes.filter((h) => h.ranged).length : '표 못 찾음', '·', out.from);
