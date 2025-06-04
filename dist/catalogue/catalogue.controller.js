"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogueController = void 0;
const common_1 = require("@nestjs/common");
const catalogue_service_1 = require("./catalogue.service");
const create_category_dto_1 = require("./dto/create-category.dto");
const get_categories_dto_1 = require("./dto/get-categories.dto");
const add_category_icon_dto_1 = require("./dto/add-category-icon.dto");
const get_category_icons_dto_1 = require("./dto/get-category-icons.dto");
let CatalogueController = class CatalogueController {
    catalogueService;
    constructor(catalogueService) {
        this.catalogueService = catalogueService;
    }
    async getCategories(getCategoriesDto) {
        return this.catalogueService.getCategories(getCategoriesDto.restaurantId);
    }
    async addCategory(createCategoryDto) {
        return this.catalogueService.addCategory(createCategoryDto.name, createCategoryDto.restaurantId);
    }
    async addCategoryIcon(addCategoryIconDto) {
        return this.catalogueService.addCategoryIcon(addCategoryIconDto.restaurantId, addCategoryIconDto.categoryName, addCategoryIconDto.iconName);
    }
    async getCategoryIcons(getCategoryIconsDto) {
        return this.catalogueService.getCategoryIcons(getCategoryIconsDto.restaurantId);
    }
};
exports.CatalogueController = CatalogueController;
__decorate([
    (0, common_1.Post)('categories'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_categories_dto_1.GetCategoriesDto]),
    __metadata("design:returntype", Promise)
], CatalogueController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)('addcategories'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_category_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], CatalogueController.prototype, "addCategory", null);
__decorate([
    (0, common_1.Post)('addcategoryicons'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_category_icon_dto_1.AddCategoryIconDto]),
    __metadata("design:returntype", Promise)
], CatalogueController.prototype, "addCategoryIcon", null);
__decorate([
    (0, common_1.Post)('categoryicons'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_category_icons_dto_1.GetCategoryIconsDto]),
    __metadata("design:returntype", Promise)
], CatalogueController.prototype, "getCategoryIcons", null);
exports.CatalogueController = CatalogueController = __decorate([
    (0, common_1.Controller)('catalouge'),
    __metadata("design:paramtypes", [catalogue_service_1.CatalogueService])
], CatalogueController);
//# sourceMappingURL=catalogue.controller.js.map