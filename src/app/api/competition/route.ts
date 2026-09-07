import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import {
  COMPETITION_CATALOG,
  findCatalogItemByCode,
  parseNaturalLanguageEvent,
} from "@/lib/competitionCatalog";
import {
  getCompetitionStudentsList,
  getCompetitionEventsByWeek,
  createCompetitionEvent,
  cancelCompetitionEvent,
  getWeeklyCompetitionDashboard,
  getTeamLeaders,
  assignTeamLeader,
  resetTeamLeaderPin,
  revokeTeamLeader,
  getWeekLock,
  setWeekLock,
  getCompetitionSubmissionsByWeek,
  createCompetitionSubmission,
  reviewCompetitionSubmission,
} from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Tính tuần học hiện tại (từ 1 đến 40)
 */
function calculateCurrentWeek(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 8, 1); // 01/09
  if (now < startOfYear) {
    return 1;
  }
  const diffDays = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(1, week), 40);
}

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để truy cập hệ thống thi đua." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "dashboard";
  const weekParam = searchParams.get("week");
  const teamParam = searchParams.get("team");

  const currentWeek = calculateCurrentWeek();
  const selectedWeek = weekParam ? parseInt(weekParam, 10) || currentWeek : currentWeek;
  const selectedTeam = teamParam ? parseInt(teamParam, 10) || undefined : undefined;

  try {
    // 1. BOOTSTRAP: Tải dữ liệu ban đầu
    if (action === "bootstrap") {
      const students = await getCompetitionStudentsList();
      const weekLocked = await getWeekLock(selectedWeek);
      const dashboard = await getWeeklyCompetitionDashboard(selectedWeek, selectedTeam);
      const leaders = await getTeamLeaders();

      return NextResponse.json({
        ok: true,
        catalog: COMPETITION_CATALOG,
        students,
        currentWeek: selectedWeek,
        totalWeeks: 40,
        weekLocked,
        dashboard,
        leaders,
        today: new Date().toISOString().split("T")[0],
      });
    }

    // 2. DASHBOARD: Thống kê & Bảng xếp hạng
    if (action === "dashboard") {
      const dashboard = await getWeeklyCompetitionDashboard(selectedWeek, selectedTeam);
      const weekLocked = await getWeekLock(selectedWeek);
      const pendingSubmissions = await getCompetitionSubmissionsByWeek(selectedWeek, selectedTeam);

      return NextResponse.json({
        ok: true,
        dashboard,
        weekLocked,
        pendingCount: pendingSubmissions.length,
      });
    }

    // 3. HISTORY: Nhật ký sự việc theo tuần
    if (action === "history") {
      const events = await getCompetitionEventsByWeek(selectedWeek, selectedTeam);
      return NextResponse.json({
        ok: true,
        events,
      });
    }

    // 4. LEADERS: Quản lý 4 tổ trưởng
    if (action === "leaders") {
      const allStudents = await getCompetitionStudentsList();
      const leaders = await getTeamLeaders();

      const teamsData = [1, 2, 3, 4].map((teamNum) => {
        const teamStudents = allStudents.filter((s) => s.team === teamNum);
        const currentLeader = leaders[teamNum] || null;

        return {
          team: teamNum,
          username: `to${teamNum}`,
          leader: currentLeader && currentLeader.studentId ? currentLeader : null,
          students: teamStudents,
        };
      });

      return NextResponse.json({
        ok: true,
        teams: teamsData,
        defaultPin: "123456",
      });
    }

    // 5. SUBMISSIONS: Báo cáo chờ duyệt
    if (action === "submissions") {
      const submissions = await getCompetitionSubmissionsByWeek(selectedWeek, selectedTeam);
      return NextResponse.json({
        ok: true,
        submissions,
      });
    }

    return NextResponse.json({ ok: false, message: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    console.error("[Competition GET Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi xử lý dữ liệu thi đua." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để thao tác thi đua." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { action, ...payload } = body;

    // 1. CHAT SUGGEST: Nhận diện tự nhiên qua Chatbot
    if (action === "chatSuggest") {
      const text = String(payload.text || "");
      const students = await getCompetitionStudentsList();
      const result = parseNaturalLanguageEvent(text, students);

      return NextResponse.json({
        ok: true,
        source: "AI_RULE_ENGINE",
        ...result,
      });
    }

    // 2. CREATE EVENT: Ghi nhận sự việc nề nếp thi đua
    if (action === "createEvent") {
      const { studentId, eventCode, eventDate, period, subject, note, week } = payload;
      const targetWeek = week || calculateCurrentWeek();

      const isLocked = await getWeekLock(targetWeek);
      if (isLocked) {
        return NextResponse.json(
          { ok: false, message: `Tuần ${targetWeek} đã bị khóa. Không thể thêm sự việc mới.` },
          { status: 400 }
        );
      }

      const students = await getCompetitionStudentsList();
      const student = students.find((s) => s.studentId === studentId || s.stt === studentId);
      const catalogItem = findCatalogItemByCode(eventCode);

      if (!student) {
        return NextResponse.json({ ok: false, message: "Không tìm thấy học sinh." }, { status: 400 });
      }
      if (!catalogItem) {
        return NextResponse.json({ ok: false, message: "Mã quy định không hợp lệ." }, { status: 400 });
      }

      const newEvent = await createCompetitionEvent({
        studentId: student.studentId,
        studentName: student.fullName,
        team: student.team,
        code: catalogItem.code,
        group: catalogItem.group,
        description: catalogItem.description,
        plus: catalogItem.plus,
        minus: catalogItem.minus,
        serious: catalogItem.serious,
        eventDate: eventDate || new Date().toISOString().split("T")[0],
        period: period ? String(period) : undefined,
        subject: subject ? String(subject) : undefined,
        note: note ? String(note) : undefined,
        createdByName: session.name || "GVCN",
        createdByRole: session.role === "teacher" ? "TEACHER" : "LEADER",
        week: targetWeek,
      });

      const updatedDashboard = await getWeeklyCompetitionDashboard(targetWeek);

      return NextResponse.json({
        ok: true,
        message: "Đã ghi nhận sự việc thi đua thành công.",
        event: newEvent,
        dashboard: updatedDashboard,
        warning: catalogItem.serious ? "⚠️ Sự việc này nghiêm trọng, cần GVCN theo dõi sát." : undefined,
      });
    }

    // 3. CANCEL EVENT: Hủy bản ghi sự việc
    if (action === "cancelEvent") {
      const { eventId, reason, week } = payload;
      const targetWeek = week || calculateCurrentWeek();

      const isLocked = await getWeekLock(targetWeek);
      if (isLocked) {
        return NextResponse.json(
          { ok: false, message: `Tuần ${targetWeek} đã bị khóa. Không thể hủy sự việc.` },
          { status: 400 }
        );
      }

      if (!eventId || !reason) {
        return NextResponse.json(
          { ok: false, message: "Cần cung cấp mã sự việc và lý do hủy." },
          { status: 400 }
        );
      }

      const success = await cancelCompetitionEvent(eventId, reason);
      return NextResponse.json({
        ok: success,
        message: success ? "Đã hủy bản ghi sự việc." : "Không tìm thấy bản ghi.",
      });
    }

    // 4. ASSIGN TEAM LEADER: Bầu / Đổi Tổ trưởng
    if (action === "assignLeader") {
      if (session.role !== "teacher" && session.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Chỉ GVCN mới có quyền quản lý Tổ trưởng." },
          { status: 403 }
        );
      }

      const { team, studentId, pin } = payload;
      const students = await getCompetitionStudentsList();
      const student = students.find((s) => s.studentId === studentId);

      if (!student) {
        return NextResponse.json({ ok: false, message: "Học sinh không tồn tại." }, { status: 400 });
      }

      const leader = await assignTeamLeader(team, student.studentId, student.fullName, pin || "123456");

      return NextResponse.json({
        ok: true,
        message: `Đã bổ nhiệm ${student.fullName} làm Tổ trưởng Tổ ${team}.`,
        username: leader.username,
        pin: leader.pin,
      });
    }

    // 5. RESET LEADER PIN: Cấp lại mã PIN
    if (action === "resetPin") {
      if (session.role !== "teacher" && session.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Chỉ GVCN mới có quyền cấp lại mã PIN." },
          { status: 403 }
        );
      }

      const { team, pin } = payload;
      await resetTeamLeaderPin(team, pin || "123456");

      return NextResponse.json({
        ok: true,
        message: `Đã cấp lại mã PIN cho Tổ trưởng Tổ ${team}.`,
        username: `to${team}`,
        pin: pin || "123456",
      });
    }

    // 6. REVOKE LEADER: Thu hồi quyền Tổ trưởng
    if (action === "revokeLeader") {
      if (session.role !== "teacher" && session.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Chỉ GVCN mới có quyền thu hồi quyền Tổ trưởng." },
          { status: 403 }
        );
      }

      const { team } = payload;
      await revokeTeamLeader(team);

      return NextResponse.json({
        ok: true,
        message: `Đã thu hồi quyền Tổ trưởng Tổ ${team}.`,
      });
    }

    // 7. SET WEEK LOCK: Khóa / Mở lại tuần
    if (action === "setLock") {
      if (session.role !== "teacher" && session.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Chỉ GVCN mới có quyền khóa/mở tuần thi đua." },
          { status: 403 }
        );
      }

      const { week, locked, note } = payload;
      const result = await setWeekLock(week, Boolean(locked), note || "");

      return NextResponse.json({
        ok: true,
        locked: result,
        message: result ? `Đã khóa tuần ${week}.` : `Đã mở lại tuần ${week}.`,
      });
    }

    // 8. SUBMIT REPORT: Học sinh / Tổ phó gửi báo cáo nề nếp
    if (action === "submitReport") {
      const { studentId, eventCode, eventDate, note, week } = payload;
      const targetWeek = week || calculateCurrentWeek();

      const students = await getCompetitionStudentsList();
      const student = students.find((s) => s.studentId === studentId);
      const catalogItem = findCatalogItemByCode(eventCode);

      if (!student || !catalogItem) {
        return NextResponse.json({ ok: false, message: "Thông tin không hợp lệ." }, { status: 400 });
      }

      const sub = await createCompetitionSubmission({
        studentId: student.studentId,
        studentName: student.fullName,
        team: student.team,
        suggestedCode: catalogItem.code,
        description: catalogItem.description,
        plus: catalogItem.plus,
        minus: catalogItem.minus,
        eventDate: eventDate || new Date().toISOString().split("T")[0],
        note: note ? String(note) : undefined,
        createdByName: session.name || "Học sinh",
        week: targetWeek,
      });

      return NextResponse.json({
        ok: true,
        message: "Đã gửi báo cáo chờ duyệt thành công.",
        submission: sub,
      });
    }

    // 9. REVIEW SUBMISSION: Duyệt hoặc từ chối báo cáo
    if (action === "reviewSubmission") {
      const { submissionId, decision, reviewNote } = payload;
      const result = await reviewCompetitionSubmission(
        submissionId,
        decision,
        reviewNote,
        session.name || "GVCN"
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, message: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    console.error("[Competition POST Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi xử lý yêu cầu thi đua." },
      { status: 500 }
    );
  }
}
