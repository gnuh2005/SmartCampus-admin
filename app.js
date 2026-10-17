require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const User = require('./models/User');
const { authPage, redirectIfAuthed } = require('./middleware/authMiddleware');
const { notFound, errorHandler } = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET) {
  console.error('✖ Thiếu biến môi trường JWT_SECRET. Hãy tạo file .env từ .env.example');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API ----------
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));

// ---------- Trang giao diện ----------
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', redirectIfAuthed, (req, res) => res.set('Cache-Control', 'no-store').render('login'));
app.get('/dashboard', authPage, (req, res) => res.render('dashboard'));
app.get('/users', authPage, (req, res) => res.render('users'));
app.get('/schedules', authPage, (req, res) => res.render('schedules'));
app.get('/announcements', authPage, (req, res) => res.render('announcements'));

app.use(notFound);
app.use(errorHandler);

// Tạo tài khoản admin mặc định ở lần chạy đầu tiên
async function ensureAdmin() {
  if (await User.exists({ role: 'admin' })) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@smartcampus.edu.vn').toLowerCase();
  await User.create({
    name: process.env.ADMIN_NAME || 'Super Admin',
    email,
    passwordHash: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'admin',
  });
  console.log(`✔ Đã tạo tài khoản admin mặc định: ${email}`);
}

const PORT = process.env.PORT || 3001;

(async () => {
  await connectDB();
  await ensureAdmin();
  app.listen(PORT, () => console.log(`🚀 Smart Campus Admin chạy tại http://localhost:${PORT}`));
})();

module.exports = app;
