import {
  Assignment,
  DayOfWeek,
  FelizStudyStore,
  LearningRecommendation,
} from '../types/study';

export const BLUE_SUBJECT_COLORS = [
  '#2563EB',
  '#3B82F6',
  '#38BDF8',
  '#0EA5E9',
  '#1D4ED8',
  '#0284C7',
  '#1E40AF',
  '#0369A1',
];

export const DAYS_OF_WEEK: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export function getTodayDayOfWeek(date = new Date()): DayOfWeek | null {
  const day = date.getDay(); // 0 Sun, 1 Mon ... 5 Fri, 6 Sat
  const map: Record<number, DayOfWeek> = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
  };
  return map[day] || null;
}

export function getDeadlineIndicator(assignment: Assignment): {
  label: 'Overdue' | 'Due Today' | 'Due Tomorrow' | 'Due Soon' | 'Completed' | 'Scheduled';
  tone: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'completed' | 'normal';
} {
  if (assignment.status === 'Completed') {
    return { label: 'Completed', tone: 'completed' };
  }
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const dueDateStr = assignment.deadline.slice(0, 10);

  const todayMs = new Date(`${todayStr}T00:00:00`).getTime();
  const dueMs = new Date(`${dueDateStr}T00:00:00`).getTime();
  const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Overdue', tone: 'overdue' };
  if (diffDays === 0) return { label: 'Due Today', tone: 'today' };
  if (diffDays === 1) return { label: 'Due Tomorrow', tone: 'tomorrow' };
  if (diffDays <= 4) return { label: 'Due Soon', tone: 'soon' };
  return { label: 'Scheduled', tone: 'normal' };
}

export function calculateStudyStreakDays(store: FelizStudyStore): number {
  if (store.study_sessions.length === 0) return 0;
  const uniqueDates = new Set(
    store.study_sessions.map((s) => s.completedAt.slice(0, 10))
  );

  let streak = 0;
  const cursor = new Date();
  const todayStr = cursor.toISOString().slice(0, 10);

  // If no session today yet, check starting from yesterday so ongoing streak isn't zeroed prematurely
  if (!uniqueDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (uniqueDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getWeeklyStudyChartData(store: FelizStudyStore) {
  const days: { dateIso: string; label: string; hours: number; minutes: number; sessions: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const shortLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d);

    const daySessions = store.study_sessions.filter(
      (s) => s.completedAt.slice(0, 10) === iso
    );
    const totalMinutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    days.push({
      dateIso: iso,
      label: shortLabel,
      minutes: totalMinutes,
      hours: Number((totalMinutes / 60).toFixed(2)),
      sessions: daySessions.length,
    });
  }
  return days;
}

export function computeLiveRecommendations(store: FelizStudyStore): LearningRecommendation[] {
  const recs: LearningRecommendation[] = [];
  const nowIso = new Date().toISOString();

  // 1. Urgent / nearest pending assignment
  const pendingAssignments = store.assignments
    .filter((a) => a.status !== 'Completed')
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  if (pendingAssignments.length > 0) {
    const top = pendingAssignments[0];
    const indicator = getDeadlineIndicator(top);
    recs.push({
      id: `rec-assign-${top.id}`,
      recommendedSubject: top.subjectName || 'Umum',
      recommendedTopic: `Selesaikan Tugas: ${top.title}`,
      reason: `Status deadline: ${indicator.label} (${top.deadline.slice(0, 10)}), progres saat ini ${top.progress}%.`,
      suggestedDurationMinutes: top.priority === 'Urgent' || top.priority === 'High' ? 50 : 25,
      priority: top.priority,
      suggestedResources: 'Gunakan Study Focus Pomodoro & AI Assistant untuk cek konsep.',
      status: 'pending',
      createdAt: nowIso,
    });
  }

  // 2. Subjects without any study sessions yet
  const studiedSubjects = new Set(store.study_sessions.map((s) => s.subjectName));
  const unstudiedSubject = store.subjects.find((sub) => !studiedSubjects.has(sub.name));
  if (unstudiedSubject) {
    recs.push({
      id: `rec-sub-${unstudiedSubject.id}`,
      recommendedSubject: unstudiedSubject.name,
      recommendedTopic: `Review Pengantar ${unstudiedSubject.name}`,
      reason: 'Mata kuliah ini belum memiliki sesi fokus belajar atau catatan pengulangan.',
      suggestedDurationMinutes: 25,
      priority: 'Medium',
      suggestedResources: `Dosen: ${unstudiedSubject.lecturer || 'Belum diisi'} · Buat ringkasan di My Notes.`,
      status: 'pending',
      createdAt: nowIso,
    });
  }

  // 3. Oldest note to review
  if (store.notes.length > 0 && recs.length < 3) {
    const oldestNote = [...store.notes].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
    recs.push({
      id: `rec-note-${oldestNote.id}`,
      recommendedSubject: oldestNote.subjectName || 'Catatan Akademik',
      recommendedTopic: `Ulangi Materi: ${oldestNote.title}`,
      reason: `Catatan terakhir diperbarui ${oldestNote.updatedAt.slice(0, 10)}. Mengulang materi meningkatkan retensi ujian.`,
      suggestedDurationMinutes: 20,
      priority: 'Low',
      suggestedResources: 'Buka My Notes atau uji pemahaman via AI Quiz Generator.',
      status: 'pending',
      createdAt: nowIso,
    });
  }

  return recs;
}
