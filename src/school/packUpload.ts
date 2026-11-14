// 📦 차시 팩 올리기 + 자동 검사기 (L1 · 📜 2026-11-14 선생님 「응 그렇게 진행해」 · 머리 🔨 · DECISIONS 「🏫 친구 학교판 · 순서 L1 → L3 → L4 → L5」)
//   양식 = 「📚 차시 팩 입력판」 문서 꼴 그대로(id · no · title · unit · goal · theme · pct · steps · mons · boss · next) + 덧붙인 칸(손발 ❓#61 추천):
//     mons.<id>.vers = [버전 0, 버전 1 … 버전 6] (각 버전 = 문항 배열 · 없으면 first = 버전 0) · choice · multi = ch(보기) 필수 · blanks = a 에 빈칸 정답 「⊂,⊄」
//     boss.vers = [버전 0(= first), 버전 1 …] (각 버전 = 문항 번호 순 배열)
//   문항 = { type: choice | ox | number | multi | blanks | text, q, a, ch?, sol? }
//   검사 = 양식 칸 빠짐 · 형식 · 보기 번호 · 정답 범위 · 정답 재계산(과목 SUBJ.recheck) · 버전 0~6 줄 · 도감 이름표(그림 · 배경 · 공격 · 개념 칸)
//   엔진 꼴(v: 1 · monsters)도 그대로 받음 = 풀 판(우리) 차시를 같은 길로
import type { LessonPack, MonsterPack, Question, Step } from '../model/types';
import { SUBJ } from '../engine/subject';
import { bossItem, forget, items, validate } from '../engine/lessons';

export type Lvl = 'err' | 'ask';
export interface Issue { at: string; msg: string; lvl: Lvl }
/** 도감 찾기 (화면 쪽 배치표 · 공격 표가 알려 줌 · 시험은 가짜로) */
export interface Look { sheet: (ref: string) => boolean; theme: (id: string) => boolean; attack: (id: string) => boolean; builtIn: (id: string) => boolean }
type BItem = { type?: string; q?: string; a?: unknown; ch?: unknown; sol?: string };
type BMon = { title?: string; sprite?: unknown; attack?: string; chain?: boolean; first?: BItem[]; second?: BItem[]; vers?: BItem[][]; note?: string };
type BBoss = { title?: string; sprite?: unknown; attack?: string | string[]; items?: number; hpItems?: number; tags?: string[]; first?: BItem[]; vers?: BItem[][] };
type BPack = { id?: string; no?: number; title?: string; unit?: string; goal?: string; theme?: string; pct?: number; std?: string; sheet?: string; next?: LessonPack['next']; steps?: Partial<Step>[]; mons?: Record<string, BMon>; boss?: BBoss };

const TYPES = ['choice', 'ox', 'number', 'multi', 'blanks', 'text'];
const MAXV = 7; // 버전 0 ~ 6
const KINDS = ['intro', 'concept', 'monster', 'boss'];
const num = (x: unknown) => (typeof x === 'number' ? x : typeof x === 'string' && x.trim() !== '' && !Number.isNaN(Number(x.trim().replace('−', '-'))) ? Number(x.trim().replace('−', '-')) : NaN);
const list = (a: unknown): string[] => (Array.isArray(a) ? a.map(String) : typeof a === 'string' ? a.split(/[,，]/).map((x) => x.trim()).filter(Boolean) : typeof a === 'number' ? [String(a)] : []);

/** 입력판 그림 이름 → 배치표 이름 (2 → base2:0 · extra:4 → extra4:0 · 2@h250 → base2:0@h250 · 이미 「키:칸」 이면 그대로) */
export function spriteName(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^[a-z]+\d+:\d+/i.test(s) || /^d\d\d:/.test(s)) return s;
  const [base, ...rest] = s.split('@'), tail = rest.length ? `@${rest.join('@')}` : '';
  const [k, row] = base!.includes(':') ? base!.split(':') : ['base', base!];
  return `${k}${row}:0${tail}`;
}

