import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { AiFeature, PlanType } from '@prisma/client';

export interface AiCallOptions {
  tenantId: string;
  feature: AiFeature;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface AiCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  durationMs: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private config: PlatformConfigService,
  ) {}

  /** Main entry: validate quota → call AI provider → record usage */
  async call(options: AiCallOptions): Promise<AiCallResult> {
    this.validateEnabled(options.feature);
    await this.checkQuota(options.tenantId);

    const apiKey = this.config.get('ai_api_key');
    if (!apiKey) {
      throw new BadRequestException(
        "Clé API IA non configurée. Contactez l'administrateur.",
      );
    }

    const { provider, model } = this.resolveProviderAndModel();
    const maxTokens =
      options.maxTokens || this.config.getNumber('ai_max_tokens_response', 1024);

    const result =
      provider === 'gemini'
        ? await this.callGemini(apiKey, model, options.systemPrompt, options.userPrompt, maxTokens)
        : await this.callAnthropic(apiKey, model, options.systemPrompt, options.userPrompt, maxTokens);

    await this.prisma.aiUsage.create({
      data: {
        tenantId: options.tenantId,
        feature: options.feature,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: result.model,
        durationMs: result.durationMs,
      },
    });

    return result;
  }

  /** Call with conversation history (chatbot) */
  async callWithHistory(
    options: Omit<AiCallOptions, 'userPrompt'> & {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ): Promise<AiCallResult> {
    this.validateEnabled(options.feature);
    await this.checkQuota(options.tenantId);

    const apiKey = this.config.get('ai_api_key');
    if (!apiKey) {
      throw new BadRequestException(
        "Clé API IA non configurée. Contactez l'administrateur.",
      );
    }

    const { provider, model } = this.resolveProviderAndModel();
    const maxTokens =
      options.maxTokens || this.config.getNumber('ai_max_tokens_response', 1024);

    const result =
      provider === 'gemini'
        ? await this.callGeminiWithHistory(apiKey, model, options.systemPrompt, options.messages, maxTokens)
        : await this.callAnthropicWithHistory(apiKey, model, options.systemPrompt, options.messages, maxTokens);

    await this.prisma.aiUsage.create({
      data: {
        tenantId: options.tenantId,
        feature: options.feature,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: result.model,
        durationMs: result.durationMs,
      },
    });

    return result;
  }

  // ── Usage helpers ──────────────────────────────────────────────────────────

  async getMonthlyUsage(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return this.prisma.aiUsage.count({
      where: { tenantId, createdAt: { gte: startOfMonth } },
    });
  }

  async getUsageBreakdown(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyCount, byFeature, totalTokens] = await Promise.all([
      this.prisma.aiUsage.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.aiUsage.groupBy({
        by: ['feature'],
        where: { tenantId, createdAt: { gte: startOfMonth } },
        _count: true,
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiUsage.aggregate({
        where: { tenantId, createdAt: { gte: startOfMonth } },
        _sum: { inputTokens: true, outputTokens: true },
      }),
    ]);

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    const limit = this.getPlanLimit(tenant.plan);

    return {
      monthlyCount,
      monthlyLimit: limit,
      unlimited: limit === -1,
      totalInputTokens: totalTokens._sum.inputTokens ?? 0,
      totalOutputTokens: totalTokens._sum.outputTokens ?? 0,
      byFeature: byFeature.map((f) => ({
        feature: f.feature,
        count: f._count,
        inputTokens: f._sum.inputTokens ?? 0,
        outputTokens: f._sum.outputTokens ?? 0,
      })),
    };
  }

  // ── Admin stats ────────────────────────────────────────────────────────────

  async getAdminStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalRequests, monthRequests, byFeature, byTenant, totalTokens] =
      await Promise.all([
        this.prisma.aiUsage.count(),
        this.prisma.aiUsage.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.aiUsage.groupBy({
          by: ['feature'],
          where: { createdAt: { gte: startOfMonth } },
          _count: true,
          _sum: { inputTokens: true, outputTokens: true },
        }),
        this.prisma.aiUsage.groupBy({
          by: ['tenantId'],
          where: { createdAt: { gte: startOfMonth } },
          _count: true,
        }),
        this.prisma.aiUsage.aggregate({
          where: { createdAt: { gte: startOfMonth } },
          _sum: { inputTokens: true, outputTokens: true },
        }),
      ]);

    return {
      totalRequests,
      monthRequests,
      activeTenants: byTenant.length,
      totalInputTokens: totalTokens._sum.inputTokens ?? 0,
      totalOutputTokens: totalTokens._sum.outputTokens ?? 0,
      provider: this.config.get('ai_provider') || 'anthropic',
      byFeature: byFeature.map((f) => ({
        feature: f.feature,
        count: f._count,
        tokens: (f._sum.inputTokens ?? 0) + (f._sum.outputTokens ?? 0),
      })),
      topTenants: byTenant
        .sort((a, b) => b._count - a._count)
        .slice(0, 10)
        .map((t) => ({ tenantId: t.tenantId, count: t._count })),
    };
  }

  // ── Provider routing ─────────────────────────────────────────────────────

  private resolveProviderAndModel(): { provider: 'anthropic' | 'gemini'; model: string } {
    const provider = (this.config.get('ai_provider') || 'anthropic') as 'anthropic' | 'gemini';
    let model = this.config.get('ai_model') || '';

    if (provider === 'gemini' && (model.startsWith('claude') || !model)) {
      model = 'gemini-2.0-flash';
    }
    if (provider === 'anthropic' && (model.startsWith('gemini') || !model)) {
      model = 'claude-haiku-4-5';
    }

    return { provider, model };
  }

  // ── Anthropic (Claude) ───────────────────────────────────────────────────

  private async callAnthropic(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
  ): Promise<AiCallResult> {
    const client = new Anthropic({ apiKey, timeout: 30_000 });
    const start = Date.now();

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
    } catch (err) {
      throw this.handleAnthropicError(err);
    }

    const durationMs = Date.now() - start;
    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model,
      durationMs,
    };
  }

  private async callAnthropicWithHistory(
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens: number,
  ): Promise<AiCallResult> {
    const client = new Anthropic({ apiKey, timeout: 30_000 });
    const start = Date.now();

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });
    } catch (err) {
      throw this.handleAnthropicError(err);
    }

    const durationMs = Date.now() - start;
    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model,
      durationMs,
    };
  }

  // ── Google Gemini ────────────────────────────────────────────────────────

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new InternalServerErrorException("L'IA n'a pas répondu dans le délai imparti.")), ms),
      ),
    ]);
  }

  private async callGemini(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
  ): Promise<AiCallResult> {
    const client = new GoogleGenAI({ apiKey });
    const start = Date.now();

    try {
      const response = await this.withTimeout(client.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
        },
      }), 30_000);

      const durationMs = Date.now() - start;

      return {
        content: response.text ?? '',
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        model,
        durationMs,
      };
    } catch (err) {
      throw this.handleGeminiError(err);
    }
  }

  private async callGeminiWithHistory(
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens: number,
  ): Promise<AiCallResult> {
    const client = new GoogleGenAI({ apiKey });
    const start = Date.now();

    // Map roles: 'assistant' → 'model' (Gemini convention)
    const geminiContents = messages.map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

    try {
      const response = await this.withTimeout(client.models.generateContent({
        model,
        contents: geminiContents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
        },
      }), 30_000);

      const durationMs = Date.now() - start;

      return {
        content: response.text ?? '',
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        model,
        durationMs,
      };
    } catch (err) {
      throw this.handleGeminiError(err);
    }
  }

  // ── Validation & quota ───────────────────────────────────────────────────

  private validateEnabled(feature: AiFeature) {
    if (!this.config.getBool('ai_enabled')) {
      throw new BadRequestException(
        'Les fonctionnalités IA sont désactivées.',
      );
    }
    const featureKey = this.getFeatureConfigKey(feature);
    if (!this.config.getBool(featureKey, true)) {
      throw new BadRequestException('Cette fonctionnalité IA est désactivée.');
    }
  }

  private async checkQuota(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    const limit = this.getPlanLimit(tenant.plan);

    if (limit === 0) {
      throw new ForbiddenException(
        "Les fonctionnalités IA ne sont pas disponibles pour votre plan. Passez au plan Starter ou Pro.",
      );
    }
    if (limit === -1) return; // unlimited

    const usage = await this.getMonthlyUsage(tenantId);
    if (usage >= limit) {
      throw new ForbiddenException(
        `Limite IA mensuelle atteinte (${limit} requêtes). Passez au plan supérieur.`,
      );
    }
  }

  private getPlanLimit(plan: PlanType): number {
    return this.config.getNumber(`ai_${plan.toLowerCase()}_monthly_limit`, 0);
  }

  private getFeatureConfigKey(feature: AiFeature): string {
    const map: Record<AiFeature, string> = {
      PRODUCT_DESCRIPTION: 'ai_feature_product_desc',
      STORE_CHATBOT: 'ai_feature_chatbot',
      REVIEW_SENTIMENT: 'ai_feature_review_sentiment',
      DASHBOARD_INSIGHTS: 'ai_feature_dashboard_insights',
      ORDER_RESPONSE: 'ai_feature_order_response',
    };
    return map[feature];
  }

  // ── Error handling ───────────────────────────────────────────────────────

  private handleAnthropicError(err: unknown): never {
    if (err instanceof Anthropic.APIError) {
      this.logger.error(`Anthropic API error ${err.status}: ${err.message}`);

      if (err.status === 401) {
        throw new BadRequestException(
          "Clé API Anthropic invalide. Vérifiez la configuration dans les paramètres admin.",
        );
      }
      if (err.status === 400 && err.message?.includes('credit balance')) {
        throw new BadRequestException(
          "Crédits API Anthropic insuffisants. Rechargez le compte Anthropic.",
        );
      }
      if (err.status === 429) {
        throw new BadRequestException(
          "Trop de requêtes IA en cours. Veuillez réessayer dans quelques secondes.",
        );
      }
      if (err.status === 404) {
        throw new BadRequestException(
          "Modèle IA non trouvé. Vérifiez le modèle configuré dans les paramètres admin.",
        );
      }
      if (err.status === 529 || err.status === 503) {
        throw new BadRequestException(
          "Service IA temporairement indisponible. Veuillez réessayer dans quelques instants.",
        );
      }
    }

    this.logger.error('Unexpected Anthropic error', err);
    throw new InternalServerErrorException(
      "Erreur inattendue du service IA. Veuillez réessayer.",
    );
  }

  private handleGeminiError(err: unknown): never {
    const error = err as { message?: string; status?: number };
    this.logger.error(`Gemini API error ${error.status ?? 'unknown'}: ${error.message ?? err}`);

    if (error.status === 401 || error.status === 403) {
      throw new BadRequestException(
        "Clé API Gemini invalide. Vérifiez la configuration dans les paramètres admin.",
      );
    }
    if (error.status === 400) {
      throw new BadRequestException(
        "Requête invalide vers l'API Gemini. Vérifiez le modèle configuré.",
      );
    }
    if (error.status === 404) {
      throw new BadRequestException(
        "Modèle Gemini non trouvé. Vérifiez le modèle configuré dans les paramètres admin.",
      );
    }
    if (error.status === 429) {
      throw new BadRequestException(
        "Trop de requêtes IA en cours. Veuillez réessayer dans quelques secondes.",
      );
    }
    if (error.status === 500 || error.status === 503) {
      throw new BadRequestException(
        "Service Gemini temporairement indisponible. Veuillez réessayer dans quelques instants.",
      );
    }

    this.logger.error('Unexpected Gemini error', err);
    throw new InternalServerErrorException(
      "Erreur inattendue du service IA. Veuillez réessayer.",
    );
  }
}
