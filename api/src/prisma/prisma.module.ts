import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()  // disponible dans tous les modules sans import explicite
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
