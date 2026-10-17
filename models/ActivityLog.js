const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['login', 'user', 'schedule', 'announcement', 'system'], required: true },
    message: { type: String, required: true, maxlength: 300 },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'Hệ thống' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
