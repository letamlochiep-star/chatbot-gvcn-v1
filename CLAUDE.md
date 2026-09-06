# CLAUDE.md — Edu Quiz

Nền tảng tạo quiz + trò chơi học tập tích hợp AI (Gemini). Dự án mẫu của khoá học "Tạo website bằng AI".

> File này mô tả dự án ĐANG như thế nào, để bạn (AI) khỏi phải dò lại toàn bộ code mỗi phiên.
> Đây là mặc định, KHÔNG phải xiềng: nếu user muốn đổi UI/Auth/nhà cung cấp AI/cấu trúc, cứ làm theo user — chỉ cần báo trước là sẽ lệch khỏi mô tả dưới đây.

## Cách làm việc (luôn áp dụng)
- Trả lời bằng tiếng Việt; giữ nguyên tiếng Anh cho tên biến/hàm/file/lệnh/code.
- Trả lời gọn, đi thẳng việc. Yêu cầu chưa rõ hoặc thiếu thông tin → HỎI LẠI trước, đừng đoán rồi làm sai.
- Việc lớn/mơ hồ: nói ngắn gọn định làm gì rồi mới code, để user kịp chỉnh hướng.
- Sửa xong một việc: chạy `npm run lint` MỘT LẦN trước khi báo xong. Bỏ qua nếu chỉ đổi chữ/màu/comment. Không chạy sau mỗi chỉnh nhỏ.
- KHÔNG tự chạy `npm run build`, git nguy hiểm (reset/xoá/ghi đè), push/deploy — user tự làm.
- Ưu tiên sửa đúng file/màn hình user chỉ ra; chỉ đọc rộng khi thật sự chưa biết lỗi ở đâu.

## Hiện trạng dự án (mặc định — đổi được)
| Thành phần | Đang dùng |
|---|---|
| Framework | React 19 + Vite 6 + TypeScript |
| UI | MUI v9 (`@mui/material`) + Tailwind v4 + emotion |
| Icons / Animation / Charts | `lucide-react`, `@mui/icons-material` / `motion` / `recharts` |
| Backend | Firebase (Auth + Firestore) |
| Auth | Firebase Auth: Email/Password + Google Sign-In |
| AI | `@google/genai` (Gemini), key qua `GEMINI_API_KEY` ở `.env.local` |
| Form | `react-hook-form` + `zod` |
| Routing | `react-router-dom` v7 |

Khi thêm code MỚI mà user không nói khác: bám stack trên cho nhất quán (vd cần UI thì dùng MUI, cần AI thì dùng `@google/genai`). Khi user muốn thêm/đổi công nghệ: làm theo user.

## Cấu trúc & quy ước
```
src/
├── core/      # theme/AppThemeProvider, contexts/AuthContext
├── lib/       # firebase.ts (khởi tạo Firebase: auth, db)
├── services/  # gọi Firestore/Storage (vd classroomService.ts)
├── features/  # module theo tính năng (vd dashboard/components/*)
├── components/# layout dùng chung (MainLayout, Header)
├── guards/    # ProtectedRoute
├── pages/     # trang ghép nối, chia theo role: teacher/, student/
├── App.tsx    # khai báo toàn bộ <Routes>
└── main.tsx
```
- Import 1 chiều: `pages → features/components → core/services/lib`.
- Logic Firestore/AI để trong `services/`, KHÔNG viết trực tiếp trong component (component chỉ gọi service). Đây là quy tắc giúp thêm feature sau này gọn và dễ sửa.
- Đặt tên: `*Service.ts` (gọi backend), component React `PascalCase.tsx`, trang trong `pages/`.

## Thêm một feature/trang mới — checklist
1. Component/trang mới đặt đúng chỗ: trang → `pages/` (theo role nếu có), khối tính năng → `features/{tên}/components/`.
2. Việc gọi Firestore/AI → tách ra hàm trong `services/`, component chỉ gọi hàm đó.
3. Nối route trong `App.tsx`, bọc `<ProtectedRoute allowedRoles={[...]}>` nếu trang cần đăng nhập, thường bọc thêm `<MainLayout />`.
4. Cần UI → dùng MUI cho khớp theme; layout nhanh có thể dùng Tailwind class.
5. Chạy `npm run lint` kiểm tra sạch trước khi báo xong.

