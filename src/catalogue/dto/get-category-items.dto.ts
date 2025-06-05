import { IsNotEmpty, IsString } from 'class-validator';

export class GetCategoryItemsDto {
    @IsString()
    @IsNotEmpty()
    restaurantId: string;

    @IsString()
    @IsNotEmpty()
    categoryName: string;
} 