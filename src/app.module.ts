import { Module } from '@nestjs/common';
import { CatalogueModule } from './catalogue/catalogue.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [CatalogueModule, SessionModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
