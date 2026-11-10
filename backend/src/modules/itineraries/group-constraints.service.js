/**
 * Group Travel Constraints Service
 * Gantavya Platform - Milestone 2.4.4
 *
 * Aggregates and resolves conflicting constraints (budget, modes, accessibility, pace)
 * across multiple trip participants into a coherent, feasible travel policy.
 */

import { TravellerProfile } from '../profiles/profile.model.js';

export class GroupConstraintsService {
  /**
   * Resolves unified group constraints for a given trip.
   *
   * @param {Object} trip - Mongoose Trip document
   * @returns {Promise<Object>} Aggregated group travel constraints
   */
  static async resolveGroupConstraints(trip) {
    const activeParticipants = (trip.participants || []).filter(
      (p) => p.membershipStatus === 'active'
    );

    // Default baseline constraints from trip document
    const tripConstraints = trip.travelConstraints || {};
    const tripBudget = trip.budget?.targetAmount || 0;
    const defaultModes = trip.transportationPreferences?.length > 0
      ? trip.transportationPreferences
      : (tripConstraints.availableTransportation?.length > 0
          ? tripConstraints.availableTransportation
          : ['car', 'bus', 'train', 'flight', 'walking']);

    if (activeParticipants.length === 0) {
      return {
        maxBudget: tripConstraints.maxBudget || tripBudget || 0,
        currency: trip.budget?.currency || 'INR',
        allowedModes: defaultModes,
        accessibilityRequirements: tripConstraints.accessibilityRequirements || [],
        dietaryRestrictions: tripConstraints.dietaryRestrictions || [],
        travelSpeed: tripConstraints.travelSpeed || 'moderate',
        maxDailyTravelDuration: tripConstraints.maxDailyTravelDuration || 180,
        activityDensity: tripConstraints.activityDensity || 'medium',
        travellerCount: (trip.travellersCount?.adults || 1) +
          (trip.travellersCount?.children || 0) +
          (trip.travellersCount?.infants || 0),
        participantCount: 1,
        isGroup: false
      };
    }

    // Fetch traveller profiles for active participants
    const userIds = activeParticipants.map((p) => p.userId?._id || p.userId);
    const profiles = await TravellerProfile.find({ userId: { $in: userIds } });

    // 1. Budget: Minimum budget cap among participants if specified, or trip budget
    const budgets = [];
    if (tripConstraints.maxBudget && tripConstraints.maxBudget > 0) {
      budgets.push(tripConstraints.maxBudget);
    }
    if (tripBudget > 0) {
      budgets.push(tripBudget);
    }

    // Map profile modes to standard modes ('rental_car' -> 'car', etc.)
    const normalizeMode = (m) => {
      if (m === 'rental_car' || m === 'shared_cab') return 'car';
      return m;
    };

    // 2. Allowed Modes: Start with default modes
    let aggregatedModes = new Set(defaultModes.map(normalizeMode));

    // 3. Accessibility Requirements: Strict Union
    const accessibilitySet = new Set(tripConstraints.accessibilityRequirements || []);

    // 4. Dietary Restrictions: Union
    const dietarySet = new Set(tripConstraints.dietaryRestrictions || []);

    // 5. Travel Speed: Most conservative (relaxed > moderate > fast_paced)
    const speedRank = { relaxed: 1, slow_travel: 1, moderate: 2, balanced: 2, fast_paced: 3 };
    let lowestSpeedVal = speedRank[tripConstraints.travelSpeed] || 2;

    for (const profile of profiles) {
      // Preferences
      if (profile.preferredTransportation && profile.preferredTransportation.length > 0) {
        const normalizedProfModes = new Set(profile.preferredTransportation.map(normalizeMode));
        aggregatedModes = new Set([...aggregatedModes].filter((m) => normalizedProfModes.has(m)));
      }

      if (profile.accessibilityPreferences) {
        if (profile.accessibilityPreferences.wheelchairAccessible) {
          accessibilitySet.add('wheelchair_accessible');
        }
        if (profile.accessibilityPreferences.stepFreeAccess) {
          accessibilitySet.add('step_free_access');
        }
      }

      if (profile.accessibilityNeeds && Array.isArray(profile.accessibilityNeeds)) {
        profile.accessibilityNeeds.forEach((req) => accessibilitySet.add(req));
      }

      if (profile.dietaryPreferences && Array.isArray(profile.dietaryPreferences)) {
        profile.dietaryPreferences.forEach((diet) => dietarySet.add(diet));
      }

      if (profile.foodPreferences && Array.isArray(profile.foodPreferences)) {
        profile.foodPreferences.forEach((diet) => dietarySet.add(diet));
      }

      if (profile.preferredTravelStyles && Array.isArray(profile.preferredTravelStyles)) {
        for (const style of profile.preferredTravelStyles) {
          if (speedRank[style] && speedRank[style] < lowestSpeedVal) {
            lowestSpeedVal = speedRank[style];
          }
        }
      }
    }

    // Fallback if empty
    let finalAllowedModes = Array.from(aggregatedModes);
    if (finalAllowedModes.length === 0) {
      finalAllowedModes = ['car', 'bus', 'train', 'walking'];
    }

    const speedNameMap = { 1: 'relaxed', 2: 'moderate', 3: 'fast_paced' };
    const resolvedSpeed = speedNameMap[lowestSpeedVal] || 'moderate';
    const effectiveBudget = budgets.length > 0 ? Math.min(...budgets) : 0;

    const totalTravellers =
      (trip.travellersCount?.adults || 1) +
      (trip.travellersCount?.children || 0) +
      (trip.travellersCount?.infants || 0);

    return {
      maxBudget: effectiveBudget,
      currency: trip.budget?.currency || 'INR',
      allowedModes: finalAllowedModes,
      accessibilityRequirements: Array.from(accessibilitySet),
      dietaryRestrictions: Array.from(dietarySet),
      travelSpeed: resolvedSpeed,
      maxDailyTravelDuration: tripConstraints.maxDailyTravelDuration || 180,
      activityDensity: tripConstraints.activityDensity || 'medium',
      travellerCount: Math.max(totalTravellers, activeParticipants.length),
      participantCount: activeParticipants.length,
      isGroup: activeParticipants.length > 1
    };
  }
}
