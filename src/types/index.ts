export interface TeacherSettings {
  gradeScale: {
    min: number;
    max: number;
    passingGrade: number;
  };
  riskThresholds: {
    minGrade: number;          // e.g. 3.0
    minAttendanceRate: number; // e.g. 75 (%)
    maxUnsubmitted: number;    // e.g. 3
  };
  periods: string[];
  behaviorCategories: {
    id: string;
    label: string;
    type: 'positive' | 'negative' | 'neutral';
    icon?: string;
  }[];
}

export interface TeacherProfile {
  uid: string;
  email: string;
  displayName: string;
  institution: string;
  createdAt: string;
  settings: TeacherSettings;
}

export interface ComponentWeights {
  academic: number;   // e.g. 0.85 (85%)
  attendance: number; // e.g. 0.15 (15%)
  behavior?: number;  // opcional
}

export interface Course {
  id: string;
  teacherId: string;
  name: string;             // e.g. "7°-1"
  gradeLevel: string;       // e.g. "7°"
  group: string;            // e.g. "1"
  academicYear: number;     // e.g. 2026
  institution: string;      // e.g. "I.E. San José"
  shift: string;            // e.g. "Mañana" | "Tarde"
  subject: string;          // e.g. "Tecnología e Informática"
  currentPeriod: string;    // e.g. "Periodo 1"
  scheduleTime?: string;    // e.g. "07:30" (Hora de inicio de la clase)
  scheduleEndTime?: string; // e.g. "08:30" (Hora de fin de la clase)
  scheduleDays?: string[];  // e.g. ["Lunes", "Miércoles", "Viernes"]
  studentCount?: number;
  componentWeights?: ComponentWeights;
  createdAt: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  type: 'class_reminder' | 'activity_due' | 'system';
  title: string;
  message: string;
  courseName?: string;
  activityId?: string;
  timestamp: number;
  read: boolean;
}

export interface Student {
  id: string;
  courseId: string;
  listNumber: number;       // e.g. 1, 2, 3... (Independiente del código único)
  fullName: string;
  documentNumber?: string;
  uniqueCode: string;       // e.g. "A7K92P" (Alfanumérico único no sensible)
  active: boolean;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  timestamp: string;
  source: 'qr' | 'manual';
  notes?: string;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  date: string;             // YYYY-MM-DD
  period: string;
  records: Record<string, AttendanceRecord>;
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Activity {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  period: string;
  weightPercentage: number; // e.g. 20 (20%)
  maxGrade: number;         // e.g. 5.0
  dueDate: string;          // YYYY-MM-DD
  status: 'active' | 'closed';
  createdAt: string;
}

export type SubmissionStatus = 'delivered' | 'not_delivered' | 'pending' | 'late';

export interface Submission {
  id: string;
  activityId: string;
  studentId: string;
  courseId: string;
  status: SubmissionStatus;
  grade?: number | null;
  feedback?: string;
  submittedAt?: string;
}

export type BehaviorType =
  | 'positive'
  | 'negative'
  | 'warning'
  | 'recognition'
  | 'non_compliance'
  | 'participation'
  | 'social';

export interface BehaviorRecord {
  id: string;
  courseId: string;
  studentId: string;
  date: string;
  type: BehaviorType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  observation?: string;
  createdAt: string;
}

export interface StudentObservation {
  id: string;
  courseId: string;
  studentId: string;
  date: string;
  text: string;
  createdAt: string;
}

export interface RiskAlert {
  studentId: string;
  studentName: string;
  listNumber: number;
  uniqueCode: string;
  level: 'high' | 'medium' | 'low';
  currentAverage: number;
  attendanceRate: number;
  unsubmittedCount: number;
  trend: 'descending' | 'stable' | 'ascending';
  reasons: string[];
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
}
