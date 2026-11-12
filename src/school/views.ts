import type { Store } from '../model/types';
import { CLASSES, isBeta } from './school';
import { achieve, fakeClass, LESSON_LIST, MIS, memoOf, pct, STANDARDS, type Stud } from './dash';
import type { Cell, SheetData } from './xlsx';

// 📊 대시보드 보기 11+1 (#125 · 시안 ⑳) — 화면과 엑셀이 같은 계산(보기 하나 = 시트 하나)
//   색 + 글자 함께(도달 · 근접 · 미달 · ✔ △ ✘ · ⭐ · ■) · 「전체」 = 모든 반 합산(🧪 베타 반 · 시험 계정 빠짐)
export type Tone = 'ok' | 'md' | 'ng' | 'na' | 'bo' | '';
export interface TCell { t: string; tone?: Tone; v?: Cell }
export interface View {
  id: string; title: string; info: string;
  kpis?: { lab: string; big: string; sub: string }[];
  table?: { head: string[]; rows: { cells: TCell[]; pick?: Stud; cls?: string; sum?: boolean }[]; legend: [Tone, string][] };
  list?: { rk: string; nm: string; sub: string; pc: string; bar?: number; pick?: Stud }[];
  bars?: { title: string; vals: number[]; labels: string[]; foot: string }[];
  memos?: { s: Stud; text: string }[];
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
const SYMS: [string, string][] = [['A ⊂ B', 'A 가 B 안에 쏙 들어간다'], ['A ∩ B', 'A 와 B 가 겹친 곳'], ['A ∪ B', 'A 와 B 를 합친 것'], ['A ∩ B = ∅', '하나도 안 겹친다 (서로소)'], ['A = B', '원소가 똑같은 두 집합'], ['n(A ∪ B)', '더하고 겹친 만큼 빼기'], ['a ∈ A', 'a 는 A 팀 소속!'], ['Aᶜ', 'U 안에서 A 밖 전부']];

/** 반 하나 또는 「전체」(ALL) 의 학생 · 수업한 차시 · 빠진 수 */
export const ALL = '전체';
export function scope(S: Store, cls: string, withX = false) {
  const classes = cls === ALL ? CLASSES : [cls];
  const per = classes.map((c) => ({ c, ...fakeClass(S, c) }));
  const all = per.flatMap((x) => x.studs);
  const studs = cls === ALL && !withX ? all.filter((s) => !s.x) : cls !== ALL || withX ? all : all;
  const held = [...new Map(per.flatMap((x) => x.held).map((h) => [h.id, h])).values()].sort((a, b) => a.no - b.no);
  const xN = all.filter((s) => s.x && !isBeta(S, s.cls)).length, betas = CLASSES.filter((c) => isBeta(S, c));
  return { classes, per, studs, held, xN, betas };
}
type Sc = ReturnType<typeof scope>;
const lessonCell = (s: Stud, id: string): TCell => {
  const r = s.rec[id]; if (!r) return { t: '불참', tone: 'na', v: '불참' };
  const ok = r.boss / r.bossN;
  return { t: `${r.boss}/${r.bossN}${r.star ? ' ⭐' : ''}${r.fixedBy ? ' → ■' : ''}`, tone: ok >= 0.8 ? 'ok' : ok > 0 ? 'md' : 'ng', v: r.boss };
};
const recent = (s: Stud) => s.extra.days.slice(7).some(Boolean);

export function view(S: Store, cls: string, id: string, withX = false): View {
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
    case 'grid': return { id, title: '한눈에 표', info: '칸 = 형성평가(맞힌 문항 / 문항) · 이름을 누르면 개인 기록',
      table: { head: ['번호 · 이름', ...held.map((h) => `${h.no}차시`), '남은 문제', 'Lv'], rows: studs.map((s) => ({ pick: s, cells: [{ t: nm(s), v: nm(s) }, ...held.map((h) => lessonCell(s, h.id)), { t: `${s.left > 20 ? '❗ ' : ''}${s.left}`, tone: s.left > 20 ? 'ng' : '', v: s.left }, { t: String(s.lv), v: s.lv }] as TCell[] })), legend: [['ok', '✔ 통과'], ['md', '△ 일부'], ['ng', '✘ 0점'], ['na', '불참'], ['bo', '→ ■ 보충함'], ['', '⭐ 첫 시도 만점']] } };
    case 'watch': {
      const why = (s: Stud) => { const miss = s.heldN - s.went, zero = held.filter((h) => s.rec[h.id] && s.rec[h.id]!.boss === 0).length; return { miss, zero, score: miss * 10 + zero * 8 + s.left }; };
      const xs = studs.map((s) => ({ s, ...why(s) })).filter((x) => x.miss >= 1 || x.zero >= 1 || x.s.left >= 15).sort((a, b) => b.score - a.score).slice(0, 12);
      return { id, title: '주의 학생', info: '불참 · 0점 · 남은 문제가 많은 학생', list: xs.map((x) => ({ rk: String(x.s.n), nm: `${cls === ALL ? `${x.s.cls} ` : ''}${x.s.name}`, sub: [x.miss ? `불참 ${x.miss}` : '', x.zero ? `0점 ${x.zero}` : '', `남은 문제 ${x.s.left}`].filter(Boolean).join(' · '), pc: x.miss >= 2 ? '❗ 불참' : x.zero ? '❗ 0점' : '❗ 남은 문제', pick: x.s })) };
    }
    case 'std': {
      const head = ['번호 · 이름', ...STANDARDS.map((d) => `${d.id.slice(-5)} ${d.name}`)];
      const reach = STANDARDS.map((d) => { const xs = studs.filter((s) => s.std[d.id]?.[1]); return pct(xs.filter((s) => (100 * s.std[d.id]![0]) / s.std[d.id]![1] >= 80).length, xs.length); });
      return { id, title: '성취기준', info: '개념별 첫 시도를 성취기준으로 묶은 참고 지표 · 도달 80%↑ · 근접 50~79 · 미달 50↓',
        table: { head, rows: [{ sum: true, cells: [{ t: '도달 비율', v: '도달 비율' }, ...reach.map((v) => ({ t: p(v), tone: tone(v), v: pv(v) } as TCell))] }, ...studs.map((s) => ({ pick: s, cells: [{ t: nm(s), v: nm(s) }, ...STANDARDS.map((d) => { const a = s.std[d.id]; if (!a || !a[1]) return { t: '—', tone: 'na', v: null } as TCell; const v = Math.round((100 * a[0]) / a[1]); const b = v >= 80 ? '도달' : v >= 50 ? '근접' : '미달'; return { t: `${b} ${v}%`, tone: v >= 80 ? 'ok' : v >= 50 ? 'md' : 'ng', v: pv(v) } as TCell; })] }))], legend: [['ok', '도달 80%↑'], ['md', '근접 50~79'], ['ng', '미달 50↓']] } };
    }
    case 'rank': return { id, title: '랭킹', info: 'EXP · 처치 순', list: [...studs].filter((s) => !s.x).sort((a, b) => b.xp - a.xp).slice(0, 15).map((s, i) => ({ rk: String(i + 1), nm: `${cls === ALL ? `${s.cls} ` : ''}${s.name}`, sub: `Lv.${s.lv} · 처치 ${s.bossRaw[0]}`, pc: `${s.xp} EXP`, pick: s })) };
    case 'use': {
      const now7 = studs.filter(recent).length, prev7 = studs.filter((s) => s.extra.days.slice(0, 7).some(Boolean)).length;
      const solves = studs.reduce((a, s) => a + s.extra.solves, 0), fixes = studs.reduce((a, s) => a + s.extra.fixes, 0);
      const weeks = Array.from({ length: 6 }, (_, w) => studs.reduce((a, s) => a + (s.extra.weekly[w] ?? 0), 0)), act = Array.from({ length: 6 }, (_, w) => studs.filter((s) => (s.extra.weekly[w] ?? 0) > 25).length);
      const labels = Array.from({ length: 6 }, (_, w) => { const d = new Date(Date.now() - (5 - w) * 7 * 86400e3); return `${d.getMonth() + 1}/${d.getDate()}`; });
      return { id, title: '활용 추이', info: '수업 밖 스스로 한 활동과 접속을 주마다 셈 · 성적이 아니라 활용도 참고',
        kpis: [{ lab: '최근 7일 수업 밖 활동', big: `${now7} / ${studs.length}명`, sub: `${now7 >= prev7 ? '▲' : '▼'} 그 전 7일 ${prev7}명` }, { lab: '수업 밖 풀이', big: `${solves}회`, sub: '최근 2주' }, { lab: '1인당 풀이', big: `${avg(studs.map((s) => s.extra.solves))}회`, sub: `오답 고침 ${fixes}회` }, { lab: '최근 7일 접속', big: `${now7} / ${studs.length}명`, sub: `수업 참여 ${studs.reduce((a, s) => a + s.went, 0)}회` }],
        bars: [{ title: '수업 밖 활동 학생 수', vals: act, labels, foot: `이번 주 ${act[5]}명` }, { title: '수업 밖 문제 풀이 수', vals: weeks, labels, foot: `이번 주 ${weeks[5]}회` }] };
    }
    case 'weak': return { id, title: '개념별 약점', info: '반 전체 첫 시도 정답률이 낮은 개념부터 = 다음 수업 복습 1순위', list: weakList(studs) };
    case 'mis': {
      const agg: Record<string, { w: number; f: number; who: number }> = {};
      studs.forEach((s) => Object.entries(s.mis).forEach(([k, v]) => { const a = (agg[k] = agg[k] || { w: 0, f: 0, who: 0 }); a.w += v[0]; a.f += v[1]; a.who++; }));
      const xs = Object.entries(agg).sort((a, b) => b[1].w - a[1].w), mx = Math.max(1, ...xs.map((x) => x[1].w));
      return { id, title: '오개념', info: '틀린 답의 종류 · 「바로잡음」 = 그 뒤 재도전 · 보강에서 맞힘', list: xs.map(([k, a]) => ({ rk: k, nm: MIS[k] ?? k, sub: `틀림 ${a.w} · ${a.who}명`, pc: `바로잡음 ${pct(Math.min(a.f, a.w), a.w)}%`, bar: a.w / mx })) };
    }
    case 'sym': {
      const tot = studs.reduce((a, s) => a + s.extra.sym, 0), w = [0.32, 0.16, 0.14, 0.11, 0.08, 0.07, 0.07, 0.05];
      return { id, title: '기호 톡', info: '학생이 기호를 톡 눌러 뜻을 본 횟수 · 많이 누른 기호 = 헷갈리는 기호', list: SYMS.map(([k, d], i) => ({ rk: k, nm: `${Math.round(tot * (w[i] ?? 0))}번 · ${Math.max(1, Math.round(studs.length * (w[i] ?? 0) * 1.8))}명`, sub: d, pc: '', bar: (w[i] ?? 0) / (w[0] ?? 1) })) };
    }
    case 'memo': return { id, title: '세특 메모', info: '기록에 있는 사실만으로 만든 초안 · 그대로 쓰지 말고 관찰을 더해 다듬기', memos: studs.filter((s) => !s.x).map((s) => ({ s, text: memoOf(s) })) };
    case 'photo': return { id, title: '서술형', info: '📷 손글씨 사진 채점 결과', list: studs.filter((s) => s.extra.photoOk + s.extra.photoRe > 0).slice(0, 15).map((s) => ({ rk: '📷', nm: `${cls === ALL ? `${s.cls} ` : ''}${s.name} · 6차시 문제 4`, sub: s.extra.photoRe ? '다시 · 근거 빠짐' : '통과 · 근거 3줄', pc: s.extra.photoRe ? '다시' : '통과', pick: s })) };
    case 'survey': {
      const n = studs.length, r = Math.round(n * 0.85), fun = Math.round(r * 0.82);
      return { id, title: '설문', info: '수업 설문 응답', kpis: [{ lab: '6차시 응답', big: `${r} / ${n}`, sub: cls }, { lab: '「재밌었다」', big: p(pct(fun, r)), sub: `${fun}명` }],
        list: [{ rk: '💬', nm: '가장 좋았던 것', sub: '박쥐 · 콤보 · 친구랑 같이', pc: '' }, { rk: '💬', nm: '어려웠던 것', sub: '드모르간 · 차집합 개수', pc: '' }, { rk: '💬', nm: '바라는 것', sub: '쉼터 놀이 더 · 보스 더 세게', pc: '' }] };
    }
  }
  return { id, title: id, info: '' };
}
function weakList(studs: Stud[]) {
  const agg: Record<string, { name: string; lesson: string; ok: number; total: number; who: number }> = {};
  studs.forEach((s) => Object.entries(s.conc).forEach(([k, v]) => { const a = (agg[k] = agg[k] || { name: v.name, lesson: v.lesson, ok: 0, total: 0, who: 0 }); a.ok += v.ok; a.total += v.total; a.who++; }));
  return Object.values(agg).filter((a) => a.total).sort((a, b) => a.ok / a.total - b.ok / b.total).slice(0, 10).map((a, i) => { const v = pct(a.ok, a.total) ?? 0; return { rk: String(i + 1), nm: a.name, sub: `${LESSON_LIST.find((l) => l.id === a.lesson)?.no ?? ''}차시 · ${a.ok}/${a.total} · ${a.who}명`, pc: `${v}%`, bar: v / 100 }; });
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
    rows.push([...(withX ? ['구분'] : []), '반', '번호', '이름', '세특 초안']);
    v.memos.forEach((m) => rows.push([...(withX ? [m.s.x ? '🧪' : ''] : []), m.s.cls, m.s.n, m.s.name, m.text]));
  } else if (v.bars) {
    rows.push(['주', ...v.bars.map((b) => b.title)]);
    (v.bars[0]?.labels ?? []).forEach((l, i) => rows.push([l, ...v.bars!.map((b) => b.vals[i] ?? 0)]));
  }
  if (v.kpis && !v.table) { if (!rows.length) rows.push(['지표', '값', '덧붙임']); v.kpis.forEach((k) => rows.push([k.lab, k.big, k.sub])); }
  return { name: v.title.replace(/ · /g, ' '), rows: rows.length ? rows : [[v.title]] };
}
export const ALL_VIEWS = GROUPS.flatMap((g) => g.views.map((x) => x[0]));
