import { Trip } from './trip.model.js';

export class TripService {
  static async createTrip(ownerId, tripData) {
    const participants = [
      {
        userId: ownerId,
        role: 'owner',
        invitationStatus: 'accepted',
        membershipStatus: 'active',
        joinedAt: new Date()
      }
    ];

    if (Array.isArray(tripData.participants)) {
      for (const p of tripData.participants) {
        if (p.userId.toString() !== ownerId.toString()) {
          participants.push(p);
        }
      }
    }

    const trip = new Trip({
      ...tripData,
      ownerId,
      participants
    });

    return await trip.save();
  }

  static async getTripById(id) {
    return await Trip.findById(id)
      .populate('ownerId', 'name email')
      .populate('destinationId', 'name country city location')
      .populate('participants.userId', 'name email');
  }

  static async listUserTrips(userId, filter = {}) {
    return await Trip.find({
      $and: [
        {
          $or: [
            { ownerId: userId },
            { 'participants.userId': userId, 'participants.membershipStatus': 'active' }
          ]
        },
        filter
      ]
    })
      .sort({ startDate: 1 })
      .populate('destinationId', 'name country city');
  }

  static async updateTrip(id, updateData) {
    return await Trip.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  static async addParticipant(tripId, { userId, role = 'viewer', invitationStatus = 'pending' }) {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const existing = trip.participants.find((p) => p.userId.toString() === userId.toString());
    if (existing) {
      throw new Error('User is already a participant in this trip');
    }

    trip.participants.push({
      userId,
      role,
      invitationStatus,
      membershipStatus: 'active',
      joinedAt: new Date()
    });

    return await trip.save();
  }

  static async removeParticipant(tripId, userId) {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    if (trip.ownerId.toString() === userId.toString()) {
      throw new Error('Cannot remove the owner of the trip');
    }

    trip.participants = trip.participants.filter(
      (p) => p.userId.toString() !== userId.toString()
    );

    return await trip.save();
  }
}

