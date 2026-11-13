import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  Paperclip,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  Assignment,
  AssignmentAttachment,
  AssignmentPriority,
  AssignmentStatus,
  FelizStudyStore,
} from '../../types/study';
import { getDeadlineIndicator } from '../../lib/academicHelpers';
import {
  fileToDataUrl,
  getBlobFromIdb,
  saveBlobToIdb,
  triggerDataUrlDownload,
} from '../../lib/studyIndexedDb';

interface AssignmentsViewProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  onToast: (msg: string) => void;
}

const PRIORITIES: AssignmentPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES: AssignmentStatus[] = ['To Do', 'In Progress', 'Completed'];

export function AssignmentsView({ store, onUpdateStore, onToast }: AssignmentsViewProps) {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | AssignmentPriority>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | AssignmentStatus>('All');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [deadline, setDeadline] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<AssignmentPriority>('Medium');
  const [status, setStatus] = useState<AssignmentStatus>('To Do');
  const [progress, setProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<AssignmentAttachment | undefined>();

  const subjectNames = useMemo(() => {
    const set = new Set<string>();
    store.subjects.forEach((s) => set.add(s.name));
    store.assignments.forEach((a) => {
      if (a.subjectName) set.add(a.subjectName);
    });
    return Array.from(set);
  }, [store.subjects, store.assignments]);

  const filtered = useMemo(() => {
    return store.assignments
      .filter((a) => {
        if (subjectFilter !== 'All' && a.subjectName !== subjectFilter) return false;
        if (priorityFilter !== 'All' && a.priority !== priorityFilter) return false;
        if (statusFilter !== 'All' && a.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            a.title.toLowerCase().includes(q) ||
            a.subjectName.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [store.assignments, subjectFilter, priorityFilter, statusFilter, search]);

  const openAdd = () => {
    setEditingId(null);
    const firstSub = store.subjects[0];
    setTitle('');
    setSubjectId(firstSub?.id || '');
    setSubjectName(firstSub?.name || '');
    setLecturer(firstSub?.lecturer || '');
    setDescription('');
    setAssignedDate(new Date().toISOString().slice(0, 10));
    setDeadline(new Date().toISOString().slice(0, 10));
    setPriority('Medium');
    setStatus('To Do');
    setProgress(0);
    setPendingFile(null);
    setExistingAttachment(undefined);
    setShowModal(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingId(a.id);
    setTitle(a.title);
    setSubjectId(a.subjectId || '');
    setSubjectName(a.subjectName);
    setLecturer(a.lecturer);
    setDescription(a.description);
    setAssignedDate(a.assignedDate);
    setDeadline(a.deadline);
    setPriority(a.priority);
    setStatus(a.status);
    setProgress(a.progress);
    setPendingFile(null);
    setExistingAttachment(a.attachment);
    setShowModal(true);
  };

  const handleSubjectPick = (id: string) => {
    setSubjectId(id);
    const found = store.subjects.find((s) => s.id === id);
    if (found) {
      setSubjectName(found.name);
      if (found.lecturer) setLecturer(found.lecturer);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let attachment = existingAttachment;
    if (pendingFile) {
      const dataUrl = await fileToDataUrl(pendingFile);
      const blobId = `blob-asg-${Date.now()}`;
      await saveBlobToIdb({
        id: blobId,
        name: pendingFile.name,
        mimeType: pendingFile.type || 'application/octet-stream',
        dataUrl,
        savedAt: Date.now(),
      });
      attachment = {
        blobId,
        fileName: pendingFile.name,
        mimeType: pendingFile.type || 'application/octet-stream',
        sizeBytes: pendingFile.size,
      };
    }

    const now = new Date().toISOString();
    const finalProgress = status === 'Completed' ? 100 : progress;

    if (editingId) {
      onUpdateStore((prev) => ({
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === editingId
            ? {
                ...a,
                title: title.trim(),
                subjectId: subjectId || undefined,
                subjectName: subjectName.trim() || 'Umum',
                lecturer: lecturer.trim(),
                description: description.trim(),
                assignedDate,
                deadline,
                priority,
                status,
                progress: finalProgress,
                attachment,
                updatedAt: now,
              }
            : a
        ),
      }));
      onToast('Tugas diperbarui.');
    } else {
      const created: Assignment = {
        id: `asg-${Date.now()}`,
        title: title.trim(),
        subjectId: subjectId || undefined,
        subjectName: subjectName.trim() || 'Umum',
        lecturer: lecturer.trim(),
        description: description.trim(),
        assignedDate,
        deadline,
        priority,
        status,
        progress: finalProgress,
        attachment,
        createdAt: now,
        updatedAt: now,
      };
      onUpdateStore((prev) => ({
        ...prev,
        assignments: [created, ...prev.assignments],
      }));
      onToast('Tugas baru ditambahkan.');
    }
    setShowModal(false);
  };

  const markCompleted = (id: string) => {
    onUpdateStore((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === 'Completed' ? 'In Progress' : 'Completed',
              progress: a.status === 'Completed' ? 50 : 100,
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    }));
    onToast('Status tugas diperbarui.');
  };

  const updateProgress = (id: string, nextVal: number) => {
    onUpdateStore((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a.id === id
          ? {
              ...a,
              progress: nextVal,
              status: nextVal === 100 ? 'Completed' : nextVal > 0 ? 'In Progress' : 'To Do',
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    }));
  };

  const deleteAssignment = (id: string) => {
    onUpdateStore((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((a) => a.id !== id),
    }));
    if (selectedAssignment?.id === id) setSelectedAssignment(null);
    onToast('Tugas dihapus.');
  };

  const downloadAttachment = async (att: AssignmentAttachment) => {
    const blob = await getBlobFromIdb(att.blobId);
    if (!blob) {
      onToast('File lampiran tidak ditemukan di IndexedDB.');
      return;
    }
    triggerDataUrlDownload(blob.dataUrl, att.fileName);
  };

  // Detail Page View
  if (selectedAssignment) {
    const live =
      store.assignments.find((a) => a.id === selectedAssignment.id) || selectedAssignment;
    const ind = getDeadlineIndicator(live);

    return (
      <div className="space-y-6 max-w-3xl">
        <button
          onClick={() => setSelectedAssignment(null)}
          className="text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] hover:underline cursor-pointer"
        >
          &larr; Kembali ke Daftar Tugas
        </button>

        <div className="rounded-2xl border border-slate-200 dark:border-[#3B82F6]/35 bg-white dark:bg-[#14213A]/90 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#2563EB] dark:text-[#38BDF8] font-semibold">
                {live.subjectName} · {ind.label} · Prioritas {live.priority}
              </p>
              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-[#EAF2FF] mt-1">
                {live.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
                Dosen: {live.lecturer || '-'} · Diberikan: {live.assignedDate} · Deadline:{' '}
                <span className="font-mono-tabular">{live.deadline}</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => openEdit(live)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-semibold cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => markCompleted(live.id)}
                className="px-3.5 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
              >
                {live.status === 'Completed' ? 'Tandai Belum Selesai' : 'Mark as Completed'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-[#94A3B8]">Progress Pengerjaan</span>
              <span className="font-mono-tabular font-semibold text-[#38BDF8]">
                {live.progress}% ({live.status})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={live.progress}
              onChange={(e) => updateProgress(live.id, Number(e.target.value))}
              className="w-full accent-[#3B82F6]"
            />
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#101B32] border border-slate-200 dark:border-white/10 p-4">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5">
              Deskripsi Tugas
            </h4>
            <p className="text-sm text-slate-800 dark:text-[#EAF2FF] whitespace-pre-line">
              {live.description || 'Tidak ada deskripsi tambahan.'}
            </p>
          </div>

          {live.attachment && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#101B32] border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-[#EAF2FF]">
                <Paperclip className="w-4 h-4 text-[#38BDF8]" />
                <span>{live.attachment.fileName}</span>
              </div>
              <button
                onClick={() => downloadAttachment(live.attachment!)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Lampiran
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            Assignment Tracker
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
            Pantau tugas kuliah, prioritas, progres pengerjaan, dan indikator deadline otomatis.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau deskripsi tugas..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
        >
          <option value="All">Semua Mata Kuliah</option>
          {subjectNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'All' | AssignmentPriority)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
        >
          <option value="All">Semua Prioritas</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'All' | AssignmentStatus)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
        >
          <option value="All">Semua Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Assignments List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#3B82F6]/35 bg-white dark:bg-[#14213A]/70 p-12 text-center space-y-3">
          <Clock className="w-10 h-10 mx-auto text-[#3B82F6]" />
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            {store.assignments.length === 0
              ? 'Belum ada tugas kuliah'
              : 'Tidak ada tugas yang cocok dengan filter'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
            Tambahkan tugas praktikum, makalah, atau proyek agar deadline terpantau di kalender dan dashboard.
          </p>
          {store.assignments.length === 0 && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold cursor-pointer"
            >
              + Tambah Tugas Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((a) => {
            const ind = getDeadlineIndicator(a);
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        <span>{a.subjectName}</span>
                        <span> · </span>
                        <span
                          className={
                            ind.tone === 'overdue'
                              ? 'text-amber-400 font-semibold'
                              : ind.tone === 'today' || ind.tone === 'tomorrow'
                                ? 'text-[#38BDF8] font-semibold'
                                : ind.tone === 'completed'
                                  ? 'text-emerald-400 font-semibold'
                                  : ''
                          }
                        >
                          {ind.label}
                        </span>
                        <span> · </span>
                        <span>Prioritas {a.priority}</span>
                      </p>
                      <h3
                        onClick={() => setSelectedAssignment(a)}
                        className={`font-display font-bold text-base mt-1 cursor-pointer hover:text-[#38BDF8] ${
                          a.status === 'Completed'
                            ? 'line-through text-slate-400 dark:text-[#94A3B8]'
                            : 'text-slate-900 dark:text-[#EAF2FF]'
                        }`}
                      >
                        {a.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => markCompleted(a.id)}
                      aria-label="Tandai selesai"
                      className={`p-1.5 rounded-lg cursor-pointer shrink-0 ${
                        a.status === 'Completed'
                          ? 'text-emerald-400'
                          : 'text-slate-400 hover:text-[#38BDF8]'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>

                  {a.description && (
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8] line-clamp-2">
                      {a.description}
                    </p>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
                      <span>{a.status}</span>
                      <span className="font-mono-tabular">
                        {a.progress}% · Deadline {a.deadline.slice(0, 10)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-[#070B14] overflow-hidden">
                      <div
                        className="h-full blue-gradient transition-all"
                        style={{ width: `${a.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => setSelectedAssignment(a)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detail Tugas
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(a)}
                      aria-label="Edit tugas"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#3B82F6] cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteAssignment(a.id)}
                      aria-label="Hapus tugas"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
                {editingId ? 'Edit Tugas' : 'Tambah Tugas Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Assignment Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Judul tugas / laporan / proyek"
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            {store.subjects.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Pilih Mata Kuliah Terdaftar
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => handleSubjectPick(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                >
                  <option value="">-- Isi manual --</option>
                  {store.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  required
                  placeholder="Nama mata kuliah"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Lecturer
                </label>
                <input
                  type="text"
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                  placeholder="Nama dosen"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instruksi tugas, format pengumpulan, atau catatan kelompok..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Assigned Date
                </label>
                <input
                  type="date"
                  value={assignedDate}
                  onChange={(e) => setAssignedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF] font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Deadline *
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF] font-mono-tabular"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AssignmentPriority)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const next = e.target.value as AssignmentStatus;
                    setStatus(next);
                    if (next === 'Completed') setProgress(100);
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-[#94A3B8] mb-1">
                <span>Progress Pengerjaan</span>
                <span className="font-mono-tabular">{progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-[#3B82F6]"
              />
            </div>

            <div>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-medium text-slate-700 dark:text-[#EAF2FF] cursor-pointer hover:border-[#3B82F6]">
                <Paperclip className="w-4 h-4 text-[#38BDF8]" />
                {pendingFile
                  ? pendingFile.name
                  : existingAttachment
                    ? `Lampiran: ${existingAttachment.fileName}`
                    : 'Upload Attachment (IndexedDB)'}
                <input
                  type="file"
                  onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-sm text-slate-600 dark:text-[#94A3B8] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold cursor-pointer"
              >
                Simpan Tugas
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
