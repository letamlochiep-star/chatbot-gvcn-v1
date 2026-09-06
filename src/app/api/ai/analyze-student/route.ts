import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getStudents } from "@/lib/drive";
import { getStudentByStt } from "@/lib/search";
import { getExtension, updateExtension, getMessagesByStt } from "@/lib/db";
import { generateStudentPedagogicalAnalysis } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Kiểm tra quyền giáo viên
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để sử dụng tính năng phân tích AI." },
      { status: 401 }
    );
  }

  if (session.role !== "teacher" && session.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "Chỉ giáo viên mới có quyền sử dụng công cụ phân tích sư phạm AI." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const stt = body?.stt ? String(body.stt).trim() : "";

    if (!stt) {
      return NextResponse.json(
        { ok: false, message: "Vui lòng chọn học sinh cần phân tích." },
        { status: 400 }
      );
    }

    const { students } = await getStudents();
    const student = getStudentByStt(stt, students);

    if (!student) {
      return NextResponse.json(
        { ok: false, message: `Không tìm thấy học sinh có STT ${stt}.` },
        { status: 404 }
      );
    }

    // Lấy thông tin mở rộng (học lực, hạnh kiểm, sở thích, ước mơ...)
    const ext = (await getExtension(stt)) || { stt };
    const messages = await getMessagesByStt(stt);

    // Gọi mô hình AI Gemini Flash với đầy đủ ngữ cảnh tin nhắn
    const report = await generateStudentPedagogicalAnalysis(student, ext, messages);

    // Lưu báo cáo phân tích vào cơ sở dữ liệu mở rộng
    await updateExtension(stt, { aiAnalysisReport: report });

    return NextResponse.json({
      ok: true,
      report,
      studentName: student.hoVaTen,
      stt: student.stt,
      message: "Phân tích học sinh bằng Gemini Flash hoàn tất.",
    });
  } catch (error: any) {
    console.error("[AI Analysis Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi trong quá trình phân tích AI." },
      { status: 500 }
    );
  }
}
