export interface FieldDefinition {
  index: number;
  column: string;
  label: string;
  key: string;
}

export interface StudentRecord {
  id: string; // e.g. "stt-1"
  stt: string; // Cột A
  maHocSinh: string; // Cột B
  maVemis: string; // Cột C
  maMoet: string; // Cột D
  soDangBo: string; // Cột E
  hoVaTen: string; // Cột F
  ngaySinh: string; // Cột G
  ngayVaoTruong: string; // Cột H
  gioiTinh: string; // Cột I
  quocTich: string; // Cột J
  choO_SNXom: string; // Cột K
  choO_KhuDanCu: string; // Cột L
  choO_XaPhuong: string; // Cột M
  choO_TinhTp: string; // Cột N
  hokhau_SNXom: string; // Cột O
  hokhau_KhuDanCu: string; // Cột P
  hokhau_XaPhuong: string; // Cột Q
  hokhau_TinhTp: string; // Cột R
  noiSinh_ThongTin: string; // Cột S
  noiSinh_XaPhuong: string; // Cột T
  noiSinh_TinhTp: string; // Cột U
  queQuan_ThongTin: string; // Cột V
  queQuan_XaPhuong: string; // Cột W
  queQuan_TinhTp: string; // Cột X
  noiKhaiSinh_XaPhuong: string; // Cột Y
  noiKhaiSinh_TinhTp: string; // Cột Z
  canCuoc: string; // Cột AA
  ngayCapCanCuoc: string; // Cột AB
  noiCapCanCuoc: string; // Cột AC
  danToc: string; // Cột AD
  tonGiao: string; // Cột AE
  dienChinhSach: string; // Cột AF
  canNgheo: string; // Cột AG
  doanVien: string; // Cột AH
  doiVien: string; // Cột AI
  tenCha: string; // Cột AJ
  ngheNghiepCha: string; // Cột AK
  namSinhCha: string; // Cột AL
  tenMe: string; // Cột AM
  ngheNghiepMe: string; // Cột AN
  namSinhMe: string; // Cột AO
  dienThoaiSLL: string; // Cột AP
  emailSLL: string; // Cột AQ
  dienThoaiBo: string; // Cột AR
  dienThoaiMe: string; // Cột AS
  dienThoaiHS: string; // Cột AT
  khuyetTat: string; // Cột AU
  ntruBtru: string; // Cột AV
  ghiChu: string; // Cột AW
  rawData: Record<string, string>; // 49 trường với key là label chuẩn
  extension?: StudentExtensionData; // Dữ liệu bổ sung từ DB mở rộng
}

export interface StudentExtensionData {
  stt: string;
  cccd?: string;
  // Giáo viên nhập:
  academicLastYear?: string; // Học lực năm trước
  conductLastYear?: string; // Hạnh kiểm năm trước
  strengths?: string; // Môn thế mạnh
  weaknesses?: string; // Môn cần hỗ trợ
  teacherProgressNote?: string; // Đánh giá quá trình tiến bộ
  teacherSpecialNote?: string; // Lưu ý riêng / Hoàn cảnh đặc biệt
  aiAnalysisReport?: string; // Báo cáo AI phân tích
  // Học sinh nhập:
  hobbies?: string; // Sở thích cá nhân
  dreams?: string; // Ước mơ / Định hướng nghề nghiệp
  personalNote?: string; // Lời nhắn nhủ
  updatedAt?: string;
}

export interface StudentMessage {
  id: string;
  stt: string;
  studentName: string;
  sender: "student" | "teacher";
  content: string;
  isConfidential: boolean; // Tin nhắn riêng tư cần giữ kín
  createdAt: string;
  status: "unread" | "read" | "replied";
}

export interface StudentSummary {
  id: string;
  stt: string;
  name: string;
  birthDate: string;
}

export interface SearchResponse {
  ok: boolean;
  query: string;
  total: number;
  matches: StudentSummary[];
  singleStudent?: StudentRecord;
  message?: string;
}

