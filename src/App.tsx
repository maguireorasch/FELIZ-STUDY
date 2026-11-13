import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckSquare,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import {
  FelizStudyStore,
  LectureDocument,
  StudyNavTab,
} from './types/study';
import { loadStudyStore, saveStudyStore } from './lib/studyStorage';
import { getDeadlineIndicator } from './lib/academicHelpers';
import { StudyLogo } from './components/StudyLogo';
import { DashboardView } from './components/study/DashboardView';
import { ScheduleView } from './components/study/ScheduleView';
import { AssignmentsView } from './components/study/AssignmentsView';
import { StudyFocusView } from './components/study/StudyFocusView';
import { NotesView } from './components/study/NotesView';
import { DocumentsView } from './components/study/DocumentsView';
import { AiAssistantView } from './components/study/AiAssistantView';
import { AcademicProgressView } from './components/study/AcademicProgressView';
import { CalendarView } from './components/study/CalendarView';
import { SettingsView } from './components/study/SettingsView';

const NAV_ITEMS: {
  id: StudyNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'schedule', label: 'My Schedule', icon: CalendarClock },
  { id: 'assignments', label: 'Assignments', icon: CheckSquare },
  { id: 'focus', label: 'Study Focus', icon: Timer },
  { id: 'notes', label: 'My Notes', icon: FileText },
  { id: 'documents', label: 'My Documents', icon: FolderOpen },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'progress', label: 'Academic Progress', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const MOBILE_BOTTOM_TABS: StudyNavTab[] = [
  'dashboard',
  'schedule',
  'assignments',
  'focus',
  'ai',
];

