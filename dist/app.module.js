"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const catalogue_module_1 = require("./catalogue/catalogue.module");
const session_module_1 = require("./session/session.module");
const config_1 = require("@nestjs/config");
const nestjs_throttler_1 = require("nestjs-throttler");
const core_1 = require("@nestjs/core");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            nestjs_throttler_1.ThrottlerModule.forRoot({
                ttl: 60000,
                limit: 100,
            }),
            catalogue_module_1.CatalogueModule,
            session_module_1.SessionModule
        ],
        controllers: [],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: nestjs_throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map