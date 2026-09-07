import fs from "fs";
import path from "path";
import {
  StudentExtensionData,
  StudentMessage,
  DailyAttendance,
  AttendanceRecord,
  ConductLog,
  CompetitionEvent,
  WeeklyDashboard,
  StudentRankItem,
  TeamLeaderInfo,
  CompetitionSubmission,
  TeamCompetitionSummary,
  ClassInfo,
  GradeCompetitionSummary,
} from "./types";
import { REAL_STUDENTS_8A6 } from "./mockData";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

const DATA_DIR = path.join(process.cwd(), "data");
const EXTENSIONS_FILE = path.join(DATA_DIR, "extensions.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const ATTENDANCE_FILE = path.join(DATA_DIR, "attendance.json");
const CONDUCT_FILE = path.join(DATA_DIR, "conduct_logs.json");
const COMPETITION_EVENTS_FILE = path.join(DATA_DIR, "competition_events.json");
const TEAM_LEADERS_FILE = path.join(DATA_DIR, "team_leaders.json");
const WEEK_LOCKS_FILE = path.join(DATA_DIR, "week_locks.json");
const COMPETITION_SUBMISSIONS_FILE = path.join(DATA_DIR, "competition_submissions.json");
const STUDENT_TEAMS_FILE = path.join(DATA_DIR, "student_teams.json");

// Bộ nhớ đệm tạm thời (In-memory Fallback) khi chạy serverless nếu chưa gắn Firebase
const memoryExtensions: Record<string, StudentExtensionData> = {};
const memoryMessages: StudentMessage[] = [];
const memoryAttendance: Record<string, DailyAttendance> = {};
const memoryConductLogs: ConductLog[] = [];
const memoryCompetitionEvents: CompetitionEvent[] = [];
const memoryTeamLeaders: Record<number, TeamLeaderInfo> = {
  1: { team: 1, username: "to1", studentId: "HS029", studentName: "Nguyễn Hoài Thanh Như", pin: "123456" },
  2: { team: 2, username: "to2", studentId: "HS015", studentName: "Bùi Duy Khang", pin: "123456" },
  3: { team: 3, username: "to3", studentId: "HS028", studentName: "Ngô Phan An Nhiên", pin: "123456" },
  4: { team: 4, username: "to4", studentId: "HS020", studentName: "Nguyễn Hữu Bảo Long", pin: "123456" },
};
const memoryWeekLocks: Record<number, { locked: boolean; note?: string; updatedAt: string }> = {};
const memoryCompetitionSubmissions: CompetitionSubmission[] = [];
const memoryStudentTeams: Record<string, number> = {};

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(EXTENSIONS_FILE)) {
      fs.writeFileSync(EXTENSIONS_FILE, JSON.stringify({}, null, 2), "utf-8");
    }
    if (!fs.existsSync(MESSAGES_FILE)) {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(ATTENDANCE_FILE)) {
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify({}, null, 2), "utf-8");
    }
    if (!fs.existsSync(CONDUCT_FILE)) {
      fs.writeFileSync(CONDUCT_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(COMPETITION_EVENTS_FILE)) {
      fs.writeFileSync(COMPETITION_EVENTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(TEAM_LEADERS_FILE)) {
      fs.writeFileSync(TEAM_LEADERS_FILE, JSON.stringify(memoryTeamLeaders, null, 2), "utf-8");
    }
    if (!fs.existsSync(WEEK_LOCKS_FILE)) {
      fs.writeFileSync(WEEK_LOCKS_FILE, JSON.stringify({}, null, 2), "utf-8");
    }
    if (!fs.existsSync(COMPETITION_SUBMISSIONS_FILE)) {
      fs.writeFileSync(COMPETITION_SUBMISSIONS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    // Bỏ qua lỗi read-only trên serverless (Vercel)
  }
}

/**
 * Đọc tất cả thông tin mở rộng của học sinh
 */
export async function getAllExtensions(): Promise<Record<string, StudentExtensionData>> {
  let fileData: Record<string, StudentExtensionData> = {};

  ensureDataDir();
  try {
    if (fs.existsSync(EXTENSIONS_FILE)) {
      const raw = fs.readFileSync(EXTENSIONS_FILE, "utf-8");
      fileData = JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[DB Fallback] Lỗi đọc extensions.json:", err);
  }

  const db = getFirebaseDb();
  if (db) {
    try {
      const colRef = collection(db, "student_extensions");
      const snap = await getDocs(colRef);
      const res: Record<string, StudentExtensionData> = {};
      snap.forEach((d) => {
        res[d.id] = d.data() as StudentExtensionData;
      });
      return { ...fileData, ...memoryExtensions, ...res };
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc collection student_extensions:", err);
    }
  }

  return { ...fileData, ...memoryExtensions };
}

/**
 * Lấy thông tin mở rộng của 1 học sinh theo STT
 */
export async function getExtension(stt: string): Promise<StudentExtensionData | null> {
  if (!stt) return null;
  const cleanStt = String(stt).trim();
  const targetStt = parseInt(cleanStt, 10).toString();

  // 1. Kiểm tra memory cache trước
  if (memoryExtensions[cleanStt]) return memoryExtensions[cleanStt];
  if (memoryExtensions[targetStt]) return memoryExtensions[targetStt];

  // 2. Thử đọc từ Firebase nếu có
  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "student_extensions", cleanStt);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data() as StudentExtensionData;
        memoryExtensions[cleanStt] = d;
        memoryExtensions[targetStt] = d;
        return d;
      }
      if (targetStt !== cleanStt) {
        const altRef = doc(db, "student_extensions", targetStt);
        const altSnap = await getDoc(altRef);
        if (altSnap.exists()) {
          const d = altSnap.data() as StudentExtensionData;
          memoryExtensions[cleanStt] = d;
          memoryExtensions[targetStt] = d;
          return d;
        }
      }
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc doc student_extensions:", err);
    }
  }

  // 3. Fallback đọc file cục bộ
  const all = await getAllExtensions();
  const result = all[cleanStt] || all[targetStt] || null;
  if (result) {
    memoryExtensions[cleanStt] = result;
    memoryExtensions[targetStt] = result;
  }
  return result;
}

/**
 * Cập nhật hoặc thêm mới thông tin mở rộng của 1 học sinh
 */
export async function updateExtension(
  stt: string,
  partialData: Partial<StudentExtensionData>
): Promise<StudentExtensionData> {
  const cleanStt = String(stt).trim();
  const targetStt = parseInt(cleanStt, 10).toString();
  const current = (await getExtension(cleanStt)) || { stt: cleanStt };

  const updated: StudentExtensionData = {
    ...current,
    ...partialData,
    stt: cleanStt,
    updatedAt: new Date().toISOString(),
  };

  // 1. Luôn lưu vào memory cache
  memoryExtensions[cleanStt] = updated;
  memoryExtensions[targetStt] = updated;

  // 2. Luôn ghi vào file cục bộ data/extensions.json
  ensureDataDir();
  try {
    let all: Record<string, StudentExtensionData> = {};
    if (fs.existsSync(EXTENSIONS_FILE)) {
      try {
        all = JSON.parse(fs.readFileSync(EXTENSIONS_FILE, "utf-8"));
      } catch {}
    }
    all[cleanStt] = updated;
    if (targetStt !== cleanStt) {
      all[targetStt] = updated;
    }
    fs.writeFileSync(EXTENSIONS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.warn("[DB Notice] Không thể ghi file extensions.json:", err);
  }

  // 3. Đồng thời lưu lên Firebase Firestore (nếu có cấu hình)
  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "student_extensions", cleanStt);
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      console.error("[Firebase Error] Lỗi ghi Firestore student_extensions:", err);
    }
  }

  return updated;
}

/**
 * Lấy tất cả tin nhắn
 */
