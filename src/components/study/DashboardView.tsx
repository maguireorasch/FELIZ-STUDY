import React, { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Flame,
  FolderUp,
  NotebookPen,
  Plus,
  Sparkles,
  Timer,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FelizStudyStore, StudyNavTab } from '../../types/study';
import { STUDY_HERO_IMAGE } from '../../lib/studyStorage';
import {
  calculateStudyStreakDays,
  computeLiveRecommendations,
  getDeadlineIndicator,
  getTodayDayOfWeek,
  getWeeklyStudyChartData,
} from '../../lib/academicHelpers';

interface DashboardViewProps {
  store: FelizStudyStore;
  onNavigate: (tab: StudyNavTab) => void;
  onQuickAction: (action: 'schedule' | 'assignment' | 'focus' | 'note' | 'document' | 'ai') => void;
}

export function DashboardView({ store, onNavigate, onQuickAction }: DashboardViewProps) {
  const todayDay = getTodayDayOfWeek();

  const todaySchedules = useMemo(() => {
    if (!todayDay) return [];
    return store.schedules
      .filter((s) => s.day === todayDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [store.schedules, todayDay]);

  const pendingAssignments = useMemo(
    () =>
      store.assignments
        .filter((a) => a.status !== 'Completed')
        .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [store.assignments]
  );

  const completedAssignmentsCount = store.assignments.filter(
    (a) => a.status === 'Completed'
  ).length;

  const totalStudyMinutes = store.study_sessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaySessionsCount = store.study_sessions.filter(
    (s) => s.completedAt.slice(0, 10) === todayIso
  ).length;

  const streakDays = calculateStudyStreakDays(store);
  const weeklyChartData = useMemo(() => getWeeklyStudyChartData(store), [store]);

  const liveRecommendations = useMemo(() => {
    const savedPending = store.recommendations.filter((r) => r.status !== 'dismissed');
    if (savedPending.length > 0) return savedPending.slice(0, 2);
    return computeLiveRecommendations(store).slice(0, 2);
  }, [store]);

  const recentNotes = useMemo(
    () =>
      [...store.notes]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 3),
    [store.notes]
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner & Quick Actions */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-[#3B82F6]/30 bg-white dark:bg-[#101B32]">
        <img
          src={STUDY_HERO_IMAGE}
          alt="FELIZ STUDY Academic Workspace"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-15 dark:opacity-30 pointer-events-none"
        />
        <div className="relative p-6 sm:p-7 bg-gradient-to-r from-white/95 via-white/90 to-white/75 dark:from-[#070B14]/95 dark:via-[#101B32]/85 dark:to-[#101B32]/65 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <p className="text-xs font-accent font-semibold tracking-wider text-[#2563EB] dark:text-[#38BDF8]">
                {store.academic_profile.program} · Semester {store.academic_profile.semester} · TA{' '}
                {store.academic_profile.academicYear}
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF] text-balance">
                Welcome Back, {store.academic_profile.name || 'Student'}!
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
                Ready to make today productive? Kelola jadwal kuliah, tugas, catatan dosen, dan AI pendamping belajarmu dari satu ruang kerja.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onNavigate('settings')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#3B82F6]/40 bg-white/80 dark:bg-[#14213A]/80 text-xs font-semibold text-slate-800 dark:text-[#EAF2FF] hover:border-[#38BDF8] whitespace-nowrap cursor-pointer"
              >
                Atur Profil &amp; Mata Kuliah
              </button>
            </div>
          </div>

          {/* 6 Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {(
              [
                { id: 'schedule', label: 'Add Schedule', icon: Calendar },
                { id: 'assignment', label: 'Add Assignment', icon: Plus },
                { id: 'focus', label: 'Start Studying', icon: Timer },
                { id: 'note', label: 'Create Note', icon: NotebookPen },
                { id: 'document', label: 'Upload Material', icon: FolderUp },
                { id: 'ai', label: 'Ask AI', icon: Sparkles },
              ] as const
            ).map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.id}
                  onClick={() => onQuickAction(btn.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    btn.id === 'ai'
                      ? 'blue-gradient text-[#EAF2FF] blue-glow'
                      : 'bg-slate-100 dark:bg-[#14213A]/90 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-[#EAF2FF] hover:border-[#3B82F6]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* H. Academic Overview (Real User Metrics) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Mata Kuliah', value: store.subjects.length, icon: BookOpen },
          { label: 'Total Tugas', value: store.assignments.length, icon: CheckSquare },
          { label: 'Tugas Selesai', value: completedAssignmentsCount, icon: CheckSquare },
          { label: 'Total Jam Belajar', value: `${totalStudyHours} jam`, icon: Clock },
          { label: 'Total Catatan', value: store.notes.length, icon: FileText },
          { label: 'Study Streak', value: `${streakDays} hari`, icon: Flame },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
                <span className="truncate">{stat.label}</span>
                <Icon className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-display font-bold font-mono-tabular text-slate-900 dark:text-[#EAF2FF] mt-2">
                {stat.value}
              </p>
            </div>
          );
        })}
      </section>

      {/* Main Dashboard Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* A. Today's Schedule */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
                Today&apos;s Schedule
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                {todayDay ? `Jadwal hari ${todayDay}` : 'Akhir pekan (Senin–Jumat bebas kelas)'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('schedule')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] hover:underline cursor-pointer"
            >
              Kelola Jadwal <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySchedules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-[#3B82F6]/30 p-5 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-[#EAF2FF]">
                {store.schedules.length === 0
                  ? 'Jadwal kuliah masih kosong.'
                  : todayDay
                    ? `Tidak ada jadwal kuliah pada hari ${todayDay}.`
                    : 'Nikmati waktu akhir pekan untuk mengulas materi.'}
              </p>
              <button
                onClick={() => onNavigate('schedule')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Jadwal
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todaySchedules.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#101B32] border border-slate-200 dark:border-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: cls.color || '#3B82F6' }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-[#EAF2FF] truncate">
                        {cls.subjectName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                        {cls.classroom || 'Ruang belum diisi'} · {cls.lecturerName || 'Dosen belum diisi'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono-tabular font-semibold text-[#2563EB] dark:text-[#38BDF8] shrink-0">
                    {cls.startTime} – {cls.endTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* B & C. Upcoming Deadlines & Pending Assignments */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
                Upcoming Deadlines &amp; Pending Tasks
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                {pendingAssignments.length} tugas belum selesai
              </p>
            </div>
            <button
              onClick={() => onNavigate('assignments')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] hover:underline cursor-pointer"
            >
              Semua Tugas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingAssignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-[#3B82F6]/30 p-5 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-[#EAF2FF]">
                Belum ada tugas yang tertunda.
              </p>
              <button
                onClick={() => onNavigate('assignments')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Tugas Baru
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingAssignments.slice(0, 4).map((task) => {
                const ind = getDeadlineIndicator(task);
                return (
                  <div
                    key={task.id}
                    onClick={() => onNavigate('assignments')}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#101B32] border border-slate-200 dark:border-white/10 hover:border-[#3B82F6] cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-900 dark:text-[#EAF2FF] truncate">
                        {task.title}
                      </p>
                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          ind.tone === 'overdue'
                            ? 'text-amber-400'
                            : ind.tone === 'today'
                              ? 'text-[#38BDF8]'
                              : 'text-slate-500 dark:text-[#94A3B8]'
                        }`}
                      >
                        {ind.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
                      <span>
                        {task.subjectName || 'Umum'} · Prioritas {task.priority}
                      </span>
                      <span className="font-mono-tabular">{task.deadline.slice(0, 10)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* G. Weekly Productivity Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
                Weekly Study Productivity
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Aktivitas belajar 7 hari terakhir (dihitung dari Study Focus)
              </p>
            </div>
            <button
              onClick={() => onNavigate('progress')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] hover:underline cursor-pointer"
            >
              Statistik Lengkap <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  unit="m"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101B32',
                    border: '1px solid rgba(59,130,246,0.4)',
                    borderRadius: '12px',
                    color: '#EAF2FF',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="minutes" name="Menit Belajar" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* D & E. Study Focus & Quick Notes */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
                Study Focus Hari Ini
              </h3>
              <button
                onClick={() => onNavigate('focus')}
                className="text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] hover:underline cursor-pointer"
              >
                Buka Timer
              </button>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-display font-bold font-mono-tabular text-slate-900 dark:text-[#EAF2FF]">
                  {todaySessionsCount} / {store.settings.dailySessionTarget} sesi
                </p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Pomodoro default {store.settings.pomodoroFocusMinutes} menit
                </p>
              </div>
              <button
                onClick={() => onNavigate('focus')}
                className="px-4 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
              >
                Mulai Sesi
              </button>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-[#070B14] overflow-hidden">
              <div
                className="h-full blue-gradient transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (todaySessionsCount / Math.max(1, store.settings.dailySessionTarget)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
                Quick Notes
              </h3>
              <button
                onClick={() => onNavigate('notes')}
                className="text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] hover:underline cursor-pointer"
              >
                Semua Catatan
              </button>
            </div>
            {recentNotes.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Belum ada catatan materi kuliah. Klik &ldquo;Create Note&rdquo; untuk mulai menulis.
              </p>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => onNavigate('notes')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-[#101B32] border border-slate-200 dark:border-white/10 hover:border-[#3B82F6] cursor-pointer"
                  >
                    <p className="font-medium text-sm text-slate-900 dark:text-[#EAF2FF] truncate">
                      {note.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                      {note.subjectName || 'Umum'} · {note.date}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* F. AI Learning Recommendation */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#3B82F6]/30 bg-white dark:bg-[#14213A]/90 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#38BDF8]" />
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
                Smart AI Learning Recommendations
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Dihitung otomatis dari deadline tugas, mata kuliah, dan catatan aktual milikmu
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('ai')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Minta Rekomendasi Gemini AI
          </button>
        </div>

        {liveRecommendations.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
            Tambahkan mata kuliah, tugas, atau catatan materi agar sistem dapat menyusun rekomendasi prioritas belajarmu secara akurat.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101B32] p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs text-[#2563EB] dark:text-[#38BDF8] font-medium">
                  <span>{rec.recommendedSubject}</span>
                  <span className="font-mono-tabular">
                    {rec.suggestedDurationMinutes} menit · {rec.priority}
                  </span>
                </div>
                <h4 className="font-display font-semibold text-sm text-slate-900 dark:text-[#EAF2FF]">
                  {rec.recommendedTopic}
                </h4>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{rec.reason}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
