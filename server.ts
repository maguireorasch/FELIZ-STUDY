import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Check whether Gemini API key is configured on server (never return the key itself)
  app.get('/api/ai/status', (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
      configured: Boolean(key && key.trim() && key !== 'MY_GEMINI_API_KEY'),
      model: 'gemini-4-hydrogen',
    });
  });

  // Main FELIZ STUDY Gemini AI Assistant endpoint
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || !apiKey.trim() || apiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({
          error: 'GEMINI_API_KEY belum dikonfigurasi pada panel Settings > Secrets server.',
          needsConfig: true,
        });
        return;
      }

      const { mode, message, history, academicContext, attachmentText } = req.body || {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Pesan atau pertanyaan wajib diisi.' });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const modeInstructions: Record<string, string> = {
        'AI Tutor':
          'Jelaskan materi perkuliahan secara terstruktur dari konsep dasar hingga tingkat lanjut dengan analogi yang mudah dipahami mahasiswa Teknologi Informasi.',
        'Material Summarizer':
          'Ringkas materi dosen menjadi format baku: 1) Ringkasan Singkat, 2) Poin Penting, 3) Definisi Istilah Kunci, 4) Contoh Penerapan, 5) Kesimpulan.',
        'PDF & PPT Analyzer':
          'Analisis isi dokumen materi kuliah yang dilampirkan. Jawab pertanyaan hanya berdasarkan teks dokumen tersebut, jelaskan poin inti, dan soroti bagian penting untuk ujian/tugas.',
        'Quiz Generator':
          'Buat latihan soal berkualitas (Multiple Choice, True/False, Short Answer, atau Essay sesuai permintaan) beserta bagian terpisah di bawah bertajuk "Kunci Jawaban & Pembahasan".',
        'Programming Tutor':
          'Bantu mahasiswa memahami pemrograman (HTML, CSS, JS, React, Python, PHP, SQL, Database, Computer Networks, OS, Algoritma & Struktur Data) dengan contoh kode bersih dan analisis kompleksitas/cara kerja.',
        'Debugging Assistant':
          'Analisis pesan error atau potongan kode yang bermasalah, identifikasi akar penyebab secara akurat, lalu berikan perbaikan kode beserta penjelasan langkah demi langkah.',
        'Study Roadmap':
          'Susun rencana belajar realistis berbasis target waktu mahasiswa, pecah menjadi milestone harian/mingguan yang terukur.',
        'Smart Learning Recommendation':
          'Analisis data akademik aktual pengguna (mata kuliah, tugas belum selesai, deadline terdekat, catatan, dan riwayat belajar). Berikan rekomendasi prioritas belajar yang konkret. DILARANG mengarang jadwal, nilai, atau progres belajar yang tidak ada dalam data.',
      };

      const selectedInstruction = modeInstructions[String(mode)] || modeInstructions['AI Tutor'];

      const systemInstruction = `Kamu adalah FELIZ STUDY AI Assistant — pendamping akademik cerdas untuk mahasiswa Teknologi Informasi Semester 3.
Bahasa utama: Bahasa Indonesia yang jelas, ramah, akademik, dan mudah dipahami.
Mode aktif: ${mode || 'AI Tutor'}.
Panduan mode: ${selectedInstruction}

ATURAN INTEGRITAS DATA:
- JANGAN PERNAH mengarang jadwal kuliah, nilai, mata kuliah, tugas, atau progres belajar yang tidak tertulis di Konteks Akademik Pengguna di bawah.
- Jika pengguna belum memiliki jadwal/tugas/catatan, nyatakan secara jujur bahwa data tersebut masih kosong dan ajak pengguna mengisinya atau tanyakan topik yang ingin dipelajari.

Konteks Akademik Pengguna Saat Ini:
${academicContext ? JSON.stringify(academicContext, null, 2) : 'Belum ada konteks tambahan.'}
${attachmentText ? `\nIsi Dokumen / Materi Lampiran:\n${String(attachmentText).slice(0, 35000)}` : ''}`;

      const formattedHistory = Array.isArray(history)
        ? history
            .slice(-10)
            .map(
              (h: { role?: string; content?: string }) =>
                `${h.role === 'user' ? 'Mahasiswa' : 'AI Assistant'}: ${String(h.content || '')}`
            )
            .join('\n\n')
        : '';

      const fullPrompt = formattedHistory
        ? `Riwayat percakapan sebelumnya:\n${formattedHistory}\n\nPertanyaan Mahasiswa saat ini:\n${message.trim()}`
        : message.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: fullPrompt,
        config: {
          systemInstruction,
        },
      });

      res.json({
        reply: response.text || 'Maaf, tidak ada respons yang dihasilkan.',
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menghubungi Google Gemini API.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FELIZ STUDY server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start FELIZ STUDY server:', err);
  process.exit(1);
});
