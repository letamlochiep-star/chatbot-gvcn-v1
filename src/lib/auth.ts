import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { AuthSession } from "./types";

const COOKIE_NAME = "auth_session_8a6";
const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "super_secret_jwt_key_8a6_quang_trung_da_lat_default"
);

/**
 * Kiểm tra xem email giáo viên có nằm trong danh sách được cấp phép không
 */
export function isEmailAllowed(email: string): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  const allowedEmails = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.includes(cleanEmail)) {
    return true;
  }

  const allowedDomain = (process.env.ALLOWED_DOMAIN || "").trim().toLowerCase();
  if (allowedDomain && cleanEmail.endsWith(`@${allowedDomain}`)) {
    return true;
  }

  // Nếu cả 2 cấu hình đều trống trong môi trường dev, cho phép email mặc định
  if (allowedEmails.length === 0 && !allowedDomain) {
    return true;
  }

  return false;
}

/**
 * Tạo token JWT cho phiên đăng nhập (Hỗ trợ cả Giáo viên và Học sinh)
 */
export async function createSessionToken(session: AuthSession): Promise<string> {
  return await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

/**
 * Giải mã và xác thực token JWT
 */
export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      email: payload.email as string,
      name: payload.name as string,
      role: (payload.role as "teacher" | "admin" | "student") || "teacher",
      stt: payload.stt ? String(payload.stt) : undefined,
      cccd: payload.cccd ? String(payload.cccd) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Lấy thông tin session hiện tại từ cookie
 */
export async function getServerSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Xác thực session từ NextRequest trong API Route
 */
export async function authenticateApiRequest(req: NextRequest): Promise<AuthSession | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    // Thử đọc Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return await verifySessionToken(authHeader.substring(7));
    }
    return null;
  }
  return await verifySessionToken(token);
}

export { COOKIE_NAME };
