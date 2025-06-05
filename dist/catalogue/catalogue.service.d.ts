import { PrismaService } from '../prisma.service';
import { Category, Item, Portion } from '../../generated/prisma';
export declare class CatalogueService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCategories(restaurantId: string): Promise<{
        categories: string[];
    }>;
    addCategory(categoryName: string, restaurantId: string): Promise<Category>;
    addCategoryIcon(restaurantId: string, categoryName: string, iconName: string): Promise<Category>;
    getCategoryIcons(restaurantId: string): Promise<{
        [categoryName: string]: string | null;
    }>;
    addCategoryItem(restaurantId: string, categoryName: string, itemName: string, description: string | undefined, price: number | undefined, imageUrl: string | undefined, availStatus: boolean, portionAvail: boolean): Promise<Item>;
    editPortion(restaurantId: string, itemId: number, portionName: string, portionPrice: number): Promise<Portion>;
    editItemAttribute(restaurantId: string, itemId: number, attributeName: string, attributeValue: any): Promise<Item>;
    getCategoryItems(restaurantId: string, categoryName: string): Promise<any[]>;
}
