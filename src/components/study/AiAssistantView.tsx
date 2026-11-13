import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookmarkCheck,
  Check,
  Copy,
  FileUp,
  History,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  AiConversation,
  AiMessage,
  AiMode,
  FelizStudyStore,
  LearningRecommendation,
  LectureDocument,
} from '../../types/study';
import { extractDocumentText } from '../../lib/documentParser';
import { computeLiveRecommendations } from '../../lib/academicHelpers';

interface AiAssistantViewProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  preselectedDocument?: LectureDocument | null;
  onClearPreselectedDocument?: () => void;
  onToast: (msg: string) => void;
}

const AI_MODES: AiMode[] = [
  'AI Tutor',
  'Material Summarizer',
  'PDF & PPT Analyzer',
  'Quiz Generator',
  'Programming Tutor',
  'Debugging Assistant',
  'Study Roadmap',
  'Smart Learning Recommendation',
];

const MODE_SUGGESTIONS: Record<AiMode, string[]> = {
  'AI Tutor': [
    'Jelaskan perbedaan Stack, Queue, dan Linked List beserta contoh kasus nyata.',
    'Apa perbedaan proses dan thread dalam Sistem Operasi?',
  ],
  'Material Summarizer': [
    'Ringkas materi ini menjadi poin penting, definisi kunci, contoh, dan kesimpulan.',
    'Buatkan rangkuman singkat untuk persiapan kuis dari catatan berikut.',
  ],
  'PDF & PPT Analyzer': [
    'Jelaskan poin inti dari dokumen materi kuliah ini dan buatkan 5 pertanyaan review.',
    'Bagian mana pada slide/PDF ini yang paling krusial untuk dipahami saat ujian?',
  ],
  'Quiz Generator': [
    'Buatkan 5 soal Multiple Choice + 2 soal Essay tentang Normalisasi Database (1NF–3NF) lengkap dengan kunci jawaban terpisah.',
    'Buatkan 5 soal True/False tentang Jaringan Komputer TCP/IP.',
  ],
  'Programming Tutor': [
    'Bantu saya memahami konsep Async/Await di JavaScript & React useEffect.',
    'Jelaskan cara kerja JOIN pada SQL dengan contoh query dua tabel.',
  ],
  'Debugging Assistant': [
    'Analisis pesan error TypeScript/React ini dan jelaskan penyebab serta solusinya.',
    'Mengapa query SQL atau fungsi rekursif saya mengalami error/infinite loop?',
  ],
  'Study Roadmap': [
    'Buatkan roadmap belajar 2 minggu untuk menguasai Struktur Data Tree & Graph.',
    'Susun jadwal belajar harian selama 7 hari menjelang UTS Semester 3.',
  ],
  'Smart Learning Recommendation': [
    'Berdasarkan mata kuliah, deadline tugas, dan catatan saya saat ini, apa yang harus saya pelajari hari ini?',
    'Evaluasi beban tugas tertunda saya dan sarankan durasi sesi fokus yang ideal.',
  ],
};

