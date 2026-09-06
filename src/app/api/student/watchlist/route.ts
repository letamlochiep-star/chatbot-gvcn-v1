import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getStudents } from "@/lib/drive";
import { getAllExtensions, getAllMessages } from "@/lib/db";
import { WatchlistStudent, WatchlistCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để xem danh sách quan tâm đặc biệt." },
      { status: 401 }
    );
  }

  if (session.role !== "teacher" && session.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "Chỉ giáo viên mới có quyền xem danh sách này." },
      { status: 403 }
    );
  }

  try {
    const { students } = await getStudents();
    const extensions = await getAllExtensions();
    const allMessages = await getAllMessages();

    // Tìm các học sinh gửi tin nhắn cần giữ kín
    const confidentialStts = new Set(
      allMessages.filter((m) => m.isConfidential).map((m) => m.stt)
    );

    const watchlist: WatchlistStudent[] = [];

    for (const s of students) {
      const stt = s.stt.trim();
      const ext = extensions[stt] || extensions[parseInt(stt, 10).toString()];
      const categories: WatchlistCategory[] = [];
      const reasons: string[] = [];

      // 1. Diện chính sách / Cận nghèo / Khó khăn
      const hasPolicy = Boolean(
        s.dienChinhSach &&
          s.dienChinhSach !== "Không" &&
          s.dienChinhSach !== "0" &&
          s.dienChinhSach !== "—"
      );
      const isPoor = Boolean(
        s.canNgheo &&
          (s.canNgheo.toLowerCase().includes("có") ||
            s.canNgheo.toLowerCase().includes("nghèo") ||
            s.canNgheo.toLowerCase().includes("cận"))
      );

      if (hasPolicy || isPoor) {
        categories.push("policy");
        if (hasPolicy) reasons.push(`Diện chính sách: ${s.dienChinhSach}`);
        if (isPoor) reasons.push(`Hoàn cảnh: ${s.canNgheo}`);
      }

      // 2. Sức khỏe / Khuyết tật / Lưu ý đặc biệt
      const hasDisability = Boolean(
        s.khuyetTat &&
          s.khuyetTat !== "Không" &&
          s.khuyetTat !== "0" &&
          s.khuyetTat !== "—"
      );
      const hasSpecialNote = Boolean(ext?.teacherSpecialNote?.trim());

      if (hasDisability || hasSpecialNote) {
        categories.push("health");
        if (hasDisability) reasons.push(`Sức khỏe: ${s.khuyetTat}`);
        if (hasSpecialNote) reasons.push(`Lưu ý riêng: ${ext?.teacherSpecialNote}`);
      }

      // 3. Môn cần phụ đạo / Kết quả học tập năm trước
      const hasWeaknesses = Boolean(ext?.weaknesses?.trim());
      const isLowAcademic = ext?.academicLastYear === "Chưa đạt";

      if (hasWeaknesses || isLowAcademic) {
        categories.push("academic");
        if (hasWeaknesses) reasons.push(`Môn cần hỗ trợ: ${ext?.weaknesses}`);
        if (isLowAcademic) reasons.push(`Học lực năm trước: Chưa đạt`);
      }

      // 4. Có tâm tư giữ kín gửi GVCN
      if (confidentialStts.has(stt) || confidentialStts.has(parseInt(stt, 10).toString())) {
        categories.push("confidential");
        reasons.push("Đã gửi tâm tư riêng cần giữ kín cho GVCN");
      }

      // Nếu thuộc ít nhất 1 nhóm quan tâm đặc biệt
      if (categories.length > 0) {
        watchlist.push({
          stt: s.stt,
          name: s.hoVaTen,
          birthDate: s.ngaySinh,
          gender: s.gioiTinh,
          categories,
          reasons,
          student: s,
          extension: ext,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total: watchlist.length,
      watchlist,
      categoriesCount: {
        policy: watchlist.filter((w) => w.categories.includes("policy")).length,
        health: watchlist.filter((w) => w.categories.includes("health")).length,
        academic: watchlist.filter((w) => w.categories.includes("academic")).length,
        confidential: watchlist.filter((w) => w.categories.includes("confidential")).length,
      },
    });
  } catch (error: any) {
    console.error("[Watchlist API Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi quét danh sách quan tâm đặc biệt." },
      { status: 500 }
    );
  }
}
