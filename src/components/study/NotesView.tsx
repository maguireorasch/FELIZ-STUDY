import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Bookmark,
  CheckSquare,
  Code2,
  Copy,
  Download,
  Heading1,
  Heading2,
  Highlighter,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  NotebookPen,
  Paperclip,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  Underline,
} from 'lucide-react';
import { AcademicNote, FelizStudyStore, NoteAttachment } from '../../types/study';
import {
  fileToDataUrl,
  getBlobFromIdb,
  saveBlobToIdb,
  triggerDataUrlDownload,
} from '../../lib/studyIndexedDb';

interface NotesViewProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  onToast: (msg: string) => void;
}

export function NotesView({ store, onUpdateStore, onToast }: NotesViewProps) {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [onlySavedFilter, setOnlySavedFilter] = useState<'all' | 'pinned' | 'favorite' | 'bookmarked'>('all');

  const [selectedNoteId, setSelectedNoteId] = useState<string>(store.notes[0]?.id || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saveStateLabel, setSaveStateLabel] = useState<'saved' | 'saving'>('saved');

  const editorRef = useRef<HTMLDivElement | null>(null);

  const selectedNote = useMemo(
    () => store.notes.find((n) => n.id === selectedNoteId) || null,
    [store.notes, selectedNoteId]
  );

  // Sync editor DOM when switching selected note
  useEffect(() => {
    if (editorRef.current && selectedNote) {
      if (editorRef.current.innerHTML !== selectedNote.contentHtml) {
        editorRef.current.innerHTML = selectedNote.contentHtml || '';
      }
    }
  }, [selectedNote?.id]);

  const filteredNotes = useMemo(() => {
    return [...store.notes]
      .filter((n) => {
        if (subjectFilter !== 'All' && n.subjectName !== subjectFilter) return false;
        if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;
        if (dateFilter && n.date !== dateFilter) return false;
        if (onlySavedFilter === 'pinned' && !n.pinned) return false;
        if (onlySavedFilter === 'favorite' && !n.favorite) return false;
        if (onlySavedFilter === 'bookmarked' && !n.bookmarked) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            n.title.toLowerCase().includes(q) ||
            n.topic.toLowerCase().includes(q) ||
            n.subjectName.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)) ||
            n.contentHtml.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [store.notes, subjectFilter, categoryFilter, dateFilter, onlySavedFilter, search]);

  const createNote = () => {
    const now = new Date().toISOString();
    const firstSub = store.subjects[0];
    const created: AcademicNote = {
      id: `note-${Date.now()}`,
      title: 'Catatan Materi Baru',
      subjectId: firstSub?.id,
      subjectName: firstSub?.name || 'Umum',
      category: store.settings.customNoteCategories[0] || 'Kuliah',
      lecturer: firstSub?.lecturer || '',
      date: now.slice(0, 10),
      topic: '',
      contentHtml: '<p>Tulis ringkasan materi dosen di sini...</p>',
      codeSnippet: '',
      codeLanguage: 'TypeScript',
      tags: [],
      pinned: false,
      favorite: false,
      bookmarked: false,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    onUpdateStore((prev) => ({
      ...prev,
      notes: [created, ...prev.notes],
    }));
    setSelectedNoteId(created.id);
    onToast('Catatan baru dibuat.');
  };

  const patchNote = (id: string, patch: Partial<AcademicNote>) => {
    setSaveStateLabel('saving');
    onUpdateStore((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
      ),
    }));
    window.setTimeout(() => setSaveStateLabel('saved'), 250);
  };

  const deleteNote = (id: string) => {
    onUpdateStore((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
    if (selectedNoteId === id) {
      const remaining = store.notes.filter((n) => n.id !== id);
      setSelectedNoteId(remaining[0]?.id || '');
    }
    onToast('Catatan dihapus.');
  };

  const execFormat = (command: string, value?: string) => {
    if (!editorRef.current || !selectedNote) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    patchNote(selectedNote.id, { contentHtml: editorRef.current.innerHTML });
  };

  const insertChecklistItem = () => {
    if (!editorRef.current || !selectedNote) return;
    editorRef.current.focus();
    const html = `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;"><input type="checkbox" /> <span>Item checklist materi</span></div>`;
    document.execCommand('insertHTML', false, html);
    patchNote(selectedNote.id, { contentHtml: editorRef.current.innerHTML });
  };

  const insertCodeBlock = () => {
    if (!editorRef.current || !selectedNote) return;
    editorRef.current.focus();
    const html = `<pre><code>// Tulis kode di sini</code></pre><p><br/></p>`;
    document.execCommand('insertHTML', false, html);
    patchNote(selectedNote.id, { contentHtml: editorRef.current.innerHTML });
  };

  const insertLink = () => {
    if (!editorRef.current || !selectedNote) return;
    const url = window.prompt('Masukkan URL tautan referensi (https://...):');
    if (!url) return;
    execFormat('createLink', url);
  };

  const handleInsertInlineImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNote || !editorRef.current) return;
    const dataUrl = await fileToDataUrl(file);
    editorRef.current.focus();
    document.execCommand(
      'insertHTML',
      false,
      `<img src="${dataUrl}" alt="${file.name}" /><p><br/></p>`
    );
    patchNote(selectedNote.id, { contentHtml: editorRef.current.innerHTML });
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNote) return;
    const dataUrl = await fileToDataUrl(file);
    const blobId = `blob-note-${Date.now()}`;
    await saveBlobToIdb({
      id: blobId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      dataUrl,
      savedAt: Date.now(),
    });
    const att: NoteAttachment = {
      blobId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
    };
    patchNote(selectedNote.id, {
      attachments: [...selectedNote.attachments, att],
    });
    onToast(`Lampiran "${file.name}" tersimpan.`);
  };

  const downloadAttachment = async (att: NoteAttachment) => {
    const blob = await getBlobFromIdb(att.blobId);
    if (!blob) {
      onToast('Lampiran tidak ditemukan di IndexedDB.');
      return;
    }
    triggerDataUrlDownload(blob.dataUrl, att.fileName);
  };

  const addCustomCategory = () => {
    const clean = newCategoryName.trim();
    if (!clean) return;
    if (!store.settings.customNoteCategories.includes(clean)) {
      onUpdateStore((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          customNoteCategories: [...prev.settings.customNoteCategories, clean],
        },
      }));
      onToast(`Kategori "${clean}" ditambahkan.`);
    }
    setNewCategoryName('');
  };

  const subjectChoices = useMemo(() => {
    const set = new Set<string>(['Umum']);
    store.subjects.forEach((s) => set.add(s.name));
    store.notes.forEach((n) => set.add(n.subjectName));
    return Array.from(set);
  }, [store.subjects, store.notes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            My Notes — Academic Notebook
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
            Buku catatan materi dosen dengan Rich Text Editor, Code Snippet, tag, dan auto-save lokal.
          </p>
        </div>

        <button
          onClick={createNote}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Note
        </button>
      </div>

      {/* Filters & Custom Category Creator */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul, topik, atau tag..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
            />
          </div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
          >
            <option value="All">Semua Mata Kuliah</option>
            {subjectChoices.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF]"
          >
            <option value="All">Semua Kategori</option>
            {store.settings.customNoteCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-[#EAF2FF] font-mono-tabular"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'pinned', label: 'Disematkan' },
                { id: 'favorite', label: 'Favorit' },
                { id: 'bookmarked', label: 'Bookmark' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setOnlySavedFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  onlySavedFilter === f.id
                    ? 'blue-gradient text-[#EAF2FF]'
                    : 'bg-slate-100 dark:bg-[#101B32] text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Kategori baru..."
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-xs"
            />
            <button
              type="button"
              onClick={addCustomCategory}
              className="px-3 py-1 rounded-lg border border-[#3B82F6]/40 text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8] cursor-pointer"
            >
              + Kategori
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Notebook Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Note List */}
        <div className="lg:col-span-4 space-y-2.5">
          {filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#3B82F6]/30 bg-white dark:bg-[#14213A]/70 p-8 text-center space-y-2">
              <NotebookPen className="w-8 h-8 mx-auto text-[#3B82F6]" />
              <p className="text-sm font-medium text-slate-800 dark:text-[#EAF2FF]">
                Belum ada catatan materi
              </p>
              <button
                onClick={createNote}
                className="px-4 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
              >
                + Buat Catatan Pertama
              </button>
            </div>
          ) : (
            filteredNotes.map((n) => {
              const active = selectedNote?.id === n.id;
              return (
                <div
                  key={n.id}
                  onClick={() => setSelectedNoteId(n.id)}
                  className={`rounded-xl border p-3.5 cursor-pointer space-y-1.5 ${
                    active
                      ? 'border-[#38BDF8] bg-white dark:bg-[#101B32]'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/80 hover:border-[#3B82F6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-[#94A3B8]">
                    <span className="truncate">
                      {n.subjectName} · {n.category}
                    </span>
                    <span className="font-mono-tabular shrink-0">{n.date}</span>
                  </div>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-[#EAF2FF] truncate">
                    {n.pinned ? '[Pin] ' : ''}
                    {n.title || 'Tanpa Judul'}
                  </h4>
                  {n.tags.length > 0 && (
                    <p className="text-[11px] text-[#2563EB] dark:text-[#38BDF8] truncate">
                      {n.tags.map((t) => `#${t}`).join(' ')}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rich Text Editor Pane */}
        <div className="lg:col-span-8">
          {!selectedNote ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/80 p-12 text-center text-sm text-slate-500 dark:text-[#94A3B8]">
              Pilih catatan di sebelah kiri atau buat catatan baru untuk mulai menulis materi dosen.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-[#3B82F6]/30 bg-white dark:bg-[#14213A]/90 p-5 space-y-4">
              {/* Top Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
                <span className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                  {saveStateLabel === 'saving' ? 'Menyimpan...' : 'Tersimpan otomatis secara lokal'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => patchNote(selectedNote.id, { pinned: !selectedNote.pinned })}
                    title="Pin Note"
                    className={`p-2 rounded-lg border cursor-pointer ${
                      selectedNote.pinned
                        ? 'border-[#38BDF8] text-[#38BDF8]'
                        : 'border-slate-200 dark:border-white/10 text-slate-400'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => patchNote(selectedNote.id, { favorite: !selectedNote.favorite })}
                    title="Favorite Note"
                    className={`p-2 rounded-lg border cursor-pointer ${
                      selectedNote.favorite
                        ? 'border-[#38BDF8] text-[#38BDF8]'
                        : 'border-slate-200 dark:border-white/10 text-slate-400'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchNote(selectedNote.id, { bookmarked: !selectedNote.bookmarked })
                    }
                    title="Bookmark Note"
                    className={`p-2 rounded-lg border cursor-pointer ${
                      selectedNote.bookmarked
                        ? 'border-[#38BDF8] text-[#38BDF8]'
                        : 'border-slate-200 dark:border-white/10 text-slate-400'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNote(selectedNote.id)}
                    title="Hapus Catatan"
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-amber-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metadata Inputs */}
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => patchNote(selectedNote.id, { title: e.target.value })}
                placeholder="Judul Catatan Materi..."
                className="w-full text-xl sm:text-2xl font-display font-bold bg-transparent text-slate-900 dark:text-[#EAF2FF] focus:outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <select
                  value={selectedNote.subjectName}
                  onChange={(e) => {
                    const matched = store.subjects.find((s) => s.name === e.target.value);
                    patchNote(selectedNote.id, {
                      subjectName: e.target.value,
                      subjectId: matched?.id,
                      lecturer: matched?.lecturer || selectedNote.lecturer,
                    });
                  }}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-slate-900 dark:text-[#EAF2FF]"
                >
                  <option value="Umum">Mata Kuliah: Umum</option>
                  {store.subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedNote.category}
                  onChange={(e) => patchNote(selectedNote.id, { category: e.target.value })}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-slate-900 dark:text-[#EAF2FF]"
                >
                  {store.settings.customNoteCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={selectedNote.date}
                  onChange={(e) => patchNote(selectedNote.id, { date: e.target.value })}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] px-3 py-2 font-mono-tabular text-slate-900 dark:text-[#EAF2FF]"
                />

                <input
                  type="text"
                  value={selectedNote.lecturer}
                  onChange={(e) => patchNote(selectedNote.id, { lecturer: e.target.value })}
                  placeholder="Nama Dosen"
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-slate-900 dark:text-[#EAF2FF]"
                />

                <input
                  type="text"
                  value={selectedNote.topic}
                  onChange={(e) => patchNote(selectedNote.id, { topic: e.target.value })}
                  placeholder="Topik Pertemuan (misal: Pertemuan 5)"
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-slate-900 dark:text-[#EAF2FF]"
                />

                <input
                  type="text"
                  value={selectedNote.tags.join(', ')}
                  onChange={(e) =>
                    patchNote(selectedNote.id, {
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Tags (pisahkan koma: uts, graph)"
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>

              {/* Rich Text Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-slate-100 dark:bg-[#070B14] border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => execFormat('formatBlock', 'H1')}
                  title="Heading 1"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <Heading1 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('formatBlock', 'H2')}
                  title="Heading 2"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('bold')}
                  title="Bold"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('italic')}
                  title="Italic"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('underline')}
                  title="Underline"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('insertUnorderedList')}
                  title="Bullet List"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('insertOrderedList')}
                  title="Numbered List"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={insertChecklistItem}
                  title="Checklist"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={insertCodeBlock}
                  title="Code Block"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <Code2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('hiliteColor', 'rgba(56, 189, 248, 0.28)')}
                  title="Text Highlight"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <Highlighter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={insertLink}
                  title="Insert Link"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                <label
                  title="Insert Image"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#14213A] cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleInsertInlineImage}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Editable Area */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  if (editorRef.current) {
                    patchNote(selectedNote.id, { contentHtml: editorRef.current.innerHTML });
                  }
                }}
                className="study-editor-content min-h-[220px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#070B14]/75 p-4 text-sm leading-relaxed text-slate-800 dark:text-[#EAF2FF] focus:outline-none focus:border-[#38BDF8]"
              />

              {/* Dedicated Programming Code Snippet Box */}
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#38BDF8]" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-[#EAF2FF]">
                      Code Snippet Lab
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedNote.codeLanguage || 'TypeScript'}
                      onChange={(e) =>
                        patchNote(selectedNote.id, { codeLanguage: e.target.value })
                      }
                      className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101B32] px-2 py-1 text-xs"
                    >
                      {[
                        'TypeScript',
                        'JavaScript',
                        'Python',
                        'PHP',
                        'SQL',
                        'C++',
                        'Java',
                        'HTML/CSS',
                      ].map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedNote.codeSnippet || '');
                        onToast('Code snippet disalin.');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      Salin
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={selectedNote.codeSnippet || ''}
                  onChange={(e) => patchNote(selectedNote.id, { codeSnippet: e.target.value })}
                  placeholder="// Tempel contoh kode algoritma, query SQL, atau sintaks dari dosen di sini..."
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101B32] p-3 font-mono-tabular text-xs text-slate-900 dark:text-[#EAF2FF]"
                />
              </div>

              {/* Note Attachments */}
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-medium cursor-pointer hover:border-[#38BDF8]">
                  <Paperclip className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Lampirkan File ke Catatan
                  <input type="file" onChange={handleAttachFile} className="hidden" />
                </label>

                {selectedNote.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.attachments.map((att) => (
                      <button
                        key={att.blobId}
                        type="button"
                        onClick={() => downloadAttachment(att)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#101B32] border border-slate-200 dark:border-white/10 text-xs cursor-pointer hover:border-[#38BDF8]"
                      >
                        <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                        {att.fileName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
