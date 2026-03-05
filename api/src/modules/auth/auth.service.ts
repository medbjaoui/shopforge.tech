import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WalletService } from '../wallet/wallet.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const RESERVED_SLUGS = [
  'api', 'app', 'admin', 'www', 'mail', 'ftp',
  'static', 'cdn', 'assets', 'blog', 'help', 'support',
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
    private walletService: WalletService,
  ) {}

  async register(dto: RegisterDto) {
    // Vérifier slug réservé
    if (RESERVED_SLUGS.includes(dto.storeSlug)) {
      throw new BadRequestException(`Le slug "${dto.storeSlug}" est réservé`);
    }

    // Vérifier si le slug existe déjà
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.storeSlug },
    });
    if (existingTenant) {
      throw new ConflictException('Ce nom de store est déjà pris');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Résoudre le parrain si un code de parrainage est fourni
    let referredById: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.prisma.tenant.findUnique({
        where: { referralCode: dto.referralCode.toUpperCase(), isActive: true },
        select: { id: true },
      });
      if (!referrer) {
        throw new BadRequestException('Code de parrainage invalide');
      }
      referredById = referrer.id;
    }

    // Générer un code de parrainage unique pour ce nouveau tenant
    const generateCode = () => randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    let newReferralCode: string;
    let attempts = 0;
    do {
      newReferralCode = generateCode();
      const exists = await this.prisma.tenant.findUnique({ where: { referralCode: newReferralCode } });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    // Créer tenant + owner en une transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.storeName,
          slug: dto.storeSlug,
          onboardingCompleted: false, // nouveau tenant → doit compléter l'onboarding
          isPublished: false,
          // Analytics — acquisition tracking
          acquisitionSource: dto.utmSource ? 'ads' : referredById ? 'referral' : 'organic',
          utmSource: dto.utmSource ?? null,
          utmMedium: dto.utmMedium ?? null,
          utmCampaign: dto.utmCampaign ?? null,
          lastActivityAt: new Date(),
          // Parrainage
          referralCode: newReferralCode,
          referredById: referredById ?? null,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'OWNER',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    const tokens = await this.generateTokens(result.user.id, result.tenant.id);

    // C2 — Solde de bienvenu wallet (non-bloquant)
    this.walletService.initWelcomeCredit(result.tenant.id)
      .catch((err) => this.logger.warn('Welcome credit failed', err));

    // C2b — Créer l'enregistrement de récompense parrainage (PENDING) si parrain
    if (referredById) {
      const rewardAmount = 10; // TND — TODO: read from PlatformConfig if needed
      this.prisma.referralReward.create({
        data: {
          referrerId: referredById,
          referredId: result.tenant.id,
          amount: rewardAmount,
          status: 'PENDING',
        },
      }).catch((err) => this.logger.warn('Referral reward creation failed', err));
    }

    // C3 — Email de bienvenue (non-bloquant)
    this.emailService.sendWelcomeEmail(
      result.user.email,
      result.user.firstName ?? 'Marchand',
      result.tenant.name,
      result.tenant.slug,
    ).catch((err) => this.logger.warn('Welcome email failed', err));

    return {
      message: 'Store créé avec succès',
      store: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        theme: result.tenant.theme,
        onboardingCompleted: result.tenant.onboardingCompleted,
        isPublished: result.tenant.isPublished,
        url: `${result.tenant.slug}.shopforge.tech`,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        role: result.user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto, tenantFromHeader?: { id: string } | null) {
    // Résolution du tenant : header Nginx (prod) ou storeSlug dans le body (dev)
    let tenantId: string | undefined = tenantFromHeader?.id;

    if (!tenantId && dto.storeSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.storeSlug, isActive: true },
      });
      if (!tenant) throw new UnauthorizedException('Store introuvable');
      tenantId = tenant.id;
    }

    if (!tenantId) {
      throw new UnauthorizedException('Store non identifié');
    }

    const user = await this.prisma.user.findUnique({
      where: { email_tenantId: { email: dto.email, tenantId } },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tokens = await this.generateTokens(user.id, tenantId);

    // Track last login + tenant activity (non-blocking)
    const now = new Date();
    this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } }).catch(() => {});
    this.prisma.tenant.update({ where: { id: tenantId }, data: { lastActivityAt: now } }).catch(() => {});

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      store: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        theme: user.tenant.theme,
        onboardingCompleted: user.tenant.onboardingCompleted,
        isPublished: user.tenant.isPublished,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    // Rotation : supprimer l'ancien, créer un nouveau
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(stored.user.id, stored.user.tenantId);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Déconnecté avec succès' };
  }

  // ─── CHANGE PASSWORD ────────────────────────────────────────────────────────

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Ancien mot de passe incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Invalider tous les refresh tokens (force re-login)
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Mot de passe modifié avec succès' };
  }

  // ─── UPDATE PROFILE ─────────────────────────────────────────────────────────

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    const update: any = {};
    if (data.firstName) update.firstName = data.firstName;
    if (data.lastName) update.lastName = data.lastName;

    if (Object.keys(update).length === 0) {
      throw new BadRequestException('Aucun champ à modifier');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: update,
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    return user;
  }

  // ─── FORGOT PASSWORD ────────────────────────────────────────────────────────

  async forgotPassword(email: string, storeSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true },
    });
    if (!tenant) {
      // Ne pas révéler si le store existe
      return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
    }

    const user = await this.prisma.user.findUnique({
      where: { email_tenantId: { email, tenantId: tenant.id } },
    });
    if (!user) {
      return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
    }

    // Supprimer les anciens tokens de reset pour cet email
    await this.prisma.passwordResetToken.deleteMany({
      where: { email, tenantId: tenant.id },
    });

    // Générer un token sécurisé
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1h

    await this.prisma.passwordResetToken.create({
      data: { token, email, tenantId: tenant.id, expiresAt },
    });

    // Envoyer l'email (non-bloquant)
    const resetUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;
    this.emailService.sendPasswordResetEmail(
      email,
      user.firstName ?? 'Marchand',
      tenant.name,
      resetUrl,
    ).catch((err) => this.logger.warn('Password reset email failed', err));

    return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
  }

  // ─── RESET PASSWORD ─────────────────────────────────────────────────────────

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: resetToken.email, tenantId: resetToken.tenantId ?? undefined },
    });
    if (!user) {
      throw new BadRequestException('Compte introuvable');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    return { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' };
  }

  private async generateTokens(userId: string, tenantId: string) {
    const payload = { sub: userId, tenantId };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