export async function getAllMessages(): Promise<StudentMessage[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const colRef = collection(db, "messages");
      const snap = await getDocs(colRef);
      const list: StudentMessage[] = [];
      snap.forEach((d) => {
        list.push(d.data() as StudentMessage);
      });
      // Sắp xếp theo thời gian tăng dần
      return list.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc collection messages:", err);
    }
  }

  // Fallback đọc file cục bộ hoặc memory
  ensureDataDir();
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const raw = fs.readFileSync(MESSAGES_FILE, "utf-8");
      const fileList: StudentMessage[] = JSON.parse(raw) || [];
      // Khử trùng lặp theo ID nếu có
      const uniqueMap = new Map<string, StudentMessage>();
      fileList.forEach((m) => uniqueMap.set(m.id, m));
      memoryMessages.forEach((m) => uniqueMap.set(m.id, m));
      const combined = Array.from(uniqueMap.values());
      return combined.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
  } catch (err) {
    console.warn("[DB Fallback] Dùng memory messages:", err);
  }
  return [...memoryMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Lấy danh sách tin nhắn theo STT học sinh
 */
export async function getMessagesByStt(stt: string): Promise<StudentMessage[]> {
  const all = await getAllMessages();
  const cleanStt = stt.trim();
  const targetStt = parseInt(cleanStt, 10).toString();
  return all.filter((m) => m.stt === cleanStt || m.stt === targetStt);
}

/**
 * Lấy số lượng tin nhắn chưa đọc từ học sinh (dành cho GVCN)
 */
export async function getUnreadMessagesCount(): Promise<number> {
  const all = await getAllMessages();
  return all.filter((m) => m.sender === "student" && m.status === "unread").length;
}

/**
 * Gửi tin nhắn mới giữa Học sinh và GVCN
 */
export async function createMessage(
  data: Omit<StudentMessage, "id" | "createdAt" | "status">
): Promise<StudentMessage> {
  const cleanStt = data.stt.trim();
  const newMsg: StudentMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    stt: cleanStt,
    studentName: data.studentName.trim(),
    sender: data.sender,
    content: data.content.trim(),
    isConfidential: Boolean(data.isConfidential),
    createdAt: new Date().toISOString(),
    status: "unread",
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "messages", newMsg.id);
      await setDoc(docRef, newMsg);
      return newMsg;
    } catch (err) {
      console.error("[Firebase Error] Lỗi ghi message Firestore:", err);
      throw new Error("Lỗi lưu trữ tin nhắn trên Firebase Firestore.");
    }
  }

  // Fallback: ghi file cục bộ (local dev)
  ensureDataDir();
  try {
    let list: StudentMessage[] = [];
    if (fs.existsSync(MESSAGES_FILE)) {
      const raw = fs.readFileSync(MESSAGES_FILE, "utf-8");
      list = JSON.parse(raw) || [];
    }
    // Khử trùng và đẩy tin nhắn mới
    const map = new Map<string, StudentMessage>();
    list.forEach((m) => map.set(m.id, m));
    map.set(newMsg.id, newMsg);
    const updatedList = Array.from(map.values());

    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(updatedList, null, 2), "utf-8");
    return newMsg;
  } catch (err) {
    console.warn("[DB Notice] Filesystem read-only (Serverless). Lưu tạm message vào memory.", err);
    memoryMessages.push(newMsg);
    return newMsg;
  }
}

/**
 * Cập nhật trạng thái tin nhắn
 */
export async function updateMessageStatus(
  id: string,
  status: "unread" | "read" | "replied"
): Promise<boolean> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "messages", id);
      await setDoc(docRef, { status }, { merge: true });
      return true;
    } catch (err) {
      console.error("[Firebase Error] Lỗi cập nhật status message Firestore:", err);
      return false;
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const raw = fs.readFileSync(MESSAGES_FILE, "utf-8");
      const list: StudentMessage[] = JSON.parse(raw) || [];
      const index = list.findIndex((m) => m.id === id);
      if (index !== -1) {
        list[index].status = status;
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(list, null, 2), "utf-8");
        return true;
      }
    }
  } catch (err) {
    // Memory fallback
    const idx = memoryMessages.findIndex((m) => m.id === id);
    if (idx !== -1) {
      memoryMessages[idx].status = status;
      return true;
    }
  }
  return false;
}

/**
 * Đánh dấu tất cả tin nhắn của 1 học sinh là đã đọc / đã phản hồi
 */
export async function markStudentMessagesRead(stt: string, newStatus: "read" | "replied" = "read"): Promise<void> {
  const cleanStt = stt.trim();
  const targetStt = parseInt(cleanStt, 10).toString();
  const all = await getAllMessages();
  const studentMsgs = all.filter(
    (m) => (m.stt === cleanStt || m.stt === targetStt) && m.sender === "student" && m.status === "unread"
  );

  for (const m of studentMsgs) {
    await updateMessageStatus(m.id, newStatus);
  }
}

// ==========================================
// 📋 QUẢN LÝ ĐIỂM DANH CHUYÊN CẦN HÀNG NGÀY
// ==========================================

/**
 * Lấy tất cả dữ liệu điểm danh
 */
export async function getAllAttendance(): Promise<Record<string, DailyAttendance>> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const colRef = collection(db, "attendance");
      const snap = await getDocs(colRef);
      const res: Record<string, DailyAttendance> = {};
      snap.forEach((d) => {
        res[d.id] = d.data() as DailyAttendance;
      });
      return res;
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc collection attendance:", err);
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(ATTENDANCE_FILE)) {
      const raw = fs.readFileSync(ATTENDANCE_FILE, "utf-8");
      const parsed = JSON.parse(raw) || {};
      return { ...parsed, ...memoryAttendance };
    }
  } catch (err) {
    console.warn("[DB Fallback] Dùng memory attendance:", err);
  }
  return memoryAttendance;
}

/**
 * Lấy dữ liệu điểm danh của một ngày cụ thể (YYYY-MM-DD)
 */
export async function getAttendanceByDate(date: string): Promise<DailyAttendance | null> {
  const cleanDate = date.trim();
  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "attendance", cleanDate);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as DailyAttendance;
      }
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc doc attendance:", err);
    }
  }

  const all = await getAllAttendance();
  return all[cleanDate] || null;
}

/**
 * Lưu điểm danh của một ngày
 */
export async function saveAttendance(
  date: string,
  records: Record<string, AttendanceRecord>
): Promise<DailyAttendance> {
  const cleanDate = date.trim();
  const data: DailyAttendance = {
    date: cleanDate,
    records,
    updatedAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "attendance", cleanDate);
      await setDoc(docRef, data, { merge: true });
      return data;
    } catch (err) {
      console.error("[Firebase Error] Lỗi lưu attendance:", err);
    }
  }

  ensureDataDir();
  memoryAttendance[cleanDate] = data;
  try {
    const all = await getAllAttendance();
    all[cleanDate] = data;
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.warn("[DB Notice] Filesystem read-only. Lưu tạm attendance vào memory.", err);
  }
  return data;
}

/**
 * Thống kê chuyên cần của từng học sinh
 */
export async function getAttendanceSummary(): Promise<
  Record<
    string,
    {
      totalDays: number;
      presentDays: number;
      excusedDays: number;
      unexcusedDays: number;
      lateDays: number;
      attendanceRate: number;
    }
  >
