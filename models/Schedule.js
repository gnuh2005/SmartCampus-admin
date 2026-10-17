const mongoose = require('mongoose');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleSchema = new mongoose.Schema(
  {
    subject: { type: String, required: [true, 'Vui lòng nhập tên môn học'], trim: true, maxlength: 120 },
    code: { type: String, trim: true, default: '', maxlength: 30 },
    className: { type: String, required: [true, 'Vui lòng nhập lớp'], trim: true, maxlength: 50 },
    lecturer: { type: String, trim: true, default: '', maxlength: 100 },
    room: { type: String, required: [true, 'Vui lòng nhập phòng học'], trim: true, maxlength: 50 },
    dayOfWeek: { type: Number, required: [true, 'Vui lòng chọn thứ'], min: [2, 'Thứ không hợp lệ'], max: [8, 'Thứ không hợp lệ'] },
    startTime: { type: String, required: [true, 'Vui lòng nhập giờ bắt đầu'], match: [TIME_RE, 'Giờ bắt đầu không hợp lệ (HH:MM)'] },
    endTime: {
      type: String,
      required: [true, 'Vui lòng nhập giờ kết thúc'],
      match: [TIME_RE, 'Giờ kết thúc không hợp lệ (HH:MM)'],
      validate: {
        validator: function (v) {
          return !this.startTime || v > this.startTime;
        },
        message: 'Giờ kết thúc phải sau giờ bắt đầu',
      },
    },
    note: { type: String, trim: true, default: '', maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

scheduleSchema.index({ dayOfWeek: 1, startTime: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
