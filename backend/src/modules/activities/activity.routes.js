import { Router } from 'express';
import { ActivityController } from './activity.controller.js';
import { authenticate, verifyCsrf } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/status', ActivityController.getStatus);
router.post('/reorder', authenticate, verifyCsrf, ActivityController.reorder);

router.get('/', authenticate, ActivityController.listForDay);
router.post('/', authenticate, verifyCsrf, ActivityController.create);
router.get('/:id', authenticate, ActivityController.getById);
router.put('/:id', authenticate, verifyCsrf, ActivityController.update);
router.delete('/:id', authenticate, verifyCsrf, ActivityController.delete);

export default router;
