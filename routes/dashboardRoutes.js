const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { authApi } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/stats', authApi, asyncHandler(ctrl.stats));

module.exports = router;
