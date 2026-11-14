// 🚀 출시 복사 계획 (📜 2026-11-15 선생님 「진행」 · DECISIONS 「🚀 출시 = 오늘」 · 「정식 기준 · 합치기 없음 · 가장 안전한 방법」)
//   순수 함수만(서버에 닿지 않음) — copy.mjs 가 이 계획대로 읽고 · 쓰고 · 대조함 · tests/copyplan.test.ts 가 시험
//   ① 베타 서버 전체를 먼저 파일로 백업 ② 베타의 학생 칸(+ 게시판 · 수업 방 등 베타에서 생긴 학생 기록)을 비움
//   ③ 정식 맨 윗칸을 **그대로**(같은 이름 · 같은 꼴) 복사 — 베타가 아직 안 쓰는 칸도 버리지 않고 보관
//   ④ admins · prep = 합침(베타 교사 · 올린 팩은 남김 · 겹치면 정식) ⑤ 바꿔 넣기 = 안 받은 친구 선물(fgift) → gifts · 선생님 답장(fbr) → mail · 학생 칸 주인(pids)
//   ⑥ 대조표 = 정식 ↔ 베타(복사 뒤) 칸마다 똑같은지 + 학생마다 💎 · 📜 · 용사 · 강화 · 기록 수 · 카드 · 설문 응답 수 → 1칸이라도 다르면 멈춤

/** 정식에서 옮기지 않는 칸 = 수업 중 잠깐 쓰는 칸 · 열쇠 (학생 기록 아님) */
export const SKIP = ['rooms', 'live', 'secrets', 'hallTry'];
/** 합치는 칸 (베타 것을 남기고 정식 것을 더함 · 겹치면 정식) */
export const MERGE = ['admins', 'prep'];
/** 베타에서 비우는 칸 = 학생 기록 · 베타에서 생긴 학생 흔적 (복사 전에 백업 파일에 다 들어감) */
export const BETA_CLEAR = ['accounts', 'gem', 'xp', 'cards', 'records', 'bonus', 'roster', 'rosterMask', 'tester', 'pids', 'gifts', 'mail', 'rooms', 'boardLock', 'hostKeys',
  'school/board', 'school/inbox', 'school/survey', 'school/funUsed', 'school/funStats', 'school/live', 'school/last', 'school/lastTest'];
/** 학생 칸 열쇠 (정식 · 베타 같음) */
export const pidOf = (cls, num) => `s${String(cls).replace('-', '_')}_${num}`;

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** 정식 맨 윗칸 이름 → 할 일 */
export function classify(area) {
  if (SKIP.includes(area)) return 'skip';
  if (MERGE.includes(area)) return 'merge';
  return 'copy';
}

/**
 * 계획 만들기
 * @param {Record<string, unknown>} off 정식 전체(맨 윗칸 → 값)
 * @param {{ authImport?: boolean }} opt authImport = 로그인 목록을 uid 그대로 들여옴(기본) · false = 옮긴 계정에 reset(첫 로그인 때 새로 잇기)
 * @returns {{ clear: string[], put: { path: string, val: unknown }[], patch: Record<string, unknown>, areas: { area: string, how: string, n: number }[] }}
 */
export function buildPlan(off, opt = {}) {
  const authImport = opt.authImport !== false;
  const put = [], patch = {}, areas = [];
  for (const [area, val] of Object.entries(off || {})) {
    const how = classify(area), n = isObj(val) ? Object.keys(val).length : val == null ? 0 : 1;
    areas.push({ area, how, n });
    if (how === 'skip' || val == null) continue;
    if (how === 'merge') {
      // admins = 교사 한 명씩 · prep = 차시 → 칸 그림 하나씩(prep/{차시}/img/{칸}) · 그 밖 prep 칸은 차시 단위
      if (area === 'admins') for (const [u, v] of Object.entries(val)) patch[`admins/${u}`] = v;
      else for (const [lid, sub] of Object.entries(val)) {
        if (isObj(sub) && isObj(sub.img)) { for (const [id, img] of Object.entries(sub.img)) patch[`prep/${lid}/img/${id}`] = img; for (const [k, v] of Object.entries(sub)) if (k !== 'img') patch[`prep/${lid}/${k}`] = v; }
        else patch[`prep/${lid}`] = sub;
      }
      continue;
    }
    put.push({ path: area, val: area === 'accounts' && !authImport ? withReset(val) : val });
  }
  // 바꿔 넣기 (베타가 읽는 꼴) — 정식 칸은 위에서 그대로 남김
  for (const [path, v] of Object.entries(converted(off))) patch[path] = v;
  return { clear: [...BETA_CLEAR], put, patch, areas };
}

/** 로그인 목록을 못 옮길 때만: 첫 로그인 때 그 반 · 번호 · 4자리로 새 로그인을 만들어 이어짐 */
export function withReset(acc) {
  const out = {};
  for (const [c, ns] of Object.entries(acc || {})) { out[c] = {}; for (const [n, a] of Object.entries(ns || {})) out[c][n] = { ...(a || {}), reset: true, from: 'release' }; }
  return out;
}

