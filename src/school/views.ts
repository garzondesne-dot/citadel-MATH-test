import { SUBJ } from '../engine/subject';
import type { Store } from '../model/types';
import { PACKS } from '../engine/packs';
import { CLASSES, isBeta } from './school';
import { achieve, classData, LESSON_LIST, MIS, memoParts, pct, STANDARDS, type Stud } from './dash';
import type { Cell, SheetData } from './xlsx';
import { CMP, doneCount, summary, surveyCache, WHEN } from './survey';
import { addDays, day as usageDay, loadUsage, perStudent, weekly, ymdLabel, type Days } from './usage';
import { misTop } from './seteuk';
import { rank as symRank } from './symtap';

// 📊 대시보드 보기 11+1 (#125 · 시안 ⑳) — 화면과 엑셀이 같은 계산(보기 하나 = 시트 하나)
//   색 + 글자 함께(도달 · 근접 · 미달 · ✔ △ ✘ · ⭐ · ■) · 「전체」 = 모든 반 합산(🧪 베타 반 · 시험 계정 빠짐)
export type Tone = 'ok' | 'md' | 'ng' | 'na' | 'bo' | '';
export interface TCell { t: string; tone?: Tone; v?: Cell }
export interface View {
  id: string; title: string; info: string;
  kpis?: { lab: string; big: string; sub: string }[];
  table?: { /** 칸 제목 눌러 정렬 */ sort?: boolean; head: string[]; rows: { cells: TCell[]; pick?: Stud; cls?: string; sum?: boolean }[]; legend: [Tone, string][] };
  list?: { rk: string; nm: string; sub: string; pc: string; bar?: number; pick?: Stud }[];
  bars?: { title: string; vals: number[]; labels: string[]; foot: string; /** ≈ 기록 전 추정(줄무늬) */ est?: boolean[] }[];
  /** 안내 한 줄 (📈 활용 추이 「참고 자료 · ≈ 추정」) */ note?: string;
  /** 막대가 표보다 먼저 */ barsFirst?: boolean;
  /** 거르기 (📖 기호 톡 차시) */ pick?: { label: string; cur: string; opts: [string, string][] };
  /** 목록 아래 줄을 자르지 않고 여러 줄로 (👀 이유 · 🔎 태그) */ listWrap?: boolean;
  /** 📥 CSV (이름 · 줄) */ csv?: { name: string; rows: (string | number)[][] };
  memos?: { s: Stud; text: string; more: string[] }[];
}
export const GROUPS: { name: string; views: [string, string][] }[] = [
  { name: '우리 반 어때?', views: [['cmp', '반 비교 · 전체'], ['use', '활용 추이'], ['weak', '개념별 약점'], ['mis', '오개념'], ['sym', '기호 톡']] },
  { name: '누가 도움이 필요해?', views: [['grid', '한눈에 표'], ['watch', '주의 학생'], ['std', '성취기준'], ['rank', '랭킹']] },
  { name: '기록 남기기', views: [['memo', '세특 메모'], ['photo', '서술형'], ['survey', '설문']] },
];
const tone = (v: number | null): Tone => (v == null ? 'na' : v >= 80 ? 'ok' : v >= 60 ? 'md' : 'ng');
const p = (v: number | null) => (v == null ? '—' : `${v}%`);
const pv = (v: number | null): Cell => (v == null ? null : { pct: v / 100 });
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
const SYMS = SUBJ.demo.syms; // 테스트 판 가짜 기호 표 = 과목 팩 (#136)

