// 🧩 차시 팩 + 덧칸(💡 도움 3단 help · 🔎 익명 풀이 review · ✔ 개념 체크 check) 합치기 (📜 2026-11-15 · 13차시 덧칸 꼴)
//   node tools/pack-addons/merge.mjs <엔진 꼴 팩.json(운영 서버 prep/packs/ex-NN 그대로)> <addons-NN.json> <나갈 파일.json>
//   덧칸 꼴: mons.mN.help = { concept, first(한 줄 또는 소문항마다 배열), example: { q, sol: [줄] } } · mons.mN.review = [{ lines, focus(1부터), ask, wrong }] · steps.cN.check = { type, q, ch?, a, why }
//   나갈 파일 = 엔진 꼴(v: 1) → 교사 폰 준비 → 📦 차시 팩 올리기에 그대로 올리면 검사 · 미리 보기 · 저장(같은 id 덮어씀 · 칸 그림은 그대로)
import fs from 'node:fs';
const [, , packF, addF, outF] = process.argv;
if (!packF || !addF || !outF) { console.error('사용: node merge.mjs <팩.json> <addons.json> <나갈.json>'); process.exit(1); }
const P = JSON.parse(fs.readFileSync(packF, 'utf8')), A = JSON.parse(fs.readFileSync(addF, 'utf8'));
const miss = [];
for (const [mid, x] of Object.entries(A.mons || {})) {
  const m = P.monsters?.[mid]; if (!m) { miss.push(`몬스터 ${mid} 없음`); continue; }
  if (x.help) m.help = x.help;
  if (x.review) m.reviews = x.review; // 엔진 칸 이름 = reviews (review = 옛 「지난 시간 복습」 몬스터 표시)
}
const steps = Array.isArray(P.steps) ? P.steps : Object.values(P.steps || {});
for (const [sid, x] of Object.entries(A.steps || {})) { const st = steps.find((s) => s.id === sid); if (!st) { miss.push(`단계 ${sid} 없음`); continue; } if (x.check) st.check = x.check; }
P.steps = steps; P.v = 1;
fs.writeFileSync(outF, JSON.stringify(P, null, 1));
console.log(`✅ ${outF} · 몬스터 덧칸 ${Object.keys(A.mons || {}).length} · 단계 덧칸 ${Object.keys(A.steps || {}).length}${miss.length ? ` · ⚠ ${miss.join(' · ')}` : ''}`);
