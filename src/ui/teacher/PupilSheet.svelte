<script lang="ts">
  import type { Store } from '../../model/types';
  import { achieve, band, LESSON_LIST, MIS, memoOf, type Stud } from '../../school/dash';
  import { resetPw, hasAccount, liveOfCls } from '../../school/school';
  import { giveGift, setAbsent } from '../../raid/actions';
  import { uidOf } from '../../school/school';

  // 👤 학생 한 명 시트 (#124 ⑯ · DECISIONS 「👤 학생 한 명 시트」) — 학생 탭 명단 · 대시보드 어디서 이름을 눌러도 같은 부품
  //   위에서 64 아래까지 덮음 · ✕ / 네 숫자 카드(통과율 · 성취도 · 수업 참여 · 방과후 접속) → 수업 기록 차시 칸 → 방과후 2주 달력 → 💎 · 📜 · 자주 막힌 개념 → 🔑 · 💎 선물 · 🚫 결석 · 📝 세특 초안
  const { S, s, onclose }: { S: Store; s: Stud; onclose: () => void } = $props();
  const a = $derived(achieve(s));
  const days = $derived(s.extra.days.filter(Boolean).length);
  const live = $derived(liveOfCls(S, s.cls));
  let toast = $state(''), memo = $state(false), gift = $state(false), amt = $state(10);
  const say = (t: string) => { toast = t; setTimeout(() => (toast = ''), 1800); };
  const mark = (id: string) => { const r = s.rec[id]; if (!r) return { t: '불참', c: 'no' }; const ok = r.boss / r.bossN; return { t: `${ok >= 0.8 ? '✔' : ok >= 0.5 ? '△' : '✘'} ${r.boss}/${r.bossN}`, c: ok >= 0.8 ? 'ok' : ok >= 0.5 ? 'mid' : 'bad' }; };
  const misTop = $derived(Object.entries(s.mis).sort((x, y) => y[1][0] - x[1][0]).slice(0, 2));
  const weak = $derived(Object.values(s.conc).filter((c) => c.total && c.ok / c.total < 0.6).sort((x, y) => x.ok / x.total - y.ok / y.total).slice(0, 2));
  async function copy(t: string) { try { await navigator.clipboard.writeText(t); say('📋 복사했어요'); } catch { say('복사가 막혔어요 · 길게 눌러 복사'); } }
</script>

