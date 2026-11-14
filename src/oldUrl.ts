// 🔗 옛 정식 주소 이어 주기 (📜 2026-11-14 출시 막는 것 8): 인쇄 QR · 북마크 · 홈 화면 바로 가기가 정식 꼴 그대로 와도 열리게
//   학생 ?role=student&code=X → ?role=student&room=X (같은 수업)
//   TV   ?role=hall&code=X&key=Y → 키는 메모리로만 받고 주소에서 곧바로 지움(기록 · 북마크에 남지 않게) → Hall 이 「코드로 들어가기」에 채워 한 번 등록
//   &local(정식 이 기기 표시) = 지움
export const oldHall: { code: string; key: string } | null = (() => {
  if (typeof location === 'undefined' || typeof history === 'undefined') return null;
  const q = new URLSearchParams(location.search), role = q.get('role'), code = (q.get('code') || '').trim(), key = (q.get('key') || '').trim();
  if (!code && !key && !q.has('local')) return null;
  let hall: { code: string; key: string } | null = null;
  if (role === 'student' && code && !q.get('room')) q.set('room', code);
  if (role === 'hall' && /^\d{6}$/.test(code) && /^\d{4}$/.test(key)) hall = { code, key };
  q.delete('code'); q.delete('key'); q.delete('local');
  const s = q.toString();
  try { history.replaceState(history.state, '', `${location.pathname}${s ? `?${s}` : ''}${location.hash}`); } catch { /* 무시 */ }
  return hall;
})();
