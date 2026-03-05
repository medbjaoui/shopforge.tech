import { ShipmentStatus } from '@prisma/client';
import { CarrierAdapter, TrackingResult } from './carrier.adapter';

// Mapping des codes statuts Aramex → ShipmentStatus
const ARAMEX_STATUS_MAP: Record<string, ShipmentStatus> = {
  'Shipment Created': ShipmentStatus.PENDING,
  'In Transit': ShipmentStatus.IN_TRANSIT,
  'Shipment Picked Up': ShipmentStatus.PICKED_UP,
  'Out For Delivery': ShipmentStatus.OUT_FOR_DELIVERY,
  'Delivered': ShipmentStatus.DELIVERED,
  'Delivery Failed': ShipmentStatus.FAILED,
  'Returned To Shipper': ShipmentStatus.RETURNED,
};

function mapAramexStatus(raw: string): ShipmentStatus {
  for (const [key, val] of Object.entries(ARAMEX_STATUS_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return ShipmentStatus.IN_TRANSIT;
}

export class AramexAdapter extends CarrierAdapter {
  private baseUrl: string;

  constructor(baseUrl = 'https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json') {
    super();
    this.baseUrl = baseUrl;
  }

  buildTrackingUrl(trackingNumber: string): string {
    return `https://www.aramex.com/us/en/track/shipments?mode=0&ShipmentNumber=${trackingNumber}`;
  }

  async track(trackingNumber: string, apiKey?: string): Promise<TrackingResult> {
    // apiKey format attendu: "AccountNumber|Username|Password|AccountPin|AccountEntity|AccountCountryCode"
    // Ex: "12345|user@example.com|pass|0000|AMM|JO"
    const parts = (apiKey || '').split('|');
    const [accountNumber, username, password, accountPin, accountEntity, accountCountryCode] = parts;

    const payload = {
      ClientInfo: {
        AccountCountryCode: accountCountryCode || 'TN',
        AccountEntity: accountEntity || 'TUN',
        AccountNumber: accountNumber || '',
        AccountPin: accountPin || '',
        UserName: username || '',
        Password: password || '',
        Version: 'v1.0',
        Source: 24,
      },
      Transaction: { Reference1: '' },
      Shipments: { ShipmentNumber: [trackingNumber] },
    };

    const res = await fetch(`${this.baseUrl}/TrackShipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Aramex API error: ${res.status}`);

    const data: any = await res.json();
    const trackDetails = data?.TrackingResults?.KeyValueOfstringArrayOfTrackingResultmFAkxlpY?.[0]?.Value?.[0];

    if (!trackDetails) throw new Error('Aucune information de tracking Aramex');

    const rawStatus: string = trackDetails.UpdateDescription || 'Unknown';
    const events = (trackDetails.TrackingHistory || []).map((e: any) => ({
      date: new Date(e.UpdateDateTime),
      description: e.UpdateDescription || '',
      location: e.UpdateLocation || '',
    }));

    return {
      status: mapAramexStatus(rawStatus),
      rawStatus,
      trackingUrl: this.buildTrackingUrl(trackingNumber),
      events,
    };
  }
}
