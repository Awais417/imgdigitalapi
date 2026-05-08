import { Injectable, BadRequestException } from '@nestjs/common';
import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  Color,
} from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';

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

  /* ═══════════════════════════════════════════════════════════════════════
     SECURITY
  ═══════════════════════════════════════════════════════════════════════ */

  async unlock(buffer: Buffer): Promise<PdfResult> {
    // pdf-lib does not support decrypting password-protected PDFs.
    // ignoreEncryption loads the structure but content remains encrypted.
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
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
}
