import { describe, it, expect } from "vitest";
import { getExtension, updateExtension, createMessage, getMessagesByStt, updateMessageStatus } from "../src/lib/db";
import { generateSampleStudents } from "../src/lib/mockData";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";
import { generateStudentPedagogicalAnalysis } from "../src/lib/ai";
import { AuthSession } from "../src/lib/types";

describe("7. Extended Database & Messaging Tests", () => {
  it("Lưu và đọc thông tin mở rộng của học sinh (sở thích, ước mơ, ghi chú GV)", async () => {
    const stt = "1";
    await updateExtension(stt, {
      hobbies: "Đọc sách, Lập trình AI",
      dreams: "Trở thành Kỹ sư phần mềm",
      academicLastYear: "Tốt",
      conductLastYear: "Tốt",
      strengths: "Toán học, Tin học",
      weaknesses: "Tiếng Anh giao tiếp",
      teacherProgressNote: "Có tiến bộ vượt bậc trong tháng vừa qua",
    });

    const ext = await getExtension(stt);
    expect(ext).not.toBeNull();
    expect(ext?.hobbies).toBe("Đọc sách, Lập trình AI");
    expect(ext?.dreams).toBe("Trở thành Kỹ sư phần mềm");
    expect(ext?.academicLastYear).toBe("Tốt");
    expect(ext?.strengths).toBe("Toán học, Tin học");
  });

  it("Gửi và nhận tin nhắn giữa học sinh và giáo viên", async () => {
    const stt = "1";
    const msg = await createMessage({
      stt,
      studentName: "Lê Nguyễn Thùy An",
      sender: "student",
      content: "Thưa cô, em muốn xin thêm tài liệu ôn tập môn Toán ạ.",
      isConfidential: false,
    });

    expect(msg.id).toBeDefined();
    expect(msg.status).toBe("unread");
    expect(msg.sender).toBe("student");

    const studentMsgs = await getMessagesByStt(stt);
    expect(studentMsgs.length).toBeGreaterThanOrEqual(1);
    const found = studentMsgs.find((m) => m.id === msg.id);
    expect(found).toBeDefined();

    // Giáo viên cập nhật trạng thái đã đọc
    const updated = await updateMessageStatus(msg.id, "read");
    expect(updated).toBe(true);
  });
});

describe("8. Student CCCD-Only Authentication Tests", () => {
  const students = generateSampleStudents();

  it("Xác thực đúng học sinh STT 1 chỉ bằng số CCCD", () => {
    const targetCccd = "068313010207";

    const matched = students.find((s) => {
      const studentCccd = (s.canCuoc || "").replace(/\D/g, "").trim();
      return studentCccd === targetCccd;
    });

    expect(matched).toBeDefined();
    expect(matched?.stt).toBe("1");
    expect(matched?.hoVaTen).toBe("Lê Nguyễn Thùy An");
  });

  it("Xác thực đúng học sinh STT 3 chỉ bằng số CCCD", () => {
    const targetCccd = "068313001716";

    const matched = students.find((s) => {
      const studentCccd = (s.canCuoc || "").replace(/\D/g, "").trim();
      return studentCccd === targetCccd;
    });

    expect(matched).toBeDefined();
    expect(matched?.stt).toBe("3");
    expect(matched?.hoVaTen).toBe("Nguyễn Bảo Anh");
  });

  it("Từ chối nếu CCCD không tồn tại trong danh sách", () => {
    const targetCccd = "999999999999";

    const matched = students.find((s) => {
      const studentCccd = (s.canCuoc || "").replace(/\D/g, "").trim();
      return studentCccd === targetCccd;
    });

    expect(matched).toBeUndefined();
  });

  it("Tạo Session Token riêng biệt cho vai trò học sinh kèm STT", async () => {
    const studentSession: AuthSession = {
      email: "hs_1@8a6.student",
      name: "Lê Nguyễn Thùy An",
      role: "student",
      stt: "1",
      cccd: "068313010207",
    };

    const token = await createSessionToken(studentSession);
    const decoded = await verifySessionToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.role).toBe("student");
    expect(decoded?.stt).toBe("1");
    expect(decoded?.name).toBe("Lê Nguyễn Thùy An");
  });
});

describe("9. Gemini Flash AI Pedagogical Analysis Engine Tests", () => {
  const students = generateSampleStudents();
  const student = students[0];

  it("Tạo báo cáo phân tích sư phạm đủ 5 mục chính xác", async () => {
    const ext = {
      stt: student.stt,
      academicLastYear: "Giỏi",
      conductLastYear: "Tốt",
      strengths: "Toán học, Tư duy logic",
      weaknesses: "Kỹ năng thuyết trình",
      hobbies: "Đọc sách khoa học",
      dreams: "Kỹ sư phần mềm AI",
      teacherProgressNote: "Em luôn hoàn thành tốt bài vở",
    };

    const report = await generateStudentPedagogicalAnalysis(student, ext);
    expect(report).toBeDefined();
    expect(report).toContain("1. TÓM TẮT CHÂN DUNG HỌC SINH");
    expect(report).toContain("2. ĐIỂM MẠNH & TIỀM NĂNG");
    expect(report).toContain("3. NGUY CƠ & ĐIỂM CẦN LƯU Ý");
    expect(report).toContain("4. KHUYẾN NGHỊ SƯ PHẠM CHO GVCN");
    expect(report).toContain("5. GỢI Ý NỘI DUNG TRAO ĐỔI VỚI PHỤ HUYNH");
  });
});
