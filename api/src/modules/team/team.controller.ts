import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Tenant, UserRole } from '@prisma/client';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Controller('team')
export class TeamController {
  constructor(private teamService: TeamService) {}

  // ── Get team members ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Get('members')
  getMembers(@CurrentTenant() tenant: Tenant) {
    return this.teamService.getTeamMembers(tenant.id);
  }

  // ── Get pending invitations ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('invitations')
  getInvitations(@CurrentTenant() tenant: Tenant) {
    return this.teamService.getPendingInvitations(tenant.id);
  }

  // ── Invite member ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('invite')
  inviteMember(
    @CurrentTenant() tenant: Tenant,
    @Req() req: any,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamService.inviteMember(tenant.id, req.user.userId, dto);
  }

  // ── Accept invitation (public) ─────────────────────────────────────────────

  @Public()
  @Post('accept-invitation')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.teamService.acceptInvitation(dto);
  }

  // ── Update member ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch('members/:id')
  updateMember(
    @CurrentTenant() tenant: Tenant,
    @Param('id') memberId: string,
    @Req() req: any,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.teamService.updateMember(tenant.id, memberId, req.user.userId, dto);
  }

  // ── Remove member ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete('members/:id')
  removeMember(
    @CurrentTenant() tenant: Tenant,
    @Param('id') memberId: string,
    @Req() req: any,
  ) {
    return this.teamService.removeMember(tenant.id, memberId, req.user.userId);
  }

  // ── Cancel invitation ──────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete('invitations/:id')
  cancelInvitation(
    @CurrentTenant() tenant: Tenant,
    @Param('id') invitationId: string,
    @Req() req: any,
  ) {
    return this.teamService.cancelInvitation(tenant.id, invitationId, req.user.userId);
  }
}
