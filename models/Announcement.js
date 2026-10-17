const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Vui lòng nhập tiêu đề'], trim: true, minlength: [5, 'Tiêu đề tối thiểu 5 ký tự'], maxlength: [200, 'Tiêu đề tối đa 200 ký tự'] },
    content: { type: String, required: [true, 'Vui lòng nhập nội dung'], maxlength: [20000, 'Nội dung quá dài'] },
    category: { type: String, enum: ['general', 'academic', 'event', 'urgent'], default: 'general' },
    pinned: { type: Boolean, default: false },
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'Ban quản trị' },
  },
  { timestamps: true }
);

announcementSchema.index({ pinned: -1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
