// 🧪 수업 탭에서 테스트 열기 (📜 2026-11-17 #21): 고른 차시 그대로 → ① 🧪 테스트 → ② 같은 차시 → ③ 📱 리모컨만 · 🤖 봇 0 → 열기 → 확인
//   (옛 「🧪 테스트로 열기」 칩 = 고른 반으로 테스트 → 지금은 테스트 반(우리 학교 1-6)으로만 · 실제 반 학생은 못 들어옴)
exports.testOpen = async (t, opt = {}) => {
  const no = opt.no ?? (await t.$eval('.pk3 .pk[aria-pressed="true"]', (e) => e.dataset.no).catch(() => null));
  await t.click('[data-cls="test"]'); await t.waitForTimeout(100);
  await t.click(no ? `.pk3 [data-no="${no}"]` : '.pk3 .pk:not(.add)');
  await t.click(`[data-mode="${opt.mode || 'remote'}"]`);
  for (let i = 0; i < 8 && (await t.textContent('[data-k="bot-n"]')).trim() !== `${opt.bots ?? 0}명`; i++) await t.click('[aria-label="봇 줄이기"]');
  await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]');
};