export interface FieldGroup {
  id: string;
  title: string;
  icon: string;
  fields: {
    label: string;
    value: string;
  }[];
}

export interface AuthSession {
  email: string;
  name: string;
  role: "teacher" | "admin" | "school_admin" | "student" | "bgh" | "leader";
  classId?: string; // Ví dụ: "8A6", "8A1"
  team?: number; // Tổ nếu là tổ trưởng
  stt?: string; // Số thứ tự nếu là học sinh
  cccd?: string;
  iat?: number;
  exp?: number;
}

// === GIAI ĐOẠN 1: ĐIỂM DANH, NỀ NẾP, QUAN TÂM ĐẶC BIỆT, SINH NHẬT ===

export type AttendanceStatus = "present" | "excused" | "unexcused" | "late";

export interface AttendanceRecord {
  stt: string;
  studentName?: string;
  status: AttendanceStatus;
  note?: string;
}

export interface DailyAttendance {
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceRecord>; // key: stt
  updatedAt: string;
}

export interface StudentAttendanceSummary {
  stt: string;
  name: string;
  totalDays: number;
  presentDays: number;
  excusedDays: number;
  unexcusedDays: number;
  lateDays: number;
  attendanceRate: number; // Tỷ lệ chuyên cần (%)
}

export interface ConductLog {
  id: string;
  date: string; // YYYY-MM-DD
  stt: string;
  studentName: string;
  type: "praise" | "violation";
  title: string;
  points: number; // Điểm cộng (+) hoặc trừ (-)
  note?: string;
  createdAt: string;
}

export type WatchlistCategory = "policy" | "health" | "academic" | "confidential" | "manual";

export interface WatchlistStudent {
  stt: string;
  name: string;
  birthDate: string;
  gender: string;
  categories: WatchlistCategory[];
  reasons: string[];
  student: StudentRecord;
  extension?: StudentExtensionData;
}

export interface BirthdayItem {
  stt: string;
  name: string;
  birthDate: string;
  day: number;
  month: number;
  year?: number;
  age?: number;
  daysUntil: number;
  isThisWeek: boolean;
  isToday: boolean;
}

// === GIAI ĐOẠN 2: THI ĐUA & NỀ NẾP 8A6 V2.4 (151 MÃ QUY ĐỊNH CHUẨN) ===

export interface CompetitionEvent {
  eventId: string;
  studentId: string;
  studentName: string;
  team: number;
  code: string;
  group: string;
  description: string;
  plus: number;
  minus: number;
  serious: boolean;
  eventDate: string; // YYYY-MM-DD
  period?: string;
  subject?: string;
  note?: string;
  createdByName: string;
  createdByRole: string;
  status: "APPROVED" | "CANCELLED" | "PENDING";
  cancelReason?: string;
  week: number;
  createdAt: string;
}

export interface StudentRankItem {
  rank: number;
  studentId: string;
  stt?: string;
  fullName: string;
  team: number;
  isTeamLeader: boolean;
  plus: number;
  minus: number;
  score: number;
  grade: string;
  eventCount: number;
  week: number;
}

export interface WeeklyDashboard {
  week: number;
  studentCount: number;
  avgScore: number;
  totalPlus: number;
  totalMinus: number;
  eventCount: number;
  perfectCount: number;
  ranking: StudentRankItem[];
  recentEvents: CompetitionEvent[];
  teamSummaries?: TeamCompetitionSummary[];
}

export interface TeamCompetitionSummary {
  team: number;
  teamName: string;
  leaderName: string;
  leaderStudentId?: string;
  memberCount: number;
  avgScore: number;
  totalPlus: number;
  totalMinus: number;
  eventCount: number;
  perfectCount: number;
  rank: number;
  members: StudentRankItem[];
}

export interface TeamLeaderInfo {
  team: number;
  username: string;
  studentId: string;
  studentName: string;
  pin: string;
  updatedAt?: string;
}

