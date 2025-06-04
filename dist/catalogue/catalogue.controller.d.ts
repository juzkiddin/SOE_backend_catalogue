import { CatalogueService } from './catalogue.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoriesDto } from './dto/get-categories.dto';
import { Category } from '../../generated/prisma';
export declare class CatalogueController {
    private readonly catalogueService;
    constructor(catalogueService: CatalogueService);
    getCategories(getCategoriesDto: GetCategoriesDto): Promise<{
        categories: string[];
    }>;
    addCategory(createCategoryDto: CreateCategoryDto): Promise<Category>;
}
