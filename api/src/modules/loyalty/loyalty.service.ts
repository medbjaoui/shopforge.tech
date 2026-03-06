import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigureProgramDto } from './dto/configure-program.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { LoyaltyActionType, LoyaltyTier } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private prisma: PrismaService) {}

  // ─── CONFIGURATION PROGRAMME ────────────────────────────────────────────────

  async getProgram(tenantId: string) {
    let program = await this.prisma.loyaltyProgram.findUnique({
      where: { tenantId },
    });

    // Créer automatiquement le programme s'il n'existe pas
    if (!program) {
      program = await this.prisma.loyaltyProgram.create({
        data: { tenantId },
      });
    }

    return program;
  }

  async configureProgram(tenantId: string, dto: ConfigureProgramDto) {
    const program = await this.getProgram(tenantId);

    return this.prisma.loyaltyProgram.update({
      where: { id: program.id },
      data: dto,
    });
  }

  // ─── GESTION POINTS CLIENTS ─────────────────────────────────────────────────

  async getCustomerLoyalty(customerId: string) {
    return this.prisma.customerLoyalty.findUnique({
      where: { customerId },
      include: {
        program: true,
      },
    });
  }

  async getCustomerHistory(customerId: string, limit = 50) {
    return this.prisma.loyaltyHistory.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async adjustPoints(tenantId: string, customerId: string, dto: AdjustPointsDto) {
    const program = await this.getProgram(tenantId);
    if (!program.isEnabled) {
      throw new BadRequestException('Le programme de fidélité n\'est pas activé');
    }

    // Vérifier que le client existe et appartient au tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Client introuvable');
    }

    // Récupérer ou créer le profil de fidélité
    let loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { customerId },
    });

    if (!loyalty) {
      loyalty = await this.prisma.customerLoyalty.create({
        data: {
          customerId,
          programId: program.id,
          tier: this.calculateTier(customer.totalSpent, program),
        },
      });
    }

    // Vérifier qu'on ne retire pas plus de points que disponible
    const newPoints = loyalty.points + dto.points;
    if (newPoints < 0) {
      throw new BadRequestException(`Impossible de retirer ${Math.abs(dto.points)} points (solde: ${loyalty.points})`);
    }

    // Mettre à jour les points
    const updated = await this.prisma.customerLoyalty.update({
      where: { customerId },
      data: {
        points: newPoints,
        totalEarned: dto.points > 0 ? loyalty.totalEarned + dto.points : loyalty.totalEarned,
        totalRedeemed: dto.points < 0 ? loyalty.totalRedeemed + Math.abs(dto.points) : loyalty.totalRedeemed,
      },
    });

    // Créer l'historique
    await this.prisma.loyaltyHistory.create({
      data: {
        customerId,
        programId: program.id,
        type: LoyaltyActionType.ADJUSTED,
        points: dto.points,
        description: dto.description || `Ajustement manuel par le marchand`,
      },
    });

    this.logger.log(`Ajustement de ${dto.points} points pour client ${customerId} (tenant ${tenantId})`);

    return updated;
  }

  // ─── ATTRIBUTION AUTOMATIQUE DE POINTS ──────────────────────────────────────

  /**
   * Attribuer des points après une commande DELIVERED
   */
  async awardPointsForOrder(tenantId: string, orderId: string, orderAmount: number, customerId?: string) {
    if (!customerId) return;

    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { tenantId },
    });

    if (!program || !program.isEnabled) return;

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) return;

    // Calculer les points (1 TND = X points selon config)
    const points = Math.floor(Number(orderAmount) * Number(program.pointsPerDinar));
    if (points <= 0) return;

    // Récupérer ou créer le profil fidélité
    let loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { customerId },
    });

    if (!loyalty) {
      loyalty = await this.prisma.customerLoyalty.create({
        data: {
          customerId,
          programId: program.id,
          tier: this.calculateTier(customer.totalSpent, program),
        },
      });
    }

    // Mettre à jour les points
    const updated = await this.prisma.customerLoyalty.update({
      where: { customerId },
      data: {
        points: loyalty.points + points,
        totalEarned: loyalty.totalEarned + points,
        tier: this.calculateTier(customer.totalSpent, program),
      },
    });

    // Créer l'historique
    await this.prisma.loyaltyHistory.create({
      data: {
        customerId,
        programId: program.id,
        type: LoyaltyActionType.EARNED_PURCHASE,
        points,
        orderId,
        description: `Commande ${orderId} - ${orderAmount.toFixed(2)} TND`,
      },
    });

    this.logger.log(`${points} points attribués au client ${customerId} pour commande ${orderId}`);

    return updated;
  }

  /**
   * Attribuer des points de bienvenue au premier achat
   */
  async awardWelcomePoints(tenantId: string, customerId: string) {
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { tenantId },
    });

    if (!program || !program.isEnabled || program.welcomePoints <= 0) return;

    // Vérifier qu'on n'a pas déjà donné les points de bienvenue
    const existing = await this.prisma.loyaltyHistory.findFirst({
      where: {
        customerId,
        programId: program.id,
        type: LoyaltyActionType.EARNED_WELCOME,
      },
    });

    if (existing) return;

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) return;

    // Créer ou récupérer le profil fidélité
    let loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { customerId },
    });

    if (!loyalty) {
      loyalty = await this.prisma.customerLoyalty.create({
        data: {
          customerId,
          programId: program.id,
          points: program.welcomePoints,
          totalEarned: program.welcomePoints,
          tier: this.calculateTier(customer.totalSpent, program),
        },
      });
    } else {
      await this.prisma.customerLoyalty.update({
        where: { customerId },
        data: {
          points: loyalty.points + program.welcomePoints,
          totalEarned: loyalty.totalEarned + program.welcomePoints,
        },
      });
    }

    // Historique
    await this.prisma.loyaltyHistory.create({
      data: {
        customerId,
        programId: program.id,
        type: LoyaltyActionType.EARNED_WELCOME,
        points: program.welcomePoints,
        description: `Bonus de bienvenue`,
      },
    });

    this.logger.log(`${program.welcomePoints} points de bienvenue attribués à ${customerId}`);
  }

  /**
   * Utiliser des points pour obtenir une réduction
   */
  async redeemPoints(tenantId: string, customerId: string): Promise<{ discountAmount: number; pointsUsed: number }> {
    const program = await this.getProgram(tenantId);
    if (!program.isEnabled) {
      throw new BadRequestException('Le programme de fidélité n\'est pas activé');
    }

    const loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { customerId },
    });

    if (!loyalty) {
      throw new NotFoundException('Aucun compte de fidélité trouvé');
    }

    if (loyalty.points < program.rewardThreshold) {
      throw new BadRequestException(
        `Vous avez ${loyalty.points} points mais ${program.rewardThreshold} sont requis pour une récompense`,
      );
    }

    // Calculer combien de fois on peut échanger
    const redemptions = Math.floor(loyalty.points / program.rewardThreshold);
    const pointsUsed = redemptions * program.rewardThreshold;
    const discountAmount = Number(program.rewardValue) * redemptions;

    // Déduire les points
    await this.prisma.customerLoyalty.update({
      where: { customerId },
      data: {
        points: loyalty.points - pointsUsed,
        totalRedeemed: loyalty.totalRedeemed + pointsUsed,
      },
    });

    // Historique
    await this.prisma.loyaltyHistory.create({
      data: {
        customerId,
        programId: program.id,
        type: LoyaltyActionType.REDEEMED_DISCOUNT,
        points: -pointsUsed,
        description: `Échange de ${pointsUsed} points contre ${discountAmount.toFixed(2)} TND`,
      },
    });

    this.logger.log(`Client ${customerId} a échangé ${pointsUsed} points contre ${discountAmount} TND`);

    return { discountAmount, pointsUsed };
  }

  // ─── DASHBOARD & ANALYTICS ──────────────────────────────────────────────────

  async getTenantStats(tenantId: string) {
    const program = await this.getProgram(tenantId);

    const [totalCustomers, activeCustomers, totalPointsInCirculation, totalPointsRedeemed, topCustomers] =
      await Promise.all([
        this.prisma.customerLoyalty.count({
          where: { programId: program.id },
        }),
        this.prisma.customerLoyalty.count({
          where: { programId: program.id, points: { gt: 0 } },
        }),
        this.prisma.customerLoyalty.aggregate({
          where: { programId: program.id },
          _sum: { points: true },
        }),
        this.prisma.customerLoyalty.aggregate({
          where: { programId: program.id },
          _sum: { totalRedeemed: true },
        }),
        this.prisma.customerLoyalty.findMany({
          where: { programId: program.id },
          orderBy: { points: 'desc' },
          take: 10,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                totalSpent: true,
              },
            },
          },
        }),
      ]);

    // Répartition par tier
    const tierBreakdown = await this.prisma.customerLoyalty.groupBy({
      by: ['tier'],
      where: { programId: program.id },
      _count: true,
    });

    return {
      program,
      totalCustomers,
      activeCustomers,
      totalPointsInCirculation: totalPointsInCirculation._sum.points || 0,
      totalPointsRedeemed: totalPointsRedeemed._sum.totalRedeemed || 0,
      tierBreakdown,
      topCustomers,
    };
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private calculateTier(totalSpent: any, program: any): LoyaltyTier {
    const spent = Number(totalSpent);
    if (spent >= Number(program.platinumThreshold)) return LoyaltyTier.PLATINUM;
    if (spent >= Number(program.goldThreshold)) return LoyaltyTier.GOLD;
    if (spent >= Number(program.silverThreshold)) return LoyaltyTier.SILVER;
    return LoyaltyTier.BRONZE;
  }
}