export interface CompetitionSubmission {
  submissionId: string;
  studentId: string;
  studentName: string;
  team: number;
  suggestedCode: string;
  description: string;
  plus: number;
  minus: number;
  eventDate: string;
  note?: string;
  createdByName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote?: string;
  week: number;
  createdAt: string;
}

// === GIAI ĐOẠN 2: MỞ RỘNG QUY MÔ KHỐI & BGH TRƯỜNG ===

export interface ClassInfo {
  classId: string; // "8A1", "8A2", ..., "8A8"
  className: string; // "Lớp 8A6"
  grade: number; // 8
  teacherName: string; // GVCN
  teacherEmail: string;
  teacherPhone?: string;
  studentCount: number;
  room: string;
  avgScore?: number;
  rank?: number;
  totalPlus?: number;
  totalMinus?: number;
  conductRate?: number;

  // Tổng kết Học kỳ & Cả năm
  semester1Score?: number; // Điểm TB HK1
  semester1Rank?: number; // Hạng HK1
  semester2Score?: number; // Điểm TB HK2
  semester2Rank?: number; // Hạng HK2
  yearScore?: number; // Điểm TB Cả Năm
  yearRank?: number; // Hạng Cả Năm
  yearTitle?: string; // "Cờ Dẫn Đầu", "Lớp Xuất Sắc", "Lớp Tiên Tiến", "Lớp Đạt Chuẩn"
  progressTrend?: "up" | "down" | "same"; // Xu hướng HK2 so với HK1
  gradeClassification?: string; // "Xuất sắc", "Tốt", "Khá", "Đạt", "Cần cố gắng"
}

export type CompetitionPeriod = "week" | "semester1" | "semester2" | "year";

export interface PeriodCompetitionSummary {
  period: CompetitionPeriod;
  periodLabel: string;
  week?: number;
  grade: number; // 0: Toàn trường, 6: Khối 6, 7: Khối 7, 8: Khối 8, 9: Khối 9
  classCount: number;
  totalStudents: number;
  periodAvgScore: number;
  topClass: string;
  classes: ClassInfo[];
  commonViolations: { code: string; name: string; count: number; points: number; percent: number }[];
  topAchievements: { code: string; name: string; count: number; points: number; percent: number }[];
  conductDistribution: { excellent: number; good: number; fair: number; poor: number };
  totalPlusEvents: number;
  totalMinusEvents: number;
  overallAssessment?: string;
}

export interface GradeCompetitionSummary {
  grade: number; // 0: Toàn trường, 6: Khối 6, 7: Khối 7, 8: Khối 8, 9: Khối 9
  week: number;
  classCount: number;
  totalStudents: number;
  gradeAvgScore: number;
  topClass: string;
  classes: ClassInfo[];
}

// === GIAI ĐOẠN 3: QUẢN TRỊ TRƯỜNG, ĐỒNG BỘ CLOUD FIREBASE & BẢO MẬT MATRIX ===

export interface CloudSyncStatus {
  connected: boolean;
  projectId: string;
  storageBucket: string;
  lastSyncTime?: string;
  totalClassesSynced: number;
  totalEventsSynced: number;
  totalConductLogsSynced: number;
  totalStudentsSynced: number;
  latencyMs?: number;
  statusText?: string;
}

export interface SchoolSecurityRole {
  roleId: "school_admin" | "teacher" | "leader" | "team_leader" | "student";
  title: string;
  description: string;
  scope: string;
  permissions: string[];
}

export interface TeacherAccountInfo {
  classId: string; // e.g. "8A6"
  className: string; // e.g. "Lớp 8A6"
  grade: number; // e.g. 8
  teacherName: string; // e.g. "Nguyễn Thúy Hằng"
  username: string; // e.g. "gvcn.8a6"
  password: string; // e.g. "Antam2025@"
  phone?: string;
  email?: string;
  status: "active" | "locked";
  updatedAt?: string;
}
