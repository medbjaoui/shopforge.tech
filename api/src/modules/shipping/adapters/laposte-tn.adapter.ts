import { ShipmentStatus } from '@prisma/client';
import { CarrierAdapter, TrackingResult } from './carrier.adapter';

// La Poste Tunisienne — Rapid Post / Express Mail Service
// API disponible via le portail entreprise : https://www.poste.tn
// apiKey = token d'authentification fourni par La Poste
const LAPOSTE_STATUS_MAP: Record<string, ShipmentStatus> = {
  'PRISE EN CHARGE': ShipmentStatus.PICKED_UP,
  'EN COURS': ShipmentStatus.IN_TRANSIT,
  'EN TOURNEE': ShipmentStatus.OUT_FOR_DELIVERY,
  'LIVRE': ShipmentStatus.DELIVERED,
  'ECHEC': ShipmentStatus.FAILED,
  'RETOURNE': ShipmentStatus.RETURNED,
};

function mapLaPosteStatus(raw: string): ShipmentStatus {
  const upper = raw.toUpperCase();
  for (const [key, val] of Object.entries(LAPOSTE_STATUS_MAP)) {
    if (upper.includes(key)) return val;
  }
  return ShipmentStatus.IN_TRANSIT;
}

export class LaPosteTnAdapter extends CarrierAdapter {
  private baseUrl: string;

  constructor(baseUrl = 'https://track.poste.tn/api') {
    super();
    this.baseUrl = baseUrl;
  }

  buildTrackingUrl(trackingNumber: string): string {
    return `https://www.poste.tn/track?numero=${trackingNumber}`;
  }

  async track(trackingNumber: string, apiKey?: string): Promise<TrackingResult> {
    const res = await fetch(`${this.baseUrl}/track/${trackingNumber}`, {
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        Accept: 'application/json',
      },
    });

    if (!res.ok) throw new Error(`La Poste TN API error: ${res.status}`);

    const data: any = await res.json();
    const rawStatus: string = data?.statut || data?.status || 'EN COURS';

    const events = (data?.evenements || data?.events || []).map((e: any) => ({
      date: new Date(e.date || e.timestamp),
      description: e.libelle || e.description || '',
      location: e.lieu || e.location || '',
    }));

    return {
      status: mapLaPosteStatus(rawStatus),
      rawStatus,
      trackingUrl: this.buildTrackingUrl(trackingNumber),
      events,
    };
  }
}
