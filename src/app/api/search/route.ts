import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { getStudents } from "@/lib/drive";
import { searchStudents } from "@/lib/search";
import { getExtension } from "@/lib/db";

export const dynamic = "force-dynamic";

async function handleSearch(req: NextRequest, query: string) {
  // 1. Kiểm tra xác thực (Bảo mật bắt buộc)
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        message: "Bạn cần đăng nhập bằng tài khoản được cấp phép để tra cứu dữ liệu.",
      },
      { status: 401 }
    );
  }

  // Học sinh không được dùng tính năng tra cứu danh sách chung
  if (session.role === "student") {
    return NextResponse.json(
      {
        ok: false,
        message: "Cổng học sinh chỉ cho phép xem hồ sơ của chính mình.",
      },
      { status: 403 }
    );
  }

  // 2. Rate limit theo IP / User để chống quét dữ liệu tự động
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    session.email ||
    "anonymous";
  const rateLimit = checkRateLimit(`search:${ip}`);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        ok: false,
        message: `Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau ${rateLimit.reset} giây.`,
      },
      { status: 429 }
    );
  }

  // 3. Đọc dữ liệu từ Google Drive (có cache server)
  try {
    const { students } = await getStudents();
    const result = searchStudents(query, students);

    // Nếu tìm thấy đúng 1 học sinh, đính kèm thông tin mở rộng (extension)
    if (result.ok && result.singleStudent) {
      const ext = await getExtension(result.singleStudent.stt);
      if (ext) {
        result.singleStudent.extension = ext;
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Search Error]", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Hệ thống tạm thời chưa đọc được dữ liệu lớp 8A6. Vui lòng thử lại hoặc liên hệ quản trị viên.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || searchParams.get("query") || "";
  return handleSearch(req, query);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body?.query || body?.q || "";
    return handleSearch(req, query);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Dữ liệu yêu cầu không hợp lệ." },
      { status: 400 }
    );
  }
}