/** 반 하나 또는 「전체」(ALL) 의 학생 · 수업한 차시 · 빠진 수 */
export const ALL = '전체';
export function scope(S: Store, cls: string, withX = false) {
  const classes = cls === ALL ? CLASSES : [cls];
  const per = classes.map((c) => ({ c, ...classData(S, c) }));
  const all = per.flatMap((x) => x.studs);
  const studs = cls === ALL && !withX ? all.filter((s) => !s.x) : cls !== ALL || withX ? all : all;
  const held = [...new Map(per.flatMap((x) => x.held).map((h) => [h.id, h])).values()].sort((a, b) => a.no - b.no);
  const xN = all.filter((s) => s.x && !isBeta(S, s.cls)).length, betas = CLASSES.filter((c) => isBeta(S, c));
  return { classes, per, studs, held, xN, betas };
}
type Sc = ReturnType<typeof scope>;
const lessonCell = (s: Stud, id: string): TCell => {
  const r = s.rec[id]; if (!r) return { t: '불참', tone: 'na', v: '불참' };
  if (r.noBoss) return { t: '— 수업 안 함', tone: 'na', v: null }; // 📊 이 반 수업에서 형성평가를 안 엶 (0 점 아님)
  const ok = r.boss / r.bossN;
  return { t: `${r.boss}/${r.bossN}${r.star ? ' ⭐' : ''}${r.fixedBy ? ' → ■' : ''}`, tone: ok >= 0.8 ? 'ok' : ok > 0 ? 'md' : 'ng', v: r.boss };
};
const recent = (s: Stud) => s.extra.days.slice(7).some(Boolean);

