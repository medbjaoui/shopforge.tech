import { ShipmentStatus } from '@prisma/client';
import { CarrierAdapter, TrackingResult, CreateShipmentData, CreateShipmentResult } from './carrier.adapter';

// First Delivery Group — Transporteur tunisien
// API Doc : https://www.firstdeliverygroup.com/api/v2/documentation
// apiKey   : Bearer token fourni directement par First Delivery Group
//
// Codes de statut numériques (champ "state" dans la réponse) :
//   0  → En attente          (PENDING)
//   1  → En traitement       (IN_TRANSIT)
//   2  → Livré               (DELIVERED)
//   3  → Échange             (IN_TRANSIT)
//   5  → Retour expéditeur   (RETURNED)
//   6  → Annulé              (FAILED)
//   7  → Retour client/agence (RETURNED)
//   8  → En dépôt            (IN_TRANSIT)
//  11  → Retour dépôt        (RETURNED)
//  20  → À vérifier          (FAILED)
//  30  → Retour reçu         (RETURNED)
//  31  → Retour définitif    (RETURNED)
// 100  → Demande enlèvement créée   (PENDING)
// 101  → Enlèvement assigné         (PENDING)
// 102  → Enlèvement en cours        (PICKED_UP)
// 103  → Enlevé                     (PICKED_UP)
// 104  → Enlèvement annulé          (FAILED)
// 201  → Retour assigné             (RETURNED)
// 202  → Retour en transit          (RETURNED)
// 203  → Retour collecté            (RETURNED)
// 204  → Retour annulé              (FAILED)

const FDG_STATE_MAP: Record<number, { status: ShipmentStatus; label: string }> = {
  0:   { status: ShipmentStatus.PENDING,          label: 'En attente' },
  1:   { status: ShipmentStatus.IN_TRANSIT,        label: 'En traitement' },
  2:   { status: ShipmentStatus.DELIVERED,         label: 'Livré' },
  3:   { status: ShipmentStatus.IN_TRANSIT,        label: 'Échange' },
  5:   { status: ShipmentStatus.RETURNED,          label: 'Retour expéditeur' },
  6:   { status: ShipmentStatus.FAILED,            label: 'Annulé' },
  7:   { status: ShipmentStatus.RETURNED,          label: 'Retour client/agence' },
  8:   { status: ShipmentStatus.IN_TRANSIT,        label: 'En dépôt' },
  11:  { status: ShipmentStatus.RETURNED,          label: 'Retour dépôt' },
  20:  { status: ShipmentStatus.FAILED,            label: 'À vérifier' },
  30:  { status: ShipmentStatus.RETURNED,          label: 'Retour reçu' },
  31:  { status: ShipmentStatus.RETURNED,          label: 'Retour définitif' },
  100: { status: ShipmentStatus.PENDING,           label: 'Demande enlèvement créée' },
  101: { status: ShipmentStatus.PENDING,           label: 'Enlèvement assigné' },
  102: { status: ShipmentStatus.PICKED_UP,         label: 'Enlèvement en cours' },
  103: { status: ShipmentStatus.PICKED_UP,         label: 'Enlevé' },
  104: { status: ShipmentStatus.FAILED,            label: 'Enlèvement annulé' },
  201: { status: ShipmentStatus.RETURNED,          label: 'Retour assigné' },
  202: { status: ShipmentStatus.RETURNED,          label: 'Retour en transit' },
  203: { status: ShipmentStatus.RETURNED,          label: 'Retour collecté' },
  204: { status: ShipmentStatus.FAILED,            label: 'Retour annulé' },
};

const PROD_BASE = 'https://www.firstdeliverygroup.com/api/v2';

export class FirstDeliveryAdapter extends CarrierAdapter {
  private baseUrl: string;

