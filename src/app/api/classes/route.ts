import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getAllClasses, getGradeCompetitionSummary, updateClassInfo, createClass, deleteClass } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary") === "true";
    const grade = parseInt(searchParams.get("grade") || "8", 10);
    const week = parseInt(searchParams.get("week") || "1", 10);
    const classId = searchParams.get("classId");

    if (summary) {
      const gradeSummary = await getGradeCompetitionSummary(week, grade);
      return NextResponse.json({ ok: true, summary: gradeSummary });
    }

    const classes = await getAllClasses(grade);
    if (classId) {
      const found = classes.find((c) => c.classId === classId);
      if (!found) {
        return NextResponse.json({ ok: false, message: "Không tìm thấy lớp học" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, classInfo: found });
    }

    return NextResponse.json({ ok: true, classes });
  } catch (error) {
    console.error("Lỗi API classes GET:", error);
    return NextResponse.json({ ok: false, message: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "admin" && session.role !== "school_admin" && session.role !== "bgh" && session.role !== "teacher")) {
      return NextResponse.json({ ok: false, message: "Không có quyền thực hiện" }, { status: 403 });
    }

    const body = await request.json();
    const { action, classId, updates, newClass } = body;

    if (action === "updateClass" && classId && updates) {
      const result = await updateClassInfo(classId, updates);
      return NextResponse.json(result);
    }

    if (action === "addClass" && newClass) {
      const result = await createClass(newClass);
      return NextResponse.json(result);
    }

    if (action === "deleteClass" && classId) {
      const result = await deleteClass(classId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error) {
    console.error("Lỗi API classes POST:", error);
    return NextResponse.json({ ok: false, message: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}
