import { Controller, Post, Body, Logger } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { TelegramService } from './telegram.service';
import { TenantsService } from '../tenants/tenants.service';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private telegramService: TelegramService,
    private tenantsService: TenantsService,
  ) {}

  /**
   * Webhook Telegram — reçoit les messages envoyés au bot.
   * Le marchand envoie /start CODE pour lier son compte.
   */
  @Public()
  @Post('webhook')
  async handleWebhook(@Body() update: any): Promise<{ ok: boolean }> {
    try {
      const message = update?.message;
      if (!message?.text) return { ok: true };

      const chatId = String(message.chat?.id);
      const text: string = message.text.trim();

      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const code = parts[1]?.trim().toUpperCase();

        if (!code) {
          await this.telegramService.sendMessage(
            chatId,
            '👋 Bonjour ! Pour lier votre boutique ShopForge, rendez-vous dans\nDashboard → Paramètres → Notifications\net cliquez sur <b>Connecter Telegram</b>.',
          );
          return { ok: true };
        }

        const storeName = await this.tenantsService.connectTelegramFromWebhook(code, chatId);
        if (storeName) {
          await this.telegramService.sendMessage(
            chatId,
            `✅ <b>Telegram connecté à ${storeName} !</b>\n\nVous recevrez désormais les notifications de commandes ici.`,
          );
          this.logger.log(`Telegram linked for store "${storeName}" chatId=${chatId}`);
        } else {
          await this.telegramService.sendMessage(
            chatId,
            '❌ Code invalide ou expiré. Retournez dans les paramètres pour générer un nouveau code.',
          );
        }
      }
    } catch (err) {
      this.logger.error(`Telegram webhook error: ${err}`);
    }

    return { ok: true };
  }
}