> {
  const all = await getAllAttendance();
  const dates = Object.keys(all);
  const totalDays = dates.length;
  const summary: Record<
    string,
    {
      totalDays: number;
      presentDays: number;
      excusedDays: number;
      unexcusedDays: number;
      lateDays: number;
      attendanceRate: number;
    }
  > = {};

  if (totalDays === 0) return summary;

  for (const date of dates) {
    const daily = all[date];
    if (!daily || !daily.records) continue;

    for (const [stt, rec] of Object.entries(daily.records)) {
      if (!summary[stt]) {
        summary[stt] = {
          totalDays: 0,
          presentDays: 0,
          excusedDays: 0,
          unexcusedDays: 0,
          lateDays: 0,
          attendanceRate: 100,
        };
      }

      summary[stt].totalDays += 1;
      if (rec.status === "present") summary[stt].presentDays += 1;
      else if (rec.status === "excused") summary[stt].excusedDays += 1;
      else if (rec.status === "unexcused") summary[stt].unexcusedDays += 1;
      else if (rec.status === "late") summary[stt].lateDays += 1;
    }
  }

  // Tính tỷ lệ chuyên cần (%)
  for (const stt of Object.keys(summary)) {
    const s = summary[stt];
    if (s.totalDays > 0) {
      // Có mặt + trễ (vẫn tính có mặt) chia tổng số ngày
      s.attendanceRate = Math.round(((s.presentDays + s.lateDays) / s.totalDays) * 100);
    }
  }

  return summary;
}

// ==========================================
// 🌟 SỔ GHI NHẬN NỀ NẾP & ĐIỂM RÈN LUYỆN
// ==========================================

/**
 * Lấy tất cả bản ghi nề nếp
 */
export async function getAllConductLogs(): Promise<ConductLog[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const colRef = collection(db, "conduct_logs");
      const snap = await getDocs(colRef);
      const list: ConductLog[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ConductLog);
      });
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc conduct_logs:", err);
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(CONDUCT_FILE)) {
      const raw = fs.readFileSync(CONDUCT_FILE, "utf-8");
      const list: ConductLog[] = JSON.parse(raw) || [];
      const map = new Map<string, ConductLog>();
      list.forEach((item) => map.set(item.id, item));
      memoryConductLogs.forEach((item) => map.set(item.id, item));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (err) {
    console.warn("[DB Fallback] Dùng memory conduct logs:", err);
  }
  return [...memoryConductLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Lấy ghi nhận nề nếp theo STT học sinh
 */
export async function getConductLogsByStt(stt: string): Promise<ConductLog[]> {
  const all = await getAllConductLogs();
  const cleanStt = stt.trim();
  const targetStt = parseInt(cleanStt, 10).toString();
  return all.filter((l) => l.stt === cleanStt || l.stt === targetStt);
}

/**
 * Tạo ghi nhận nề nếp mới
 */
export async function createConductLog(
  data: Omit<ConductLog, "id" | "createdAt">
): Promise<ConductLog> {
  const newLog: ConductLog = {
    id: `conduct-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: data.date || new Date().toISOString().split("T")[0],
    stt: data.stt.trim(),
    studentName: data.studentName.trim(),
    type: data.type,
    title: data.title.trim(),
    points: Number(data.points) || 0,
    note: data.note?.trim() || "",
    createdAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "conduct_logs", newLog.id);
      await setDoc(docRef, newLog);
      return newLog;
    } catch (err) {
      console.error("[Firebase Error] Lỗi ghi conduct_log Firestore:", err);
    }
  }

  ensureDataDir();
  try {
    let list: ConductLog[] = [];
    if (fs.existsSync(CONDUCT_FILE)) {
      const raw = fs.readFileSync(CONDUCT_FILE, "utf-8");
      list = JSON.parse(raw) || [];
    }
    list.unshift(newLog);
    fs.writeFileSync(CONDUCT_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    memoryConductLogs.unshift(newLog);
  }
  return newLog;
}

/**
 * Xóa bản ghi nề nếp
 */
export async function deleteConductLog(id: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "conduct_logs", id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error("[Firebase Error] Lỗi xóa conduct_log Firestore:", err);
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(CONDUCT_FILE)) {
      const raw = fs.readFileSync(CONDUCT_FILE, "utf-8");
      let list: ConductLog[] = JSON.parse(raw) || [];
      list = list.filter((l) => l.id !== id);
      fs.writeFileSync(CONDUCT_FILE, JSON.stringify(list, null, 2), "utf-8");
      return true;
    }
  } catch (err) {
    const idx = memoryConductLogs.findIndex((l) => l.id === id);
    if (idx !== -1) {
      memoryConductLogs.splice(idx, 1);
      return true;
    }
  }
  return false;
}

/**
 * Tổng hợp điểm rèn luyện của toàn bộ học sinh
 */
export async function getConductSummary(): Promise<
  Record<string, { totalPoints: number; praiseCount: number; violationCount: number }>
> {
  const logs = await getAllConductLogs();
  const summary: Record<
    string,
    { totalPoints: number; praiseCount: number; violationCount: number }
  > = {};

  for (const log of logs) {
    const stt = log.stt;
    if (!summary[stt]) {
      summary[stt] = { totalPoints: 100, praiseCount: 0, violationCount: 0 }; // Điểm chuẩn ban đầu là 100
    }
    summary[stt].totalPoints += log.points;
    if (log.type === "praise") summary[stt].praiseCount += 1;
    else if (log.type === "violation") summary[stt].violationCount += 1;
  }

  return summary;
}

// ==========================================
// 🏆 HỆ THỐNG THI ĐUA & NỀ NẾP LỚP 8A6 (V2.4)
// ==========================================

const DEFAULT_STUDENT_TEAMS: Record<string, number> = {
  "1": 3,
  "2": 4,
  "3": 2,
  "4": 1,
  "5": 2,
  "6": 4,
  "7": 1,
  "8": 1,
  "9": 1,
  "10": 4,
  "11": 4,
  "12": 3,
  "13": 1,
  "14": 2,
  "15": 2,
  "16": 3,
  "17": 3,
  "18": 4,
  "19": 2,
  "20": 4,
  "21": 2,
  "22": 2,
  "23": 4,
  "24": 1,
  "25": 3,
  "26": 4,
  "27": 4,
  "28": 3,
  "29": 1,
  "30": 2,
  "31": 3,
  "32": 1,
  "33": 4,
  "34": 1,
  "35": 1,
  "36": 3,
  "37": 3,
  "38": 1,
  "39": 3,
  "40": 4,
  "41": 4,
  "42": 2,
  "43": 2,
  "44": 1,
  "45": 2,
};

/**
 * Lấy danh sách 45 học sinh gắn với Mã HS (HS001..HS045) và Tổ 1..4
 */
export async function getCompetitionStudentsList(): Promise<{
  studentId: string;
  stt: string;
  fullName: string;
  team: number;
  isTeamLeader: boolean;
}[]> {
  const leaders = await getTeamLeaders();
  const leaderStudentIds = new Set(
    Object.values(leaders)
      .filter((l) => l.studentId)
      .map((l) => l.studentId)
  );

  return REAL_STUDENTS_8A6.map((s) => {
    const numStt = parseInt(s.stt, 10);
    const padStt = isNaN(numStt) ? s.stt : String(numStt).padStart(3, "0");
    const studentId = `HS${padStt}`;
    const team = DEFAULT_STUDENT_TEAMS[s.stt] || ((numStt % 4) + 1);
    const isLeader = leaderStudentIds.has(studentId) || leaderStudentIds.has(s.stt);
    return {
      studentId,
      stt: s.stt,
      fullName: s.hoVaTen,
      team,
      isTeamLeader: isLeader,
    };
  });
}

/**
 * Lấy tất cả sự việc thi đua
 */
export async function getAllCompetitionEvents(): Promise<CompetitionEvent[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const colRef = collection(db, "competition_events");
      const snap = await getDocs(colRef);
      const list: CompetitionEvent[] = [];
      snap.forEach((d) => {
        list.push(d.data() as CompetitionEvent);
      });
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc competition_events:", err);
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(COMPETITION_EVENTS_FILE)) {
      const raw = fs.readFileSync(COMPETITION_EVENTS_FILE, "utf-8");
      const list: CompetitionEvent[] = JSON.parse(raw) || [];
      const map = new Map<string, CompetitionEvent>();
      list.forEach((item) => map.set(item.eventId, item));
      memoryCompetitionEvents.forEach((item) => map.set(item.eventId, item));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (err) {
    console.warn("[DB Fallback] Dùng memory competition events:", err);
  }
  return [...memoryCompetitionEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Lấy sự việc thi đua theo tuần (và theo tổ nếu có)
 */
export async function getCompetitionEventsByWeek(
  week: number,
  team?: number
): Promise<CompetitionEvent[]> {
  const all = await getAllCompetitionEvents();
  return all.filter((e) => {
    if (e.week !== week) return false;
    if (team && team > 0 && e.team !== team) return false;
    return true;
  });
}

/**
 * Tạo sự việc thi đua mới
 */
export async function createCompetitionEvent(
  data: Omit<CompetitionEvent, "eventId" | "createdAt" | "status">
): Promise<CompetitionEvent> {
  const newEvent: CompetitionEvent = {
    ...data,
    eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: "APPROVED",
    createdAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "competition_events", newEvent.eventId);
      await setDoc(docRef, newEvent);
      return newEvent;
    } catch (err) {
      console.error("[Firebase Error] Lỗi ghi competition_event:", err);
    }
  }

  ensureDataDir();
  try {
    let list: CompetitionEvent[] = [];
    if (fs.existsSync(COMPETITION_EVENTS_FILE)) {
      const raw = fs.readFileSync(COMPETITION_EVENTS_FILE, "utf-8");
      list = JSON.parse(raw) || [];
    }
    list.unshift(newEvent);
    fs.writeFileSync(COMPETITION_EVENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    memoryCompetitionEvents.unshift(newEvent);
  }
  return newEvent;
}

/**
 * Hủy sự việc thi đua (kèm lý do)
 */
export async function cancelCompetitionEvent(
  eventId: string,
  cancelReason: string
): Promise<boolean> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "competition_events", eventId);
      await setDoc(docRef, { status: "CANCELLED", cancelReason }, { merge: true });
      return true;
    } catch (err) {
      console.error("[Firebase Error] Lỗi hủy competition_event:", err);
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(COMPETITION_EVENTS_FILE)) {
      const raw = fs.readFileSync(COMPETITION_EVENTS_FILE, "utf-8");
      let list: CompetitionEvent[] = JSON.parse(raw) || [];
      const idx = list.findIndex((e) => e.eventId === eventId);
      if (idx !== -1) {
        list[idx].status = "CANCELLED";
        list[idx].cancelReason = cancelReason;
        fs.writeFileSync(COMPETITION_EVENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
        return true;
      }
    }
  } catch (err) {
    const memIdx = memoryCompetitionEvents.findIndex((e) => e.eventId === eventId);
    if (memIdx !== -1) {
      memoryCompetitionEvents[memIdx].status = "CANCELLED";
      memoryCompetitionEvents[memIdx].cancelReason = cancelReason;
      return true;
    }
  }
  return false;
}

/**
 * Quản lý Tổ trưởng 4 tổ
 */
export async function getTeamLeaders(): Promise<Record<number, TeamLeaderInfo>> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const colRef = collection(db, "team_leaders");
      const snap = await getDocs(colRef);
      const res: Record<number, TeamLeaderInfo> = {};
      snap.forEach((d) => {
        const item = d.data() as TeamLeaderInfo;
        res[item.team] = item;
      });
      if (Object.keys(res).length > 0) {
        return { ...memoryTeamLeaders, ...res };
      }
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc team_leaders:", err);
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(TEAM_LEADERS_FILE)) {
      const raw = fs.readFileSync(TEAM_LEADERS_FILE, "utf-8");
      const parsed = JSON.parse(raw) || {};
      return { ...memoryTeamLeaders, ...parsed };
    }
  } catch (err) {
    console.warn("[DB Fallback] Dùng memory team leaders:", err);
  }
  return memoryTeamLeaders;
}

/**
 * Phân công hoặc thay đổi Tổ trưởng
 */
export async function assignTeamLeader(
  team: number,
  studentId: string,
  studentName: string,
  pin: string = "123456"
): Promise<TeamLeaderInfo> {
  const leader: TeamLeaderInfo = {
    team,
    username: `to${team}`,
    studentId,
    studentName,
    pin: pin.trim() || "123456",
    updatedAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "team_leaders", `team_${team}`);
      await setDoc(docRef, leader, { merge: true });
    } catch (err) {
      console.error("[Firebase Error] Lỗi ghi team_leaders:", err);
    }
  }

  ensureDataDir();
  memoryTeamLeaders[team] = leader;
  try {
    const all = await getTeamLeaders();
    all[team] = leader;
    fs.writeFileSync(TEAM_LEADERS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.warn("[DB Notice] Không thể ghi TEAM_LEADERS_FILE:", err);
  }
  return leader;
}

/**
 * Cấp lại PIN cho Tổ trưởng
 */
export async function resetTeamLeaderPin(team: number, pin: string): Promise<boolean> {
  const all = await getTeamLeaders();
  const leader = all[team] || {
    team,
    username: `to${team}`,
    studentId: "",
    studentName: "",
    pin: "123456",
  };
  leader.pin = pin.trim() || "123456";
  leader.updatedAt = new Date().toISOString();

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "team_leaders", `team_${team}`);
      await setDoc(docRef, leader, { merge: true });
    } catch (err) {
      console.error("[Firebase Error] Lỗi ghi PIN team_leaders:", err);
    }
  }

  memoryTeamLeaders[team] = leader;
  try {
    all[team] = leader;
    fs.writeFileSync(TEAM_LEADERS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch {}
  return true;
}

/**
 * Thu hồi quyền Tổ trưởng
 */
export async function revokeTeamLeader(team: number): Promise<boolean> {
  const leader: TeamLeaderInfo = {
    team,
    username: `to${team}`,
    studentId: "",
    studentName: "",
    pin: "123456",
    updatedAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "team_leaders", `team_${team}`);
      await setDoc(docRef, leader, { merge: true });
    } catch (err) {
      console.error("[Firebase Error] Lỗi thu hồi team_leaders:", err);
    }
  }

  memoryTeamLeaders[team] = leader;
  try {
    const all = await getTeamLeaders();
    all[team] = leader;
    fs.writeFileSync(TEAM_LEADERS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch {}
  return true;
}

/**
 * Khóa tuần / Mở tuần thi đua
 */
export async function getWeekLock(week: number): Promise<boolean> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "week_locks", `week_${week}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return Boolean(snap.data()?.locked);
      }
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc week_locks:", err);
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(WEEK_LOCKS_FILE)) {
      const raw = fs.readFileSync(WEEK_LOCKS_FILE, "utf-8");
      const locks = JSON.parse(raw) || {};
      if (locks[week] !== undefined) return Boolean(locks[week]?.locked);
    }
  } catch (err) {}
  return Boolean(memoryWeekLocks[week]?.locked);
}