export function view(S: Store, cls: string, id: string, withX = false, opt = ''): View {
  const sc: Sc = scope(S, cls, withX);
  const { studs, held } = sc;
  const nm = (s: Stud) => `${cls === ALL ? `${s.cls} ` : ''}${s.n} ${s.name}`;
  switch (id) {
    case 'cmp': {
      const rows = sc.per.filter((x) => withX || !isBeta(S, x.c)).map((x) => {
        const ss = withX ? x.studs : x.studs.filter((s) => !s.x);
        return { cls: x.c, cells: [{ t: `${x.c}${isBeta(S, x.c) ? ' 🧪' : ''}`, v: x.c }, { t: String(ss.length), v: ss.length }, ...held.map((h) => { const a = ss.filter((s) => s.rec[h.id]); const v = pct(a.reduce((n, s) => n + (s.rec[h.id]?.boss ?? 0), 0), a.reduce((n, s) => n + (s.rec[h.id]?.bossN ?? 0), 0)); return { t: a.length ? p(v) : '—', tone: a.length ? tone(v) : 'na', v: a.length ? pv(v) : null } as TCell; }), (() => { const v = pct(ss.filter(recent).length, ss.length); return { t: p(v), v: pv(v) }; })(), { t: String(avg(ss.map((s) => s.left))), v: avg(ss.map((s) => s.left)) }] as TCell[] };
      });
      const tot = { sum: true, cells: [{ t: '전체', v: '전체' }, { t: String(studs.length), v: studs.length }, ...held.map((h) => { const a = studs.filter((s) => s.rec[h.id]); const v = pct(a.reduce((n, s) => n + (s.rec[h.id]?.boss ?? 0), 0), a.reduce((n, s) => n + (s.rec[h.id]?.bossN ?? 0), 0)); return { t: p(v), tone: tone(v), v: pv(v) } as TCell; }), { t: p(pct(studs.filter(recent).length, studs.length)), v: pv(pct(studs.filter(recent).length, studs.length)) }, { t: String(avg(studs.map((s) => s.left))), v: avg(studs.map((s) => s.left)) }] as TCell[] };
      const bo = studs.reduce((a, s) => a + s.bossRaw[0], 0), bt = studs.reduce((a, s) => a + s.bossRaw[1], 0);
      const wk = weakList(studs)[0];
      return { id, title: '반 비교 · 전체', info: '모든 반을 한 표로 · 반을 누르면 그 반으로',
        kpis: [{ lab: '전체 학생', big: `${studs.length}명`, sub: `${sc.per.length - (withX ? 0 : sc.betas.length)}반${sc.betas.length && !withX ? ` · 🧪 ${sc.betas.join(' · ')} 빠짐` : ''}` }, { lab: '형성평가 평균 통과', big: p(pct(bo, bt)), sub: '첫 시도' }, { lab: '최근 7일 수업 밖 활동', big: p(pct(studs.filter(recent).length, studs.length)), sub: `${studs.filter(recent).length} / ${studs.length}명` }, { lab: '약점 1위 개념', big: wk?.nm ?? '-', sub: wk ? `전체 ${wk.pc}` : '' }],
        table: { head: ['반', '인원', ...held.map((h) => `${h.no}차시`), '수업 밖 7일 활동', '남은 문제 1인 평균'], rows: [...rows, tot], legend: [['ok', '80%↑'], ['md', '60~79'], ['ng', '60↓'], ['na', '— 아직 안 함']] } };
    }
    case 'grid': { // 📊 정식 dash.js 「① 한눈에 표」 COLS 그대로 (📜 2026-11-15 머리 🔨 「대시보드 = 옛 정식 그대로」) · 칸 제목을 누르면 정렬
      const num = (v: number | null | undefined, t?: string): TCell => ({ t: t ?? (v ? String(v) : ''), v: v ?? null });
      const per = (v: number | null): TCell => ({ t: p(v), tone: tone(v), v: pv(v) });
      const ladT = (s: Stud) => Object.entries(s.extra.lad || {}).map(([m, v]) => `${m.replace(/^u/, '')}${v >= 4 ? '✍' : v >= 2 ? '🧩' : '👣'}${v < 2 && s.extra.ladW?.[m] ? `🧩${s.extra.ladW[m]}` : ''}`).join(' ');
      const ladN = (s: Stud) => Object.values(s.extra.lad || {}).reduce((a, v) => a + v, 0);
      const G: View = { id, title: '한눈에 표', info: '칸 제목을 누르면 정렬 · 차시 칸 = 형성평가(맞힌 문항 / 문항) · 색이 진할수록 높음 · 이름을 누르면 개인 기록 · 🪜 = 👣 대장 처치 · 🧩 근거 줄 · ✍ 서술형 통과',
        table: { sort: true, head: ['번호 · 이름', ...held.map((h) => `${h.no}차시`), '❗ 남은 문제', '참여', '형성평가', '첫 시도', '⭕ OX', '고친 수', '💡 힌트', '💡 힌트 준', '🪜 사다리', '업적', '던전 도전', '카드', 'Lv'],
          rows: studs.map((s) => { const ox = s.extra.ox, oxp = ox && ox[1] ? pct(ox[0], ox[1]) : null; return { pick: s, cells: [{ t: nm(s), v: s.n }, ...held.map((h) => lessonCell(s, h.id)),
            { t: s.left ? `❗ ${s.left}` : '✔', tone: s.left ? 'ng' : 'ok', v: s.left }, { t: `${s.went}/${s.heldN}`, tone: tone(s.part), v: s.part }, per(s.boss), per(s.first), per(oxp),
            num(s.extra.fixes, String(s.extra.fixes)), num(s.extra.hintN), num(s.extra.hg), { t: ladT(s), v: ladN(s) }, num(s.extra.seals, String(s.extra.seals ?? 0)), num(s.tries, String(s.tries)), num(s.extra.cardN, String(s.extra.cardN ?? 0)), { t: `Lv.${s.lv}`, v: s.xp }] }; }),
          legend: [['ok', '80%↑'], ['md', '60~79'], ['ng', '60↓'], ['na', '불참 · 안 함']] },
      };
      G.csv = { name: `한눈에표_${cls}.csv`, rows: [G.table!.head, ...G.table!.rows.map((r) => r.cells.map((c) => c.t))] };
      return G;
    }
    case 'watch': { // 👀 정식 dash.js 「③ 주의 학생」 그대로 (📜 2026-11-15 머리 🔨 (c)) · 5 기준 · 벌이 아니라 확인용
      const heldOf = (c: string) => sc.per.find((x) => x.c === c)?.held ?? held;
      const rows = studs.filter((s) => withX || !s.x).map((s) => {
        const why: string[] = [], miss = heldOf(s.cls).slice(-2).filter((h) => !s.rec[h.id]);
        if (miss.length) why.push(`최근 불참: ${miss.map((h) => `${h.no}차시`).join(', ')}`);
        if (s.boss != null && s.boss < 50) why.push(`형성평가 평균 ${s.boss}%`);
        if (s.first != null && s.first < 50) why.push(`첫 시도 정답률 ${s.first}%`);
        if (s.went && !s.tries) why.push('허수아비 · 성채 0회');
        if (s.boss != null && s.first != null && s.boss >= 85 && s.first < 60 && s.extra.fixes >= 6) why.push(`🔍 고침 패턴 확인 (형성평가 ${s.boss}% · 레이드 첫 시도 ${s.first}% · 고친 ${s.extra.fixes}개)`);
        return { s, why };
      }).filter((r) => r.why.length);
      const last2 = held.slice(-2).map((h) => `${h.no}차시`).join(' · ');
      return { id, title: '주의 학생', info: `최근 2차시(${cls === ALL ? '반마다' : last2 || '—'}) 불참 · 형성평가 50% 미만 · 첫 시도 50% 미만 · 허수아비 · 성채 0회 · 🔍 고침 패턴(형성평가 85% 이상인데 레이드 첫 시도 60% 미만 · 고친 6개 이상 — 벌이 아니라 확인용)`,
        ...(rows.length ? {} : { note: '👍 지금 눈에 띄는 학생이 없어요.' }),
        listWrap: true, list: rows.map(({ s, why }) => ({ rk: `${s.n}번`, nm: `${cls === ALL ? `${s.cls} ` : ''}${s.name}`, sub: why.join(' · '), pc: '', pick: s })) };
    }
    case 'std': {
      const head = ['번호 · 이름', ...STANDARDS.map((d) => `${d.id.slice(-5)} ${d.name}`)];
      const reach = STANDARDS.map((d) => { const xs = studs.filter((s) => s.std[d.id]?.[1]); return pct(xs.filter((s) => (100 * s.std[d.id]![0]) / s.std[d.id]![1] >= 80).length, xs.length); });
      return { id, title: '성취기준', info: '개념별 첫 시도를 성취기준으로 묶은 참고 지표 · 도달 80%↑ · 근접 50~79 · 미달 50↓',
        table: { head, rows: [{ sum: true, cells: [{ t: '도달 비율', v: '도달 비율' }, ...reach.map((v) => ({ t: p(v), tone: tone(v), v: pv(v) } as TCell))] }, ...studs.map((s) => ({ pick: s, cells: [{ t: nm(s), v: nm(s) }, ...STANDARDS.map((d) => { const a = s.std[d.id]; if (!a || !a[1]) return { t: '—', tone: 'na', v: null } as TCell; const v = Math.round((100 * a[0]) / a[1]); const b = v >= 80 ? '도달' : v >= 50 ? '근접' : '미달'; return { t: `${b} ${v}%`, tone: v >= 80 ? 'ok' : v >= 50 ? 'md' : 'ng', v: pv(v) } as TCell; })] }))], legend: [['ok', '도달 80%↑'], ['md', '근접 50~79'], ['ng', '미달 50↓']] } };
    }
    case 'rank': return { id, title: '랭킹', info: 'EXP · 처치 순', list: [...studs].filter((s) => !s.x).sort((a, b) => b.xp - a.xp).slice(0, 15).map((s, i) => ({ rk: String(i + 1), nm: `${cls === ALL ? `${s.cls} ` : ''}${s.name}`, sub: `Lv.${s.lv} · 처치 ${s.bossRaw[0]}`, pc: `${s.xp} EXP`, pick: s })) };
    case 'use': if (S.kind === 'server') return useView(S, cls, sc, id); // 📈 서버 = 정식 usage.js 그대로 (act/ + 기록 전 ≈ 추정) · 이 기기 = 아래 가짜
    // falls through
    case 'use-fake': {
      const now7 = studs.filter(recent).length, prev7 = studs.filter((s) => s.extra.days.slice(0, 7).some(Boolean)).length;
      const solves = studs.reduce((a, s) => a + s.extra.solves, 0), fixes = studs.reduce((a, s) => a + s.extra.fixes, 0);
      const weeks = Array.from({ length: 6 }, (_, w) => studs.reduce((a, s) => a + (s.extra.weekly[w] ?? 0), 0)), act = Array.from({ length: 6 }, (_, w) => studs.filter((s) => (s.extra.weekly[w] ?? 0) > 25).length);
      const labels = Array.from({ length: 6 }, (_, w) => { const d = new Date(Date.now() - (5 - w) * 7 * 86400e3); return `${d.getMonth() + 1}/${d.getDate()}`; });
      return { id, title: '활용 추이', info: '수업 밖 스스로 한 활동과 접속을 주마다 셈 · 성적이 아니라 활용도 참고',
        kpis: [{ lab: '최근 7일 수업 밖 활동', big: `${now7} / ${studs.length}명`, sub: `${now7 >= prev7 ? '▲' : '▼'} 그 전 7일 ${prev7}명` }, { lab: '수업 밖 풀이', big: `${solves}회`, sub: '최근 2주' }, { lab: '1인당 풀이', big: `${avg(studs.map((s) => s.extra.solves))}회`, sub: `오답 고침 ${fixes}회` }, { lab: '최근 7일 접속', big: `${now7} / ${studs.length}명`, sub: `수업 참여 ${studs.reduce((a, s) => a + s.went, 0)}회` }],
        bars: [{ title: '수업 밖 활동 학생 수', vals: act, labels, foot: `이번 주 ${act[5]}명` }, { title: '수업 밖 문제 풀이 수', vals: weeks, labels, foot: `이번 주 ${weeks[5]}회` }] };
    }
    case 'weak': return { id, title: '개념별 약점', info: '반 전체 첫 시도 정답률이 낮은 개념부터 = 다음 수업 복습 1순위', list: weakList(studs) };
    case 'mis': { // 🔎 정식 dash.js 「⑥ 오개념」 그대로 (수업 + 🏰 성채 · 🎯 허수아비 빼기 · 📜 2026-11-15 머리 🔨 (c))
      const agg: Record<string, { w: number; f: number; who: number }> = {};
      studs.forEach((s) => Object.entries(s.mis).forEach(([k, v]) => { const a = (agg[k] = agg[k] || { w: 0, f: 0, who: 0 }); a.w += v[0]; a.f += v[1]; a.who++; }));
      const xs = Object.entries(agg).filter(([k]) => MIS[k]).sort((a, b) => b[1].w - a[1].w);
      const who = studs.filter((s) => Object.keys(s.mis).some((k) => MIS[k]));
      return { id, title: '오개념', info: '틀린 답의 종류를 모은 것 · 「바로잡음」 = 그 뒤 재도전 · 형성평가 세트 2 · 성채에서 맞힘 · 점수가 아니라 다음 수업에서 짚을 것',
        ...(xs.length ? {} : { note: '아직 쌓인 오개념 기록이 없어요.' }),
        ...(xs.length ? { table: { head: ['코드', '오개념', '틀린 횟수', '학생', '바로잡음'], legend: [['ok', '80%↑'], ['md', '60~79'], ['ng', '60↓']] as [Tone, string][],
          rows: xs.map(([k, a]) => { const v = pct(Math.min(a.f, a.w), a.w); return { cells: [{ t: k, v: k }, { t: MIS[k]!.name, v: MIS[k]!.name }, { t: String(a.w), v: a.w }, { t: `${a.who}명`, v: a.who }, { t: p(v), tone: tone(v), v: pv(v) } as TCell] }; }) } } : {}),
        listWrap: true, list: who.map((s) => ({ rk: `${s.n}번`, nm: `${cls === ALL ? `${s.cls} ` : ''}${s.name}`, sub: misTop(s.mis, 4).map((t) => `${t.code} ${t.wrong}${t.fixed ? ` · ✔${t.fixed}` : ''}`).join('  '), pc: '', pick: s })) };
    }
    case 'sym': if (S.kind === 'server') { // 📖 서버 = 정식 dash.js 「기호 톡」 그대로 (xp/{반}/{번호}/st · 가짜 SYMS 안 씀)
      const BY = SUBJ.symtalk?.BY ?? {}, lids = [...new Set(studs.flatMap((s) => Object.keys(s.extra.symt || {})))].sort(), lname = (l: string) => { const m = [...LESSON_LIST, ...PACKS].find((x) => x.id === l); return m ? (/^eval-/.test(l) ? `🏰 ${m.title}` : `${m.no}차시`) : l; };
      const xs = symRank(studs.map((s) => s.extra.symt), (k) => !!BY[k], lids.includes(opt) ? opt : ''), mx = Math.max(1, ...xs.map((x) => x.n));
      return { id, title: '기호 톡', info: '학생이 문제 속 기호를 톡 눌러 뜻을 본 횟수 · 많이 누른 기호 = 헷갈리는 기호 (다음 수업 짚을 곳) · 벌 · 보상 없음 · 테스트는 안 셈',
        ...(xs.length ? {} : { note: '아직 누른 기록이 없어요.' }), ...(lids.length ? { pick: { label: '차시', cur: lids.includes(opt) ? opt : '', opts: [['', '모두'], ...lids.map((l) => [l, lname(l)] as [string, string])] } } : {}),
        list: xs.map((x, i) => ({ rk: String(i + 1), nm: BY[x.id]!.sym, sub: BY[x.id]!.easy, pc: `${x.n}번 · ${x.who}명`, bar: x.n / mx })) };
    }
    // falls through
    case 'sym-fake': {
      const tot = studs.reduce((a, s) => a + s.extra.sym, 0), w = [0.32, 0.16, 0.14, 0.11, 0.08, 0.07, 0.07, 0.05];
      return { id, title: '기호 톡', info: '학생이 기호를 톡 눌러 뜻을 본 횟수 · 많이 누른 기호 = 헷갈리는 기호', list: SYMS.map(([k, d], i) => ({ rk: k, nm: `${Math.round(tot * (w[i] ?? 0))}번 · ${Math.max(1, Math.round(studs.length * (w[i] ?? 0) * 1.8))}명`, sub: d, pc: '', bar: (w[i] ?? 0) / (w[0] ?? 1) })) };
    }
    case 'memo': return { id, title: '세특 메모', info: '기록에 있는 사실만으로 만든 초안 · 그대로 쓰지 말고 관찰을 더해 다듬기', memos: studs.filter((s) => !s.x || withX).map((s) => { const m = memoParts(s); return { s, text: m.main, more: m.more }; }) };
    case 'photo': return { id, title: '서술형', info: '📷 손글씨 사진 채점 결과', list: studs.filter((s) => s.extra.photoOk + s.extra.photoRe > 0).slice(0, 15).map((s) => ({ rk: '📷', nm: `${cls === ALL ? `${s.cls} ` : ''}${s.name}${S?.kind === 'server' ? '' : ` · ${SUBJ.demo.photoWhere}`}`, sub: `통과 ${s.extra.photoOk} · 다시 ${s.extra.photoRe}`, pc: s.extra.photoOk ? '통과' : '다시', pick: s })) };
    case 'survey': { // 📝 정식 대시보드 「📝 설문」 (응답 = surveyA · 이름 없음 · 🧪 베타 반 · 시험 계정은 처음부터 안 쌓임)
      const cs = sc.classes.filter((c) => withX || !isBeta(S, c)), C = surveyCache();
      const L = cs.flatMap((c) => C[c] ?? []), s = summary(L), done = cs.reduce((a, c) => a + doneCount(S, c), 0), size = cs.reduce((a, c) => a + (sc.per.find((x) => x.c === c)?.studs.filter((u) => withX || !u.x).length ?? 0), 0);
      const sg = (v: number | null) => (v == null ? '—' : v > 0 ? `+${v}` : String(v));
      return { id, title: '설문', info: `수업 설문 응답 · 이름 없이 · 점수 1~5 · 「${WHEN[0]}」 ↔ 「${WHEN[1]}」`,
        kpis: [{ lab: '응답', big: `${s.n}`, sub: `응답 표시 ${done} / ${size}명` }, { lab: '9. 지금이 더 좋다', big: p(pct(s.cmp[0]?.n ?? 0, s.n)), sub: `${s.cmp[0]?.n ?? 0}명` }],
        table: { head: ['문항', `${WHEN[0]}`, WHEN[1], '변화', '오름 · 같음 · 내림'], legend: [['ok', '변화 +0.5 이상'], ['md', '+0 ~ +0.5'], ['ng', '내림']],
          rows: s.pairs.map((x, i) => ({ cells: [{ t: `${i + 1}. ${x.q}`, v: `${i + 1}. ${x.q}` }, { t: x.pre == null ? '—' : String(x.pre), v: x.pre }, { t: x.now == null ? '—' : String(x.now), v: x.now }, { t: sg(x.diff), tone: (x.diff == null ? 'na' : x.diff >= 0.5 ? 'ok' : x.diff >= 0 ? 'md' : 'ng') as Tone, v: x.diff }, { t: `${x.up} · ${x.same} · ${x.down}`, v: `${x.up} · ${x.same} · ${x.down}` }] })) },
        list: [...s.picks.map((x) => ({ rk: '8', nm: x.t, sub: '가장 도움이 된 것 (2개까지)', pc: `${x.n}명`, bar: s.n ? x.n / s.n : 0 })), ...s.cmp.map((x, i) => ({ rk: '9', nm: CMP[i]!, sub: '쉼터 놀이 ↔ 예전 5분 퀴즈', pc: `${x.n}명`, bar: s.n ? x.n / s.n : 0 })),
          ...s.say.map((x) => ({ rk: '10', nm: x, sub: '달라진 점', pc: '' })), ...s.want.map((x) => ({ rk: '11', nm: x, sub: '바꿨으면', pc: '' }))] };
    }
  }
  return { id, title: id, info: '' };
}
function weakList(studs: Stud[]) {
  const agg: Record<string, { name: string; lesson: string; ok: number; total: number; who: number }> = {};
  studs.forEach((s) => Object.entries(s.conc).forEach(([k, v]) => { const a = (agg[k] = agg[k] || { name: v.name, lesson: v.lesson, ok: 0, total: 0, who: 0 }); a.ok += v.ok; a.total += v.total; a.who++; }));
  return Object.values(agg).filter((a) => a.total).sort((a, b) => a.ok / a.total - b.ok / b.total).slice(0, 10).map((a, i) => { const v = pct(a.ok, a.total) ?? 0; return { rk: String(i + 1), nm: a.name, sub: `${LESSON_LIST.find((l) => l.id === a.lesson)?.no ?? PACKS.find((l) => l.id === a.lesson)?.no ?? (/(\d+)$/.exec(a.lesson)?.[1] ?? '')}차시 · ${a.ok}/${a.total} · ${a.who}명`, pc: `${v}%`, bar: v / 100 }; });
}
/** 보기 → 엑셀 시트 (숫자는 숫자 · % 는 서식) · withX = 「구분」 열 */
export function toSheet(v: View, withX = false): SheetData {
  const rows: Cell[][] = [];
  if (v.table) {
    rows.push([...(withX ? ['구분'] : []), ...v.table.head]);
    v.table.rows.forEach((r) => rows.push([...(withX ? [r.pick?.x ? '🧪' : ''] : []), ...r.cells.map((c) => (c.v === undefined ? c.t : c.v))]));
  } else if (v.list) {
    rows.push(['순서', '이름', '내용', '값']);
    v.list.forEach((x) => rows.push([x.rk, x.nm, x.sub, x.pc]));
  } else if (v.memos) {
    rows.push([...(withX ? ['구분'] : []), '반', '번호', '이름', '세특 초안', '더 보기']);
    v.memos.forEach((m) => rows.push([...(withX ? [m.s.x ? '🧪' : ''] : []), m.s.cls, m.s.n, m.s.name, m.text, m.more.join(' ')]));
  } else if (v.bars) {
    rows.push(['주', ...v.bars.map((b) => b.title)]);
    (v.bars[0]?.labels ?? []).forEach((l, i) => rows.push([l, ...v.bars!.map((b) => b.vals[i] ?? 0)]));
  }
  if (v.kpis && !v.table) { if (!rows.length) rows.push(['지표', '값', '덧붙임']); v.kpis.forEach((k) => rows.push([k.lab, k.big, k.sub])); }
  return { name: v.title.replace(/ · /g, ' '), rows: rows.length ? rows : [[v.title]] };
}
export const ALL_VIEWS = GROUPS.flatMap((g) => g.views.map((x) => x[0]));

