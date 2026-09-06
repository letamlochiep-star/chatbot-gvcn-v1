import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getExtension, updateExtension } from "@/lib/db";
import { StudentExtensionData } from "@/lib/types";
import { sendStudentFeedbackEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const isSameStudent = (a?: string, b?: string) => {
  if (!a || !b) return false;
  const cleanA = a.trim();
  const cleanB = b.trim();
  return cleanA === cleanB || parseInt(cleanA, 10) === parseInt(cleanB, 10);
};

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để xem dữ liệu." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetStt = searchParams.get("stt") || session.stt;

  if (!targetStt) {
    return NextResponse.json(
      { ok: false, message: "Số thứ tự không hợp lệ." },
      { status: 400 }
    );
  }

  // Nếu là học sinh, chỉ được xem thông tin mở rộng của chính mình
  if (session.role === "student" && !isSameStudent(session.stt, targetStt)) {
    return NextResponse.json(
      { ok: false, message: "Bạn không có quyền xem thông tin của học sinh khác." },
      { status: 403 }
    );
  }

  const ext = await getExtension(targetStt);
  return NextResponse.json({
    ok: true,
    extension: ext || { stt: targetStt },
  });
}

export async function POST(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để cập nhật dữ liệu." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const stt = body?.stt ? String(body.stt).trim() : session.stt;

    if (!stt) {
      return NextResponse.json(
        { ok: false, message: "Thiếu thông tin STT học sinh." },
        { status: 400 }
      );
    }

    // Phân quyền cập nhật
    const updatePayload: Partial<StudentExtensionData> = {};

    if (session.role === "student") {
      // Học sinh chỉ được cập nhật hồ sơ của chính mình
      if (!isSameStudent(session.stt, stt)) {
        return NextResponse.json(
          { ok: false, message: "Bạn chỉ có thể cập nhật thông tin của chính mình." },
          { status: 403 }
        );
      }

      if (body.hobbies !== undefined) updatePayload.hobbies = String(body.hobbies).trim();
      if (body.dreams !== undefined) updatePayload.dreams = String(body.dreams).trim();
      if (body.personalNote !== undefined) updatePayload.personalNote = String(body.personalNote).trim();
    } else {
      // Giáo viên có thể cập nhật các trường sư phạm
      if (body.academicLastYear !== undefined) updatePayload.academicLastYear = body.academicLastYear;
      if (body.conductLastYear !== undefined) updatePayload.conductLastYear = body.conductLastYear;
      if (body.strengths !== undefined) updatePayload.strengths = body.strengths;
      if (body.weaknesses !== undefined) updatePayload.weaknesses = body.weaknesses;
      if (body.teacherProgressNote !== undefined) updatePayload.teacherProgressNote = body.teacherProgressNote;
      if (body.teacherSpecialNote !== undefined) updatePayload.teacherSpecialNote = body.teacherSpecialNote;
      if (body.aiAnalysisReport !== undefined) updatePayload.aiAnalysisReport = body.aiAnalysisReport;
      if (body.hobbies !== undefined) updatePayload.hobbies = body.hobbies;
      if (body.dreams !== undefined) updatePayload.dreams = body.dreams;
    }

    const saved = await updateExtension(stt, updatePayload);

    // Nếu học sinh cập nhật thông tin cá nhân, gửi email thông báo cho GVCN
    if (session.role === "student" && (updatePayload.personalNote || updatePayload.hobbies || updatePayload.dreams)) {
      sendStudentFeedbackEmail({
        stt,
        studentName: session.name || `Học sinh STT ${stt}`,
        content: updatePayload.personalNote || "Đã cập nhật sở thích / ước mơ cá nhân.",
        isConfidential: false,
        type: "profile_update",
        hobbies: updatePayload.hobbies,
        dreams: updatePayload.dreams,
        personalNote: updatePayload.personalNote,
        createdAt: saved.updatedAt,
      }).catch((e) => console.warn("[Email Notification Async Error]", e));
    }

    return NextResponse.json({
      ok: true,
      message: "Đã cập nhật thông tin bổ sung thành công.",
      extension: saved,
    });
  } catch (error: any) {
    console.error("[Extension Update Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi cập nhật dữ liệu mở rộng." },
      { status: 500 }
    );
  }
}
