// 🚨 11/20 지갑 「초기화」 되살리기 초안 (받기 전에 시작 값으로 덮어쓴 학생 · 원인 고침 = me.svelte pending)
//   값 표 = scratchpad 의 restore.json [{ c: '1-1', n: 14, gem, scroll?, buy?, xp }] (운영 읽기 · 스냅숏으로 만듦 · 저장소에 넣지 않음)
//   기본 = 미리 보기(지금 값 → 되살릴 값 · 쓰지 않음) · --go = 실제로 씀 (선생님이 이 방에 직접 허락한 뒤 · 고친 판 배포 뒤 — 옛 판 폰이 다시 덮지 않게)
//   쓰는 칸 = gem/{반}/{번호}/total · scroll · buy · xp/{반}/{번호}/total · log/restore1120 한 줄(되살림 표시) · 용사 · 호칭 · 장착은 쓰지 않음(학생이 다시 고름)
//   안전: 지금 total 이 0 이 아니면(학생이 이미 다시 모음 · 다른 판 덮음) 건너뜀
//   node tools/ops/restore1120.mjs <서버 주소> <열쇠 헤더 파일> <restore.json> [--go]
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2), [DB, HDR, VAL] = args.filter((a) => !a.startsWith('--')), go = args.includes('--go');
if (!DB || !HDR || !VAL) { console.log('쓰는 법: node tools/ops/restore1120.mjs <서버 주소> <열쇠 헤더 파일> <restore.json> [--go]'); process.exit(2); }
if (/citadel-math-default-rtdb/.test(DB)) { console.log('⛔ 옛 정식 서버 — 멈춤'); process.exit(2); }
const H = Object.fromEntries(readFileSync(HDR, 'utf8').split('\n').filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const get = async (p) => { const r = await fetch(`${DB}/${p}.json`, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${p}`); return r.json(); };
const patch = async (p, body) => { const r = await fetch(`${DB}/${p}.json`, { method: 'PATCH', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${r.status} ${p}`); };
const rows = JSON.parse(readFileSync(VAL, 'utf8'));
let done = 0;
for (const v of rows) {
  const g = (await get(`gem/${v.c}/${v.n}`)) || {}, x = (await get(`xp/${v.c}/${v.n}`)) || {};
  const skip = (Number(g.total) || 0) !== 0 || g.log?.restore1120;
  console.log(`${v.c}-${v.n} · 💎 ${g.total ?? 0} → ${v.gem} · 📜 ${g.scroll ?? 0} → ${v.scroll ?? g.scroll ?? 0} · 산 것 ${(g.buy || []).length} → ${(v.buy || g.buy || []).length} · EXP ${x.total ?? 0} → ${v.xp}${skip ? ' · ⏭ 건너뜀(이미 0 아님 · 또는 되살림 표시 있음)' : ''}`);
  if (!go || skip) continue;
  await patch(`gem/${v.c}/${v.n}`, { total: v.gem, ...(v.scroll != null ? { scroll: v.scroll } : {}), ...(v.buy ? { buy: v.buy } : {}), 'log/restore1120': { g: 0, at: { '.sv': 'timestamp' }, why: '🛠 초기화 버그 되살림', gift: true } });
  await patch(`xp/${v.c}/${v.n}`, { total: v.xp });
  done++;
}
console.log(go ? `✅ 썼어요: ${done}명` : '미리 보기만 했어요. 실제로 쓰려면 --go (선생님 허락 · 고친 판 배포 뒤)');
