import { jsPDF } from 'jspdf';

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80)
    .replace(/^_+|_+$/g, '') || 'resume';
}

export function downloadResumeAsPdf(markdownText: string, filename: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const marginLeft = 48;
  const marginRight = 48;
  const marginTop = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginLeft - marginRight;
  let y = marginTop;

  const lines = markdownText.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('# ')) {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const text = line.slice(2);
      const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
      if (y + wrapped.length * 22 > doc.internal.pageSize.getHeight() - 48) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(wrapped, marginLeft, y);
      y += wrapped.length * 22 + 6;
    } else if (line.startsWith('## ')) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const text = line.slice(3);
      const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
      if (y + wrapped.length * 17 > doc.internal.pageSize.getHeight() - 48) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(wrapped, marginLeft, y);
      y += wrapped.length * 17 + 4;
    } else if (line.startsWith('### ')) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const text = line.slice(4);
      const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
      if (y + wrapped.length * 15 > doc.internal.pageSize.getHeight() - 48) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(wrapped, marginLeft, y);
      y += wrapped.length * 15 + 3;
    } else if (line === '' || line === '---') {
      y += 8;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const text = line.startsWith('- ') || line.startsWith('* ')
        ? `• ${line.slice(2)}`
        : line;
      const indent = line.startsWith('- ') || line.startsWith('* ') ? marginLeft + 12 : marginLeft;
      const usableWidth = maxWidth - (indent - marginLeft);
      const wrapped = doc.splitTextToSize(text, usableWidth) as string[];
      if (y + wrapped.length * 13 > doc.internal.pageSize.getHeight() - 48) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(wrapped, indent, y);
      y += wrapped.length * 13 + 2;
    }
  }

  doc.save(`${sanitizeFilename(filename)}.pdf`);
}
