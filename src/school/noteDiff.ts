// 🔔 교사 알림 = 알릴 것 고르기 (순수 함수 · 앱(notify.svelte.ts)과 무료 중계(tools/relay/worker.js)가 같은 것을 씀 — 📜 2026-11-16)
//   입력 = 서버 칸 그대로(photo · school/inbox · loginFail) · 하루 경계 = 한국 시각 자정 · 알림 글에 학생 이름 · 번호 없음(반별 한 줄)
export type NoteKind = 'photo' | 'hand' | 'login' | 'deploy';
/** 로그인 실패 = 오늘 이 횟수부터 알림 */
export const LOGIN_FAIL_N = 3;
export interface NoteSnap { photo: string[]; hand: string[]; login: Record<string, string>; deploy: string }
export interface Note { kind: NoteKind; title: string; body: string }
export interface NoteData { photo: { c: string; n: number | string; k: string; id: string }[]; msgs: { id: string; cls: string }[]; fails: Record<string, Record<string, Record<string, number>>> }

type Tree = Record<string, unknown>;
const obj = (v: unknown): Tree => (v && typeof v === 'object' ? (v as Tree) : {});
/** 서버 칸 그대로 → NoteData (중계가 씀 · 앱은 photoNeeds · inbox 로 같은 것을 만듦) — 가짜 소식 n1~n6 은 뺌 */
export function rawNoteData(photo: unknown, inbox: unknown, fails: unknown): NoteData {
  const ph: NoteData['photo'] = [];
  for (const [c, byN] of Object.entries(obj(photo))) for (const [n, byK] of Object.entries(obj(byN))) for (const [k, byId] of Object.entries(obj(byK))) for (const [id, x] of Object.entries(obj(byId))) {
    const r = obj(x); if (r.status && r.ok == null && (r.status === 'check' || !!r.appeal)) ph.push({ c, n, k, id });
  }
  const msgs = Object.values(obj(inbox)).map(obj).filter((x) => x.kind === 'idea' && x.from && !x.read && !/^n[1-6]$/.test(String(x.id))).map((x) => ({ id: String(x.id), cls: String(obj(x.from).cls ?? '') }));
  return { photo: ph, msgs, fails: obj(fails) as NoteData['fails'] };
}

const KST = 9 * 3600e3, DAY = 24 * 3600e3;
/** 한국 시각 오늘 0시 (ms) */
export const kstToday0 = (now: number) => Math.floor((now + KST) / DAY) * DAY - KST;
const kstDay = (now: number) => new Date(kstToday0(now) + KST).toISOString().slice(0, 10);
/** 반별로 묶은 한 줄 (이름 · 번호 없음) 「1-3반 2장 · 1-5반 1장」 */
const byClass = (cls: string[], unit: string) => { const m = new Map<string, number>(); for (const c of cls) m.set(c, (m.get(c) ?? 0) + 1); return [...m].map(([c, n]) => `${c.replace(/_/g, '-')}반 ${n}${unit}`).join(' · '); };

/** seen = 지난번까지 본 것 · 첫 번 = 알리지 않고 기준만 · site = 사이트 판(version.json build) · build = 지금 앱 판(중계는 '') */
export function diffData(d: NoteData, seen: NoteSnap | null, now: number, site: string | null, build: string): { notes: Note[]; next: NoteSnap } {
  const phIds = d.photo.map((x) => `${x.c}_${x.n}_${x.k}_${x.id}`);
  const t0 = kstToday0(now), day = kstDay(now), loginHot: Record<string, string> = {};
  for (const [c, byN] of Object.entries(d.fails || {})) for (const [n, byT] of Object.entries(byN || {})) { const k = Object.values(byT || {}).filter((at) => Number(at) >= t0).length; if (k >= LOGIN_FAIL_N) loginHot[`${c}/${n}`] = day; }
  const next: NoteSnap = { photo: phIds, hand: d.msgs.map((x) => x.id), login: Object.fromEntries(Object.entries({ ...(seen?.login ?? {}), ...loginHot }).filter(([, v]) => v === day)), deploy: site ?? seen?.deploy ?? build };
  if (!seen) return { notes: [], next };
  const notes: Note[] = [];
  const newPh = d.photo.filter((_, i) => !seen.photo.includes(phIds[i]!));
  if (newPh.length) notes.push({ kind: 'photo', title: `📷 사진 확인 ${newPh.length}장`, body: `${byClass(newPh.map((x) => x.c), '장')} · 소식 탭에서 확인` });
  const newMsg = d.msgs.filter((x) => !seen.hand.includes(x.id));
  if (newMsg.length) notes.push({ kind: 'hand', title: `💬 학생 메시지 ${newMsg.length}개`, body: `${byClass(newMsg.map((x) => x.cls), '개')} · 소식 탭에서 답장` });
  const newFail = Object.keys(loginHot).filter((k) => seen.login[k] !== day);
  if (newFail.length) notes.push({ kind: 'login', title: `🔑 로그인 실패 여러 번 · ${newFail.length}명`, body: `${byClass(newFail.map((k) => k.split('/')[0]!), '명')} · 오늘 ${LOGIN_FAIL_N}번 이상 · 반 탭에서 0000 초기화` });
  if (site && site !== seen.deploy && site !== build) notes.push({ kind: 'deploy', title: `🆕 새 판 ${site}`, body: '게임이 새 판으로 바뀌었어요 · 열면 새로 고침' });
  return { notes, next };
}
