import { Module } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';
import { CatalogueController } from './catalogue.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CatalogueController],
  providers: [CatalogueService, PrismaService],
})
export class CatalogueModule { }
