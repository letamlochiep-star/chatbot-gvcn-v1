import { describe, it, expect } from "vitest";
import { normalizeVietnamese, isSttQuery } from "../src/lib/vietnamese";
import { searchStudents, getStudentByStt } from "../src/lib/search";
import { generateSampleStudents } from "../src/lib/mockData";
import { groupStudentFields, SCHEMA_FIELDS } from "../src/lib/schema";
import { cleanCellValue, formatDate, parseXlsxBuffer } from "../src/lib/parser";
import * as XLSX from "xlsx";

describe("1. Vietnamese Text Normalization & STT Rule", () => {
  it("Chuẩn hóa tiếng Việt bỏ dấu và chuyển đ -> d", () => {
    expect(normalizeVietnamese("Nguyễn Bảo Anh")).toBe("nguyen bao anh");
    expect(normalizeVietnamese("Đặng Quang Vinh")).toBe("dang quang vinh");
    expect(normalizeVietnamese("  TRẦN   GIA   BẢO  ")).toBe("tran gia bao");
    expect(normalizeVietnamese("Lê Thùy An")).toBe("le thuy an");
  });

  it("Nhận diện đúng query STT (chỉ gồm 1-3 chữ số)", () => {
    expect(isSttQuery("1")).toBe(true);
    expect(isSttQuery("12")).toBe(true);
    expect(isSttQuery("43")).toBe(true);
    expect(isSttQuery("01")).toBe(true);
    expect(isSttQuery("123")).toBe(true);
    expect(isSttQuery("1234")).toBe(false); // > 3 chữ số
    expect(isSttQuery("12a")).toBe(false);
    expect(isSttQuery("Nguyễn 1")).toBe(false);
  });
});

describe("2. Search Engine Rules", () => {
  const students = generateSampleStudents();

  it("STT 1 trả về đúng 1 kết quả chính xác", () => {
    const result = searchStudents("1", students);
    expect(result.ok).toBe(true);
    expect(result.total).toBe(1);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].stt).toBe("1");
    expect(result.singleStudent).toBeDefined();
    expect(result.singleStudent?.stt).toBe("1");
  });

  it("STT không tồn tại (99) trả về 0 kết quả", () => {
    const result = searchStudents("99", students);
    expect(result.ok).toBe(true);
    expect(result.total).toBe(0);
    expect(result.matches).toHaveLength(0);
    expect(result.message).toContain("Không tìm thấy học sinh phù hợp");
  });

  it("Tìm kiếm tên có dấu 'Nguyễn' trả về danh sách chứa họ/tên Nguyên/Nguyễn", () => {
    const result = searchStudents("Nguyễn", students);
    expect(result.ok).toBe(true);
    expect(result.total).toBeGreaterThan(1);
    for (const match of result.matches) {
      expect(normalizeVietnamese(match.name)).toContain("nguyen");
    }
  });

  it("Tìm kiếm tên không dấu 'bao anh' trả về 'Bảo Anh'", () => {
    const result = searchStudents("bao anh", students);
    expect(result.ok).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(1);
    const found = result.matches.find((m) =>
      normalizeVietnamese(m.name).includes("bao anh")
    );
    expect(found).toBeDefined();
  });

  it("Tìm kiếm tên không dấu 'gia bao' trả về học sinh chứa 'Gia Bảo'", () => {
    const result = searchStudents("gia bao", students);
    expect(result.ok).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(1);
    const found = result.matches.find((m) =>
      normalizeVietnamese(m.name).includes("gia bao")
    );
    expect(found).toBeDefined();
  });

  it("Lấy chi tiết học sinh theo STT bằng getStudentByStt", () => {
    const student1 = getStudentByStt("1", students);
    expect(student1).toBeDefined();
    expect(student1?.stt).toBe("1");

    const nonExistent = getStudentByStt("999", students);
    expect(nonExistent).toBeNull();
  });
});

