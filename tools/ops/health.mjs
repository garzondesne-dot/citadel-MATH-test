// 🩺 운영 데이터 건강 검진 (🐞 11/20 버그 사냥 · 읽기만 · 아무것도 쓰지 않음 · GET 만)
//   찾는 것: ① 갑자기 0 이 된 지갑(초기화 꼴: 💎 · EXP 0 인데 받은 기록 · 수업 기록은 있음) ② 반쪽 노드(state · meta 없는 방 · uid 없는 계정 · total 없는 지갑 …)
//            ③ 음수 · 이상값(💎 · 📜 · 강화 · EXP 가 음수 · 글자 · 너무 큼 · 산 것 겹침 · 하루 💎 음수)
//   보고 = 반-번호만 (이름 · uid 를 찍지 않음 · 명단 칸을 읽지 않음)
//   node tools/ops/health.mjs <서버 주소> <열쇠 헤더 파일> [--json 결과.json]   → 운영 읽기 (선생님이 준 열쇠 · GET)
//   node tools/ops/health.mjs --file <내려받은 트리.json> [--json 결과.json]  → 내려받은 사본으로 (서버에 닿지 않음)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOTS = ['gem', 'xp', 'accounts', 'records', 'bonus', 'cards', 'gifts', 'rooms', 'school', 'pids', 'held'];
const ENH_MAX = 10, XP_MAX = 200000, GEM_MAX = 100000, LOG_G_MAX = 2000;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const entries = (v) => (v && typeof v === 'object' ? Object.entries(v).filter(([, x]) => x != null) : []); // 서버 배열(빈칸 null) · 객체 둘 다

/** 트리(맨 윗칸 → 값) 검진 → { zero, half, odd, stat } · 줄마다 { who: '1-3-7' | 방 코드, what, detail } */
export function check(T) {
  const zero = [], half = [], odd = [], who = (c, n) => `${c}-${n}`;
  const students = new Set();
  for (const r of ['gem', 'xp', 'accounts', 'records', 'cards', 'bonus']) for (const [c, ns] of entries(T[r])) for (const [n] of entries(ns)) students.add(`${c}|${n}`);
  for (const k of students) {
    const [c, n] = k.split('|'), id = who(c, n);
    const g = T.gem?.[c]?.[n], x = T.xp?.[c]?.[n], a = T.accounts?.[c]?.[n], rec = T.records?.[c]?.[n], bon = T.bonus?.[c]?.[n];
    // ── ③ 이상값 ──
    if (g != null && !isObj(g)) odd.push({ who: id, what: '지갑 칸이 객체가 아님', detail: JSON.stringify(g).slice(0, 40) });
    if (isObj(g)) {
      for (const f of ['total', 'scroll', 'enh']) if (g[f] != null) { const v = num(g[f]); if (v == null) odd.push({ who: id, what: `gem.${f} 숫자 아님`, detail: JSON.stringify(g[f]).slice(0, 30) }); else if (v < 0) odd.push({ who: id, what: `gem.${f} 음수`, detail: String(v) }); }
      if (num(g.total) > GEM_MAX) odd.push({ who: id, what: '💎 너무 큼', detail: String(g.total) });
      if (num(g.enh) > ENH_MAX || (num(g.enh) != null && !Number.isInteger(g.enh))) odd.push({ who: id, what: '강화 범위 밖', detail: String(g.enh) });
      for (const [d, v] of entries(g.day)) if (num(v) == null || v < 0) odd.push({ who: id, what: '하루 💎 음수 · 숫자 아님', detail: `${d}=${v}` });
      for (const [key, l] of entries(g.log)) { const gv = isObj(l) ? l.g : l; if (gv != null && (num(gv) == null || Math.abs(gv) > LOG_G_MAX)) odd.push({ who: id, what: '💎 기록 한 줄 이상값', detail: `${key}=${JSON.stringify(gv).slice(0, 20)}` }); }
      if (g.buy != null) {
        const items = entries(g.buy).map(([k2, v]) => (isObj(v) ? v.id : typeof v === 'number' ? k2 : null));
        if (items.some((i) => !i)) odd.push({ who: id, what: '산 것 줄이 깨짐', detail: `${items.filter((i) => !i).length}줄` });
        const dup = items.filter((i, j) => i && items.indexOf(i) !== j); if (dup.length) odd.push({ who: id, what: '산 것 겹침', detail: [...new Set(dup)].join(',') });
      }
    }
    if (x != null && isObj(x) && x.total != null) { const v = num(x.total); if (v == null) odd.push({ who: id, what: 'xp.total 숫자 아님', detail: JSON.stringify(x.total).slice(0, 30) }); else if (v < 0 || v > XP_MAX) odd.push({ who: id, what: 'EXP 범위 밖', detail: String(v) }); }
    // ── ② 반쪽 ──
    if ((g != null || x != null || rec != null) && !a) half.push({ who: id, what: '기록은 있는데 계정 칸 없음', detail: [g && 'gem', x && 'xp', rec && 'records'].filter(Boolean).join('·') });
    if (isObj(a) && !a.uid && !a.pw && !a.reset) half.push({ who: id, what: '계정 칸에 uid 없음', detail: Object.keys(a).slice(0, 6).join(',') });
    if (isObj(g) && g.total == null && Object.keys(g).some((k2) => k2 !== 'log' && k2 !== 'day')) half.push({ who: id, what: '지갑에 total 없음 (다른 칸만)', detail: Object.keys(g).slice(0, 6).join(',') });
    for (const [lid, r] of entries(rec)) if (!isObj(r)) half.push({ who: id, what: '수업 기록 줄이 객체 아님', detail: lid }); else if (r.at == null && r.boss == null && r.mons == null) half.push({ who: id, what: '수업 기록 줄이 반쪽 (at · boss · mons 없음)', detail: `${lid}: ${Object.keys(r).slice(0, 4).join(',')}` });
    // ── ① 갑자기 0 ──
    const logSum = entries(g?.log).reduce((s, [, l]) => s + (num(isObj(l) ? l.g : l) || 0), 0);
    const xpLog = entries(x?.log).reduce((s, [, l]) => s + (num(isObj(l) ? l.xp : l) || 0), 0);
    const recN = entries(rec).length, bonN = entries(bon).length, gem0 = g?.total == null || g.total === 0, xp0 = x?.total == null || x.total === 0; // 글자 · 음수 = ③ 이상값 쪽
    const signs = [];
    if (gem0 && logSum >= 20) signs.push(`💎 0 · 받은 기록 합 ${logSum}`);
    if (xp0 && (xpLog >= 20 || recN >= 1)) signs.push(`EXP 0 · EXP 기록 합 ${xpLog} · 수업 기록 ${recN}`);
    if (isObj(g) && entries(g.buy).length === 0 && entries(g.log).some(([k2]) => /^buy_/.test(k2))) signs.push('산 것 0 · 산 기록(buy_) 있음');
    if (isObj(a) && (a.hero ?? 0) === 0 && entries(g?.log).some(([k2]) => /^buy_hero_/.test(k2))) signs.push('용사 0 · 산 용사 기록 있음');
    if (signs.length && (recN || bonN || logSum)) zero.push({ who: id, what: signs.length >= 2 ? '🚨 초기화 꼴 (여러 칸이 함께 0)' : '갑자기 0 의심', detail: signs.join(' · ') });
  }
  // ── 방 · 학교 칸 반쪽 ──
  for (const [code, r] of entries(T.rooms)) {
    if (!isObj(r) || !isObj(r.state) || !isObj(r.meta)) { half.push({ who: `방 ${code}`, what: '반쪽 방 (state · meta 없음)', detail: isObj(r) ? Object.keys(r).slice(0, 6).join(',') : typeof r }); continue; }
    const ghosts = entries(r.players).filter(([, p]) => !isObj(p) || (p.nick == null && p.num == null)).length;
    if (ghosts) half.push({ who: `방 ${code}`, what: '이름 · 번호 없는 사람 줄 (접속 신호만)', detail: `${ghosts}줄` });
  }
  const live = T.school?.live; if (isObj(live) && live.code && T.rooms && !T.rooms[live.code]) half.push({ who: `school/live`, what: '열린 수업 방이 없음', detail: String(live.code) });
  for (const [u, gs] of entries(T.gifts)) for (const [k2, gf] of entries(gs)) { if (!isObj(gf)) half.push({ who: `선물 ${u.replace(/^s(\d+)_(\d+)_(\d+)$/, '$1-$2-$3')}`, what: '선물 줄이 객체 아님', detail: k2 }); else if (gf.g != null && (num(gf.g) == null || gf.g < 0 || gf.g > LOG_G_MAX)) odd.push({ who: `선물 ${u.replace(/^s(\d+)_(\d+)_(\d+)$/, '$1-$2-$3')}`, what: '선물 💎 이상값', detail: `${k2}=${gf.g}` }); }
  return { zero, half, odd, stat: { students: students.size, rooms: entries(T.rooms).length } };
}