/** 입력판 문항 하나 → 엔진 문항 (틀린 칸은 issues 에) */
function toQ(it: BItem, at: string, out: Issue[]): Question | null {
  const err = (msg: string) => { out.push({ at, msg, lvl: 'err' }); return null; };
  if (!it || typeof it !== 'object') return err('문항 칸이 비었어요');
  const t = String(it.type ?? ''), q = String(it.q ?? '').trim(), sol = it.sol ? String(it.sol) : undefined;
  if (!TYPES.includes(t)) return err(`형식 「${t || '없음'}」 — ${TYPES.join(' · ')} 중 하나`);
  if (!q) return err('문제 글(q)이 비었어요');
  const base = { question: q, ...(sol ? { solution: sol } : {}) };
  const ch = Array.isArray(it.ch) ? (it.ch as unknown[]).map(String) : null;
  if (t === 'choice' || t === 'multi') {
    if (!ch || ch.length < 2) return err('보기(ch)가 2개 이상 있어야 해요');
    if (new Set(ch).size !== ch.length) return err('보기에 같은 것이 두 번 있어요');
    const idx = (x: string) => { const n = num(x); if (Number.isInteger(n) && String(n) === x.trim()) return n; return ch.indexOf(x); };
    if (t === 'choice') {
      const a = list(it.a); if (a.length !== 1) return err('선다 정답은 하나(보기 번호 0부터 또는 보기 글자)');
      const k = idx(a[0]!); if (k < 0 || k >= ch.length) return err(`정답 「${a[0]}」 이 보기 번호 범위(0 ~ ${ch.length - 1}) 밖이에요`);
      return { ...base, type: 'choice', choices: ch, answerIndex: k };
    }
    const a = list(it.a); if (!a.length) return err('여러 개 고르기 정답이 비었어요');
    const ks = a.map(idx); const bad = a.find((_, i) => ks[i]! < 0 || ks[i]! >= ch.length);
    if (bad != null) return err(`정답 「${bad}」 이 보기 번호 범위(0 ~ ${ch.length - 1}) 밖이에요`);
    if (new Set(ks).size !== ks.length) return err('정답 번호가 겹쳐요');
    return { ...base, type: 'multi', options: ch, answer: [...ks].sort((x, y) => x - y) };
  }
  if (t === 'ox') {
    const a = String(it.a ?? '').trim();
    const v = /^(o|ㅇ|참|true|○)$/i.test(a) ? true : /^(x|ㄴ|거짓|false|×)$/i.test(a) ? false : null;
    if (v == null) return err(`OX 정답 「${a}」 — O 또는 X`);
    return { ...base, type: 'ox', answer: v };
  }
  if (t === 'number') {
    const n = num(it.a); if (!Number.isFinite(n)) return err(`숫자 정답 「${String(it.a ?? '')}」 이 숫자가 아니에요`);
    if (!Number.isInteger(n) || Math.abs(n) > 9999) return err(`숫자 정답 ${n} — 정수 · −9999 ~ 9999 (룬 키패드 범위)`);
    return { ...base, type: 'number', answer: n };
  }
  if (t === 'blanks') {
    const a = list(it.a); if (!a.length) return err('빈칸 정답(a)이 비었어요 — 칸 순서대로 「⊂,⊄」');
    const opts = ch && ch.length ? ch : [...new Set(a)];
    const nb = (q.match(/□/g) || []).length;
    if (nb > 1 && nb !== a.length) return err(`빈칸 □ ${nb}개인데 정답은 ${a.length}개예요`);
    const miss = a.find((x) => !opts.includes(x)); if (miss) return err(`빈칸 정답 「${miss}」 이 보기(ch)에 없어요`);
    return { ...base, type: 'blanks', items: a.map((answer) => ({ answer })), options: opts };
  }
  const a = list(String(it.a ?? '').replace(/\|/g, ','));
  if (!a.length) return err('단답 정답(a)이 비었어요 — 여러 답은 「답1|답2」');
  return { ...base, type: 'text', answers: a };
}

