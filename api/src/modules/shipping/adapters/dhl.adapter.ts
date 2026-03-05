import { ShipmentStatus } from '@prisma/client';
import { CarrierAdapter, TrackingResult } from './carrier.adapter';

// Codes événements DHL → ShipmentStatus
const DHL_STATUS_MAP: Record<string, ShipmentStatus> = {
  'pre-transit': ShipmentStatus.PENDING,
  'transit': ShipmentStatus.IN_TRANSIT,
  'pickup': ShipmentStatus.PICKED_UP,
  'delivered': ShipmentStatus.DELIVERED,
  'failure': ShipmentStatus.FAILED,
  'returned': ShipmentStatus.RETURNED,
};

function mapDhlStatus(code: string): ShipmentStatus {
  return DHL_STATUS_MAP[code?.toLowerCase()] ?? ShipmentStatus.IN_TRANSIT;
}

export class DhlAdapter extends CarrierAdapter {
  private baseUrl: string;

  constructor(baseUrl = 'https://api-eu.dhl.com') {
    super();
    this.baseUrl = baseUrl;
  }

  buildTrackingUrl(trackingNumber: string): string {
    return `https://www.dhl.com/tn-fr/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`;
  }

  async track(trackingNumber: string, apiKey?: string): Promise<TrackingResult> {
    const res = await fetch(
      `${this.baseUrl}/track/shipments?trackingNumber=${trackingNumber}`,
      {
        headers: {
          'DHL-API-Key': apiKey || '',
          Accept: 'application/json',
        },
      },
    );

    if (!res.ok) throw new Error(`DHL API error: ${res.status}`);

    const data: any = await res.json();
    const shipment = data?.shipments?.[0];

    if (!shipment) throw new Error('Aucune information de tracking DHL');

    const rawStatus: string = shipment.status?.statusCode || 'transit';
    const events = (shipment.events || []).map((e: any) => ({
      date: new Date(e.timestamp),
      description: e.description || '',
      location: e.location?.address?.addressLocality || '',
    }));

    return {
      status: mapDhlStatus(rawStatus),
      rawStatus: shipment.status?.description || rawStatus,
      trackingUrl: this.buildTrackingUrl(trackingNumber),
      events,
    };
  }
}