  constructor(baseUrl = PROD_BASE) {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  buildTrackingUrl(trackingNumber: string): string {
    return `https://www.firstdeliverygroup.com/suivi-de-colis/?barcode=${trackingNumber}`;
  }

  async create(data: CreateShipmentData, apiKey?: string): Promise<CreateShipmentResult> {
    if (!apiKey) return { barCode: data.orderNumber };

    const res = await fetch(`${this.baseUrl}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        client: {
          nom: data.customerName,
          gouvernerat: data.customerGovernorate || data.customerCity,
          ville: data.customerCity || data.customerGovernorate,
          adresse: data.customerAddress || data.customerCity,
          telephone: data.customerPhone,
        },
        produit: {
          prix: data.codAmount,
          designation: data.productDescription,
          nombreArticle: data.itemCount,
          commentaire: data.orderNumber,
        },
      }),
    });

    if (!res.ok) return { barCode: data.orderNumber };

    const result: any = await res.json();
    // Réponse FDG : { barCode: "...", print: "url" } ou { barCodes: [...] }
    const barCode =
      result?.barCode ??
      result?.barcode ??
      result?.barCodes?.[0] ??
      data.orderNumber;
    const labelUrl = result?.print ?? undefined;

    return { barCode, labelUrl };
  }

  async track(trackingNumber: string, apiKey?: string): Promise<TrackingResult> {
    if (!apiKey) {
      // Pas de token → retourner statut neutre (pas d'API publique disponible)
      return {
        status: ShipmentStatus.IN_TRANSIT,
        rawStatus: 'NO_TOKEN',
        trackingUrl: this.buildTrackingUrl(trackingNumber),
        events: [],
      };
    }

    const res = await fetch(`${this.baseUrl}/etat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ barCode: trackingNumber }),
    });

    if (!res.ok) {
      throw new Error(`First Delivery Group API error: ${res.status}`);
    }

    const data: any = await res.json();

    // Réponse : { state: number, barCode: string }
    const stateCode: number = data?.state ?? data?.status ?? 0;
    const mapped = FDG_STATE_MAP[stateCode];

    const rawStatus = mapped
      ? `${stateCode} — ${mapped.label}`
      : `État inconnu (${stateCode})`;

    // Pour obtenir les détails complets (dates), on peut appeler /filter
    let events: Array<{ date: Date; description: string; location: string }> = [];
    try {
      events = await this.fetchDetails(trackingNumber, apiKey, mapped?.label ?? rawStatus);
    } catch {
      // Non bloquant — le /filter peut échouer (rate limit 2 req/10s)
    }

    return {
      status: mapped?.status ?? ShipmentStatus.IN_TRANSIT,
      rawStatus,
      trackingUrl: this.buildTrackingUrl(trackingNumber),
      events,
    };
  }

  // Appel optionnel à /filter pour récupérer les dates de création/livraison
  private async fetchDetails(
    trackingNumber: string,
    apiKey: string,
    statusLabel: string,
  ): Promise<Array<{ date: Date; description: string; location: string }>> {
    const res = await fetch(`${this.baseUrl}/filter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ barCode: trackingNumber, pageNumber: 1, limit: 1 }),
    });

    if (!res.ok) return [];

    const data: any = await res.json();
    const orders: any[] = data?.orders ?? data?.data ?? (Array.isArray(data) ? data : []);
    const order = orders[0];
    if (!order) return [];

    const events: Array<{ date: Date; description: string; location: string }> = [];

    if (order.createdAt) {
      events.push({ date: new Date(order.createdAt), description: 'Colis créé', location: '' });
    }
    if (order.pickedUpAt || order.pickupDate) {
      events.push({
        date: new Date(order.pickedUpAt ?? order.pickupDate),
        description: 'Colis enlevé',
        location: '',
      });
    }
    if (order.deliveredAt || order.deliveryDate) {
      events.push({
        date: new Date(order.deliveredAt ?? order.deliveryDate),
        description: statusLabel,
        location: order.ville ?? order.city ?? '',
      });
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
