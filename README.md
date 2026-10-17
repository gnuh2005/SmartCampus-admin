# Smart Campus Admin

Web Admin Dashboard quản lý ứng dụng **Smart Campus** — Node.js · Express · MongoDB Atlas (Mongoose) · EJS · Tailwind CSS.

Giao diện: Glassmorphism, Dark/Light mode, Bento Grid, biểu đồ Chart.js, Toast (SweetAlert2), icon Lucide, hiệu ứng shimmer/hover/modal trượt.

---

## 1. Yêu cầu

- **Node.js 18+** (kiểm tra bằng `node -v`)
- Tài khoản **MongoDB Atlas** (miễn phí, gói M0)
- Trình duyệt có Internet (Tailwind, Chart.js, SweetAlert2, Lucide, Google Fonts được nạp qua CDN)

## 2. Cấu hình MongoDB Atlas

1. Vào <https://cloud.mongodb.com> → đăng ký / đăng nhập → **Create** một cluster (chọn gói **M0 Free**).
2. **Database Access** → *Add New Database User* → đặt username và password (nên dùng mật khẩu chỉ gồm chữ + số, hoặc mã hóa URL các ký tự đặc biệt như `@`, `:`, `/`, `#`). Quyền: *Read and write to any database*.
3. **Network Access** → *Add IP Address*:
   - Khi phát triển: bấm *Add Current IP Address*.
   - (Chỉ để thử nhanh) `0.0.0.0/0` cho phép mọi IP — **không** nên dùng khi chạy thật.
4. **Database** → *Connect* → *Drivers* → copy chuỗi kết nối, dạng:

   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

5. Chèn tên database ngay trước dấu `?`. **Tên này phải trùng với database mà app sinh viên đang dùng** (nếu app không chỉ định thì MongoDB mặc định là `test`):

   ```
   mongodb+srv://myuser:mypass123@cluster0.abcde.mongodb.net/test?retryWrites=true&w=majority
   ```

   Admin đọc cùng collection `users` với app sinh viên (trường mật khẩu là `passwordHash`; user chưa có `role` được xem là sinh viên, chưa có `status` được xem là đang hoạt động).

## 3. Cài đặt & chạy

```bash
cd smartcampus-admin
npm install

# Tạo file cấu hình từ mẫu
cp .env.example .env          # Windows (cmd): copy .env.example .env
```

Mở file `.env` và sửa:

| Biến | Ý nghĩa |
|---|---|
| `MONGODB_URI` | Chuỗi kết nối Atlas ở bước 2 |
| `JWT_SECRET` | Chuỗi bí mật dài, ngẫu nhiên. Tạo nhanh: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Thời hạn đăng nhập (mặc định `1d`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Tài khoản admin tự tạo ở lần chạy đầu tiên (nếu chưa có admin) |
| `PORT` | Cổng server (mặc định `3001`) |


```

Chạy server:

```bash
npm start        # chạy thường
npm run dev      # tự khởi động lại khi sửa code (Node 18.11+)
```

Mở <http://localhost:3001> và đăng nhập bằng tài khoản trong `.env`
(mặc định `admin@smartcampus.edu.vn` / `Admin@123`). **Hãy đổi mật khẩu mặc định trước khi triển khai thật.**

Sinh viên mẫu do seed tạo có mật khẩu `Student@123`.

## 4. Cấu trúc thư mục

```
smartcampus-admin/
├── config/db.js                  Kết nối MongoDB Atlas
├── models/                       User, Schedule, Announcement, ActivityLog
├── controllers/                  auth, user, schedule, announcement, dashboard
├── middleware/                   authMiddleware (JWT), errorHandler
├── routes/                       Các route API
├── utils/activity.js             Ghi nhật ký hoạt động
├── views/
│   ├── partials/                 head, sidebar, navbar, footer
│   ├── login.ejs · dashboard.ejs · users.ejs · schedules.ejs · announcements.ejs · 404.ejs
├── public/
│   ├── css/style.css             Design tokens, glassmorphism, switch, modal, shimmer...
│   └── js/main.js                Dark mode, sidebar, toast, API helper, tiện ích dùng chung
├── seed.js                       Dữ liệu mẫu
├── app.js                        Điểm khởi chạy
└── .env.example
```

## 5. API chính

Tất cả `/api/*` (trừ đăng nhập) yêu cầu cookie JWT của admin.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | Đăng nhập / đăng xuất trang quản trị |
| POST | `/api/auth/student-login` | Đăng nhập cho app sinh viên (trả JWT, ghi nhận lượt đăng nhập lên biểu đồ; tài khoản bị khóa sẽ bị từ chối) |
| GET | `/api/dashboard/stats` | KPI, biểu đồ, hoạt động gần đây |
| GET / POST | `/api/users` | Danh sách (lọc: `search`, `faculty`, `className`, `status`, `page`) / thêm sinh viên |
| PATCH | `/api/users/:id/toggle-status` | Khóa / mở khóa |
| PATCH | `/api/users/:id/reset-password` | Đặt lại mật khẩu |
| DELETE | `/api/users/:id` | Xóa sinh viên |
| GET / POST / PUT / DELETE | `/api/schedules[/:id]` | Quản lý lịch học |
| GET / POST / PUT / PATCH / DELETE | `/api/announcements[/:id][/pin]` | Quản lý bảng tin |

## 6. Ghi chú bảo mật & triển khai

- Mật khẩu được băm bằng **bcryptjs**; JWT lưu trong cookie `httpOnly`, `sameSite=lax`, và `secure` khi `NODE_ENV=production` (cần chạy sau HTTPS).
- Đăng nhập sai quá 8 lần / 15 phút theo IP sẽ bị tạm chặn (bộ đếm lưu trong bộ nhớ, đủ cho 1 instance; nếu chạy nhiều instance hãy dùng Redis).
- Nội dung bài viết được làm sạch ở server — chỉ giữ các thẻ định dạng cơ bản, loại bỏ mọi thuộc tính và script.
- Khi triển khai thật: đặt `NODE_ENV=production`, dùng `JWT_SECRET` mạnh, giới hạn IP trong Atlas, đổi mật khẩu admin, và cân nhắc build Tailwind bằng CLI thay cho bản CDN (CDN chỉ phù hợp phát triển / demo).

## 7. Xử lý sự cố

- **`MongooseServerSelectionError`**: IP của bạn chưa được thêm vào *Network Access*, hoặc sai username / password trong `MONGODB_URI`.
- **`bad auth`**: mật khẩu có ký tự đặc biệt chưa được mã hóa URL (ví dụ `@` → `%40`).
- **Giao diện mất style / biểu đồ không hiện**: máy không truy cập được CDN (kiểm tra Internet / tường lửa).
- **Quên mật khẩu admin**: xóa user admin trong collection `users` rồi khởi động lại server — tài khoản mới sẽ được tạo từ `.env`.
