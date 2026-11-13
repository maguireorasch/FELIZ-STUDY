import { ClassSchedule, FelizStudyStore, Subject } from '../types/study';
import {
  clearAllBlobsFromIdb,
  getAllBlobsFromIdb,
  saveBlobToIdb,
  StoredFileBlob,
} from './studyIndexedDb';

const STORAGE_KEY = 'feliz_study_store_v1';
const IMPORTED_TIF_KEY = 'feliz_study_tif_2627_imported_v1';

export const STUDY_HERO_IMAGE = '/src/assets/images/feliz_study_hero_blue_1794593082200.jpg';

const SEED_TIMESTAMP = '2026-11-13T10:16:00.000Z';

export const TIF_SEM3_SUBJECTS: Subject[] = [
  {
    id: 'sub-tif-1',
    name: 'Kemuhammadiyahan',
    lecturer: '',
    code: 'MKWU',
    semester: 3,
    credits: 3,
    description: 'Mata Kuliah Wajib Umum (MKWU) Semester 3 Prodi Teknologi Informasi.',
    color: '#0EA5E9',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sub-tif-2',
    name: 'English Specific Purposes',
    lecturer: '',
    code: 'TIF-ESP',
    semester: 3,
    credits: 2,
    description: 'MK Inti Prodi — Bahasa Inggris khusus bidang Teknologi Informasi.',
    color: '#3B82F6',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sub-tif-3',
    name: 'HCI',
    lecturer: '',
    code: 'TIF-HCI',
    semester: 3,
    credits: 3,
    description: 'Human-Computer Interaction (MK Inti Prodi).',
    color: '#2563EB',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sub-tif-4',
    name: 'Administrasi Sistem',
    lecturer: '',
    code: 'TIF-AS',
    semester: 3,
    credits: 4,
    description: 'Praktikum & Teori Administrasi Sistem di Lab Jar / D103.',
    color: '#38BDF8',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sub-tif-5',
    name: 'Basis Data',
    lecturer: '',
    code: 'TIF-BD',
    semester: 3,
    credits: 4,
    description: 'Praktikum & Teori Basis Data di Lab Komp / D104.',
    color: '#1D4ED8',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sub-tif-6',
    name: 'Etika Profesi',
    lecturer: '',
    code: 'TIF-EP',
    semester: 3,
    credits: 2,
    description: 'MK Inti Prodi — Etika Profesi Teknologi Informasi (IM P-1).',
    color: '#0284C7',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sub-tif-7',
    name: 'Jaringan Komputer Lanjut',
    lecturer: '',
    code: 'TIF-JKL',
    semester: 3,
    credits: 4,
    description: 'Praktikum & Teori Jaringan Komputer Lanjut di Lab Jar / D103.',
    color: '#1E40AF',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sub-tif-8',
    name: 'Organisasi & Arsitektur Komputer',
    lecturer: '',
    code: 'TIF-OAK',
    semester: 3,
    credits: 2,
    description: 'MK Inti Prodi — Organisasi & Arsitektur Komputer.',
    color: '#0369A1',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sub-tif-9',
    name: 'Probabilitas & Statistika',
    lecturer: '',
    code: 'TIF-PS',
    semester: 3,
    credits: 2,
    description: 'MK Inti Prodi — Probabilitas & Statistika.',
    color: '#2563EB',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const TIF_SEM3_SCHEDULES: ClassSchedule[] = [
  {
    id: 'sch-tif-1',
    subjectId: 'sub-tif-1',
    subjectName: 'Kemuhammadiyahan',
    lecturerName: '',
    day: 'Senin',
    startTime: '09:10',
    endTime: '11:40',
    classroom: 'Aula 1 / Theater',
    notes: 'MKWU · 3 jam pelajaran (09.10–11.40)',
    color: '#0EA5E9',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sch-tif-2',
    subjectId: 'sub-tif-2',
    subjectName: 'English Specific Purposes',
    lecturerName: '',
    day: 'Senin',
    startTime: '12:40',
    endTime: '14:20',
    classroom: 'D202',
    notes: 'MK Inti Prodi · 2 jam pelajaran (12.40–14.20)',
    color: '#3B82F6',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sch-tif-3',
    subjectId: 'sub-tif-3',
    subjectName: 'HCI',
    lecturerName: '',
    day: 'Senin',
    startTime: '14:20',
    endTime: '17:10',
    classroom: 'D202',
    notes: "MK Inti Prodi · Sesi 14.20–15.10 & 15.30–17.10 (jeda Sholat 'Asyar 15.10–15.30)",
    color: '#2563EB',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sch-tif-4',
    subjectId: 'sub-tif-4',
    subjectName: 'Administrasi Sistem',
    lecturerName: '',
    day: 'Selasa',
    startTime: '07:50',
    endTime: '11:40',
    classroom: 'Lab Jar / D103',
    notes: 'MK Inti Prodi · Sesi 07.50–08.40 & 09.10–11.40 (jeda Sholat Dhuha 08.40–09.10)',
    color: '#38BDF8',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sch-tif-5',
    subjectId: 'sub-tif-5',
    subjectName: 'Basis Data',
    lecturerName: '',
    day: 'Selasa',
    startTime: '12:40',
    endTime: '16:20',
    classroom: 'Lab Komp / D104',
    notes: "MK Inti Prodi · Sesi 12.40–15.10 & 15.30–16.20 (jeda Sholat 'Asyar 15.10–15.30)",
    color: '#1D4ED8',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sch-tif-6',
    subjectId: 'sub-tif-6',
    subjectName: 'Etika Profesi',
    lecturerName: '',
    day: 'Rabu',
    startTime: '07:00',
    endTime: '08:40',
    classroom: 'D202',
    notes: 'MK Inti Prodi · IM P-1 (07.00–08.40)',
    color: '#0284C7',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sch-tif-7',
    subjectId: 'sub-tif-7',
    subjectName: 'Jaringan Komputer Lanjut',
    lecturerName: '',
    day: 'Rabu',
    startTime: '09:10',
    endTime: '13:30',
    classroom: 'Lab Jar / D103',
    notes: 'MK Inti Prodi · Sesi 09.10–11.40 & 12.40–13.30 (jeda Sholat Dhuhur 11.40–12.40)',
    color: '#1E40AF',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sch-tif-8',
    subjectId: 'sub-tif-8',
    subjectName: 'Organisasi & Arsitektur Komputer',
    lecturerName: '',
    day: 'Kamis',
    startTime: '07:00',
    endTime: '08:40',
    classroom: 'Belum terlihat di gambar',
    notes: 'MK Inti Prodi · Ruang kelas terpotong pada gambar jadwal; silakan lengkapi via Edit',
    color: '#0369A1',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'sch-tif-9',
    subjectId: 'sub-tif-9',
    subjectName: 'Probabilitas & Statistika',
    lecturerName: '',
    day: 'Kamis',
    startTime: '09:10',
    endTime: '10:50',
    classroom: 'Gedung D (kode ruang terpotong)',
    notes: 'MK Inti Prodi · Kode ruang D... terpotong pada gambar jadwal; silakan lengkapi via Edit',
    color: '#2563EB',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const EMPTY_STUDY_STORE: FelizStudyStore = {
  academic_profile: {
    name: 'Mahasiswa TI',
    program: 'Teknologi Informasi',
    semester: 3,
    academicYear: '2026/2027',
    updatedAt: SEED_TIMESTAMP,
  },
  subjects: [],
  schedules: [],
  assignments: [],
  study_sessions: [],
  notes: [],
  documents: [],
  ai_conversations: [],
  calendar_events: [],
  recommendations: [],
  settings: {
    theme: 'dark',
    notificationsEnabled: true,
    browserNotificationsGranted: false,
    pomodoroFocusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    dailySessionTarget: 4,
    customNoteCategories: ['Kuliah', 'Praktikum', 'Ringkasan Ujian', 'Referensi'],
  },
};

export const INITIAL_STUDY_STORE: FelizStudyStore = {
  ...EMPTY_STUDY_STORE,
  subjects: TIF_SEM3_SUBJECTS,
  schedules: TIF_SEM3_SCHEDULES,
};

export function loadStudyStore(): FelizStudyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(IMPORTED_TIF_KEY, '1');
      return INITIAL_STUDY_STORE;
    }

    const parsed = JSON.parse(raw) as Partial<FelizStudyStore>;
    const alreadyImported = localStorage.getItem(IMPORTED_TIF_KEY) === '1';

    let subjects = parsed.subjects || [];
    let schedules = parsed.schedules || [];

    // One-time import for existing local sessions that still had empty schedules
    if (!alreadyImported && schedules.length === 0) {
      localStorage.setItem(IMPORTED_TIF_KEY, '1');
      schedules = TIF_SEM3_SCHEDULES;
      if (subjects.length === 0) {
        subjects = TIF_SEM3_SUBJECTS;
      }
    }

    return {
      ...EMPTY_STUDY_STORE,
      ...parsed,
      subjects,
      schedules,
      academic_profile: {
        ...EMPTY_STUDY_STORE.academic_profile,
        ...(parsed.academic_profile || {}),
      },
      settings: {
        ...EMPTY_STUDY_STORE.settings,
        ...(parsed.settings || {}),
        customNoteCategories:
          parsed.settings?.customNoteCategories || EMPTY_STUDY_STORE.settings.customNoteCategories,
      },
    };
  } catch {
    return INITIAL_STUDY_STORE;
  }
}

export function saveStudyStore(store: FelizStudyStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Handle storage quota limits gracefully
  }
}

