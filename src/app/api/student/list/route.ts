import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getStudents } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. Xác thực người dùng
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Cần đăng nhập để lấy danh sách học sinh." },
      { status: 401 }
    );
  }

  try {
    const { students } = await getStudents();
    const list = students
      .map((s) => ({
        stt: s.stt,
        hoVaTen: s.hoVaTen,
        gioiTinh: s.gioiTinh,
        ngaySinh: s.ngaySinh,
        maHocSinh: s.maHocSinh,
      }))
      .sort((a, b) => {
        const numA = parseInt(a.stt, 10);
        const numB = parseInt(b.stt, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.stt.localeCompare(b.stt);
      });

    return NextResponse.json({
      ok: true,
      total: list.length,
      students: list,
    });
  } catch (error: any) {
    console.error("[Student List API Error]", error);
    return NextResponse.json(
      { ok: false, message: "Lỗi tải danh sách học sinh." },
      { status: 500 }
    );
  }
}
