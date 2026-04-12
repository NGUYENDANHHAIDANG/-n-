# ChatApp - Technology Stack Documentation

Ứng dụng ChatApp này được xây dựng dựa trên một bộ công nghệ hiện đại (Fullstack MERN kết hợp với Vite và TypeScript). Dưới đây là chi tiết các công nghệ đã được sử dụng:

## 1. Frontend (Giao diện người dùng)
*   **React (v19):** Thư viện JavaScript cốt lõi để xây dựng giao diện người dùng tương tác.
*   **Vite:** Công cụ build (trình đóng gói) và dev server thế hệ mới, giúp ứng dụng khởi động và cập nhật cực kỳ nhanh.
*   **Tailwind CSS:** Framework CSS tiện ích (utility-first) được sử dụng để thiết kế toàn bộ giao diện (màu sắc, bố cục, bo góc, hiệu ứng hover...) mà không cần viết các file CSS rời rạc.
*   **React Router DOM:** Quản lý điều hướng (routing) chuyển trang giữa Đăng nhập, Đăng ký và trang Chat chính.

## 2. Backend (Máy chủ & API)
*   **Node.js & Express.js:** Xây dựng máy chủ web và các API RESTful để xử lý logic nghiệp vụ (đăng ký, đăng nhập, gửi tin nhắn, lấy lịch sử chat).

## 3. Database (Cơ sở dữ liệu)
*   **MongoDB & Mongoose:** Cơ sở dữ liệu NoSQL linh hoạt dùng để lưu trữ thông tin người dùng, lịch sử tin nhắn, và các nhóm chat.
*   **MongoDB Memory Server:** Ứng dụng được tích hợp sẵn một database chạy trực tiếp trên RAM (in-memory). Nếu chưa kết nối với MongoDB thật (thông qua biến môi trường `MONGO_URI`), hệ thống sẽ dùng database tạm thời này để có thể test ứng dụng ngay lập tức mà không bị lỗi.

## 4. Ngôn ngữ lập trình
*   **TypeScript:** Được sử dụng xuyên suốt từ Frontend đến Backend. TypeScript giúp định nghĩa kiểu dữ liệu chặt chẽ (ví dụ: cấu trúc của một `User` hay một `Message`), giúp code an toàn, ít lỗi (bug) và dễ bảo trì hơn rất nhiều so với JavaScript thuần.

## 5. Các công nghệ & Thư viện tích hợp khác
*   **Nodemailer:** Thư viện dùng để kết nối với máy chủ SMTP (như Gmail) để gửi email thật (ví dụ: tính năng gửi mã OTP xác thực khi đăng ký tài khoản).
*   **Google Gemini API (`@google/genai`):** SDK của Google được tích hợp sẵn để hỗ trợ các tính năng trí tuệ nhân tạo (AI), ví dụ như tạo các Bot chat tự động trả lời thông minh trong ứng dụng.
