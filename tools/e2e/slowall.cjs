// 🐢 전체 흐름 · 느린 망 + 저사양 (🐞 11/20 버그 사냥) — 영역마다 에뮬레이터 e2e 를 _slow.cjs 를 붙여 차례로 돌리고 표로 모음
//   준비: cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test · npm run build && npx vite preview --port 4173
//   NODE_PATH=$(npm root -g) node tools/e2e/slowall.cjs <그림 폴더> [보통]   (끝에 「보통」 = 느린 조건 없이 같은 목록)
const { spawnSync } = require('child_process');
const path = require('path');
const SHOTS = process.argv[2] || '.', plain = process.argv[3] === '보통';
// ⚠ 11/20 옛 판(main 814b4d4)에서도 같은 자리에서 멈춤 = 시험이 낡음(화면이 바뀜 · 앱 문제 아님): tcamp-emu · hallkey-emu(종합실 비밀번호 칸) · castleunlock-emu(「준비」 탭 → 「차시 팩」) · mail-emu(빨간 숫자 2)
const LIST = [
  ['학생', 'realstu-emu'], ['학생', 'relogin-emu'], ['학생 · 상점 · 강화', 'wallet2dev-emu'],
  ['교사', 'tcamp-emu'], ['교사 · TV', 'halfroom-emu'], ['TV', 'hallkey-emu'],
  ['게시판', 'board79-emu'], ['성채', 'castleunlock-emu', 'tools/pack-upload/castle/eval-1.json'], ['허수아비', 'dummylate-emu'], ['허수아비', 'dummy-reward-emu'],
  ['우편', 'mail-emu'], ['우편', 'mailhold-emu'], ['캠프', 'camptap-emu'],
];
const rows = [];
for (const [area, name, extra] of LIST) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [...(plain ? [] : ['-r', path.join(__dirname, '_slow.cjs')]), path.join(__dirname, `${name}.cjs`), SHOTS, ...(extra ? [path.join(__dirname, '../..', extra)] : [])], { encoding: 'utf8', timeout: 600000, env: process.env });
  const out = `${r.stdout || ''}${r.stderr || ''}`, ok = (out.match(/✅/g) || []).length, bad = out.split('\n').filter((l) => l.startsWith('❌'));
  const row = { area, name, ok, bad: bad.length, sec: Math.round((Date.now() - t0) / 1000), first: bad[0]?.slice(0, 140) || (r.status && !bad.length ? `종료 코드 ${r.status} ${(r.error ? String(r.error) : out.split('\n').filter(Boolean).slice(-1)[0] || '').slice(0, 120)}` : '') };
  rows.push(row); console.log(`${row.bad || (r.status && !ok) ? '❌' : '✅'} ${area} · ${name} · ✅${ok} ❌${row.bad} · ${row.sec}s${row.first ? ` · ${row.first}` : ''}`);
}
console.log(`\n| 영역 | 시험 | ✅ | ❌ | 초 | 첫 실패 |\n|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.area} | ${r.name} | ${r.ok} | ${r.bad} | ${r.sec} | ${r.first.replace(/\|/g, '/')} |`).join('\n')}`);
