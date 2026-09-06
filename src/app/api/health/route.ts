import { NextResponse } from "next/server";
import { checkDriveHealth } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const driveStatus = await checkDriveHealth();

    return NextResponse.json(
      {
        ok: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        drive: {
          configured: driveStatus.driveConfigured,
          readable: driveStatus.driveReadable,
          source: driveStatus.source,
          studentCount: driveStatus.studentCount,
          message: driveStatus.message,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        error: error?.message || "Lỗi kiểm tra hệ thống",
      },
      { status: 500 }
    );
  }
}
