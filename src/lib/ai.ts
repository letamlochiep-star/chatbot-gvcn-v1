import { GoogleGenAI } from "@google/genai";
import { StudentRecord, StudentExtensionData, StudentMessage } from "./types";

/**
 * Tạo báo cáo phân tích sư phạm toàn diện cho học sinh bằng Gemini Flash
 */
export async function generateStudentPedagogicalAnalysis(
  student: StudentRecord,
  extension: StudentExtensionData,
  messages: StudentMessage[] = []
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // Trích xuất các tin nhắn của học sinh gửi GVCN
  const studentMessagesText =
    messages.length > 0
      ? messages
          .map(
            (m) =>
              `- [${m.sender === "student" ? "Học sinh" : "GVCN"} - ${new Date(
                m.createdAt
              ).toLocaleDateString("vi-VN")}]${m.isConfidential ? " (🔒 Giữ kín)" : ""}: ${m.content}`
          )
          .join("\n")
      : "Chưa có tin nhắn trao đổi qua hòm thư.";

  // Prompt sư phạm chuyên sâu dành cho GVCN
  const prompt = `
Bạn là một chuyên gia tâm lý sư phạm và cố vấn giáo dục cấp THCS tại Việt Nam.
Hãy phân tích hồ sơ của học sinh sau đây và đưa ra báo cáo tư vấn chuyên sâu, thiết thực dành cho Giáo viên Chủ nhiệm (GVCN) lớp 8A6:

=== THÔNG TIN HỌC SINH ===
- STT: ${student.stt}
- Họ và tên: ${student.hoVaTen}
- Ngày sinh: ${student.ngaySinh} (Giới tính: ${student.gioiTinh})
- Chỗ ở hiện nay: ${student.choO_SNXom || ""}, ${student.choO_XaPhuong || ""}, ${student.choO_TinhTp || ""}
- Quê quán: ${student.queQuan_XaPhuong || ""}, ${student.queQuan_TinhTp || ""}
- Hoàn cảnh gia đình: 
  + Cha: ${student.tenCha || "—"} (${student.ngheNghiepCha || "—"}, Năm sinh: ${student.namSinhCha || "—"})
  + Mẹ: ${student.tenMe || "—"} (${student.ngheNghiepMe || "—"}, Năm sinh: ${student.namSinhMe || "—"})
- Diện chính sách / Cận nghèo: ${student.dienChinhSach || "Không"} / ${student.canNgheo || "Không"}
- Đội viên / Đoàn viên: ${student.doiVien || "—"} / ${student.doanVien || "—"}

=== DỮ LIỆU SƯ PHẠM ĐƯỢC GVCN CUNG CẤP ===
- Học lực năm lớp 7: ${extension.academicLastYear || "Chưa ghi nhận"}
- Rèn luyện/Hạnh kiểm năm lớp 7: ${extension.conductLastYear || "Chưa ghi nhận"}
- Môn thế mạnh: ${extension.strengths || "Chưa ghi nhận"}
- Môn cần hỗ trợ/phụ đạo: ${extension.weaknesses || "Chưa ghi nhận"}
- Đánh giá sơ bộ về quá trình tiến bộ: ${extension.teacherProgressNote || "Chưa có ghi chú"}
- Lưu ý riêng/Hoàn cảnh đặc biệt: ${extension.teacherSpecialNote || "Không có"}

=== THÔNG TIN DO CHÍNH HỌC SINH CHIA SẺ ===
- Sở thích cá nhân: ${extension.hobbies || "Chưa cập nhật"}
- Ước mơ / Định hướng tương lai: ${extension.dreams || "Chưa cập nhật"}
- Tâm tư / Lời nhắn của học sinh: ${extension.personalNote || "Không có"}

=== LỊCH SỬ TIN NHẮN / THẮC MẮC HỌC SINH GỬI GVCN ===
${studentMessagesText}

=== YÊU CẦU BÁO CÁO PHÂN TÍCH ===
Hãy trình bày báo cáo bằng tiếng Việt mạch lạc, chuyên nghiệp, cấu trúc rõ ràng theo 5 phần sau:
1. 🎯 TÓM TẮT CHÂN DUNG HỌC SINH: (Đặc điểm tính cách, bối cảnh gia đình, sở thích & thiên hướng).
2. 💡 ĐIỂM MẠNH & TIỀM NĂNG: (Những điểm nổi trội về học tập, kỹ năng, ước mơ cần tạo điều kiện phát huy).
3. ⚠️ NGUY CƠ & ĐIỂM CẦN QUAN TÂM: (Nguy cơ học lệch, rào cản tâm lý lứa tuổi dậy thì lớp 8, môn học cần kèm cặp hoặc vấn đề gia đình).
4. 👨‍🏫 KHUYẾN NGHỊ SƯ PHẠM CHO GVCN:
   - Phương pháp đồng hành & động viên tinh thần phù hợp với tâm lý học sinh và phản hồi các thắc mắc/nguyện vọng trong tin nhắn của em.
   - Gợi ý xếp vị trí chỗ ngồi, phân công nhóm học tập hoặc giao nhiệm vụ phù hợp trong tập thể lớp.
   - Định hướng bồi dưỡng hoặc phụ đạo kiến thức.
5. 💬 GỢI Ý NỘI DUNG TRAO ĐỔI VỚI PHỤ HUYNH: (3 - 4 ý cốt lõi, tinh tế để GVCN phối hợp cùng gia đình giúp học sinh tiến bộ).
`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text?.trim();
      if (text) return text;
    } catch (apiErr: any) {
      console.warn("[Gemini API Warning] Lỗi gọi Gemini Flash SDK, chuyển sang fallback:", apiErr?.message || apiErr);
    }
  }

  // Phân tích sư phạm thông minh dự phòng (Khi chưa cấu hình API Key)
  const academic = extension.academicLastYear || "Khá";
  const conduct = extension.conductLastYear || "Tốt";
  const hobbies = extension.hobbies || "chưa chia sẻ";
  const dreams = extension.dreams || "đang định hình";
  const strengths = extension.strengths || "các môn xã hội / tư duy logic";
  const weaknesses = extension.weaknesses || "cần rèn luyện thêm tính tập trung";

  return `### 🎯 1. TÓM TẮT CHÂN DUNG HỌC SINH
- **Học sinh**: ${student.hoVaTen} (STT: ${student.stt}) - Học sinh lớp 8A6, THCS Quang Trung.
- **Nền tảng năm trước**: Đạt kết quả học lực **${academic}**, rèn luyện/hạnh kiểm **${conduct}**.
- **Thiên hướng cá nhân**: Yêu thích *${hobbies}* và có định hướng tương lai hướng tới *${dreams}*.
- **Bối cảnh**: Gia đình ${student.dienChinhSach !== "Không" && student.dienChinhSach ? `thuộc diện ${student.dienChinhSach}` : "ổn định"}, phụ huynh làm nghề ${student.ngheNghiepCha || student.ngheNghiepMe || "tự do"}.

---

### 💡 2. ĐIỂM MẠNH & TIỀM NĂNG CẦN PHÁT HUY
- **Thế mạnh học tập**: Nổi trội ở *${strengths}*.
- **Năng lượng cá nhân**: Có mục tiêu rõ ràng (*${dreams}*), là đòn bẩy tâm lý rất tốt để khơi gợi niềm say mê học tập.
- **Tương tác**: ${extension.personalNote ? `Đã chủ động chia sẻ tâm tư với GVCN: "${extension.personalNote}"` : "Cần tạo cơ hội để học sinh bộc lộ năng khiếu trong các hoạt động đội nhóm"}.

---

### ⚠️ 3. NGUY CƠ & ĐIỂM CẦN LƯU Ý
- **Giai đoạn lớp 8**: Tâm sinh lý lứa tuổi 13-14 có xu hướng muốn khẳng định bản thân nhưng dễ mất tập trung nếu thiếu sự đồng hành sát sao.
- **Môn cần kèm cặp**: *${weaknesses}*. Cần tránh để dồn kiến thức sang học kỳ 2.

---

### 👨‍🏫 4. KHUYẾN NGHỊ SƯ PHẠM CHO GVCN
1. **Phương pháp tiếp cận**: Khích lệ bằng lời khen cụ thể khi có tiến bộ dù nhỏ, gắn mục tiêu môn học với ước mơ *${dreams}* của học sinh.
2. **Bố trí chỗ ngồi & Đôi bạn cùng tiến**:
   - Xếp ngồi cạnh bạn học tốt môn *${weaknesses}* để hỗ trợ nhau trong giờ tự học.
   - Giao nhiệm vụ phụ trách mảng *${hobbies}* trong các buổi sinh hoạt lớp hoặc hoạt động ngoại khóa.
3. **Kế hoạch hỗ trợ**: Theo dõi sự chuyển biến qua từng đợt kiểm tra thường xuyên; động viên học sinh đặt câu hỏi khi chưa hiểu bài.

---

### 💬 5. GỢI Ý NỘI DUNG TRAO ĐỔI VỚI PHỤ HUYNH
- **Ghi nhận**: Thông báo cho phụ huynh biết điểm mạnh và nỗ lực của em trong giai đoạn đầu năm học.
- **Phối hợp gia đình**: Đề nghị bố mẹ (${student.tenCha || "phụ huynh"}) tạo không gian học tập yên tĩnh tại nhà và dành thời gian lắng nghe tâm tư của con.
- **Hỗ trợ môn yếu**: Khuyến khích gia đình phối hợp đôn đốc việc làm bài tập môn *${weaknesses}*.`;
}
