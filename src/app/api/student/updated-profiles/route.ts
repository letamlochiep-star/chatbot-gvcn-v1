import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getStudents } from "@/lib/drive";
import { getAllExtensions } from "@/lib/db";
import { StudentExtensionData } from "@/lib/types";

export const dynamic = "force-dynamic";

export interface UpdatedProfileItem {
  stt: string;
  name: string;
  gender: string;
  birthDate: string;
  hasTeacherNote: boolean;
  hasStudentShare: boolean;
  hasAiReport: boolean;
  isFullyUpdated: boolean;
  extension: StudentExtensionData;
  updatedAt?: string;
}

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để xem thông tin." },
      { status: 401 }
    );
  }

  if (session.role !== "teacher" && session.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "Chỉ giáo viên mới có quyền xem danh sách lưu trữ hồ sơ." },
      { status: 403 }
    );
  }

  try {
    const [{ students }, extensionsMap] = await Promise.all([
      getStudents(),
      getAllExtensions(),
    ]);

    let countTeacherUpdated = 0;
    let countStudentShared = 0;
    let countAiAnalyzed = 0;

    const list: UpdatedProfileItem[] = students.map((s) => {
      const cleanStt = s.stt.trim();
      const numStt = parseInt(cleanStt, 10).toString();
      const ext = extensionsMap[cleanStt] || extensionsMap[numStt] || { stt: cleanStt };

      const hasTeacherNote = Boolean(
        ext.teacherProgressNote ||
          ext.teacherSpecialNote ||
          ext.strengths ||
          ext.weaknesses ||
          ext.academicLastYear ||
          ext.conductLastYear
      );

      const hasStudentShare = Boolean(ext.hobbies || ext.dreams || ext.personalNote);
      const hasAiReport = Boolean(ext.aiAnalysisReport);
      const isFullyUpdated = hasTeacherNote && hasStudentShare;

      if (hasTeacherNote) countTeacherUpdated++;
      if (hasStudentShare) countStudentShared++;
      if (hasAiReport) countAiAnalyzed++;

      return {
        stt: s.stt,
        name: s.hoVaTen,
        gender: s.gioiTinh,
        birthDate: s.ngaySinh,
        hasTeacherNote,
        hasStudentShare,
        hasAiReport,
        isFullyUpdated,
        extension: ext,
        updatedAt: ext.updatedAt,
      };
    });

    return NextResponse.json({
      ok: true,
      totalStudents: students.length,
      stats: {
        total: students.length,
        teacherUpdated: countTeacherUpdated,
        studentShared: countStudentShared,
        aiAnalyzed: countAiAnalyzed,
        fullyUpdated: list.filter((i) => i.isFullyUpdated).length,
      },
      profiles: list,
    });
  } catch (error: any) {
    console.error("[Updated Profiles API Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi tải danh sách hồ sơ cập nhật." },
      { status: 500 }
    );
  }
}
