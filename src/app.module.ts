import { Module } from '@nestjs/common';
import { CatalogueModule } from './catalogue/catalogue.module';
import { SessionModule } from './session/session.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from 'nestjs-throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      ttl: 60000, // Time to live in milliseconds (60 seconds)
      limit: 100, // Max 100 requests per minute for a given key (IP by default)
    }),
    CatalogueModule,
    SessionModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