/** 정식 칸 → 베타가 읽는 칸 (원래 칸은 그대로 · 이것은 더 넣음) */
export function converted(off) {
  const out = {};
  // 🧑 학생 칸 주인(pids) = 정식 계정 uid 그대로 (로그인 목록을 uid 그대로 들여오므로 · 규칙이 바로 맞음)
  for (const [c, ns] of Object.entries(off.accounts || {})) for (const [n, a] of Object.entries(ns || {})) if (a && a.uid) out[`pids/${pidOf(c, n)}`] = { u: a.uid, c, n: String(n) };
  // 🎁 친구 선물(fgift/{반}/{번호}/{id} = { from, fromName, g, msg, at, got }) — 아직 안 받은 것만 → gifts/{pid}/fg_{id} (캠프에 들어오면 지갑에)
  for (const [c, ns] of Object.entries(off.fgift || {})) for (const [n, list] of Object.entries(ns || {})) for (const [id, g] of Object.entries(list || {})) {
    if (!g || g.got || !(Number(g.g) > 0)) continue;
    out[`gifts/${pidOf(c, n)}/fg_${id}`] = { g: Number(g.g), at: Number(g.at) || 0, fun: `🎁 ${g.fromName || '친구'} 선물${g.msg ? ` · ${g.msg}` : ''}`, from: 'release' };
  }
  // 💬 선생님 답장(fbr/{반}/{번호}/{fb id} = { t, at, q }) → mail/{pid}/fbr_{id} (우편함)
  for (const [c, ns] of Object.entries(off.fbr || {})) for (const [n, list] of Object.entries(ns || {})) for (const [id, r] of Object.entries(list || {})) {
    if (!r || !r.t) continue;
    out[`mail/${pidOf(c, n)}/fbr_${id}`] = { text: String(r.t), g: 0, at: Number(r.at) || 0, kind: 'reply', ...(r.q ? { q: String(r.q) } : {}), got: true };
  }
  return out;
}

// ── 대조표 ──
/** 같은 값인가 (열쇠 순서 상관없음) */
export function same(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a == b; // null ↔ undefined
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) { if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false; return a.every((x, i) => same(x, b[i])); }
  if (typeof a === 'object') { const ka = Object.keys(a).filter((k) => a[k] != null), kb = Object.keys(b).filter((k) => b[k] != null); if (ka.length !== kb.length) return false; return ka.every((k) => same(a[k], b[k])); }
  return Number.isNaN(a) && Number.isNaN(b);
}
const cnt = (v) => (isObj(v) ? Object.keys(v).length : 0);
/** 학생 한 명 요약 (대조표 한 줄) */
export function summary(db, c, n) {
  const g = db.gem?.[c]?.[n] || {}, a = db.accounts?.[c]?.[n] || {};
  const surveyN = Object.values(db.surveyA || {}).reduce((s, byCls) => s + (isObj(byCls) ? Object.values(byCls).filter((x) => isObj(x) && String(x.n ?? x.num ?? '') === String(n) && (x.c ?? x.cls ?? c) === c).length : 0), 0);
  return {
    gem: Number(g.total) || 0, scroll: Number(g.scroll) || 0, hero: a.hero ?? null, uid: a.uid ?? null,
    enh: JSON.stringify(g.enh ?? a.enh ?? null), buys: cnt(g.buy) + cnt(g.log && Object.fromEntries(Object.entries(g.log).filter(([k]) => k.startsWith('buy')))),
    records: cnt(db.records?.[c]?.[n]), bonus: cnt(db.bonus?.[c]?.[n]), cards: cnt(db.cards?.[c]?.[n]), xp: Number(db.xp?.[c]?.[n]?.total ?? db.xp?.[c]?.[n]) || 0, surveyN,
  };
}
/**
 * 대조: 정식(off) ↔ 베타 복사 뒤(dst)
 * @returns {{ ok: boolean, areaRows: { area: string, ok: boolean }[], students: { c: string, n: string, ok: boolean, diff: string[] }[], bad: string[] }}
 */
export function compare(off, dst, opt = {}) {
  const authImport = opt.authImport !== false, bad = [], areaRows = [];
  for (const [area, val] of Object.entries(off || {})) {
    const how = classify(area); if (how === 'skip') continue;
    let ok;
    if (how === 'merge') ok = Object.entries(val || {}).every(([k, v]) => (area === 'prep' && isObj(v) && isObj(v.img) ? Object.entries(v.img).every(([id, im]) => same(im, dst.prep?.[k]?.img?.[id])) : same(v, dst[area]?.[k])));
    else ok = same(area === 'accounts' && !authImport ? withReset(val) : val, dst[area]);
    areaRows.push({ area, ok }); if (!ok) bad.push(`칸 ${area}`);
  }
  for (const [path, v] of Object.entries(converted(off))) { const got = path.split('/').reduce((o, k) => (o == null ? o : o[k]), dst); if (!same(v, got)) bad.push(`바꿔 넣기 ${path}`); }
  const students = [];
  for (const [c, ns] of Object.entries(off.accounts || {})) for (const [n, acc] of Object.entries(ns || {})) {
    if (!acc) continue; // 배열 꼴 반 = [빈칸, 1번 …]
    const a = summary(off, c, n), b = summary(dst, c, n), diff = Object.keys(a).filter((k) => !same(a[k], b[k])).map((k) => `${k} ${a[k]} → ${b[k]}`);
    students.push({ c, n, ok: !diff.length, diff }); if (diff.length) bad.push(`학생 ${c}-${n}: ${diff.join(' · ')}`);
  }
  return { ok: !bad.length, areaRows, students, bad };
}
