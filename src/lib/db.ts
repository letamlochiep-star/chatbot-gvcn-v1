import fs from "fs";
import path from "path";
import {
  StudentExtensionData,
  StudentMessage,
  DailyAttendance,
  AttendanceRecord,
  ConductLog,
} from "./types";
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

// Bộ nhớ đệm tạm thời (In-memory Fallback) khi chạy serverless nếu chưa gắn Firebase
const memoryExtensions: Record<string, StudentExtensionData> = {};
const memoryMessages: StudentMessage[] = [];
const memoryAttendance: Record<string, DailyAttendance> = {};
const memoryConductLogs: ConductLog[] = [];

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
