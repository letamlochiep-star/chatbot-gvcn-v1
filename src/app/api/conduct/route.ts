import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import {
  getAllConductLogs,
  getConductLogsByStt,
  createConductLog,
  deleteConductLog,
  getConductSummary,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để xem sổ nề nếp." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const stt = searchParams.get("stt");
  const summary = searchParams.get("summary");

  try {
    if (summary === "true") {
      const conductSummary = await getConductSummary();
      return NextResponse.json({ ok: true, summary: conductSummary });
    }

    if (stt) {
      const logs = await getConductLogsByStt(stt);
      return NextResponse.json({ ok: true, logs });
    }

    const allLogs = await getAllConductLogs();
    return NextResponse.json({ ok: true, logs: allLogs });
  } catch (error: any) {
    console.error("[Conduct API Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi xử lý nề nếp." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để ghi nhận nề nếp." },
      { status: 401 }
    );
  }

  if (session.role !== "teacher" && session.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "Chỉ giáo viên mới có quyền ghi nhận nề nếp." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { stt, studentName, type, title, points, note, date } = body;

    if (!stt || !title || typeof points !== "number") {
      return NextResponse.json(
        { ok: false, message: "Thiếu thông tin bắt buộc (học sinh, nội dung, điểm số)." },
        { status: 400 }
      );
    }

    const newLog = await createConductLog({
      stt: String(stt),
      studentName: String(studentName || "Học sinh"),
      type: type === "violation" ? "violation" : "praise",
      title: String(title),
      points: Number(points),
      note: note ? String(note) : "",
      date: date || new Date().toISOString().split("T")[0],
    });

    return NextResponse.json({
      ok: true,
      message: "Đã ghi nhận nề nếp thành công.",
      log: newLog,
    });
  } catch (error: any) {
    console.error("[Conduct Save Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi khi ghi nhận nề nếp." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session || (session.role !== "teacher" && session.role !== "admin")) {
    return NextResponse.json(
      { ok: false, message: "Chỉ giáo viên mới có quyền xóa bản ghi nề nếp." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "Mã bản ghi không hợp lệ." },
        { status: 400 }
      );
    }

    const ok = await deleteConductLog(id);
    return NextResponse.json({
      ok,
      message: ok ? "Đã xóa bản ghi nề nếp." : "Không tìm thấy bản ghi cần xóa.",
    });
  } catch (error: any) {
    console.error("[Conduct Delete Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi khi xóa bản ghi nề nếp." },
      { status: 500 }
    );
  }
}
