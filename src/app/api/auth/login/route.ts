import { NextRequest, NextResponse } from "next/server";
import { isEmailAllowed, createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { AuthSession } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, pin, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, message: "Email không được để trống." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Kiểm tra email trong danh sách cho phép
    if (!isEmailAllowed(cleanEmail)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Email này chưa được cấp quyền truy cập hệ thống tra cứu hồ sơ 8A6.",
        },
        { status: 403 }
      );
    }

    // Kiểm tra PIN truy cập giáo viên nếu có cấu hình
    const expectedPin = process.env.TEACHER_ACCESS_PIN?.trim();
    if (expectedPin && pin !== expectedPin) {
      return NextResponse.json(
        { ok: false, message: "Mã PIN xác thực giáo viên không chính xác." },
        { status: 401 }
      );
    }

    const session: AuthSession = {
      email: cleanEmail,
      name: name?.trim() || cleanEmail.split("@")[0],
      role: "teacher",
    };

    const token = await createSessionToken(session);

    const response = NextResponse.json({
      ok: true,
      message: "Đăng nhập thành công.",
      user: session,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 ngày
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi xử lý đăng nhập." },
      { status: 500 }
    );
  }
}
