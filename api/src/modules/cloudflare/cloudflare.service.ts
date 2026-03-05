import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);
  private readonly accountId: string;
  private readonly tunnelId: string;
  private readonly apiToken: string;

  constructor(private config: ConfigService) {
    this.accountId = config.get('CF_ACCOUNT_ID', '');
    this.tunnelId = config.get('CF_TUNNEL_ID', '');
    this.apiToken = config.get('CF_API_TOKEN', '');
  }

  private get enabled(): boolean {
    return !!(this.accountId && this.tunnelId && this.apiToken);
  }

  /** URL CNAME que le marchand doit pointer */
  get cnameTarget(): string {
    if (!this.tunnelId) return '';
    return `${this.tunnelId}.cfargotunnel.com`;
  }

  private async getTunnelConfig(): Promise<any> {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/cfd_tunnel/${this.tunnelId}/configurations`,
      { headers: { Authorization: `Bearer ${this.apiToken}` } },
    );
    if (!res.ok) throw new Error(`CF API error: ${res.status}`);
    return res.json();
  }

  private async putTunnelConfig(ingress: any[]): Promise<void> {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/cfd_tunnel/${this.tunnelId}/configurations`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: { ingress } }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`CF API PUT error: ${res.status} — ${body}`);
    }
  }

  async addHostname(domain: string): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`CloudflareService: CF vars not set — skipping addHostname(${domain})`);
      return;
    }
    try {
      const { result } = await this.getTunnelConfig();
      const ingress: any[] = result?.config?.ingress ?? [];

      // Retirer l'entrée existante pour ce domaine + la règle catch-all finale
      const catchAll = ingress.find((r) => !r.hostname) ?? { service: 'http://traefik:80' };
      const filtered = ingress.filter((r) => r.hostname && r.hostname !== domain);

      const newIngress = [
        ...filtered,
        { hostname: domain, service: 'http://traefik:80' },
        catchAll,
      ];
      await this.putTunnelConfig(newIngress);
      this.logger.log(`CF Tunnel: added hostname ${domain}`);
    } catch (err) {
      this.logger.error(`CF addHostname(${domain}) failed: ${err}`);
      throw err;
    }
  }

  async removeHostname(domain: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const { result } = await this.getTunnelConfig();
      const ingress: any[] = result?.config?.ingress ?? [];
      const newIngress = ingress.filter((r) => r.hostname !== domain);
      await this.putTunnelConfig(newIngress);
      this.logger.log(`CF Tunnel: removed hostname ${domain}`);
    } catch (err) {
      this.logger.error(`CF removeHostname(${domain}) failed: ${err}`);
      throw err;
    }
  }
}
