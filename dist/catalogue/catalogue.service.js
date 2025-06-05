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
const prisma_1 = require("../../generated/prisma");
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
    async addCategoryItem(restaurantId, categoryName, itemName, description, price, imageUrl, availStatus, portionAvail) {
        const category = await this.prisma.category.findUnique({
            where: { name_restaurantId: { name: categoryName, restaurantId } },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category '${categoryName}' not found for restaurant ID '${restaurantId}'.`);
        }
        if (!portionAvail && (price === undefined || price === null)) {
            throw new common_1.BadRequestException('Price is mandatory when portions are not available.');
        }
        if (portionAvail && price !== undefined && price !== null) {
        }
        try {
            const newItem = await this.prisma.item.create({
                data: {
                    name: itemName,
                    description,
                    price: portionAvail ? null : price,
                    imageUrl,
                    availStatus,
                    portionAvail,
                    categoryId: category.id,
                    restaurantId,
                },
            });
            return newItem;
        }
        catch (error) {
            if (error instanceof prisma_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`Item '${itemName}' already exists in category '${categoryName}'.`);
            }
            console.error(`Error adding item '${itemName}' to category '${categoryName}' for restaurant ${restaurantId}:`, error);
            throw new common_1.InternalServerErrorException('Could not add item to category.');
        }
    }
    async editPortion(restaurantId, itemId, portionName, portionPrice) {
        const item = await this.prisma.item.findUnique({
            where: { id: itemId },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Item with ID '${itemId}' not found.`);
        }
        if (item.restaurantId !== restaurantId) {
            throw new common_1.BadRequestException(`Item with ID '${itemId}' does not belong to restaurant ID '${restaurantId}'.`);
        }
        if (!item.portionAvail) {
            throw new common_1.BadRequestException(`Portions are not enabled for item '${item.name}' (ID: ${itemId}).`);
        }
        try {
            const existingPortion = await this.prisma.portion.findUnique({
                where: { name_itemId: { name: portionName, itemId: itemId } },
            });
            if (existingPortion) {
                return this.prisma.portion.update({
                    where: { id: existingPortion.id },
                    data: { price: portionPrice },
                });
            }
            else {
                return this.prisma.portion.create({
                    data: {
                        name: portionName,
                        price: portionPrice,
                        itemId: itemId,
                    },
                });
            }
        }
        catch (error) {
            console.error(`Error editing portion '${portionName}' for item ID '${itemId}' in restaurant ${restaurantId}:`, error);
            throw new common_1.InternalServerErrorException('Could not edit portion.');
        }
    }
    async editItemAttribute(restaurantId, itemId, attributeName, attributeValue) {
        const item = await this.prisma.item.findUnique({
            where: { id: itemId },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Item with ID '${itemId}' not found.`);
        }
        if (item.restaurantId !== restaurantId) {
            throw new common_1.BadRequestException(`Item with ID '${itemId}' does not belong to restaurant ID '${restaurantId}'.`);
        }
        const dataToUpdate = {};
        switch (attributeName) {
            case 'name':
                if (typeof attributeValue !== 'string' || attributeValue.trim() === '') {
                    throw new common_1.BadRequestException('Item name must be a non-empty string.');
                }
                dataToUpdate.name = attributeValue;
                break;
            case 'description':
                dataToUpdate.description = typeof attributeValue === 'string' ? attributeValue : null;
                break;
            case 'price':
                if (item.portionAvail && (attributeValue !== null && attributeValue !== undefined)) {
                    throw new common_1.BadRequestException('Cannot set base price directly when portions are available. Manage portion prices instead or set portionAvail to false.');
                }
                if (!item.portionAvail && (typeof attributeValue !== 'number' || attributeValue < 0)) {
                    throw new common_1.BadRequestException('Price must be a non-negative number when portions are not available.');
                }
                dataToUpdate.price = attributeValue;
                break;
            case 'imageUrl':
                if (attributeValue !== null && attributeValue !== undefined && (typeof attributeValue !== 'string' || !attributeValue.startsWith('http'))) {
                    throw new common_1.BadRequestException('Image URL must be a valid URL or null.');
                }
                dataToUpdate.imageUrl = attributeValue;
                break;
            case 'availStatus':
                if (typeof attributeValue !== 'boolean') {
                    throw new common_1.BadRequestException('Availability status must be a boolean.');
                }
                dataToUpdate.availStatus = attributeValue;
                break;
            case 'portionAvail':
                if (typeof attributeValue !== 'boolean') {
                    throw new common_1.BadRequestException('Portion availability must be a boolean.');
                }
                dataToUpdate.portionAvail = attributeValue;
                if (attributeValue === false && (item.price === null || item.price === undefined)) {
                    throw new common_1.BadRequestException('If disabling portions, a base price for the item must be set. Please update price as well.');
                }
                if (attributeValue === true) {
                    dataToUpdate.price = null;
                }
                break;
            default:
                throw new common_1.BadRequestException(`Attribute '${attributeName}' is not editable or recognized.`);
        }
        if (Object.keys(dataToUpdate).length === 0) {
            throw new common_1.BadRequestException('No valid attributes provided for update.');
        }
        try {
            return await this.prisma.item.update({
                where: { id: itemId },
                data: dataToUpdate,
            });
        }
        catch (error) {
            if (error instanceof prisma_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`Update failed due to unique constraint violation (e.g., item '${dataToUpdate.name}' already exists in its category).`);
            }
            console.error(`Error updating attribute '${attributeName}' for item ID '${itemId}':`, error);
            throw new common_1.InternalServerErrorException('Could not update item attribute.');
        }
    }
    async getCategoryItems(restaurantId, categoryName) {
        const category = await this.prisma.category.findUnique({
            where: { name_restaurantId: { name: categoryName, restaurantId } },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category '${categoryName}' not found for restaurant ID '${restaurantId}'.`);
        }
        const items = await this.prisma.item.findMany({
            where: {
                categoryId: category.id,
                restaurantId: restaurantId,
            },
            include: {
                portions: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
        return items.map((item) => {
            const itemResponse = {
                id: item.id,
                name: item.name,
                description: item.description,
                category: categoryName,
                imageUrl: item.imageUrl,
                availStatus: item.availStatus,
                portionAvail: item.portionAvail,
            };
            if (item.portionAvail && item.portions.length > 0) {
                itemResponse.price = Math.min(...item.portions.map(p => p.price));
                itemResponse.portionPrices = item.portions.reduce((acc, p) => {
                    acc[p.name] = p.price;
                    return acc;
                }, {});
            }
            else {
                itemResponse.price = item.price;
            }
            return itemResponse;
        });
    }
};
exports.CatalogueService = CatalogueService;
exports.CatalogueService = CatalogueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CatalogueService);
//# sourceMappingURL=catalogue.service.js.map