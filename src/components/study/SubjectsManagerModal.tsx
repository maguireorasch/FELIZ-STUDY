import React, { useState } from 'react';
import { BookMarked, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { FelizStudyStore, Subject } from '../../types/study';
import { BLUE_SUBJECT_COLORS } from '../../lib/academicHelpers';

interface SubjectsManagerPanelProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  onToast: (msg: string) => void;
  compact?: boolean;
}

export function SubjectsManagerPanel({
  store,
  onUpdateStore,
  onToast,
}: SubjectsManagerPanelProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState(store.academic_profile.semester || 3);
  const [credits, setCredits] = useState(3);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(BLUE_SUBJECT_COLORS[0]);
  const [showForm, setShowForm] = useState(false);

  // Safe delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const filtered = store.subjects.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.lecturer.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setLecturer('');
    setCode('');
    setSemester(store.academic_profile.semester || 3);
    setCredits(3);
    setDescription('');
    setColor(BLUE_SUBJECT_COLORS[store.subjects.length % BLUE_SUBJECT_COLORS.length]);
    setShowForm(true);
  };

  const openEdit = (sub: Subject) => {
    setEditingId(sub.id);
    setName(sub.name);
    setLecturer(sub.lecturer);
    setCode(sub.code);
    setSemester(sub.semester);
    setCredits(sub.credits);
    setDescription(sub.description);
    setColor(sub.color);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onToast('Nama mata kuliah wajib diisi.');
      return;
    }
    const now = new Date().toISOString();

    if (editingId) {
      const oldSub = store.subjects.find((s) => s.id === editingId);
      onUpdateStore((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name: name.trim(),
                lecturer: lecturer.trim(),
                code: code.trim(),
                semester,
                credits,
                description: description.trim(),
                color,
                updatedAt: now,
              }
            : s
        ),
        // Propagate updated subject name/color cleanly
        schedules: prev.schedules.map((sc) =>
          sc.subjectId === editingId || (oldSub && sc.subjectName === oldSub.name)
            ? { ...sc, subjectId: editingId, subjectName: name.trim(), color, updatedAt: now }
            : sc
        ),
        assignments: prev.assignments.map((a) =>
          a.subjectId === editingId || (oldSub && a.subjectName === oldSub.name)
            ? { ...a, subjectId: editingId, subjectName: name.trim(), updatedAt: now }
            : a
        ),
        notes: prev.notes.map((n) =>
          n.subjectId === editingId || (oldSub && n.subjectName === oldSub.name)
            ? { ...n, subjectId: editingId, subjectName: name.trim(), updatedAt: now }
            : n
        ),
        documents: prev.documents.map((d) =>
          d.subjectId === editingId || (oldSub && d.subjectName === oldSub.name)
            ? { ...d, subjectId: editingId, subjectName: name.trim(), updatedAt: now }
            : d
        ),
      }));
      onToast(`Mata kuliah "${name.trim()}" diperbarui.`);
    } else {
      const created: Subject = {
        id: `sub-${Date.now()}`,
        name: name.trim(),
        lecturer: lecturer.trim(),
        code: code.trim(),
        semester,
        credits,
        description: description.trim(),
        color,
        createdAt: now,
        updatedAt: now,
      };
      onUpdateStore((prev) => ({
        ...prev,
        subjects: [...prev.subjects, created],
      }));
      onToast(`Mata kuliah "${created.name}" ditambahkan.`);
    }
    setShowForm(false);
  };

  const countLinkedItems = (sub: Subject) => {
    const schedules = store.schedules.filter(
      (s) => s.subjectId === sub.id || s.subjectName === sub.name
    ).length;
    const assignments = store.assignments.filter(
      (a) => a.subjectId === sub.id || a.subjectName === sub.name
    ).length;
    const notes = store.notes.filter(
      (n) => n.subjectId === sub.id || n.subjectName === sub.name
    ).length;
    const documents = store.documents.filter(
      (d) => d.subjectId === sub.id || d.subjectName === sub.name
    ).length;
    return { schedules, assignments, notes, documents, total: schedules + assignments + notes + documents };
  };

  const confirmDelete = (cascade: boolean) => {
    if (!deleteTarget) return;
    const sub = deleteTarget;
    onUpdateStore((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== sub.id),
      schedules: cascade
        ? prev.schedules.filter((s) => s.subjectId !== sub.id && s.subjectName !== sub.name)
        : prev.schedules.map((s) =>
            s.subjectId === sub.id ? { ...s, subjectId: undefined } : s
          ),
      assignments: cascade
        ? prev.assignments.filter((a) => a.subjectId !== sub.id && a.subjectName !== sub.name)
        : prev.assignments.map((a) =>
            a.subjectId === sub.id ? { ...a, subjectId: undefined } : a
          ),
      notes: cascade
        ? prev.notes.filter((n) => n.subjectId !== sub.id && n.subjectName !== sub.name)
        : prev.notes.map((n) =>
            n.subjectId === sub.id ? { ...n, subjectId: undefined } : n
          ),
      documents: cascade
        ? prev.documents.filter((d) => d.subjectId !== sub.id && d.subjectName !== sub.name)
        : prev.documents.map((d) =>
            d.subjectId === sub.id ? { ...d, subjectId: undefined } : d
          ),
    }));
    setDeleteTarget(null);
    onToast(
      cascade
        ? `Mata kuliah "${sub.name}" dan item terkait dihapus.`
        : `Mata kuliah "${sub.name}" dihapus (item terkait tetap disimpan).`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari mata kuliah, kode, atau dosen..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
          />
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Mata Kuliah
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#3B82F6]/30 p-8 text-center">
          <BookMarked className="w-8 h-8 mx-auto text-[#3B82F6] mb-2" />
          <p className="font-display font-semibold text-slate-900 dark:text-[#EAF2FF]">
            Belum ada mata kuliah terdaftar
          </p>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Tambahkan mata kuliah Semester {store.academic_profile.semester} milikmu agar otomatis tersedia di Jadwal, Tugas, Catatan, dan Dokumen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((sub) => {
            const linked = countLinkedItems(sub);
            return (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101B32]/80 p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8]">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span className="font-mono-tabular">{sub.code || 'KODE-MK'}</span>
                      <span>·</span>
                      <span>{sub.credits} SKS</span>
                      <span>·</span>
                      <span>Sem {sub.semester}</span>
                    </div>
                    <h4 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF] mt-1 truncate">
                      {sub.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                      Dosen: {sub.lecturer || 'Belum diisi'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(sub)}
                      aria-label="Edit mata kuliah"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#3B82F6] cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(sub)}
                      aria-label="Hapus mata kuliah"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {sub.description && (
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] line-clamp-2">
                    {sub.description}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono-tabular pt-2 border-t border-slate-200 dark:border-white/10">
                  Terhubung: {linked.schedules} jadwal · {linked.assignments} tugas · {linked.notes} catatan · {linked.documents} dokumen
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Subject Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
                {editingId ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Nama Mata Kuliah *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Contoh: Struktur Data & Algoritma"
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Kode MK
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="TI-301"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Nama Dosen
                </label>
                <input
                  type="text"
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                  placeholder="Nama dosen pengampu"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Semester
                </label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={semester}
                  onChange={(e) => setSemester(Math.max(1, Number(e.target.value) || 3))}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF] font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  SKS / Credits
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={credits}
                  onChange={(e) => setCredits(Math.max(1, Number(e.target.value) || 3))}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF] font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Deskripsi Mata Kuliah
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ringkasan silabus atau fokus pembelajaran..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
                Warna Identitas Mata Kuliah
              </label>
              <div className="flex flex-wrap gap-2">
                {BLUE_SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-lg cursor-pointer transition-transform ${
                      color === c ? 'ring-2 ring-[#38BDF8] ring-offset-2 ring-offset-[#101B32] scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Pilih warna ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-sm text-slate-600 dark:text-[#94A3B8] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Safe Deletion Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
              Hapus Mata Kuliah &ldquo;{deleteTarget.name}&rdquo;?
            </h3>
            {(() => {
              const linked = countLinkedItems(deleteTarget);
              if (linked.total === 0) {
                return (
                  <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
                    Tidak ada jadwal, tugas, catatan, atau dokumen yang terhubung. Mata kuliah ini aman dihapus.
                  </p>
                );
              }
              return (
                <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
                  Ada <strong className="text-[#38BDF8]">{linked.total} data terhubung</strong> ({linked.schedules} jadwal, {linked.assignments} tugas, {linked.notes} catatan, {linked.documents} dokumen). Pilih cara penanganannya:
                </p>
              );
            })()}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-medium text-slate-600 dark:text-[#94A3B8] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(false)}
                className="px-4 py-2 rounded-xl border border-[#3B82F6]/50 text-[#3B82F6] dark:text-[#38BDF8] text-xs font-semibold cursor-pointer"
              >
                Hapus MK Saja (Simpan Data)
              </button>
              {countLinkedItems(deleteTarget).total > 0 && (
                <button
                  type="button"
                  onClick={() => confirmDelete(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Hapus MK &amp; Data Terhubung
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
