import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  Eye,
  FileText,
  FolderUp,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { FelizStudyStore, LectureDocument } from '../../types/study';
import { extractDocumentText } from '../../lib/documentParser';
import {
  deleteBlobFromIdb,
  fileToDataUrl,
  getBlobFromIdb,
  saveBlobToIdb,
  triggerDataUrlDownload,
} from '../../lib/studyIndexedDb';

interface DocumentsViewProps {
  store: FelizStudyStore;
  onUpdateStore: (updater: (prev: FelizStudyStore) => FelizStudyStore) => void;
  onAnalyzeWithAi: (doc: LectureDocument) => void;
  onToast: (msg: string) => void;
}

const ACCEPTED_EXTS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DocumentsView({
  store,
  onUpdateStore,
  onAnalyzeWithAi,
  onToast,
}: DocumentsViewProps) {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Upload Form Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [subjectId, setSubjectId] = useState(store.subjects[0]?.id || '');
  const [subjectName, setSubjectName] = useState(store.subjects[0]?.name || 'Umum');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<LectureDocument | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'visual' | 'text'>('visual');

  // Rename / Edit Modal
  const [editingDoc, setEditingDoc] = useState<LectureDocument | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');

  const subjectChoices = useMemo(() => {
    const set = new Set<string>(['Umum']);
    store.subjects.forEach((s) => set.add(s.name));
    store.documents.forEach((d) => set.add(d.subjectName));
    return Array.from(set);
  }, [store.subjects, store.documents]);

  const filteredDocs = useMemo(() => {
    return store.documents
      .filter((d) => {
        if (subjectFilter !== 'All' && d.subjectName !== subjectFilter) return false;
        if (dateFilter && d.uploadedAt.slice(0, 10) !== dateFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            d.name.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q) ||
            d.subjectName.toLowerCase().includes(q) ||
            d.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [store.documents, subjectFilter, dateFilter, search]);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ACCEPTED_EXTS.includes(ext)) {
      onToast('Format file belum didukung. Gunakan PDF, PPT, PPTX, DOC, DOCX, JPG, PNG, atau TXT.');
      return;
    }
    setSelectedFile(file);
    setDocName(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      onToast('Pilih file materi dosen terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      const extractedText = await extractDocumentText(selectedFile);
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const blobId = `blob-doc-${Date.now()}`;

      await saveBlobToIdb({
        id: blobId,
        name: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        dataUrl,
        savedAt: Date.now(),
      });

      const now = new Date().toISOString();
      const newDoc: LectureDocument = {
        id: `doc-${Date.now()}`,
        blobId,
        name: docName.trim() || selectedFile.name,
        originalFileName: selectedFile.name,
        fileExt: ext.toUpperCase(),
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
        subjectId: subjectId || undefined,
        subjectName: subjectName.trim() || 'Umum',
        description: description.trim(),
        tags: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        extractedText,
        uploadedAt: now,
        updatedAt: now,
      };

      onUpdateStore((prev) => ({
        ...prev,
        documents: [newDoc, ...prev.documents],
      }));

      setShowUploadModal(false);
      setSelectedFile(null);
      setDocName('');
      setDescription('');
      setTagsText('');
      onToast(`Dokumen "${newDoc.name}" berhasil disimpan di IndexedDB.`);
    } catch {
      onToast('Gagal menyimpan dokumen.');
    } finally {
      setIsUploading(false);
    }
  };

  const openPreview = async (doc: LectureDocument) => {
    setPreviewDoc(doc);
    setPreviewDataUrl(null);
    const isVisual = ['PDF', 'JPG', 'JPEG', 'PNG'].includes(doc.fileExt);
    setPreviewTab(isVisual ? 'visual' : 'text');
    const blob = await getBlobFromIdb(doc.blobId);
    if (blob) {
      setPreviewDataUrl(blob.dataUrl);
    }
  };

  const handleDownload = async (doc: LectureDocument) => {
    const blob = await getBlobFromIdb(doc.blobId);
    if (!blob) {
      onToast('File tidak ditemukan di IndexedDB.');
      return;
    }
    triggerDataUrlDownload(blob.dataUrl, doc.originalFileName);
  };

  const handleDelete = async (doc: LectureDocument) => {
    await deleteBlobFromIdb(doc.blobId).catch(() => {});
    onUpdateStore((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== doc.id),
    }));
    if (previewDoc?.id === doc.id) setPreviewDoc(null);
    onToast('Dokumen dihapus.');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editName.trim()) return;
    onUpdateStore((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === editingDoc.id
          ? {
              ...d,
              name: editName.trim(),
              description: editDesc.trim(),
              tags: editTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
              updatedAt: new Date().toISOString(),
            }
          : d
      ),
    }));
    setEditingDoc(null);
    onToast('Info dokumen diperbarui.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            My Documents — Lecture Library
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
            Simpan PDF, PPT/PPTX, DOC/DOCX, gambar, dan TXT materi dosen di IndexedDB lengkap dengan ekstraksi teks &amp; preview.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold blue-glow whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FolderUp className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama dokumen atau tag..."
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
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070B14] text-sm font-mono-tabular text-slate-900 dark:text-[#EAF2FF]"
        />
      </div>

      {/* Document Grid */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#3B82F6]/35 bg-white dark:bg-[#14213A]/70 p-12 text-center space-y-3">
          <FileText className="w-10 h-10 mx-auto text-[#3B82F6]" />
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-[#EAF2FF]">
            {store.documents.length === 0
              ? 'Perpustakaan materi kuliah masih kosong'
              : 'Tidak ada dokumen yang sesuai filter'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
            Unggah slide PPTX, modul PDF, atau dokumen Word dari dosen untuk dipreview dan dianalisis langsung oleh Gemini AI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14213A]/90 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
                  <span className="font-mono-tabular font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                    {doc.fileExt} · {formatSize(doc.sizeBytes)}
                  </span>
                  <span className="font-mono-tabular">{doc.uploadedAt.slice(0, 10)}</span>
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF] truncate">
                  {doc.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Mata Kuliah: {doc.subjectName}
                </p>
                {doc.description && (
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] line-clamp-2">
                    {doc.description}
                  </p>
                )}
                {doc.tags.length > 0 && (
                  <p className="text-[11px] text-[#38BDF8] truncate">
                    {doc.tags.map((t) => `#${t}`).join(' ')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openPreview(doc)}
                    title="Preview Dokumen"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#101B32] text-xs font-medium text-slate-800 dark:text-[#EAF2FF] hover:text-[#38BDF8] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => onAnalyzeWithAi(doc)}
                    title="Analisis dengan AI Assistant"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(doc)}
                    aria-label="Download"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#38BDF8] cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingDoc(doc);
                      setEditName(doc.name);
                      setEditDesc(doc.description);
                      setEditTags(doc.tags.join(', '));
                    }}
                    aria-label="Rename"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#3B82F6] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    aria-label="Delete"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadSubmit}
            className="w-full max-w-md rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
                Upload Materi Dosen
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block border-2 border-dashed border-slate-300 dark:border-[#3B82F6]/40 rounded-xl p-5 text-center cursor-pointer hover:border-[#38BDF8]">
              <FolderUp className="w-7 h-7 mx-auto text-[#38BDF8] mb-2" />
              <p className="text-xs font-medium text-slate-700 dark:text-[#EAF2FF]">
                {selectedFile
                  ? `${selectedFile.name} (${formatSize(selectedFile.size)})`
                  : 'Pilih file PDF, PPT, PPTX, DOC, DOCX, JPG, PNG, atau TXT'}
              </p>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.txt"
                onChange={handleFilePicked}
                className="hidden"
              />
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Nama Dokumen
              </label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                required
                placeholder="Contoh: Slide Pertemuan 4 - Tree & Graph"
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Mata Kuliah
              </label>
              {store.subjects.length > 0 ? (
                <select
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    const found = store.subjects.find((s) => s.id === e.target.value);
                    setSubjectName(found?.name || 'Umum');
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                >
                  <option value="">Umum</option>
                  {store.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Nama mata kuliah"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Deskripsi
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ringkasan singkat materi..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Tags (pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="uts, slide, modul"
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 rounded-xl blue-gradient text-[#EAF2FF] text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              {isUploading ? 'Memproses & Mengekstrak Konten...' : 'Simpan ke Perpustakaan'}
            </button>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#EAF2FF] truncate">
                  {previewDoc.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  {previewDoc.fileExt} · {previewDoc.subjectName} · {formatSize(previewDoc.sizeBytes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewTab('visual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    previewTab === 'visual'
                      ? 'blue-gradient text-[#EAF2FF]'
                      : 'bg-slate-100 dark:bg-[#14213A]'
                  }`}
                >
                  Preview File
                </button>
                <button
                  onClick={() => setPreviewTab('text')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    previewTab === 'text'
                      ? 'blue-gradient text-[#EAF2FF]'
                      : 'bg-slate-100 dark:bg-[#14213A]'
                  }`}
                >
                  Teks Terekstrak
                </button>
                <button
                  onClick={() => {
                    const target = previewDoc;
                    setPreviewDoc(null);
                    onAnalyzeWithAi(target);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Tanya AI
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-[#070B14]">
              {previewTab === 'visual' ? (
                previewDataUrl ? (
                  previewDoc.fileExt === 'PDF' ? (
                    <iframe
                      src={previewDataUrl}
                      title={previewDoc.name}
                      className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-white/10"
                    />
                  ) : ['JPG', 'JPEG', 'PNG'].includes(previewDoc.fileExt) ? (
                    <img
                      src={previewDataUrl}
                      alt={previewDoc.name}
                      className="mx-auto max-h-[65vh] object-contain rounded-xl"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-3">
                      <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
                        Preview visual langsung tidak tersedia untuk format .{previewDoc.fileExt}. Lihat tab &ldquo;Teks Terekstrak&rdquo; atau unduh file asli.
                      </p>
                      <button
                        onClick={() => handleDownload(previewDoc)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Unduh {previewDoc.originalFileName}
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-center py-8 text-slate-500">Memuat file dari IndexedDB...</p>
                )
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-[#EAF2FF] bg-white dark:bg-[#101B32] p-5 rounded-xl border border-slate-200 dark:border-white/10">
                  {previewDoc.extractedText || 'Tidak ada teks yang terekstrak.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-sm rounded-2xl border border-[#3B82F6]/40 bg-white dark:bg-[#101B32] p-6 space-y-4"
          >
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#EAF2FF]">
              Rename &amp; Edit Info Dokumen
            </h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
            />
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Deskripsi"
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
            />
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="Tags (koma)"
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070B14] px-3 py-2 text-sm text-slate-900 dark:text-[#EAF2FF]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl blue-gradient text-[#EAF2FF] text-xs font-semibold cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