export async function exportStudyBackup(store: FelizStudyStore): Promise<string> {
  const blobs = await getAllBlobsFromIdb().catch(() => ({}));
  const payload = {
    app: 'FELIZ-STUDY-BLUE-EDITION',
    version: 1,
    exportedAt: new Date().toISOString(),
    store,
    blobs,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importStudyBackup(rawJson: string): Promise<FelizStudyStore> {
  const parsed = JSON.parse(rawJson) as {
    app?: string;
    store?: Partial<FelizStudyStore>;
    blobs?: Record<string, StoredFileBlob>;
  };

  if (parsed.app !== 'FELIZ-STUDY-BLUE-EDITION' || !parsed.store) {
    throw new Error('Format file backup FELIZ STUDY tidak valid.');
  }

  const merged: FelizStudyStore = {
    ...EMPTY_STUDY_STORE,
    ...parsed.store,
    academic_profile: {
      ...EMPTY_STUDY_STORE.academic_profile,
      ...(parsed.store.academic_profile || {}),
    },
    settings: {
      ...EMPTY_STUDY_STORE.settings,
      ...(parsed.store.settings || {}),
      customNoteCategories:
        parsed.store.settings?.customNoteCategories ||
        EMPTY_STUDY_STORE.settings.customNoteCategories,
    },
  };

  localStorage.setItem(IMPORTED_TIF_KEY, '1');
  saveStudyStore(merged);

  if (parsed.blobs && typeof parsed.blobs === 'object') {
    await clearAllBlobsFromIdb();
    for (const blob of Object.values(parsed.blobs)) {
      if (blob && blob.id && blob.dataUrl) {
        await saveBlobToIdb(blob);
      }
    }
  }

  return merged;
}

export async function clearAllStudyData(): Promise<FelizStudyStore> {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(IMPORTED_TIF_KEY, '1');
  await clearAllBlobsFromIdb().catch(() => {});
  saveStudyStore(EMPTY_STUDY_STORE);
  return EMPTY_STUDY_STORE;
}
