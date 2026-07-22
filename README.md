# LARMX Music

Ứng dụng nghe nhạc React theo phong cách Liquid Glass / Glassmorphism, xây dựng bằng Vite, TypeScript, Tailwind CSS, Framer Motion và Lucide React.

## Chạy dự án

```bash
npm install
npm run dev
```

Trên Windows, có thể nhấp đúp `Start-LARMX-Music.bat`. Launcher này dùng cache Vite tạm riêng cho mỗi lần chạy để tránh lỗi khóa file `EPERM`.

Mở địa chỉ Vite hiển thị trong terminal (thường là `http://localhost:5173`).

## Build production

```bash
npm run build
npm run preview
```

## Kết nối YouTube Data API

1. Bật YouTube Data API v3 trong Google Cloud Console và tạo API key.
2. Sao chép `.env.example` thành `.env`.
3. Điền `VITE_YOUTUBE_API_KEY` rồi khởi động lại dev server.

Tab **Khám phá** dùng YouTube Data API để tìm video công khai có thể nhúng và phát bằng YouTube IFrame Player chính thức. Không đưa file `.env` lên Git.

## Cloudflare R2 dự phòng

Studio Admin hỗ trợ chọn `Tự động / Supabase / Cloudflare R2` cho file MP3 và ảnh bìa. Xem hướng dẫn triển khai API bảo mật tại [`deploy/R2-SETUP.md`](deploy/R2-SETUP.md). Khóa R2 chỉ được đặt trong `server/.env` trên VPS, không dùng biến `VITE_`.

## Đăng nhập Google

Tạo OAuth 2.0 Web Client ID trong Google Cloud Console, thêm `http://localhost:5173` và `http://127.0.0.1:5173` vào Authorized JavaScript origins, sau đó thêm `VITE_GOOGLE_CLIENT_ID` vào `.env`. Tài khoản email local chỉ dành cho demo frontend; ứng dụng production cần backend để xác thực và quản lý phiên an toàn.

## Tính năng

- HTML5 Audio player: play/pause, previous/next, seek, volume, mute, shuffle và repeat.
- Tìm kiếm theo bài hát, nghệ sĩ, album; lọc theo thể loại.
- Favorite, âm lượng, bài gần nhất và lịch sử nghe được lưu bằng `localStorage`.
- Giao diện desktop ba cột, mobile drawer, mini-player và navigation riêng.
- Fullscreen player, queue, lyrics giả lập, toast và motion có hỗ trợ reduced-motion.

Audio demo được stream từ SoundHelix; một số ảnh phụ dùng URL Unsplash nên cần kết nối mạng. Artwork `Liquid Soul` đã được tối ưu WebP và nằm local tại `public/assets/liquid-soul.webp`.