export async function setWeekLock(
  week: number,
  locked: boolean,
  note: string = ""
): Promise<boolean> {
  const lockData = {
    week,
    locked,
    note,
    updatedAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "week_locks", `week_${week}`);
      await setDoc(docRef, lockData, { merge: true });
    } catch (err) {
      console.error("[Firebase Error] Lỗi ghi week_locks:", err);
    }
  }

  memoryWeekLocks[week] = lockData;
  ensureDataDir();
  try {
    let all: Record<number, any> = {};
    if (fs.existsSync(WEEK_LOCKS_FILE)) {
      all = JSON.parse(fs.readFileSync(WEEK_LOCKS_FILE, "utf-8")) || {};
    }
    all[week] = lockData;
    fs.writeFileSync(WEEK_LOCKS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch {}
  return locked;
}

/**
 * Tổng hợp Bảng xếp hạng và Thống kê thi đua theo tuần
 */
export async function getWeeklyCompetitionDashboard(
  week: number,
  filterTeam?: number
): Promise<WeeklyDashboard> {
  const allStudents = await getCompetitionStudentsList();
  const targetStudents = filterTeam && filterTeam > 0
    ? allStudents.filter((s) => s.team === filterTeam)
    : allStudents;

  const events = await getCompetitionEventsByWeek(week, filterTeam);
  const activeEvents = events.filter((e) => e.status === "APPROVED");

  // Khởi tạo điểm cho từng học sinh (Mặc định 100đ xuất phát)
  const studentStats: Record<
    string,
    {
      studentId: string;
      fullName: string;
      team: number;
      isTeamLeader: boolean;
      plus: number;
      minus: number;
      score: number;
      eventCount: number;
    }
  > = {};

  targetStudents.forEach((s) => {
    studentStats[s.studentId] = {
      studentId: s.studentId,
      fullName: s.fullName,
      team: s.team,
      isTeamLeader: s.isTeamLeader,
      plus: 0,
      minus: 0,
      score: 100,
      eventCount: 0,
    };
  });

  // Cộng dồn sự việc
  let totalPlus = 0;
  let totalMinus = 0;

  activeEvents.forEach((e) => {
    let s = studentStats[e.studentId];
    if (!s) {
      // Tìm theo tên nếu không trùng ID
      const found = targetStudents.find((st) => st.fullName === e.studentName);
      if (found) s = studentStats[found.studentId];
    }
    if (s) {
      s.plus += Number(e.plus) || 0;
      s.minus += Number(e.minus) || 0;
      s.eventCount += 1;
      totalPlus += Number(e.plus) || 0;
      totalMinus += Number(e.minus) || 0;
    }
  });

  // Tính điểm và xếp loại
  const rankingList: StudentRankItem[] = Object.values(studentStats).map((s) => {
    const finalScore = Math.max(0, 100 + s.plus - s.minus);
    let grade = "Xuất sắc";
    if (finalScore >= 100) grade = "Xuất sắc";
    else if (finalScore >= 90) grade = "Tốt";
    else if (finalScore >= 75) grade = "Khá";
    else if (finalScore >= 50) grade = "Trung bình";
    else grade = "Cần rèn luyện";

    return {
      rank: 1,
      studentId: s.studentId,
      fullName: s.fullName,
      team: s.team,
      isTeamLeader: s.isTeamLeader,
      plus: s.plus,
      minus: s.minus,
      score: finalScore,
      grade,
      eventCount: s.eventCount,
      week,
    };
  });

  // Sắp xếp theo điểm giảm dần, sau đó theo họ tên
  rankingList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.minus !== b.minus) return a.minus - b.minus;
    return a.fullName.localeCompare(b.fullName, "vi");
  });

  // Đánh số thứ hạng (Rank)
  rankingList.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const studentCount = rankingList.length;
  const avgScore = studentCount > 0
    ? Math.round(rankingList.reduce((acc, cur) => acc + cur.score, 0) / studentCount)
    : 100;
  const perfectCount = rankingList.filter((r) => r.score >= 100).length;

  // Tổng hợp thi đua theo 4 Tổ
  const leaders = await getTeamLeaders();
  const allWeeklyStudents = await getCompetitionStudentsList();
  const allEvents = await getCompetitionEventsByWeek(week);
  const allActiveEvents = allEvents.filter((e) => e.status === "APPROVED");

  const fullStudentStats: Record<
    string,
    { plus: number; minus: number; score: number; eventCount: number }
  > = {};
  allWeeklyStudents.forEach((s) => {
    fullStudentStats[s.studentId] = { plus: 0, minus: 0, score: 100, eventCount: 0 };
  });
  allActiveEvents.forEach((e) => {
    let s = fullStudentStats[e.studentId];
    if (!s) {
      const found = allWeeklyStudents.find((st) => st.fullName === e.studentName);
      if (found) s = fullStudentStats[found.studentId];
    }
    if (s) {
      s.plus += Number(e.plus) || 0;
      s.minus += Number(e.minus) || 0;
      s.eventCount += 1;
    }
  });

  const teamSummaries: TeamCompetitionSummary[] = [1, 2, 3, 4].map((teamNum) => {
    const teamStudents = allWeeklyStudents.filter((s) => s.team === teamNum);
    const leader = leaders[teamNum];
    const teamMembers: StudentRankItem[] = teamStudents.map((s) => {
      const stats = fullStudentStats[s.studentId] || { plus: 0, minus: 0, score: 100, eventCount: 0 };
      const score = Math.max(0, 100 + stats.plus - stats.minus);
      let grade = "Xuất sắc";
      if (score >= 100) grade = "Xuất sắc";
      else if (score >= 90) grade = "Tốt";
      else if (score >= 75) grade = "Khá";
      else if (score >= 50) grade = "Trung bình";
      else grade = "Cần rèn luyện";

      return {
        rank: 1,
        studentId: s.studentId,
        fullName: s.fullName,
        team: teamNum,
        isTeamLeader: s.isTeamLeader,
        plus: stats.plus,
        minus: stats.minus,
        score,
        grade,
        eventCount: stats.eventCount,
        week,
      };
    });

    teamMembers.sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName, "vi"));
    teamMembers.forEach((m, i) => {
      m.rank = i + 1;
    });

    const memberCount = teamMembers.length;
    const totalTeamPlus = teamMembers.reduce((acc, cur) => acc + cur.plus, 0);
    const totalTeamMinus = teamMembers.reduce((acc, cur) => acc + cur.minus, 0);
    const totalTeamScore = teamMembers.reduce((acc, cur) => acc + cur.score, 0);
    const teamAvgScore = memberCount > 0 ? Math.round((totalTeamScore / memberCount) * 10) / 10 : 100;
    const teamPerfectCount = teamMembers.filter((m) => m.score >= 100).length;
    const teamEventCount = teamMembers.reduce((acc, cur) => acc + cur.eventCount, 0);

    return {
      team: teamNum,
      teamName: `Tổ ${teamNum}`,
      leaderName: leader && leader.studentName ? leader.studentName : "Chưa có",
      leaderStudentId: leader?.studentId,
      memberCount,
      avgScore: teamAvgScore,
      totalPlus: totalTeamPlus,
      totalMinus: totalTeamMinus,
      eventCount: teamEventCount,
      perfectCount: teamPerfectCount,
      rank: 1,
      members: teamMembers,
    };
  });

  teamSummaries.sort((a, b) => b.avgScore - a.avgScore || a.totalMinus - b.totalMinus);
  teamSummaries.forEach((t, i) => {
    t.rank = i + 1;
  });

  return {
    week,
    studentCount,
    avgScore,
    totalPlus,
    totalMinus,
    eventCount: activeEvents.length,
    perfectCount,
    ranking: rankingList,
    recentEvents: activeEvents.slice(0, 10),
    teamSummaries,
  };
}

