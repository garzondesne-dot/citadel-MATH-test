import { strToU8, zipSync } from 'fflate';

// ⬇ 엑셀 파일 만들기 (#125) — 기기 안에서 바로 (서버로 안 보냄) · 숫자는 숫자로 · % 는 0.78 + 서식 · 첫 행 고정 · 열 너비 맞춤
//   셀 값: number = 숫자 · { pct: 0.78 } = 퍼센트 서식 · string = 글
export type Cell = string | number | null | { pct: number };
export interface SheetData { name: string; rows: Cell[][] }
// 📄 표준 꼴 (#54 「다른 AI · 파이썬(openpyxl · pandas) · LibreOffice 가 못 읽음」): 글 = 공유 문자열(sharedStrings) · 기본 셀 서식(Normal) · 문서 속성(docProps)
//   XML 에 못 쓰는 제어 글자 지움 · 숫자가 NaN · 무한대면 빈 칸 · 시트 범위(dimension) · 시트 이름 31자 · 금지 글자 없음
const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const esc = (s: string) => s.replace(XML_BAD, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const col = (i: number) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const width = (c: Cell) => (c == null ? 0 : typeof c === 'object' ? 6 : [...String(c)].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 2 : 1), 0));
const safeName = (n: string, used: Set<string>) => { let b = n.replace(XML_BAD, '').replace(/[\\/?*[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Sheet'; let k = 2; const base = b; while (used.has(b.toLowerCase())) b = `${base.slice(0, 28)} ${k++}`; used.add(b.toLowerCase()); return b; };
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
function sheetXml(rows: Cell[][], sst: (t: string) => number): string {
  const ncol = Math.max(1, ...rows.map((r) => r.length));
  const widths = Array.from({ length: ncol }, (_, c) => Math.min(60, Math.max(6, ...rows.map((r) => width(r[c] ?? null))) + 2));
  const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => {
    const ref = `${col(ci)}${ri + 1}`, head = ri === 0 ? ' s="1"' : '';
    if (c == null || c === '') return '';
    if (typeof c === 'number') return Number.isFinite(c) ? `<c r="${ref}"${head}><v>${c}</v></c>` : '';
    if (typeof c === 'object') return Number.isFinite(c.pct) ? `<c r="${ref}" s="2"><v>${c.pct}</v></c>` : '';
    const t = String(c).replace(XML_BAD, ''); if (!t) return '';
    return `<c r="${ref}" t="s"${head}><v>${sst(t)}</v></c>`;
  }).join('')}</row>`).join('');
  const dim = `A1:${col(ncol - 1)}${Math.max(1, rows.length)}`;
  return `${HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="${dim}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
}
/** 여러 시트 → .xlsx 바이트 (표준 OOXML · Excel · 구글 시트 · 한셀 · LibreOffice · openpyxl · pandas) */
export function makeXlsx(sheets: SheetData[]): Uint8Array {
  if (!sheets.length) sheets = [{ name: 'Sheet', rows: [[]] }];
  const used = new Set<string>(), names = sheets.map((s) => safeName(s.name, used));
  const strs: string[] = [], idx = new Map<string, number>(); let refs = 0;
  const sst = (t: string) => { refs++; let i = idx.get(t); if (i == null) { i = strs.length; strs.push(t); idx.set(t, i); } return i; };
  const sheetFiles = sheets.map((s) => sheetXml(s.rows, sst));
  const N = names.length, now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`),
    '_rels/.rels': strToU8(`${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
    'docProps/core.xml': strToU8(`${HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>dungeon</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`),
    'docProps/app.xml': strToU8(`${HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application></Properties>`),
    'xl/workbook.xml': strToU8(`${HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${N + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId${N + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(`${HEAD}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Malgun Gothic"/><family val="2"/></font><font><b/><sz val="11"/><name val="Malgun Gothic"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0"/></styleSheet>`),
  };
  sheetFiles.forEach((x, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(x); });
  files['xl/sharedStrings.xml'] = strToU8(`${HEAD}<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${refs}" uniqueCount="${strs.length}">${strs.map((t) => `<si><t xml:space="preserve">${esc(t)}</t></si>`).join('')}</sst>`);
  return zipSync(files);
}
/** 받기 (기기 안 · 링크 클릭) */
export function download(bytes: Uint8Array, name: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