/** 📈 활용 추이 = 정식 dash.js use() 그대로 (📜 2026-11-15 머리 🔨 「대시보드 = 옛 정식 그대로」 (a)) */
function useView(S: Store, cls: string, sc: Sc, id: string): View {
  const multi = sc.classes.length > 1, days: Days = {}; let since: string | null = null;
  for (const c of sc.classes) {
    const u = loadUsage(S, c); if (u.since && (!since || u.since < since)) since = u.since;
    for (const [d, byN] of Object.entries(u.days)) { days[d] ||= {}; for (const [n, x] of Object.entries(byN || {})) days[d][multi ? `${c}|${n}` : n] = x; }
  }
  const names = new Map<string, Stud>(); for (const s of sc.studs.filter((x) => !x.x)) names.set(multi ? `${s.cls}|${s.n}` : String(s.n), s);
  const T = names.size || 1, today = usageDay(S.now()), W = weekly(days, 8, today), now = W[W.length - 1]!;
  const ps = perStudent(days, today), keep = (k: string) => names.has(k), vals = Object.entries(ps).filter(([k]) => keep(k)).map(([, v]) => v);
  const r7 = vals.reduce((a, x) => a + x.now, 0), p7 = vals.reduce((a, x) => a + x.prev, 0), act7 = vals.filter((x) => x.now > 0).length, actP = vals.filter((x) => x.prev > 0).length;
  const dPct = p7 ? Math.round(((r7 - p7) / p7) * 100) : r7 ? 100 : 0, seen7 = vals.filter((x) => x.last && x.last >= addDays(today, -6)).length;
  const idle = (l: string) => !l || l < addDays(today, -13), labels = W.map((w) => ymdLabel(w.week)), est = W.map((w) => w.est);
  const rows = [...names.entries()].map(([k, s]) => ({ s, ...(ps[k] || { now: 0, prev: 0, last: '', pf: 0 }) })).sort((a, b) => b.now - a.now || (b.last > a.last ? 1 : b.last < a.last ? -1 : 0) || a.s.n - b.s.n);
  const nm = (s: Stud) => `${multi ? `${s.cls}-` : ''}${s.n}`;
  return { id, title: '활용 추이', info: '수업 밖 스스로 한 활동(🎯 허수아비 복습 · 🏰 성채 · 📕 오답 고침)과 접속을 주마다 셈 · 성적이 아니라 활용도 참고 자료',
    note: since ? `⚠ 참고 자료 · 기록 시작 ${ymdLabel(since)} — 그 전 주는 ≈ 추정(줄무늬)` : '⚠ 참고 자료 · 아직 새 기록이 없어 ≈ 추정만 보여요 (학생이 새 판으로 들어오면 쌓여요)',
    kpis: [
      { lab: '최근 7일 수업 밖 활동 학생', big: `${act7} / ${T}명`, sub: `${Math.round((act7 / T) * 100)}% · 그 전 7일 ${actP}명` },
      { lab: '최근 7일 수업 밖 풀이', big: `${r7}회`, sub: `${dPct >= 0 ? '▲' : '▼'} ${Math.abs(dPct)}% · 그 전 7일 ${p7}` },
      { lab: '1인당 풀이 (최근 7일)', big: `${(r7 / T).toFixed(1)}회`, sub: `이번 주 오답 고침 ${now.fixes}회` },
      { lab: '최근 7일 접속 학생', big: `${seen7} / ${T}명`, sub: `이번 주 수업 참여 ${now.joins}회` },
    ],
    barsFirst: true,
    bars: [
      { title: '🧑‍🎓 수업 밖 활동 학생 수', vals: W.map((w) => w.active), labels, est, foot: `이번 주 ${now.active}명` },
      { title: '🎯 수업 밖 문제 풀이 수', vals: W.map((w) => w.solves), labels, est, foot: `이번 주 ${now.solves}회` },
      { title: '🚪 접속 학생 수', vals: W.map((w) => w.visits), labels, est, foot: `이번 주 ${now.visits}명` },
    ],
    table: { head: ['번호', '이름', '최근 7일', '그 전 7일', '증감', '마지막 활동'], legend: [['ng', '2주 넘게 없음'], ['ok', '▲ 늘어남']],
      rows: rows.map((r) => { const dl = r.now - r.prev; return { pick: r.s, cells: [{ t: nm(r.s), v: nm(r.s) }, { t: r.s.name, v: r.s.name }, { t: String(r.now), v: r.now }, { t: String(r.prev), v: r.prev }, { t: `${dl > 0 ? '▲' : dl < 0 ? '▼' : '·'} ${Math.abs(dl)}`, tone: dl > 0 ? 'ok' : dl < 0 ? 'ng' : '', v: dl }, { t: r.last ? `${ymdLabel(r.last)}${idle(r.last) ? ' · 2주 넘게 없음' : ''}` : `-${idle(r.last) ? ' · 2주 넘게 없음' : ''}`, tone: idle(r.last) ? 'ng' : '', v: r.last ? ymdLabel(r.last) : '' }] }; }) },
    csv: { name: `활용추이_${cls}_${today}.csv`, rows: [['반', '번호', '이름', '최근7일 수업밖 풀이', '그전7일', '증감', '마지막 활동'], ...rows.map((r) => [r.s.cls, r.s.n, r.s.name, r.now, r.prev, r.now - r.prev, r.last ? ymdLabel(r.last) : ''])] } };
}
