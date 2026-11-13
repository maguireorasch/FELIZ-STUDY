export type StudyNavTab =
  | 'dashboard'
  | 'schedule'
  | 'assignments'
  | 'focus'
  | 'notes'
  | 'documents'
  | 'ai'
  | 'progress'
  | 'calendar'
  | 'settings';

export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';

export type AssignmentPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type AssignmentStatus = 'To Do' | 'In Progress' | 'Completed';

export type AiMode =
  | 'AI Tutor'
  | 'Material Summarizer'
  | 'PDF & PPT Analyzer'
  | 'Quiz Generator'
  | 'Programming Tutor'
  | 'Debugging Assistant'
  | 'Study Roadmap'
  | 'Smart Learning Recommendation';

export type CalendarCategory =
  | 'Class Schedule'
  | 'Assignment Deadline'
  | 'Study Session'
  | 'Exam'
  | 'Personal Reminder';

export interface AcademicProfile {
  name: string;
  program: string;
  semester: number;
  academicYear: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  lecturer: string;
  code: string;
  semester: number;
  credits: number;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSchedule {
  id: string;
  subjectId?: string;
  subjectName: string;
  lecturerName: string;
  day: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  classroom: string;
  notes: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentAttachment {
  blobId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Assignment {
  id: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  lecturer: string;
  description: string;
  assignedDate: string;
  deadline: string; // YYYY-MM-DDTHH:mm or YYYY-MM-DD
  priority: AssignmentPriority;
  status: AssignmentStatus;
  progress: number; // 0-100
  attachment?: AssignmentAttachment;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  subjectId?: string;
  subjectName: string;
  mode: 'Pomodoro' | 'Focus Session' | 'Short Break' | 'Long Break' | 'Custom Timer';
  durationMinutes: number;
  targetSessions: number;
  notes: string;
  completedAt: string;
}

export interface NoteAttachment {
  blobId: string;
  fileName: string;
  mimeType: string;
}

export interface AcademicNote {
  id: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  category: string;
  lecturer: string;
  date: string;
  topic: string;
  contentHtml: string;
  codeSnippet?: string;
  codeLanguage?: string;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  bookmarked: boolean;
  attachments: NoteAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface LectureDocument {
  id: string;
  blobId: string;
  name: string;
  originalFileName: string;
  fileExt: string;
  mimeType: string;
  sizeBytes: number;
  subjectId?: string;
  subjectName: string;
  description: string;
  tags: string[];
  extractedText?: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: AiMode;
  attachedDocName?: string;
  timestamp: string;
}

export interface AiConversation {
  id: string;
  title: string;
  mode: AiMode;
  messages: AiMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: CalendarCategory;
  subjectName?: string;
  description?: string;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningRecommendation {
  id: string;
  recommendedSubject: string;
  recommendedTopic: string;
  reason: string;
  suggestedDurationMinutes: number;
  priority: AssignmentPriority;
  suggestedResources: string;
  status: 'pending' | 'accepted' | 'dismissed' | 'saved';
  createdAt: string;
}

export interface StudySettings {
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  browserNotificationsGranted: boolean;
  pomodoroFocusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  dailySessionTarget: number;
  customNoteCategories: string[];
}

export interface FelizStudyStore {
  academic_profile: AcademicProfile;
  subjects: Subject[];
  schedules: ClassSchedule[];
  assignments: Assignment[];
  study_sessions: StudySession[];
  notes: AcademicNote[];
  documents: LectureDocument[];
  ai_conversations: AiConversation[];
  calendar_events: CalendarEvent[];
  recommendations: LearningRecommendation[];
  settings: StudySettings;
}
