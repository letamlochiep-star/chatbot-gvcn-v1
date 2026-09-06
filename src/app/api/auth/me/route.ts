import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: session,
  });
}
