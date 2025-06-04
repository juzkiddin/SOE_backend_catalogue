import { IsNotEmpty, IsString } from 'class-validator';

export class AddCategoryIconDto {
    @IsString()
    @IsNotEmpty()
    restaurantId: string;

    @IsString()
    @IsNotEmpty()
    categoryName: string;

    @IsString()
    @IsNotEmpty()
    iconName: string;
} 