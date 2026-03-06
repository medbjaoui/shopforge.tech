-- AlterEnum: Add MANAGER role to UserRole
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- CreateTable: TenantInvitation
CREATE TABLE "tenant_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_invitations_token_key" ON "tenant_invitations"("token");
CREATE INDEX "tenant_invitations_tenantId_idx" ON "tenant_invitations"("tenantId");
CREATE INDEX "tenant_invitations_email_idx" ON "tenant_invitations"("email");
CREATE INDEX "tenant_invitations_token_idx" ON "tenant_invitations"("token");

-- AddForeignKey
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
