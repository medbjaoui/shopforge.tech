import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  // ── List team members ──────────────────────────────────────────────────────

  async getTeamMembers(tenantId: string) {
    const members = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, MANAGER, STAFF
        { createdAt: 'asc' },
      ],
    });

    return members;
  }

  // ── List pending invitations ───────────────────────────────────────────────

  async getPendingInvitations(tenantId: string) {
    const invitations = await this.prisma.tenantInvitation.findMany({
      where: {
        tenantId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        invitedBy: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations;
  }

  // ── Invite member ──────────────────────────────────────────────────────────

  async inviteMember(tenantId: string, invitedById: string, dto: InviteMemberDto) {
    // Verify inviter has permission (OWNER or ADMIN only)
    const inviter = await this.prisma.user.findFirst({
      where: { id: invitedById, tenantId },
    });

    const allowedRoles: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];
    if (!inviter || !allowedRoles.includes(inviter.role)) {
      throw new ForbiddenException('Seuls les propriétaires et admins peuvent inviter des membres');
    }

    // Check if user already exists in this tenant
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });

    if (existing) {
      throw new ConflictException('Cet utilisateur fait déjà partie de l\'équipe');
    }

    // Check if there's already a pending invitation
    const pendingInvite = await this.prisma.tenantInvitation.findFirst({
      where: {
        email: dto.email,
        tenantId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvite) {
      throw new ConflictException('Une invitation est déjà en attente pour cet email');
    }

    // OWNER role can only be assigned by existing OWNER
    if (dto.role === UserRole.OWNER && inviter.role !== UserRole.OWNER) {
      throw new ForbiddenException('Seul le propriétaire peut inviter un autre propriétaire');
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await this.prisma.tenantInvitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        token,
        tenantId,
        invitedBy: invitedById,
        expiresAt,
      },
    });

    // TODO: Send invitation email
    // await this.emailService.sendTeamInvitation(dto.email, token, inviter.firstName);

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitationLink: `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`,
      expiresAt: invitation.expiresAt,
    };
  }

  // ── Accept invitation ──────────────────────────────────────────────────────

  async acceptInvitation(dto: AcceptInvitationDto) {
    const invitation = await this.prisma.tenantInvitation.findUnique({
      where: { token: dto.token },
      include: { tenant: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation introuvable');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Cette invitation a déjà été acceptée');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Cette invitation a expiré');
    }

    // Check if user already exists
    const existing = await this.prisma.user.findFirst({
      where: { email: invitation.email, tenantId: invitation.tenantId },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur existe déjà avec cet email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user and mark invitation as accepted
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: invitation.role,
          tenantId: invitation.tenantId,
        },
      });

      await tx.tenantInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return newUser;
    });

    return {
      message: 'Compte créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: invitation.tenant.id,
        name: invitation.tenant.name,
        slug: invitation.tenant.slug,
      },
    };
  }

  // ── Update member ──────────────────────────────────────────────────────────

  async updateMember(tenantId: string, memberId: string, currentUserId: string, dto: UpdateMemberDto) {
    // Verify current user has permission
    const currentUser = await this.prisma.user.findFirst({
      where: { id: currentUserId, tenantId },
    });

    const allowedRoles: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Permission refusée');
    }

    // Get member to update
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, tenantId },
    });

    if (!member) {
      throw new NotFoundException('Membre introuvable');
    }

    // Can't modify OWNER unless you're OWNER
    if (member.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Seul le propriétaire peut modifier un autre propriétaire');
    }

    // Can't assign OWNER role unless you're OWNER
    if (dto.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Seul le propriétaire peut assigner le rôle OWNER');
    }

    // Can't modify yourself
    if (memberId === currentUserId) {
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre compte ici');
    }

    const updated = await this.prisma.user.update({
      where: { id: memberId },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return updated;
  }

  // ── Remove member ──────────────────────────────────────────────────────────

  async removeMember(tenantId: string, memberId: string, currentUserId: string) {
    // Verify current user has permission
    const currentUser = await this.prisma.user.findFirst({
      where: { id: currentUserId, tenantId },
    });

    const allowedRoles: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Permission refusée');
    }

    // Get member to remove
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, tenantId },
    });

    if (!member) {
      throw new NotFoundException('Membre introuvable');
    }

    // Can't remove OWNER
    if (member.role === UserRole.OWNER) {
      throw new ForbiddenException('Impossible de supprimer le propriétaire');
    }

    // Can't remove yourself
    if (memberId === currentUserId) {
      throw new BadRequestException('Vous ne pouvez pas vous supprimer vous-même');
    }

    await this.prisma.user.delete({
      where: { id: memberId },
    });

    return { message: 'Membre supprimé avec succès' };
  }

  // ── Cancel invitation ──────────────────────────────────────────────────────

  async cancelInvitation(tenantId: string, invitationId: string, currentUserId: string) {
    const currentUser = await this.prisma.user.findFirst({
      where: { id: currentUserId, tenantId },
    });

    const allowedRoles: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Permission refusée');
    }

    const invitation = await this.prisma.tenantInvitation.findFirst({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation introuvable');
    }

    await this.prisma.tenantInvitation.delete({
      where: { id: invitationId },
    });

    return { message: 'Invitation annulée' };
  }
}