<div class="bg" role="presentation" onclick={onclose}></div>
<div class="ps" role="dialog" aria-modal="true" aria-label="{s.n}번 {s.name}">
  <div class="hd"><b>{s.n}번 {s.name}</b><small>{s.cls}반 · Lv.{s.lv}{s.x ? ' · 🧪 통계 빠짐' : ''}</small><button type="button" class="x" aria-label="닫기" onclick={onclose}>✕</button></div>
  <div class="body">
    <div class="four">
      <div><small>통과율</small><b>{s.boss ?? '-'}{s.boss != null ? '%' : ''}</b><em>형성평가 · 첫 시도</em></div>
      <div><small>성취도</small><b>{a ?? '-'}{a != null ? '%' : ''}</b><em>성취기준 {Object.keys(s.std).length}개 평균 · {band(a) || '-'}</em></div>
      <div><small>수업 참여</small><b>{s.went} <i>/ {s.heldN}차시</i></b><em>불참 {s.heldN - s.went} · 제출률 {s.extra.submit}%</em></div>
      <div><small>방과후 접속</small><b>{days}일 <i>/ 2주</i></b><em>풀이 {s.extra.solves}회 · 오답 고침 {s.extra.fixes}</em></div>
    </div>
    <p class="lab">수업 기록</p>
    <div class="recs">
      {#each LESSON_LIST.filter((l) => l.no <= 7) as l (l.id)}
        {@const m = mark(l.id)}
        <span class="rc {m.c}"><small>{l.no}차시</small><b>{m.t}</b>{#if s.rec[l.id]?.star}<i>⭐</i>{/if}{#if s.rec[l.id]?.fixedBy}<i>→ ■</i>{/if}</span>
      {/each}
    </div>
    <p class="lab">방과후 · 최근 2주</p>
    <div class="cal" aria-label="방과후 접속 달력">{#each s.extra.days as d, k (k)}<i class="l{Math.min(4, d)}" title="{d}회"></i>{/each}</div>
    <div class="row3">
      <div><small>💎 마정석</small><b>{s.extra.gem}</b><em>이번 주 +{s.extra.gemWeek}</em></div>
      <div><small>📜 서술 조각</small><b>{s.extra.scroll}</b><em>📷 통과 {s.extra.photoOk} · 다시 {s.extra.photoRe}</em></div>
      <div><small>자주 막힌 개념</small><b class="sm">{weak.map((w) => w.name).join(' · ') || '없음'}</b><em>{misTop.map(([k]) => k).join(' · ') || '오개념 없음'}</em></div>
    </div>
    {#if misTop.length}<p class="mis">🔎 {misTop.map(([k, v]) => `${k} ${MIS[k]} (${v[0]}번)`).join(' · ')}</p>{/if}
    <p class="fake">🧪 테스트 판 가짜 기록 (반 · 번호로 늘 같은 값)</p>
  </div>
  <div class="acts">
    <button type="button" disabled={!hasAccount(S, s.cls, s.n)} onclick={() => { resetPw(S, s.cls, s.n); say('🔑 비밀번호를 0000 으로 바꿨어요'); }}>🔑 0000</button>
    <button type="button" onclick={() => (gift = true)}>💎 선물</button>
    <button type="button" disabled={!live} title={live ? '' : '수업 중에만'} onclick={() => { if (live) { setAbsent(S, live.code, uidOf(s.cls, s.n), true); say('🚫 오늘 결석으로'); } }}>🚫 결석</button>
    <button type="button" onclick={() => (memo = true)}>📝 세특</button>
  </div>
  {#if gift}
    <div class="pop"><b>💎 {s.name}에게 선물</b><div class="amt">{#each [5, 10, 20, 50] as v (v)}<button type="button" class:on={amt === v} onclick={() => (amt = v)}>{v}</button>{/each}</div>
      <div class="row"><button type="button" class="b2" onclick={() => (gift = false)}>취소</button><button type="button" class="b1" onclick={() => { giveGift(S, live?.code ?? 'teacher', [uidOf(s.cls, s.n)], amt); gift = false; say(`🎁 💎 ${amt} 보냈어요`); }}>보내기</button></div></div>
  {/if}
  {#if memo}
    <div class="pop"><b>📝 세특 초안 · {s.name}</b><p class="memo">{memoOf(s)}</p>
      <div class="row"><button type="button" class="b2" onclick={() => (memo = false)}>닫기</button><button type="button" class="b1" onclick={() => copy(memoOf(s))}>📋 복사</button></div></div>
  {/if}
  {#if toast}<p class="toast" role="status">{toast}</p>{/if}
</div>

<style>
  .bg { position: absolute; inset: 0; z-index: 30; background: rgba(0, 0, 0, 0.5); }
  .ps { position: absolute; left: 0; right: 0; top: 64px; bottom: 0; z-index: 31; background: var(--surface); border-radius: var(--r-lg) var(--r-lg) 0 0; display: flex; flex-direction: column; box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.55); }
  .hd { display: flex; align-items: baseline; gap: var(--s2); padding: var(--s3) var(--s3) var(--s2) var(--s4); }
  .hd b { font-size: 19px; } .hd small { flex: 1; color: var(--text-2); font-size: 13px; }
  .x { width: var(--tap); height: var(--tap); border: 0; background: none; color: var(--text-2); font-size: 18px; align-self: center; }
  .body { flex: 1; min-height: 0; overflow: auto; padding: 0 var(--s4) var(--s3); display: flex; flex-direction: column; gap: var(--s2); }
  .four { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .four div, .row3 div { border-radius: var(--r); background: var(--surface-2); padding: 8px 10px; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .four small, .row3 small { font-size: 12px; color: var(--text-2); font-weight: 700; }
  .four b { font-size: 24px; color: var(--accent); } .four b i { font-style: normal; font-size: 13px; color: var(--text-2); }
  .four em, .row3 em { font-style: normal; font-size: 11.5px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lab { margin: 4px 0 0; font-size: 13px; font-weight: 700; color: var(--text-2); }
  .recs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
  .rc { position: relative; border-radius: 9px; padding: 4px 6px; background: var(--surface-2); border: 1px solid var(--line); display: flex; flex-direction: column; }
  .rc small { font-size: 11px; color: var(--text-3); } .rc b { font-size: 13px; } .rc i { position: absolute; right: 4px; top: 3px; font-style: normal; font-size: 11px; }
  .rc.ok b { color: var(--ok); } .rc.mid b { color: #f0a24a; } .rc.bad b { color: var(--bad); } .rc.no { opacity: 0.55; }
  .cal { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 3px; }
  .cal i { height: 18px; border-radius: 4px; background: var(--surface-2); }
  .cal i.l1 { background: color-mix(in srgb, var(--ok) 30%, var(--surface-2)); } .cal i.l2 { background: color-mix(in srgb, var(--ok) 55%, var(--surface-2)); } .cal i.l3 { background: color-mix(in srgb, var(--ok) 80%, var(--surface-2)); } .cal i.l4 { background: var(--ok); }
  .row3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .row3 b { font-size: 18px; } .row3 b.sm { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mis { margin: 0; font-size: 12.5px; color: var(--text-2); }
  .fake { margin: 0; font-size: 11.5px; color: var(--text-3); }
  .acts { flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: var(--s2) var(--s4) calc(var(--s3) + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--line); }
  .acts button { height: 48px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 13px var(--font); }
  .acts button:disabled { opacity: 0.4; }
  .pop { position: absolute; left: var(--s4); right: var(--s4); bottom: 80px; z-index: 2; background: var(--bg); border: 1px solid var(--line); border-radius: var(--r-lg); padding: var(--s3); display: flex; flex-direction: column; gap: var(--s2); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6); }
  .memo { margin: 0; font-size: 14px; line-height: 1.6; }
  .amt { display: flex; gap: 6px; } .amt button { flex: 1; height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); font: 700 15px var(--font); } .amt button.on { background: var(--accent); color: var(--on-accent); }
  .row { display: flex; gap: var(--s2); } .b1 { flex: 1; height: 48px; border: 0; border-radius: 12px; background: var(--accent); color: var(--on-accent); font: 700 16px var(--font); } .b2 { width: 88px; height: 48px; border-radius: 12px; border: 1px solid var(--line); background: none; color: var(--text); font: 700 14px var(--font); }
  .toast { position: absolute; left: var(--s4); right: var(--s4); top: 56px; margin: 0; z-index: 3; padding: var(--s2); border-radius: var(--r); background: var(--surface-2); text-align: center; font-weight: 700; font-size: 14px; }
</style>
