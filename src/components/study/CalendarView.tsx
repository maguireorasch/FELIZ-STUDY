import React, { useMemo, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  CalendarCategory,
  CalendarEvent,
  DayOfWeek,
  FelizStudyStore,
} from '../../types/study';

interface CalendarViewProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  onToast: (msg: string) => void;
}

const CATEGORIES: CalendarCategory[] = [
  'Class Schedule',
  'Assignment Deadline',
  'Study Session',
  'Exam',
  'Personal Reminder',
];

const JS_DAY_TO_INDO: Record<number, DayOfWeek | null> = {
  0: null,
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: null,
};

interface UnifiedCalItem {
  id: string;
  title: string;
  date: string;
  time: string;
  category: CalendarCategory;
  description?: string;
  reminderEnabled: boolean;
  isVirtual?: boolean;
  sourceEvent?: CalendarEvent;
}

export function CalendarView({ store, onUpdateStore, onToast }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryFilter, setCategoryFilter] = useState<'All' | CalendarCategory>('All');
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDay);
  const [time, setTime] = useState('09:00');
  const [category, setCategory] = useState<CalendarCategory>('Personal Reminder');
  const [description, setDescription] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();

  const monthCells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: { iso: string | null; num: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ iso: null, num: null });
    for (let d = 1; d <= totalDays; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ iso, num: d });
    }
    return cells;
  }, [year, month]);

  const weekDays = useMemo(() => {
    const base = new Date(`${selectedDay}T00:00:00`);
    const dayIdx = base.getDay();
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - dayIdx);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [selectedDay]);

  // Project schedules onto visible dates + combine Assignments + Study Sessions + Manual Calendar Events
  const visibleDatePool = useMemo(() => {
    const set = new Set<string>();
    monthCells.forEach((c) => c.iso && set.add(c.iso));
    weekDays.forEach((d) => set.add(d));
    set.add(selectedDay);
    return Array.from(set);
  }, [monthCells, weekDays, selectedDay]);

  const unifiedItems = useMemo(() => {
    const list: UnifiedCalItem[] = [];

    // 1. Manual calendar events
    store.calendar_events.forEach((ev) => {
      list.push({
        id: ev.id,
        title: ev.title,
        date: ev.date,
        time: ev.time,
        category: ev.category,
        description: ev.description,
        reminderEnabled: ev.reminderEnabled,
        sourceEvent: ev,
      });
    });

    // 2. Assignment Deadlines
    store.assignments.forEach((a) => {
      list.push({
        id: `sync-asg-${a.id}`,
        title: `Deadline: ${a.title}`,
        date: a.deadline.slice(0, 10),
        time: '23:59',
        category: 'Assignment Deadline',
        description: `${a.subjectName} · Status: ${a.status} (${a.progress}%)`,
        reminderEnabled: a.status !== 'Completed',
        isVirtual: true,
      });
    });

    // 3. Completed Study Sessions
    store.study_sessions.forEach((ses) => {
      list.push({
        id: `sync-ses-${ses.id}`,
        title: `Focus: ${ses.subjectName} (${ses.durationMinutes} mnt)`,
        date: ses.completedAt.slice(0, 10),
        time: ses.completedAt.slice(11, 16) || '00:00',
        category: 'Study Session',
        description: ses.notes || ses.mode,
        reminderEnabled: false,
        isVirtual: true,
      });
    });

    // 4. Recurring Mon-Fri Class Schedules projected onto visible dates
    if (store.schedules.length > 0) {
      visibleDatePool.forEach((iso) => {
        const wd = JS_DAY_TO_INDO[new Date(`${iso}T00:00:00`).getDay()];
        if (!wd) return;
        store.schedules
          .filter((sc) => sc.day === wd)
          .forEach((sc) => {
            list.push({
              id: `sync-sch-${sc.id}-${iso}`,
              title: sc.subjectName,
              date: iso,
              time: sc.startTime,
              category: 'Class Schedule',
              description: `${sc.startTime}–${sc.endTime} · ${sc.classroom || 'Ruang belum diisi'}`,
              reminderEnabled: true,
              isVirtual: true,
            });
          });
      });
    }

    return list
      .filter((item) => {
        if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            item.title.toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [
    store.calendar_events,
    store.assignments,
    store.study_sessions,
    store.schedules,
    visibleDatePool,
    categoryFilter,
    search,
  ]);

  const selectedDayItems = unifiedItems.filter((i) => i.date === selectedDay);

  const openAdd = (presetDate = selectedDay) => {
    setEditingId(null);
    setTitle('');
    setDate(presetDate);
    setTime('09:00');
    setCategory('Personal Reminder');
    setDescription('');
    setReminderEnabled(true);
    setShowModal(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setDate(ev.date);
    setTime(ev.time);
    setCategory(ev.category);
    setDescription(ev.description || '');
    setReminderEnabled(ev.reminderEnabled);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const now = new Date().toISOString();

    if (editingId) {
      onUpdateStore((prev) => ({
        ...prev,
        calendar_events: prev.calendar_events.map((ev) =>
          ev.id === editingId
            ? {
                ...ev,
                title: title.trim(),
                date,
                time,
                category,
                description: description.trim() || undefined,
                reminderEnabled,
                updatedAt: now,
              }
            : ev
        ),
      }));
      onToast('Agenda kalender diperbarui.');
    } else {
      const created: CalendarEvent = {
        id: `evt-${Date.now()}`,
        title: title.trim(),
        date,
        time,
        category,
        description: description.trim() || undefined,
        reminderEnabled,
        createdAt: now,
        updatedAt: now,
      };
      onUpdateStore((prev) => ({
        ...prev,
        calendar_events: [...prev.calendar_events, created],
      }));
      onToast('Agenda kalender ditambahkan.');
    }
    setSelectedDay(date);
    setShowModal(false);
  };

  const deleteEvent = (id: string) => {
    onUpdateStore((prev) => ({
      ...prev,
      calendar_events: prev.calendar_events.filter((ev) => ev.id !== id),
    }));
    onToast('Agenda dihapus.');
  };

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      onToast('Browser ini tidak mendukung Web Notification API.');
      return;
    }
    const perm = await Notification.requestPermission();
    const granted = perm === 'granted';
    onUpdateStore((prev) => ({
      ...prev,
      settings: { ...prev.settings, browserNotificationsGranted: granted },
    }));
    if (granted) {
      new Notification('FELIZ STUDY — Pengingat Aktif', {
        body: 'Notifikasi browser berhasil diizinkan untuk pengingat jadwal & deadline.',
      });
      onToast('Izin notifikasi browser aktif!');
    } else {
      onToast('Izin notifikasi ditolak oleh browser.');
    }
  };

  const monthLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(cursorDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            Academic Calendar &amp; Reminders
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
            Terhubung otomatis dengan My Schedule, Assignment Tracker, dan Study Focus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-white/10 p-1 bg-white dark:bg-[#101B32]">
            {(['monthly', 'weekly', 'daily'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                  viewMode === m
                    ? 'blue-gradient text-[#EAF2FF]'
                    : 'text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => openAdd(selectedDay)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      {/* Browser Notification Permission Notice */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#3B82F6]/30 bg-white dark:bg-[#14213A]/85 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-[#94A3B8]">
          <Bell className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
          <p>
            Pengingat browser menggunakan Web Notification API. Pengiriman notifikasi bergantung pada izin browser serta kondisi tab/browser yang terbuka.
          </p>
        </div>
        <button
          onClick={requestBrowserPermission}
          className="px-3.5 py-2 rounded-xl border border-[#3B82F6]/50 text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Aktifkan Notifikasi Browser
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jadwal, ujian, atau pengingat..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'All' | CalendarCategory)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
        >
          <option value="All">Semua Kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Main Surface */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg capitalize text-slate-900 dark:text-[#EAF2FF]">
              {viewMode === 'daily' ? selectedDay : monthLabel}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (viewMode === 'daily') {
                    const d = new Date(`${selectedDay}T00:00:00`);
                    d.setDate(d.getDate() - 1);
                    setSelectedDay(d.toISOString().slice(0, 10));
                  } else {
                    setCursorDate(new Date(year, month - 1, 1));
                  }
                }}
                aria-label="Sebelumnya"
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#38BDF8] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (viewMode === 'daily') {
                    const d = new Date(`${selectedDay}T00:00:00`);
                    d.setDate(d.getDate() + 1);
                    setSelectedDay(d.toISOString().slice(0, 10));
                  } else {
                    setCursorDate(new Date(year, month + 1, 1));
                  }
                }}
                aria-label="Berikutnya"
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#38BDF8] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'monthly' && (
            <>
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthCells.map((cell, idx) => {
                  if (!cell.iso) return <div key={`empty-${idx}`} className="h-20" />;
                  const items = unifiedItems.filter((i) => i.date === cell.iso);
                  const active = cell.iso === selectedDay;
                  return (
                    <button
                      key={cell.iso}
                      onClick={() => setSelectedDay(cell.iso!)}
                      className={`h-20 rounded-xl border p-1.5 text-left flex flex-col justify-between cursor-pointer ${
                        active
                          ? 'border-[#38BDF8] bg-[#2563EB]/15'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#070B14]/65 hover:border-[#3B82F6]'
                      }`}
                    >
                      <span
                        className={`text-xs font-mono-tabular font-semibold ${
                          active ? 'text-[#38BDF8]' : 'text-slate-800 dark:text-[#EAF2FF]'
                        }`}
                      >
                        {cell.num}
                      </span>
                      <div className="space-y-0.5 overflow-hidden">
                        {items.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="truncate text-[10px] px-1 py-0.5 rounded bg-[#2563EB]/20 text-[#2563EB] dark:text-[#EAF2FF]"
                          >
                            {ev.title}
                          </div>
                        ))}
                        {items.length > 2 && (
                          <div className="text-[10px] text-[#38BDF8] font-medium">
                            +{items.length - 2}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'weekly' && (
            <div className="space-y-2.5">
              {weekDays.map((dayIso) => {
                const dayItems = unifiedItems.filter((i) => i.date === dayIso);
                const label = new Intl.DateTimeFormat('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                }).format(new Date(`${dayIso}T00:00:00`));
                return (
                  <div
                    key={dayIso}
                    onClick={() => setSelectedDay(dayIso)}
                    className={`rounded-xl border p-3.5 cursor-pointer ${
                      dayIso === selectedDay
                        ? 'border-[#38BDF8] bg-[#2563EB]/10'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14]/65'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{label}</span>
                      <span className="text-xs font-mono-tabular text-slate-500 dark:text-[#94A3B8]">
                        {dayItems.length} item
                      </span>
                    </div>
                    {dayItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {dayItems.map((ev) => (
                          <span
                            key={ev.id}
                            className="text-xs px-2.5 py-1 rounded-lg bg-[#2563EB]/15 text-[#2563EB] dark:text-[#EAF2FF]"
                          >
                            {ev.time} · {ev.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'daily' && (
            <div className="space-y-2.5">
              {selectedDayItems.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-8 text-center">
                  Tidak ada acara atau jadwal pada tanggal {selectedDay}.
                </p>
              ) : (
                selectedDayItems.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101B32] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#38BDF8]">
                        {ev.time} · {ev.category}
                      </p>
                      <p className="font-semibold text-sm text-slate-900 dark:text-[#EAF2FF] mt-0.5">
                        {ev.title}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Day Details */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#38BDF8]">Detail Tanggal</p>
              <h3 className="font-display font-bold text-lg font-mono-tabular text-slate-900 dark:text-[#EAF2FF]">
                {selectedDay}
              </h3>
            </div>
            <button
              onClick={() => openAdd(selectedDay)}
              className="p-2 rounded-xl blue-gradient text-[#EAF2FF] cursor-pointer"
              aria-label="Tambah agenda pada tanggal ini"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {selectedDayItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
              Tidak ada agenda pada tanggal ini.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDayItems.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101B32] p-3.5 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                        {ev.category}
                      </p>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-[#EAF2FF] mt-0.5">
                        {ev.title}
                      </h4>
                    </div>
                    {!ev.isVirtual && ev.sourceEvent && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(ev.sourceEvent!)}
                          aria-label="Edit event"
                          className="p-1 text-slate-400 hover:text-[#38BDF8] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteEvent(ev.id)}
                          aria-label="Hapus event"
                          className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono-tabular">{ev.time}</span>
                    {ev.description && <span>· {ev.description}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
                {editingId ? 'Edit Agenda Akademik' : 'Tambah Agenda Akademik'}
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
                Judul Agenda *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Contoh: UTS Basis Data"
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Waktu
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CalendarCategory)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Catatan / Lokasi
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ruang ujian atau materi persiapan..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-[#EAF2FF] cursor-pointer">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="accent-[#3B82F6] w-4 h-4"
              />
              Tampilkan di Notification Center
            </label>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold cursor-pointer"
            >
              Simpan Agenda
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
