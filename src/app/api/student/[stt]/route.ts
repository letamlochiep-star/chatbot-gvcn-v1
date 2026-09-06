import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getStudents } from "@/lib/drive";
import { getStudentByStt } from "@/lib/search";
import { groupStudentFields } from "@/lib/schema";
import { getExtension, getMessagesByStt } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { stt: string } }
) {
  // 1. Kiểm tra xác thực
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        message: "Bạn cần đăng nhập để xem chi tiết hồ sơ học sinh.",
      },
      { status: 401 }
    );
  }

  const stt = params.stt;
  if (!stt) {
    return NextResponse.json(
      { ok: false, message: "Số thứ tự không hợp lệ." },
      { status: 400 }
    );
  }

  // 2. Phân quyền bảo mật: Học sinh chỉ được xem hồ sơ của chính mình
  if (session.role === "student" && session.stt !== stt && parseInt(session.stt || "0", 10) !== parseInt(stt, 10)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Bảo mật: Học sinh chỉ có quyền truy cập hồ sơ cá nhân của chính mình.",
      },
      { status: 403 }
    );
  }

  try {
    const { students } = await getStudents();
    const student = getStudentByStt(stt, students);

    if (!student) {
      return NextResponse.json(
        { ok: false, message: `Không tìm thấy học sinh có STT ${stt}.` },
        { status: 404 }
      );
    }

    // Đính kèm dữ liệu mở rộng (học lực, hạnh kiểm, sở thích, ước mơ) và tin nhắn
    const extension = await getExtension(stt);
    const messages = await getMessagesByStt(stt);

    const enrichedStudent = {
      ...student,
      extension: extension || { stt },
    };

    const groups = groupStudentFields(student);

    return NextResponse.json({
      ok: true,
      student: enrichedStudent,
      groups,
      extension: extension || { stt },
      messages,
    });
  } catch (error: any) {
    console.error("[Student Detail Error]", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Lỗi đọc dữ liệu học sinh từ máy chủ.",
      },
      { status: 500 }
    );
  }
}
