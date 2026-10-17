const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authApi } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/login', asyncHandler(ctrl.login));
router.post('/student-login', asyncHandler(ctrl.studentLogin));
router.post('/logout', ctrl.logout);
router.get('/me', authApi, ctrl.me);

module.exports = router;
