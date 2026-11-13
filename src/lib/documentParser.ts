import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractDocumentText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json') {
      const text = await file.text();
      return text.slice(0, 60000);
    }

    if (ext === 'pdf') {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const pages: string[] = [];
      const maxPages = Math.min(pdf.numPages, 40);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (pageText) {
          pages.push(`[Halaman ${i}]\n${pageText}`);
        }
      }
      if (pdf.numPages > maxPages) {
        pages.push(`... (${pdf.numPages - maxPages} halaman berikutnya tersedia di file asli)`);
      }
      return pages.join('\n\n') || 'Dokumen PDF tidak memiliki lapisan teks (kemungkinan hasil scan gambar).';
    }

    if (ext === 'docx') {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value.trim() || 'Tidak ada teks yang dapat diekstrak dari dokumen DOCX.';
    }

    if (ext === 'pptx') {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const slideKeys = Object.keys(zip.files)
        .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
          const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
          return numA - numB;
        });

      const slidesText: string[] = [];
      for (let i = 0; i < slideKeys.length; i++) {
        const xml = await zip.files[slideKeys[i]].async('string');
        const matches = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) =>
          m[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim()
        );
        const cleaned = matches.filter(Boolean).join(' ');
        if (cleaned) {
          slidesText.push(`[Slide ${i + 1}]\n${cleaned}`);
        }
      }
      return slidesText.join('\n\n') || 'Tidak ada teks slide yang ditemukan pada file PPTX ini.';
    }

    if (ext === 'doc' || ext === 'ppt') {
      return `Format biner lawas (.${ext.toUpperCase()}) tersimpan utuh dan dapat diunduh kembali. Untuk ekstraksi teks otomatis penuh, konversi ke .${ext}x atau .pdf sangat disarankan.`;
    }

    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return 'File gambar materi kuliah tersimpan. Gunakan preview gambar untuk melihat visualnya.';
    }

    return 'File tersimpan di penyimpanan lokal IndexedDB dan siap diunduh kapan saja.';
  } catch (err) {
    return `File tersimpan utuh di IndexedDB. Catatan ekstraksi teks: ${
      err instanceof Error ? err.message : 'Format biner tidak dapat dibaca sebagai teks.'
    }`;
  }
}