export default function App() {
  const [store, setStore] = useState<FelizStudyStore>(() => loadStudyStore());
  const [activeTab, setActiveTab] = useState<StudyNavTab>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [nowClock, setNowClock] = useState(() => new Date());
  const [aiDocToAnalyze, setAiDocToAnalyze] = useState<LectureDocument | null>(null);

  // Persist to localStorage automatically
  useEffect(() => {
    saveStudyStore(store);
  }, [store]);

  // Sync Dark/Light Blue Edition root class
  useEffect(() => {
    const root = document.documentElement;
    if (store.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [store.settings.theme]);

  // Live clock for header
  useEffect(() => {
    const id = window.setInterval(() => setNowClock(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const updateStore = (updater: (prev: FelizStudyStore) => FelizStudyStore) => {
    setStore((prev) => updater(prev));
  };

  const navigateTo = (tab: StudyNavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setShowNotifications(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAction = (
    action: 'schedule' | 'assignment' | 'focus' | 'note' | 'document' | 'ai'
  ) => {
    switch (action) {
      case 'schedule':
        navigateTo('schedule');
        break;
      case 'assignment':
        navigateTo('assignments');
        break;
      case 'focus':
        navigateTo('focus');
        break;
      case 'note':
        navigateTo('notes');
        break;
      case 'document':
        navigateTo('documents');
        break;
      case 'ai':
        navigateTo('ai');
        break;
    }
  };

  const handleAnalyzeDocumentWithAi = (doc: LectureDocument) => {
    setAiDocToAnalyze(doc);
    navigateTo('ai');
  };

  const dateDisplay = useMemo(
    () =>
      new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(nowClock),
    [nowClock]
  );

  const timeDisplay = useMemo(
    () =>
      new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(nowClock),
    [nowClock]
  );

  // Global Search across all academic collections
  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    const results: { id: string; title: string; meta: string; tab: StudyNavTab }[] = [];

    store.subjects.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.lecturer.toLowerCase().includes(q)) {
        results.push({ id: s.id, title: s.name, meta: `Mata Kuliah · ${s.code || s.lecturer}`, tab: 'settings' });
      }
    });
    store.schedules.forEach((sc) => {
      if (sc.subjectName.toLowerCase().includes(q) || sc.classroom.toLowerCase().includes(q)) {
        results.push({ id: sc.id, title: sc.subjectName, meta: `Jadwal · ${sc.day} ${sc.startTime}`, tab: 'schedule' });
      }
    });
    store.assignments.forEach((a) => {
      if (a.title.toLowerCase().includes(q) || a.subjectName.toLowerCase().includes(q)) {
        results.push({ id: a.id, title: a.title, meta: `Tugas · ${a.subjectName}`, tab: 'assignments' });
      }
    });
    store.notes.forEach((n) => {
      if (n.title.toLowerCase().includes(q) || n.topic.toLowerCase().includes(q)) {
        results.push({ id: n.id, title: n.title, meta: `Catatan · ${n.subjectName}`, tab: 'notes' });
      }
    });
    store.documents.forEach((d) => {
      if (d.name.toLowerCase().includes(q) || d.subjectName.toLowerCase().includes(q)) {
        results.push({ id: d.id, title: d.name, meta: `Dokumen · ${d.fileExt}`, tab: 'documents' });
      }
    });
    store.calendar_events.forEach((e) => {
      if (e.title.toLowerCase().includes(q)) {
        results.push({ id: e.id, title: e.title, meta: `Kalender · ${e.date}`, tab: 'calendar' });
      }
    });

    return results.slice(0, 8);
  }, [globalSearch, store]);

  // Real Notification Center items
  const notifications = useMemo(() => {
    if (!store.settings.notificationsEnabled) return [];
    const list: { id: string; title: string; detail: string; tab: StudyNavTab }[] = [];

    store.assignments
      .filter((a) => a.status !== 'Completed')
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 4)
      .forEach((a) => {
        const ind = getDeadlineIndicator(a);
        list.push({
          id: `n-asg-${a.id}`,
          title: a.title,
          detail: `${ind.label} · ${a.subjectName} (${a.deadline.slice(0, 10)})`,
          tab: 'assignments',
        });
      });

    store.calendar_events
      .filter((ev) => ev.reminderEnabled)
      .slice(0, 3)
      .forEach((ev) => {
        list.push({
          id: `n-cal-${ev.id}`,
          title: ev.title,
          detail: `${ev.date} ${ev.time} · ${ev.category}`,
          tab: 'calendar',
        });
      });

    return list;
  }, [store.assignments, store.calendar_events, store.settings.notificationsEnabled]);

  return (
    <div className="min-h-screen bg-[#F1F5FB] text-slate-900 dark:bg-[#070B14] dark:text-[#EAF2FF] flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#101B32] z-30">
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
          <StudyLogo size={38} />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-base tracking-wide text-slate-900 dark:text-[#EAF2FF] leading-none">
              FELIZ STUDY
            </h1>
            <p className="text-[11px] font-accent text-[#2563EB] dark:text-[#38BDF8] mt-1 truncate">
              Your Smart Academic Companion
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Menu Akademik">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap cursor-pointer ${
                  active
                    ? 'blue-gradient text-[#EAF2FF] blue-glow'
                    : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#14213A] hover:text-slate-900 dark:hover:text-[#EAF2FF]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 m-3 rounded-2xl border border-slate-200 dark:border-[#3B82F6]/25 bg-slate-50 dark:bg-[#14213A]/85">
          <p className="text-xs font-display font-semibold text-slate-900 dark:text-[#EAF2FF] truncate">
            {store.academic_profile.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5 truncate">
            {store.academic_profile.program} · Sem {store.academic_profile.semester}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-20 lg:pb-8">
        {/* Top Header */}
        <header className="sticky top-0 z-20 backdrop-blur-md bg-white/85 dark:bg-[#070B14]/85 border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Mobile Brand + Drawer Trigger */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Buka menu navigasi"
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#EAF2FF] cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <StudyLogo size={30} />
              <span className="font-display font-bold text-sm tracking-wide whitespace-nowrap">
                FELIZ STUDY
              </span>
            </div>

            {/* Auto Date & Time (Desktop) */}
            <div className="hidden lg:block shrink-0">
              <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8] capitalize">
                {dateDisplay} · <span className="font-mono-tabular text-[#2563EB] dark:text-[#38BDF8]">{timeDisplay}</span>
              </p>
            </div>

            {/* Global Search */}
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Cari jadwal, mata kuliah, tugas, catatan, dokumen..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101B32] text-sm text-slate-900 dark:text-[#EAF2FF] placeholder:text-slate-400 focus:outline-none focus:border-[#38BDF8]"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-slate-200 dark:border-[#3B82F6]/40 bg-white dark:bg-[#101B32] shadow-2xl p-2 space-y-1 z-40">
                  {searchResults.map((res) => (
                    <button
                      key={`${res.tab}-${res.id}`}
                      onClick={() => {
                        setGlobalSearch('');
                        navigateTo(res.tab);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#14213A] cursor-pointer"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-[#EAF2FF] truncate">
                        {res.title}
                      </p>
                      <p className="text-xs text-[#2563EB] dark:text-[#38BDF8]">{res.meta}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  updateStore((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      theme: prev.settings.theme === 'dark' ? 'light' : 'dark',
                    },
                  }))
                }
                aria-label="Ganti tema gelap atau terang"
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#EAF2FF] hover:border-[#38BDF8] cursor-pointer"
              >
                {store.settings.theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#38BDF8]" />
                ) : (
                  <Moon className="w-4 h-4 text-[#2563EB]" />
                )}
              </button>

              {/* Notification Center */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications((s) => !s)}
                  aria-label="Notification Center"
                  className="relative p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#EAF2FF] hover:border-[#38BDF8] cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-[#3B82F6]/40 bg-white dark:bg-[#101B32] shadow-2xl p-4 space-y-3 z-40">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm">Notification Center</span>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-slate-400 cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        Tidak ada deadline atau pengingat aktif saat ini.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => navigateTo(n.tab)}
                            className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-[#14213A] border border-transparent hover:border-[#38BDF8] cursor-pointer"
                          >
                            <p className="text-xs font-semibold text-slate-900 dark:text-[#EAF2FF] truncate">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5 truncate">
                              {n.detail}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => navigateTo('settings')}
                aria-label="Settings Shortcut"
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#EAF2FF] hover:border-[#38BDF8] cursor-pointer"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Active View */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              store={store}
              onNavigate={navigateTo}
              onQuickAction={handleQuickAction}
            />
          )}
          {activeTab === 'schedule' && (
            <ScheduleView store={store} onUpdateStore={updateStore} onToast={showToast} />
          )}
          {activeTab === 'assignments' && (
            <AssignmentsView store={store} onUpdateStore={updateStore} onToast={showToast} />
          )}
          {activeTab === 'focus' && (
            <StudyFocusView store={store} onUpdateStore={updateStore} onToast={showToast} />
          )}
          {activeTab === 'notes' && (
            <NotesView store={store} onUpdateStore={updateStore} onToast={showToast} />
          )}
          {activeTab === 'documents' && (
            <DocumentsView
              store={store}
              onUpdateStore={updateStore}
              onAnalyzeWithAi={handleAnalyzeDocumentWithAi}
              onToast={showToast}
            />
          )}
          {activeTab === 'ai' && (
            <AiAssistantView
              store={store}
              onUpdateStore={updateStore}
              preselectedDocument={aiDocToAnalyze}
              onClearPreselectedDocument={() => setAiDocToAnalyze(null)}
              onToast={showToast}
            />
          )}
          {activeTab === 'progress' && <AcademicProgressView store={store} />}
          {activeTab === 'calendar' && (
            <CalendarView store={store} onUpdateStore={updateStore} onToast={showToast} />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              store={store}
              onUpdateStore={updateStore}
              onReplaceStore={setStore}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Navigasi Mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-white/95 dark:bg-[#101B32]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 grid grid-cols-5"
      >
        {MOBILE_BOTTOM_TABS.map((id) => {
          const item = NAV_ITEMS.find((n) => n.id === id)!;
          const Icon = item.icon;
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => navigateTo(id)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer ${
                active ? 'text-[#38BDF8]' : 'text-slate-500 dark:text-[#94A3B8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[64px]">
                {item.label === 'Dashboard'
                  ? 'Home'
                  : item.label === 'My Schedule'
                    ? 'Schedule'
                    : item.label === 'Study Focus'
                      ? 'Focus'
                      : item.label === 'AI Assistant'
                        ? 'AI'
                        : 'Tasks'}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex">
          <div className="w-72 max-w-[82vw] h-full bg-white dark:bg-[#101B32] border-r border-slate-200 dark:border-white/10 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <StudyLogo size={32} />
                  <div>
                    <p className="font-display font-bold text-sm">FELIZ STUDY</p>
                    <p className="text-[10px] text-[#38BDF8]">Your Smart Academic Companion</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Tutup menu"
                  className="p-1.5 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${
                        active
                          ? 'blue-gradient text-[#EAF2FF]'
                          : 'text-slate-700 dark:text-[#EAF2FF]/85 hover:bg-slate-100 dark:hover:bg-[#14213A]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-[#94A3B8] pt-4 border-t border-slate-200 dark:border-white/10">
              {dateDisplay} · {timeDisplay}
            </p>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 rounded-xl border border-[#38BDF8]/50 bg-[#101B32] text-[#EAF2FF] text-sm font-medium shadow-2xl blue-glow">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
