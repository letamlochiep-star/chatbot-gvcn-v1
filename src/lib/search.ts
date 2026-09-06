import { StudentRecord, StudentSummary, SearchResponse } from "./types";
import { normalizeVietnamese, isSttQuery } from "./vietnamese";

/**
 * Tìm kiếm học sinh theo quy tắc STT (chính xác) hoặc Họ tên (chứa cụm từ không dấu)
 */
export function searchStudents(query: string, students: StudentRecord[]): SearchResponse {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return {
      ok: false,
      query: "",
      total: 0,
      matches: [],
      message: "Vui lòng nhập STT hoặc cụm từ trong họ tên học sinh.",
    };
  }

  // 1. Quy tắc STT: Query chỉ gồm số và dài tối đa 3 ký tự => match chính xác STT
  if (isSttQuery(cleanQuery)) {
    const targetStt = parseInt(cleanQuery, 10).toString(); // Chuyển '01' thành '1' hoặc so khớp trực tiếp
    const match = students.find(
      (s) => s.stt.trim() === cleanQuery || s.stt.trim() === targetStt
    );

    if (match) {
      const summary: StudentSummary = {
        id: match.id,
        stt: match.stt,
        name: match.hoVaTen,
        birthDate: match.ngaySinh,
      };

      return {
        ok: true,
        query: cleanQuery,
        total: 1,
        matches: [summary],
        singleStudent: match,
      };
    }

    return {
      ok: true,
      query: cleanQuery,
      total: 0,
      matches: [],
      message: "Không tìm thấy học sinh phù hợp. Hãy kiểm tra lại STT hoặc cụm họ tên.",
    };
  }

  // 2. Quy tắc Tên: Tìm contains trong cột F (Họ và tên) không phân biệt hoa thường / dấu
  const normalizedQuery = normalizeVietnamese(cleanQuery);
  const matchedStudents = students.filter((s) => {
    const normalizedName = normalizeVietnamese(s.hoVaTen);
    return normalizedName.includes(normalizedQuery);
  });

  const summaries: StudentSummary[] = matchedStudents.map((s) => ({
    id: s.id,
    stt: s.stt,
    name: s.hoVaTen,
    birthDate: s.ngaySinh,
  }));

  if (matchedStudents.length === 1) {
    return {
      ok: true,
      query: cleanQuery,
      total: 1,
      matches: summaries,
      singleStudent: matchedStudents[0],
    };
  }

  if (matchedStudents.length > 1) {
    return {
      ok: true,
      query: cleanQuery,
      total: matchedStudents.length,
      matches: summaries,
      message: `Tìm thấy ${matchedStudents.length} học sinh phù hợp. Hãy chọn đúng học sinh trong danh sách bên dưới.`,
    };
  }

  return {
    ok: true,
    query: cleanQuery,
    total: 0,
    matches: [],
    message: "Không tìm thấy học sinh phù hợp. Hãy kiểm tra lại STT hoặc cụm họ tên.",
  };
}

/**
 * Lấy chi tiết hồ sơ 1 học sinh theo STT
 */
export function getStudentByStt(stt: string, students: StudentRecord[]): StudentRecord | null {
  const cleanStt = stt.trim();
  const targetStt = parseInt(cleanStt, 10).toString();
  return (
    students.find((s) => s.stt.trim() === cleanStt || s.stt.trim() === targetStt) || null
  );
}
