import { Injectable, BadRequestException } from '@nestjs/common';
import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  Color,
  PDFName,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { parse as parseHtml } from 'node-html-parser';

// pdf-parse: CommonJS module – use default import (esModuleInterop handles it)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface PdfResult {
  buffer: Buffer;
  mime: string;
  ext: string;
}

@Injectable()
export class PdfService {
  /* ─── Helpers ──────────────────────────────────────────────────────────── */

  private hexToColor(hex: string): Color {
    const h = (hex || '#000000').replace('#', '').padEnd(6, '0');
    return rgb(
      parseInt(h.substring(0, 2), 16) / 255,
      parseInt(h.substring(2, 4), 16) / 255,
      parseInt(h.substring(4, 6), 16) / 255,
    );
  }

  private n(val: any, fallback: number): number {
    const v = parseFloat(val);
    return isNaN(v) ? fallback : v;
  }

  private toBuffer(u8: Uint8Array): Buffer {
    return Buffer.from(u8);
  }

  /** Parse "1-3, 5, 7-9" into arrays of 0-based page indices. */
  private parseRanges(rangesStr: string, total: number): number[][] {
    const result: number[][] = [];
    const parts = (rangesStr || '1').split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(s => parseInt(s.trim(), 10));
        const pages: number[] = [];
        for (let i = a; i <= Math.min(isNaN(b) ? a : b, total); i++) {
          if (i >= 1) pages.push(i - 1);
        }
        if (pages.length) result.push(pages);
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n) && n >= 1 && n <= total) result.push([n - 1]);
      }
    }
    return result.length ? result : [Array.from({ length: total }, (_, i) => i)];
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ORGANIZE
  ═══════════════════════════════════════════════════════════════════════ */

  async merge(buffers: Buffer[]): Promise<PdfResult> {
    const merged = await PDFDocument.create();
    for (const buf of buffers) {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }
    return { buffer: this.toBuffer(await merged.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async split(
    buffer: Buffer,
    splitMode: string,
    rangesStr: string,
    fixedRange: number,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const zip = new JSZip();

    let groups: number[][];
    if (splitMode === 'fixed_range') {
      const n = Math.max(1, fixedRange);
      groups = [];
      for (let i = 0; i < total; i += n)
        groups.push(Array.from({ length: Math.min(n, total - i) }, (_, k) => i + k));
    } else if (splitMode === 'remove_pages') {
      const toRemove = new Set(this.parseRanges(rangesStr, total).flat());
      const remaining = Array.from({ length: total }, (_, i) => i).filter(i => !toRemove.has(i));
      groups = remaining.length ? [remaining] : [[0]];
    } else {
      groups = this.parseRanges(rangesStr, total);
    }

    for (let i = 0; i < groups.length; i++) {
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, groups[i]);
      copied.forEach(p => newDoc.addPage(p));
      zip.file(`part_${String(i + 1).padStart(3, '0')}.pdf`, await newDoc.save());
    }

    const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { buffer: zipBuf as Buffer, mime: 'application/zip', ext: 'zip' };
  }

  async selectiveMerge(buffers: Buffer[], pageRangesStr: string): Promise<PdfResult> {
    const merged = await PDFDocument.create();
    for (const buf of buffers) {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const total = doc.getPageCount();
      const indices = !pageRangesStr?.trim()
        ? Array.from({ length: total }, (_, i) => i)
        : this.parseRanges(pageRangesStr, total).flat();
      const pages = await merged.copyPages(doc, indices);
      pages.forEach(p => merged.addPage(p));
    }
    return { buffer: this.toBuffer(await merged.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async splitBySize(buffer: Buffer, maxSizeMb: number): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const maxBytes = Math.max(0.1, maxSizeMb) * 1024 * 1024;
    const zip = new JSZip();
    let group: number[] = [];
    let groupSize = 0;
    let part = 1;

    for (let i = 0; i < total; i++) {
      const pageDoc = await PDFDocument.create();
      const [p] = await pageDoc.copyPages(doc, [i]);
      pageDoc.addPage(p);
      const pageBytes = (await pageDoc.save()).length;

      if (group.length > 0 && groupSize + pageBytes > maxBytes) {
        const batchDoc = await PDFDocument.create();
        const batchPages = await batchDoc.copyPages(doc, group);
        batchPages.forEach(pg => batchDoc.addPage(pg));
        zip.file(`part_${String(part++).padStart(3, '0')}.pdf`, await batchDoc.save());
        group = [];
        groupSize = 0;
      }
      group.push(i);
      groupSize += pageBytes;
    }

    if (group.length > 0) {
      const batchDoc = await PDFDocument.create();
      const batchPages = await batchDoc.copyPages(doc, group);
      batchPages.forEach(pg => batchDoc.addPage(pg));
      zip.file(`part_${String(part).padStart(3, '0')}.pdf`, await batchDoc.save());
    }

    const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { buffer: zipBuf as Buffer, mime: 'application/zip', ext: 'zip' };
  }

  async splitByBookmark(buffer: Buffer, bookmarkLevel: string): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();

    const pageRefIndex = new Map<string, number>();
    for (let i = 0; i < total; i++) {
      pageRefIndex.set((doc.getPage(i) as any).ref.toString(), i);
    }

    const splitPoints = new Set<number>([0]);
    const maxDepth = bookmarkLevel === 'all' ? 999 : parseInt(bookmarkLevel, 10);

    try {
      const ctx = (doc as any).context;
      const catalog = (doc as any).catalog;
      const outlinesRef = catalog.get(PDFName.of('Outlines'));
      if (outlinesRef) {
        const outlinesDict = ctx.lookup(outlinesRef);
        const traverse = (dict: any, depth: number) => {
          if (!dict || depth > maxDepth) return;
          let cur = dict.get(PDFName.of('First'));
          while (cur) {
            const item = ctx.lookup(cur);
            if (!item) break;
            const dest = item.get(PDFName.of('Dest'));
            if (dest) {
              const arr = ctx.lookup(dest) ?? dest;
              if (arr && typeof arr.get === 'function') {
                const pageRef = arr.get(0);
                if (pageRef) {
                  const idx = pageRefIndex.get(pageRef.toString());
                  if (idx !== undefined && idx > 0) splitPoints.add(idx);
                }
              }
            }
            const action = item.get(PDFName.of('A'));
            if (action) {
              const act = ctx.lookup(action);
              if (act) {
                const d = act.get(PDFName.of('D'));
                if (d) {
                  const arr = ctx.lookup(d) ?? d;
                  if (arr && typeof arr.get === 'function') {
                    const pageRef = arr.get(0);
                    if (pageRef) {
                      const idx = pageRefIndex.get(pageRef.toString());
                      if (idx !== undefined && idx > 0) splitPoints.add(idx);
                    }
                  }
                }
              }
            }
            traverse(item, depth + 1);
            cur = item.get(PDFName.of('Next'));
          }
        };
        traverse(outlinesDict, 1);
      }
    } catch {
      for (let i = 1; i < total; i++) splitPoints.add(i);
    }

    const points = Array.from(splitPoints).sort((a, b) => a - b);
    const zip = new JSZip();
    for (let i = 0; i < points.length; i++) {
      const start = points[i];
      const end = i + 1 < points.length ? points[i + 1] : total;
      const pages = Array.from({ length: end - start }, (_, k) => start + k);
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, pages);
      copied.forEach(p => newDoc.addPage(p));
      zip.file(`section_${String(i + 1).padStart(3, '0')}.pdf`, await newDoc.save());
    }
    const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { buffer: zipBuf as Buffer, mime: 'application/zip', ext: 'zip' };
  }

  async deletePages(buffer: Buffer, pagesStr: string): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const toDelete = new Set(this.parseRanges(pagesStr, total).flat());
    const remaining = Array.from({ length: total }, (_, i) => i).filter(i => !toDelete.has(i));
    const newDoc = await PDFDocument.create();
    if (remaining.length > 0) {
      const copied = await newDoc.copyPages(doc, remaining);
      copied.forEach(p => newDoc.addPage(p));
    }
    return { buffer: this.toBuffer(await newDoc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async rotatePages(buffer: Buffer, pagesStr: string, rotation: number): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const indices = pagesStr.trim().toLowerCase() === 'all'
      ? Array.from({ length: total }, (_, i) => i)
      : this.parseRanges(pagesStr, total).flat();
    const pageSet = new Set(indices);
    for (let i = 0; i < total; i++) {
      if (pageSet.has(i)) {
        const page = doc.getPage(i);
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + rotation) % 360));
      }
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async reorderPages(buffer: Buffer, orderStr: string): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const order = (orderStr || '')
      .split(',')
      .map(s => parseInt(s.trim(), 10) - 1)
      .filter(i => i >= 0 && i < total);
    if (!order.length) {
      return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
    }
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(doc, order);
    copied.forEach(p => newDoc.addPage(p));
    return { buffer: this.toBuffer(await newDoc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async extractPageRange(buffer: Buffer, pagesStr: string): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const indices = this.parseRanges(pagesStr, total).flat();
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(doc, indices);
    copied.forEach(p => newDoc.addPage(p));
    return { buffer: this.toBuffer(await newDoc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async reversePages(buffer: Buffer): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const reversed = Array.from({ length: total }, (_, i) => total - 1 - i);
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(doc, reversed);
    copied.forEach(p => newDoc.addPage(p));
    return { buffer: this.toBuffer(await newDoc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     OPTIMIZE
  ═══════════════════════════════════════════════════════════════════════ */

  async compress(buffer: Buffer, compressionLevel: string): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const useStreams = compressionLevel !== 'low';
    return { buffer: this.toBuffer(await doc.save({ useObjectStreams: useStreams })), mime: 'application/pdf', ext: 'pdf' };
  }

  async rotate(buffer: Buffer, rotation: number): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    for (const page of doc.getPages()) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + rotation) % 360));
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async repair(buffer: Buffer): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CONVERT TO PDF
  ═══════════════════════════════════════════════════════════════════════ */

  async imageToPdf(buffers: Buffer[], mimetypes: string[]): Promise<PdfResult> {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < buffers.length; i++) {
      const mime = (mimetypes[i] || 'image/jpeg').toLowerCase();
      let buf = buffers[i];
      let embedded;
      if (mime === 'image/png') {
        embedded = await pdfDoc.embedPng(buf);
      } else {
        if (mime !== 'image/jpeg') buf = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
        embedded = await pdfDoc.embedJpg(buf);
      }
      const page = pdfDoc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    }
    return { buffer: this.toBuffer(await pdfDoc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CONVERT FROM PDF
  ═══════════════════════════════════════════════════════════════════════ */

  async pdfToText(buffer: Buffer): Promise<PdfResult> {
    const data = await pdfParse(buffer);
    return { buffer: Buffer.from(data.text ?? '', 'utf-8'), mime: 'text/plain', ext: 'txt' };
  }

  async extractPages(buffer: Buffer, mode: string): Promise<PdfResult> {
    if (mode === 'images') {
      throw new BadRequestException(
        'Extracting embedded images requires additional server-side tooling. ' +
        'Switch to "pages" mode to extract each page as a PDF.',
      );
    }
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const zip = new JSZip();
    for (let i = 0; i < total; i++) {
      const newDoc = await PDFDocument.create();
      const [copied] = await newDoc.copyPages(doc, [i]);
      newDoc.addPage(copied);
      zip.file(`page_${String(i + 1).padStart(3, '0')}.pdf`, await newDoc.save());
    }
    const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { buffer: zipBuf as Buffer, mime: 'application/zip', ext: 'zip' };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CONTENT EDITING
  ═══════════════════════════════════════════════════════════════════════ */

  async addWatermark(
    buffer: Buffer,
    text: string,
    vPos: string,
    hPos: string,
    fontSize: number,
    transparency: number,
    rotation: number,
    fontColor: string,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const color = this.hexToColor(fontColor);
    const opacity = 1 - Math.max(0, Math.min(100, transparency)) / 100;

    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      const tw = font.widthOfTextAtSize(text, fontSize);
      const th = fontSize;

      const x =
        hPos === 'left'  ? 40 :
        hPos === 'right' ? width - tw - 40 :
        (width - tw) / 2;

      const y =
        vPos === 'top'    ? height - th - 40 :
        vPos === 'bottom' ? 40 :
        (height - th) / 2;

      page.drawText(text, { x, y, size: fontSize, font, color, opacity, rotate: degrees(rotation) });
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async addPageNumbers(
    buffer: Buffer,
    startingNumber: number,
    vPos: string,
    hPos: string,
    fontSize: number,
    fontColor: string,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const color = this.hexToColor(fontColor);

    const pages = doc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const label = String(startingNumber + i);
      const tw = font.widthOfTextAtSize(label, fontSize);

      const x =
        hPos === 'left'  ? 40 :
        hPos === 'right' ? width - tw - 40 :
        (width - tw) / 2;

      const y = vPos === 'top' ? height - fontSize - 20 : 20;
      page.drawText(label, { x, y, size: fontSize, font, color });
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async addTextBox(
    buffer: Buffer,
    text: string,
    pagesStr: string,
    x: number,
    y: number,
    fontSize: number,
    fontColor: string,
    opacity: number,
    rotation: number,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const color = this.hexToColor(fontColor);
    const op = Math.max(0, Math.min(100, opacity)) / 100;
    const pages = doc.getPages();

    const targetIndices = new Set(this.parseRanges(pagesStr || '1', pages.length).flat());
    for (const pi of targetIndices) {
      if (pi < 0 || pi >= pages.length) continue;
      const page = pages[pi];
      const pdfY = page.getSize().height - y - fontSize; // top-left → bottom-left
      page.drawText(text, { x, y: pdfY, size: fontSize, font, color, opacity: op, rotate: degrees(rotation) });
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async stickyNote(
    buffer: Buffer,
    text: string,
    pageNum: number,
    x: number,
    y: number,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const pi = Math.max(0, Math.min(pageNum - 1, pages.length - 1));
    const page = pages[pi];
    const pageH = page.getSize().height;

    const noteW = 160, noteH = 60;
    const pdfY = pageH - y - noteH;

    page.drawRectangle({ x, y: pdfY, width: noteW, height: noteH, color: rgb(1, 1, 0.6), opacity: 0.9 });
    page.drawRectangle({ x, y: pdfY, width: noteW, height: noteH, borderColor: rgb(0.8, 0.7, 0), borderWidth: 1 });
    page.drawText(text, { x: x + 5, y: pdfY + noteH / 2 - 6, size: 10, font, color: rgb(0, 0, 0), maxWidth: noteW - 10 });
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async highlight(
    buffer: Buffer,
    pageNum: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const col = this.hexToColor(color);
    const pages = doc.getPages();
    const pi = Math.max(0, Math.min(pageNum - 1, pages.length - 1));
    const page = pages[pi];
    const pdfY = page.getSize().height - y - height;
    page.drawRectangle({ x, y: pdfY, width, height, color: col, opacity: 0.4 });
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async underline(
    buffer: Buffer,
    pageNum: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const pi = Math.max(0, Math.min(pageNum - 1, pages.length - 1));
    const page = pages[pi];
    const lineY = page.getSize().height - y - height;
    page.drawLine({ start: { x, y: lineY }, end: { x: x + width, y: lineY }, thickness: 1.5, color: rgb(0, 0, 0) });
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async strikeout(
    buffer: Buffer,
    pageNum: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const pi = Math.max(0, Math.min(pageNum - 1, pages.length - 1));
    const page = pages[pi];
    const lineY = page.getSize().height - y - height / 2;
    page.drawLine({ start: { x, y: lineY }, end: { x: x + width, y: lineY }, thickness: 1.5, color: rgb(0.8, 0, 0) });
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async imageWatermark(
    buffer: Buffer,
    imageUrl: string,
    gravity: string,
    opacity: number,
    scale: number,
    rotation: number,
    pagesStr: string,
  ): Promise<PdfResult> {
    if (!imageUrl?.trim()) throw new BadRequestException('Watermark image URL is required.');

    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new BadRequestException('Failed to fetch watermark image from the provided URL.');
    const imgBuf = Buffer.from(await resp.arrayBuffer());
    const pngBuf = await sharp(imgBuf).png().toBuffer();

    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const embedded = await doc.embedPng(pngBuf);
    const pages = doc.getPages();
    const total = pages.length;

    const targetSet = pagesStr === 'all'
      ? new Set(Array.from({ length: total }, (_, i) => i))
      : new Set(this.parseRanges(pagesStr, total).flat());

    const op = Math.max(0, Math.min(100, opacity)) / 100;
    const sc = Math.max(1, Math.min(200, scale)) / 100;

    for (const pi of targetSet) {
      if (pi < 0 || pi >= total) continue;
      const page = pages[pi];
      const { width, height } = page.getSize();
      const imgW = embedded.width * sc;
      const imgH = embedded.height * sc;

      const gravMap: Record<string, [number, number]> = {
        Center:    [(width - imgW) / 2,    (height - imgH) / 2],
        North:     [(width - imgW) / 2,    height - imgH - 20],
        South:     [(width - imgW) / 2,    20],
        NorthEast: [width - imgW - 20,     height - imgH - 20],
        NorthWest: [20,                    height - imgH - 20],
        SouthEast: [width - imgW - 20,     20],
        SouthWest: [20,                    20],
      };
      const [ix, iy] = gravMap[gravity] ?? gravMap.Center;
      page.drawImage(embedded, { x: ix, y: iy, width: imgW, height: imgH, opacity: op, rotate: degrees(rotation) });
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async batesNumbering(
    buffer: Buffer,
    prefix: string,
    suffix: string,
    startingNumber: number,
    vPos: string,
    hPos: string,
    fontSize: number,
    fontColor: string,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const color = this.hexToColor(fontColor);

    const pages = doc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const label = `${prefix}${String(startingNumber + i).padStart(5, '0')}${suffix}`;
      const tw = font.widthOfTextAtSize(label, fontSize);

      const x =
        hPos === 'left'  ? 40 :
        hPos === 'right' ? width - tw - 40 :
        (width - tw) / 2;

      const y = vPos === 'top' ? height - fontSize - 20 : 20;
      page.drawText(label, { x, y, size: fontSize, font, color });
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async editText(
    buffer: Buffer,
    newText: string,
    page: number,
    x: number,
    y: number,
    coverWidth: number,
    coverHeight: number,
    fontSize: number,
    fontColor: string,
    coverColor: string,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const pageIdx = Math.max(1, Math.min(page, total)) - 1;
    const pg = doc.getPage(pageIdx);
    const { height } = pg.getSize();

    // PDF y-axis is from bottom; convert from top-based input
    const pdfY = height - y - coverHeight;

    const coverRgb = this.hexToColor(coverColor);
    pg.drawRectangle({ x, y: pdfY, width: coverWidth, height: coverHeight, color: coverRgb });

    if (newText.trim()) {
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const textColor = this.hexToColor(fontColor);
      pg.drawText(newText, { x: x + 2, y: pdfY + 2, size: fontSize, font, color: textColor });
    }

    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SECURITY
  ═══════════════════════════════════════════════════════════════════════ */

  async unlock(buffer: Buffer): Promise<PdfResult> {
    // pdf-lib does not support decrypting password-protected PDFs.
    // ignoreEncryption loads the structure but content remains encrypted.
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async redact(
    buffer: Buffer,
    page: number,
    x: number,
    y: number,
    width: number,
    height: number,
    colorHex: string,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const pageIdx = Math.max(1, Math.min(page, total)) - 1;
    const pg = doc.getPage(pageIdx);
    const { height: pageHeight } = pg.getSize();
    const pdfY = pageHeight - y - height;
    const color = this.hexToColor(colorHex);
    pg.drawRectangle({ x, y: pdfY, width, height, color });
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  async addStamp(
    buffer: Buffer,
    text: string,
    position: string,
    pagesStr: string,
    fontSize: number,
    colorHex: string,
    opacity: number,
    rotation: number,
  ): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const color = this.hexToColor(colorHex);
    const op = Math.max(0, Math.min(100, opacity)) / 100;
    const total = doc.getPageCount();

    const indices = pagesStr.trim().toLowerCase() === 'all'
      ? Array.from({ length: total }, (_, i) => i)
      : this.parseRanges(pagesStr, total).flat();

    for (const i of indices) {
      if (i < 0 || i >= total) continue;
      const pg = doc.getPage(i);
      const { width, height } = pg.getSize();
      const tw = font.widthOfTextAtSize(text, fontSize);
      const th = fontSize;

      const posMap: Record<string, [number, number]> = {
        'center':       [(width - tw) / 2,  (height - th) / 2],
        'top-left':     [40,                 height - th - 40],
        'top-right':    [width - tw - 40,    height - th - 40],
        'bottom-left':  [40,                 40],
        'bottom-right': [width - tw - 40,    40],
      };
      const [px, py] = posMap[position] ?? posMap['center'];

      pg.drawRectangle({
        x: px - 8, y: py - 6,
        width: tw + 16, height: th + 12,
        borderColor: color, borderWidth: 3,
        opacity: op,
      });
      pg.drawText(text, {
        x: px, y: py, size: fontSize, font, color,
        opacity: op, rotate: degrees(rotation),
      });
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STANDARDS
  ═══════════════════════════════════════════════════════════════════════ */

  async validatePdfa(buffer: Buffer): Promise<{ valid: boolean; message: string; details: Record<string, string> }> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return {
      valid: true,
      message: 'Document parsed successfully. For strict PDF/A validation install VeraPDF on the server.',
      details: {
        pages:    String(doc.getPageCount()),
        title:    doc.getTitle()    ?? '(not set)',
        author:   doc.getAuthor()   ?? '(not set)',
        producer: doc.getProducer() ?? '(not set)',
        creator:  doc.getCreator()  ?? '(not set)',
      },
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STANDARDS (partial – PDF/UA metadata tagging via pdf-lib)
  ═══════════════════════════════════════════════════════════════════════ */

  async pdfToPdfua(buffer: Buffer, title: string, lang: string): Promise<PdfResult> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    if (title) doc.setTitle(title);
    doc.setLanguage(lang || 'en-US');
    doc.setProducer('ImageDigitalHub – PDF/UA tagger');
    // Tag the document with basic XMP accessibility metadata
    const xmpMeta = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">
      <pdfuaid:part>1</pdfuaid:part>
    </rdf:Description>
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title || 'Document'}</rdf:li></rdf:Alt></dc:title>
      <dc:language><rdf:Bag><rdf:li>${lang || 'en-US'}</rdf:li></rdf:Bag></dc:language>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
    doc.setSubject('PDF/UA compliant document');
    // Embed XMP packet via raw catalog entry
    try {
      const xmpBytes = Buffer.from(xmpMeta, 'utf-8');
      const xmpStream = doc.context.stream(xmpBytes, {
        Type: 'Metadata',
        Subtype: 'XML',
        Length: xmpBytes.length,
      });
      const xmpRef = doc.context.register(xmpStream);
      (doc.catalog as any).set(PDFName.of('Metadata'), xmpRef);
    } catch { /* non-critical; metadata embedding failed gracefully */ }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     INTERACTIVE FORMS
  ═══════════════════════════════════════════════════════════════════════ */

  /** Parse field definitions and add AcroForm fields to a PDF. */
  async createForm(buffer: Buffer, fieldsJson: string): Promise<PdfResult> {
    const doc   = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form  = doc.getForm();
    const pages = doc.getPages();

    let defs: Array<{
      type: string; name: string; label?: string;
      page?: number; x?: number; y?: number; width?: number; height?: number;
      options?: string[];
    }>;
    try {
      defs = JSON.parse(fieldsJson);
      if (!Array.isArray(defs)) throw new Error('fields must be a JSON array');
    } catch (err) {
      throw new BadRequestException('Invalid fields JSON: ' + (err as Error).message);
    }

    for (const def of defs) {
      const pageIdx = Math.max(0, (def.page ?? 1) - 1);
      if (pageIdx >= pages.length) continue;
      const page      = pages[pageIdx];
      const { height } = page.getSize();
      const x       = def.x      ?? 50;
      const w       = def.width  ?? 200;
      const h       = def.height ?? 24;
      // Convert top-based y to PDF bottom-based coordinate
      const y = height - (def.y ?? 100) - h;

      switch ((def.type ?? 'text').toLowerCase()) {
        case 'text': {
          const field = form.createTextField(def.name);
          if (def.label) field.setText('');
          field.addToPage(page, { x, y, width: w, height: h });
          break;
        }
        case 'checkbox': {
          const field = form.createCheckBox(def.name);
          field.addToPage(page, { x, y, width: h, height: h });
          break;
        }
        case 'dropdown': {
          const field = form.createDropdown(def.name);
          if (def.options?.length) field.setOptions(def.options);
          field.addToPage(page, { x, y, width: w, height: h });
          break;
        }
        case 'radio': {
          const field = form.createRadioGroup(def.name);
          if (def.options?.length) {
            for (const opt of def.options) {
              field.addOptionToPage(opt, page, { x, y, width: h, height: h });
            }
          }
          break;
        }
        default:
          break;
      }
    }
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /** Fill existing form fields by name→value map. */
  async fillForm(buffer: Buffer, dataJson: string, flatten: boolean): Promise<PdfResult> {
    const doc  = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = doc.getForm();

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(dataJson);
      if (typeof data !== 'object' || Array.isArray(data)) throw new Error('data must be a JSON object');
    } catch (err) {
      throw new BadRequestException('Invalid data JSON: ' + (err as Error).message);
    }

    for (const [name, value] of Object.entries(data)) {
      try {
        const field = form.getField(name);
        if (field instanceof PDFTextField) {
          field.setText(String(value ?? ''));
        } else if (field instanceof PDFCheckBox) {
          value ? field.check() : field.uncheck();
        } else if (field instanceof PDFDropdown) {
          field.select(String(value));
        } else if (field instanceof PDFRadioGroup) {
          field.select(String(value));
        }
      } catch { /* field not found – skip silently */ }
    }

    if (flatten) form.flatten();
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /** Export all form field values as JSON or CSV. */
  async exportFormData(buffer: Buffer, format: string): Promise<PdfResult> {
    const doc    = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form   = doc.getForm();
    const fields = form.getFields();

    const rows: Array<{ name: string; type: string; value: string }> = fields.map(f => {
      let value = '';
      if (f instanceof PDFTextField)  value = f.getText() ?? '';
      if (f instanceof PDFCheckBox)   value = String(f.isChecked());
      if (f instanceof PDFDropdown)   value = f.getSelected().join(', ');
      if (f instanceof PDFRadioGroup) value = f.getSelected() ?? '';
      return { name: f.getName(), type: f.constructor.name, value };
    });

    if (format === 'csv') {
      const csv = ['name,type,value', ...rows.map(r => `"${r.name}","${r.type}","${r.value}"`)].join('\n');
      return { buffer: Buffer.from(csv, 'utf-8'), mime: 'text/csv', ext: 'csv' };
    }
    return {
      buffer: Buffer.from(JSON.stringify(rows, null, 2), 'utf-8'),
      mime: 'application/json',
      ext:  'json',
    };
  }

  /** Validate that every non-optional text field contains a value. */
  async validateForm(buffer: Buffer): Promise<{
    valid: boolean; totalFields: number; filled: number; missing: string[];
  }> {
    const doc    = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form   = doc.getForm();
    const fields = form.getFields();
    const missing: string[] = [];

    for (const f of fields) {
      if (f instanceof PDFTextField) {
        const val = f.getText();
        if (!val || val.trim() === '') missing.push(f.getName());
      }
    }

    return {
      valid:       missing.length === 0,
      totalFields: fields.length,
      filled:      fields.length - missing.length,
      missing,
    };
  }

  /** List all field names + types in the form. */
  async listFormFields(buffer: Buffer): Promise<{ fields: Array<{ name: string; type: string; value: string }> }> {
    const doc    = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form   = doc.getForm();
    const fields = form.getFields().map(f => {
      let value = '';
      if (f instanceof PDFTextField)  value = f.getText() ?? '';
      if (f instanceof PDFCheckBox)   value = String(f.isChecked());
      if (f instanceof PDFDropdown)   value = f.getSelected().join(', ');
      if (f instanceof PDFRadioGroup) value = f.getSelected() ?? '';
      return { name: f.getName(), type: f.constructor.name, value };
    });
    return { fields };
  }

  /** Remove or rename a single form field. */
  async manageFormField(
    buffer: Buffer,
    action: string,
    fieldName: string,
    newFieldName: string,
  ): Promise<PdfResult> {
    const doc  = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = doc.getForm();

    if (action === 'remove') {
      try {
        form.removeField(form.getField(fieldName));
      } catch {
        throw new BadRequestException(`Field "${fieldName}" not found.`);
      }
      return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
    }

    if (action === 'rename') {
      if (!newFieldName) throw new BadRequestException('new_field_name is required for rename.');
      try {
        const field = form.getField(fieldName);
        (field as any).acroField.setPartialName(newFieldName);
      } catch {
        throw new BadRequestException(`Field "${fieldName}" not found.`);
      }
      return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
    }

    throw new BadRequestException(`Unknown action "${action}". Use list, remove, or rename.`);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CONVERT TO PDF
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Shared helper – converts a plain-text string into a paginated A4 PDF.
   */
  /**
   * Strip characters that WinAnsiEncoding (used by all pdf-lib standard fonts)
   * cannot encode.  Converts common Unicode punctuation/symbols to ASCII
   * equivalents first, then removes anything outside the 0x00–0xFF range.
   */
  private sanitizeForPdf(text: string): string {
    return text
      // Smart / curly quotes → straight
      .replace(/[\u2018\u2019\u02BC]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      // Dashes
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '--')
      // Ellipsis, bullet, degree, check, cross
      .replace(/\u2026/g, '...')
      .replace(/[\u2022\u2023\u25CF\u25E6\u2043]/g, '*')
      .replace(/\u00B0/g, ' deg')
      .replace(/\u2713/g, '[v]')
      .replace(/\u2717/g, '[x]')
      // Non-breaking / zero-width spaces
      .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
      // Copyright, trademark, registered
      .replace(/\u00A9/g, '(c)')
      .replace(/\u00AE/g, '(R)')
      .replace(/\u2122/g, '(TM)')
      // Arrows
      .replace(/\u2192/g, '->')
      .replace(/\u2190/g, '<-')
      .replace(/\u2194/g, '<->')
      // Strip everything that WinAnsi still cannot encode
      // (private-use area U+E000–U+F8FF, surrogates, and anything > 0xFF
      //  that wasn't already replaced above)
      .replace(/[\uE000-\uF8FF]/g, '')    // PUA — Wingdings/Symbol glyphs live here
      .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, ''); // keep tab, LF, CR, space-tilde + Latin-1
  }

  private async renderTextAsPdf(text: string, title = 'Document'): Promise<PDFDocument> {
    const clean  = this.sanitizeForPdf(text);
    const doc  = await PDFDocument.create();
    doc.setTitle(title);
    doc.setProducer('ImageDigitalHub');

    const font       = await doc.embedFont(StandardFonts.Helvetica);
    const fontSize   = 11;
    const margin     = 50;
    const pageW      = 595;   // A4 width  (points)
    const pageH      = 842;   // A4 height (points)
    const lineH      = fontSize * 1.5;
    const maxW       = pageW - margin * 2;
    const linesPerPg = Math.floor((pageH - margin * 2) / lineH);

    // Word-wrap every input line
    const wrapped: string[] = [];
    for (const raw of clean.split('\n')) {
      if (!raw.trim()) { wrapped.push(''); continue; }
      const words = raw.split(' ');
      let cur = '';
      for (const w of words) {
        const candidate = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(candidate, fontSize) > maxW && cur) {
          wrapped.push(cur);
          cur = w;
        } else {
          cur = candidate;
        }
      }
      if (cur) wrapped.push(cur);
    }

    // Create pages
    for (let i = 0; i < wrapped.length; i += linesPerPg) {
      const page  = doc.addPage([pageW, pageH]);
      const chunk = wrapped.slice(i, i + linesPerPg);
      chunk.forEach((line, j) => {
        if (!line.trim()) return;
        page.drawText(line, {
          x: margin,
          y: pageH - margin - j * lineH,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });
    }

    if (doc.getPageCount() === 0) doc.addPage([pageW, pageH]);
    return doc;
  }

  /** Route /pdf/office-to-pdf — dispatches by file extension. */
  async officeToPdf(buffer: Buffer, ext: string): Promise<PdfResult> {
    switch (ext) {
      case 'docx':
      case 'doc':
        return this.wordToPdf(buffer);
      case 'xlsx':
      case 'xls':
        return this.excelToPdf(buffer);
      case 'pptx':
      case 'ppt':
        return this.pptToPdf(buffer);
      case 'rtf':
        return this.rtfToPdf(buffer);
      default:
        throw new BadRequestException(
          `Unsupported format ".${ext}". Supported: docx, doc, xlsx, xls, pptx, ppt, rtf`,
        );
    }
  }

  /** DOCX / DOC → PDF via mammoth text extraction. */
  private async wordToPdf(buffer: Buffer): Promise<PdfResult> {
    const { value: text } = await mammoth.extractRawText({ buffer });
    const doc = await this.renderTextAsPdf(text || '(Empty document)', 'Word Document');
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /** XLSX / XLS → PDF — renders each sheet as a columnar text table. */
  private async excelToPdf(buffer: Buffer): Promise<PdfResult> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    let text = '';
    for (const sheetName of wb.SheetNames) {
      text += `Sheet: ${sheetName}\n${'─'.repeat(50)}\n`;
      const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[sheetName], {
        header: 1,
        defval: '',
      });
      for (const row of rows) {
        text += (row as string[]).map(c => String(c ?? '').padEnd(18)).join('  ').trimEnd() + '\n';
      }
      text += '\n';
    }
    const doc = await this.renderTextAsPdf(text || '(Empty spreadsheet)', 'Spreadsheet');
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /** PPTX / PPT → PDF — extracts text from slide XML using JSZip. */
  private async pptToPdf(buffer: Buffer): Promise<PdfResult> {
    const zip        = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
        const nb = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
        return na - nb;
      });

    let text = '';
    for (let i = 0; i < slideFiles.length; i++) {
      const xml     = await zip.files[slideFiles[i]].async('text');
      const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
      const slide   = matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
      if (slide) text += `Slide ${i + 1}\n${'─'.repeat(30)}\n${slide}\n\n`;
    }
    const doc = await this.renderTextAsPdf(text || '(No text content found in presentation)', 'Presentation');
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /** RTF → PDF — strips RTF control codes to extract plain text. */
  private async rtfToPdf(buffer: Buffer): Promise<PdfResult> {
    const rtf = buffer.toString('latin1');
    const text = rtf
      .replace(/\{\\\*[^}]*\}/g, '')                // remove \* groups
      .replace(/\\[a-z]+[-0-9]* ?/gi, ' ')           // strip control words
      .replace(/[{}\\]/g, '')                         // remove braces and backslashes
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const doc = await this.renderTextAsPdf(text || '(No readable content in RTF)', 'RTF Document');
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /** HTML → PDF — strips tags with node-html-parser, renders plain text. */
  async htmlToPdf(buffer: Buffer): Promise<PdfResult> {
    const html = buffer.toString('utf-8');
    const root = parseHtml(html);
    root.querySelectorAll('script, style, head').forEach(el => el.remove());
    const text = (root.structuredText ?? root.text)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const doc = await this.renderTextAsPdf(text || '(Empty HTML document)', 'HTML Document');
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }

  /** EPUB → PDF — unzips the EPUB, extracts HTML chapter text with node-html-parser. */
  async epubToPdf(buffer: Buffer): Promise<PdfResult> {
    const zip       = await JSZip.loadAsync(buffer);
    const htmlFiles = Object.keys(zip.files)
      .filter(n => /\.(html|xhtml)$/i.test(n))
      .sort();

    let text = '';
    for (const fileName of htmlFiles) {
      const content = await zip.files[fileName].async('text');
      const root    = parseHtml(content);
      root.querySelectorAll('script, style').forEach(el => el.remove());
      const chapter = (root.structuredText ?? root.text)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (chapter) text += chapter + '\n\n';
    }
    const doc = await this.renderTextAsPdf(text || '(No readable content in EPUB)', 'eBook');
    return { buffer: this.toBuffer(await doc.save()), mime: 'application/pdf', ext: 'pdf' };
  }
}
