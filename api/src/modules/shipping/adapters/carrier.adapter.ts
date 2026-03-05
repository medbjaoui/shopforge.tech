import { ShipmentStatus } from '@prisma/client';

export interface TrackingResult {
  status: ShipmentStatus;
  rawStatus: string;
  trackingUrl?: string;
  events?: TrackingEvent[];
  estimatedDelivery?: Date;
}

export interface TrackingEvent {
  date: Date;
  description: string;
  location?: string;
}

// Données nécessaires pour créer une expédition chez le transporteur
export interface CreateShipmentData {
  orderNumber: string;
  productDescription: string; // noms des produits concaténés
  itemCount: number;
  codAmount: number; // montant à encaisser (COD)
  // Expéditeur (boutique)
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderAddress: string;
  senderCity: string;
  // Destinataire (client)
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerGovernorate: string;
  customerPostalCode: string;
}

export interface CreateShipmentResult {
  barCode: string;     // code-barres / numéro de suivi retourné par le transporteur
  labelUrl?: string;   // URL de l'étiquette PDF (si disponible)
}

export abstract class CarrierAdapter {
  abstract track(trackingNumber: string, apiKey?: string): Promise<TrackingResult>;
  abstract buildTrackingUrl(trackingNumber: string): string;

  // Créer une expédition chez le transporteur et retourner le code-barres
  // Par défaut : retourne orderNumber comme barcode (transporteurs sans API de création)
  async create(data: CreateShipmentData, _apiKey?: string): Promise<CreateShipmentResult> {
    return { barCode: data.orderNumber };
  }
}
