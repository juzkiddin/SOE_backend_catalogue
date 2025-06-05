import { Module } from '@nestjs/common';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SessionController],
  providers: [SessionService, PrismaService]
})
export class SessionModule { }