describe("3. Schema & 49 Fields Categorization", () => {
  const students = generateSampleStudents();
  const student = students[0];

  it("Schema có đủ 49 trường từ cột A đến AW", () => {
    expect(SCHEMA_FIELDS).toHaveLength(49);
    expect(SCHEMA_FIELDS[0].column).toBe("A");
    expect(SCHEMA_FIELDS[0].label).toBe("STT");
    expect(SCHEMA_FIELDS[48].column).toBe("AW");
    expect(SCHEMA_FIELDS[48].label).toBe("Ghi chú");
  });

  it("Phân nhóm 49 trường thành 9 nhóm rõ ràng", () => {
    const groups = groupStudentFields(student);
    expect(groups).toHaveLength(9);
    expect(groups[0].title).toContain("1. Thông tin cơ bản");
    expect(groups[1].title).toContain("2. Chỗ ở hiện nay");
    expect(groups[2].title).toContain("3. Hộ khẩu thường trú");
    expect(groups[3].title).toContain("4. Nơi sinh");
    expect(groups[4].title).toContain("5. Căn cước");
    expect(groups[5].title).toContain("6. Dân tộc");
    expect(groups[6].title).toContain("7. Thông tin cha mẹ");
    expect(groups[7].title).toContain("8. Thông tin liên hệ");
    expect(groups[8].title).toContain("9. Khuyết tật");
  });

  it("Giữ số 0 ở đầu CCCD, số điện thoại, mã học sinh", () => {
    expect(student.canCuoc.startsWith("0")).toBe(true);
    expect(student.dienThoaiBo.startsWith("0")).toBe(true);
    expect(student.dienThoaiMe.startsWith("0")).toBe(true);
  });
});

describe("4. XLSX Parser & Header Formatting", () => {
  it("formatDate định dạng dd/mm/yyyy chính xác", () => {
    expect(formatDate(new Date(2011, 4, 9))).toBe("09/05/2011");
    expect(formatDate("01/01/2011")).toBe("01/01/2011");
    expect(formatDate("")).toBe("—");
    expect(formatDate(null)).toBe("—");
  });

  it("cleanCellValue hiển thị — cho ô trống", () => {
    expect(cleanCellValue("")).toBe("—");
    expect(cleanCellValue(null)).toBe("—");
    expect(cleanCellValue(undefined)).toBe("—");
    expect(cleanCellValue("  ")).toBe("—");
    expect(cleanCellValue("0912345678")).toBe("0912345678");
  });

  it("parseXlsxBuffer parse file excel giả lập chuẩn 49 cột", () => {
    // Tạo workbook giả lập với sheet 'ds học sinh'
    const wsData: any[][] = [
      // Row 1: Header 1
      ["STT", "Mã HS", "Mã VEMIS", "Mã MOET", "Sổ ĐB", "Họ và tên", "Ngày sinh", "Ngày vào trường", "Giới tính", "Quốc tịch",
       "Chỗ ở hiện nay", "", "", "", "Hộ khẩu thường trú", "", "", "", "Nơi sinh", "", "", "Quê quán", "", "", "Nơi khai sinh", "",
       "Căn cước", "Ngày cấp", "Nơi cấp", "Dân tộc", "Tôn giáo", "Chính sách", "Cận nghèo", "Đoàn viên", "Đội viên",
       "Tên cha", "Nghề cha", "Năm sinh cha", "Tên mẹ", "Nghề mẹ", "Năm sinh mẹ",
       "ĐT SLL", "Email SLL", "ĐT bố", "ĐT mẹ", "ĐT HS", "Khuyết tật", "N.trú B.trú", "Ghi chú"],
      // Row 2: Header 2
      ["", "", "", "", "", "", "", "", "", "",
       "SN/Xóm", "Khu dân cư", "Xã/Phường", "Tỉnh/Tp", "SN/Xóm", "Khu dân cư", "Xã/Phường", "Tỉnh/Tp", "TT", "Xã/Phường", "Tỉnh/Tp", "TT", "Xã/Phường", "Tỉnh/Tp", "Xã/Phường", "Tỉnh/Tp",
       "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      // Row 3: Data row 1
      ["1", "HS01", "V01", "M01", "DB01", "Nguyễn Bảo Anh", "01/01/2011", "05/09/2022", "Nam", "Việt Nam",
       "12 Phù Đổng", "Khu 3", "Phường 8", "Lâm Đồng", "12 Phù Đổng", "Khu 3", "Phường 8", "Lâm Đồng", "BV Lâm Đồng", "Phường 1", "Lâm Đồng", "Xuân Hương", "Phường 8", "Lâm Đồng", "Phường 8", "Lâm Đồng",
       "068209000112", "15/06/2024", "Cục CSQLHC", "Kinh", "Không", "", "", "", "Có",
       "Nguyễn Văn A", "Kinh doanh", "1980", "Trần Thị B", "Nội trợ", "1984",
       "0912345601", "ph1@gmail.com", "0912345601", "0987654301", "0901234501", "Không", "Bán trú", "Học sinh giỏi"],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "ds học sinh");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const parsed = parseXlsxBuffer(buffer);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].stt).toBe("1");
    expect(parsed[0].hoVaTen).toBe("Nguyễn Bảo Anh");
    expect(parsed[0].canCuoc).toBe("068209000112");
    expect(parsed[0].dienThoaiBo).toBe("0912345601");
    expect(parsed[0].choO_XaPhuong).toBe("Phường 8");
    expect(parsed[0].hokhau_XaPhuong).toBe("Phường 8");
  });
});
