# HƯỚNG DẪN TRIỂN KHAI CHATBOT 8A6 TRÊN ANTIGRAVITY

## 1. Dùng đúng file nguồn
Nguồn là file `danh_sach_hoc_sinh_8A6.xlsx` trên Google Drive. File không cần chuyển thành Google Sheets.

## 2. Tạo project Antigravity
Tạo project mới và chọn stack Next.js + TypeScript.

Tạo thư mục `/knowledge` và đưa vào:
- `kt_chatbot_8A6.md`
- `tc_chatbot_8A6.md`
- `schema_8A6.json`

Sau đó copy toàn bộ `PROMPT_ANTIGRAVITY_8A6_XLSX.md` vào Antigravity để agent xây app.

## 3. Packages
Yêu cầu Antigravity cài:
- `xlsx`
- `googleapis`
- thư viện auth phù hợp với stack
- thư viện rate-limit nhẹ nếu cần

## 4. Environment variables
```env
GOOGLE_DRIVE_FILE_ID=1tf8_63WhGruWIXEvGJDq8qMZK7Iq5c7v
GOOGLE_SERVICE_ACCOUNT_JSON=...
ALLOWED_EMAILS=teacher1@example.com,teacher2@example.com
# hoặc
ALLOWED_DOMAIN=example.edu.vn
```

Không commit `.env` lên GitHub.

## 5. Cấp quyền đọc file Drive
Nếu dùng service account, lấy email service account rồi chia sẻ file XLSX cho email đó với quyền Viewer.

## 6. Kiểm tra
Mở `/api/health`. Chỉ khi health báo đọc Drive thành công mới kiểm tra tìm kiếm.

Test:
- `1`
- `12`
- `Nguyễn`
- `bao anh`
- một STT không tồn tại

## 7. Lưu ý bảo mật
App này chứa thông tin căn cước, địa chỉ, điện thoại và cha mẹ. Không triển khai public không đăng nhập.
