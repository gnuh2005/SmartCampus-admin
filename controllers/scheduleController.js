const Schedule = require('../models/Schedule');
const { logActivity } = require('../utils/activity');

const DAY_NAMES = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy', 8: 'Chủ Nhật' };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const pick = (b) => ({
  subject: str(b.subject),
  code: str(b.code),
  className: str(b.className),
  lecturer: str(b.lecturer),
  room: str(b.room),
  dayOfWeek: Number(b.dayOfWeek),
  startTime: str(b.startTime),
  endTime: str(b.endTime),
  note: str(b.note),
});

// GET /api/schedules?search=&className=&day=
exports.list = async (req, res) => {
  const q = {};
  const search = str(req.query.search);
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    q.$or = [{ subject: rx }, { code: rx }, { lecturer: rx }, { room: rx }];
  }
  if (str(req.query.className)) q.className = str(req.query.className);
  const day = parseInt(req.query.day, 10);
  if (day >= 2 && day <= 8) q.dayOfWeek = day;

  const [schedules, classes] = await Promise.all([
    Schedule.find(q).sort({ dayOfWeek: 1, startTime: 1 }).limit(1000).lean(),
    Schedule.distinct('className'),
  ]);
  res.json({ schedules, classes: classes.filter(Boolean).sort() });
};

// POST /api/schedules
exports.create = async (req, res) => {
  const schedule = await Schedule.create({ ...pick(req.body || {}), createdBy: req.user._id });
  await logActivity('schedule', `Đã tạo lịch học ${schedule.subject} (${schedule.className}) - ${DAY_NAMES[schedule.dayOfWeek]}`, req.user);
  res.status(201).json({ message: 'Đã tạo lịch học', schedule });
};

// PUT /api/schedules/:id
exports.update = async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule) return res.status(404).json({ message: 'Không tìm thấy lịch học' });

  schedule.set(pick(req.body || {}));
  await schedule.save();
  await logActivity('schedule', `Đã cập nhật lịch học ${schedule.subject} (${schedule.className})`, req.user);
  res.json({ message: 'Đã cập nhật lịch học', schedule });
};

// DELETE /api/schedules/:id
exports.remove = async (req, res) => {
  const schedule = await Schedule.findByIdAndDelete(req.params.id);
  if (!schedule) return res.status(404).json({ message: 'Không tìm thấy lịch học' });
  await logActivity('schedule', `Đã xóa lịch học ${schedule.subject} (${schedule.className})`, req.user);
  res.json({ message: 'Đã xóa lịch học' });
};
