import { CatalogueService } from './catalogue.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoriesDto } from './dto/get-categories.dto';
import { AddCategoryIconDto } from './dto/add-category-icon.dto';
import { GetCategoryIconsDto } from './dto/get-category-icons.dto';
import { Category } from '../../generated/prisma';
export declare class CatalogueController {
    private readonly catalogueService;
    constructor(catalogueService: CatalogueService);
    getCategories(getCategoriesDto: GetCategoriesDto): Promise<{
        categories: string[];
    }>;
    addCategory(createCategoryDto: CreateCategoryDto): Promise<Category>;
    addCategoryIcon(addCategoryIconDto: AddCategoryIconDto): Promise<Category>;
    getCategoryIcons(getCategoryIconsDto: GetCategoryIconsDto): Promise<{
        [categoryName: string]: string | null;
    }>;
}
