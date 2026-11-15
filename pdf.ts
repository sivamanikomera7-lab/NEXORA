import fs from 'node:fs';
import path from 'node:path';

function escapePdfText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

export function createSimplePdfBuffer(title: string, lines: string[]): Buffer {
  const safeTitle = escapePdfText(title);
  const contentCommands: string[] = [
    'BT',
    '/F1 20 Tf',
    '54 740 Td',
    `(${safeTitle}) Tj`,
    '/F1 10 Tf',
    '0 -22 Td',
    '(NEXORA Digital Vault - Licensed Distribution) Tj',
    '0 -24 Td',
    '/F1 11 Tf',
  ];

  for (const rawLine of lines.slice(0, 32)) {
    const safeLine = escapePdfText(rawLine.slice(0, 88));
    contentCommands.push(`(${safeLine}) Tj`);
    contentCommands.push('0 -17 Td');
  }
  contentCommands.push('ET');

  const streamContent = contentCommands.join('\n');
  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    const off = String(offsets[i]).padStart(10, '0');
    pdf += `${off} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

export function ensurePrivatePdfFile(filePath: string, title: string, lines: string[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    const buf = createSimplePdfBuffer(title, lines);
    fs.writeFileSync(filePath, buf);
  }
}
