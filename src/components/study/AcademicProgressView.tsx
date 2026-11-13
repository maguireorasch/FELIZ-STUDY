import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { FelizStudyStore } from '../../types/study';
import {
  BLUE_SUBJECT_COLORS,
  calculateStudyStreakDays,
  getWeeklyStudyChartData,
} from '../../lib/academicHelpers';

interface AcademicProgressViewProps {
  store: FelizStudyStore;
}

export function AcademicProgressView({ store }: AcademicProgressViewProps) {
  const completedAssignments = store.assignments.filter((a) => a.status === 'Completed').length;
  const pendingAssignments = store.assignments.filter((a) => a.status !== 'Completed').length;
  const totalStudyMinutes = store.study_sessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);
  const streakDays = calculateStudyStreakDays(store);

  const weeklyStudyData = useMemo(() => getWeeklyStudyChartData(store), [store]);

  const assignmentCompletionData = useMemo(
    () => [
      {
        name: 'Completed',
        count: store.assignments.filter((a) => a.status === 'Completed').length,
      },
      {
        name: 'In Progress',
        count: store.assignments.filter((a) => a.status === 'In Progress').length,
      },
      {
        name: 'To Do',
        count: store.assignments.filter((a) => a.status === 'To Do').length,
      },
    ],
    [store.assignments]
  );

  const subjectDistributionData = useMemo(() => {
    const map = new Map<string, number>();
    store.study_sessions.forEach((s) => {
      map.set(s.subjectName, (map.get(s.subjectName) || 0) + s.durationMinutes);
    });
    if (map.size === 0) {
      store.assignments.forEach((a) => {
        map.set(a.subjectName, (map.get(a.subjectName) || 0) + 1);
      });
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [store.study_sessions, store.assignments]);

  // 4-week monthly productivity trend calculated strictly from user's actual sessions
  const monthlyProductivityData = useMemo(() => {
    const today = new Date();
    return [3, 2, 1, 0].map((weeksAgo) => {
      const end = new Date(today);
      end.setDate(today.getDate() - weeksAgo * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const startIso = start.toISOString().slice(0, 10);
      const endIso = end.toISOString().slice(0, 10);

      const mins = store.study_sessions
        .filter((s) => {
          const d = s.completedAt.slice(0, 10);
          return d >= startIso && d <= endIso;
        })
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      return {
        week: `Minggu ${4 - weeksAgo}`,
        hours: Number((mins / 60).toFixed(2)),
      };
    });
  }, [store.study_sessions]);

  const kpis = [
    { label: 'Total Subjects', value: store.subjects.length },
    { label: 'Total Assignments', value: store.assignments.length },
    { label: 'Completed Assignments', value: completedAssignments },
    { label: 'Pending Assignments', value: pendingAssignments },
    { label: 'Total Study Hours', value: `${totalStudyHours} jam` },
    { label: 'Study Sessions', value: store.study_sessions.length },
    { label: 'Total Notes', value: store.notes.length },
    { label: 'Study Streak', value: `${streakDays} hari` },
  ];

  const tooltipStyle = {
    backgroundColor: '#101B32',
    border: '1px solid rgba(59,130,246,0.4)',
    borderRadius: '12px',
    color: '#EAF2FF',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
          Academic Progress &amp; Analytics
        </h2>
        <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
          Seluruh metrik dan grafik dihitung langsung dari aktivitas belajarmu yang tersimpan.
        </p>
      </div>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4"
          >
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{item.label}</p>
            <p className="text-2xl font-display font-bold font-mono-tabular text-slate-900 dark:text-[#EAF2FF] mt-1.5">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Study Hours */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
            Weekly Study Hours
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStudyData}>
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} unit="j" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="hours" name="Jam Belajar" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Study Consistency (Sessions per day) */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
            Study Consistency (Sesi Harian)
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyStudyData}>
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Jumlah Sesi"
                  stroke="#38BDF8"
                  fill="rgba(56, 189, 248, 0.25)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assignment Completion */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
            Assignment Completion
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assignmentCompletionData} layout="vertical">
                <XAxis type="number" stroke="#94A3B8" fontSize={12} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={12}
                  width={90}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Jumlah Tugas" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
            Subject Distribution
          </h3>
          {subjectDistributionData.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center text-xs text-slate-500 dark:text-[#94A3B8]">
              <BarChart3 className="w-8 h-8 text-[#3B82F6] mb-2" />
              Belum ada data sesi belajar atau tugas per mata kuliah.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjectDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {subjectDistributionData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BLUE_SUBJECT_COLORS[index % BLUE_SUBJECT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Productivity */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 space-y-3">
        <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF]">
          Monthly Productivity (4 Minggu Terakhir)
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyProductivityData}>
              <XAxis dataKey="week" stroke="#94A3B8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} unit="j" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="hours"
                name="Jam Belajar"
                stroke="#3B82F6"
                fill="rgba(37, 99, 235, 0.25)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
