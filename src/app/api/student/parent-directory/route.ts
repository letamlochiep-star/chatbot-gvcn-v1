import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth";
import { getStudents } from "@/lib/drive";

export const dynamic = "force-dynamic";

export interface ParentContactItem {
  stt: string;
  studentName: string;
  gender: string;
  birthDate: string;
  address: string;
  fatherName: string;
  fatherJob: string;
  fatherBirthYear: string;
  fatherPhone: string;
  motherName: string;
  motherJob: string;
  motherBirthYear: string;
  motherPhone: string;
  sllPhone: string;
  studentPhone: string;
  primaryPhone: string;
  primaryContactName: string;
  hasPhone: boolean;
}

export async function GET(req: NextRequest) {
  const session = await authenticateApiRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập để truy cập danh bạ phụ huynh." },
      { status: 401 }
    );
  }

  if (session.role !== "teacher" && session.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "Chỉ giáo viên mới có quyền xem danh bạ phụ huynh cả lớp." },
      { status: 403 }
    );
  }

  try {
    const { students } = await getStudents();

    const contacts: ParentContactItem[] = students.map((s) => {
      const fatherPhone = (s.dienThoaiBo || "").trim();
      const motherPhone = (s.dienThoaiMe || "").trim();
      const sllPhone = (s.dienThoaiSLL || "").trim();
      const studentPhone = (s.dienThoaiHS || "").trim();

      const primaryPhone = fatherPhone || motherPhone || sllPhone || studentPhone || "";
      let primaryContactName = "Phụ huynh";
      if (fatherPhone && s.tenCha) {
        primaryContactName = `Bác ${s.tenCha} (Bố)`;
      } else if (motherPhone && s.tenMe) {
        primaryContactName = `Cô ${s.tenMe} (Mẹ)`;
      } else if (s.tenCha) {
        primaryContactName = `Bác ${s.tenCha} (Bố)`;
      } else if (s.tenMe) {
        primaryContactName = `Cô ${s.tenMe} (Mẹ)`;
      }

      const addressParts = [s.choO_SNXom, s.choO_KhuDanCu, s.choO_XaPhuong].filter(Boolean);
      const address = addressParts.join(", ") || s.hokhau_XaPhuong || "Chưa cập nhật";

      return {
        stt: s.stt,
        studentName: s.hoVaTen,
        gender: s.gioiTinh,
        birthDate: s.ngaySinh,
        address,
        fatherName: s.tenCha || "",
        fatherJob: s.ngheNghiepCha || "",
        fatherBirthYear: s.namSinhCha || "",
        fatherPhone,
        motherName: s.tenMe || "",
        motherJob: s.ngheNghiepMe || "",
        motherBirthYear: s.namSinhMe || "",
        motherPhone,
        sllPhone,
        studentPhone,
        primaryPhone,
        primaryContactName,
        hasPhone: Boolean(fatherPhone || motherPhone || sllPhone),
      };
    });

    const totalWithPhone = contacts.filter((c) => c.hasPhone).length;

    return NextResponse.json({
      ok: true,
      totalStudents: contacts.length,
      totalWithPhone,
      contacts,
    });
  } catch (error: any) {
    console.error("[Parent Directory API Error]", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Lỗi tải danh bạ phụ huynh." },
      { status: 500 }
    );
  }
}