/** 버전 0~6 줄 → 문항 판 목록 (버전마다 문항 수 · 형식이 버전 0 과 같아야) */
function versions(raw: BItem[][], at: string, out: Issue[], qat: (v: number, i: number) => string): Question[][] {
  if (raw.length > MAXV) out.push({ at, msg: `버전이 ${raw.length}개 — 버전 0 ~ 6 (7개까지)`, lvl: 'err' });
  const vs = raw.slice(0, MAXV).map((v, k) => (Array.isArray(v) ? v : (out.push({ at: `${at} · 버전 ${k}`, msg: '버전 칸이 문항 목록이 아니에요', lvl: 'err' }), [])).map((it, i) => toQ(it, qat(k, i), out)));
  const v0 = vs[0] ?? [];
  vs.forEach((v, k) => {
    if (!k) return;
    if (v.length !== v0.length) out.push({ at: `${at} · 버전 ${k}`, msg: `문항 ${v.length}개 — 버전 0 은 ${v0.length}개`, lvl: 'err' });
    v.forEach((q, i) => { const q0 = v0[i]; if (q && q0 && q.type !== q0.type) out.push({ at: qat(k, i), msg: `형식 ${q.type} — 버전 0 은 ${q0.type}`, lvl: 'err' }); });
  });
  return vs.map((v) => v.filter((q): q is Question => !!q));
}

/** 정답 재계산 (과목 SUBJ.recheck) — 틀리면 오류 · 못 풀면 「선생님 확인」 */
function recheckAll(qs: Question[], at: (i: number) => string, out: Issue[]): { done: number; ask: number } {
  let done = 0, ask = 0;
  qs.forEach((q, i) => {
    const r = SUBJ.recheck?.(q) ?? { ok: null };
    if (r.ok === false) out.push({ at: at(i), msg: `정답 재계산이 달라요 — 다시 풀면 ${r.want}`, lvl: 'err' });
    else if (r.ok === null) { ask++; } else done++;
  });
  return { done, ask };
}

export interface Checked { pack: LessonPack | null; issues: Issue[]; stats: { mons: number; items: number; versions: number; rechecked: number; ask: number } }

/** 올린 파일(글) → 검사 + 차시 팩 */
export function checkUpload(text: string, look: Look): Checked {
  const out: Issue[] = [], stats = { mons: 0, items: 0, versions: 0, rechecked: 0, ask: 0 };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { return { pack: null, issues: [{ at: '파일', msg: `JSON 으로 읽을 수 없어요 — ${(e as Error).message}`, lvl: 'err' }], stats }; }
  if (!raw || typeof raw !== 'object') return { pack: null, issues: [{ at: '파일', msg: '차시 팩 꼴이 아니에요', lvl: 'err' }], stats };
  const r = raw as Record<string, unknown>;
  if (typeof r.id === 'string') forget(r.id); // 같은 id 를 다시 올림 = 지난 판 문항 기억 지움
  const pack = r.v === 1 && r.monsters ? nativePack(r as unknown as LessonPack, out, stats) : boardPack(r as BPack, out, stats, look);
  if (!pack) return { pack: null, issues: out, stats };
  // 공통: 도감 이름표 · 엔진 검사(문항 0개 · 보스 문항 없음 …)
  if (!look.theme(pack.theme ?? '')) out.push({ at: '배경(theme)', msg: `던전 배경 「${pack.theme ?? ''}」 이 도감에 없어요`, lvl: 'err' });
  const concepts = new Set(pack.steps.filter((s) => s.kind === 'concept').map((s) => s.id));
  for (const [id, m] of Object.entries(pack.monsters)) {
    const nm = pack.steps.find((s) => s.id === id)?.title ?? id;
    if (!look.sheet(m.sprite)) out.push({ at: `${nm} · 그림(sprite)`, msg: `몬스터 그림 「${m.sprite}」 이 도감에 없어요`, lvl: 'err' });
    if (m.attack && !look.attack(m.attack)) out.push({ at: `${nm} · 공격(attack)`, msg: `공격 「${m.attack}」 이 공격 표에 없어요`, lvl: 'err' });
  }
  if (pack.boss) {
    if (!look.sheet(pack.boss.sprite)) out.push({ at: '형성평가 · 그림(sprite)', msg: `보스 그림 「${pack.boss.sprite}」 이 도감에 없어요`, lvl: 'err' });
    (pack.boss.attack ?? []).forEach((a) => { if (!look.attack(a)) out.push({ at: '형성평가 · 공격(attack)', msg: `공격 「${a}」 이 공격 표에 없어요`, lvl: 'err' }); });
    (pack.boss.tags ?? []).forEach((t, i) => { if (t && !concepts.has(t)) out.push({ at: `형성평가 · tags ${i + 1}번`, msg: `개념 칸 「${t}」 이 단계 목록에 없어요`, lvl: 'err' }); });
    if ((pack.boss.tags?.length ?? 0) && pack.boss.tags!.length !== pack.boss.items) out.push({ at: '형성평가 · tags', msg: `tags ${pack.boss.tags!.length}개 — 문항은 ${pack.boss.items}개`, lvl: 'err' });
  }
  if (look.builtIn(pack.id)) out.push({ at: 'id', msg: `「${pack.id}」 는 앱에 이미 있는 차시예요 — 올린 판이 그 차시를 대신해요(선생님 확인)`, lvl: 'ask' });
  if (!out.some((x) => x.lvl === 'err')) validate(pack).forEach((m) => out.push({ at: '차시 팩', msg: m, lvl: 'err' }));
  return { pack, issues: out, stats };
}

