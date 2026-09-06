import { describe, it, expect, beforeEach } from "vitest";
import { isEmailAllowed, createSessionToken, verifySessionToken } from "../src/lib/auth";
import { checkRateLimit } from "../src/lib/ratelimit";
import { AuthSession } from "../src/lib/types";

describe("5. Security & Authentication Tests", () => {
  beforeEach(() => {
    process.env.ALLOWED_EMAILS = "teacher1@example.com,teacher2@example.com";
    process.env.ALLOWED_DOMAIN = "quangtrung.edu.vn";
    process.env.SESSION_SECRET = "test_secret_key_8a6_for_unit_tests_only";
  });

  it("Cho phép email nằm trong ALLOWED_EMAILS", () => {
    expect(isEmailAllowed("teacher1@example.com")).toBe(true);
    expect(isEmailAllowed("TEACHER2@EXAMPLE.COM")).toBe(true);
  });

  it("Cho phép email thuộc ALLOWED_DOMAIN", () => {
    expect(isEmailAllowed("gv8a6@quangtrung.edu.vn")).toBe(true);
    expect(isEmailAllowed("hieutruong@quangtrung.edu.vn")).toBe(true);
  });

  it("Từ chối email không hợp lệ", () => {
    expect(isEmailAllowed("stranger@gmail.com")).toBe(false);
    expect(isEmailAllowed("hacker@otherdomain.com")).toBe(false);
    expect(isEmailAllowed("")).toBe(false);
  });

  it("Tạo và xác thực Session Token JWT thành công", async () => {
    const session: AuthSession = {
      email: "teacher1@example.com",
      name: "Cô Giáo Chủ Nhiệm 8A6",
      role: "teacher",
    };

    const token = await createSessionToken(session);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.email).toBe("teacher1@example.com");
    expect(decoded?.name).toBe("Cô Giáo Chủ Nhiệm 8A6");
    expect(decoded?.role).toBe("teacher");
  });

  it("Từ chối Session Token giả mạo hoặc sai chữ ký", async () => {
    const invalidToken = "eyJh...invalid.token.payload";
    const decoded = await verifySessionToken(invalidToken);
    expect(decoded).toBeNull();
  });
});

describe("6. Rate Limiting Tests", () => {
  it("Cho phép truy vấn trong ngưỡng giới hạn và chặn khi vượt ngưỡng", () => {
    const ip = "192.168.1.100";
    let lastResult: any;

    // Gửi 40 request
    for (let i = 0; i < 40; i++) {
      lastResult = checkRateLimit(ip);
      expect(lastResult.success).toBe(true);
    }

    // Request thứ 41 bị chặn
    const blockedResult = checkRateLimit(ip);
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.remaining).toBe(0);
  });
});
