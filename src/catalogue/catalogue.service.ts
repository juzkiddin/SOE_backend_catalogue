import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
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
}
