# Triển khai Cloudflare R2 cho LARMX

Frontend không chứa khóa R2. API trong `server/r2-server.mjs` tạo URL upload có hiệu lực 15 phút, sau đó trình duyệt tải file thẳng lên R2.

## 1. Chạy SQL Supabase

Chạy lại toàn bộ `supabase/larmx_music_setup.sql` trong Supabase SQL Editor để thêm:

- `audio_provider`
- `cover_provider`
- `cover_storage_path`

## 2. Cài API trên VPS

Từ PowerShell tại thư mục dự án:

```powershell
ssh minecraft@IP_VPS "mkdir -p /home/minecraft/larmx-api/server"
scp server/r2-server.mjs minecraft@IP_VPS:/home/minecraft/larmx-api/server/r2-server.mjs
```

Trên VPS:

```bash
cd /home/minecraft/larmx-api/server
nano .env
```

Nội dung `.env`:

```env
R2_ACCOUNT_ID=ACCOUNT_ID_CUA_BAN
R2_ACCESS_KEY_ID=ACCESS_KEY_ID_CUA_BAN
R2_SECRET_ACCESS_KEY=SECRET_ACCESS_KEY_CUA_BAN
R2_BUCKET=larmx-media
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
R2_ADMIN_TOKEN=TAO_MOT_MA_DAI_NGAU_NHIEN
R2_API_PORT=8787
```

Tạo mã quản trị ngẫu nhiên bằng:

```bash
openssl rand -hex 32
```

Giữ mã này để nhập trong `Studio Admin > Lưu trữ`. Không đưa file `.env` lên GitHub.

## 3. Chạy API bằng PM2

```bash
sudo npm install -g pm2
pm2 start /home/minecraft/larmx-api/server/r2-server.mjs --name larmx-storage
pm2 save
pm2 startup
```

Chạy lệnh cuối cùng mà `pm2 startup` in ra, rồi `pm2 save` lại một lần nữa.

Kiểm tra:

```bash
curl http://127.0.0.1:8787/api/storage/status
```

Kết quả đúng có `"configured":true`.

## 4. Nginx

Thêm block sau vào `server { ... }` đang phục vụ website:

```nginx
location /api/storage/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 220m;
    proxy_request_buffering off;
}
```

Sau đó:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl http://127.0.0.1/api/storage/status
```

## 5. CORS của R2

Bucket `larmx-media` cần cho phép domain thật và localhost gửi `PUT`, đồng thời cho phép `GET` và `HEAD`:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://IP_VPS",
      "https://TEN_MIEN"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 6. Sử dụng trong Studio

1. Mở `Studio Admin > Lưu trữ`.
2. Nhập giá trị `R2_ADMIN_TOKEN` vào ô mã quản trị.
3. Bấm **Lưu trong phiên**.
4. Bấm **Kiểm tra kết nối**.
5. Chọn `Tự động`, `Supabase Storage` hoặc `Cloudflare R2`.
6. Sang **Thêm bài** và upload bình thường.

`Tự động` thử Supabase trước. Nếu Supabase từ chối upload, Studio thử lại bằng R2. Lựa chọn nguồn chỉ tác động tới file mới; metadata vẫn được ghi vào Supabase và Realtime vẫn hoạt động.
