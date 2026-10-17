const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logActivity } = require('../utils/activity');

// ---- Giới hạn số lần đăng nhập sai theo IP (in-memory, đủ dùng cho 1 instance) ----
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map();

const isLimited = (ip) => {
  const r = attempts.get(ip);
  if (!r) return false;
  if (Date.now() > r.reset) {
    attempts.delete(ip);
    return false;
  }
  return r.count >= MAX_ATTEMPTS;
};
const addFail = (ip) => {
  const r = attempts.get(ip);
  if (!r || Date.now() > r.reset) attempts.set(ip, { count: 1, reset: Date.now() + WINDOW_MS });
  else r.count += 1;
};

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

const sendAuth = (res, user, token) => {
  const exp = jwt.decode(token).exp * 1000;
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.max(exp - Date.now(), 0),
  });
};

const readCredentials = (req) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) return null;
  return { email: email.trim().toLowerCase(), password };
};

// POST /api/auth/login  — đăng nhập trang quản trị (chỉ admin)
exports.login = async (req, res) => {
  const cred = readCredentials(req);
  if (!cred) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
  if (isLimited(req.ip)) {
    return res.status(429).json({ message: 'Bạn đã thử quá nhiều lần. Vui lòng quay lại sau 15 phút' });
  }

  const user = await User.findOne({ email: cred.email }).select('+passwordHash');
  const ok = user && (await user.comparePassword(cred.password));
  if (!ok) {
    addFail(req.ip);
    return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
  }
  if (user.role !== 'admin') return res.status(403).json({ message: 'Tài khoản này không có quyền truy cập trang quản trị' });
  if (user.status === 'blocked') return res.status(403).json({ message: 'Tài khoản đã bị khóa' });

  attempts.delete(req.ip);
  user.lastLogin = new Date();
  await user.save();
  const token = signToken(user);
  sendAuth(res, user, token);
  await logActivity('login', `Quản trị viên ${user.name} đã đăng nhập`, user);

  res.json({ message: 'Đăng nhập thành công', redirect: '/dashboard', user: { id: user._id, name: user.name, email: user.email } });
};

// POST /api/auth/student-login — endpoint cho ứng dụng Smart Campus (mobile) của sinh viên.
// Trả về token trong JSON và ghi nhận lượt đăng nhập để hiển thị lên biểu đồ.
exports.studentLogin = async (req, res) => {
  const cred = readCredentials(req);
  if (!cred) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
  if (isLimited(req.ip)) return res.status(429).json({ message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau' });

  const user = await User.findOne({ email: cred.email, role: { $ne: 'admin' } }).select('+passwordHash');
  const ok = user && (await user.comparePassword(cred.password));
  if (!ok) {
    addFail(req.ip);
    return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
  }
  if (user.status === 'blocked') return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ nhà trường' });

  attempts.delete(req.ip);
  user.lastLogin = new Date();
  await user.save();
  await logActivity('login', `Sinh viên ${user.name} đã đăng nhập ứng dụng`, user);

  res.json({
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email, studentId: user.studentId, className: user.className, faculty: user.faculty },
  });
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Đã đăng xuất' });
};

// GET /api/auth/me
exports.me = (req, res) => {
  const u = req.user;
  res.json({ user: { id: u._id, name: u.name, email: u.email, role: u.role } });
};
