// 📋 📜 11/24 출정 새 화면 공용 길: 👥 팀 참가(기본 탭) / ➕ 팀 모집 탭(지도 → 「➕ n차시 팀 모집」 → 시트 → 올리기) / 혼자 도전
const postTeam = async (p, no, wait = 1800) => { await p.click('[data-k="board-tab-make"]'); await p.click(`[data-map="${no}"]`); await p.click(`button:has-text("${no}차시 팀 모집")`); await p.waitForSelector('.sheet .act .btn'); await p.click('.sheet .act .btn'); await p.waitForTimeout(wait); };
const joinTab = async (p) => { if (await p.$('[data-k="board-tab-join"][aria-selected="false"]')) await p.click('[data-k="board-tab-join"]'); };
const joinGo = async (p, timeout = 15000) => { await joinTab(p); await p.waitForSelector('[data-k="board-join-go"]', { timeout }); await p.click('[data-k="board-join-go"]'); };
const soloGo = async (p, no) => { await p.click('[data-k="board-tab-make"]'); await p.click(`[data-map="${no}"]`); await p.click('[data-k="board-solo"]'); await p.waitForSelector('[data-k="hero-sheet"]'); await p.click('[data-k="hero-sheet-go"]'); };
module.exports = { postTeam, joinTab, joinGo, soloGo };
