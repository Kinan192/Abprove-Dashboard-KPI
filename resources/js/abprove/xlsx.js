const RS = 'RS Awal Bros Botania';
export const XL = (() => {
    const CRC = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++)
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })();
    const crc32 = (b) => {
        let c = 0xffffffff;
        for (let k = 0; k < b.length; k++)
            c = CRC[(c ^ b[k]) & 255] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    };
    const enc = new TextEncoder();
    function zip(files) {
        const d = new Date(),
            dt =
                ((d.getHours() << 11) |
                    (d.getMinutes() << 5) |
                    (d.getSeconds() >> 1)) &
                0xffff,
            dd =
                (((d.getFullYear() - 1980) << 9) |
                    ((d.getMonth() + 1) << 5) |
                    d.getDate()) &
                0xffff;
        const parts = [],
            cen = [];
        let off = 0;
        files.forEach(([name, txt]) => {
            const nb = enc.encode(name),
                data = enc.encode(txt),
                c = crc32(data);
            const h = new DataView(new ArrayBuffer(30));
            h.setUint32(0, 0x04034b50, true);
            h.setUint16(4, 20, true);
            h.setUint16(6, 0x0800, true);
            h.setUint16(8, 0, true);
            h.setUint16(10, dt, true);
            h.setUint16(12, dd, true);
            h.setUint32(14, c, true);
            h.setUint32(18, data.length, true);
            h.setUint32(22, data.length, true);
            h.setUint16(26, nb.length, true);
            h.setUint16(28, 0, true);
            parts.push(new Uint8Array(h.buffer), nb, data);
            const z = new DataView(new ArrayBuffer(46));
            z.setUint32(0, 0x02014b50, true);
            z.setUint16(4, 20, true);
            z.setUint16(6, 20, true);
            z.setUint16(8, 0x0800, true);
            z.setUint16(10, 0, true);
            z.setUint16(12, dt, true);
            z.setUint16(14, dd, true);
            z.setUint32(16, c, true);
            z.setUint32(20, data.length, true);
            z.setUint32(24, data.length, true);
            z.setUint16(28, nb.length, true);
            z.setUint32(42, off, true);
            cen.push(new Uint8Array(z.buffer), nb);
            off += 30 + nb.length + data.length;
        });
        const cs = cen.reduce((a, b) => a + b.length, 0),
            e = new DataView(new ArrayBuffer(22));
        e.setUint32(0, 0x06054b50, true);
        e.setUint16(8, files.length, true);
        e.setUint16(10, files.length, true);
        e.setUint32(12, cs, true);
        e.setUint32(16, off, true);
        const all = [...parts, ...cen, new Uint8Array(e.buffer)],
            out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
        let p = 0;
        all.forEach((b) => {
            out.set(b, p);
            p += b.length;
        });
        return out;
    }
    const x = (s) =>
        String(s ?? '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
            .replace(
                /[&<>"]/g,
                (c) =>
                    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[
                        c
                    ],
            );
    const col = (n) => {
        let s = '';
        n++;
        while (n) {
            const r = (n - 1) % 26;
            s = String.fromCharCode(65 + r) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    };
    // Gaya sel (indeks cellXfs)
    const ST = {
        def: 0,
        title: 1,
        muted: 2,
        head: 3,
        txt: 4,
        num: 5,
        pct: 6,
        totL: 7,
        totV: 8,
        totT: 9,
        stat: 10,
        dec: 11,
        lbl: 12,
        fill: 13,
        txtC: 14,
        headL: 15,
        totP: 16,
        /** Text number format (@): typed values such as NIP keep leading zeros. */
        text: 17,
    };
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF064E3B"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF4A5262"/><name val="Calibri"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF064E3B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3F2EC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF8DB"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCBD2CC"/></left><right style="thin"><color rgb="FFCBD2CC"/></right><top style="thin"><color rgb="FFCBD2CC"/></top><bottom style="thin"><color rgb="FFCBD2CC"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="18">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="9" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="2" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="1" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="9" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
    // cell: {v, s, f}  v: number|string|null, f: formula (tanpa "=")
    function cellXml(ref, c) {
        if (c == null) return '';
        if (typeof c !== 'object') c = { v: c };
        const s = c.s ? ` s="${c.s}"` : '';
        if (c.f != null) {
            if (typeof c.v === 'number')
                return `<c r="${ref}"${s}><f>${x(c.f)}</f><v>${c.v}</v></c>`;
            return `<c r="${ref}"${s} t="str"><f>${x(c.f)}</f><v>${x(c.v ?? '')}</v></c>`;
        }
        if (c.v == null || c.v === '') return c.s ? `<c r="${ref}"${s}/>` : '';
        if (typeof c.v === 'number')
            return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
        return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${x(c.v)}</t></is></c>`;
    }
    function sheetXml(sh, first) {
        const rows = sh.rows
            .map((r, ri) => {
                if (!r) return '';
                const h = sh.heights && sh.heights[ri];
                return `<row r="${ri + 1}"${h ? ` ht="${h}" customHeight="1"` : ''}>${r.map((c, ci) => cellXml(col(ci) + (ri + 1), c)).join('')}</row>`;
            })
            .join('');
        const fz = sh.freeze
            ? `<pane xSplit="${sh.freeze[0]}" ySplit="${sh.freeze[1]}" topLeftCell="${col(sh.freeze[0]) + (sh.freeze[1] + 1)}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/>`
            : '';
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" zoomScale="100"${first ? ' tabSelected="1"' : ''} showGridLines="0">${fz}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${sh.cols.map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
    }
    /** `title` is the document property; it defaults to a neutral name instead of a fixed year. */
    function build(sheets, { title = 'Penilaian KPI' } = {}) {
        const used = new Set();
        sheets.forEach((sh) => {
            let n =
                String(sh.name)
                    .replace(/[\[\]:*?\/\\]/g, ' ')
                    .replace(/^'+|'+$/g, '')
                    .trim()
                    .slice(0, 31) || 'Sheet';
            let b = n,
                k = 2;
            while (used.has(n.toLowerCase())) {
                const suf = ' (' + k++ + ')';
                n = b.slice(0, 31 - suf.length) + suf;
            }
            used.add(n.toLowerCase());
            sh.name = n;
        });
        const files = [
            [
                '[Content_Types].xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, k) => `<Override PartName="/xl/worksheets/sheet${k + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
            ],
            [
                '_rels/.rels',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
            ],
            [
                'docProps/core.xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(title)}</dc:title><dc:creator>ABprove · KPI Kinerja ${x(RS)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`,
            ],
            [
                'xl/workbook.xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, k) => `<sheet name="${x(s.name)}" sheetId="${k + 1}" r:id="rId${k + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
            ],
            [
                'xl/_rels/workbook.xml.rels',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, k) => `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${k + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
            ],
            ['xl/styles.xml', styles],
            ...sheets.map((s, k) => [
                `xl/worksheets/sheet${k + 1}.xml`,
                sheetXml(s, k === 0),
            ]),
        ];
        return zip(files);
    }
    return { build, col, ST };
})();
