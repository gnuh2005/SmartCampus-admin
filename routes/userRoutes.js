const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authApi, validateId } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authApi);
router.param('id', validateId);

router.get('/', asyncHandler(ctrl.list));
router.post('/', asyncHandler(ctrl.create));
router.patch('/:id/toggle-status', asyncHandler(ctrl.toggleStatus));
router.patch('/:id/reset-password', asyncHandler(ctrl.resetPassword));
router.delete('/:id', asyncHandler(ctrl.remove));

module.exports = router;
