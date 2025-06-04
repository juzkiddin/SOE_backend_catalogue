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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogueService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const library_1 = require("../../generated/prisma/runtime/library");
let CatalogueService = class CatalogueService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCategories(restaurantId) {
        if (!restaurantId) {
            throw new common_1.InternalServerErrorException('Restaurant ID is required to fetch categories.');
        }
        try {
            const categories = await this.prisma.category.findMany({
                where: {
                    restaurantId: restaurantId,
                },
                orderBy: {
                    name: 'asc',
                },
            });
            return { categories: categories.map((cat) => cat.name) };
        }
        catch (error) {
            console.error(`Error fetching categories for restaurant ${restaurantId}:`, error);
            throw new common_1.InternalServerErrorException('Could not fetch categories.');
        }
    }
    async addCategory(categoryName, restaurantId) {
        try {
            const newCategory = await this.prisma.category.create({
                data: {
                    name: categoryName,
                    restaurantId: restaurantId,
                },
            });
            return newCategory;
        }
        catch (error) {
            if (error instanceof library_1.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`Category '${categoryName}' already exists for this restaurant.`);
            }
            console.error(`Error adding category '${categoryName}' for restaurant ${restaurantId}:`, error);
            throw new common_1.InternalServerErrorException('Could not add category.');
        }
    }
    async addCategoryIcon(restaurantId, categoryName, iconName) {
        try {
            const category = await this.prisma.category.findUnique({
                where: {
                    name_restaurantId: {
                        name: categoryName,
                        restaurantId: restaurantId,
                    },
                },
            });
            if (!category) {
                throw new common_1.NotFoundException(`Category '${categoryName}' not found for restaurant ID '${restaurantId}'.`);
            }
            const updatedCategory = await this.prisma.category.update({
                where: {
                    id: category.id,
                },
                data: {
                    iconName: iconName,
                },
            });
            return updatedCategory;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            console.error(`Error adding icon '${iconName}' to category '${categoryName}' for restaurant ${restaurantId}:`, error);
            throw new common_1.InternalServerErrorException('Could not add category icon.');
        }
    }
    async getCategoryIcons(restaurantId) {
        if (!restaurantId) {
            throw new common_1.InternalServerErrorException('Restaurant ID is required to fetch category icons.');
        }
        try {
            const categories = await this.prisma.category.findMany({
                where: {
                    restaurantId: restaurantId,
                },
                orderBy: {
                    name: 'asc',
                },
            });
            const categoryIcons = {};
            for (const cat of categories) {
                categoryIcons[cat.name] = cat.iconName;
            }
            return categoryIcons;
        }
        catch (error) {
            console.error(`Error fetching category icons for restaurant ${restaurantId}:`, error);
            throw new common_1.InternalServerErrorException('Could not fetch category icons.');
        }
    }
};
exports.CatalogueService = CatalogueService;
exports.CatalogueService = CatalogueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CatalogueService);
//# sourceMappingURL=catalogue.service.js.map