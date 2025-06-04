import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Category } from '../../generated/prisma'; // Using Category type from generated client
import { PrismaClientKnownRequestError } from '../../generated/prisma/runtime/library'; // Specific import for error type

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) { }

  async getCategories(restaurantId: string): Promise<{ categories: string[] }> {
    if (!restaurantId) {
      throw new InternalServerErrorException('Restaurant ID is required to fetch categories.');
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
    } catch (error) {
      console.error(`Error fetching categories for restaurant ${restaurantId}:`, error);
      throw new InternalServerErrorException('Could not fetch categories.');
    }
  }

  async addCategory(categoryName: string, restaurantId: string): Promise<Category> {
    try {
      const newCategory = await this.prisma.category.create({
        data: {
          name: categoryName,
          restaurantId: restaurantId,
        },
      });
      return newCategory;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        // P2002 error code indicates a unique constraint violation.
        // The unique constraint is on [name, restaurantId].
        throw new ConflictException(`Category '${categoryName}' already exists for this restaurant.`);
      }
      console.error(`Error adding category '${categoryName}' for restaurant ${restaurantId}:`, error);
      throw new InternalServerErrorException('Could not add category.');
    }
  }

  async addCategoryIcon(restaurantId: string, categoryName: string, iconName: string): Promise<Category> {
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
        throw new NotFoundException(`Category '${categoryName}' not found for restaurant ID '${restaurantId}'.`);
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error adding icon '${iconName}' to category '${categoryName}' for restaurant ${restaurantId}:`, error);
      throw new InternalServerErrorException('Could not add category icon.');
    }
  }

  async getCategoryIcons(restaurantId: string): Promise<{ [categoryName: string]: string | null }> {
    if (!restaurantId) {
      throw new InternalServerErrorException('Restaurant ID is required to fetch category icons.');
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

      const categoryIcons: { [categoryName: string]: string | null } = {};
      for (const cat of categories) {
        categoryIcons[cat.name] = cat.iconName; // cat.iconName can be null
      }
      return categoryIcons;
    } catch (error) {
      console.error(`Error fetching category icons for restaurant ${restaurantId}:`, error);
      throw new InternalServerErrorException('Could not fetch category icons.');
    }
  }
}
