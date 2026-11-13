import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Download,
  Moon,
  Palette,
  Sun,
  Timer,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { FelizStudyStore } from '../../types/study';
import {
  clearAllStudyData,
  exportStudyBackup,
  importStudyBackup,
} from '../../lib/studyStorage';
import { SubjectsManagerPanel } from './SubjectsManagerModal';

interface SettingsViewProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  onReplaceStore: (nextStore: FelizStudyStore) => void;
  onToast: (msg: string) => void;
}

export function SettingsView({
  store,
  onUpdateStore,
  onReplaceStore,
  onToast,
}: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await exportStudyBackup(store);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feliz-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast('Backup JSON (termasuk dokumen IndexedDB) berhasil diunduh!');
    } catch {
      onToast('Gagal membuat file backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const restored = await importStudyBackup(text);
      onReplaceStore(restored);
      onToast('Data akademik berhasil dipulihkan dari backup!');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'File backup tidak valid.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    const fresh = await clearAllStudyData();
    onReplaceStore(fresh);
    setConfirmClear(false);
    onToast('Seluruh data lokal FELIZ STUDY telah dihapus bersih.');
  };

  const updateProfile = (patch: Partial<FelizStudyStore['academic_profile']>) => {
    onUpdateStore((prev) => ({
      ...prev,
      academic_profile: {
        ...prev.academic_profile,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
          Settings &amp; Academic Setup
        </h2>
        <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
          Kelola profil akademik, daftar mata kuliah, tema Blue Edition, timer belajar, dan cadangan data lokal.
        </p>
      </div>

      {/* Academic Profile & Semester Settings */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
          <User className="w-4 h-4 text-[#38BDF8]" />
          Profil Akademik &amp; Pengaturan Semester
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Nama Mahasiswa
            </label>
            <input
              type="text"
              value={store.academic_profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Program Studi
            </label>
            <input
              type="text"
              value={store.academic_profile.program}
              onChange={(e) => updateProfile({ program: e.target.value })}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Semester
            </label>
            <input
              type="number"
              min={1}
              max={14}
              value={store.academic_profile.semester}
              onChange={(e) =>
                updateProfile({ semester: Math.max(1, Number(e.target.value) || 3) })
              }
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-[#EAF2FF]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Tahun Akademik
            </label>
            <input
              type="text"
              value={store.academic_profile.academicYear}
              onChange={(e) => updateProfile({ academicYear: e.target.value })}
              placeholder="2026/2027"
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-[#EAF2FF]"
            />
          </div>
        </div>
      </section>

      {/* Manage Subjects */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
          <BookOpen className="w-4 h-4 text-[#38BDF8]" />
          Manage Subjects (Daftar Mata Kuliah)
        </div>
        <SubjectsManagerPanel
          store={store}
          onUpdateStore={onUpdateStore}
          onToast={onToast}
        />
      </section>

      {/* Theme & Notifications */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
          <Palette className="w-4 h-4 text-[#38BDF8]" />
          Tema Blue Edition &amp; Notifikasi
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() =>
              onUpdateStore((prev) => ({
                ...prev,
                settings: { ...prev.settings, theme: 'dark' },
              }))
            }
            className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
              store.settings.theme === 'dark'
                ? 'border-[#38BDF8] bg-[#2563EB]/15'
                : 'border-slate-200 dark:border-white/10'
            }`}
          >
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-[#EAF2FF]">
                Dark Blue Edition (Default)
              </p>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Latar #070B14 &amp; Navy Glassmorphism #14213A
              </p>
            </div>
            <Moon className="w-5 h-5 text-[#38BDF8]" />
          </button>

          <button
            onClick={() =>
              onUpdateStore((prev) => ({
                ...prev,
                settings: { ...prev.settings, theme: 'light' },
              }))
            }
            className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
              store.settings.theme === 'light'
                ? 'border-[#2563EB] bg-[#2563EB]/10'
                : 'border-slate-200 dark:border-white/10'
            }`}
          >
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-[#EAF2FF]">
                Light Blue Edition
              </p>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Terang, bersih, tetap mempertahankan aksen biru
              </p>
            </div>
            <Sun className="w-5 h-5 text-[#2563EB]" />
          </button>
        </div>

        <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#38BDF8]" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-[#EAF2FF]">
                Notification Center &amp; Pengingat
              </p>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Tampilkan deadline terdekat dan jadwal di lonceng notifikasi header
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={store.settings.notificationsEnabled}
            onChange={(e) =>
              onUpdateStore((prev) => ({
                ...prev,
                settings: { ...prev.settings, notificationsEnabled: e.target.checked },
              }))
            }
            className="w-4 h-4 accent-[#3B82F6]"
          />
        </label>
      </section>

      {/* Study Timer Settings */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
          <Timer className="w-4 h-4 text-[#38BDF8]" />
          Study Timer Settings
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Pomodoro Focus (mnt)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={store.settings.pomodoroFocusMinutes}
              onChange={(e) =>
                onUpdateStore((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    pomodoroFocusMinutes: Math.max(5, Number(e.target.value) || 25),
                  },
                }))
              }
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Short Break (mnt)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={store.settings.shortBreakMinutes}
              onChange={(e) =>
                onUpdateStore((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    shortBreakMinutes: Math.max(1, Number(e.target.value) || 5),
                  },
                }))
              }
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Long Break (mnt)
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={store.settings.longBreakMinutes}
              onChange={(e) =>
                onUpdateStore((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    longBreakMinutes: Math.max(5, Number(e.target.value) || 15),
                  },
                }))
              }
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Target Sesi Harian
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={store.settings.dailySessionTarget}
              onChange={(e) =>
                onUpdateStore((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    dailySessionTarget: Math.max(1, Number(e.target.value) || 4),
                  },
                }))
              }
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular"
            />
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
          Data Management (Backup &amp; Restore)
        </h3>
        <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
          Semua data disimpan lokal di browser (LocalStorage &amp; IndexedDB) tanpa perlu akun. Ekspor backup untuk mencadangkan atau memindahkan data antar perangkat.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow cursor-pointer disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Mengekspor...' : 'Export Backup (.json)'}
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-sm font-medium text-slate-800 dark:text-[#EAF2FF] hover:border-[#38BDF8] cursor-pointer">
            <Upload className="w-4 h-4 text-[#38BDF8]" />
            Import Backup (.json)
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 text-sm font-medium cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        </div>
      </section>

      {/* Confirmation Dialog */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/50 bg-white dark:bg-[#101B32] p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
                Hapus Semua Data Lokal?
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
              Seluruh mata kuliah, jadwal kuliah, tugas, catatan materi, dokumen IndexedDB, dan riwayat AI akan dihapus permanen. Pastikan kamu sudah melakukan Export Backup jika masih dibutuhkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
