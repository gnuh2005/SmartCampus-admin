const ActivityLog = require('../models/ActivityLog');

// Ghi nhật ký hoạt động. Không bao giờ làm hỏng request chính nếu ghi log lỗi.
exports.logActivity = async (type, message, actor) => {
  try {
    await ActivityLog.create({
      type,
      message,
      actor: actor ? actor._id : undefined,
      actorName: actor && actor.name ? actor.name : 'Hệ thống',
    });
  } catch (err) {
    console.error('Không ghi được activity log:', err.message);
  }
};
