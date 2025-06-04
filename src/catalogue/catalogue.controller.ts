import { Controller, Get, Post, Body, ValidationPipe, UsePipes, Query, BadRequestException } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoriesDto } from './dto/get-categories.dto';
import { Category } from '../../generated/prisma';

@Controller('catalouge')
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
}
