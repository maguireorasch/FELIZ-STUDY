import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Copy,
  Edit3,
  Eye,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ClassSchedule, DayOfWeek, FelizStudyStore } from '../../types/study';
import {
  BLUE_SUBJECT_COLORS,
  DAYS_OF_WEEK,
  getTodayDayOfWeek,
} from '../../lib/academicHelpers';

interface ScheduleViewProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  onToast: (msg: string) => void;
}

function hasOverlap(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function ScheduleView({ store, onUpdateStore, onToast }: ScheduleViewProps) {
  const todayDay = getTodayDayOfWeek();
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDay || 'Senin');
  const [dayFilter, setDayFilter] = useState<'All' | DayOfWeek>('All');
  const [search, setSearch] = useState('');

  // Form Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string>('');
  const [subjectName, setSubjectName] = useState('');
  const [lecturerName, setLecturerName] = useState('');
  const [day, setDay] = useState<DayOfWeek>('Senin');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [classroom, setClassroom] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(BLUE_SUBJECT_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  // Detail Modal
  const [detailItem, setDetailItem] = useState<ClassSchedule | null>(null);

  // Detect schedule conflicts across each day
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    for (const d of DAYS_OF_WEEK) {
      const dayItems = store.schedules.filter((s) => s.day === d);
      for (let i = 0; i < dayItems.length; i++) {
        for (let j = i + 1; j < dayItems.length; j++) {
          if (hasOverlap(dayItems[i], dayItems[j])) {
            ids.add(dayItems[i].id);
            ids.add(dayItems[j].id);
          }
        }
      }
    }
    return ids;
  }, [store.schedules]);

  const filteredSchedules = useMemo(() => {
    return store.schedules
      .filter((s) => {
        if (dayFilter !== 'All' && s.day !== dayFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            s.subjectName.toLowerCase().includes(q) ||
            s.lecturerName.toLowerCase().includes(q) ||
            s.classroom.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [store.schedules, dayFilter, search]);

  const openAdd = (presetDay: DayOfWeek = activeDay) => {
    setEditingId(null);
    const firstSub = store.subjects[0];
    setSubjectId(firstSub?.id || '');
    setSubjectName(firstSub?.name || '');
    setLecturerName(firstSub?.lecturer || '');
    setDay(presetDay);
    setStartTime('08:00');
    setEndTime('10:00');
    setClassroom('');
    setNotes('');
    setColor(firstSub?.color || BLUE_SUBJECT_COLORS[0]);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (item: ClassSchedule) => {
    setEditingId(item.id);
    setSubjectId(item.subjectId || '');
    setSubjectName(item.subjectName);
    setLecturerName(item.lecturerName);
    setDay(item.day);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setClassroom(item.classroom);
    setNotes(item.notes);
    setColor(item.color);
    setFormError(null);
    setShowModal(true);
  };

  const handlePickSubject = (id: string) => {
    setSubjectId(id);
    const found = store.subjects.find((s) => s.id === id);
    if (found) {
      setSubjectName(found.name);
      if (found.lecturer) setLecturerName(found.lecturer);
      setColor(found.color);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!subjectName.trim()) {
      setFormError('Nama mata kuliah wajib diisi.');
      return;
    }
    if (endTime <= startTime) {
      setFormError('Jam selesai (End Time) harus lebih besar dari jam mulai (Start Time).');
      return;
    }

    const collisions = store.schedules.filter(
      (s) =>
        s.id !== editingId &&
        s.day === day &&
        hasOverlap({ startTime, endTime }, { startTime: s.startTime, endTime: s.endTime })
    );

    const now = new Date().toISOString();
    if (editingId) {
      onUpdateStore((prev) => ({
        ...prev,
        schedules: prev.schedules.map((s) =>
          s.id === editingId
            ? {
                ...s,
                subjectId: subjectId || undefined,
                subjectName: subjectName.trim(),
                lecturerName: lecturerName.trim(),
                day,
                startTime,
                endTime,
                classroom: classroom.trim(),
                notes: notes.trim(),
                color,
                updatedAt: now,
              }
            : s
        ),
      }));
      onToast(
        collisions.length > 0
          ? `Jadwal diperbarui, namun bertabrakan dengan ${collisions[0].subjectName}!`
          : 'Jadwal kuliah diperbarui.'
      );
    } else {
      const created: ClassSchedule = {
        id: `sch-${Date.now()}`,
        subjectId: subjectId || undefined,
        subjectName: subjectName.trim(),
        lecturerName: lecturerName.trim(),
        day,
        startTime,
        endTime,
        classroom: classroom.trim(),
        notes: notes.trim(),
        color,
        createdAt: now,
        updatedAt: now,
      };
      onUpdateStore((prev) => ({
        ...prev,
        schedules: [...prev.schedules, created],
      }));
      onToast(
        collisions.length > 0
          ? `Jadwal disimpan dengan peringatan bentrok terhadap ${collisions[0].subjectName}!`
          : 'Jadwal kuliah ditambahkan.'
      );
    }
    setActiveDay(day);
    setShowModal(false);
  };

  const duplicateItem = (item: ClassSchedule) => {
    const now = new Date().toISOString();
    const copy: ClassSchedule = {
      ...item,
      id: `sch-${Date.now()}`,
      subjectName: `${item.subjectName} (Salinan)`,
      createdAt: now,
      updatedAt: now,
    };
    onUpdateStore((prev) => ({
      ...prev,
      schedules: [...prev.schedules, copy],
    }));
    onToast('Jadwal berhasil diduplikasi.');
  };

  const deleteItem = (id: string) => {
    onUpdateStore((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((s) => s.id !== id),
    }));
    if (detailItem?.id === id) setDetailItem(null);
    onToast('Jadwal dihapus.');
  };

  const renderScheduleCard = (item: ClassSchedule) => {
    const isConflict = conflictIds.has(item.id);
    const isToday = todayDay === item.day;

    return (
      <div
        key={item.id}
        className={`rounded-xl border p-3.5 space-y-2 transition-all ${
          isConflict
            ? 'border-amber-500/70 bg-amber-500/10'
            : isToday
              ? 'border-[#38BDF8]/50 bg-slate-50 dark:bg-[#101B32]'
              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101B32]/80'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-mono-tabular font-semibold text-[#2563EB] dark:text-[#38BDF8]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span>
                {item.startTime} – {item.endTime}
              </span>
            </div>
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-[#EAF2FF] mt-1 truncate">
              {item.subjectName}
            </h4>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-[#94A3B8] space-y-0.5">
          <p className="truncate">{item.lecturerName || 'Dosen belum diisi'}</p>
          <p className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {item.classroom || 'Ruang belum diisi'}
          </p>
        </div>

        {isConflict && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Bentrok waktu pada hari {item.day}
          </div>
        )}

        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={() => setDetailItem(item)}
            aria-label="Lihat detail jadwal"
            title="View Details"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#38BDF8] cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openEdit(item)}
            aria-label="Edit jadwal"
            title="Edit Schedule"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#3B82F6] cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => duplicateItem(item)}
            aria-label="Duplikasi jadwal"
            title="Duplicate Schedule"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#38BDF8] cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteItem(item.id)}
            aria-label="Hapus jadwal"
            title="Delete Schedule"
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            My Schedule
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
            Jadwal kuliah mingguan (Senin – Jumat) dengan deteksi bentrok otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-white/10 p-1 bg-white dark:bg-[#101B32]">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                viewMode === 'weekly'
                  ? 'blue-gradient text-[#EAF2FF]'
                  : 'text-slate-600 dark:text-[#94A3B8]'
              }`}
            >
              Weekly View
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                viewMode === 'daily'
                  ? 'blue-gradient text-[#EAF2FF]'
                  : 'text-slate-600 dark:text-[#94A3B8]'
              }`}
            >
              Daily View
            </button>
          </div>

          <button
            onClick={() => openAdd(activeDay)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Schedule
          </button>
        </div>
      </div>

      {/* Conflict Alert Banner */}
      {conflictIds.size > 0 && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3.5 flex items-center gap-2.5 text-xs sm:text-sm text-amber-600 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Terdeteksi tabrakan jadwal kuliah pada hari yang sama. Periksa kartu yang ditandai peringatan bentrok.
          </span>
        </div>
      )}

      {/* Search & Filter */}
      {store.schedules.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari mata kuliah, dosen, atau ruang kelas..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
            />
          </div>
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value as 'All' | DayOfWeek)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
          >
            <option value="All">Semua Hari (Senin – Jumat)</option>
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mandatory Empty State on First Use */}
      {store.schedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#3B82F6]/35 bg-white dark:bg-[#14213A]/70 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-[#3B82F6]" />
          <h3 className="text-xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            Your schedule is empty.
          </h3>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
            Start organizing your academic week.
          </p>
          <div className="pt-2">
            <button
              onClick={() => openAdd('Senin')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow cursor-pointer"
            >
              + Add Your First Schedule
            </button>
          </div>
        </div>
      ) : viewMode === 'weekly' ? (
        <>
          {/* Mobile Day Tabs (Senin - Jumat) */}
          <div className="flex lg:hidden gap-1.5 overflow-x-auto pb-1">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  activeDay === d
                    ? 'blue-gradient text-[#EAF2FF]'
                    : 'bg-white dark:bg-[#14213A] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#EAF2FF]'
                }`}
              >
                {d} {todayDay === d ? '(Hari Ini)' : ''}
              </button>
            ))}
          </div>

          {/* Mobile Single Active Column */}
          <div className="lg:hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
                {activeDay}
              </h3>
              <button
                onClick={() => openAdd(activeDay)}
                className="text-xs font-semibold text-[#38BDF8] cursor-pointer"
              >
                + Tambah
              </button>
            </div>
            {filteredSchedules.filter((s) => s.day === activeDay).length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] py-4 text-center">
                Belum ada kelas pada hari {activeDay}.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredSchedules.filter((s) => s.day === activeDay).map(renderScheduleCard)}
              </div>
            )}
          </div>

          {/* Desktop 5-Column Timetable */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-4">
            {DAYS_OF_WEEK.map((d) => {
              const items = filteredSchedules.filter((s) => s.day === d);
              const isToday = todayDay === d;
              return (
                <div
                  key={d}
                  className={`rounded-2xl border p-4 space-y-3 flex flex-col ${
                    isToday
                      ? 'border-[#38BDF8]/60 bg-white dark:bg-[#14213A]'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/80'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                    <div>
                      <h3 className="font-display font-bold text-sm text-slate-900 dark:text-[#EAF2FF]">
                        {d}
                      </h3>
                      {isToday && (
                        <p className="text-[11px] font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                          Hari Ini
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => openAdd(d)}
                      aria-label={`Tambah jadwal ${d}`}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#101B32] text-[#2563EB] dark:text-[#38BDF8] hover:bg-[#3B82F6]/20 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] py-6 text-center">
                      Kosong
                    </p>
                  ) : (
                    <div className="space-y-2.5">{items.map(renderScheduleCard)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Daily View */
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  activeDay === d
                    ? 'blue-gradient text-[#EAF2FF]'
                    : 'bg-white dark:bg-[#14213A] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#EAF2FF]'
                }`}
              >
                {d} {todayDay === d ? '· Hari Ini' : ''}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.filter((s) => s.day === activeDay).length === 0 ? (
              <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/80 p-8 text-center text-sm text-slate-500 dark:text-[#94A3B8]">
                Tidak ada kelas terjadwal pada hari {activeDay}.
              </div>
            ) : (
              filteredSchedules.filter((s) => s.day === activeDay).map(renderScheduleCard)
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
                {editingId ? 'Edit Jadwal Kuliah' : 'Tambah Jadwal Kuliah'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-500">
                {formError}
              </div>
            )}

            {store.subjects.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Pilih dari Daftar Mata Kuliah (Opsional)
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => handlePickSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                >
                  <option value="">-- Isi manual atau pilih MK --</option>
                  {store.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Subject Name *
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
                  Lecturer Name
                </label>
                <input
                  type="text"
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  placeholder="Nama dosen"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Day
                </label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value as DayOfWeek)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF] font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF] font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Classroom
              </label>
              <input
                type="text"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                placeholder="Contoh: Lab Komputasi 2 / Gedung B 304"
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Link grup kelas, aturan absensi, atau perlengkapan praktikum..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
                Subject Color
              </label>
              <div className="flex flex-wrap gap-2">
                {BLUE_SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-lg cursor-pointer ${
                      color === c ? 'ring-2 ring-[#38BDF8] ring-offset-2 ring-offset-[#101B32]' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Warna ${c}`}
                  />
                ))}
              </div>
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
                {editingId ? 'Simpan Perubahan' : 'Add Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[#38BDF8]">
                  {detailItem.day} · {detailItem.startTime} – {detailItem.endTime}
                </p>
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-[#EAF2FF] mt-1">
                  {detailItem.subjectName}
                </h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-700 dark:text-[#94A3B8]">
              <p>
                <strong className="text-slate-900 dark:text-[#EAF2FF]">Dosen:</strong>{' '}
                {detailItem.lecturerName || '-'}
              </p>
              <p>
                <strong className="text-slate-900 dark:text-[#EAF2FF]">Ruang Kelas:</strong>{' '}
                {detailItem.classroom || '-'}
              </p>
              <p>
                <strong className="text-slate-900 dark:text-[#EAF2FF]">Catatan:</strong>{' '}
                {detailItem.notes || 'Tidak ada catatan tambahan.'}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const target = detailItem;
                  setDetailItem(null);
                  openEdit(target);
                }}
                className="px-4 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
              >
                Edit Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
