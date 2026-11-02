import { Router } from 'express';
import { ItineraryController } from './itinerary.controller.js';

const router = Router();

router.get('/status', ItineraryController.getStatus);
router.get('/', ItineraryController.listDays);
router.post('/', ItineraryController.createDay);
router.get('/:id', ItineraryController.getDayById);
router.put('/:id', ItineraryController.updateDay);
router.delete('/:id', ItineraryController.deleteDay);

export default router;

