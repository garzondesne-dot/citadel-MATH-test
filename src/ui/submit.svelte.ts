// 📝 제출 모드 v2 = 학습지 꼴 (📜 2026-11-14 선생님 「게임 느낌 아예 지우고 제출 모드도 테마처럼 · 배경색 한 가지로 고정 · 딱 봐도 학습지」 · DECISIONS 「📝 제출 모드 v2」)
//   켜는 법 = 테마처럼: ⚙ 설정 테마 줄 「제출」 + 위 막대 「게임 | 제출」 · 이 기기(학생 폰)에 기억 · 진행은 그대로
//   바뀌는 것 = 학생 폰 겉모습만(바탕 #f7f6f1 + 공책 줄 · 그림 · 효과 · 소리 · 이모지 · 아이콘 없음 · 명조 문제 · 파란 펜 답 · 빨간 펜 채점)
//   바뀌지 않는 것 = 문제 · 채점 · 기회 4 · 데미지 · 기록 · 💎 · EXP · 전리품(뒤에서 그대로 쌓임 · 화면 알림 없음) · 교실 TV(용사 그대로) · 교사 폰
const KEY = 'citadel-v1-submit';
const load = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const submit = $state<{ on: boolean; screen: boolean }>({ on: typeof localStorage !== 'undefined' ? load() : false, screen: false });
/** 학생 화면(첫 화면 · 캠프 · 수업)에서만 겉모습을 바꿈 — 교사 폰 · TV 는 언제나 게임 꼴 */
export function submitScreen(on: boolean): void { submit.screen = on; apply(); }
export function setSubmit(on: boolean): void { submit.on = on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* 사생활 창 */ } apply(); }
/** 지금 학생 화면이 제출 모드로 보이는가 */
export const paperOn = () => submit.on && submit.screen;
// 글자만: 제출 모드 동안 화면의 글자 마디에서 이모지를 뺌(원래 글은 기억해 두었다가 게임 모드로 오면 되돌림 · 화면을 다시 그려도 다시 뺌)
const EP = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/u;
/** 그림 글자인가 — 수학 화살표 · 기호(↔ ⇒ ∪ …) · 채점 표시(✓ ✗) 는 글자로 남김 */
const isPic = (c: string) => { const cp = c.codePointAt(0) ?? 0; return EP.test(c) && !(cp >= 0x2190 && cp <= 0x22ff) && !(cp >= 0x2713 && cp <= 0x2717) && cp !== 0x25cb; };
const dropPic = (t: string) => Array.from(t).map((c) => (isPic(c) ? '\u0000' : c)).join('').replace(/\u0000+\s?/g, '');
const PIC = { test: (t: string) => Array.from(t).some(isPic) };
const orig = new Map<Text, string>(); let mo: MutationObserver | null = null;
const strip = (n: Node) => {
  if (n.nodeType === 3) { const t = n as Text; if (PIC.test(t.data)) { orig.set(t, t.data); t.data = dropPic(t.data); } return; }
  if (n.nodeType !== 1 || (n as Element).closest?.('[data-keep-emoji]')) return;
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); let c: Node | null; const list: Text[] = [];
  while ((c = w.nextNode())) list.push(c as Text);
  list.forEach((t) => strip(t));
};
function apply(): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  if (paperOn()) {
    r.dataset.submit = '1';
    if (!mo && document.body) { strip(document.body); mo = new MutationObserver((ms) => ms.forEach((m) => { if (m.type === 'characterData') strip(m.target); else m.addedNodes.forEach(strip); })); mo.observe(document.body, { subtree: true, childList: true, characterData: true }); }
  } else {
    delete r.dataset.submit; mo?.disconnect(); mo = null;
    orig.forEach((v, t) => { if (t.isConnected) t.data = v; }); orig.clear();
  }
}
if (typeof document !== 'undefined' && document.readyState !== 'loading') queueMicrotask(apply);
/** 이모지 · 그림 글자 빼기 (제출 모드 = 글자만) */
export const plain = (t: string) => dropPic(t || '').replace(/\s{2,}/g, ' ').trim();
/** 단추 글자: 제출 모드면 「공격」 → 「제출」 (게임 모드 = 그대로) */
export const pw = (t: string) => (paperOn() ? plain(t.replace(/공격/g, '제출')) : t);
