import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getAttendanceByDate, saveAttendance, getAttendanceSummary } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để xem thông tin điểm danh." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const summary = searchParams.get("summary");

  try {
    if (summary === "true") {
      const attendanceSummary = await getAttendanceSummary();
      return NextResponse.json({ ok: true, summary: attendanceSummary });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];
    const dailyAttendance = await getAttendanceByDate(targetDate);
    return NextResponse.json({
      ok: true,
      date: targetDate,
      attendance: dailyAttendance,
    });
  } catch (error: any) {
    console.error("[Attendance API Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi xử lý điểm danh." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để lưu điểm danh." },
      { status: 401 }
    );
  }

  if (session.role !== "teacher" && session.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "Chỉ giáo viên mới có quyền thực hiện điểm danh." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { date, records } = body;

    if (!date || !records) {
      return NextResponse.json(
        { ok: false, message: "Ngày điểm danh và danh sách điểm danh không được để trống." },
        { status: 400 }
      );
    }

    const saved = await saveAttendance(date, records);
    return NextResponse.json({
      ok: true,
      message: `Đã lưu điểm danh ngày ${date} thành công.`,
      attendance: saved,
    });
  } catch (error: any) {
    console.error("[Attendance Save Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi khi lưu điểm danh." },
      { status: 500 }
    );
  }
}
