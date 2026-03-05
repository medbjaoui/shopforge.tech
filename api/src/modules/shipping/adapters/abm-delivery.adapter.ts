import { ShipmentStatus } from '@prisma/client';
import { CarrierAdapter, TrackingResult, CreateShipmentData, CreateShipmentResult } from './carrier.adapter';

// ABM Delivery — Transporteur tunisien
// API doc: http://app.abm-delivery.com/WebServiceExterne/
//
// apiKey : Bearer token obtenu via POST /get_token (stocké directement)
// Sans apiKey, le tracking public est utilisé (GET /tracking_position/{POSBARCODE}).

const PROD_BASE = 'http://app.abm-delivery.com/WebServiceExterne';

// Mapping statuts ABM Delivery (français) → ShipmentStatus
const ABM_STATUS_MAP: Array<[string, ShipmentStatus]> = [
  ['livré', ShipmentStatus.DELIVERED],
  ['livre', ShipmentStatus.DELIVERED],
  ['tournée', ShipmentStatus.OUT_FOR_DELIVERY],
  ['tournee', ShipmentStatus.OUT_FOR_DELIVERY],
  ['en cours de livraison', ShipmentStatus.OUT_FOR_DELIVERY],
  ['en cours', ShipmentStatus.IN_TRANSIT],
  ['transit', ShipmentStatus.IN_TRANSIT],
  ['enlevé', ShipmentStatus.PICKED_UP],
  ['enleve', ShipmentStatus.PICKED_UP],
  ['enlèvement', ShipmentStatus.PICKED_UP],
  ['enlevement', ShipmentStatus.PICKED_UP],
  ['retourné', ShipmentStatus.RETURNED],
  ['retourne', ShipmentStatus.RETURNED],
  ['retour', ShipmentStatus.RETURNED],
  ['échec', ShipmentStatus.FAILED],
  ['echec', ShipmentStatus.FAILED],
  ['anomalie', ShipmentStatus.FAILED],
  ['refusé', ShipmentStatus.FAILED],
  ['refuse', ShipmentStatus.FAILED],
];

function mapAbmStatus(raw: string): ShipmentStatus {
  const lower = raw.toLowerCase();
  for (const [key, status] of ABM_STATUS_MAP) {
    if (lower.includes(key)) return status;
  }
  return ShipmentStatus.IN_TRANSIT;
}