/**
 * Quản lý Báo cáo chờ duyệt (Submissions)
 */
export async function getAllCompetitionSubmissions(): Promise<CompetitionSubmission[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const colRef = collection(db, "competition_submissions");
      const snap = await getDocs(colRef);
      const list: CompetitionSubmission[] = [];
      snap.forEach((d) => {
        list.push(d.data() as CompetitionSubmission);
      });
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.error("[Firebase Error] Lỗi đọc competition_submissions:", err);
    }
  }

  ensureDataDir();
  try {
    if (fs.existsSync(COMPETITION_SUBMISSIONS_FILE)) {
      const raw = fs.readFileSync(COMPETITION_SUBMISSIONS_FILE, "utf-8");
      return (JSON.parse(raw) || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (err) {}
  return [...memoryCompetitionSubmissions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getCompetitionSubmissionsByWeek(
  week: number,
  filterTeam?: number
): Promise<CompetitionSubmission[]> {
  const all = await getAllCompetitionSubmissions();
  return all.filter((s) => {
    if (s.week !== week) return false;
    if (filterTeam && filterTeam > 0 && s.team !== filterTeam) return false;
    return s.status === "PENDING";
  });
}

export async function createCompetitionSubmission(
  data: Omit<CompetitionSubmission, "submissionId" | "createdAt" | "status">
): Promise<CompetitionSubmission> {
  const newSub: CompetitionSubmission = {
    ...data,
    submissionId: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "competition_submissions", newSub.submissionId);
      await setDoc(docRef, newSub);
      return newSub;
    } catch (err) {}
  }

  ensureDataDir();
  try {
    let list: CompetitionSubmission[] = [];
    if (fs.existsSync(COMPETITION_SUBMISSIONS_FILE)) {
      list = JSON.parse(fs.readFileSync(COMPETITION_SUBMISSIONS_FILE, "utf-8")) || [];
    }
    list.unshift(newSub);
    fs.writeFileSync(COMPETITION_SUBMISSIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    memoryCompetitionSubmissions.unshift(newSub);
  }
  return newSub;
}

export async function reviewCompetitionSubmission(
  submissionId: string,
  decision: "APPROVE" | "REJECT",
  reviewNote: string = "",
  reviewerName: string = "GVCN"
): Promise<{ ok: boolean; message: string }> {
  const all = await getAllCompetitionSubmissions();
  const sub = all.find((s) => s.submissionId === submissionId);
  if (!sub) {
    return { ok: false, message: "Không tìm thấy báo cáo cần duyệt." };
  }

  sub.status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
  sub.reviewNote = reviewNote;

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "competition_submissions", submissionId);
      await setDoc(docRef, sub, { merge: true });
    } catch (err) {}
  }

  // Nếu duyệt (APPROVE) -> Tự động tạo sự việc chính thức
  if (decision === "APPROVE") {
    await createCompetitionEvent({
      studentId: sub.studentId,
      studentName: sub.studentName,
      team: sub.team,
      code: sub.suggestedCode,
      group: "Đã duyệt",
      description: sub.description,
      plus: sub.plus,
      minus: sub.minus,
      serious: false,
      eventDate: sub.eventDate,
      note: sub.note ? `(Từ báo cáo của ${sub.createdByName}) ${sub.note}` : `(Từ báo cáo của ${sub.createdByName})`,
      createdByName: reviewerName,
      createdByRole: "TEACHER",
      week: sub.week,
    });
  }

  ensureDataDir();
  try {
    fs.writeFileSync(COMPETITION_SUBMISSIONS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch {}

  return {
    ok: true,
    message: decision === "APPROVE" ? "Đã duyệt và ghi nhận vào sổ thi đua." : "Đã từ chối báo cáo.",
  };
}

// ==========================================
// 🏛️ GIAI ĐOẠN 2: QUẢN LÝ ĐA LỚP & THI ĐUA KHỐI 8
// ==========================================

const CLASSES_FILE = path.join(DATA_DIR, "classes.json");

export const DEFAULT_ALL_SCHOOL_CLASSES: ClassInfo[] = [
  // KHỐI 6 (6A1 - 6A8)
  { classId: "6A1", className: "Lớp 6A1", grade: 6, teacherName: "Nguyễn Thu Hà", teacherEmail: "hant@thcsquangtrung.edu.vn", teacherPhone: "0912.345.601", studentCount: 45, room: "Phòng 101", avgScore: 97.8, rank: 2, totalPlus: 35, totalMinus: 9, conductRate: 99 },
  { classId: "6A2", className: "Lớp 6A2", grade: 6, teacherName: "Lê Đức Anh", teacherEmail: "anhld@thcsquangtrung.edu.vn", teacherPhone: "0912.345.602", studentCount: 44, room: "Phòng 102", avgScore: 98.2, rank: 1, totalPlus: 40, totalMinus: 7, conductRate: 100 },
  { classId: "6A3", className: "Lớp 6A3", grade: 6, teacherName: "Phạm Thùy Linh", teacherEmail: "linhpt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.603", studentCount: 45, room: "Phòng 103", avgScore: 96.5, rank: 5, totalPlus: 26, totalMinus: 15, conductRate: 96 },
  { classId: "6A4", className: "Lớp 6A4", grade: 6, teacherName: "Trần Quang Huy", teacherEmail: "huytq@thcsquangtrung.edu.vn", teacherPhone: "0912.345.604", studentCount: 43, room: "Phòng 104", avgScore: 95.8, rank: 7, totalPlus: 20, totalMinus: 18, conductRate: 95 },
  { classId: "6A5", className: "Lớp 6A5", grade: 6, teacherName: "Đỗ Thị Yến", teacherEmail: "yendt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.605", studentCount: 44, room: "Phòng 105", avgScore: 97.0, rank: 4, totalPlus: 29, totalMinus: 13, conductRate: 97 },
  { classId: "6A6", className: "Lớp 6A6", grade: 6, teacherName: "Nguyễn Văn Tuấn", teacherEmail: "tuannv@thcsquangtrung.edu.vn", teacherPhone: "0912.345.606", studentCount: 45, room: "Phòng 106", avgScore: 97.4, rank: 3, totalPlus: 33, totalMinus: 11, conductRate: 98 },
  { classId: "6A7", className: "Lớp 6A7", grade: 6, teacherName: "Bùi Thanh Tâm", teacherEmail: "tambt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.607", studentCount: 43, room: "Phòng 107", avgScore: 96.0, rank: 6, totalPlus: 24, totalMinus: 17, conductRate: 95 },
  { classId: "6A8", className: "Lớp 6A8", grade: 6, teacherName: "Hoàng Minh Đức", teacherEmail: "duchm@thcsquangtrung.edu.vn", teacherPhone: "0912.345.608", studentCount: 44, room: "Phòng 108", avgScore: 95.5, rank: 8, totalPlus: 18, totalMinus: 21, conductRate: 94 },

  // KHỐI 7 (7A1 - 7A8)
  { classId: "7A1", className: "Lớp 7A1", grade: 7, teacherName: "Ngô Thị Vân", teacherEmail: "vannt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.701", studentCount: 44, room: "Phòng 109", avgScore: 97.6, rank: 2, totalPlus: 34, totalMinus: 10, conductRate: 98 },
  { classId: "7A2", className: "Lớp 7A2", grade: 7, teacherName: "Dương Văn Toàn", teacherEmail: "toandv@thcsquangtrung.edu.vn", teacherPhone: "0912.345.702", studentCount: 43, room: "Phòng 110", avgScore: 98.4, rank: 1, totalPlus: 41, totalMinus: 6, conductRate: 100 },
  { classId: "7A3", className: "Lớp 7A3", grade: 7, teacherName: "Phan Minh Huệ", teacherEmail: "huepm@thcsquangtrung.edu.vn", teacherPhone: "0912.345.703", studentCount: 45, room: "Phòng 111", avgScore: 96.7, rank: 4, totalPlus: 27, totalMinus: 14, conductRate: 96 },
  { classId: "7A4", className: "Lớp 7A4", grade: 7, teacherName: "Trịnh Đình Nam", teacherEmail: "namtd@thcsquangtrung.edu.vn", teacherPhone: "0912.345.704", studentCount: 42, room: "Phòng 112", avgScore: 95.9, rank: 7, totalPlus: 21, totalMinus: 19, conductRate: 95 },
  { classId: "7A5", className: "Lớp 7A5", grade: 7, teacherName: "Mai Thị Tuyết", teacherEmail: "tuyetmt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.705", studentCount: 44, room: "Phòng 113", avgScore: 97.1, rank: 3, totalPlus: 31, totalMinus: 12, conductRate: 97 },
  { classId: "7A6", className: "Lớp 7A6", grade: 7, teacherName: "Vũ Xuân Bách", teacherEmail: "bachvx@thcsquangtrung.edu.vn", teacherPhone: "0912.345.706", studentCount: 45, room: "Phòng 114", avgScore: 96.3, rank: 5, totalPlus: 25, totalMinus: 16, conductRate: 96 },
  { classId: "7A7", className: "Lớp 7A7", grade: 7, teacherName: "Đào Thị Hạnh", teacherEmail: "hanhdt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.707", studentCount: 43, room: "Phòng 115", avgScore: 96.1, rank: 6, totalPlus: 23, totalMinus: 17, conductRate: 95 },
  { classId: "7A8", className: "Lớp 7A8", grade: 7, teacherName: "Nguyễn Thành Long", teacherEmail: "longnt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.708", studentCount: 44, room: "Phòng 116", avgScore: 95.6, rank: 8, totalPlus: 19, totalMinus: 20, conductRate: 94 },

  // KHỐI 8 (8A1 - 8A8)
  { classId: "8A1", className: "Lớp 8A1", grade: 8, teacherName: "Trần Thị Mai", teacherEmail: "maitt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.801", studentCount: 44, room: "Phòng 201", avgScore: 97.5, rank: 3, totalPlus: 32, totalMinus: 12, conductRate: 98 },
  { classId: "8A2", className: "Lớp 8A2", grade: 8, teacherName: "Lê Văn Hùng", teacherEmail: "hunglv@thcsquangtrung.edu.vn", teacherPhone: "0912.345.802", studentCount: 43, room: "Phòng 202", avgScore: 98.0, rank: 2, totalPlus: 36, totalMinus: 8, conductRate: 99 },
  { classId: "8A3", className: "Lớp 8A3", grade: 8, teacherName: "Phạm Thanh Hà", teacherEmail: "hapt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.803", studentCount: 45, room: "Phòng 203", avgScore: 96.8, rank: 5, totalPlus: 28, totalMinus: 16, conductRate: 96 },
  { classId: "8A4", className: "Lớp 8A4", grade: 8, teacherName: "Hoàng Quốc Việt", teacherEmail: "viethq@thcsquangtrung.edu.vn", teacherPhone: "0912.345.804", studentCount: 42, room: "Phòng 204", avgScore: 95.9, rank: 7, totalPlus: 22, totalMinus: 20, conductRate: 95 },
  { classId: "8A5", className: "Lớp 8A5", grade: 8, teacherName: "Đặng Thùy Linh", teacherEmail: "linhdt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.805", studentCount: 44, room: "Phòng 205", avgScore: 97.2, rank: 4, totalPlus: 30, totalMinus: 14, conductRate: 97 },
  { classId: "8A6", className: "Lớp 8A6", grade: 8, teacherName: "Nguyễn Thúy Hằng", teacherEmail: "hangnt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.806", studentCount: 45, room: "Phòng 206", avgScore: 98.6, rank: 1, totalPlus: 42, totalMinus: 6, conductRate: 100 },
  { classId: "8A7", className: "Lớp 8A7", grade: 8, teacherName: "Vũ Đình Nam", teacherEmail: "namvd@thcsquangtrung.edu.vn", teacherPhone: "0912.345.807", studentCount: 43, room: "Phòng 207", avgScore: 96.2, rank: 6, totalPlus: 26, totalMinus: 18, conductRate: 95 },
  { classId: "8A8", className: "Lớp 8A8", grade: 8, teacherName: "Bùi Lan Anh", teacherEmail: "anhbl@thcsquangtrung.edu.vn", teacherPhone: "0912.345.808", studentCount: 44, room: "Phòng 208", avgScore: 97.0, rank: 5, totalPlus: 28, totalMinus: 15, conductRate: 97 },

  // KHỐI 9 (9A1 - 9A8)
  { classId: "9A1", className: "Lớp 9A1", grade: 9, teacherName: "Nguyễn Thị Phương", teacherEmail: "phuongnt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.901", studentCount: 43, room: "Phòng 209", avgScore: 98.5, rank: 1, totalPlus: 44, totalMinus: 5, conductRate: 100 },
  { classId: "9A2", className: "Lớp 9A2", grade: 9, teacherName: "Lê Văn Cường", teacherEmail: "cuonglv@thcsquangtrung.edu.vn", teacherPhone: "0912.345.902", studentCount: 42, room: "Phòng 210", avgScore: 97.9, rank: 2, totalPlus: 37, totalMinus: 9, conductRate: 99 },
  { classId: "9A3", className: "Lớp 9A3", grade: 9, teacherName: "Phạm Bích Ngọc", teacherEmail: "ngocpb@thcsquangtrung.edu.vn", teacherPhone: "0912.345.903", studentCount: 44, room: "Phòng 211", avgScore: 97.1, rank: 4, totalPlus: 31, totalMinus: 13, conductRate: 97 },
  { classId: "9A4", className: "Lớp 9A4", grade: 9, teacherName: "Đỗ Quốc Tuấn", teacherEmail: "tuandq@thcsquangtrung.edu.vn", teacherPhone: "0912.345.904", studentCount: 41, room: "Phòng 212", avgScore: 95.7, rank: 8, totalPlus: 19, totalMinus: 22, conductRate: 94 },
  { classId: "9A5", className: "Lớp 9A5", grade: 9, teacherName: "Hoàng Mai Anh", teacherEmail: "anhhm@thcsquangtrung.edu.vn", teacherPhone: "0912.345.905", studentCount: 43, room: "Phòng 213", avgScore: 97.3, rank: 3, totalPlus: 33, totalMinus: 12, conductRate: 98 },
  { classId: "9A6", className: "Lớp 9A6", grade: 9, teacherName: "Trương Công Định", teacherEmail: "dinhtc@thcsquangtrung.edu.vn", teacherPhone: "0912.345.906", studentCount: 44, room: "Phòng 214", avgScore: 96.5, rank: 6, totalPlus: 26, totalMinus: 16, conductRate: 96 },
  { classId: "9A7", className: "Lớp 9A7", grade: 9, teacherName: "Đinh Thị Thảo", teacherEmail: "thaodt@thcsquangtrung.edu.vn", teacherPhone: "0912.345.907", studentCount: 42, room: "Phòng 215", avgScore: 96.8, rank: 5, totalPlus: 28, totalMinus: 15, conductRate: 96 },
  { classId: "9A8", className: "Lớp 9A8", grade: 9, teacherName: "Nguyễn Hữu Thắng", teacherEmail: "thangnh@thcsquangtrung.edu.vn", teacherPhone: "0912.345.908", studentCount: 43, room: "Phòng 216", avgScore: 96.0, rank: 7, totalPlus: 22, totalMinus: 18, conductRate: 95 },
];

export const DEFAULT_GRADE_8_CLASSES = DEFAULT_ALL_SCHOOL_CLASSES.filter((c) => c.grade === 8);

/**
 * Lấy danh sách toàn bộ các lớp (Hỗ trợ Firebase và Local Storage)
 */
export async function getAllClasses(grade?: number): Promise<ClassInfo[]> {
  const db = getFirebaseDb();
  let list: ClassInfo[] = [];

  if (db) {
    try {
      const snap = await getDocs(collection(db, "classes"));
      snap.forEach((d) => {
        list.push(d.data() as ClassInfo);
      });
    } catch {}
  }

  if (list.length === 0) {
    ensureDataDir();
    if (fs.existsSync(CLASSES_FILE)) {
      try {
        const raw = fs.readFileSync(CLASSES_FILE, "utf-8");
        list = JSON.parse(raw);
      } catch {}
    }
  }

  if (list.length === 0) {
    list = [...DEFAULT_ALL_SCHOOL_CLASSES];
  }

  if (grade && grade > 0) {
    list = list.filter((c) => c.grade === grade);
  }

  return list;
}

/**
 * Lấy bảng tổng kết thi đua liên lớp theo tuần của Khối (hoặc Toàn Trường nếu grade = 0)
 */
export async function getGradeCompetitionSummary(
  week: number,
  grade: number = 8
): Promise<GradeCompetitionSummary> {
  const classes = await getAllClasses(grade);

  // Tính toán kết quả thực tế của lớp 8A6 từ db
  try {
    const dash8A6 = await getWeeklyCompetitionDashboard(week);
    const index8A6 = classes.findIndex((c) => c.classId === "8A6");
    if (index8A6 !== -1 && dash8A6) {
      classes[index8A6] = {
        ...classes[index8A6],
        avgScore: dash8A6.avgScore,
        totalPlus: dash8A6.totalPlus,
        totalMinus: dash8A6.totalMinus,
        studentCount: dash8A6.studentCount,
      };
    }
  } catch {}

  // Sắp xếp thứ hạng liên lớp: Điểm TB giảm dần -> Điểm trừ tăng dần
  classes.sort((a, b) => {
    const scoreDiff = (b.avgScore ?? 100) - (a.avgScore ?? 100);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.totalMinus ?? 0) - (b.totalMinus ?? 0);
  });

  // Gán rank 1..N
  classes.forEach((c, idx) => {
    c.rank = idx + 1;
  });

  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const gradeAvgScore =
    classes.length > 0
      ? Math.round(
          (classes.reduce((sum, c) => sum + (c.avgScore ?? 100), 0) / classes.length) * 10
        ) / 10
      : 100;

  return {
    grade,
    week,
    classCount: classes.length,
    totalStudents,
    gradeAvgScore,
    topClass: classes[0]?.className || (classes[0] ? `${classes[0].className}` : "Lớp 8A6"),
    classes,
  };
}

/**
 * Cập nhật thông tin lớp học (GVCN, Phòng học,...)
 */
export async function updateClassInfo(
  classId: string,
  updates: Partial<ClassInfo>
): Promise<{ ok: boolean; classInfo?: ClassInfo; message?: string }> {
  const classes = await getAllClasses();
  const index = classes.findIndex((c) => c.classId === classId);
  if (index === -1) {
    return { ok: false, message: `Không tìm thấy lớp ${classId}` };
  }

  const updated: ClassInfo = {
    ...classes[index],
    ...updates,
  };
  classes[index] = updated;

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "classes", classId);
      await setDoc(docRef, updated, { merge: true });
    } catch {}
  }

  ensureDataDir();
  try {
    fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2), "utf-8");
  } catch {}

  return { ok: true, classInfo: updated };
}

