import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  Headers,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Tenant, UserRole } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // ─── Initiate payment (authenticated — called after order creation) ────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('initiate/clictopay')
  async initiateClicToPay(
    @Body() body: { orderId: string; returnBaseUrl: string },
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.payments.initiateClicToPay({
      orderId: body.orderId,
      tenantId: tenant.id,
      returnBaseUrl: body.returnBaseUrl,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('initiate/floussi')
  async initiateFloussi(
    @Body() body: { orderId: string; returnBaseUrl: string },
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.payments.initiateFloussi({
      orderId: body.orderId,
      tenantId: tenant.id,
      returnBaseUrl: body.returnBaseUrl,
    });
  }

  // ─── Public initiate (called from store checkout — no auth) ───────────────

  @Public()
  @Post('store/initiate')
  async storeInitiate(
    @Body() body: { orderId: string; gateway: 'clictopay' | 'floussi'; returnBaseUrl: string },
    @CurrentTenant() tenant: Tenant,
  ) {
    const dto = { orderId: body.orderId, tenantId: tenant.id, returnBaseUrl: body.returnBaseUrl };

    if (body.gateway === 'clictopay') {
      return this.payments.initiateClicToPay(dto);
    }
    if (body.gateway === 'floussi') {
      return this.payments.initiateFloussi(dto);
    }
    throw new BadRequestException('Gateway inconnu');
  }

  // ─── Callback (redirect from gateway) — PUBLIC ────────────────────────────

  @Public()
  @Get('callback')
  async callback(
    @Query('gateway') gateway: string,
    @Query('orderId') orderId: string,
    @Query('status') status: string,
    @Query('orderId_gateway') gatewayOrderId: string, // ClicToPay sends this
    @Query('paymentId') paymentId: string,            // Floussi sends this
    @Res() res: Response,
  ) {
    // Determine base redirect URL (use API host to find frontend)
    const getRedirectBase = () => {
      // Orders will have the tenant slug embedded; for now redirect to a generic page
      return process.env.FRONTEND_URL ?? 'http://localhost:3000';
    };

    if (status === 'fail' || status === 'cancel') {
      await this.payments.markFailed(orderId).catch(() => {});
      return res.redirect(`${getRedirectBase()}/payment/cancel?orderId=${orderId}`);
    }

    try {
      let approved = false;

      if (gateway === 'clictopay') {
        const order = await this.payments.getOrderPaymentInfo(orderId, '').catch(() => null);
        const ref = gatewayOrderId || order?.paymentRef || '';
        approved = await this.payments.confirmClicToPay(orderId, ref);
      } else if (gateway === 'floussi') {
        const order = await this.payments.getOrderPaymentInfo(orderId, '').catch(() => null);
        const ref = paymentId || order?.paymentRef || '';
        approved = await this.payments.confirmFloussi(orderId, ref);
      }

      if (approved) {
        return res.redirect(`${getRedirectBase()}/payment/success?orderId=${orderId}`);
      } else {
        return res.redirect(`${getRedirectBase()}/payment/cancel?orderId=${orderId}&reason=declined`);
      }
    } catch {
      return res.redirect(`${getRedirectBase()}/payment/cancel?orderId=${orderId}&reason=error`);
    }
  }

  // ─── Webhook (server-to-server from Floussi) ─────────────────────────────

  @Public()
  @Post('webhook/floussi')
  async floussiWebhook(
    @Req() req: Request,
    @Headers('x-floussi-signature') signature: string,
    @Body() body: { paymentId: string; orderId: string; status: string },
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.payments.verifyFloussiWebhook(rawBody, signature)) {
      throw new BadRequestException('Signature invalide');
    }

    if (body.status === 'PAID' || body.status === 'SUCCESS') {
      await this.payments.confirmFloussi(body.orderId, body.paymentId);
    } else {
      await this.payments.markFailed(body.orderId);
    }

    return { received: true };
  }
}
