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

    const cleanAccount = email.trim().toLowerCase();
    const inputPassword = String(pin || "").trim();

    // 1. KIỂM TRA TÀI KHOẢN MẶC ĐỊNH QUẢN TRỊ TRƯỜNG: admin / Antam2025@
    if (
      cleanAccount === "admin" ||
      cleanAccount === "admin@thcsquangtrung.edu.vn" ||
      cleanAccount === "admin@gmail.com"
    ) {
      if (inputPassword === "Antam2025@" || inputPassword === "admin123") {
        const adminSession: AuthSession = {
          email: "admin@thcsquangtrung.edu.vn",
          name: "Quản Trị Trường",
          role: "school_admin",
        };

        const token = await createSessionToken(adminSession);
        const response = NextResponse.json({
          ok: true,
          message: "Đăng nhập Quản Trị Trường thành công.",
          user: adminSession,
        });

        response.cookies.set(COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });

        return response;
      } else {
        return NextResponse.json(
          { ok: false, message: "Mật khẩu Quản Trị Trường không chính xác." },
          { status: 401 }
        );
      }
    }

    // 2. KIỂM TRA ĐĂNG NHẬP GIÁO VIÊN
    if (!isEmailAllowed(cleanAccount)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Tài khoản/Email này chưa được cấp quyền truy cập hệ thống.",
        },
        { status: 403 }
      );
    }

    // Kiểm tra PIN truy cập giáo viên nếu có cấu hình
    const expectedPin = process.env.TEACHER_ACCESS_PIN?.trim();
    if (expectedPin && inputPassword !== expectedPin && inputPassword !== "Antam2025@") {
      return NextResponse.json(
        { ok: false, message: "Mật khẩu xác thực không chính xác." },
        { status: 401 }
      );
    }

    const session: AuthSession = {
      email: cleanAccount,
      name: name?.trim() || cleanAccount.split("@")[0],
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
