import { NextRequest, NextResponse } from "next/server";
import { getCloudStatus, syncAllToCloud, pullLatestFromCloud, getSchoolSecurityMatrix } from "@/lib/firebaseSync";
import { authenticateApiRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const status = await getCloudStatus();
    const matrix = getSchoolSecurityMatrix();
    return NextResponse.json({
      ok: true,
      status,
      matrix,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Lỗi kiểm tra Cloud status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Sử dụng authenticateApiRequest để đọc đúng cookie + hỗ trợ Bearer token
    const session = await authenticateApiRequest(req);

    if (!session || (session.role !== "admin" && session.role !== "school_admin" && session.role !== "bgh" && session.role !== "teacher")) {
      return NextResponse.json(
        { ok: false, message: "Không có quyền thực hiện thao tác Cloud Sync. Yêu cầu Quản Trị Trường." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action || "test";

    // syncAll = upload toàn bộ dữ liệu lên Cloud
    if (action === "upload" || action === "syncAll") {
      const res = await syncAllToCloud();
      return NextResponse.json(res);
    }

    if (action === "download") {
      const res = await pullLatestFromCloud();
      return NextResponse.json(res);
    }

    if (action === "test") {
      const status = await getCloudStatus();
      return NextResponse.json({ ok: true, status });
    }

    return NextResponse.json({ ok: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Lỗi xử lý Cloud Sync" },
      { status: 500 }
    );
  }
}
