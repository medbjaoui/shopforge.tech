import { ShipmentStatus } from '@prisma/client';
import { CarrierAdapter, TrackingResult } from './carrier.adapter';

// Generic adapter for carriers without a REST API
// Tracking is done manually or via webhook
// buildTrackingUrl uses the carrier's apiBaseUrl as a template
export class GenericAdapter extends CarrierAdapter {
  private baseUrl: string;

  constructor(baseUrl = '') {
    super();
    this.baseUrl = baseUrl;
  }

  buildTrackingUrl(trackingNumber: string): string {
    if (!this.baseUrl) return '';
    // Support template: https://carrier.com/track?num={trackingNumber}
    if (this.baseUrl.includes('{trackingNumber}')) {
      return this.baseUrl.replace('{trackingNumber}', trackingNumber);
    }
    return `${this.baseUrl}${trackingNumber}`;
  }

  async track(_trackingNumber: string, _apiKey?: string): Promise<TrackingResult> {
    // Generic carriers do not have a trackable API — status is updated manually or via webhook
    return {
      status: ShipmentStatus.IN_TRANSIT,
      rawStatus: 'MANUAL',
      trackingUrl: this.buildTrackingUrl(_trackingNumber),
      events: [],
    };
  }
}
