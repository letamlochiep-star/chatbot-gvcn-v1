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
  role: "teacher" | "admin" | "student";
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
