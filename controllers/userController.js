const User = require('../models/User');
const { logActivity } = require('../utils/activity');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v) => (typeof v === 'string' ? v.trim() : '');

// GET /api/users?search=&className=&faculty=&status=&page=&limit=
exports.list = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  const q = { role: { $ne: 'admin' } };
  const search = str(req.query.search);
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    q.$or = [{ name: rx }, { email: rx }, { studentId: rx }];
  }
  if (str(req.query.className)) q.className = str(req.query.className);
  if (str(req.query.faculty)) q.faculty = str(req.query.faculty);
  if (req.query.status === 'blocked') q.status = 'blocked';
  else if (req.query.status === 'active') q.status = { $ne: 'blocked' }; // user cũ chưa có trường status vẫn tính là hoạt động

  const total = await User.countDocuments(q);
  const pages = Math.max(Math.ceil(total / limit), 1);
  const current = Math.min(page, pages);

  const [users, classes, faculties, active, blocked] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip((current - 1) * limit).limit(limit).lean(),
    User.distinct('className', { role: { $ne: 'admin' } }),
    User.distinct('faculty', { role: { $ne: 'admin' } }),
    User.countDocuments({ role: { $ne: 'admin' }, status: { $ne: 'blocked' } }),
    User.countDocuments({ role: { $ne: 'admin' }, status: 'blocked' }),
  ]);

  res.json({
    users,
    total,
    page: current,
    pages,
    limit,
    counts: { active, blocked },
    filters: { classes: classes.filter(Boolean).sort(), faculties: faculties.filter(Boolean).sort() },
  });
};

// POST /api/users
exports.create = async (req, res) => {
  const b = req.body || {};
  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < 6) return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự' });

  // Kiểm tra trùng ở tầng ứng dụng (collection dùng chung với app sinh viên nên không tự tạo index)
  const email = str(b.email).toLowerCase();
  const sid = str(b.studentId);
  if (email && (await User.exists({ email }))) return res.status(409).json({ message: 'Email đã tồn tại' });
  if (sid && (await User.exists({ studentId: sid }))) return res.status(409).json({ message: 'Mã sinh viên đã tồn tại' });

  const user = await User.create({
    name: str(b.name),
    email,
    passwordHash: password,
    role: 'student',
    studentId: str(b.studentId) || undefined,
    className: str(b.className),
    faculty: str(b.faculty),
    phone: str(b.phone),
  });

  await logActivity('user', `Đã thêm sinh viên ${user.name}`, req.user);
  const out = user.toObject();
  delete out.passwordHash;
  res.status(201).json({ message: 'Đã thêm sinh viên', user: out });
};

// PATCH /api/users/:id/toggle-status   (body: { status?: 'active' | 'blocked' })
exports.toggleStatus = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: { $ne: 'admin' } });
  if (!user) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });

  const wanted = req.body && req.body.status;
  user.status = ['active', 'blocked'].includes(wanted) ? wanted : user.status === 'active' ? 'blocked' : 'active';
  await user.save();

  await logActivity('user', `Đã ${user.status === 'blocked' ? 'khóa' : 'mở khóa'} tài khoản ${user.name}`, req.user);
  res.json({ message: 'Đã cập nhật trạng thái', user: { _id: user._id, name: user.name, status: user.status } });
};

// PATCH /api/users/:id/reset-password   (body: { password })
exports.resetPassword = async (req, res) => {
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (password.length < 6) return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự' });

  const user = await User.findOne({ _id: req.params.id, role: { $ne: 'admin' } }).select('+passwordHash');
  if (!user) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });

  user.passwordHash = password; // được băm tự động trong pre('save')
  await user.save();

  await logActivity('user', `Đã đặt lại mật khẩu cho ${user.name}`, req.user);
  res.json({ message: 'Đã đặt lại mật khẩu' });
};

// DELETE /api/users/:id
exports.remove = async (req, res) => {
  const user = await User.findOneAndDelete({ _id: req.params.id, role: { $ne: 'admin' } });
  if (!user) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });

  await logActivity('user', `Đã xóa sinh viên ${user.name}`, req.user);
  res.json({ message: 'Đã xóa sinh viên' });
};
