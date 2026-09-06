# MASTER PROMPT ANTIGRAVITY – CHATBOT TRA CỨU HỌC SINH 8A6 (XLSX TRÊN GOOGLE DRIVE)

Bạn hãy xây dựng một webapp production-ready bằng **Next.js + TypeScript** có giao diện chatbot để tra cứu hồ sơ học sinh lớp 8A6.

## A. NGUỒN DỮ LIỆU
File hiện tại là Excel `.xlsx` trên Google Drive, KHÔNG phải Google Sheets native.

- File name: `danh_sach_hoc_sinh_8A6.xlsx`
- Drive File ID: `1tf8_63WhGruWIXEvGJDq8qMZK7Iq5c7v`
- Sheet cần đọc: `ds học sinh`
- Dòng tiêu đề: 1 và 2
- Dòng dữ liệu bắt đầu: 3
- Tổng cột: 49, A:AW

**Không dùng Google Sheets API để đọc file này.**
Backend phải tải file XLSX bằng **Google Drive API `files.get(..., alt=media)`** rồi dùng package `xlsx` (SheetJS) để parse workbook.

Secrets server-side:
- `GOOGLE_DRIVE_FILE_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON` hoặc credential Google phù hợp

Không đưa credential vào frontend. Nếu dùng service account, hướng dẫn quản trị viên cấp quyền Viewer cho file Drive cho email service account.

## B. FILE KIẾN THỨC
Đọc và tuân thủ:
- `/knowledge/kt_chatbot_8A6.md`
- `/knowledge/tc_chatbot_8A6.md`
- `/knowledge/schema_8A6.json`

## C. CHỨC NĂNG TRA CỨU DUY NHẤT
Người dùng chỉ tìm bằng:
1. STT – cột A.
2. Họ tên/cụm từ trong họ tên – cột F.

### Quy tắc STT
- Query chỉ gồm số và dài tối đa 3 ký tự => ưu tiên STT.
- Match chính xác.

### Quy tắc tên
- Tìm contains trong cột F.
- Không phân biệt hoa/thường.
- Chuẩn hóa Unicode NFD và bỏ dấu tiếng Việt.
- Chuẩn hóa `đ` thành `d`.
- Gộp nhiều khoảng trắng thành một.

Ví dụ:
- `1` => STT 1
- `12` => STT 12
- `Nguyễn` => các tên chứa Nguyễn
- `bao anh` => tìm được tên có `Bảo Anh`
- `gia bao` => tìm các tên chứa `Gia Bảo`

## D. KẾT QUẢ
### Một kết quả
Hiển thị toàn bộ 49 trường theo schema.

### Nhiều kết quả
Hiển thị danh sách chọn gồm:
- STT
- Họ và tên
- Ngày sinh

Khi click một học sinh mới gọi API lấy chi tiết và hiển thị đủ 49 trường.

### Không có kết quả
Hiển thị: `Không tìm thấy học sinh phù hợp. Hãy kiểm tra lại STT hoặc cụm họ tên.`

## E. PARSE 2 DÒNG TIÊU ĐỀ
Phải đọc cả row 1 và row 2. Dùng `schema_8A6.json` làm nhãn chuẩn. Không được để các tiêu đề `Xã/Phường`, `Tỉnh/Tp`, `Khu dân cư` bị mất ngữ cảnh.

Ví dụ phải hiển thị:
- Chỗ ở hiện nay - Xã/Phường
- Hộ khẩu thường trú - Xã/Phường
- Nơi sinh - Tỉnh/Tp
- Quê quán - Tỉnh/Tp
- Nơi khai sinh - Tỉnh/Tp

## F. API BACKEND
Tạo tối thiểu:
- `GET /api/health` – kiểm tra server và khả năng đọc Drive, không trả dữ liệu học sinh.
- `GET /api/search?q=...` – chỉ trả danh sách kết quả ngắn: id nội bộ tạm thời/STT, họ tên, ngày sinh.
- `GET /api/student/:stt` – trả hồ sơ đầy đủ đúng một học sinh.

Không tạo endpoint `GET /api/students` trả toàn bộ lớp.

Cache file XLSX trên server 1–5 phút để giảm tải Drive. Dựa trên modifiedTime/ETag nếu thuận tiện. Khi cache hết hạn, tải lại file mới.

## G. BẢO MẬT
Dữ liệu có PII nhạy cảm. Bắt buộc:
- Google Sign-In hoặc cơ chế xác thực tương đương.
- Chỉ email trong `ALLOWED_EMAILS` hoặc domain trong `ALLOWED_DOMAIN` được phép dùng.
- Mọi API search/detail phải kiểm tra session server-side.
- Rate limit theo user/IP.
- Không log full query nếu query có thể là căn cước/điện thoại.
- Không đưa file XLSX thô xuống client.
- Không đặt Drive credential trong JS frontend.
- Không dùng Gemini để parse hoặc lọc dữ liệu.

## H. GIAO DIỆN
- Font Tahoma.
- Nền xanh dịu.
- Responsive.
- Tiêu đề căn giữa.
- Giao diện chatbot tối giản.
- Câu chào: `Xin chào! Hãy nhập số thứ tự hoặc một cụm từ trong họ tên học sinh để tra cứu.`
- Ô nhập placeholder: `Ví dụ: 12 hoặc Nguyễn Bảo`
- Nút: `TRA CỨU`
- Có trạng thái: đang tìm / tìm thấy / nhiều kết quả / không tìm thấy / lỗi nguồn.

## I. HIỂN THỊ HỒ SƠ
Chia 49 trường thành các nhóm dễ đọc:
1. Thông tin cơ bản
2. Chỗ ở hiện nay
3. Hộ khẩu thường trú
4. Nơi sinh – quê quán – nơi khai sinh
5. Căn cước
6. Dân tộc – tôn giáo – chính sách
7. Thông tin cha mẹ
8. Liên hệ
9. Khuyết tật – nội trú/bán trú – ghi chú

Trường trống hiển thị `—`.

## J. KIỂM THỬ BẮT BUỘC
Tạo unit/integration tests cho:
- STT 1 trả đúng 1 kết quả.
- STT không tồn tại trả 0.
- Tìm tên có dấu.
- Tìm tên không dấu.
- Tìm cụm tên cho nhiều kết quả.
- Không cho người chưa đăng nhập gọi API.
- Không có endpoint trả toàn bộ 43 học sinh.
- Không có credential trong client bundle.
- Parse đủ 49 cột và giữ chính xác chuỗi số có số 0 đầu.

## K. KHÔNG DÙNG GEMINI API
Đây là công cụ tra cứu deterministic, không cần Gemini API key. Nếu tạo chatbot UI, chỉ dùng giao diện hội thoại; logic vẫn là code backend.

Sau khi hoàn thành, chạy test, sửa mọi lỗi, rồi báo rõ:
- health endpoint OK/FAIL
- Drive download OK/FAIL
- parser 49 cột OK/FAIL
- search STT OK/FAIL
- search tên không dấu OK/FAIL
- authentication OK/FAIL
