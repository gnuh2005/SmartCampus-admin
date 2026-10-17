const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

function getToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// mode: 'page' (chuyển hướng về /login) hoặc 'api' (trả JSON 401)
const authenticate = (mode) => async (req, res, next) => {
  const fail = (msg) => {
    if (mode === 'page') {
      res.clearCookie('token');
      return res.redirect('/login');
    }
    return res.status(401).json({ message: msg });
  };

  try {
    const token = getToken(req);
    if (!token) return fail('Bạn chưa đăng nhập');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || user.role !== 'admin' || user.status !== 'active') {
      return fail('Phiên đăng nhập không hợp lệ');
    }

    req.user = user;
    res.locals.user = user;
    if (mode === 'page') res.set('Cache-Control', 'no-store');
    next();
  } catch (err) {
    return fail('Phiên đăng nhập đã hết hạn');
  }
};

exports.authPage = authenticate('page');
exports.authApi = authenticate('api');

// Nếu đã đăng nhập hợp lệ thì chuyển thẳng vào dashboard (dùng cho trang /login)
exports.redirectIfAuthed = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (user && user.role === 'admin' && user.status === 'active') return res.redirect('/dashboard');
    }
  } catch (err) {
    /* token lỗi → cho phép vào trang login */
  }
  next();
};

exports.validateId = (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID không hợp lệ' });
  next();
};

exports.getToken = getToken;
