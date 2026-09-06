/**
 * Chuẩn hóa chuỗi tiếng Việt theo quy tắc:
 * 1. Bỏ khoảng trắng thừa ở 2 đầu và gộp nhiều khoảng trắng liên tiếp thành 1
 * 2. Chuyển thành chữ thường
 * 3. Chuẩn hóa Unicode NFD và bỏ các dấu thanh tiếng Việt
 * 4. Chuyển đ -> d, Đ -> d
 */
export function normalizeVietnamese(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kiểm tra xem query có phải là STT (chỉ gồm 1 đến 3 chữ số) hay không
 */
export function isSttQuery(query: string): boolean {
  const clean = query.trim();
  return /^\d{1,3}$/.test(clean);
}
