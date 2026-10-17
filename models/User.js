const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Vui lòng nhập họ tên'], trim: true, maxlength: [100, 'Họ tên tối đa 100 ký tự'] },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    // Tên trường trùng với app sinh viên (passwordHash). Gán mật khẩu thường vào đây, pre('save') sẽ tự băm.
    passwordHash: { type: String, required: true, minlength: [6, 'Mật khẩu tối thiểu 6 ký tự'], select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    studentId: { type: String, trim: true, unique: true, sparse: true },
    className: { type: String, trim: true, default: '' },
    faculty: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    lastLogin: { type: Date },
    lastSeen: { type: Date },
  },
  { timestamps: true, autoIndex: false }
);

userSchema.index({ role: 1, createdAt: -1 });

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
