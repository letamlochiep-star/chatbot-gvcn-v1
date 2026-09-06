import { google } from "googleapis";
import { StudentRecord } from "./types";
import { parseXlsxBuffer } from "./parser";
import { generateSampleStudents } from "./mockData";

const CACHE_TTL_MS = 5 * 60 * 1000; // Cache 5 phút

interface CacheState {
  students: StudentRecord[];
  cachedAt: number;
  source: "drive" | "mock";
  fileId: string;
}

let memoryCache: CacheState | null = null;

/**
 * Lấy danh sách học sinh (ưu tiên đọc từ Google Drive qua Service Account, có cache 5 phút)
 */
export async function getStudents(): Promise<{ students: StudentRecord[]; source: "drive" | "mock" }> {
  const now = Date.now();

  // Kiểm tra cache còn hạn không
  if (memoryCache && now - memoryCache.cachedAt < CACHE_TTL_MS) {
    return { students: memoryCache.students, source: memoryCache.source };
  }

  const fileId = process.env.GOOGLE_DRIVE_FILE_ID || "1YDd8tLViu2nzCuoCZSR1XRC9SxbmpgMC";
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (serviceAccountJson) {
    try {
      let credentials: Record<string, unknown>;
      try {
        credentials = JSON.parse(serviceAccountJson);
      } catch (parseErr) {
        // Thử decode nếu là base64
        const decoded = Buffer.from(serviceAccountJson, "base64").toString("utf-8");
        credentials = JSON.parse(decoded);
      }

      const auth = google.auth.fromJSON(credentials);
      // Scope đọc Google Drive
      (auth as unknown as { scopes: string[] }).scopes = ["https://www.googleapis.com/auth/drive.readonly"];

      const drive = google.drive({ version: "v3", auth: auth as any });

      const response = await drive.files.get(
        {
          fileId: fileId,
          alt: "media",
        },
        { responseType: "arraybuffer" }
      );

      const arrayBuffer = response.data as ArrayBuffer;
      const parsedStudents = parseXlsxBuffer(arrayBuffer);

      if (parsedStudents.length > 0) {
        memoryCache = {
          students: parsedStudents,
          cachedAt: now,
          source: "drive",
          fileId,
        };
        return { students: parsedStudents, source: "drive" };
      }
    } catch (err: any) {
      console.error("[Drive API Error] Không thể tải file từ Google Drive:", err?.message || err);
      // Nếu có lỗi Drive mà trước đó đã có cache, dùng tạm cache cũ
      if (memoryCache) {
        return { students: memoryCache.students, source: memoryCache.source };
      }
    }
  }

  // Fallback sang dữ liệu mẫu nếu chưa cấu hình Service Account
  console.warn(
    "[Drive Info] Chưa cấu hình GOOGLE_SERVICE_ACCOUNT_JSON hợp lệ. Đang dùng bộ dữ liệu mẫu 43 học sinh để thử nghiệm."
  );
  const sampleData = generateSampleStudents();
  memoryCache = {
    students: sampleData,
    cachedAt: now,
    source: "mock",
    fileId,
  };

  return { students: sampleData, source: "mock" };
}

/**
 * Kiểm tra trạng thái kết nối Google Drive phục vụ endpoint /api/health
 */
export async function checkDriveHealth(): Promise<{
  ok: boolean;
  driveConfigured: boolean;
  driveReadable: boolean;
  source: "drive" | "mock";
  studentCount: number;
  message: string;
}> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const fileId = process.env.GOOGLE_DRIVE_FILE_ID || "1YDd8tLViu2nzCuoCZSR1XRC9SxbmpgMC";

  if (!serviceAccountJson) {
    return {
      ok: true,
      driveConfigured: false,
      driveReadable: false,
      source: "mock",
      studentCount: 43,
      message:
        "Server đang chạy ở chế độ dev/mock (chưa có GOOGLE_SERVICE_ACCOUNT_JSON). Vui lòng thêm service account JSON vào biến môi trường để đọc file thật từ Google Drive.",
    };
  }

  try {
    const { students, source } = await getStudents();
    return {
      ok: true,
      driveConfigured: true,
      driveReadable: source === "drive",
      source,
      studentCount: students.length,
      message:
        source === "drive"
          ? `Đã kết nối và đọc thành công file ${fileId} trên Google Drive (${students.length} học sinh).`
          : "Đã cấu hình Service Account nhưng chưa đọc được file (vui lòng kiểm tra quyền Viewer trên Drive).",
    };
  } catch (err: any) {
    return {
      ok: false,
      driveConfigured: true,
      driveReadable: false,
      source: "mock",
      studentCount: 0,
      message: `Lỗi kết nối Google Drive: ${err?.message || "Không xác định"}`,
    };
  }
}
