import { Controller, Get, Post, Body, ValidationPipe, UsePipes, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoriesDto } from './dto/get-categories.dto';
import { AddCategoryIconDto } from './dto/add-category-icon.dto';
import { GetCategoryIconsDto } from './dto/get-category-icons.dto';
import { AddCategoryItemDto } from './dto/add-category-item.dto';
import { EditPortionDto } from './dto/edit-portion.dto';
import { EditItemAttributeDto } from './dto/edit-item-attribute.dto';
import { GetCategoryItemsDto } from './dto/get-category-items.dto';
import { Category, Item, Portion } from '../../generated/prisma';

@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) { }

  @Post('categories')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCategories(@Body() getCategoriesDto: GetCategoriesDto): Promise<{ categories: string[] }> {
    return this.catalogueService.getCategories(getCategoriesDto.restaurantId);
  }

  @Post('addcategories')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async addCategory(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.catalogueService.addCategory(createCategoryDto.name, createCategoryDto.restaurantId);
  }

  @Post('addcategoryicons')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async addCategoryIcon(@Body() addCategoryIconDto: AddCategoryIconDto): Promise<Category> {
    return this.catalogueService.addCategoryIcon(addCategoryIconDto.restaurantId, addCategoryIconDto.categoryName, addCategoryIconDto.iconName);
  }

  @Post('categoryicons')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCategoryIcons(@Body() getCategoryIconsDto: GetCategoryIconsDto): Promise<{ [categoryName: string]: string | null }> {
    return this.catalogueService.getCategoryIcons(getCategoryIconsDto.restaurantId);
  }

  @Post('addcategoryitem')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async addCategoryItem(@Body() dto: AddCategoryItemDto): Promise<Item> {
    return this.catalogueService.addCategoryItem(
      dto.restaurantId,
      dto.categoryName,
      dto.itemName,
      dto.description,
      dto.price,
      dto.imageUrl,
      dto.availStatus,
      dto.portionAvail,
    );
  }

  @Post('editportion')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async editPortion(@Body() dto: EditPortionDto): Promise<Portion> {
    return this.catalogueService.editPortion(
      dto.restaurantId,
      dto.itemId,
      dto.portionName,
      dto.portionPrice,
    );
  }

  @Post('edititemattribute')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async editItemAttribute(@Body() dto: EditItemAttributeDto): Promise<Item> {
    return this.catalogueService.editItemAttribute(
      dto.restaurantId,
      dto.itemId,
      dto.attributeName,
      dto.attributeValue,
    );
  }

  @Post('categoryitems')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getCategoryItems(@Body() dto: GetCategoryItemsDto): Promise<any[]> {
    return this.catalogueService.getCategoryItems(dto.restaurantId, dto.categoryName);
  }
}
