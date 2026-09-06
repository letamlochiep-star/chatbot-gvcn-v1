import { NextRequest, NextResponse } from "next/server";
import { getStudents } from "@/lib/drive";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { AuthSession } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cccd } = body;

    if (!cccd || typeof cccd !== "string") {
      return NextResponse.json(
        { ok: false, message: "Vui lòng nhập số Căn cước công dân (CCCD)." },
        { status: 400 }
      );
    }

    const cleanCccd = cccd.replace(/\D/g, "").trim();

    if (cleanCccd.length < 9 || cleanCccd.length > 12) {
      return NextResponse.json(
        { ok: false, message: "Số CCCD không hợp lệ (phải từ 9 đến 12 chữ số)." },
        { status: 400 }
      );
    }

    // Lấy danh sách học sinh
    const { students } = await getStudents();

    // Tìm học sinh có CCCD khớp chính xác
    const matchedStudent = students.find((s) => {
      const studentCccd = (s.canCuoc || "").replace(/\D/g, "").trim();
      return studentCccd === cleanCccd;
    });

    if (!matchedStudent) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Không tìm thấy học sinh với số CCCD này trong danh sách lớp 8A6. Vui lòng kiểm tra lại.",
        },
        { status: 401 }
      );
    }

    // Tạo phiên đăng nhập cho học sinh
    const session: AuthSession = {
      email: `hs_${matchedStudent.stt}@8a6.student`,
      name: matchedStudent.hoVaTen,
      role: "student",
      stt: matchedStudent.stt,
      cccd: matchedStudent.canCuoc,
    };

    const token = await createSessionToken(session);

    const response = NextResponse.json({
      ok: true,
      message: `Xin chào ${matchedStudent.hoVaTen}! Đăng nhập thành công.`,
      user: session,
      studentStt: matchedStudent.stt,
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
    console.error("[Student Login Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi xử lý đăng nhập học sinh." },
      { status: 500 }
    );
  }
}
