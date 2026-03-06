import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator @Roles() - Définir les rôles autorisés pour un endpoint
 *
 * Utilisation:
 * @Roles(UserRole.OWNER) - Seulement le propriétaire
 * @Roles(UserRole.OWNER, UserRole.ADMIN) - Propriétaire OU Admin
 * @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF) - Tous les rôles
 *
 * Doit être utilisé avec @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * Exemples:
 *
 * // Seulement OWNER peut modifier les paramètres
 * @Roles(UserRole.OWNER)
 * @Patch('me')
 * async updateSettings() { }
 *
 * // OWNER et ADMIN peuvent créer des produits
 * @Roles(UserRole.OWNER, UserRole.ADMIN)
 * @Post('products')
 * async createProduct() { }
 *
 * // Tous les rôles peuvent voir les commandes
 * @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
 * @Get('orders')
 * async listOrders() { }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
