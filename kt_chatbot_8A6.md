# KIẾN THỨC CHATBOT TRA CỨU HỌC SINH 8A6

## 1. Mục tiêu
Chatbot dùng cho người được phép tra cứu hồ sơ học sinh lớp 8A6. Chatbot chỉ có hai kiểu tìm kiếm:

1. **Tìm theo STT** ở cột A.
2. **Tìm theo họ tên hoặc một cụm từ trong họ tên** ở cột F `Họ và tên`.

Khi xác định được học sinh, hệ thống hiển thị **toàn bộ thông tin của đúng dòng học sinh đó theo 49 tiêu đề A:AW**.

## 2. Nguồn dữ liệu
- File: `danh_sach_hoc_sinh_8A6.xlsx`
- Google Drive File ID: `1tf8_63WhGruWIXEvGJDq8qMZK7Iq5c7v`
- Sheet dữ liệu chính: `ds học sinh`
- Dòng tiêu đề cấp 1: dòng 1
- Dòng tiêu đề cấp 2: dòng 2
- Dữ liệu học sinh bắt đầu: dòng 3
- Số học sinh hiện có trong file kiểm tra: **43**
- Số cột: **49 (A:AW)**

## 3. Luật tìm kiếm
### 3.1. STT
Nếu người dùng nhập chuỗi chỉ gồm chữ số và có tối đa 3 chữ số, ưu tiên coi đó là STT.
- So khớp chính xác cột A.
- Ví dụ: `1`, `12`, `43`.
- Không dùng tìm gần đúng cho STT.

### 3.2. Họ tên
Nếu truy vấn không phải STT hợp lệ, tìm trong cột F `Họ và tên`.
- Không phân biệt chữ hoa/thường.
- Bỏ khoảng trắng thừa.
- Hỗ trợ tìm tiếng Việt không dấu.
- Tìm theo cụm từ chứa trong họ tên.
- Ví dụ: `bảo anh`, `Nguyễn`, `gia bảo`, `thuy an`.

### 3.3. Nhiều kết quả
Nếu có nhiều học sinh trùng cụm tên, chỉ hiển thị danh sách ngắn gồm:
- STT
- Họ và tên
- Ngày sinh

Người dùng chọn một kết quả rồi mới hiển thị hồ sơ đầy đủ.

### 3.4. Không có kết quả
Trả lời: `Không tìm thấy học sinh phù hợp. Hãy kiểm tra lại STT hoặc cụm họ tên.`

## 4. Quy tắc ghép tiêu đề
File có 2 dòng tiêu đề. Backend phải ghép hai dòng thành nhãn rõ nghĩa. Các nhóm địa chỉ cần giữ ngữ cảnh, ví dụ:
- `Chỗ ở hiện nay - SN/Xóm`
- `Chỗ ở hiện nay - Khu dân cư`
- `Chỗ ở hiện nay - Xã/Phường`
- `Chỗ ở hiện nay - Tỉnh/Tp`
- `Hộ khẩu thường trú - SN/Xóm`
- `Nơi sinh - Thông tin nơi sinh`
- `Quê quán - Xã/Phường`
- `Nơi khai sinh - Tỉnh/Tp`

Danh sách đầy đủ nằm trong `schema_8A6.json`.

## 5. Cách hiển thị hồ sơ
Sau khi xác định đúng học sinh, hiển thị toàn bộ 49 trường theo đúng thứ tự A:AW.
- Trường trống hiển thị `—`.
- Ngày giữ định dạng `dd/mm/yyyy`.
- Không đổi mã học sinh, mã MOET, căn cước, điện thoại thành số khoa học.
- Giữ số 0 ở đầu nếu có.

## 6. Bảo mật bắt buộc
Dữ liệu có căn cước, địa chỉ, điện thoại và thông tin cha mẹ. Vì vậy:
- App phải yêu cầu đăng nhập.
- Chỉ tài khoản được phép mới có quyền tra cứu.
- Không có API trả toàn bộ danh sách học sinh.
- Không cho tải toàn bộ workbook qua frontend.
- Không log căn cước, điện thoại, địa chỉ đầy đủ.
- Không cho dò hàng loạt hoặc enumerate toàn bộ STT bằng API không giới hạn.
- Thêm rate limit và audit log tối thiểu.
- Backend mới được tải file từ Google Drive.

## 7. Nguyên tắc dữ liệu
- Nguồn sự thật duy nhất là file Excel trên Google Drive.
- Không dùng Gemini để đoán hoặc sửa dữ liệu.
- Không gửi toàn bộ file học sinh sang mô hình AI.
- Logic lọc phải deterministic bằng code.