// Convertit le format de date ABM "/Date(1588519244130)/" en Date JS
function parseAbmDate(raw: string | null | undefined): Date | undefined {
  if (!raw) return undefined;
  const match = raw.match(/\/Date\((\d+)\)\//);
  if (match) return new Date(parseInt(match[1], 10));
  return undefined;
}

export class AbmDeliveryAdapter extends CarrierAdapter {
  private baseUrl: string;

  constructor(baseUrl = PROD_BASE) {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  buildTrackingUrl(trackingNumber: string): string {
    return `http://app.abm-delivery.com/tracking?code=${trackingNumber}`;
  }

  async track(trackingNumber: string, apiKey?: string): Promise<TrackingResult> {
    if (apiKey) {
      return this.trackAuthenticated(trackingNumber, apiKey);
    }
    return this.trackPublic(trackingNumber);
  }

  private async trackAuthenticated(
    trackingNumber: string,
    token: string,
  ): Promise<TrackingResult> {
    const form = new URLSearchParams();
    form.append('TOKEN', token);
    form.append('POSBARCODE_LIST', JSON.stringify([trackingNumber]));

    const res = await fetch(`${this.baseUrl}/get_pos_details_list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!res.ok) throw new Error(`ABM Delivery API error: ${res.status}`);

    const data: any[] = await res.json();
    const pos = data?.[0];

    if (!pos || pos.STATUS === 'NOT_FOUND') {
      throw new Error(`ABM Delivery: colis introuvable (${trackingNumber})`);
    }

    const rawStatus: string = pos.POS_STATUTACTUEL ?? 'En cours';

    return {
      status: mapAbmStatus(rawStatus),
      rawStatus,
      trackingUrl: this.buildTrackingUrl(trackingNumber),
      events: this.extractEvents(pos),
    };
  }

  private async trackPublic(trackingNumber: string): Promise<TrackingResult> {
    const res = await fetch(
      `${this.baseUrl}/tracking_position/${encodeURIComponent(trackingNumber)}`,
    );

    if (!res.ok) throw new Error(`ABM Delivery tracking error: ${res.status}`);

    const pos: any = await res.json();
    const rawStatus: string = pos?.POS_STATUTACTUEL ?? pos?.statut ?? 'En cours';

    return {
      status: mapAbmStatus(rawStatus),
      rawStatus,
      trackingUrl: this.buildTrackingUrl(trackingNumber),
      events: this.extractEvents(pos),
    };
  }

  async create(data: CreateShipmentData, apiKey?: string): Promise<CreateShipmentResult> {
    if (!apiKey) return { barCode: data.orderNumber };

    const form = new URLSearchParams();
    form.append('TOKEN', apiKey);
    // Expéditeur
    form.append('ENL_CONTACT_NOM', data.senderName);
    form.append('ENL_CONTACT_PRENOM', '');
    form.append('ENL_ADRESSE', data.senderAddress || data.senderCity);
    form.append('ENL_PORTABLE', data.senderPhone);
    form.append('ENL_MAIL', data.senderEmail);
    form.append('ENL_CODE_POSTAL', '');
    // Destinataire
    form.append('LIV_CONTACT_NOM', data.customerName);
    form.append('LIV_CONTACT_PRENOM', '');
    form.append('LIV_ADRESSE', data.customerAddress || data.customerCity);
    form.append('LIV_PORTABLE', data.customerPhone);
    form.append('LIV_MAIL', data.customerEmail);
    form.append('LIV_CODE_POSTAL', data.customerPostalCode);
    // Colis
    form.append('POIDS', '1');
    form.append('VALEUR', String(data.codAmount));
    form.append('COD', String(data.codAmount));
    form.append('REFERENCE', data.orderNumber);
    form.append('ORDER_NUMBER', data.orderNumber);
    form.append('GOUVERNORAT', data.customerGovernorate || data.customerCity);
    form.append('POSNBPIECE', String(data.itemCount));
    form.append('POS_VALID', '1');
    form.append('MR_CODE', '');

    const res = await fetch(`${this.baseUrl}/pos_create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!res.ok) return { barCode: data.orderNumber };

    const result: any = await res.json();
    const barCode = result?.POSBARCODE ?? result?.barcode ?? result?.barCode ?? data.orderNumber;
    const labelUrl = result?.LABEL_URL ?? result?.label_url ?? undefined;

    return { barCode, labelUrl };
  }

  private extractEvents(pos: any): Array<{ date: Date; description: string; location: string }> {
    const events: Array<{ date: Date; description: string; location: string }> = [];

    const history: any[] =
      pos?.HISTORIQUE ?? pos?.historique ?? pos?.events ?? pos?.EVENTS ?? [];

    for (const e of history) {
      const date =
        parseAbmDate(e.DATE ?? e.date) ??
        (e.timestamp ? new Date(e.timestamp) : new Date());

      events.push({
        date,
        description: e.LIBELLE ?? e.libelle ?? e.description ?? '',
        location: e.LIEU ?? e.lieu ?? e.location ?? '',
      });
    }

    if (events.length === 0 && pos?.POS_STATUTACTUEL) {
      const dateCreation = parseAbmDate(pos.POS_DATECREATE);
      const dateLivraison = parseAbmDate(pos.POS_DATELIV);
      const dateEnlevement = parseAbmDate(pos.POS_DATEENL);

      if (pos.POS_DATECREATE) {
        events.push({ date: dateCreation ?? new Date(), description: 'Colis créé', location: '' });
      }
      if (pos.POS_DATEENL) {
        events.push({ date: dateEnlevement ?? new Date(), description: 'Colis enlevé', location: '' });
      }
      if (pos.POS_DATELIV) {
        events.push({ date: dateLivraison ?? new Date(), description: pos.POS_STATUTACTUEL, location: '' });
      }
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
