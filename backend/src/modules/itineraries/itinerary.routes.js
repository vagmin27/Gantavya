import { Router } from 'express';
import { ItineraryController } from './itinerary.controller.js';
import { authenticate, verifyCsrf } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/status', ItineraryController.getStatus);
router.post('/reorder', authenticate, verifyCsrf, ItineraryController.reorderDays);

router.get('/', authenticate, ItineraryController.listDays);
router.post('/', authenticate, verifyCsrf, ItineraryController.createDay);
router.get('/:id', authenticate, ItineraryController.getDayById);
router.put('/:id', authenticate, verifyCsrf, ItineraryController.updateDay);
router.delete('/:id', authenticate, verifyCsrf, ItineraryController.deleteDay);

export default router;
