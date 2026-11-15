// 🆕 바뀐 것 알림 (📜 2026-11-15 선생님 확정 · DECISIONS 맨 아래 · 머리 🔨)
//   판마다 바뀐 것 = changes.json (빌드 안 · 판을 올릴 때마다 배포 보고와 같은 말로 채움 · 코드 · 파일 이름 없이)
//   👩‍🏫 교사: 정식 = 교사 로그인 때 아래 창(못 본 판 · 최신부터) + 소식 탭 「📢 [✅ 정식 bNNN] 바뀐 것」 / 베타 = 창 없음 · 소식 탭 「🧪 [베타 bNNN] 바뀐 것 · 베타에서 확인할 것 · 🎒 학생에게 갈 새 소식」
//     마지막 본 판 = school/teacher/seen/{교사 uid}/{rel | beta} (정식 · 베타 따로 · 같은 판 두 번 X)
//   🎒 학생: 정식에서만 · 캠프에 들어올 때 마지막 본 판(accounts/{반}/{번호}/seen)보다 새 판 + 학생 줄이 있으면 작은 창 「🆕 새 소식」 한 번(묶어 최대 5줄) + 우편함 「📢 새 소식」
//   처음(본 판 기록 없음) = 이번 판만
import type { Store } from '../model/types';
import { BETA, TEST_ADDR } from '../channel';
import RAW from './changes.json';

export interface ChangeItem { who: '교사' | '학생'; text: string; check?: string }
export interface Change { ver: string; date: string; channel: 'release' | 'beta'; items: ChangeItem[]; student: string[] }
export const CHANGES = RAW as Change[];
export const vnum = (v?: string | null) => Number(String(v ?? '').replace(/\D/g, '')) || 0;
/** 이 판까지의 바뀐 것 (최신부터) */
export const upTo = (build: string, all: Change[] = CHANGES) => all.filter((c) => vnum(c.ver) <= vnum(build)).sort((a, b) => vnum(b.ver) - vnum(a.ver));
/** 못 본 판 (최신부터) · 본 판 기록이 없으면 이번 판만 */
export function unseen(last: string | null | undefined, build: string, all: Change[] = CHANGES): Change[] {
  const list = upTo(build, all), l = vnum(last);
  return l ? list.filter((c) => vnum(c.ver) > l) : list.slice(0, 1);
}
/** 🎒 학생 새 소식 줄 (여러 판 = 묶어 최대 5줄) */
export const studentLines = (list: Change[]) => list.flatMap((c) => c.student || []).slice(0, 5);

export type Chan = 'rel' | 'beta';
export const teacherSeenPath = (uid: string, ch: Chan) => `school/teacher/seen/${uid}/${ch}`;
export const studentSeenPath = (cls: string, num: number) => `accounts/${cls}/${num}/seen`;
const tag = (w: ChangeItem['who']) => (w === '교사' ? '👩‍🏫' : '🎒');
/** 교사 소식 탭 한 통 (판 하나 · 같은 판 두 번 X = 칸 이름이 판) */
export function teacherNews(S: Store, c: Change, ch: Chan, at: number): boolean {
  const id = `news_${ch}_${c.ver}`, p = `school/inbox/${id}`;
  if (S.get(p)) return false;
  const lines = c.items.map((x) => `${tag(x.who)} ${x.text}${x.check ? `\n   ✔ 확인할 것: ${x.check}` : ''}`);
  const stu = ch === 'beta' && c.student?.length ? `\n\n🎒 학생에게 갈 새 소식 (정식 배포 때)\n${c.student.map((t) => `· ${t}`).join('\n')}` : '';
  S.set(p, { id, kind: 'news', title: ch === 'rel' ? `📢 [✅ 정식 ${c.ver}] 바뀐 것` : `🧪 [베타 ${c.ver}] 바뀐 것 · 베타에서 확인할 것`, sub: `${c.date} · ${c.items.length}가지`, body: lines.join('\n') + stu, at });
  return true;
}
/** 교사 = 못 본 판마다 소식 한 통 · 본 판 = 지금 판 (정식은 창의 「확인했어요」 때 seen 을 씀) */
export function teacherSync(S: Store, uid: string, ch: Chan, build: string, at: number, markSeen: boolean): Change[] {
  const list = unseen(S.get<string>(teacherSeenPath(uid, ch)), build);
  list.slice().reverse().forEach((c, i) => teacherNews(S, c, ch, at + i));
  if (markSeen && list.length) S.set(teacherSeenPath(uid, ch), build);
  return list;
}
/** 🎒 학생 = 우편함 「📢 새 소식」 (판마다 한 통) */
export function studentNews(S: Store, mailUid: string, list: Change[], at: number) {
  list.slice().reverse().forEach((c, i) => { if (!c.student?.length) return; const p = `mail/${mailUid}/news_${c.ver}`; if (!S.get(p)) S.set(p, { text: `🆕 ${c.ver} 새 소식\n${c.student.map((t) => `· ${t}`).join('\n')}`, at: at + i, kind: 'news' }); });
}
/** 이 사이트 = 정식(rel) · 베타(beta) · 🧪 시험 주소에서만 ?chan=rel 로 정식 꼴을 시험 */
export const chanOf = (): Chan => (TEST_ADDR && typeof location !== 'undefined' && new URLSearchParams(location.search).get('chan') === 'rel' ? 'rel' : BETA ? 'beta' : 'rel');
