import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Square,
  Timer,
} from 'lucide-react';
import { FelizStudyStore, StudySession } from '../../types/study';
import { getWeeklyStudyChartData } from '../../lib/academicHelpers';

interface StudyFocusViewProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  onToast: (msg: string) => void;
}

type FocusMode = StudySession['mode'];

export function StudyFocusView({ store, onUpdateStore, onToast }: StudyFocusViewProps) {
  const [mode, setMode] = useState<FocusMode>('Pomodoro');
  const [customMinutes, setCustomMinutes] = useState(40);
  const [selectedSubjectId, setSelectedSubjectId] = useState(store.subjects[0]?.id || '');
  const [customSubjectName, setCustomSubjectName] = useState(store.subjects[0]?.name || 'Umum');
  const [targetSessions, setTargetSessions] = useState(store.settings.dailySessionTarget || 4);
  const [sessionNotes, setSessionNotes] = useState('');

  const modeDurationMinutes = (m: FocusMode): number => {
    switch (m) {
      case 'Pomodoro':
        return store.settings.pomodoroFocusMinutes || 25;
      case 'Focus Session':
        return 50;
      case 'Short Break':
        return store.settings.shortBreakMinutes || 5;
      case 'Long Break':
        return store.settings.longBreakMinutes || 15;
      case 'Custom Timer':
        return Math.max(1, customMinutes);
    }
  };

  const totalDurationSec = modeDurationMinutes(mode) * 60;
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [remainingSec, setRemainingSec] = useState(totalDurationSec);

  // Wall-clock deadline timestamp to guarantee zero drift across renders/tabs
  const endTimestampRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);

  // Sync default duration when idle and settings/mode change
  useEffect(() => {
    if (status === 'idle') {
      setRemainingSec(modeDurationMinutes(mode) * 60);
    }
  }, [
    mode,
    customMinutes,
    store.settings.pomodoroFocusMinutes,
    store.settings.shortBreakMinutes,
    store.settings.longBreakMinutes,
    status,
  ]);

  const recordCompletedSession = (elapsedMinutes: number) => {
    const chosenSubject =
      store.subjects.find((s) => s.id === selectedSubjectId)?.name ||
      customSubjectName.trim() ||
      'Umum';

    const session: StudySession = {
      id: `ses-${Date.now()}`,
      subjectId: selectedSubjectId || undefined,
      subjectName: chosenSubject,
      mode,
      durationMinutes: Math.max(1, elapsedMinutes),
      targetSessions,
      notes: sessionNotes.trim(),
      completedAt: new Date().toISOString(),
    };

    onUpdateStore((prev) => ({
      ...prev,
      study_sessions: [session, ...prev.study_sessions],
    }));

    if (
      store.settings.notificationsEnabled &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('FELIZ STUDY — Sesi Fokus Selesai', {
          body: `${mode} (${session.durationMinutes} menit) untuk ${chosenSubject} telah tercatat.`,
        });
      } catch {
        // ignore notification errors in restricted contexts
      }
    }
  };

  useEffect(() => {
    if (status !== 'running') return;
    const intervalId = window.setInterval(() => {
      if (!endTimestampRef.current) return;
      const diffSec = Math.max(0, Math.ceil((endTimestampRef.current - Date.now()) / 1000));
      setRemainingSec(diffSec);
      if (diffSec <= 0) {
        window.clearInterval(intervalId);
        endTimestampRef.current = null;
        setStatus('completed');
        recordCompletedSession(modeDurationMinutes(mode));
        onToast(`${mode} selesai! Pilih lanjut belajar atau istirahat.`);
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [status, mode]);

  const handleStart = () => {
    const secs = modeDurationMinutes(mode) * 60;
    setRemainingSec(secs);
    startTimestampRef.current = Date.now();
    endTimestampRef.current = Date.now() + secs * 1000;
    setStatus('running');
  };

  const handlePause = () => {
    if (endTimestampRef.current) {
      const diffSec = Math.max(0, Math.ceil((endTimestampRef.current - Date.now()) / 1000));
      setRemainingSec(diffSec);
    }
    endTimestampRef.current = null;
    setStatus('paused');
  };

  const handleResume = () => {
    endTimestampRef.current = Date.now() + remainingSec * 1000;
    setStatus('running');
  };

  const handleReset = () => {
    endTimestampRef.current = null;
    startTimestampRef.current = null;
    setStatus('idle');
    setRemainingSec(modeDurationMinutes(mode) * 60);
  };

  const handleFinishEarly = () => {
    const elapsedSec = Math.max(60, totalDurationSec - remainingSec);
    const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));
    endTimestampRef.current = null;
    startTimestampRef.current = null;
    setStatus('idle');
    setRemainingSec(modeDurationMinutes(mode) * 60);
    recordCompletedSession(elapsedMin);
    onToast(`Sesi fokus ${elapsedMin} menit disimpan ke riwayat.`);
  };

  const switchMode = (next: FocusMode) => {
    endTimestampRef.current = null;
    setStatus('idle');
    setMode(next);
  };

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');
  const progressRatio =
    totalDurationSec > 0 ? Math.max(0, Math.min(1, 1 - remainingSec / totalDurationSec)) : 0;

  // SVG Ring math
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaySessions = store.study_sessions.filter(
    (s) => s.completedAt.slice(0, 10) === todayIso
  );
  const totalStudyMinutes = store.study_sessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const weeklyStats = useMemo(() => getWeeklyStudyChartData(store), [store]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
          Study Focus Timer
        </h2>
        <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
          Timer belajar presisi tinggi dengan progress ring biru, catatan sesi, dan pencatatan waktu otomatis.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap gap-2">
        {(
          ['Pomodoro', 'Focus Session', 'Short Break', 'Long Break', 'Custom Timer'] as FocusMode[]
        ).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              mode === m
                ? 'blue-gradient text-[#EAF2FF] blue-glow'
                : 'bg-white dark:bg-[#14213A] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#EAF2FF]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Circular Timer */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#3B82F6]/30 bg-white dark:bg-[#14213A]/90 p-6 sm:p-8 flex flex-col items-center justify-center space-y-6">
          <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="w-64 h-64 -rotate-90" viewBox="0 0 240 240">
              <circle
                cx="120"
                cy="120"
                r={radius}
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                className="text-slate-200 dark:text-[#101B32]"
              />
              <circle
                cx="120"
                cy="120"
                r={radius}
                stroke="url(#blueTimerGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="blueTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-accent font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                {mode}
              </span>
              <span className="text-5xl font-display font-bold font-mono-tabular text-slate-900 dark:text-[#EAF2FF] mt-1">
                {mm}:{ss}
              </span>
              <span className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
                {status === 'running'
                  ? 'Sedang Berjalan'
                  : status === 'paused'
                    ? 'Dijeda'
                    : status === 'completed'
                      ? 'Selesai!'
                      : 'Siap Dimulai'}
              </span>
            </div>
          </div>

          {mode === 'Custom Timer' && status === 'idle' && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-600 dark:text-[#94A3B8]">
                Durasi Kustom (menit):
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-1.5 text-sm font-mono-tabular text-center"
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {status === 'idle' && (
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl blue-gradient text-[#EAF2FF] font-semibold text-sm blue-glow cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Start
              </button>
            )}

            {status === 'running' && (
              <>
                <button
                  onClick={handlePause}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-500 font-semibold text-sm cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={handleFinishEarly}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl blue-gradient text-[#EAF2FF] font-semibold text-sm cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Finish
                </button>
              </>
            )}

            {status === 'paused' && (
              <>
                <button
                  onClick={handleResume}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl blue-gradient text-[#EAF2FF] font-semibold text-sm cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume
                </button>
                <button
                  onClick={handleFinishEarly}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Finish
                </button>
              </>
            )}

            {status !== 'idle' && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-[#EAF2FF] text-sm font-medium cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>

          {status === 'completed' && (
            <div className="w-full rounded-xl border border-[#38BDF8]/50 bg-[#163A70]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-[#EAF2FF]">
                  Sesi {mode} Selesai!
                </p>
                <p className="text-xs text-[#94A3B8]">
                  Pilih untuk melanjutkan sesi fokus atau mengambil jeda istirahat.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => switchMode('Short Break')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#38BDF8]/50 text-[#38BDF8] text-xs font-semibold cursor-pointer"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  Istirahat ({store.settings.shortBreakMinutes}m)
                </button>
                <button
                  onClick={() => {
                    switchMode('Pomodoro');
                    setTimeout(handleStart, 50);
                  }}
                  className="px-3 py-2 rounded-lg blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
                >
                  Lanjut Fokus
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Session Setup & Stats */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
              Konfigurasi Sesi Belajar
            </h3>

            {store.subjects.length > 0 ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Mata Kuliah
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const found = store.subjects.find((s) => s.id === e.target.value);
                    if (found) setCustomSubjectName(found.name);
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                >
                  <option value="">Belajar Umum</option>
                  {store.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Topik / Mata Kuliah
                </label>
                <input
                  type="text"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  placeholder="Contoh: Struktur Data"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Target Sesi Hari Ini
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={targetSessions}
                onChange={(e) => setTargetSessions(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Catatan Sesi Belajar
              </label>
              <textarea
                rows={2}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Target materi yang ingin diselesaikan pada sesi ini..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                <Timer className="w-3.5 h-3.5 text-[#38BDF8]" />
                Sesi Hari Ini
              </div>
              <p className="text-2xl font-display font-bold font-mono-tabular text-slate-900 dark:text-[#EAF2FF] mt-1">
                {todaySessions.length} / {targetSessions}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                Total Waktu
              </div>
              <p className="text-2xl font-display font-bold font-mono-tabular text-slate-900 dark:text-[#EAF2FF] mt-1">
                {(totalStudyMinutes / 60).toFixed(1)} jam
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Study History & Weekly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
            Study History
          </h3>
          {store.study_sessions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-4">
              Belum ada sesi belajar yang selesai. Tekan Start pada timer untuk memulai pencatatan waktu belajarmu.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {store.study_sessions.map((ses) => (
                <div
                  key={ses.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#101B32] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-[#EAF2FF] truncate">
                      {ses.subjectName} · {ses.mode}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                      {ses.completedAt.slice(0, 16).replace('T', ' ')}
                      {ses.notes ? ` · ${ses.notes}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-mono-tabular font-semibold text-[#38BDF8] shrink-0">
                    {ses.durationMinutes} mnt
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
            Statistik 7 Hari Terakhir
          </h3>
          <div className="space-y-2">
            {weeklyStats.map((day) => (
              <div key={day.dateIso} className="flex items-center gap-3 text-xs">
                <span className="w-10 text-slate-500 dark:text-[#94A3B8] font-medium">
                  {day.label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-[#070B14] overflow-hidden">
                  <div
                    className="h-full blue-gradient"
                    style={{ width: `${Math.min(100, (day.minutes / 180) * 100)}%` }}
                  />
                </div>
                <span className="w-16 text-right font-mono-tabular text-slate-700 dark:text-[#EAF2FF]">
                  {day.minutes} mnt
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
