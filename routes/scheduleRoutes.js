const router = require('express').Router();
const ctrl = require('../controllers/scheduleController');
const { authApi, validateId } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authApi);
router.param('id', validateId);

router.get('/', asyncHandler(ctrl.list));
router.post('/', asyncHandler(ctrl.create));
router.put('/:id', asyncHandler(ctrl.update));
router.delete('/:id', asyncHandler(ctrl.remove));

module.exports = router;
