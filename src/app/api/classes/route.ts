import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  getAllClasses,
  getGradeCompetitionSummary,
  getPeriodCompetitionSummary,
  updateClassInfo,
  createClass,
  deleteClass,
  batchImportClasses,
  clearAllClasses,
  resetDemoClasses,
  getAllTeacherAccounts,
  batchGenerateTeacherAccounts,
  updateTeacherAccount,
  resetAllTeacherPasswords,
  importTeacherAccounts,
} from "@/lib/db";
import { CompetitionPeriod } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary") === "true";
    const teacherAccounts = searchParams.get("teacherAccounts") === "true";
    const grade = parseInt(searchParams.get("grade") || "0", 10);
    const week = parseInt(searchParams.get("week") || "1", 10);
    const period = (searchParams.get("period") || "week") as CompetitionPeriod;
    const classId = searchParams.get("classId");

    if (teacherAccounts) {
      const accounts = await getAllTeacherAccounts();
      return NextResponse.json({ ok: true, accounts });
    }

    if (summary) {
      const periodSummary = await getPeriodCompetitionSummary(period, week, grade);
      return NextResponse.json({ ok: true, summary: periodSummary });
    }

    const classes = await getAllClasses(grade);
    if (classId) {
      const cleanId = classId.toUpperCase();
      const found = classes.find((c) => c.classId.toUpperCase() === cleanId);
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
    const {
      action,
      classId,
      updates,
      newClass,
      classes,
      overwrite,
      options,
      newPassword,
      accounts,
    } = body;

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

    if (action === "batchImportClasses" && Array.isArray(classes)) {
      const result = await batchImportClasses(classes, !!overwrite);
      return NextResponse.json(result);
    }

    if (action === "clearAllClasses") {
      const result = await clearAllClasses();
      return NextResponse.json(result);
    }

    if (action === "resetDemoClasses") {
      const result = await resetDemoClasses();
      return NextResponse.json(result);
    }

    // --- QUẢN LÝ TÀI KHOẢN GVCN ---
    if (action === "getTeacherAccounts") {
      const list = await getAllTeacherAccounts();
      return NextResponse.json({ ok: true, accounts: list });
    }

    if (action === "batchGenerateTeacherAccounts") {
      const result = await batchGenerateTeacherAccounts(options);
      return NextResponse.json(result);
    }

    if (action === "updateTeacherAccount" && classId && updates) {
      const result = await updateTeacherAccount(classId, updates);
      return NextResponse.json(result);
    }

    if (action === "resetAllTeacherPasswords") {
      const result = await resetAllTeacherPasswords(newPassword);
      return NextResponse.json(result);
    }

    if (action === "importTeacherAccounts" && Array.isArray(accounts)) {
      const result = await importTeacherAccounts(accounts, !!overwrite);
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error) {
    console.error("Lỗi API classes POST:", error);
    return NextResponse.json({ ok: false, message: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}

