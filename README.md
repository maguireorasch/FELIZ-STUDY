# FELIZ STUDY — Your Smart Academic Companion

Personal academic management system (**Blue Edition**) untuk mahasiswa Teknologi Informasi Semester 3, dirancang untuk mengelola jadwal kuliah, tugas & deadline, sesi fokus belajar, catatan materi dosen, dokumen kuliah, kalender akademik, serta AI Study Assistant berbasis Google Gemini API.

## Fitur Utama
- **Tanpa Login / Register**: Membuka aplikasi langsung masuk ke Dashboard. Seluruh data tersimpan aman secara lokal di `localStorage` dan `IndexedDB`.
- **Dashboard Overview**: Menampilkan jadwal kuliah hari ini, deadline terdekat, jumlah tugas tertunda, status Study Focus, quick notes, rekomendasi belajar berbasis data aktual, grafik produktivitas 7 hari, dan 6 tombol aksi cepat.
- **My Schedule**: Jadwal kuliah Senin–Jumat yang sepenuhnya diisi oleh pengguna sendiri (kosong pada penggunaan pertama), mendukung Weekly & Daily view, pencarian, duplikasi, validasi jam, serta deteksi tabrakan jadwal.
- **Manage Subjects**: Pengelolaan mata kuliah (nama, kode, dosen, semester, SKS, warna) yang otomatis tersinkronisasi ke jadwal, tugas, catatan, dokumen, dan statistik.
- **Assignment Tracker**: Manajemen tugas kuliah lengkap dengan prioritas (`Low`, `Medium`, `High`, `Urgent`), indikator deadline (`Overdue`, `Due Today`, `Due Tomorrow`, `Due Soon`, `Completed`), progress bar, lampiran IndexedDB, dan halaman detail.
- **Study Focus**: Timer belajar akurat berbasis timestamp (`Pomodoro`, `Focus Session`, `Short Break`, `Long Break`, `Custom Timer`) dengan lingkaran progress biru dan pencatatan riwayat belajar.
- **My Notes**: Buku catatan akademik dengan Rich Text Editor (H1, H2, Bold, Italic, Underline, List, Checklist, Code Block, Highlight, Insert Image, Insert Link), Code Snippet Lab, auto-save, pin, favorit, dan bookmark.
- **My Documents**: Penyimpanan dokumen materi dosen (`PDF`, `PPT`, `PPTX`, `DOC`, `DOCX`, `JPG`, `PNG`, `TXT`) di `IndexedDB` lengkap dengan preview PDF/gambar, ekstraksi teks (`pdfjs-dist`, `mammoth`, `jszip`), unduh ulang, dan integrasi analisis ke AI Assistant.
- **AI Assistant (Google Gemini API)**: Mendukung 8 mode (`AI Tutor`, `Material Summarizer`, `PDF & PPT Analyzer`, `Quiz Generator`, `Programming Tutor`, `Debugging Assistant`, `Study Roadmap`, `Smart Learning Recommendation`) melalui endpoint server `/api/ai/chat`.
- **Academic Progress & Calendar**: Grafik interaktif Recharts dari data aktual serta kalender Bulanan, Mingguan, dan Harian dengan dukungan Web Notification API.
- **Settings & Backup**: Pengaturan profil akademik, Dark/Light Blue Edition, timer belajar, serta Export/Import Backup (`.json`) lengkap dengan file IndexedDB.

## Menjalankan Secara Lokal
1. Instal dependensi: `npm install`
2. Atur `GEMINI_API_KEY` pada file `.env` atau panel Secrets server untuk mengaktifkan AI Assistant.
3. Jalankan: `npm run dev` dan buka `http://localhost:3000`.