function boardPack(b: BPack, out: Issue[], stats: Checked['stats'], _look: Look): LessonPack | null {
  const need = (k: keyof BPack, name: string) => { if (b[k] == null || b[k] === '') out.push({ at: `${name}(${k})`, msg: '칸이 비었어요', lvl: 'err' }); };
  need('id', '차시 id'); need('no', '차시 번호'); need('title', '제목'); need('steps', '수업 흐름');
  if (b.id != null && !/^[a-z0-9][a-z0-9-]{1,40}$/.test(String(b.id))) out.push({ at: '차시 id(id)', msg: `「${b.id}」 — 영어 소문자 · 숫자 · - 만 (예: lesson-11)`, lvl: 'err' });
  if (b.no != null && !(Number.isInteger(Number(b.no)) && Number(b.no) > 0)) out.push({ at: '차시 번호(no)', msg: `「${b.no}」 — 1 이상 정수`, lvl: 'err' });
  if (!Array.isArray(b.steps)) return null;
  const steps: Step[] = [];
  b.steps.forEach((s, k) => {
    const at = `수업 흐름 ${k + 1}번`;
    if (!s || !KINDS.includes(String(s.kind))) { out.push({ at, msg: `종류 「${s?.kind ?? ''}」 — ${KINDS.join(' · ')}`, lvl: 'err' }); return; }
    if (!s.id || !s.title) { out.push({ at, msg: 'id · 제목(title)이 비었어요', lvl: 'err' }); return; }
    if (steps.some((x) => x.id === s.id)) out.push({ at, msg: `id 「${s.id}」 가 겹쳐요`, lvl: 'err' });
    steps.push({ kind: s.kind as Step['kind'], id: String(s.id), title: String(s.title), ...(s.say ? { say: String(s.say) } : {}), ...(Number(s.min) > 0 ? { min: Number(s.min) } : {}) });
  });
  const monsters: Record<string, MonsterPack> = {};
  for (const s of steps.filter((x) => x.kind === 'monster')) {
    const m = b.mons?.[s.id];
    if (!m) { out.push({ at: `${s.title}(mons.${s.id})`, msg: '단계는 있는데 몬스터 칸이 없어요', lvl: 'err' }); continue; }
    const raw = Array.isArray(m.vers) && m.vers.length ? m.vers : [m.first ?? [], ...((m.second ?? []).length ? [m.second!] : [])];
    if (!raw[0]?.length) { out.push({ at: `${s.title} · 버전 0`, msg: '문항이 하나도 없어요', lvl: 'err' }); continue; }
    const vs = versions(raw, s.title, out, (v, i) => `${s.title} · 버전 ${v} · ${i + 1}번`);
    stats.mons++; stats.items += vs[0]!.length; stats.versions += vs.length;
    vs.forEach((v, k) => { const r = recheckAll(v, (i) => `${s.title} · 버전 ${k} · ${i + 1}번`, out); stats.rechecked += r.done; stats.ask += r.ask; });
    const sprite = spriteName(m.sprite) || 'base0:0';
    if (!spriteName(m.sprite)) out.push({ at: `${s.title} · 그림(sprite)`, msg: '그림이 비어 기본 그림(base0:0)으로 넣어요', lvl: 'ask' });
    monsters[s.id] = { title: m.title || s.title, sprite, attack: m.attack || 'pause', first: vs[0], retry: { pool: vs.slice(1) }, ...(m.chain ? { chain: { pool: vs } } : {}), ...(m.note ? { noteText: m.note } : {}) };
  }
  let boss: LessonPack['boss'];
  if (steps.some((x) => x.kind === 'boss')) {
    const bo = b.boss;
    if (!bo) out.push({ at: '형성평가(boss)', msg: '형성평가 단계는 있는데 boss 칸이 없어요', lvl: 'err' });
    else {
      const raw = Array.isArray(bo.vers) && bo.vers.length ? bo.vers : [bo.first ?? []];
      const n = raw[0]?.length ?? 0;
      if (!n) out.push({ at: '형성평가 · 버전 0', msg: '문항이 하나도 없어요', lvl: 'err' });
      if (bo.items != null && Number(bo.items) !== n) out.push({ at: '형성평가 · 문항 수(items)', msg: `items ${bo.items} — 버전 0 문항은 ${n}개`, lvl: 'err' });
      const hp = Number(bo.hpItems ?? n);
      if (!(hp >= 1 && hp <= n)) out.push({ at: '형성평가 · 체력 문항(hpItems)', msg: `hpItems ${bo.hpItems} — 1 ~ ${n}`, lvl: 'err' });
      const vs = versions(raw, '형성평가', out, (v, i) => `형성평가 · 버전 ${v} · ${i + 1}번`);
      vs.forEach((v, k) => { const r = recheckAll(v, (i) => `형성평가 · 버전 ${k} · ${i + 1}번`, out); stats.rechecked += r.done; stats.ask += r.ask; });
      stats.items += vs[0]?.length ?? 0; stats.versions += vs.length;
      const sprite = spriteName(bo.sprite) || 'base0:0';
      if (n) boss = { title: bo.title || '형성평가', sprite, items: n, hpItems: Math.min(Math.max(1, hp), n), tags: bo.tags ?? [], sets: { '1': vs[0]! }, pool: Array.from({ length: n }, (_, i) => vs.slice(1).map((v) => v[i]).filter((q): q is Question => !!q)), ...(bo.attack ? { attack: Array.isArray(bo.attack) ? bo.attack : [bo.attack] } : {}) };
    }
  }
  if (!b.id || !b.title || !Array.isArray(b.steps)) return null;
  return { v: 1, id: String(b.id), no: Number(b.no) || 0, title: String(b.title), unit: String(b.unit ?? ''), theme: b.theme, defaultPct: Number(b.pct) > 0 ? Number(b.pct) : 90, ...(b.goal ? { goal: b.goal } : {}), ...(b.std ? { std: b.std } : {}), ...(b.sheet ? { sheet: b.sheet } : {}), ...(b.next ? { next: b.next } : {}), source: { file: 'upload', commit: '', board: new Date().toISOString() }, steps, monsters, ...(boss ? { boss } : {}) };
}

