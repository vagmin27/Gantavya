import { Router } from 'express';
import { DestinationController } from './destination.controller.js';

const router = Router();

router.get('/status', DestinationController.getStatus);
router.get('/', DestinationController.list);
router.post('/', DestinationController.create);
router.get('/:id', DestinationController.getById);

export default router;