export function AiAssistantView({
  store,
  onUpdateStore,
  preselectedDocument,
  onClearPreselectedDocument,
  onToast,
}: AiAssistantViewProps) {
  const [aiStatus, setAiStatus] = useState<{ checked: boolean; configured: boolean; model?: string }>({
    checked: false,
    configured: false,
  });

  const [mode, setMode] = useState<AiMode>(preselectedDocument ? 'PDF & PPT Analyzer' : 'AI Tutor');
  const [activeConvId, setActiveConvId] = useState<string>(store.ai_conversations[0]?.id || '');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  // Document attachment for PDF & PPT Analyzer or Material Summarizer
  const [selectedDocId, setSelectedDocId] = useState<string>(preselectedDocument?.id || '');
  const [inlineUploadedFile, setInlineUploadedFile] = useState<{
    name: string;
    text: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data) => {
        setAiStatus({ checked: true, configured: Boolean(data.configured), model: data.model });
      })
      .catch(() => {
        setAiStatus({ checked: true, configured: false });
      });
  }, []);

  useEffect(() => {
    if (preselectedDocument) {
      setMode('PDF & PPT Analyzer');
      setSelectedDocId(preselectedDocument.id);
      setInput(`Tolong analisis dokumen "${preselectedDocument.name}" dan jelaskan poin-poin utamanya.`);
    }
  }, [preselectedDocument]);

  const activeConversation = useMemo(
    () => store.ai_conversations.find((c) => c.id === activeConvId) || null,
    [store.ai_conversations, activeConvId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length, isLoading]);

  const selectedLibraryDoc = useMemo(
    () => store.documents.find((d) => d.id === selectedDocId) || null,
    [store.documents, selectedDocId]
  );

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = ['pdf', 'pptx', 'docx', 'txt', 'md'];
    if (!allowed.includes(ext)) {
      onToast('Untuk analisis AI langsung, pilih file PDF, PPTX, DOCX, atau TXT.');
      return;
    }
    const text = await extractDocumentText(file);
    setInlineUploadedFile({ name: file.name, text });
    setSelectedDocId('');
    if (onClearPreselectedDocument) onClearPreselectedDocument();
    onToast(`Dokumen "${file.name}" siap dianalisis oleh AI.`);
  };

  const buildAcademicContext = () => ({
    profile: {
      name: store.academic_profile.name,
      program: store.academic_profile.program,
      semester: store.academic_profile.semester,
      academicYear: store.academic_profile.academicYear,
    },
    subjects: store.subjects.map((s) => ({
      name: s.name,
      lecturer: s.lecturer,
      credits: s.credits,
    })),
    schedules: store.schedules.map((sc) => ({
      day: sc.day,
      time: `${sc.startTime}-${sc.endTime}`,
      subject: sc.subjectName,
    })),
    pendingAssignments: store.assignments
      .filter((a) => a.status !== 'Completed')
      .map((a) => ({
        title: a.title,
        subject: a.subjectName,
        deadline: a.deadline,
        priority: a.priority,
        progress: a.progress,
      })),
    recentNotesTitles: store.notes.slice(0, 8).map((n) => ({
      title: n.title,
      subject: n.subjectName,
      topic: n.topic,
    })),
    studySessionsCount: store.study_sessions.length,
    totalStudyMinutes: store.study_sessions.reduce((s, x) => s + x.durationMinutes, 0),
  });

  const startNewChat = () => {
    setActiveConvId('');
    setErrorMsg(null);
  };

  const sendMessage = async (promptOverride?: string) => {
    const promptText = (promptOverride ?? input).trim();
    if (!promptText || isLoading) return;

    if (!aiStatus.configured) {
      setErrorMsg(
        'GEMINI_API_KEY belum terkonfigurasi pada environment server. Buka Settings > Secrets pada AI Studio untuk menambahkan kunci API sebelum mengirim pesan.'
      );
      return;
    }

    setErrorMsg(null);
    setLastFailedPrompt(null);
    setInput('');
    setIsLoading(true);

    const now = new Date().toISOString();
    const attachedName = inlineUploadedFile?.name || selectedLibraryDoc?.name;
    const attachmentText = inlineUploadedFile?.text || selectedLibraryDoc?.extractedText;

    const userMsg: AiMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: promptText,
      mode,
      attachedDocName: attachedName,
      timestamp: now,
    };

    let targetConvId = activeConvId;
    if (!targetConvId) {
      targetConvId = `conv-${Date.now()}`;
      const newConv: AiConversation = {
        id: targetConvId,
        title: promptText.slice(0, 42) + (promptText.length > 42 ? '...' : ''),
        mode,
        messages: [userMsg],
        createdAt: now,
        updatedAt: now,
      };
      onUpdateStore((prev) => ({
        ...prev,
        ai_conversations: [newConv, ...prev.ai_conversations],
      }));
      setActiveConvId(targetConvId);
    } else {
      onUpdateStore((prev) => ({
        ...prev,
        ai_conversations: prev.ai_conversations.map((c) =>
          c.id === targetConvId
            ? { ...c, mode, messages: [...c.messages, userMsg], updatedAt: now }
            : c
        ),
      }));
    }

    try {
      const historyPayload = (activeConversation?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          message: promptText,
          history: historyPayload,
          academicContext: buildAcademicContext(),
          attachmentText,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Gagal mendapatkan respons dari Gemini AI.');
      }

      const aiMsg: AiMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: data.reply,
        mode,
        timestamp: new Date().toISOString(),
      };

      onUpdateStore((prev) => ({
        ...prev,
        ai_conversations: prev.ai_conversations.map((c) =>
          c.id === targetConvId
            ? { ...c, messages: [...c.messages, aiMsg], updatedAt: new Date().toISOString() }
            : c
        ),
      }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan koneksi.');
      setLastFailedPrompt(promptText);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCurrentConversation = () => {
    if (!activeConvId) return;
    onUpdateStore((prev) => ({
      ...prev,
      ai_conversations: prev.ai_conversations.filter((c) => c.id !== activeConvId),
    }));
    setActiveConvId('');
    onToast('Percakapan dihapus.');
  };

  const liveRecs = useMemo(() => {
    const computed = computeLiveRecommendations(store);
    const savedMap = new Map(store.recommendations.map((r) => [r.id, r]));
    return computed.map((c) => savedMap.get(c.id) || c);
  }, [store]);

  const updateRecommendationStatus = (
    rec: LearningRecommendation,
    status: LearningRecommendation['status']
  ) => {
    onUpdateStore((prev) => {
      const exists = prev.recommendations.some((r) => r.id === rec.id);
      const nextList = exists
        ? prev.recommendations.map((r) => (r.id === rec.id ? { ...r, status } : r))
        : [...prev.recommendations, { ...rec, status }];
      return { ...prev, recommendations: nextList };
    });
    onToast(
      status === 'accepted'
        ? 'Rekomendasi diterima sebagai prioritas belajar.'
        : status === 'saved'
          ? 'Rekomendasi disimpan.'
          : 'Rekomendasi diabaikan.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            AI Study Assistant
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
            Didukung Google Gemini API melalui endpoint server untuk bimbingan materi, ringkasan dokumen, kuis, dan coding TI.
          </p>
        </div>

        <button
          onClick={startNewChat}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Percakapan Baru
        </button>
      </div>

      {/* Explicit API Status Banner if not configured */}
      {aiStatus.checked && !aiStatus.configured && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-800 dark:text-[#EAF2FF] space-y-1">
            <p className="font-semibold">Konfigurasi Gemini API Diperlukan</p>
            <p className="text-slate-600 dark:text-[#94A3B8]">
              Variabel lingkungan server <code className="font-mono-tabular">GEMINI_API_KEY</code> belum diatur. Tambahkan API key di panel <strong>Settings &gt; Secrets</strong> atau file <code className="font-mono-tabular">.env</code> server agar AI Assistant dapat digunakan. Aplikasi tidak akan memalsukan respons AI.
            </p>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex flex-wrap gap-2">
        {AI_MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              mode === m
                ? 'blue-gradient text-[#EAF2FF] blue-glow'
                : 'bg-white dark:bg-[#14213A] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#EAF2FF]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Smart Learning Recommendations Strip when relevant */}
      {liveRecs.filter((r) => r.status !== 'dismissed').length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-[#3B82F6]/30 bg-white dark:bg-[#14213A]/85 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8]">
            <Sparkles className="w-4 h-4" />
            Rekomendasi Prioritas Belajar (Berdasarkan Data Aktualmu)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveRecs
              .filter((r) => r.status !== 'dismissed')
              .slice(0, 2)
              .map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101B32] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-[#2563EB] dark:text-[#38BDF8]">
                    <span className="font-semibold">{rec.recommendedSubject}</span>
                    <span className="font-mono-tabular">
                      {rec.suggestedDurationMinutes} mnt · {rec.priority}
                    </span>
                  </div>
                  <p className="font-display font-bold text-sm text-slate-900 dark:text-[#EAF2FF]">
                    {rec.recommendedTopic}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{rec.reason}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => updateRecommendationStatus(rec, 'accepted')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg blue-gradient text-[#EAF2FF] text-[11px] font-semibold cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      {rec.status === 'accepted' ? 'Diterima' : 'Terima'}
                    </button>
                    <button
                      onClick={() => updateRecommendationStatus(rec, 'saved')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/15 text-[11px] font-medium cursor-pointer"
                    >
                      <BookmarkCheck className="w-3 h-3" />
                      {rec.status === 'saved' ? 'Tersimpan' : 'Simpan'}
                    </button>
                    <button
                      onClick={() => updateRecommendationStatus(rec, 'dismissed')}
                      className="px-2.5 py-1 rounded-lg text-[11px] text-slate-500 hover:text-amber-400 cursor-pointer"
                    >
                      Abaikan
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversation History Sidebar */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-[#EAF2FF]">
              <History className="w-4 h-4 text-[#38BDF8]" />
              Riwayat Chat
            </span>
            {activeConvId && (
              <button
                onClick={clearCurrentConversation}
                title="Hapus percakapan aktif"
                className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {store.ai_conversations.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Belum ada riwayat percakapan.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {store.ai_conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setMode(conv.mode);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs cursor-pointer ${
                    activeConvId === conv.id
                      ? 'blue-gradient text-[#EAF2FF]'
                      : 'bg-slate-50 dark:bg-[#101B32] text-slate-700 dark:text-[#EAF2FF]/85 hover:border-[#3B82F6] border border-transparent'
                  }`}
                >
                  <p className="font-semibold truncate">{conv.title}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">{conv.mode}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Viewport */}
        <div className="lg:col-span-9 rounded-2xl border border-slate-200 dark:border-[#3B82F6]/30 bg-white dark:bg-[#101B32]/95 flex flex-col min-h-[540px] max-h-[75vh]">
          {/* Attached Document Bar */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                Mode: {mode}
              </span>
              {store.documents.length > 0 && (
                <select
                  value={selectedDocId}
                  onChange={(e) => {
                    setSelectedDocId(e.target.value);
                    setInlineUploadedFile(null);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-2.5 py-1 text-xs"
                >
                  <option value="">-- Lampirkan Dokumen Tersimpan (Opsional) --</option>
                  {store.documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.fileExt})
                    </option>
                  ))}
                </select>
              )}
              {inlineUploadedFile && (
                <span className="inline-flex items-center gap-1 text-xs text-[#38BDF8]">
                  File: {inlineUploadedFile.name}
                  <button
                    onClick={() => setInlineUploadedFile(null)}
                    className="cursor-pointer hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-medium cursor-pointer hover:border-[#38BDF8]">
              <FileUp className="w-3.5 h-3.5 text-[#38BDF8]" />
              Upload PDF/PPTX/DOCX
              <input
                type="file"
                accept=".pdf,.pptx,.docx,.txt,.md"
                onChange={handleFileAttach}
                className="hidden"
              />
            </label>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {(!activeConversation || activeConversation.messages.length === 0) && (
              <div className="py-8 space-y-5 max-w-xl mx-auto text-center">
                <Sparkles className="w-9 h-9 mx-auto text-[#38BDF8]" />
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
                    Siap Membantu Studi Semester 3-mu
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-1">
                    Pilih contoh pertanyaan di bawah atau ketik materi, kode error, atau dokumen yang ingin dibahas.
                  </p>
                </div>
                <div className="space-y-2 text-left">
                  {MODE_SUGGESTIONS[mode].map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(sug)}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14213A]/80 hover:border-[#38BDF8] text-xs text-slate-700 dark:text-[#EAF2FF] cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeConversation?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-2 ${
                    msg.role === 'user'
                      ? 'blue-gradient text-[#EAF2FF]'
                      : 'bg-slate-100 dark:bg-[#14213A] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-[#EAF2FF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[11px] opacity-80">
                    <span>
                      {msg.role === 'user' ? 'Kamu' : 'FELIZ AI'} · {msg.mode}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          onToast('Jawaban AI disalin.');
                        }}
                        className="inline-flex items-center gap-1 hover:text-[#38BDF8] cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Salin
                      </button>
                    )}
                  </div>
                  {msg.attachedDocName && (
                    <p className="text-[11px] underline opacity-90">
                      Lampiran: {msg.attachedDocName}
                    </p>
                  )}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 dark:bg-[#14213A] border border-slate-200 dark:border-white/10 px-4 py-3 text-xs text-slate-600 dark:text-[#94A3B8]">
                  Gemini AI sedang menganalisis dan menyusun penjelasan...
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-500">
                <span>{errorMsg}</span>
                {lastFailedPrompt && (
                  <button
                    onClick={() => sendMessage(lastFailedPrompt)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Coba Lagi
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 sm:p-4 border-t border-slate-200 dark:border-white/10 flex gap-2"
          >
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={`Tanya sesuatu dalam mode ${mode}... (Enter untuk kirim, Shift+Enter baris baru)`}
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3.5 py-2.5 text-sm text-slate-900 dark:text-[#EAF2FF] resize-none focus:outline-none focus:border-[#38BDF8]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] font-semibold text-sm flex items-center gap-1.5 blue-glow disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
