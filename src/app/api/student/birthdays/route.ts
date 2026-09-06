import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getStudents } from "@/lib/drive";
import { BirthdayItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseVietnameseDate(dateStr: string): { day: number; month: number; year?: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.trim();

  // Thử định dạng DD/MM/YYYY hoặc DD-MM-YYYY
  const parts = clean.split(/[/\-.]/);
  if (parts.length >= 2) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parts[2] ? parseInt(parts[2], 10) : undefined;

    // Trường hợp YYYY-MM-DD
    if (p1 > 1900 && p2 >= 1 && p2 <= 12 && p3 && p3 >= 1 && p3 <= 31) {
      return { day: p3, month: p2, year: p1 };
    }

    // Trường hợp DD/MM/YYYY
    if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
      return { day: p1, month: p2, year: p3 };
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để xem lịch sinh nhật." },
      { status: 401 }
    );
  }

  try {
    const { students } = await getStudents();
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const birthdayList: BirthdayItem[] = [];

    for (const s of students) {
      const parsed = parseVietnameseDate(s.ngaySinh);
      if (!parsed) continue;

      const { day, month, year } = parsed;
      const age = year ? currentYear - year : undefined;

      // Tính số ngày đếm ngược đến sinh nhật tiếp theo
      let nextBirthday = new Date(currentYear, month - 1, day);
      if (
        nextBirthday.getTime() <
        new Date(currentYear, currentMonth - 1, currentDay).getTime()
      ) {
        nextBirthday = new Date(currentYear + 1, month - 1, day);
      }

      const diffTime = nextBirthday.getTime() - new Date(currentYear, currentMonth - 1, currentDay).getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const isToday = month === currentMonth && day === currentDay;
      const isThisWeek = daysUntil >= 0 && daysUntil <= 7;

      birthdayList.push({
        stt: s.stt,
        name: s.hoVaTen,
        birthDate: s.ngaySinh,
        day,
        month,
        year,
        age,
        daysUntil,
        isThisWeek,
        isToday,
      });
    }

    // Nhóm theo từng tháng (1 đến 12)
    const groupedByMonth: Record<number, BirthdayItem[]> = {};
    for (let m = 1; m <= 12; m++) {
      groupedByMonth[m] = birthdayList
        .filter((b) => b.month === m)
        .sort((a, b) => a.day - b.day);
    }

    // Lọc danh sách sinh nhật sắp tới (trong vòng 30 ngày)
    const upcoming = [...birthdayList]
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .filter((b) => b.daysUntil <= 30);

    return NextResponse.json({
      ok: true,
      currentMonth,
      currentDay,
      totalStudentsWithBirthday: birthdayList.length,
      upcoming,
      groupedByMonth,
    });
  } catch (error: any) {
    console.error("[Birthday API Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi tải lịch sinh nhật." },
      { status: 500 }
    );
  }
}
