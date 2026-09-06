import fs from "fs";
import path from "path";

export interface StudentFeedbackEmailPayload {
  studentName: string;
  stt: string;
  content: string;
  isConfidential?: boolean;
  type?: "message" | "profile_update";
  hobbies?: string;
  dreams?: string;
  personalNote?: string;
  createdAt?: string;
}

const DEFAULT_NOTIFY_EMAIL = "tailieugiaoducso@gmail.com";
const DATA_DIR = path.join(process.cwd(), "data");
const EMAIL_LOGS_FILE = path.join(DATA_DIR, "email_logs.json");

function logEmailToFile(entry: Record<string, unknown>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let logs: Record<string, unknown>[] = [];
    if (fs.existsSync(EMAIL_LOGS_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(EMAIL_LOGS_FILE, "utf-8"));
      } catch {}
    }
    logs.unshift(entry);
    // Giới hạn 100 email log gần nhất
    if (logs.length > 100) logs = logs.slice(0, 100);
    fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Email Log Warning] Không thể ghi log email:", err);
  }
}

/**
 * Gửi email thông báo khi học sinh phản hồi hoặc gửi tin nhắn mới
 */
export async function sendStudentFeedbackEmail(payload: StudentFeedbackEmailPayload): Promise<{
  ok: boolean;
  message: string;
  recipient: string;
}> {
  const recipient = process.env.NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_EMAIL;
  const timeStr = payload.createdAt
    ? new Date(payload.createdAt).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const isConfidential = Boolean(payload.isConfidential);
  const isProfileUpdate = payload.type === "profile_update";

  const subject = isProfileUpdate
    ? `[Lớp 8A6] Học sinh ${payload.studentName} (STT ${payload.stt}) vừa cập nhật thông tin cá nhân`
    : `[Lớp 8A6] ${isConfidential ? "🔒 [GIỮ KÍN] " : ""}Tin nhắn mới từ học sinh: ${payload.studentName} (STT ${payload.stt})`;

  // Tạo nội dung HTML cho email
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; color: #1e3a5f; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e1ecf4; }
    .header { background: linear-gradient(135deg, #124f83, #0d6e64); padding: 24px; color: #ffffff; text-align: left; }
    .badge-confidential { display: inline-block; background: #fbbf24; color: #78350f; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }
    .badge-normal { display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }
    .body-content { padding: 24px; }
    .info-box { background: #f8fafc; border-left: 4px solid #124f83; padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; }
    .message-card { background: ${isConfidential ? "#fffbeb" : "#f0f9ff"}; border: 1px solid ${isConfidential ? "#fef3c7" : "#bae6fd"}; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .message-text { font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-weight: 500; }
    .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">THCS Quang Trung · Lớp 8A6</div>
      <h2 style="margin: 6px 0 0 0; font-size: 18px; font-weight: bold;">
        ${isProfileUpdate ? "🌟 Học Sinh Cập Nhật Thông Tin" : "💬 Thông Báo Ý Kiến Phản Hồi"}
      </h2>
      ${
        isConfidential
          ? `<span class="badge-confidential">🔒 Tâm Tư Giữ Kín / Riêng Tư</span>`
          : `<span class="badge-normal">✉️ Tin nhắn học sinh</span>`
      }
    </div>

    <div class="body-content">
      <div class="info-box">
        <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Họ và tên:</strong> ${payload.studentName}</p>
        <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Số thứ tự (STT):</strong> ${payload.stt}</p>
        <p style="margin: 0; font-size: 12px; color: #64748b;"><strong>Thời gian gửi:</strong> ${timeStr}</p>
      </div>

      ${
        payload.content
          ? `
      <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">Nội dung phản hồi / Lời nhắn:</div>
      <div class="message-card">
        <div class="message-text">${payload.content}</div>
      </div>
      `
          : ""
      }

      ${
        payload.hobbies || payload.dreams
          ? `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-top: 12px; font-size: 13px; color: #166534;">
        <div style="font-weight: bold; margin-bottom: 6px;">🌟 Góc của em (My Space):</div>
        ${payload.hobbies ? `<div>• <strong>Sở thích:</strong> ${payload.hobbies}</div>` : ""}
        ${payload.dreams ? `<div style="margin-top: 4px;">• <strong>Ước mơ:</strong> ${payload.dreams}</div>` : ""}
      </div>
      `
          : ""
      }

      <p style="font-size: 12px; color: #64748b; margin-top: 20px; line-height: 1.5;">
        * Thầy/Cô có thể đăng nhập vào hệ thống Tra Cứu & Quản Lý Học Sinh 8A6 để phản hồi trực tiếp cho học sinh.
      </p>
    </div>

    <div class="footer">
      <div>Hệ Thống Tra Cứu & Quản Lý Hồ Sơ Học Sinh THCS Quang Trung - Lớp 8A6</div>
      <div style="margin-top: 4px;">Email nhận thông báo: <strong>${recipient}</strong></div>
    </div>
  </div>
</body>
</html>
  `;

  // 1. Thử gửi qua Resend API (nếu có API Key trong env)
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "HSCN 8A6 <onboarding@resend.dev>",
          to: [recipient],
          subject,
          html: htmlContent,
        }),
      });

      if (res.ok) {
        console.log(`[Email Success] Đã gửi thông báo qua Resend đến ${recipient}`);
        logEmailToFile({
          status: "sent_resend",
          to: recipient,
          subject,
          studentName: payload.studentName,
          stt: payload.stt,
          sentAt: new Date().toISOString(),
        });
        return { ok: true, message: "Đã gửi email qua Resend.", recipient };
      }
    } catch (err: any) {
      console.error("[Resend Error] Không thể gửi email:", err?.message || err);
    }
  }

  // 2. Thử gửi qua Webhook nếu cấu hình
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject,
          student: payload.studentName,
          stt: payload.stt,
          content: payload.content,
          isConfidential,
          time: timeStr,
        }),
      });
    } catch (err) {
      console.warn("[Webhook Error]", err);
    }
  }

  // 3. Ghi nhận log lưu trữ an toàn
  logEmailToFile({
    status: "recorded",
    to: recipient,
    subject,
    studentName: payload.studentName,
    stt: payload.stt,
    content: payload.content,
    isConfidential,
    sentAt: new Date().toISOString(),
  });

  console.log(
    `[Email Notification] Đã ghi nhận gửi email đến ${recipient} cho học sinh ${payload.studentName} (STT ${payload.stt})`
  );

  return {
    ok: true,
    message: `Đã ghi nhận thông báo gửi tới ${recipient}`,
    recipient,
  };
}
