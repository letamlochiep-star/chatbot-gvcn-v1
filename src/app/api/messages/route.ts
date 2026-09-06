import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import {
  getMessagesByStt,
  getAllMessages,
  createMessage,
  updateMessageStatus,
  getUnreadMessagesCount,
  markStudentMessagesRead,
} from "@/lib/db";
import { sendStudentFeedbackEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để xem tin nhắn." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const stt = searchParams.get("stt");
  const countOnly = searchParams.get("countOnly");

  // Nếu chỉ cần đếm số tin chưa đọc (cho badge)
  if (countOnly === "true") {
    if (session.role === "student") {
      const studentStt = session.stt || "";
      const msgs = await getMessagesByStt(studentStt);
      const unreadCount = msgs.filter((m) => m.sender === "teacher" && m.status === "unread").length;
      return NextResponse.json({ ok: true, unreadCount });
    }
    const unreadCount = await getUnreadMessagesCount();
    return NextResponse.json({ ok: true, unreadCount });
  }

  // Nếu là học sinh, chỉ lấy tin nhắn của chính mình
  if (session.role === "student") {
    const studentStt = session.stt || "";
    const messages = await getMessagesByStt(studentStt);
    return NextResponse.json({ ok: true, messages });
  }

  // Nếu là giáo viên:
  const unreadCount = await getUnreadMessagesCount();
  if (stt) {
    const messages = await getMessagesByStt(stt);
    return NextResponse.json({ ok: true, messages, unreadCount });
  }

  const allMessages = await getAllMessages();
  return NextResponse.json({ ok: true, messages: allMessages, unreadCount });
}

export async function POST(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để gửi tin nhắn." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { content, isConfidential, action, messageId, newStatus, studentStt } = body;

    // Đánh dấu tất cả tin nhắn của 1 học sinh là đã đọc
    if (action === "mark_student_read" && studentStt) {
      if (session.role !== "teacher" && session.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Chỉ giáo viên mới có quyền cập nhật trạng thái tin nhắn." },
          { status: 403 }
        );
      }
      await markStudentMessagesRead(studentStt, "read");
      return NextResponse.json({ ok: true, message: "Đã đánh dấu đã đọc tất cả tin nhắn của học sinh." });
    }

    // Cập nhật trạng thái tin nhắn đơn lẻ
    if (action === "update_status" && messageId && newStatus) {
      if (session.role !== "teacher" && session.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Chỉ giáo viên mới có quyền cập nhật trạng thái tin nhắn." },
          { status: 403 }
        );
      }
      const ok = await updateMessageStatus(messageId, newStatus);
      return NextResponse.json({ ok, message: "Đã cập nhật trạng thái." });
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { ok: false, message: "Nội dung tin nhắn không được để trống." },
        { status: 400 }
      );
    }

    let stt = "";
    let studentName = "";
    let sender: "student" | "teacher" = "student";

    if (session.role === "student") {
      stt = session.stt || "";
      studentName = session.name || "Học sinh";
      sender = "student";
    } else {
      stt = body.stt ? String(body.stt).trim() : "";
      studentName = body.studentName ? String(body.studentName).trim() : "Học sinh";
      sender = "teacher";

      if (!stt) {
        return NextResponse.json(
          { ok: false, message: "Giáo viên cần chọn học sinh để gửi phản hồi." },
          { status: 400 }
        );
      }
    }

    const newMsg = await createMessage({
      stt,
      studentName,
      sender,
      content,
      isConfidential: Boolean(isConfidential),
    });

    // Nếu học sinh gửi tin nhắn, gửi email thông báo về tailieugiaoducso@gmail.com
    if (sender === "student") {
      sendStudentFeedbackEmail({
        stt,
        studentName,
        content,
        isConfidential: Boolean(isConfidential),
        type: "message",
        createdAt: newMsg.createdAt,
      }).catch((e) => console.warn("[Email Notification Async Error]", e));
    }

    // Nếu giáo viên gửi phản hồi, tự động đánh dấu các tin nhắn trước của học sinh là đã phản hồi
    if (sender === "teacher") {
      await markStudentMessagesRead(stt, "replied");
    }

    return NextResponse.json({
      ok: true,
      message: "Đã gửi tin nhắn thành công.",
      data: newMsg,
    });
  } catch (error: any) {
    console.error("[Message Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi xử lý tin nhắn." },
      { status: 500 }
    );
  }
}
