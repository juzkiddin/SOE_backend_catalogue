import { PrismaService } from '../prisma.service';
import { Category } from '../../generated/prisma';
export declare class CatalogueService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCategories(restaurantId: string): Promise<{
        categories: string[];
    }>;
    addCategory(categoryName: string, restaurantId: string): Promise<Category>;
}