/**
 * Thêm lớp học mới vào danh mục trường
 */
export async function createClass(
  newClass: ClassInfo
): Promise<{ ok: boolean; classInfo?: ClassInfo; message?: string }> {
  const classes = await getAllClasses();
  const existing = classes.find((c) => c.classId.toLowerCase() === newClass.classId.toLowerCase());
  if (existing) {
    return { ok: false, message: `Mã lớp ${newClass.classId} đã tồn tại trong hệ thống!` };
  }

  const completeClass: ClassInfo = {
    classId: newClass.classId.trim().toUpperCase(),
    className: newClass.className.trim(),
    grade: Number(newClass.grade) || 8,
    teacherName: newClass.teacherName?.trim() || "Chưa phân công",
    teacherEmail: newClass.teacherEmail?.trim() || `gvcn.${newClass.classId.toLowerCase()}@thcsquangtrung.edu.vn`,
    teacherPhone: newClass.teacherPhone?.trim() || "",
    studentCount: Number(newClass.studentCount) || 45,
    room: newClass.room?.trim() || "Phòng học",
    avgScore: 98.0,
    rank: classes.length + 1,
    totalPlus: 0,
    totalMinus: 0,
    conductRate: 100,
  };

  classes.push(completeClass);

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "classes", completeClass.classId);
      await setDoc(docRef, completeClass, { merge: true });
    } catch {}
  }

  ensureDataDir();
  try {
    fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2), "utf-8");
  } catch {}

  return { ok: true, classInfo: completeClass };
}