/** 엔진 꼴(풀 판 차시 · v: 1) — 첫 판(버전 0) 문항만 다시 계산 · 생성기 이름은 엔진 검사가 확인 */
function nativePack(p: LessonPack, out: Issue[], stats: Checked['stats']): LessonPack | null {
  if (!p.id || !Array.isArray(p.steps)) { out.push({ at: '차시 팩', msg: 'id · steps 가 없어요', lvl: 'err' }); return null; }
  for (const [id, m] of Object.entries(p.monsters || {})) {
    const nm = p.steps.find((s) => s.id === id)?.title ?? id;
    try { const qs = items(p, id, 'check', 0); stats.mons++; stats.items += qs.length; stats.versions += 1; const r = recheckAll(qs, (i) => `${nm} · 버전 0 · ${i + 1}번`, out); stats.rechecked += r.done; stats.ask += r.ask; } catch (e) { out.push({ at: nm, msg: (e as Error).message, lvl: 'err' }); }
    void m;
  }
  if (p.boss) { try { const qs = Array.from({ length: p.boss.items }, (_, i) => bossItem(p, 'check', i, 0)).filter((q): q is Question => !!q); stats.items += qs.length; const r = recheckAll(qs, (i) => `형성평가 · 버전 0 · ${i + 1}번`, out); stats.rechecked += r.done; stats.ask += r.ask; } catch (e) { out.push({ at: '형성평가', msg: (e as Error).message, lvl: 'err' }); } }
  return { ...p, source: { ...(p.source ?? { file: '', commit: '' }), board: p.source?.board ?? null } };
}

/** 저장 자리 (교사 쓰기 · 로그인한 사람 읽기 = 규칙 prep 그대로 · 규칙 바꿀 일 없음) */
export const PACK_PATH = 'prep/packs';