## Vài điểm dễ vấp (đọc trước khi sửa vùng liên quan)
- Auth ở `core/contexts/AuthContext.tsx`: `useAuth()` → `{ user, loading, loginWithEmail, registerWithEmail, loginWithGoogle, logout }`. `Role = 'Teacher' | 'Student'`; đăng nhập lần đầu tự tạo `users/{uid}`, Google mặc định role `Student`. Biến module-level `pendingProfile`/`isRegistering` xử lý một race condition — đừng xoá khi dọn code, trừ khi thay hẳn luồng Auth.
- `Grid` MUI v9 dùng `size={{ xs, sm, md }}` (không phải `item`/`xs=` kiểu bản cũ).
- Theme ở `core/theme/AppThemeProvider.tsx`: primary indigo `#4f46e5`, có sẵn dark/light. Thêm component nên theo phong cách này để đồng bộ (không bắt buộc).
- Đừng sửa `vite.config.ts` phần `hmr`/`watch` (do AI Studio điều khiển, sửa gây nhấp nháy khi edit).
- Đừng commit `.env.local` / API key.

## Lệnh
- Kiểm tra type (barrier chính, chưa có test): `npm run lint`.
- Dev: `npm run dev` (port 3000). Build: `npm run build` — chỉ khi user yêu cầu.

## Deploy lên Netlify (kéo thả thư mục `dist/`)
- Học viên deploy bằng cách `npm run build` rồi kéo-thả thư mục `dist/` lên Netlify (KHÔNG qua git).
- **Bắt buộc có `public/_redirects`** với nội dung `/*  /index.html  200`. Vite tự copy file này vào `dist/` khi build. ĐỪNG xoá nó.
- Lý do: đây là SPA (React Router). Không có file này thì F5/mở trực tiếp một route con (vd `/login`) sẽ báo **404 (Page not found)** trên Netlify, vì Netlify tìm file tên `login` không có. Rule `_redirects` bảo Netlify trả `index.html` cho mọi đường dẫn để React Router tự xử lý.
- Nếu user báo "F5 bị 404 trên Netlify" hoặc "vào link con bị Page not found": kiểm tra `public/_redirects` còn không, và nó có nằm trong `dist/` sau khi build không.

## Biến môi trường & lỗi trắng trang
- **Firebase config đang HARDCODE** trong `src/lib/firebase.ts` (không đọc từ env) — nên app luôn chạy được ngay dù chưa có `.env.local`. Nếu app trắng trang, ĐỪNG đi sửa Firebase config trước; xem lỗi thật trong Console trình duyệt (F12) rồi mới chẩn đoán.
  - (Firebase web API key không phải bí mật — bảo mật dựa vào Firestore Rules. Học viên nên tự đổi sang project Firebase của mình khi làm thật, nhưng không bắt buộc để chạy demo.)
- **`.env.local` chỉ cần cho tính năng AI**: biến `GEMINI_API_KEY` (xem `.env.example`). Thiếu nó thì các phần KHÁC vẫn chạy, chỉ màn hình gọi Gemini mới lỗi.
- Nếu user báo "màn hình AI trắng trang / báo lỗi API key": kiểm tra đã tạo file `.env.local` (copy từ `.env.example`) và điền `GEMINI_API_KEY` thật chưa, rồi chạy lại `npm run dev`. Đây là nguyên nhân số 1 khiến người mới tưởng "hỏng app".
- ĐỪNG commit `.env.local` (đã nằm trong `.gitignore`).

## KHÔNG biến app thành PWA / service worker
- Dự án này KHÔNG phải PWA và phải giữ nguyên như vậy. ĐỪNG thêm `vite-plugin-pwa`, `workbox`, `manifest.webmanifest`, hay bất kỳ đoạn `navigator.serviceWorker.register(...)` nào.
- Lý do: service worker cache lại trang cũ → học viên sửa code, build lại, deploy mà trình duyệt vẫn hiện bản cũ, tưởng "sửa không ăn". Người mới rất dễ nản vì lỗi khó hiểu này.
- Nếu user yêu cầu "làm web cài được như app / hoạt động offline / thêm PWA": giải thích ngắn gọn rủi ro cache gây rối cho người mới, hỏi lại có chắc không rồi mới làm — đừng tự động thêm.
- (Firebase SDK có dùng service worker nội bộ cho auth — đó là chuyện khác, không phải PWA, không cần đụng tới.)
