import * as XLSX from "xlsx";
import { SCHEMA_FIELDS } from "./schema";
import { StudentRecord } from "./types";

/**
 * Format Date or Excel Serial Date to DD/MM/YYYY
 */
export function formatDate(val: unknown): string {
  if (!val) return "—";
  if (val instanceof Date && !isNaN(val.getTime())) {
    const day = String(val.getDate()).padStart(2, "0");
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return "—";
    // Check if format is already dd/mm/yyyy or yyyy-mm-dd
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const parts = trimmed.split("/");
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      return `${day}/${month}/${parts[2]}`;
    }
    return trimmed;
  }
  if (typeof val === "number") {
    // Check if it's an Excel serial date (typically 30000..60000 for recent dates)
    if (val > 25000 && val < 60000) {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const day = String(parsed.d).padStart(2, "0");
        const month = String(parsed.m).padStart(2, "0");
        const year = parsed.y;
        return `${day}/${month}/${year}`;
      }
    }
    return String(val);
  }
  return String(val).trim() || "—";
}

/**
 * Clean cell value: preserve leading zero if string, avoid scientific notation, replace empty with —
 */
export function cleanCellValue(val: unknown, isDateField = false): string {
  if (val === null || val === undefined) return "—";

  if (isDateField) {
    return formatDate(val);
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? "—" : trimmed;
  }

  if (typeof val === "number") {
    // If integer, format without scientific notation
    return Number.isInteger(val) ? val.toString() : val.toString();
  }

  if (val instanceof Date) {
    return formatDate(val);
  }

  const str = String(val).trim();
  return str === "" ? "—" : str;
}

/**
 * Parse XLSX buffer into StudentRecord array
 */
export function parseXlsxBuffer(buffer: Buffer | ArrayBuffer): StudentRecord[] {
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const workbook = XLSX.read(nodeBuffer, {
    type: "buffer",
    cellDates: true,
    raw: true,
  });

  // Tìm sheet 'ds học sinh' (không phân biệt hoa thường)
  const targetSheetName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === "ds học sinh" || name.toLowerCase().includes("học sinh")
  ) || workbook.SheetNames[0];

  if (!targetSheetName) {
    throw new Error("Không tìm thấy sheet danh sách học sinh trong file XLSX.");
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error(`Sheet ${targetSheetName} không có dữ liệu.`);
  }

  // Chuyển sheet sang dạng mảng 2D (header: 1)
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  // Dữ liệu học sinh bắt đầu từ dòng 3 (index 2)
  const dataRows = rawRows.slice(2);
  const students: StudentRecord[] = [];

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex] as unknown[];
    if (!row || row.length === 0) continue;

    // Lấy STT (Cột A - index 0)
    const rawStt = cleanCellValue(row[0]);
    if (!rawStt || rawStt === "—") continue;

    // Lấy Họ và tên (Cột F - index 5)
    const rawName = cleanCellValue(row[5]);
    if (!rawName || rawName === "—") continue;

    const rawDataMap: Record<string, string> = {};
    const recordObj: Partial<StudentRecord> = {
      id: `stt-${rawStt}`,
      stt: rawStt,
      hoVaTen: rawName,
    };

    // Duyệt qua 49 cột
    for (let colIdx = 0; colIdx < SCHEMA_FIELDS.length; colIdx++) {
      const field = SCHEMA_FIELDS[colIdx];
      const cellVal = row[colIdx];
      const isDate =
        field.key === "ngaySinh" ||
        field.key === "ngayVaoTruong" ||
        field.key === "ngayCapCanCuoc";

      const cleaned = cleanCellValue(cellVal, isDate);
      rawDataMap[field.label] = cleaned;
      (recordObj as Record<string, unknown>)[field.key] = cleaned;
    }

    recordObj.rawData = rawDataMap;
    students.push(recordObj as StudentRecord);
  }

  return students;
}
