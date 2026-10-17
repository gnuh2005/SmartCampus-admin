const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Announcement = require('../models/Announcement');
const ActivityLog = require('../models/ActivityLog');

const TZ = 'Asia/Ho_Chi_Minh';
const DAY_MS = 24 * 60 * 60 * 1000;
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

// % tăng trưởng: 30 ngày gần nhất so với 30 ngày trước đó
async function growth(Model, filter = {}) {
  const now = Date.now();
  const d30 = new Date(now - 30 * DAY_MS);
  const d60 = new Date(now - 60 * DAY_MS);
  const [cur, prev] = await Promise.all([
    Model.countDocuments({ ...filter, createdAt: { $gte: d30 } }),
    Model.countDocuments({ ...filter, createdAt: { $gte: d60, $lt: d30 } }),
  ]);
  if (prev) return Math.round(((cur - prev) / prev) * 100);
  return cur > 0 ? 100 : 0;
}

// GET /api/dashboard/stats
exports.stats = async (req, res) => {
  const since = new Date(Date.now() - 8 * DAY_MS);

  const [
    totalStudents,
    blockedStudents,
    totalSchedules,
    totalAnnouncements,
    gStudents,
    gSchedules,
    gAnnouncements,
    loginAgg,
    facultyAgg,
    dayAgg,
    recent,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: { $ne: 'admin' }, status: 'blocked' }),
    Schedule.countDocuments(),
    Announcement.countDocuments(),
    growth(User, { role: { $ne: 'admin' } }),
    growth(Schedule),
    growth(Announcement),
    ActivityLog.aggregate([
      { $match: { type: 'login', createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: { $ifNull: [{ $cond: [{ $eq: ['$faculty', ''] }, null, '$faculty'] }, 'Chưa phân khoa'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Schedule.aggregate([{ $group: { _id: '$dayOfWeek', count: { $sum: 1 } } }]),
    ActivityLog.find().sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  // 7 ngày gần nhất (theo giờ Việt Nam), điền 0 cho ngày không có dữ liệu
  const loginMap = new Map(loginAgg.map((r) => [r._id, r.count]));
  const logins = [];
  for (let i = 6; i >= 0; i--) {
    const key = keyFmt.format(new Date(Date.now() - i * DAY_MS));
    logins.push({ label: `${key.slice(8, 10)}/${key.slice(5, 7)}`, count: loginMap.get(key) || 0 });
  }

  const dayMap = new Map(dayAgg.map((r) => [r._id, r.count]));
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const schedulesByDay = dayLabels.map((label, i) => ({ label, count: dayMap.get(i + 2) || 0 }));

  res.json({
    kpis: {
      totalStudents,
      blockedStudents,
      activeStudents: totalStudents - blockedStudents,
      totalSchedules,
      totalAnnouncements,
      growth: { students: gStudents, schedules: gSchedules, announcements: gAnnouncements },
    },
    logins,
    faculties: facultyAgg.map((r) => ({ label: r._id, count: r.count })),
    schedulesByDay,
    recent,
  });
};