/**
 * Xóa lớp học khỏi danh mục trường
 */
export async function deleteClass(
  classId: string
): Promise<{ ok: boolean; message?: string }> {
  let classes = await getAllClasses();
  const index = classes.findIndex((c) => c.classId === classId);
  if (index === -1) {
    return { ok: false, message: `Không tìm thấy lớp ${classId} để xóa.` };
  }

  classes = classes.filter((c) => c.classId !== classId);

  const db = getFirebaseDb();
  if (db) {
    try {
      const docRef = doc(db, "classes", classId);
      await deleteDoc(docRef);
    } catch {}
  }

  ensureDataDir();
  try {
    fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2), "utf-8");
  } catch {}

  return { ok: true, message: `Đã xóa lớp ${classId} thành công.` };
}

/**
 * Nhập danh sách lớp học hàng loạt từ File Excel (STT | LỚP | GVCN)
 */
export async function batchImportClasses(
  importedList: ClassInfo[],
  overwrite: boolean = false
): Promise<{ ok: boolean; count: number; message: string }> {
  let classes = overwrite ? [] : await getAllClasses();

  let added = 0;
  let updated = 0;

  for (const item of importedList) {
    const rawClassId = (item.classId || item.className.replace(/[^a-zA-Z0-9]/g, "")).toUpperCase();
    const cleanClassName = item.className.trim().startsWith("Lớp") ? item.className.trim() : `Lớp ${item.className.trim()}`;
    
    // Tự động nhận diện khối từ tên lớp (ví dụ: 8A1 -> 8, 6A2 -> 6)
    const gradeMatch = cleanClassName.match(/\b([6-9])/);
    const grade = item.grade || (gradeMatch ? parseInt(gradeMatch[1], 10) : 8);

    const completeItem: ClassInfo = {
      classId: rawClassId,
      className: cleanClassName,
      grade,
      teacherName: item.teacherName?.trim() || "Chưa phân công",
      teacherEmail: item.teacherEmail?.trim() || `gvcn.${rawClassId.toLowerCase()}@thcsquangtrung.edu.vn`,
      teacherPhone: item.teacherPhone?.trim() || "",
      studentCount: Number(item.studentCount) || 45,
      room: item.room?.trim() || `Phòng ${rawClassId}`,
      avgScore: 98.0,
      rank: classes.length + 1,
      totalPlus: 0,
      totalMinus: 0,
      conductRate: 100,
    };

    const existingIndex = classes.findIndex((c) => c.classId === rawClassId);
    if (existingIndex !== -1) {
      classes[existingIndex] = {
        ...classes[existingIndex],
        ...completeItem,
      };
      updated++;
    } else {
      classes.push(completeItem);
      added++;
    }

    const db = getFirebaseDb();
    if (db) {
      try {
        const docRef = doc(db, "classes", rawClassId);
        await setDoc(docRef, completeItem, { merge: true });
      } catch {}
    }
  }

  // Đánh lại thứ hạng
  classes.forEach((c, idx) => {
    c.rank = idx + 1;
  });

  ensureDataDir();
  try {
    fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2), "utf-8");
  } catch {}

  return {
    ok: true,
    count: classes.length,
    message: overwrite
      ? `Đã thay thế toàn bộ danh mục trường thành công với ${classes.length} lớp học từ file Excel!`
      : `Đã nhập thành công: Thêm mới ${added} lớp, cập nhật ${updated} lớp từ file Excel!`,
  };
}

/**
 * Xóa sạch danh mục lớp demo
 */
export async function clearAllClasses(): Promise<{ ok: boolean; message: string }> {
  const classes: ClassInfo[] = [];

  ensureDataDir();
  try {
    fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2), "utf-8");
  } catch {}

  return { ok: true, message: "Đã làm sạch danh mục lớp học. Bạn có thể tải file Excel để nạp danh sách lớp mới." };
}

/**
 * Khôi phục danh mục 32 lớp mẫu ban đầu
 */
export async function resetDemoClasses(): Promise<{ ok: boolean; message: string }> {
  const classes = [...DEFAULT_ALL_SCHOOL_CLASSES];

  const db = getFirebaseDb();
  if (db) {
    try {
      for (const c of classes) {
        const docRef = doc(db, "classes", c.classId);
        await setDoc(docRef, c, { merge: true });
      }
    } catch {}
  }

  ensureDataDir();
  try {
    fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2), "utf-8");
  } catch {}

  return { ok: true, message: "Đã khôi phục danh mục 32 lớp học mẫu của trường THCS Quang Trung." };
}




