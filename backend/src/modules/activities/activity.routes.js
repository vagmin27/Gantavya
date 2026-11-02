import { Router } from 'express';
import { ActivityController } from './activity.controller.js';

const router = Router();

router.get('/status', ActivityController.getStatus);
router.get('/', ActivityController.listForDay);
router.post('/', ActivityController.create);
router.get('/:id', ActivityController.getById);
router.put('/:id', ActivityController.update);
router.delete('/:id', ActivityController.delete);

export default router;

