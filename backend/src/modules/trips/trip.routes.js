import { Router } from 'express';
import { TripController } from './trip.controller.js';

const router = Router();

router.get('/status', TripController.getStatus);
router.get('/', TripController.list);
router.post('/', TripController.create);
router.get('/:id', TripController.getById);
router.put('/:id', TripController.update);
router.post('/:id/participants', TripController.addParticipant);
router.delete('/:id/participants/:participantId', TripController.removeParticipant);

export default router;