export function report(R) {
  const sec = (t, rows) => `\n## ${t} (${rows.length})\n${rows.length ? `| 누구 | 무엇 | 자세히 |\n|---|---|---|\n${rows.map((r) => `| ${r.who} | ${r.what} | ${String(r.detail).replace(/\|/g, '/')} |`).join('\n')}` : '없음 ✅'}`;
  return `# 🩺 운영 데이터 건강 검진 · 학생 ${R.stat.students} · 방 ${R.stat.rooms}${sec('① 갑자기 0 이 된 지갑', R.zero)}${sec('② 반쪽 노드', R.half)}${sec('③ 음수 · 이상값', R.odd)}\n`;
}

async function main() {
  const a = process.argv.slice(2), jsonAt = a.indexOf('--json'), out = jsonAt >= 0 ? a[jsonAt + 1] : null, fileAt = a.indexOf('--file');
  let T = {};
  if (fileAt >= 0) T = JSON.parse(readFileSync(a[fileAt + 1], 'utf8'));
  else {
    const [DB, HDR] = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--json');
    if (!DB || !HDR) { console.log('쓰는 법: node tools/ops/health.mjs <서버 주소> <열쇠 헤더 파일> [--json 결과.json] · 또는 --file <트리.json>'); process.exit(2); }
    const H = Object.fromEntries(readFileSync(HDR, 'utf8').split('\n').filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
    const get = async (p) => { const r = await fetch(`${DB.replace(/\/$/, '')}/${p}.json`, { method: 'GET', headers: H }); if (!r.ok) throw new Error(`${r.status} ${p}`); return r.json(); }; // 읽기만 (GET)
    for (const r of ROOTS) { try { T[r] = await get(r); } catch (e) { console.warn(`⚠ ${r} 못 읽음 · ${String(e).slice(0, 60)}`); } }
  }
  const R = check(T);
  console.log(report(R));
  if (out) writeFileSync(out, JSON.stringify(R, null, 1));
  process.exit(R.zero.length || R.odd.length ? 1 : 0);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) void main();
