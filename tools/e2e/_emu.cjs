// 🔐 #163-① 에뮬레이터 시험 도우미: 좁힌 규칙에서 교사 폰 = admins/{uid} · TV = rooms/{방}/hosts/{uid} = 종합실 키
//   (실제로는 교사가 「나」 탭에서 비번 로그인 · TV 는 키를 침 — 시험은 owner 로 넣고 새로 고침)
const NS = 'demo-citadel-test-default-rtdb', DBU = 'http://127.0.0.1:9000';
const rest = (path, method = 'GET', body) => fetch(`${DBU}/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
async function uidOf(p) { for (let i = 0; i < 40; i++) { const u = await p.evaluate(() => (window.__uid ? window.__uid() : null)).catch(() => null); if (u) return u; await p.waitForTimeout(250); } return null; }
/** 이 폰 = 교사 (admins/{uid}) → 새로 고침 */
async function asAdmin(p, sel) { const u = await uidOf(p); await rest(`admins/${u}`, 'PUT', true); await p.reload(); if (sel) await p.waitForSelector(sel, { timeout: 20000 }); return u; }
/** 이 TV = 그 방 hosts (종합실 키 = secrets) */
async function asHost(p, code) { const u = await uidOf(p), key = await rest(`secrets/${code}/hallKey`); await rest(`rooms/${code}/hosts/${u}`, 'PUT', key); await p.waitForTimeout(300); const k = await p.$('.kin'); if (k) { await k.fill(String(key)); await p.click('.kgo'); await p.waitForTimeout(1500); } return u; }
module.exports = { rest, uidOf, asAdmin, asHost };
