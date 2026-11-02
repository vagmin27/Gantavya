import { Router } from 'express';
import { PlaceController } from './place.controller.js';

const router = Router();

router.get('/status', PlaceController.getStatus);
router.get('/', PlaceController.list);
router.post('/', PlaceController.create);
router.get('/:id', PlaceController.getById);

export default router;

