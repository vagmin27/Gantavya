/**
 * Provider-Independent Transportation Adapter Interface
 * Gantavya Platform - Milestone 2.4
 *
 * All external routing engines, railway data providers, and airline GDS feeds
 * must implement this contract to produce normalized TransitLeg instances.
 */

export class TransportationProviderAdapter {
  constructor(providerName, supportedModes = []) {
    if (this.constructor === TransportationProviderAdapter) {
      throw new Error('TransportationProviderAdapter is an abstract interface and cannot be instantiated directly.');
    }
    this.providerName = providerName;
    this.supportedModes = supportedModes;
  }

  /**
   * Searches for available transit options between origin and destination nodes.
   * @param {Object} originNode - Normalized TransportNode
   * @param {Object} destinationNode - Normalized TransportNode
   * @param {Date} departureTime - Desired departure timestamp
   * @param {Object} options - Search constraints and filters
   * @returns {Promise<Array>} List of normalized TransitLeg plain objects
   */
  async searchLegs(originNode, destinationNode, departureTime, options = {}) {
    throw new Error(`searchLegs() must be implemented by ${this.providerName} adapter.`);
  }

  /**
   * Normalizes raw third-party provider payload into standard TransitLeg schema.
   * @param {Object} rawPayload - Native response from third-party API
   * @param {Object} context - Contextual metadata (requested nodes, times, etc.)
   * @returns {Object} Normalized TransitLeg compatible object
   */
  normalizeResponse(rawPayload, context = {}) {
    throw new Error(`normalizeResponse() must be implemented by ${this.providerName} adapter.`);
  }

  /**
   * Health check to confirm API credentials, reachability, and rate quota.
   * @returns {Promise<{ status: string, reachable: boolean, details?: object }>}
   */
  async healthCheck() {
    throw new Error(`healthCheck() must be implemented by ${this.providerName} adapter.`);
  }
}

