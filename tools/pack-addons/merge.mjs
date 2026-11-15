// 🧩 차시 팩 + 덧칸(💡 도움 3단 help · helps · 🔎 익명 풀이 review · reviews · ✔ 개념 체크 check) 합치기 (📜 2026-11-15 · 13차시 덧칸 꼴 · 2026-11-16 꼴별)
//   node tools/pack-addons/merge.mjs <엔진 꼴 팩.json(운영 서버 prep/packs/ex-NN 그대로)> <addons-NN.json> <나갈 파일.json>
//   덧칸 꼴: mons.mN.help = { concept, first(한 줄 또는 소문항마다 배열), example: { q, sol: [줄] } } · mons.mN.helps = { 꼴: help } · mons.mN.kinds = 첫 판 소문항 꼴 배열
//            mons.mN.review = [{ lines, focus(1부터), ask, wrong }] · mons.mN.reviews = { 꼴: [review…] } · steps.cN.check = { type, q, ch?, a, why }
//   숫자 바뀐 판(retry pool) 문항 꼴 = kinds.mjs 의 그 차시 규칙(생성기 check 값 · 답 꼴로 정함) · 규칙이 없으면 꼴 없음(몬스터 help)
//   나갈 파일 = 엔진 꼴(v: 1) → 교사 폰 준비 → 📦 차시 팩 올리기에 그대로 올리면 검사 · 미리 보기 · 저장(같은 id 덮어씀 · 칸 그림은 그대로)
import fs from 'node:fs';
import { KIND_RULES } from './kinds.mjs';
const [, , packF, addF, outF] = process.argv;
if (!packF || !addF || !outF) { console.error('사용: node merge.mjs <팩.json> <addons.json> <나갈.json>'); process.exit(1); }
const P = JSON.parse(fs.readFileSync(packF, 'utf8')), A = JSON.parse(fs.readFileSync(addF, 'utf8'));
const out = merge(P, A);
fs.writeFileSync(outF, JSON.stringify(out.pack, null, 1));
console.log(`✅ ${outF} · 몬스터 덧칸 ${Object.keys(A.mons || {}).length} · 단계 덧칸 ${Object.keys(A.steps || {}).length} · 꼴 붙인 문항 ${out.tagged}${out.miss.length ? ` · ⚠ ${out.miss.join(' · ')}` : ''}`);

export function merge(P, A) {
  const miss = [], rules = KIND_RULES[P.id] || {};
  let tagged = 0;
  const arr = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);
  for (const [mid, x] of Object.entries(A.mons || {})) {
    const m = P.monsters?.[mid]; if (!m) { miss.push(`몬스터 ${mid} 없음`); continue; }
    if (x.help) m.help = x.help;
    if (x.helps) m.helps = x.helps;
    if (x.review) m.reviews = x.review; // 엔진 칸 이름 = reviews (review = 옛 「지난 시간 복습」 몬스터 표시)
    if (x.reviews) m.reviewsBy = x.reviews; // 덧칸 reviews(꼴별) = 엔진 reviewsBy
    // 🏷 문항 꼴: 첫 판 = kinds[소문항] · 숫자 바뀐 판 = 차시 규칙
    //   ⚔ 소레이드(chain) = 한 문제 → 첫 판(chain.pool[0]) 모든 단계 = kinds[0] · 나머지 판 = 규칙
    const first = arr(m.first), chainPool = m.chain?.pool ? arr(m.chain.pool).map(arr) : null, rule = rules[mid];
    const tag = (q, k) => { if (q && k) { q.kind = k; tagged++; } };
    const byRule = (q) => { const k = rule(q); if (k) tag(q, k); else miss.push(`${mid} 꼴 못 정한 문항: ${String(q.question).slice(0, 30)}`); };
    if (Array.isArray(x.kinds)) {
      if (chainPool) { first.forEach((q) => tag(q, x.kinds[0])); (chainPool[0] || []).forEach((q) => tag(q, x.kinds[0])); }
      else first.forEach((q, i) => tag(q, x.kinds[i]));
    }
    if (rule) { for (const v of arr(m.retry?.pool)) for (const q of arr(v)) byRule(q); if (chainPool) chainPool.slice(1).forEach((v) => v.forEach(byRule)); }
    m.first = first; if (chainPool) m.chain = { ...m.chain, pool: chainPool };
  }
  const steps = Array.isArray(P.steps) ? P.steps : Object.values(P.steps || {});
  for (const [sid, x] of Object.entries(A.steps || {})) { const st = steps.find((s) => s.id === sid); if (!st) { miss.push(`단계 ${sid} 없음`); continue; } if (x.check) st.check = x.check; }
  P.steps = steps; P.v = 1;
  return { pack: P, tagged, miss };
}
