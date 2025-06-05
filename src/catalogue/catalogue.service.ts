import { Injectable, ConflictException, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Category, Item, Portion, Prisma } from '../../generated/prisma'; // Using Category, Item, Portion types from generated client
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

  // New methods for Items and Portions

  async addCategoryItem(
    restaurantId: string,
    categoryName: string,
    itemName: string,
    description: string | undefined,
    price: number | undefined,
    imageUrl: string | undefined,
    availStatus: boolean,
    portionAvail: boolean,
  ): Promise<Item> {
    const category = await this.prisma.category.findUnique({
      where: { name_restaurantId: { name: categoryName, restaurantId } },
    });

    if (!category) {
      throw new NotFoundException(`Category '${categoryName}' not found for restaurant ID '${restaurantId}'.`);
    }

    // DTO validation should handle price requirement based on portionAvail
    // but double check here or rely on DTO constraint
    if (!portionAvail && (price === undefined || price === null)) {
      throw new BadRequestException('Price is mandatory when portions are not available.');
    }
    if (portionAvail && price !== undefined && price !== null) {
      // If portions are available, the base price on item might be ignored or used as a default/display
      // For now, we allow it to be set, but it won't be used if portions exist for pricing typically.
    }

    try {
      const newItem = await this.prisma.item.create({
        data: {
          name: itemName,
          description,
          price: portionAvail ? null : price, // Store null if portions are available, actual price otherwise
          imageUrl,
          availStatus,
          portionAvail,
          categoryId: category.id,
          restaurantId, // Store restaurantId directly on item for easier queries
        },
      });
      return newItem;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // This catches unique constraint violations, e.g., if (name, categoryId) is not unique
        throw new ConflictException(`Item '${itemName}' already exists in category '${categoryName}'.`);
      }
      console.error(
        `Error adding item '${itemName}' to category '${categoryName}' for restaurant ${restaurantId}:`,
        error,
      );
      throw new InternalServerErrorException('Could not add item to category.');
    }
  }

  async editPortion(
    restaurantId: string,
    itemId: number,
    portionName: string,
    portionPrice: number,
  ): Promise<Portion> {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID '${itemId}' not found.`);
    }

    if (item.restaurantId !== restaurantId) {
      throw new BadRequestException(`Item with ID '${itemId}' does not belong to restaurant ID '${restaurantId}'.`);
    }

    if (!item.portionAvail) {
      throw new BadRequestException(`Portions are not enabled for item '${item.name}' (ID: ${itemId}).`);
    }

    try {
      const existingPortion = await this.prisma.portion.findUnique({
        where: { name_itemId: { name: portionName, itemId: itemId } },
      });

      if (existingPortion) {
        // Update existing portion
        return this.prisma.portion.update({
          where: { id: existingPortion.id },
          data: { price: portionPrice },
        });
      } else {
        // Create new portion
        return this.prisma.portion.create({
          data: {
            name: portionName,
            price: portionPrice,
            itemId: itemId,
          },
        });
      }
    } catch (error) {
      console.error(
        `Error editing portion '${portionName}' for item ID '${itemId}' in restaurant ${restaurantId}:`,
        error,
      );
      throw new InternalServerErrorException('Could not edit portion.');
    }
  }

  async editItemAttribute(
    restaurantId: string,
    itemId: number,
    attributeName: string,
    attributeValue: any,
  ): Promise<Item> {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID '${itemId}' not found.`);
    }

    if (item.restaurantId !== restaurantId) {
      throw new BadRequestException(`Item with ID '${itemId}' does not belong to restaurant ID '${restaurantId}'.`);
    }

    // Validate attributeName and attributeValue based on type/constraints
    // This is a simplified validation. A more robust solution would involve
    // checking types, ranges, etc., based on the attributeName.
    const dataToUpdate: Prisma.ItemUpdateInput = {};

    switch (attributeName) {
      case 'name':
        if (typeof attributeValue !== 'string' || attributeValue.trim() === '') {
          throw new BadRequestException('Item name must be a non-empty string.');
        }
        dataToUpdate.name = attributeValue;
        break;
      case 'description':
        dataToUpdate.description = typeof attributeValue === 'string' ? attributeValue : null;
        break;
      case 'price':
        // If changing price directly, consider implications if portionAvail is true.
        // The DTO for AddItem makes price optional if portionAvail = true.
        // If portionAvail is false, price must be a non-negative number.
        if (item.portionAvail && (attributeValue !== null && attributeValue !== undefined)) {
          throw new BadRequestException('Cannot set base price directly when portions are available. Manage portion prices instead or set portionAvail to false.');
        }
        if (!item.portionAvail && (typeof attributeValue !== 'number' || attributeValue < 0)) {
          throw new BadRequestException('Price must be a non-negative number when portions are not available.');
        }
        dataToUpdate.price = attributeValue;
        break;
      case 'imageUrl':
        // Basic URL validation could be more sophisticated (e.g., regex)
        if (attributeValue !== null && attributeValue !== undefined && (typeof attributeValue !== 'string' || !attributeValue.startsWith('http'))) {
          throw new BadRequestException('Image URL must be a valid URL or null.');
        }
        dataToUpdate.imageUrl = attributeValue;
        break;
      case 'availStatus':
        if (typeof attributeValue !== 'boolean') {
          throw new BadRequestException('Availability status must be a boolean.');
        }
        dataToUpdate.availStatus = attributeValue;
        break;
      case 'portionAvail':
        if (typeof attributeValue !== 'boolean') {
          throw new BadRequestException('Portion availability must be a boolean.');
        }
        dataToUpdate.portionAvail = attributeValue;
        // If setting portionAvail to true, existing item.price might become irrelevant.
        // If setting portionAvail to false, ensure item.price is set or becomes mandatory.
        if (attributeValue === false && (item.price === null || item.price === undefined)) {
          throw new BadRequestException('If disabling portions, a base price for the item must be set. Please update price as well.');
        }
        if (attributeValue === true) {
          dataToUpdate.price = null; // Explicitly nullify item price if portions become available
        }
        break;
      default:
        // This should ideally not be reached if DTO @IsIn validation works
        throw new BadRequestException(`Attribute '${attributeName}' is not editable or recognized.`);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      throw new BadRequestException('No valid attributes provided for update.');
    }

    try {
      return await this.prisma.item.update({
        where: { id: itemId },
        data: dataToUpdate,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Catches unique constraint violations, e.g., if (name, categoryId) is not unique
        throw new ConflictException(`Update failed due to unique constraint violation (e.g., item '${dataToUpdate.name}' already exists in its category).`);
      }
      console.error(`Error updating attribute '${attributeName}' for item ID '${itemId}':`, error);
      throw new InternalServerErrorException('Could not update item attribute.');
    }
  }

  async getCategoryItems(
    restaurantId: string,
    categoryName: string,
  ): Promise<any[]> { // Define a proper return type/interface later
    const category = await this.prisma.category.findUnique({
      where: { name_restaurantId: { name: categoryName, restaurantId } },
    });

    if (!category) {
      throw new NotFoundException(`Category '${categoryName}' not found for restaurant ID '${restaurantId}'.`);
    }

    const items = await this.prisma.item.findMany({
      where: {
        categoryId: category.id,
        restaurantId: restaurantId, // Ensure items are for the correct restaurant
      },
      include: {
        portions: true, // Include portions to determine price and structure response
      },
      orderBy: {
        name: 'asc',
      },
    });

    return items.map((item) => {
      const itemResponse: any = {
        id: item.id,
        name: item.name,
        description: item.description,
        category: categoryName, // Add categoryName to response as per example
        imageUrl: item.imageUrl,
        availStatus: item.availStatus,
        portionAvail: item.portionAvail,
      };

      if (item.portionAvail && item.portions.length > 0) {
        itemResponse.price = Math.min(...item.portions.map(p => p.price));
        itemResponse.portionPrices = item.portions.reduce((acc, p) => {
          acc[p.name] = p.price;
          return acc;
        }, {} as { [key: string]: number }); // Explicitly type the accumulator
      } else {
        itemResponse.price = item.price;
        // portionAvail might be true but no portions added yet, client should handle display
      }
      return itemResponse;
    });
  }
}
