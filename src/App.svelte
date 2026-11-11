<script lang="ts">
  import type { LessonPack } from './model/types';
  import packJson from './packs/set-06-m1.json';
  import { validate } from './engine/lessons';
  import { deviceStore } from './store/device';
  import { BUILD } from './build';
  import Hall from './ui/Hall.svelte';
  import Student from './ui/Student.svelte';

  const L = packJson as LessonPack;
  const errs = validate(L);
  const q = new URLSearchParams(location.search);
  const role = q.get('role');
  const code = (q.get('room') || 'TEST').toUpperCase();
  const mid = 'm1';
  const S = deviceStore();

  // 학생 탭마다 따로인 이름표 (탭을 닫으면 사라짐)
  function tabId(): { uid: string; num: number } {
    try {
      const saved = sessionStorage.getItem('citadel-v1-tab');
      if (saved) return JSON.parse(saved) as { uid: string; num: number };
    } catch { /* 무시 */ }
    const taken = Object.values(S.get<Record<string, { num: number }>>(`rooms/${code}/players`) || {}).map((p) => p.num);
    let num = 1;
    while (taken.includes(num)) num++;
    const me = { uid: `u${Math.random().toString(36).slice(2, 9)}`, num };
    try { sessionStorage.setItem('citadel-v1-tab', JSON.stringify(me)); } catch { /* 무시 */ }
    return me;
  }
  const me = role === 'student' ? tabId() : null;
</script>

<div class="beta">BETA · {BUILD} · 테스트 버전 (서버에 닿지 않음 · 이 기기 저장)</div>
<main>
  {#if errs.length}
    <p class="err">차시 팩 오류: {errs.join(' · ')}</p>
  {:else if role === 'hall'}
    <Hall {S} {L} {code} {mid} />
  {:else if role === 'student' && me}
    <Student {S} {L} {code} {mid} uid={me.uid} num={me.num} />
  {:else}
    <section class="home">
      <h1>모두의 던전 v1.0 테스트</h1>
      <p>첫 한 바퀴: {L.no}차시 {L.monsters[mid]?.title} · 같은 브라우저에서 탭 두 개</p>
      <p><a class="big" href="?role=hall&room={code}" target="_blank">🖥 탭 A · 종합실 열기</a></p>
      <p><a class="big" href="?role=student&room={code}" target="_blank">📱 탭 B · 학생 폰 열기</a></p>
      <p class="sub">학생 탭을 더 열면 인원이 늘고 체력도 커져요.</p>
    </section>
  {/if}
</main>

<style>
  :global(:root) {
    --bg: #f6f4ef; --fg: #1d1b18; --sub: #6b665d; --card: #ffffff; --muted: #ddd8cc; --accent: #7a3fd1; --hp: #d64545; --band: #f2c94c;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) {
      --bg: #17161a; --fg: #ece9e3; --sub: #a59f94; --card: #23212a; --muted: #3a3742; --accent: #b48cff; --hp: #ef6a6a; --band: #8a6d12;
      color-scheme: dark;
    }
  }
  :global(body) { margin: 0; background: var(--bg); color: var(--fg); font-family: system-ui, 'Noto Sans KR', sans-serif; }
  :global(button) { cursor: pointer; border-radius: 10px; border: 1px solid var(--muted); background: var(--card); color: var(--fg); padding: 8px 14px; }
  :global(a) { color: var(--accent); }
  .beta { background: var(--band); color: var(--fg); text-align: center; font-weight: 700; padding: 4px 8px; font-size: 0.85rem; }
  main { padding: 16px; }
  .home { max-width: 480px; margin: 0 auto; text-align: center; }
  .big { display: block; padding: 14px; border: 2px solid var(--accent); border-radius: 12px; text-decoration: none; font-weight: 700; }
  .sub { color: var(--sub); }
  .err { color: var(--hp); }
</style>
