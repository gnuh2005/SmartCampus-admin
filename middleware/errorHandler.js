exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.notFound = (req, res) => {
  if (req.originalUrl.startsWith('/api')) return res.status(404).json({ message: 'Không tìm thấy API' });
  return res.status(404).render('404');
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = 'Lỗi máy chủ, vui lòng thử lại sau';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0].message;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field === 'studentId' ? 'Mã sinh viên đã tồn tại' : field === 'email' ? 'Email đã tồn tại' : 'Dữ liệu bị trùng lặp';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Dữ liệu không hợp lệ';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Dữ liệu gửi lên không đúng định dạng JSON';
  } else {
    console.error(err);
  }

  if (req.originalUrl.startsWith('/api')) return res.status(status).json({ message });
  return res.status(status).send(message);
};
