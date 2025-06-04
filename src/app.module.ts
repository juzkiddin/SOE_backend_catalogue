import { Module } from '@nestjs/common';
import { CatalogueModule } from './catalogue/catalogue.module';

@Module({
  imports: [CatalogueModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
