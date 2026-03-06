import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * RolesGuard - Contrôle d'accès basé sur les rôles (RBAC)
 *
 * Vérifie que l'utilisateur authentifié possède l'un des rôles requis
 * pour accéder à un endpoint protégé par @Roles()
 *
 * Utilisation:
 * @Roles(UserRole.OWNER)
 * @Roles(UserRole.OWNER, UserRole.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupérer les rôles requis définis par @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucun rôle requis, autoriser l'accès
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Récupérer l'utilisateur depuis la requête (ajouté par JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // Vérifier si l'utilisateur a l'un des rôles requis
    return requiredRoles.some((role) => user.role === role);
  }
}
